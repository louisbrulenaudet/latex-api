// src/errors/core-error.ts

import { LogLevel } from "../enums/log-level";

export class CoreError extends Error {
  public readonly code: string;

  public readonly details?: Record<string, unknown>;

  /**
   * Constructs a new instance of `CoreError`.
   *
   * @param message - A human-readable message describing the error.
   * @param code - A symbolic error code, defined in the `ErrorCodes` enum.
   * @param details - Optional contextual details about the error.
   */
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }

  /**
   * Converts the error instance into a serializable object suitable for API responses
   * or structured logging.
   *
   * @returns A dictionary containing standardized error fields.
   *
   * @example
   * ```ts
   * const err = new CoreError("Access denied", "PERMISSION_DENIED");
   * console.log(JSON.stringify(err.toJSON(), null, 2));
   * ```
   */
  public toJSON(): Record<string, unknown> {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      details: this.details ?? {},
    };
  }

  /**
   * Returns a human-readable string representation of the error.
   *
   * @returns A string summarizing the error context.
   */
  public override toString(): string {
    const detailsStr =
      this.details !== undefined
        ? ` Details: ${JSON.stringify(this.details)}`
        : "";
    return `${this.name}: ${this.message} [Code: ${this.code}]${detailsStr}`;
  }

  /**
   * Safely logs an error to the console, preventing format string injection attacks.
   * Converts all inputs to safe strings before logging.
   *
   * @param level - The log level (LogLevel enum)
   * @param message - The log message (can contain user input safely)
   * @param error - Optional error object to log
   *
   * @example
   * ```ts
   * CoreError.safeLog(LogLevel.Error, `Failed for ${userInput}`, error);
   * ```
   */
  public static safeLog(
    level: LogLevel,
    message: string,
    error?: unknown,
  ): void {
    // Sanitize the message to prevent format string injection
    const safeMessage = String(message);

    // Convert error to safe string representation
    const errorStr =
      error !== undefined ? CoreError.safeErrorToString(error) : "";

    // Use console method with safe strings only
    const logMessage = errorStr ? `${safeMessage} ${errorStr}` : safeMessage;

    switch (level) {
      case LogLevel.Error:
        console.error(logMessage);
        break;
      case LogLevel.Warn:
        console.warn(logMessage);
        break;
      case LogLevel.Log:
        console.log(logMessage);
        break;
      case LogLevel.Info:
        console.info(logMessage);
        break;
      case LogLevel.Debug:
        console.debug(logMessage);
        break;
    }
  }

  /**
   * Converts any error object to a safe string representation.
   * Prevents format string injection by ensuring proper string conversion.
   *
   * @param error - The error object to convert
   * @returns A safe string representation of the error
   */
  private static safeErrorToString(error: unknown): string {
    if (error instanceof CoreError) {
      return error.toString();
    }

    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    if (typeof error === "string") {
      return error;
    }

    if (typeof error === "object" && error !== null) {
      try {
        return JSON.stringify(error);
      } catch {
        return "[Object]";
      }
    }

    return String(error);
  }
}
