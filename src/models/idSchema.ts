import z from "zod";

const idSchema = z
  .string({
    required_error: "ID is required",
    invalid_type_error: "ID must be a string",
  })
  .regex(/^\d+$/, "ID must be numeric")
  .transform(Number);

export default idSchema;
export type Id = z.infer<typeof idSchema>;
