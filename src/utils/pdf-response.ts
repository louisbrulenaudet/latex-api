// src/utils/pdf-response.ts

/**
 * Create a PDF response with the given PDF buffer, UUID and appropriate headers.
 *
 * @param pdf - The PDF buffer.
 * @param uuid - The UUID of the PDF.
 * @returns The PDF response.
 */
export function createPdfResponse(pdf: Buffer, uuid: string): Response {
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `inline; filename="${uuid}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
