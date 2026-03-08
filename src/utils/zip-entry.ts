// src/utils/zip-entry.ts

export interface UnzipperEntryLike {
  path: string;
  type?: string;
  buffer(): Promise<Buffer>;
}

/**
 * Get the type of a ZIP entry.
 *
 * @param entry - The ZIP entry.
 * @returns The type of the ZIP entry.
 */
export function getEntryType(entry: UnzipperEntryLike): string | undefined {
  return entry.type?.toLowerCase();
}

/**
 * Check if a ZIP entry is a directory.
 *
 * @param typeNorm - The type of the ZIP entry.
 * @param sanitized - The sanitized path of the ZIP entry.
 * @returns True if the ZIP entry is a directory, false otherwise.
 */
export function isZipEntryDirectory(
  typeNorm: string | undefined,
  sanitized: string,
): boolean {
  return (
    typeNorm === "directory" || sanitized.endsWith("/") || sanitized === ""
  );
}
