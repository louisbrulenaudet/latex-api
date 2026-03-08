// src/errors/latex-file-write-failed.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexFileWriteFailedError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_FILE_WRITE_FAILED, details);
  }
}
