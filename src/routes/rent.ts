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
router.get("/rent/active", verifyJwt, verifyRole("user"), activeRent);
router.post("/rent", verifyJwt, verifyRole("user"), rentRoom);
router.get("/rent/:rentId", verifyJwt, verifyRole("user"), getRentById);
router.put("/rent/:roomId", verifyJwt, verifyRole("user"), openRoom);
router.delete("/rent/:rentId", verifyJwt, verifyRole("user"), stopRent);

export default router;
