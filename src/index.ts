import Express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import db from "@/services/db";

import ENV from "@/utils/env";
import {
  internalServerError,
  notFound,
  parseZodError,
  unauthorized,
  validationError,
} from "@/utils/responses";

// [Errors]
import { ZodError } from "zod";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

// [Jobs]
import resetCreditJob from "@/jobs/resetCredit";
import checkOverdueJob from "@/jobs/checkOverdue";

// [Route imports]
import indexRoute from "@/routes/index";
import authRouter from "@/routes/auth";
import nfcRouter from "@/routes/nfc";
import lockerRouter from "@/routes/locker";
import rentRouter from "@/routes/rent";
import transactionRouter from "@/routes/transactions";
import statisticsRouter from "@/routes/statistics";

// [MQTT]
import mq from "@/services/mqtt";
import { parsePayload } from "@/utils/parser";

const app = Express();
app.use(cookieParser());

// [CORS]
const allowedOrigins = [
  "https://ulocker.rdhwan.dev", // production client
  "http://localhost:5173", // development client
  "https://localhost:5173", // development https client
];

// [Global Middlewares]
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow credentials to be sent with requests
  })
);

app.use(Express.json());

app.use(
  "/public",
  Express.static(path.join(__dirname, "../public"), {
    extensions: ["png", "jpg", "jpeg", "webp"],
  })
);

// [Routes]
app.use(indexRoute);
app.use("/auth", authRouter);
app.use("/nfc", nfcRouter);
app.use("/locker", lockerRouter);
app.use("/rent", rentRouter);
app.use("/transaction", transactionRouter);
app.use("/statistics", statisticsRouter);

// [Global 404]
app.all("/*path", (_req: Request, res: Response) => {
  return notFound(res, "Route not found");
});

// [Global Error Handler]
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    return unauthorized(res, "Session invalid, please login again");
  }

  // handle zod error
  if (err instanceof ZodError) {
    return validationError(res, parseZodError(err));
  }

  console.error(err);
  return internalServerError(res);
});

// [Listener]
app.listen(ENV.APP_PORT, () => {
  console.log(`[🦊]: Server running on ${ENV.APP_FQDN}`);

  // Start the cron job
  const cron = resetCreditJob();
  const overdue = checkOverdueJob();
  console.log(
    `[🦊]: Cron job ${
      cron.name
    } started : ${cron.nextRun()} - ${cron.isRunning()}`
  );
  console.log(`[🦊]: Cron job ${overdue.name} started : ${overdue.nextRun()}`);

  // [MQTT Handler]
  mq.on("message", async (topic, message) => {
    try {
      console.log(`[🐶]: ${topic} - ${message}`);
      const parse = parsePayload(message.toString());

      if (parse.command === "NFC_READ") {
        console.log(`[🐶]: NFC_READ - ${parse.machineId} - ${parse.data}`);

        if (!parse.data) {
          console.log(`[🐶]: NFC Card not found`);
          return;
        }

        // check user ktmUid whos lending the locker

        const renting = await db.renting.findFirst({
          where: {
            user: {
              ktmUid: parse.data,
            },
            status: "ACTIVE",
          },
          select: {
            id: true,
            status: true,
            endTime: true,
            room: {
              include: {
                locker: {
                  select: {
                    machineId: true,
                  },
                },
              },
            },
          },
        });

        if (renting) {
          console.log(`[🐶]: NFC Card already renting - ${renting.room}`);

          if (renting.room.locker.machineId !== parse.machineId) {
            console.log(`[🐶]: NFC Card not renting on this locker`);
            return;
          }

          if (renting?.status === "OVERDUE") {
            await mq.publishAsync(
              ENV.APP_MQTT_TOPIC_COMMAND,
              `${renting.room.locker.machineId}#LCD#Room overdue, please pay fine first on the app`
            );
            console.log(`[🐶]: Renting is overdue`);
            return;
          }

          await mq.publishAsync(
            ENV.APP_MQTT_TOPIC_COMMAND,
            `${renting.room.locker.machineId}#LCD#Opening Room ${renting.room.doorId}...`
          );

          // send command to open room
          await mq.publishAsync(
            ENV.APP_MQTT_TOPIC_COMMAND,
            `${renting.room.locker.machineId}#OPEN_DOOR#${renting.room.doorId}`
          );
        }

        // handle KTM not found
        const nfc = await db.nFCQueue.findFirst({
          where: {
            ktmUid: parse.data,
          },
        });

        if (nfc) {
          console.log(`[🐶]: NFC Card already on queue`);
        }

        const newNfc = await db.nFCQueue.create({
          data: {
            ktmUid: parse.data,
            machineId: parse.machineId,
          },
        });

        console.log(`[🐶]: NFC Card added to queue - ${newNfc.id}`);
        return;
      }

      // check for heartbeat
      if (parse.command === "HEARTBEAT") {
        console.log(`[🐶]: Heartbeat received - ${parse.machineId}`);

        await db.locker.update({
          where: {
            machineId: parse.machineId,
          },
          data: {
            lastSeenAt: new Date(),
          },
        });

        return;
      }

      if (parse.command === "STARTUP") {
        // send current state to locker
        const locker = await db.locker.findUnique({
          where: {
            machineId: parse.machineId,
          },
          include: {
            Rooms: {
              include: {
                Renting: {
                  where: {
                    status: "ACTIVE",
                  },
                  include: {
                    user: {
                      select: {
                        ktmUid: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // send current state to locker of rented rooms
        const state =
          locker?.Rooms.filter((r) => r.Renting.length > 0).map((room) => {
            return {
              doorId: room.doorId,
              ktmUid: room.Renting[0].user.ktmUid,
            };
          }) ?? [];

        console.log(`[🐶]: Startup received - ${parse.machineId}`);
        await mq.publishAsync(
          ENV.APP_MQTT_TOPIC_COMMAND,
          `${parse.machineId}#STATE#${JSON.stringify(state)}`
        );
      }

      // other command only for acknowledgements
      console.log(
        `[🐶]: Command acks received - ${parse.command} - ${parse.data ?? "x"}`
      );
    } catch (err) {
      console.error("[🐶]: Error handling MQTT message", err);
    }
  });
});
