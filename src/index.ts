import Express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import ENV from "@/utils/env";
import { internalServerError, notFound } from "@/utils/responses";

// [Route imports]
import indexRoute from "@/routes/index.route";

const app = Express();

// [CORS]
const allowedOrigins = [
  "https://api.ulocker.com", // production client
  "https://localhost:5173", // development client
];

// [Global Middlewares]
app.use(cookieParser());
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

// [Global 404]
app.all("*", (_req: Request, res: Response) => {
  return notFound(res, "Route not found");
});

// [Global Error Handler]
app.use((err: Error, _req: Request, res: Response) => {
  console.error(err);
  return internalServerError(res);
});

// [Listener]
app.listen(ENV.APP_PORT, () => {
  console.log(`Server running on ${ENV.APP_FQDN}`);
});
