import { Router } from "express";
import { verifyRole, verifyJwt } from "@/middleware/auth";

import {
  getAllTransaction,
  getTransactionByUserId,
  createTransaction,
  midtransCallback,
  getTransactionDetail,
  myTransactions,
} from "@/controllers/transaction";

const router = Router({ mergeParams: true });

// admin only for checking trx
router.get("/", verifyJwt, verifyRole("admin"), getAllTransaction);

// [USER]
router.get("/me", verifyJwt, verifyRole("user"), myTransactions);

router.get(
  "/me/:transactionId",
  verifyJwt,
  verifyRole("user"),
  getTransactionDetail
);

// create new transaction
router.post("/", verifyJwt, verifyRole("user"), createTransaction);

// midtrans successful callback
router.post("/midtrans/callback", midtransCallback);

// get trx by userId
router.get("/:id", verifyJwt, verifyRole("admin"), getTransactionByUserId);

export default router;
