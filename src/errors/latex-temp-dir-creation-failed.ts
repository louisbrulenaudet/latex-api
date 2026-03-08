// src/errors/latex-temp-dir-creation-failed.ts

import { Errors } from "../enums/errors";
import { CoreError } from "./core-error";

export class LatexTempDirCreationFailedError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, Errors.LATEX_TEMP_DIR_CREATION_FAILED, details);
  }
}
