// src/errors/latex-cleanup-failed.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexCleanupFailedError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_CLEANUP_FAILED, details);
  }
}
