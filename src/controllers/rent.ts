import type { Request, Response } from "express";
import db from "@/services/db";
import {} from "@/models/user";
import { notFound, success, unauthorized } from "@/utils/responses";
import idSchema from "@/models/idSchema";
import mq from "@/services/mqtt";
import ENV from "@/utils/env";

// [GET]: /rent/history
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
      status: "ACTIVE",
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

  return success(res, "Rent details", rent);
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
        },
      },
    },
  });

  if (!rent) {
    return notFound(res, "Rent not found");
  }

  if (rent.status !== "ACTIVE") {
    return unauthorized(res, "Rent is not active");
  }

  // send command to open room to hardware using MQTT
  mq.publish(
    ENV.APP_MQTT_TOPIC_COMMAND,
    `${rent.room.locker.machineId}#OPEN_ROOM#${rent.roomId}`
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
  });

  if (!rent) {
    return notFound(res, "Rent not found");
  }

  if (rent.status !== "ACTIVE") {
    return unauthorized(res, "Rent is not active");
  }

  // deduct credits from user if rent is stopped after endTime
  const endTime = new Date(rent.endTime);
  const currentTime = new Date();

  if (endTime > currentTime) {
    const diff = endTime.getTime() - currentTime.getTime();
    const diffHours = Math.floor(diff / (1000 * 60 * 60));

    if (diffHours > 0) {
      await db.user.update({
        where: {
          id: rent.userId,
        },
        data: {
          credits: {
            decrement: diffHours,
          },
        },
      });
    }
  }

  await db.renting.update({
    where: {
      id: rentId,
    },
    data: {
      status: "EXPIRED",
    },
  });

  return success(res, "Rent stopped");
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
