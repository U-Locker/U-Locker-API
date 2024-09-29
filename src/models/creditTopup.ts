import z from "zod";

const creditTopupSchema = z.object({
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

export const creditTopupUpdatableSchema = creditTopupSchema.pick({
  userId: true,
  amount: true,
  validatedAt: true,
});

export type CreditTopup = z.infer<typeof creditTopupSchema>;
export type CreditTopupUpdatable = z.infer<typeof creditTopupUpdatableSchema>;
