import { Router } from "express";
import { verifyJwt, verifyRole } from "@/middleware/auth";
import {
  activeRent,
  getRentById,
  openRoom,
  rentHistory,
  rentRoom,
  stopRent,
} from "@/controllers/rent";

const router = Router({ mergeParams: true });

router.get("/", verifyJwt, verifyRole("user"), rentHistory);
router.get("/active", verifyJwt, verifyRole("user"), activeRent);
router.post("/room", verifyJwt, verifyRole("user"), rentRoom);
router.get("/:rentId", verifyJwt, verifyRole("user"), getRentById);
router.put("/room/:roomId", verifyJwt, verifyRole("user"), openRoom);
router.delete("/:rentId", verifyJwt, verifyRole("user"), stopRent);

export default router;
