import { Router } from "express";
import { verifyRole, verifyJwt } from "@/middleware/auth";

import {
  dashboardStatistic,
  leaderboard,
  mostUsedLocker,
  totalEarning,
  totalRented,
} from "@/controllers/statistics";

const router = Router({ mergeParams: true });

router.get("/dashboard", verifyJwt, verifyRole("admin"), dashboardStatistic);
router.get("/earning", verifyJwt, verifyRole("admin"), totalEarning);
router.get("/most-used-locker", verifyJwt, verifyRole("admin"), mostUsedLocker);
router.get("/leaderboard", verifyJwt, verifyRole("admin"), leaderboard);
router.get("/total-rented", verifyJwt, verifyRole("admin"), totalRented);

export default router;
