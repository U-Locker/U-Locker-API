import { Router } from "express";
import { pollAvailableCard } from "@/controllers/nfc";

const router = Router();

router.get("/", pollAvailableCard);

export default router;
