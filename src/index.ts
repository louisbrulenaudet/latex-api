// src/index.ts

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import packageJson from "../package.json";
import { Errors } from "./enums/errors";
import { CoreError, LogLevel } from "./errors";
import healthRoute from "./routes/health";
import latexRoute from "./routes/latex";

function statusForCoreError(code: string): 400 | 408 | 422 | 500 {
  switch (code) {
    case Errors.LATEX_COMPILATION_FAILED:
      return 422;
    case Errors.LATEX_TIMEOUT_EXCEEDED:
      return 408;
    case Errors.LATEX_INVALID_ZIP:
    case Errors.LATEX_UNSAFE_FILE:
    case Errors.LATEX_ENTRY_FILE_NOT_FOUND:
      return 400;
    default:
      return 500;
  }
}

const app = new Hono();

app.use(secureHeaders());

const allowedHeaders = ["Content-Type", "Authorization"];
const allowedMethods = ["GET", "POST", "OPTIONS"];

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowHeaders: allowedHeaders,
    allowMethods: allowedMethods,
    maxAge: 86400,
  }),
);

const api = new Hono();

api.use(
  bodyLimit({
    maxSize: 10 * 1024 * 1024, // 10MB (ZIP with images)
    onError: (c) => c.json({ error: "Request body too large" }, 413),
  }),
);

api.use(async (c, next) => {
  if (process.env.NODE_ENV !== "production") {
    return prettyJSON()(c, next);
  }
  return next();
});

api.route("/health", healthRoute);
api.route("/latex", latexRoute);

app.route("/api/v1", api);

app.get("/", (c) =>
  c.json(
    {
      message: "LaTeX API",
      version: packageJson.version,
    },
    200,
  ),
);

app.onError((error, c) => {
  CoreError.safeLog(LogLevel.Error, "LaTeX API error", error);
  if (error instanceof CoreError) {
    const status = statusForCoreError(error.code);
    return c.json(error.toJSON(), status);
  }
  return c.json({ error: "Internal server error" }, 500);
});

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOST ?? "0.0.0.0";

export default {
  port,
  hostname,
  fetch: app.fetch,
};
export type App = typeof app;
