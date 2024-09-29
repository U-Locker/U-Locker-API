declare namespace Express {
  export interface Request {
    user:
      | {
          role: "admin";
          data: Omit<
            import("@prisma/client").Admin,
            "password" | "updatedAt" | "createdAt"
          >;
        }
      | {
          role: "user";
          data: Omit<
            import("@prisma/client").User,
            "password" | "updatedAt" | "createdAt"
          >;
        };
  }
}
