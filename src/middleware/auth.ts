import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "@/services/db";
import ENV from "@/utils/env";
import { forbidden, unauthorized } from "@/utils/responses";

/**
 * Middleware to verify JSON Web Token (JWT) from cookies and authenticate the user.
 *
 * @param req - The request object from the client.
 * @param res - The response object to send back to the client.
 * @param next - The next middleware function in the stack.
 *
 * @returns If the token is invalid or the user is not found, it sends an unauthorized response.
 *
 * @remarks
 * This middleware checks for the presence of a JWT in the cookies. If the token is present,
 * it verifies the token using the application's secret key. Depending on the role specified
 * in the token, it fetches the corresponding user or admin from the database. If the user or
 * admin is found, it attaches the user information to the request object and calls the next
 * middleware function. If the token is missing, invalid, or the user/admin is not found, it
 * sends an unauthorized response.
 */
export const verifyJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.jwt as string | undefined;
  if (!token) {
    return unauthorized(res, "Unauthorized, please login");
  }

  const decoded = jwt.verify(token, ENV.APP_JWT_SECRET) as {
    role: "admin" | "user";
    email: string;
  };

  if (decoded.role === "admin") {
    const admin = await db.admin.findUnique({
      where: {
        email: decoded.email,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!admin) {
      return unauthorized(res, "Session invalid, please login again");
    }

    req.user = {
      role: "admin",
      data: admin,
    };
  } else {
    const user = await db.user.findUnique({
      where: {
        email: decoded.email,
      },
      select: {
        id: true,
        email: true,
        type: true,
        ktmUid: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      return unauthorized(res, "Session invalid, please login again");
    }

    req.user = {
      role: "user",
      data: user,
    };
  }

  next();
};

/**
 * Middleware factory to verify the role of the user.
 *
 * @param role - The role to verify against. Can be either "admin" or "user".
 * @returns A middleware function that checks if the user's role matches the specified role.
 * If the user's role does not match, it responds with a forbidden status and message.
 * Otherwise, it calls the next middleware function.
 *
 * @example
 * // Usage in an Express route
 * app.get('/admin', verifyJwt, verifyRole('admin'), (req, res) => {
 *   res.send('Welcome, admin!');
 * });
 */
export const verifyRole =
  (role: "admin" | "user") =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user.role !== role) {
      return forbidden(res, "You are not allowed to access this resource");
    }

    next();
  };
