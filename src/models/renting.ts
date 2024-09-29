import z from "zod";

const rentingSchema = z.object({
  id: z.number().positive(),

  userId: z
    .number({
      required_error: "User ID is required",
      invalid_type_error: "User ID must be a number",
      message: "User ID is required",
    })
    .int("User ID must be an integer")
    .positive("User ID must be a positive number"),

  roomId: z
    .number({
      required_error: "Room ID is required",
      invalid_type_error: "Room ID must be a number",
      message: "Room ID is required",
    })
    .int("Room ID must be an integer")
    .positive("Room ID must be a positive number"),

  startTime: z
    .string({
      required_error: "Start date is required",
      invalid_type_error: "Start date must be a string",
      message: "Start date is required",
    })
    .datetime("Start date must be a datetime"),

  endTime: z
    .string({
      required_error: "End date is required",
      invalid_type_error: "End date must be a string",
      message: "End date is required",
    })
    .datetime("End date must be a datetime"),

  status: z.enum(["ACTIVE", "EXPIRED"], {
    invalid_type_error: "Status must be either PENDING, ONGOING, or FINISHED",
    required_error: "Status is required",
  }),

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

export const rentingUpdatableSchema = rentingSchema.pick({
  userId: true,
  roomId: true,
  startTime: true,
  endTime: true,
});

export type Renting = z.infer<typeof rentingSchema>;
export type RentingUpdatable = z.infer<typeof rentingUpdatableSchema>;
