import type { Request, Response } from "express";
import db from "@/services/db";
import { success, validationError } from "@/utils/responses";
import idSchema from "@/models/idSchema";
import { lockerUpdatableSchema } from "@/models/locker";

// [GET]: /locker
export const getLockers = async (req: Request, res: Response) => {
  const lockers = await db.locker.findMany({
    include: {
      _count: {
        select: {
          Rooms: true,
        },
      },
      Rooms: {
        select: {
          _count: {
            select: {
              Renting: {
                where: {
                  status: {
                    in: ["ACTIVE", "OVERDUE"],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const data = lockers.map((locker) => ({
    ...locker,
    total: locker._count.Rooms,

    // count active and overdue renting
    quota: locker.Rooms.map((room) => room._count.Renting).reduce(
      (acc, curr) => acc + curr,
      0
    ),
  }));

  return success(res, "Lockers", data);
};

// [GET]: /locker/:lockerId
export const getLockerById = async (req: Request, res: Response) => {
  const lockerId = await idSchema.parseAsync(req.params.lockerId);

  if (!lockerId) {
    return validationError(res, "Locker ID is required");
  }

  const locker =
    req.user.role === "admin"
      ? await db.locker.findUnique({
          where: {
            id: lockerId,
          },
          include: {
            Rooms: true,
          },
        })
      : await db.locker.findUnique({
          where: {
            id: lockerId,
          },
          include: {
            Rooms: {
              where: {
                Renting: {
                  some: {
                    status: {
                      notIn: ["ACTIVE", "OVERDUE"],
                    },
                  },
                },
              },
            },
          },
        });

  const active = await db.renting.count({
    where: {
      status: {
        in: ["ACTIVE", "OVERDUE"],
      },
      room: {
        lockerId,
      },
    },
  });

  const history = await db.renting.count({
    where: {
      room: {
        lockerId,
      },
      // weekly history
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 7)),
      },
    },
  });

  const data = {
    ...locker,
    active,
    history,
  };

  return success(res, "Locker details", data);
};

// POST: /locker
export const createLocker = async (req: Request, res: Response) => {
  const newLocker = await lockerUpdatableSchema.parseAsync(req.body);

  if (!newLocker) {
    return validationError(res, "Locker data is required");
  }

  const locker = await db.locker.create({
    data: {
      machineId: newLocker.machineId,
      name: newLocker.name,
      location: newLocker.location,
      description: newLocker.description,
    },
  });

  return success(res, "Locker created", locker);
};

// PUT: /locker/:lockerId
export const updateLocker = async (req: Request, res: Response) => {
  const lockerId = await idSchema.parseAsync(req.params.lockerId);

  if (!lockerId) {
    return validationError(res, "Locker ID is required");
  }

  const updatedLocker = await lockerUpdatableSchema.parseAsync(req.body);

  if (!updatedLocker) {
    return validationError(res, "Locker data is required");
  }

  const locker = await db.locker.update({
    where: {
      id: lockerId,
    },
    data: {
      machineId: updatedLocker.machineId,
      name: updatedLocker.name,
      location: updatedLocker.location,
      description: updatedLocker.description,
    },
  });

  return success(res, "Locker updated", locker);
};

// DELETE: /locker/:lockerId
export const deleteLocker = async (req: Request, res: Response) => {
  const lockerId = await idSchema.parseAsync(req.params.lockerId);

  if (!lockerId) {
    return validationError(res, "Locker ID is required");
  }

  await db.locker.delete({
    where: {
      id: lockerId,
    },
  });

  return success(res, "Locker deleted");
};
