// src/utils/latex-paths.ts

/** If name already ends with .tex (case-insensitive) return as-is, else append .tex */
export function ensureTexExtension(name: string): string {
  return name.toLowerCase().endsWith(".tex") ? name : `${name}.tex`;
}

/**
 * Replace trailing .tex with .pdf (case-insensitive); if no .tex, append .pdf
 *
 * @param texBasename - The basename of the LaTeX file.
 * @returns The basename of the PDF file.
 */
export function texBasenameToPdfBasename(texBasename: string): string {
  return texBasename.toLowerCase().endsWith(".tex")
    ? texBasename.replace(/\.tex$/i, ".pdf")
    : `${texBasename}.pdf`;
}
