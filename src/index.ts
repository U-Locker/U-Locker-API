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

// [Route imports]
import indexRoute from "@/routes/index";
import authRouter from "@/routes/auth";
import nfcRouter from "@/routes/nfc";
import lockerRouter from "@/routes/locker";
import rentRouter from "@/routes/rent";

// [MQTT]
import mq from "@/services/mqtt";
import { parsePayload } from "@/utils/parser";

const app = Express();
app.use(cookieParser());

// [CORS]
const allowedOrigins = [
  "https://ulocker.rdhwan.dev", // production client
  "http://localhost:5173", // development client
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
  console.log(
    `[🦊]: Cron job ${
      cron.name
    } started : ${cron.nextRun()} - ${cron.isRunning()}`
  );

  // [MQTT Handler]
  mq.on("message", async (topic, message) => {
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
          user: {
            select: {
              credits: true,
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

        // check if endTime is passed and reduce credits
        const endTime = new Date(renting.endTime);
        const currentTime = new Date();

        if (endTime < currentTime) {
          const diff = endTime.getTime() - currentTime.getTime();
          const diffHours = Math.floor(diff / (1000 * 60 * 60));

          if (diffHours > 0) {
            await db.renting.update({
              where: {
                id: renting.id,
              },
              data: {
                status: "OVERDUE",
                user: {
                  update: {
                    credits: {
                      decrement: diffHours,
                    },
                  },
                },
              },
            });
          }
        }

        // re check the renting status
        const finalRent = await db.renting.findUnique({
          where: {
            id: renting.id,
          },
          include: {
            room: true,
            user: true,
          },
        });

        console.log(`[🐶]: Renting status - ${finalRent?.status}`);

        if (finalRent?.status === "OVERDUE") {
          mq.publish(
            ENV.APP_MQTT_TOPIC_COMMAND,
            `${renting.room.locker.machineId}#LCD#Room overdue, please pay fine first on the app`
          );
          console.log(`[🐶]: Renting is overdue`);
          return;
        }

        mq.publish(
          ENV.APP_MQTT_TOPIC_COMMAND,
          `${renting.room.locker.machineId}#LCD#Opening Room ${renting.room.doorId}...`
        );

        // send command to open room
        mq.publish(
          ENV.APP_MQTT_TOPIC_COMMAND,
          `${renting.room.locker.machineId}#OPEN_ROOM#${renting.room.doorId}`
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

    // other command only for acknowledgements
    console.log(
      `[🐶]: Command acks received - ${parse.command} - ${parse.data ?? "x"}`
    );
  });
});
