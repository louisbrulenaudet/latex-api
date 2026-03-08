// src/errors/latex-zip-extraction-failed.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexZipExtractionFailedError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_ZIP_EXTRACTION_FAILED, details);
  }
}
