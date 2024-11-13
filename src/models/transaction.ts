import z from "zod";

const transactionSchema = z.object({
  id: z.number().positive(),

  userId: z
    .number({
      required_error: "User ID is required",
      invalid_type_error: "User ID must be a number",
      message: "User ID is required",
    })
    .int("User ID must be an integer")
    .positive("User ID must be a positive number"),

  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
      message: "Amount is required",
    })
    .int("Amount must be an integer")
    .positive("Amount must be a positive number"),

  validatedAt: z
    .string({
      required_error: "Validated at is required",
      invalid_type_error: "Validated at must be a string",
    })
    .datetime("Validated at must be a datetime"),

  createdAt: z
    .string({
      required_error: "Created at is required",
      invalid_type_error: "Created at must be a string",
      message: "Created at is required",
    })
    .datetime("Created at must be a datetime"),
  updatedAt: z
    .string({
      required_error: "Updated at is required",
      invalid_type_error: "Updated at must be a string",
      message: "Updated at is required",
    })
    .datetime("Updated at must be a datetime"),
});

export const transactionUpdatableSchema = transactionSchema.pick({
  // userId: true,
  amount: true,
  // validatedAt: true,
});

export const midtransCallbackSchema = z.object({
  transaction_status: z.string(),
  transaction_id: z.string(),
  order_id: z.string(),
  transaction_time: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionUpdatable = z.infer<typeof transactionUpdatableSchema>;
export type MidtransCallback = z.infer<typeof midtransCallbackSchema>;

export type MidtransStatus = {
  status_code: string;
  status_message: string;
  transaction_id: string;
  masked_card: string;
  order_id: string;
  payment_type: string;
  transaction_time: string;
  transaction_status:
    | "capture"
    | "settlement"
    | "pending"
    | "deny"
    | "cancel"
    | "expire";
  fraud_status: "accept" | "challenge" | "deny";
  approval_code: string;
  signature_key: string;
  bank: string;
  gross_amount: string;
  channel_response_code: string;
  channel_response_message: string;
  card_type: string;
  payment_option_type: string;
  shopeepay_reference_number: string;
  reference_id: string;
};
