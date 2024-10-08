import { Router } from "express";
import { verifyJwt } from "@/middleware/auth";
import { login, logout, me, register, updateProfile } from "@/controllers/auth";

const router = Router();

router.post("/login", login);
router.delete("/logout", logout);
router.post("/register", register);

router.get("/me", verifyJwt, me);
router.put("/me", verifyJwt, updateProfile);

export default router;
