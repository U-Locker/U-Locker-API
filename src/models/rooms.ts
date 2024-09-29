import z from "zod";

const roomsSchema = z.object({
  id: z.number().positive(),

  lockerId: z
    .number({
      required_error: "Locker ID is required",
      invalid_type_error: "Locker ID must be a number",
      message: "Locker ID is required",
    })
    .int("Locker ID must be an integer")
    .positive("Locker ID must be a positive number"),

  name: z
    .string({
      required_error: "Room name is required",
      invalid_type_error: "Room name must be a string",
      message: "Room name is required",
    })
    .min(3, "Room name must be at least 3 characters long")
    .max(50, "Room name must be at most 50 characters long"),

  size: z
    .string({
      required_error: "Size is required",
      invalid_type_error: "Size must be a string",
      message: "Size is required",
    })
    .min(3, "Size must be at least 3 characters long")
    .max(50, "Size must be at most 50 characters long"),

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

export const roomsUpdatableSchema = roomsSchema.pick({
  lockerId: true,
  name: true,
  size: true,
});

export type Rooms = z.infer<typeof roomsSchema>;
export type RoomsUpdatable = z.infer<typeof roomsUpdatableSchema>;
