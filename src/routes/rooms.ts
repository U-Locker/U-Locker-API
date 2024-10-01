import { Router } from "express";
import { verifyRole } from "@/middleware/auth";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} from "@/controllers/rooms";

const router = Router();
// [GET]: /locker/:lockrId/rooms
router.get("/:lockerId/rooms", getRooms);
// [GET]: /locker/:lockerId/rooms/:roomId
router.get("/:lockerId/rooms/:roomId", getRoomById);
// POST: /locker/:lockerId/rooms
router.post("/:lockerId/rooms", verifyRole("admin"), createRoom);
// PUT: /locker/:lockerId/rooms/:roomId
router.put("/:lockerId/rooms/:roomId", verifyRole("admin"), updateRoom);
// DELETE: /locker/:lockerId/rooms/:roomId
router.delete("/:lockerId/rooms/:roomId", verifyRole("admin"), deleteRoom);

export default router;
