// src/errors/latex-compilation-failed.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexCompilationFailedError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_COMPILATION_FAILED, details);
  }
}
