// src/services/latex-service.ts

import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import unzipper from "unzipper";
import { LatexEngine } from "../enums/latex-engine";
import { LogLevel } from "../enums/log-level";
import {
  CoreError,
  LatexCleanupFailedError,
  LatexCompilationFailedError,
  LatexEntryFileNotFoundError,
  LatexFileWriteFailedError,
  LatexInvalidZipError,
  LatexPdfReadFailedError,
  LatexTempDirCreationFailedError,
  LatexUnsafeFileError,
  LatexZipExtractionFailedError,
} from "../errors";
import {
  sanitizePath,
  validateZipEntry,
  type ZipEntryLike,
} from "../utils/file-validator";
import {
  ensureTexExtension,
  texBasenameToPdfBasename,
} from "../utils/latex-paths";
import { readStreamWithCap } from "../utils/read-stream-with-cap";
import { runProcessWithTimeout } from "../utils/run-process-with-timeout";
import {
  getEntryType,
  isZipEntryDirectory,
  type UnzipperEntryLike,
} from "../utils/zip-entry";

const MAX_LOG_BYTES = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ERROR_LINES = 20;
const TAIL_LINES = 50;

export type CompilationResult = { pdf: Buffer; uuid: string };

export interface CompileOptions {
  timeoutMs?: number;
  runTwice?: boolean;
  engine?: LatexEngine;
}

interface ExtractionContext {
  extractedPaths: Set<string>;
  texBasenameToPaths: Map<string, string[]>;
}

const LOG_UNAVAILABLE = "(log unavailable)";

const defaultCompileOptions: Required<CompileOptions> = {
  timeoutMs: DEFAULT_TIMEOUT_MS,
  runTwice: false,
  engine: LatexEngine.PDFLATEX,
};

export class LatexService {
  async compile(
    latexContent: string,
    options?: CompileOptions,
  ): Promise<CompilationResult> {
    const opts = { ...defaultCompileOptions, ...options };
    const uuid = Bun.randomUUIDv7();
    const dir = await this.createTempDirectory(uuid);
    const texBasename = uuid;
    try {
      await this.writeTexFile(dir, texBasename, latexContent);
      const pdf = await this.runCompilationPassesAndReadPdf({
        workDir: dir,
        texBasename,
        engine: opts.engine,
        timeoutMs: opts.timeoutMs,
        runTwice: opts.runTwice,
      });
      return { pdf, uuid };
    } finally {
      await this.cleanup(dir);
    }
  }

  /**
   * Runs 1 or 2 LaTeX passes in workDir for the given texBasename, then reads the produced PDF. Throws LatexCompilationFailedError on compilation failure.
   *
   * @param options - The options for the compilation.
   * @param options.workDir - The working directory for the compilation.
   * @param options.texBasename - The basename of the LaTeX file.
   * @param options.engine - The LaTeX engine to use.
   * @param options.timeoutMs - The timeout in milliseconds.
   * @param options.runTwice - Whether to run the compilation twice.
   * @returns The compiled PDF.
   * @throws LatexCompilationFailedError if the compilation fails.
   * @throws LatexTimeoutExceededError if the compilation times out.
   * @throws LatexInvalidZipError if the ZIP file is invalid or corrupted.
   * @throws LatexZipExtractionFailedError if the ZIP file extraction fails.
   */
  private async runCompilationPassesAndReadPdf(options: {
    workDir: string;
    texBasename: string;
    engine: LatexEngine;
    timeoutMs: number;
    runTwice: boolean;
  }): Promise<Buffer> {
    const { workDir, texBasename, engine, timeoutMs, runTwice } = options;
    const passes = runTwice ? 2 : 1;
    for (let pass = 0; pass < passes; pass++) {
      const { success, log } = await this.runLatex(
        engine,
        texBasename,
        workDir,
        timeoutMs,
      );
      if (!success) {
        const message = this.parseLatexLog(log);
        throw new LatexCompilationFailedError("LaTeX compilation failed", {
          log: message,
        });
      }
    }
    const pdfPath = join(workDir, texBasenameToPdfBasename(texBasename));
    return this.readPdfFile(pdfPath);
  }

  /**
   * Creates a temporary directory for the LaTeX compilation.
   *
   * @param uuid - The UUID of the compilation.
   * @returns The path to the temporary directory.
   * @throws LatexTempDirCreationFailedError if the temporary directory creation fails.
   */
  async createTempDirectory(uuid: string): Promise<string> {
    const dir = join("/tmp", `latex-${uuid}`);
    try {
      await mkdir(dir, { recursive: true });
      return dir;
    } catch (err) {
      throw new LatexTempDirCreationFailedError(
        "Failed to create temporary directory for LaTeX compilation",
        { cause: err },
      );
    }
  }

  /**
   * Writes a LaTeX file to the temporary directory.
   *
   * @param dir - The path to the temporary directory.
   * @param texBasename - The basename of the LaTeX file.
   * @param content - The content of the LaTeX file.
   * @returns The path to the LaTeX file.
   * @throws LatexFileWriteFailedError if the LaTeX file writing fails.
   */
  async writeTexFile(
    dir: string,
    texBasename: string,
    content: string,
  ): Promise<string> {
    const texPath = join(dir, ensureTexExtension(texBasename));
    try {
      await Bun.write(texPath, content);
      return texPath;
    } catch (err) {
      throw new LatexFileWriteFailedError("Failed to write LaTeX file", {
        cause: err,
      });
    }
  }

  /**
   * Runs a LaTeX compilation.
   *
   * @param engine - The LaTeX engine to use.
   * @param texRelativePath - The relative path to the LaTeX file.
   * @param workingDir - The working directory for the compilation.
   * @param timeoutMs - The timeout in milliseconds.
   * @returns The success of the compilation and the log.
   * @throws CoreError if the compilation fails.
   * @throws LatexTimeoutExceededError if the compilation times out.
   * @throws LatexInvalidZipError if the ZIP file is invalid or corrupted.
   * @throws LatexZipExtractionFailedError if the ZIP file extraction fails.
   */
  async runLatex(
    engine: LatexEngine,
    texRelativePath: string,
    workingDir: string,
    timeoutMs: number,
  ): Promise<{ success: boolean; log: string }> {
    const texFile = ensureTexExtension(texRelativePath);
    const proc = Bun.spawn(
      [engine, "-interaction=nonstopmode", "-halt-on-error", texFile],
      {
        cwd: workingDir,
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const capPerStream = Math.floor(MAX_LOG_BYTES / 2);
    const logPromise = Promise.all([
      readStreamWithCap(proc.stdout, capPerStream),
      readStreamWithCap(proc.stderr, capPerStream),
    ]).then(([stdout, stderr]) => [stdout, stderr].filter(Boolean).join("\n"));

    try {
      const { exitCode, log } = await runProcessWithTimeout(
        proc,
        timeoutMs,
        logPromise,
      );
      return { success: exitCode === 0, log };
    } catch (err) {
      if (err instanceof CoreError) {
        throw err;
      }
      // Unexpected error (e.g. stream read failure): log and return structured failure
      CoreError.safeLog(
        LogLevel.Warn,
        "LaTeX run failed with unexpected error",
        err instanceof Error ? err : new Error(String(err)),
      );
      return { success: false, log: LOG_UNAVAILABLE };
    }
  }

  /**
   * Compiles a LaTeX file from a ZIP archive.
   *
   * @param zipBuffer - The buffer of the ZIP archive.
   * @param entryFile - The entry file of the ZIP archive.
   * @param options - The options for the compilation.
   * @returns The compiled PDF.
   * @throws LatexEntryFileNotFoundError if the entry file is not found in the ZIP archive.
   * @throws LatexInvalidZipError if the ZIP file is invalid or corrupted.
   * @throws LatexZipExtractionFailedError if the ZIP file extraction fails.
   * @throws LatexFileWriteFailedError if the LaTeX file writing fails.
   * @throws LatexTempDirCreationFailedError if the temporary directory creation fails.
   * @throws LatexCleanupFailedError if the cleanup fails.
   */
  async compileFromZip(
    zipBuffer: Buffer,
    entryFile: string,
    options?: CompileOptions,
  ): Promise<CompilationResult> {
    const opts = { ...defaultCompileOptions, ...options };
    const uuid = Bun.randomUUIDv7();
    const dir = await this.createTempDirectory(uuid);
    const context: ExtractionContext = {
      extractedPaths: new Set<string>(),
      texBasenameToPaths: new Map<string, string[]>(),
    };

    try {
      await this.extractZipSafely(zipBuffer, dir, context);
      const normalizedEntry = this.normalizeEntryFile(entryFile);
      const resolvedEntry = this.resolveEntryFile(normalizedEntry, context);
      if (!resolvedEntry) {
        throw new LatexEntryFileNotFoundError(
          `Entry file not found in ZIP: ${entryFile}`,
          { entryFile, allowed: [...context.extractedPaths] },
        );
      }
      // Run LaTeX from the entry file's directory so \input{} and \includegraphics{} resolve correctly
      const workDir = resolvedEntry.includes("/")
        ? join(dir, dirname(resolvedEntry))
        : dir;
      const texBasename = resolvedEntry.split("/").pop() ?? resolvedEntry;

      const pdf = await this.runCompilationPassesAndReadPdf({
        workDir,
        texBasename,
        engine: opts.engine,
        timeoutMs: opts.timeoutMs,
        runTwice: opts.runTwice,
      });
      return { pdf, uuid };
    } finally {
      await this.cleanup(dir);
    }
  }

  /**
   * Normalizes the entry file path.
   *
   * @param entryFile - The entry file path.
   * @returns The normalized entry file path.
   */
  private normalizeEntryFile(entryFile: string): string {
    return entryFile.replace(/\\/g, "/").replace(/^\//, "").trim();
  }

  /**
   * Resolves the entry file path.
   *
   * @param normalizedEntry - The normalized entry file path.
   * @param context - The context of the extraction.
   * @returns The resolved entry file path.
   */
  private resolveEntryFile(
    normalizedEntry: string,
    context: ExtractionContext,
  ): string | null {
    if (context.extractedPaths.has(normalizedEntry)) {
      return normalizedEntry;
    }
    const basename = (
      normalizedEntry.split("/").pop() ?? normalizedEntry
    ).toLowerCase();
    const paths = context.texBasenameToPaths.get(basename);
    if (paths?.length === 1) {
      return paths[0] ?? null;
    }
    return null;
  }

  /**
   * Extracts a ZIP archive safely.
   *
   * @param zipBuffer - The buffer of the ZIP archive.
   * @param dir - The path to the temporary directory.
   * @param context - The context of the extraction.
   * @returns The extracted paths.
   * @throws LatexInvalidZipError if the ZIP file is invalid or corrupted.
   * @throws LatexZipExtractionFailedError if the ZIP file extraction fails.
   * @throws LatexFileWriteFailedError if the LaTeX file writing fails.
   * @throws LatexTempDirCreationFailedError if the temporary directory creation fails.
   * @throws LatexCleanupFailedError if the cleanup fails.
   */
  private async extractZipSafely(
    zipBuffer: Buffer,
    dir: string,
    context: ExtractionContext,
  ): Promise<void> {
    type ZipDirectory = Awaited<ReturnType<typeof unzipper.Open.buffer>>;
    let directory: ZipDirectory;
    try {
      directory = await unzipper.Open.buffer(zipBuffer);
    } catch (err) {
      throw new LatexInvalidZipError("Invalid or corrupted ZIP file", {
        cause: err,
      });
    }

    const files = directory.files;
    if (!Array.isArray(files) || files.length === 0) {
      throw new LatexInvalidZipError("ZIP file is empty");
    }

    for (const entry of files) {
      await this.extractZipEntry(entry as UnzipperEntryLike, dir, context);
    }
  }

  /**
   * Extracts a ZIP entry.
   *
   * @param entry - The ZIP entry.
   * @param dir - The path to the temporary directory.
   * @param context - The context of the extraction.
   * @returns The extracted path.
   * @throws LatexUnsafeFileError if the ZIP entry is unsafe.
   * @throws LatexZipExtractionFailedError if the ZIP entry extraction fails.
   * @throws LatexFileWriteFailedError if the ZIP entry writing fails.
   * @throws LatexTempDirCreationFailedError if the temporary directory creation fails.
   * @throws LatexCleanupFailedError if the cleanup fails.
   */
  private async extractZipEntry(
    entry: UnzipperEntryLike,
    dir: string,
    context: ExtractionContext,
  ): Promise<void> {
    const entryLike: ZipEntryLike = {
      path: entry.path,
      type: entry.type,
    };
    try {
      validateZipEntry(entryLike);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new LatexUnsafeFileError(`Unsafe file in ZIP: ${msg}`, {
        path: entry.path,
      });
    }

    const sanitized = sanitizePath(entry.path);
    const typeNorm = getEntryType(entry);

    if (isZipEntryDirectory(typeNorm, sanitized)) {
      const fullPath = join(dir, sanitized.replace(/\/$/, ""));
      if (fullPath !== dir) {
        await mkdir(fullPath, { recursive: true });
      }
      return;
    }

    let buf: Buffer;
    try {
      buf = await entry.buffer();
    } catch (err) {
      throw new LatexZipExtractionFailedError(
        "Failed to extract file from ZIP",
        { path: entry.path, cause: err },
      );
    }

    const outPath = join(dir, sanitized);
    const parentDir = join(outPath, "..");
    await mkdir(parentDir, { recursive: true });
    try {
      await Bun.write(outPath, buf);
    } catch (err) {
      throw new LatexFileWriteFailedError("Failed to write extracted file", {
        path: outPath,
        cause: err,
      });
    }

    context.extractedPaths.add(sanitized);
    if (sanitized.toLowerCase().endsWith(".tex")) {
      const basename = (sanitized.split("/").pop() ?? sanitized).toLowerCase();
      const existing = context.texBasenameToPaths.get(basename);
      if (existing) {
        existing.push(sanitized);
      } else {
        context.texBasenameToPaths.set(basename, [sanitized]);
      }
    }
  }

  /**
   * Reads a PDF file.
   *
   * @param pdfPath - The path to the PDF file.
   * @returns The PDF file.
   * @throws LatexPdfReadFailedError if the PDF file reading fails.
   */
  async readPdfFile(pdfPath: string): Promise<Buffer> {
    try {
      const file = Bun.file(pdfPath);
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      throw new LatexPdfReadFailedError("Failed to read compiled PDF", {
        path: pdfPath,
        cause: err,
      });
    }
  }

  /**
   * Cleans up the temporary directory.
   *
   * @param dir - The path to the temporary directory.
   * @throws LatexCleanupFailedError if the cleanup fails.
   */
  async cleanup(dir: string): Promise<void> {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch (err) {
      const cleanupError = new LatexCleanupFailedError(
        `Cleanup failed for ${dir}`,
        { path: dir, cause: err },
      );
      CoreError.safeLog(LogLevel.Warn, cleanupError.message, cleanupError);
    }
  }

  /**
   * Extract meaningful error lines from a LaTeX log (lines starting with !) or return the last N lines if no explicit errors found. Single pass to avoid building a full lines array. Short-circuits when enough error lines are collected.
   *
   * @param log - The log of the LaTeX compilation.
   * @param maxErrorLines - The maximum number of error lines to collect.
   * @returns The parsed log.
   */
  parseLatexLog(log: string, maxErrorLines: number = MAX_ERROR_LINES): string {
    const errorLines: string[] = [];
    const tailLines: string[] = [];
    let start = 0;
    for (let i = 0; i <= log.length; i++) {
      const isEnd = i === log.length;
      const isNewline = !isEnd && log[i] === "\n";
      if (isEnd || isNewline) {
        const line = log.slice(
          start,
          isEnd && start < log.length ? undefined : i,
        );
        start = i + 1;
        // Collect lines starting with ! (LaTeX error lines)
        if (line.startsWith("!")) {
          errorLines.push(line);
          if (errorLines.length >= maxErrorLines) {
            return errorLines.join("\n");
          }
        }
        // Keep a sliding window of last N lines for fallback
        tailLines.push(line);
        if (tailLines.length > TAIL_LINES) {
          tailLines.shift();
        }
      }
    }
    if (errorLines.length > 0) {
      return errorLines.join("\n");
    }
    const tail = tailLines.join("\n").trim();
    return tail || log;
  }
}
