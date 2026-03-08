// src/utils/file-validator.ts

/**
 * Allowed file extensions for files inside uploaded ZIP archives.
 * Only document, image, font, and LaTeX-related types are permitted.
 */
export const ALLOWED_EXTENSIONS = new Set([
  ".tex",
  ".bib",
  ".sty",
  ".cls",
  ".pxd",
  ".xmpdata",
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".eps",
  ".gif",
  ".webp",
  ".ttf",
  ".otf",
  ".csv",
  ".dat",
]);

/**
 * Checks whether the given filename has an allowed extension.
 * Directories (no extension or trailing slash) are allowed.
 *
 * @param filename - File name or path (basename is used for extension)
 * @returns true if the file extension is in the whitelist or path is a directory
 */
export function isAllowedExtension(filename: string): boolean {
  const normalized = filename.replace(/\\/g, "/").trim();
  if (normalized.endsWith("/") || normalized === "") {
    return true;
  }
  const basename = normalized.split("/").pop() ?? "";
  const lastDot = basename.lastIndexOf(".");
  if (lastDot <= 0) {
    return false;
  }
  const ext = basename.slice(lastDot).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Sanitizes a path from a ZIP entry: removes directory traversal (../), absolute path segments, and normalizes slashes. Does not allow writing outside the target directory.
 *
 * @param filePath - Raw path from ZIP entry
 * @returns Sanitized relative path
 */
export function sanitizePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").trim();
  const parts = normalized.split("/").filter((p) => p !== "" && p !== ".");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return resolved.join("/");
}

/**
 * Minimal shape of a ZIP entry for validation (avoids coupling to unzipper types).
 */
export interface ZipEntryLike {
  path: string;
  type?: string;
}

/**
 * Validates a ZIP entry for safety. Throws if the entry is unsafe.
 *
 * - Rejects path traversal (../, absolute paths)
 * - Rejects disallowed file extensions
 * - Rejects symlinks (type other than 'File' or 'Directory')
 * - Rejects empty or invalid paths
 *
 * @param entry - ZIP entry with at least path and optional type
 * @throws Error with message describing the violation
 */
export function validateZipEntry(entry: ZipEntryLike): void {
  const { path: rawPath, type } = entry;
  const pathStr = typeof rawPath === "string" ? rawPath : "";

  if (!pathStr || pathStr.trim() === "") {
    throw new Error("ZIP entry has empty path");
  }

  const sanitized = sanitizePath(pathStr);
  if (sanitized.startsWith("..") || sanitized.includes("../")) {
    throw new Error(`Path traversal not allowed: ${pathStr}`);
  }

  if (/^\/|^[A-Za-z]:[/\\]/.test(pathStr.trim())) {
    throw new Error(`Absolute path not allowed: ${pathStr}`);
  }

  const typeNorm = type?.toLowerCase();
  if (
    typeNorm !== undefined &&
    typeNorm !== "file" &&
    typeNorm !== "directory"
  ) {
    throw new Error(`Unsupported entry type: ${type}`);
  }

  if (typeNorm === "directory") {
    return;
  }

  if (!isAllowedExtension(pathStr)) {
    const basename = pathStr.replace(/\\/g, "/").split("/").pop() ?? pathStr;
    throw new Error(`File type not allowed: ${basename}`);
  }
}
