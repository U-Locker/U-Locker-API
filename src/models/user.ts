import z from "zod";

const typeEnum = z.enum(["INTERNAL", "EXTERNAL"], {
  invalid_type_error: "User type must be either INTERNAL or EXTERNAL",
  required_error: "User type is required",
});

const externalUser = z.object({
  type: typeEnum.extract(["EXTERNAL"]),
  email: z
    .string({
      required_error: "Email is required",
      invalid_type_error: "Email must be a string",
      message: "Email is required",
    })
    .email("Invalid email address"),
});

const internalUser = z.object({
  type: typeEnum.extract(["INTERNAL"]),
  email: z
    .string({
      required_error: "Email is required",
      invalid_type_error: "Email must be a string",
      message: "Email is required",
    })
    .email("Invalid email address")
    .endsWith("@student.umn.ac.id", "Email must be UMN student email"),
});

export const userUpdatableSchema = z.intersection(
  z.object({
    password: z
      .string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
        message: "Password is required",
      })
      .min(8, "Password must be at least 8 characters long")
      .max(24, "Password must be at most 24 characters long")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^a-zA-Z0-9]/,
        "Password must contain at least one special character"
      ),

    phoneNumber: z
      .string({
        required_error: "Phone number cannot be empty",
        invalid_type_error: "Phone number must be a string",
      })
      .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Invalid Phone number"),

    firstName: z
      .string({
        required_error: "First name is required",
        invalid_type_error: "First name must be a string",
        message: "First name is required",
      })
      .min(3, "First name must be at least 3 characters long")
      .regex(/^[a-zA-Z]+$/, "First name must contain only letters"),
    lastName: z
      .string({
        required_error: "Last name is required",
        invalid_type_error: "Last name must be a string",
        message: "Last name is required",
      })
      .min(1, "Last name must be at least 1 characters long")
      .regex(/^[a-zA-Z]+$/, "Last name must contain only letters")
      .optional(),
  }),
  z.discriminatedUnion("type", [externalUser, internalUser])
);

export const adminUpdatableSchema = z.intersection(
  userUpdatableSchema._def.left.pick({
    firstName: true,
    lastName: true,
    password: true,
  }),
  externalUser.pick({
    email: true,
  })
);

export const userLoginSchema = z.intersection(
  userUpdatableSchema._def.left.pick({
    password: true,
  }),
  externalUser.pick({
    email: true,
  })
);

export type UserUpdatable = z.infer<typeof userUpdatableSchema>;
export type AdminUpdatable = z.infer<typeof adminUpdatableSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
