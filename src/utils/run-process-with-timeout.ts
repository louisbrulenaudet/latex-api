// src/utils/run-process-with-timeout.ts

import { LatexTimeoutExceededError } from "../errors";

export interface SpawnedProcess {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
  kill(): void;
}

/**
 * Runs a spawned process with a timeout. Resolves with { exitCode, log } when the process exits, or rejects with LatexTimeoutExceededError when the timeout fires (after killing the process). Clears the timeout when the process exits or when the timeout wins.
 *
 * @param proc - The spawned process.
 * @param timeoutMs - The timeout in milliseconds.
 * @param logPromise - A promise that resolves with the log of the process.
 * @returns A promise that resolves with the exit code and log of the process.
 */
export async function runProcessWithTimeout(
  proc: SpawnedProcess,
  timeoutMs: number,
  logPromise: Promise<string>,
): Promise<{ exitCode: number; log: string }> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      proc.kill();
      reject(
        new LatexTimeoutExceededError("LaTeX compilation timed out", {
          timeoutMs,
        }),
      );
    }, timeoutMs);
  });

  const exitPromise = (async () => {
    const [log, exitCode] = await Promise.all([logPromise, proc.exited]);
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    return { exitCode, log };
  })();

  return Promise.race([exitPromise, timeoutPromise]);
}
