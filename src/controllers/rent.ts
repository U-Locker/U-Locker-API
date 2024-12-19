import type { Request, Response } from "express";
import db from "@/services/db";
import { badRequest, forbidden, notFound, success } from "@/utils/responses";
import idSchema from "@/models/idSchema";
import mq from "@/services/mqtt";
import ENV from "@/utils/env";
import { rentingUpdatableSchema } from "@/models/renting";

// [GET]: /rent
export const rentHistory = async (req: Request, res: Response) => {
  const history = await db.renting.findMany({
    where: {
      userId: req.user.data.id,
    },
  });

  return success(res, "Rent history", history);
};

// [GET]: /rent/active
export const activeRent = async (req: Request, res: Response) => {
  const activeRent = await db.renting.findMany({
    where: {
      userId: req.user.data.id,
      status: {
        in: ["ACTIVE", "OVERDUE"],
      },
    },
    include: {
      room: {
        select: {
          lockerId: true,
        },
      },
    },
  });

  return success(res, "Active rent", activeRent);
};

// [GET]: /rent/:rentId
export const getRentById = async (req: Request, res: Response) => {
  const rentId = await idSchema.parseAsync(req.params.rentId);

  const rent = await db.renting.findUnique({
    where: {
      id: rentId,
    },
  });

  if (!rent) {
    return notFound(res, "Rent not found");
  }

  // check overdue
  const endTime = new Date(rent.endTime);
  const currentTime = new Date();

  if (endTime < currentTime) {
    await db.renting.update({
      where: {
        id: rentId,
      },
      data: {
        status: "OVERDUE",
      },
    });
  }

  const updatedRent = await db.renting.findUnique({
    where: {
      id: rentId,
    },
  });

  return success(res, "Rent details", updatedRent);
};

// [PUT]: /rent/:rentId - open room if rent is active
export const openRoom = async (req: Request, res: Response) => {
  const rentId = await idSchema.parseAsync(req.params.rentId);

  const rent = await db.renting.findUnique({
    where: {
      id: rentId,
    },
    include: {
      room: {
        select: {
          locker: {
            select: {
              machineId: true,
            },
          },
          doorId: true,
        },
      },
    },
  });

  if (!rent) {
    return notFound(res, "Rent not found");
  }

  // check if endTime is passed and reduce credits
  const endTime = new Date(rent.endTime);
  const currentTime = new Date();

  if (endTime < currentTime) {
    await db.renting.update({
      where: {
        id: rentId,
      },
      data: {
        status: "OVERDUE",
      },
    });
    await mq.publishAsync(
      ENV.APP_MQTT_TOPIC_COMMAND,
      `${rent.room.locker.machineId}#LCD#Room overdue, please pay fine first on the app`
    );
    return forbidden(res, "Room overdue, please pay fine first on the app");
  }

  if (rent.status !== "ACTIVE") {
    return forbidden(res, "Rent is not active");
  }

  await mq.publishAsync(
    ENV.APP_MQTT_TOPIC_COMMAND,
    `${rent.room.locker.machineId}#LCD#Opening Room ${rent.room.doorId}...`
  );

  // send command to open room to hardware using MQTT
  await mq.publishAsync(
    ENV.APP_MQTT_TOPIC_COMMAND,
    `${rent.room.locker.machineId}#OPEN_DOOR#${rent.room.doorId}`
  );

  return success(res, "Room opened");
};

// [DELETE]: /rent/:rentId - stop rent
export const stopRent = async (req: Request, res: Response) => {
  const rentId = await idSchema.parseAsync(req.params.rentId);

  const rent = await db.renting.findUnique({
    where: {
      id: rentId,
    },
    include: {
      user: true,
      room: {
        include: {
          locker: true,
        },
      },
    },
  });

  if (!rent) {
    return notFound(res, "Rent not found");
  }

  if (rent.status === "DONE") {
    return forbidden(res, "Rent is not active");
  }

  // check overdue
  const rentTime = new Date(rent.endTime).getTime();
  const currentTime = new Date().getTime();
  const overdue = Math.floor((currentTime - rentTime) / (1000 * 60 * 60));

  const totalOverdue = overdue > 24 ? 24 : overdue;

  if (totalOverdue > 0) {
    const userCredits = await db.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId: rent.userId,
        type: "IN",
        validatedAt: {
          not: null,
        },
      },
    });
    const userPayment = await db.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId: rent.userId,
        type: "OUT",
        validatedAt: {
          not: null,
        },
      },
    });
    const credits =
      userCredits._sum.amount ?? 0 - (userPayment._sum.amount ?? 0);

    if (overdue > credits) {
      return success(res, "Insufficient credits to stop rent", {
        status: "OVERDUE",
        payment: overdue - credits,
      });
    }

    await db.transaction.create({
      data: {
        user: {
          connect: {
            id: rent.userId,
          },
        },
        amount: overdue,
        type: "OUT",
        transactionID: crypto.randomUUID(),
        Renting: {
          connect: {
            id: rentId,
          },
        },
        validatedAt: new Date(),
      },
    });
  }

  // open door
  await mq.publishAsync(
    ENV.APP_MQTT_TOPIC_COMMAND,
    `${rent.room.locker.machineId}#OPEN_DOOR#${rent.room.doorId}`
  );

  await db.renting.update({
    where: {
      id: rentId,
    },
    data: {
      status: "DONE",
    },
  });

  const locker = await db.locker.findUnique({
    where: {
      machineId: rent.room.locker.machineId,
    },
    include: {
      Rooms: {
        include: {
          Renting: {
            where: {
              status: "ACTIVE",
            },
            include: {
              user: {
                select: {
                  ktmUid: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // send current state to locker of rented rooms
  const state =
    locker?.Rooms.filter((r) => r.Renting.length > 0).map((room) => {
      return {
        doorId: room.doorId,
        ktmUid: room.Renting[0].user.ktmUid,
      };
    }) ?? [];

  await mq.publishAsync(
    ENV.APP_MQTT_TOPIC_COMMAND,
    `${rent.room.locker.machineId}#STATE#${JSON.stringify(state)}`
  );

  return success(res, "Rent stopped successfully", {
    status: "DONE",
  });
};

// [POST]: /rent
export const rentRoom = async (req: Request, res: Response) => {
  const body = await rentingUpdatableSchema.parseAsync(req.body);

  const room = await db.rooms.findUnique({
    where: {
      id: body.roomId,
    },
    include: {
      locker: true,
    },
  });

  if (!room) {
    return notFound(res, "Room not found");
  }

  // validate start time and end time
  const startTime = new Date(body.startTime);
  const endTime = new Date(body.endTime);

  // if (startTime < new Date()) {
  //   return badRequest(res, "Start time cannot be in the past");
  // }

  if (endTime < startTime) {
    return badRequest(res, "End time cannot be before start time");
  }

  // check if user credit is sufficient
  const inTrx = await db.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      userId: req.user.data.id,
      type: "IN",
      validatedAt: {
        not: null,
      },
    },
  });

  const outTrx = await db.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      userId: req.user.data.id,
      type: "OUT",
      validatedAt: {
        not: null,
      },
    },
  });

  const credits = (inTrx._sum.amount ?? 0) - (outTrx._sum.amount ?? 0);

  const diff =
    new Date(body.endTime).getTime() - new Date(body.startTime).getTime();
  const diffHours = Math.floor(diff / (1000 * 60 * 60));

  if (diffHours > credits) {
    return success(res, "Insufficient credits to rent room", {
      status: "INSUFFICIENT_CREDITS",
      payment: diffHours - credits,
    });
  }

  const rent = await db.transaction.create({
    data: {
      user: {
        connect: {
          id: req.user.data.id,
        },
      },
      amount: diffHours,
      type: "OUT",
      transactionID: crypto.randomUUID(),
      Renting: {
        create: {
          roomId: body.roomId,
          startTime: new Date(body.startTime),
          endTime: new Date(body.endTime),
          status: "ACTIVE",
          userId: req.user.data.id,
        },
      },
      validatedAt: new Date(),
    },
  });

  // send current locker state to hardware
  const locker = await db.locker.findUnique({
    where: {
      machineId: room.locker.machineId,
    },

    select: {
      machineId: true,
      Rooms: {
        select: {
          doorId: true,
          Renting: {
            where: {
              status: "ACTIVE",
            },
            select: {
              user: {
                select: {
                  ktmUid: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // send current state to locker of rented rooms
  const state =
    locker?.Rooms.filter((r) => r.Renting.length > 0).map((room) => {
      return {
        doorId: room.doorId,
        ktmUid: room.Renting[0].user.ktmUid,
      };
    }) ?? [];

  await mq.publishAsync(
    ENV.APP_MQTT_TOPIC_COMMAND,
    `${room.locker.machineId}#STATE#${JSON.stringify(state)}`
  );

  return success(res, "Room rented successfully", {
    status: "ACTIVE",
    rent,
  });
};

// // [GET]: /rent/:lockerId/
// export const getAvailableRooms = async (req: Request, res: Response) => {
//   const params = await lockerIdSchema.parseAsync(req.params);

//   const rooms = await db.locker.findMany({
//     where: {
//       id: params.lockerId,
//     },
//     include: {
//       Rooms: {
//         where: {
//           Renting: {
//             none: {
//               status: "ACTIVE",
//             },
//           },
//         },
//       },
//     },
//   });

//   return success(res, "Available rooms", rooms);
// };
