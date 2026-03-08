// src/middlewares/compile-content-type.ts

import type { Context, Next } from "hono";
import { CompileMode } from "../enums/compile-mode";

const UNSUPPORTED_MESSAGE =
  "Unsupported content type. Use application/json or multipart/form-data.";

/**
 * Get the compile mode from the content type (application/json or multipart/form-data).
 *
 * @param contentType - The content type.
 * @returns The compile mode.
 */
function getCompileMode(contentType: string): CompileMode | null {
  if (contentType.includes("application/json")) {
    return CompileMode.JSON;
  }
  if (contentType.includes("multipart/form-data")) {
    return CompileMode.ZIP;
  }
  return null;
}

/**
 * Require the compile content type to be application/json or multipart/form-data.
 *
 * @returns The middleware function.
 */
export function requireCompileContentType() {
  return async (
    c: Context<{ Variables: { compileMode: CompileMode } }>,
    next: Next,
  ) => {
    const contentType = c.req.header("content-type") ?? "";
    const compileMode = getCompileMode(contentType);
    if (compileMode === null) {
      return c.json({ error: UNSUPPORTED_MESSAGE }, 415);
    }
    c.set("compileMode", compileMode);
    return next();
  };
}
