import type { Request, Response } from "express";
import db from "@/services/db";
import { forbidden, notFound, success } from "@/utils/responses";
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
  const activeRent = await db.renting.findFirst({
    where: {
      userId: req.user.data.id,
      status: {
        in: ["ACTIVE", "OVERDUE"],
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
    mq.publish(
      ENV.APP_MQTT_TOPIC_COMMAND,
      `${rent.room.locker.machineId}#LCD#Room overdue, please pay fine first on the app`
    );
    return forbidden(res, "Room overdue, please pay fine first on the app");
  }

  if (rent.status !== "ACTIVE") {
    return forbidden(res, "Rent is not active");
  }

  mq.publish(
    ENV.APP_MQTT_TOPIC_COMMAND,
    `${rent.room.locker.machineId}#LCD#Opening Room ${rent.room.doorId}...`
  );

  // send command to open room to hardware using MQTT
  mq.publish(
    ENV.APP_MQTT_TOPIC_COMMAND,
    `${rent.room.locker.machineId}#OPEN_ROOM#${rent.room.doorId}`
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
    },
  });

  if (!rent) {
    return notFound(res, "Rent not found");
  }

  if (!["ACTIVE", "OVERDUE"].includes(rent.status)) {
    return forbidden(res, "Rent is not active");
  }

  // deduct credits from user if rent is stopped after endTime
  const endTime = new Date(rent.endTime);
  const currentTime = new Date();

  const diff = endTime.getTime() - currentTime.getTime();
  const diffHours = Math.floor(diff / (1000 * 60 * 60));

  // check if user has enough credits to stop rent
  if (diffHours > rent.user.credits) {
    return forbidden(res, "Insufficient credits to stop rent");
  }

  await db.renting.update({
    where: {
      id: rentId,
    },
    data: {
      status: "EXPIRED",
      user: {
        update: {
          credits: {
            decrement: diffHours,
          },
        },
      },
    },
  });

  return success(res, "Rent stopped");
};

// [POST]: /rent
export const rentRoom = async (req: Request, res: Response) => {
  const body = await rentingUpdatableSchema.parseAsync(req.body);

  const room = await db.rooms.findUnique({
    where: {
      id: body.roomId,
    },
  });

  if (!room) {
    return notFound(res, "Room not found");
  }

  const rent = await db.renting.create({
    data: {
      userId: req.user.data.id,
      roomId: body.roomId,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime), // 1 hour
      status: "ACTIVE",
    },
  });

  return success(res, "Room rented successfully", rent);
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
