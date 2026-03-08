// src/errors/latex-pdf-read-failed.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexPdfReadFailedError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_PDF_READ_FAILED, details);
  }
}
