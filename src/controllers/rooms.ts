import type { Request, Response } from "express";
import db from "@/services/db";
import { notFound, success, validationError } from "@/utils/responses";
import idSchema from "@/models/idSchema";
import { roomsUpdatableSchema } from "@/models/rooms";
import mq from "@/services/mqtt";
import ENV from "@/utils/env";

// [GET]: /locker/:lockrId/rooms
export const getRooms = async (req: Request, res: Response) => {
  const lockerId = await idSchema.parseAsync(req.params.lockerId);

  if (!lockerId) {
    return validationError(res, "Locker ID is required");
  }

  const rooms = await db.rooms.findMany({
    where: {
      lockerId: lockerId,
    },
  });

  return success(res, "Rooms", rooms);
};

// [GET]: /locker/:lockerId/rooms/:roomId
export const getRoomById = async (req: Request, res: Response) => {
  const lockerId = await idSchema.parseAsync(req.params.lockerId);
  const roomId = await idSchema.parseAsync(req.params.roomId);

  if (!lockerId || !roomId) {
    return validationError(res, "Locker ID and Room ID are required");
  }

  const room = await db.rooms.findUnique({
    where: {
      id: roomId,
      lockerId: lockerId,
    },
  });

  if (!room) {
    return notFound(res, "Room not found");
  }

  return success(res, "Room details", room);
};

// POST: /locker/:lockerId/rooms
export const createRoom = async (req: Request, res: Response) => {
  const lockerId = await idSchema.parseAsync(req.params.lockerId);
  const newRoom = await roomsUpdatableSchema.parseAsync(req.body);

  if (!lockerId) {
    return validationError(res, "Locker ID is required");
  }

  if (!newRoom) {
    return validationError(res, "Room data is required");
  }

  const room = await db.rooms.create({
    data: {
      lockerId: lockerId,
      doorId: newRoom.doorId,
      name: newRoom.name,
      size: newRoom.size,
    },
  });

  return success(res, "Room created", room);
};

// PUT: /locker/:lockerId/rooms/:roomId
export const updateRoom = async (req: Request, res: Response) => {
  const lockerId = await idSchema.parseAsync(req.params.lockerId);
  const roomId = await idSchema.parseAsync(req.params.roomId);
  const updatedRoom = await roomsUpdatableSchema.parseAsync(req.body);

  if (!lockerId || !roomId) {
    return validationError(res, "Locker ID and Room ID are required");
  }

  if (!updatedRoom) {
    return validationError(res, "Room data is required");
  }

  const room = await db.rooms.update({
    where: {
      id: roomId,
      lockerId: lockerId,
    },
    data: {
      doorId: updatedRoom.doorId,
      name: updatedRoom.name,
      size: updatedRoom.size,
    },
  });

  return success(res, "Room updated", room);
};

// DELETE: /locker/:lockerId/rooms/:roomId
export const deleteRoom = async (req: Request, res: Response) => {
  const lockerId = await idSchema.parseAsync(req.params.lockerId);
  const roomId = await idSchema.parseAsync(req.params.roomId);

  if (!lockerId || !roomId) {
    return validationError(res, "Locker ID and Room ID are required");
  }

  await db.rooms.delete({
    where: {
      id: roomId,
      lockerId: lockerId,
    },
  });

  return success(res, "Room deleted");
};

export const overrideOpenRoom = async (req: Request, res: Response) => {
  const lockerId = await idSchema.parseAsync(req.params.lockerId);
  const roomId = await idSchema.parseAsync(req.params.roomId);

  if (!lockerId || !roomId) {
    return validationError(res, "Locker ID and Room ID are required");
  }

  const room = await db.rooms.findUnique({
    where: {
      id: roomId,
      lockerId: lockerId,
    },
    include: {
      locker: {
        select: {
          machineId: true,
        },
      },
    },
  });

  if (!room) {
    return notFound(res, "Room not found");
  }

  await mq.publishAsync(
    ENV.APP_MQTT_TOPIC_COMMAND,
    `${room.locker.machineId}#OPEN_ROOM#${room.doorId}`
  );

  return success(res, "Room opened");
};
