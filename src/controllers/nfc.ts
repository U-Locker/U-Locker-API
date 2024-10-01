import type { Request, Response } from "express";
import db from "@/services/db";

import { notFound, success } from "@/utils/responses";

export const pollAvailableCard = async (req: Request, res: Response) => {
  const card = await db.nFCQueue.findFirst();

  if (!card) {
    return notFound(res, "No card available, please wait");
  }

  return success(res, "Card available", card);
};
