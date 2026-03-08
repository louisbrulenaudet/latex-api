// src/errors/index.ts

import { LogLevel } from "../enums/log-level";
import { CoreError } from "./core-error";
import { LatexCleanupFailedError } from "./latex-cleanup-failed";
import { LatexCompilationFailedError } from "./latex-compilation-failed";
import { LatexEntryFileNotFoundError } from "./latex-entry-file-not-found";
import { LatexFileWriteFailedError } from "./latex-file-write-failed";
import { LatexInvalidZipError } from "./latex-invalid-zip";
import { LatexPdfReadFailedError } from "./latex-pdf-read-failed";
import { LatexTempDirCreationFailedError } from "./latex-temp-dir-creation-failed";
import { LatexTimeoutExceededError } from "./latex-timeout-exceeded";
import { LatexUnsafeFileError } from "./latex-unsafe-file";
import { LatexZipExtractionFailedError } from "./latex-zip-extraction-failed";

export {
  CoreError,
  LatexCleanupFailedError,
  LatexCompilationFailedError,
  LatexEntryFileNotFoundError,
  LatexFileWriteFailedError,
  LatexInvalidZipError,
  LatexPdfReadFailedError,
  LatexTempDirCreationFailedError,
  LatexTimeoutExceededError,
  LatexUnsafeFileError,
  LatexZipExtractionFailedError,
  LogLevel,
};
