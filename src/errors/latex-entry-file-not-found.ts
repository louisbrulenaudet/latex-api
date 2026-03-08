// src/errors/latex-entry-file-not-found.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexEntryFileNotFoundError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_ENTRY_FILE_NOT_FOUND, details);
  }
}
