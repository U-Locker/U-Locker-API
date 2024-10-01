import { Router } from "express";
import { verifyRole } from "@/middleware/auth";
import {
  getLockers,
  getLockerById,
  createLocker,
  updateLocker,
} from "@/controllers/locker";

const router = Router();
// [GET]: /locker
router.get("/", getLockers);
// [GET]: /locker/:lockerId
router.get("/:lockerId", getLockerById);
// POST: /locker
router.post("/", verifyRole("admin"), createLocker);
// PUT: /locker/:lockerId
router.put("/:lockerId", verifyRole("admin"), updateLocker);

export default router;
