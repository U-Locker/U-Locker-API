import { Router } from "express";
import { verifyRole, verifyJwt } from "@/middleware/auth";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  overrideOpenRoom,
} from "@/controllers/rooms";

const router = Router({ mergeParams: true });
// [GET]: /locker/:lockrId/rooms
router.get("/:lockerId/rooms", verifyJwt, getRooms);
// [GET]: /locker/:lockerId/rooms/:roomId
router.get("/:lockerId/rooms/:roomId", verifyJwt, getRoomById);
// POST: /locker/:lockerId/rooms
router.post("/:lockerId/rooms", verifyJwt, verifyRole("admin"), createRoom);
// PUT: /locker/:lockerId/rooms/:roomId
router.put(
  "/:lockerId/rooms/:roomId",
  verifyJwt,
  verifyRole("admin"),
  updateRoom
);
router.put("/:lockerId/rooms/:roomId/override", verifyJwt, overrideOpenRoom);
// DELETE: /locker/:lockerId/rooms/:roomId
router.delete(
  "/:lockerId/rooms/:roomId",
  verifyJwt,
  verifyRole("admin"),
  deleteRoom
);

export default router;
