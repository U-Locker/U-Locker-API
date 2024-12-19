import type { Request, Response } from "express";
import db from "@/services/db";
import {
  badRequest,
  notFound,
  success,
  validationError,
} from "@/utils/responses";
import idSchema from "@/models/idSchema";
import {
  midtransCallbackSchema,
  transactionUpdatableSchema,
  type MidtransStatus,
} from "@/models/transaction";

import ENV from "@/utils/env";

// GET / : All Transaction
// implement filter by query parameter - [orderBy=new,old, type]
export const getAllTransaction = async (req: Request, res: Response) => {
  const { orderBy, type } = req.query;

  if (orderBy && !["new", "old"].includes(orderBy as string)) {
    return validationError(res, "Invalid orderBy parameter");
  }

  if (type && !["IN", "OUT"].includes(type as string)) {
    return validationError(res, "Invalid type parameter");
  }

  const transactions = await db.transaction.findMany({
    orderBy: {
      createdAt: orderBy === "new" ? "desc" : "asc",
    },
    where: {
      type: type as "IN" | "OUT" | undefined,
    },
  });

  return success(res, "All Transactions", transactions);
};

// GET /:userId : Transaction by userId
export const getTransactionByUserId = async (req: Request, res: Response) => {
  const userId = await idSchema.parseAsync(req.params.userId);

  const transactions = await db.transaction.findMany({
    where: {
      userId: userId,
    },
  });

  if (!transactions) {
    return notFound(res, "Transactions not found");
  }

  return success(res, "Transactions", transactions);
};

const API_URL =
  ENV.APP_MIDTRANS_ENV == "sandbox"
    ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
    : "https://app.midtrans.com/snap/v1/transactions";

const API_VALIDATION_URL =
  ENV.APP_MIDTRANS_ENV === "sandbox"
    ? "https://api.sandbox.midtrans.com/v2"
    : "https://api.midtrans.com/v2";

// POST / : Create Transaction
export const createTransaction = async (req: Request, res: Response) => {
  const body = await transactionUpdatableSchema.parseAsync(req.body);

  const transactionID = crypto.randomUUID();

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(ENV.APP_MIDTRANS_SERVER_KEY + ":")}}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: transactionID,

        // ganti harga chattime eligible disini
        gross_amount: body.amount * 1000,
      },

      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: req.user.data.firstName,
        last_name: req.user.data.lastName,
        email: req.user.data.email,
      },
    }),
  });

  if (resp.status !== 201) {
    return badRequest(
      res,
      "Terjadi kesalahan pada midtrans, harap coba kembali"
    );
  }

  const transaction = await db.transaction.create({
    data: {
      userId: req.user.data.id,
      transactionID,
      type: "IN",
      amount: body.amount / 1000,
    },
  });

  return success(res, "Transaction created", {
    ...transaction,
    midtrans: await resp.json(),
  });
};

export const midtransCallback = async (req: Request, res: Response) => {
  const body = await midtransCallbackSchema.parseAsync(req.body);

  // validate midtrans transaction
  const resp = await fetch(
    `${API_VALIDATION_URL}/${body.transaction_id}/status`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(ENV.APP_MIDTRANS_SERVER_KEY + ":")}`,
        Accept: "application/json",
      },
    }
  );

  const mtData = (await resp.json()) as MidtransStatus;

  if (mtData.status_code === "404") {
    return notFound(res, "Transaction not found");
  }

  const transaction = await db.transaction.findUnique({
    where: {
      transactionID: body.transaction_id,
    },
  });

  if (!transaction) {
    return notFound(res, "Transaction not found");
  }

  if (mtData.transaction_status === "settlement") {
    await db.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        validatedAt: new Date(),
      },
    });
  }

  return success(res, "Transaction updated");
};

export const myTransactions = async (req: Request, res: Response) => {
  const rawTransactions = await db.transaction.findMany({
    where: {
      userId: req.user.data.id,
    },
    select: {
      id: true,
      // transactionID: true,
      Renting: {
        select: {
          room: {
            select: {
              name: true,
              locker: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        take: 1,
      },
      type: true,
      amount: true,
      createdAt: true,
      validatedAt: true,
    },
  });

  const transactions = rawTransactions.filter(
    (t) => t.type === "OUT" || (t.type === "IN" && t.validatedAt)
  );

  return success(res, "My Transactions", transactions);
};

export const getTransactionDetail = async (req: Request, res: Response) => {
  const transactionId = await idSchema.parseAsync(req.params.transactionId);

  const transaction = await db.transaction.findUnique({
    where: {
      id: transactionId,
    },
  });

  if (!transaction) {
    return notFound(res, "Transaction not found");
  }

  return success(res, "Transaction Detail", transaction);
};
