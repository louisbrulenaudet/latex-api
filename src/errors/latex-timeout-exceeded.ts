// src/errors/latex-timeout-exceeded.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexTimeoutExceededError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_TIMEOUT_EXCEEDED, details);
  }
}
