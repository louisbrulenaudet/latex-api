// src/errors/latex-unsafe-file.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexUnsafeFileError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_UNSAFE_FILE, details);
  }
}
