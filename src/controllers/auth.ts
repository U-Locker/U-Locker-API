import type { Request, Response } from "express";
import db from "@/services/db";
import jwt from "jsonwebtoken";
import ENV from "@/utils/env";
import {
  adminUpdatableSchema,
  userLoginSchema,
  userUpdatableSchema,
} from "@/models/user";
import { success, unauthorized, validationError } from "@/utils/responses";
import mq from "@/services/mqtt";
import crypto from "crypto";

export const login = async (req: Request, res: Response) => {
  const body = await userLoginSchema.parseAsync(req.body);

  const admin = await db.admin.findUnique({
    where: {
      email: body.email,
    },
  });

  // admin login
  if (admin) {
    const isPasswordValid = await Bun.password.verify(
      body.password,
      admin.password
    );

    if (!isPasswordValid) {
      return unauthorized(res, "Invalid email or password");
    }

    const token = await jwt.sign(
      {
        role: "admin",
        email: admin.email,
      },
      ENV.APP_JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    // set cookie
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === "production",
      partitioned: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return success(res, "Login success", {
      jwt: token,
    });
  }

  const user = await db.user.findUnique({
    where: {
      email: body.email,
    },
  });

  if (!user) {
    return unauthorized(res, "Invalid email or password");
  }

  const isPasswordValid = await Bun.password.verify(
    body.password,
    user.password
  );

  if (!isPasswordValid) {
    return unauthorized(res, "Invalid email or password");
  }

  const token = await jwt.sign(
    {
      role: "user",
      email: user.email,
    },
    ENV.APP_JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );

  // set cookie
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    partitioned: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return success(res, "Login success", {
    jwt: token,
  });
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    partitioned: true,
    sameSite: "none",
  });
  return success(res, "Logout success");
};

export const me = async (req: Request, res: Response) => {
  return success(res, "User data", req.user);
};

export const updateProfile = async (req: Request, res: Response) => {
  if (req.user.role === "admin") {
    const body = await adminUpdatableSchema._def.left
      .partial()
      .parseAsync(req.body);

    await db.admin.update({
      where: {
        id: req.user.data.id,
      },
      data: {
        ...body,
      },
    });

    return success(res, "Profile updated");
  }

  const body = await userUpdatableSchema._def.left
    .partial()
    .parseAsync(req.body);

  await db.user.update({
    where: {
      id: req.user.data.id,
    },
    data: {
      ...body,
    },
  });

  return success(res, "Profile updated");
};

// register
export const register = async (req: Request, res: Response) => {
  const body = await userUpdatableSchema.parseAsync(req.body);

  const user = await db.user.findUnique({
    where: {
      email: body.email,
    },
  });

  if (user) {
    return validationError(res, "Email already registered");
  }

  const hashedPassword = await Bun.password.hash(body.password);

  await db.user.create({
    data: {
      ...body,
      password: hashedPassword,
      Transaction: {
        create: {
          type: "IN",
          amount: 24,
          transactionID: crypto.randomUUID(),
          validatedAt: new Date(),
        },
      },
    },
  });

  if (body.type === "INTERNAL") {
    // delete nfc queue
    const nfc = await db.nFCQueue.findFirst({
      where: {
        ktmUid: body.ktmUid,
      },
    });

    if (nfc) {
      await db.user.update({
        where: {
          email: body.email,
        },
        data: {
          ktmUid: body.ktmUid,
        },
      });

      await db.nFCQueue.delete({
        where: {
          id: nfc.id,
        },
      });

      await mq.publishAsync(
        ENV.APP_MQTT_TOPIC_COMMAND,
        `${nfc.machineId}#NFC_READ#${nfc.ktmUid}`
      );
    }
  }

  return success(res, "Register success");
};
