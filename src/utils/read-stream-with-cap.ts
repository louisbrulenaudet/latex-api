// src/utils/read-stream-with-cap.ts

/**
 * Read a stream with a maximum number of bytes.
 * Collects decoded chunks and joins once to avoid repeated string concatenation.
 * @param stream - The stream to read.
 * @param maxBytes - The maximum number of bytes to read.
 * @returns The read string.
 */
export async function readStreamWithCap(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalLength = 0;
  try {
    while (totalLength < maxBytes) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const decoded = decoder.decode(value, { stream: true });
      if (totalLength + decoded.length <= maxBytes) {
        chunks.push(decoded);
        totalLength += decoded.length;
      } else {
        const remaining = maxBytes - totalLength;
        chunks.push(decoded.slice(0, remaining));
        chunks.push("\n...(truncated)");
        reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return chunks.join("");
}
