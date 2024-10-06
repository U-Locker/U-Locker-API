import { Router } from "express";
import { verifyJwt, verifyRole } from "@/middleware/auth";
import {
  getLockers,
  getLockerById,
  createLocker,
  updateLocker,
  deleteLocker,
} from "@/controllers/locker";
import roomRouter from "@/routes/rooms";

const router = Router({ mergeParams: true });
// [GET]: /locker
router.get("/", verifyJwt, getLockers);
// [GET]: /locker/:lockerId
router.get("/:lockerId", verifyJwt, getLockerById);
// POST: /locker
router.post("/", verifyJwt, verifyRole("admin"), createLocker);
// PUT: /locker/:lockerId
router.put("/:lockerId", verifyJwt, verifyRole("admin"), updateLocker);

// DELETE: /locker/:lockerId
router.delete("/:lockerId", verifyJwt, verifyRole("admin"), deleteLocker);

// mount room router
router.use(roomRouter);

export default router;
