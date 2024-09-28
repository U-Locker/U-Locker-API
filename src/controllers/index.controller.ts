import { type Request, type Response } from "express";
import { success } from "@/utils/responses";

export const index = (_req: Request, res: Response) => {
  return success(res, "Welcome to MAXIMA 2024 API");
};
