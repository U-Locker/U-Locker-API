import z from "zod";

const lockerSchema = z.object({
  id: z.number().positive(),
  machineId: z
    .string({
      required_error: "Machine ID is required",
      invalid_type_error: "Machine ID must be a string",
      message: "Machine ID is required",
    })

    // format: "0cfa-4ed7-a8d7"
    .length(6, "Machine ID must be 6 characters long")
    .regex(
      /^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/,
      "Invalid Machine ID format"
    ),

  name: z
    .string({
      required_error: "Locker name is required",
      invalid_type_error: "Locker name must be a string",
      message: "Locker name is required",
    })
    .min(3, "Locker name must be at least 3 characters long")
    .max(50, "Locker name must be at most 50 characters long"),
  location: z
    .string({
      required_error: "Location is required",
      invalid_type_error: "Location must be a string",
      message: "Location is required",
    })
    .min(3, "Location must be at least 3 characters long")
    .max(50, "Location must be at most 50 characters long"),
  description: z
    .string({
      required_error: "Description is required",
      invalid_type_error: "Description must be a string",
      message: "Description is required",
    })
    .min(5, "Description must be at least 5 characters long")
    .max(100, "Description must be at most 100 characters long"),

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

export const lockerUpdatableSchema = lockerSchema.pick({
  machineId: true,
  name: true,
  location: true,
  description: true,
});

export type Locker = z.infer<typeof lockerSchema>;
export type LockerUpdatable = z.infer<typeof lockerUpdatableSchema>;
