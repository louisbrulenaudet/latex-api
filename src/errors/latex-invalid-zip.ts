// src/errors/latex-invalid-zip.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexInvalidZipError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_INVALID_ZIP, details);
  }
}
