import { Router } from "express";
import { index } from "@/controllers/index";

const router = Router();

router.get("/", index);

export default router;
