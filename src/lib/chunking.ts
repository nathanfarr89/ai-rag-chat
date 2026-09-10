const CHUNK_SIZE_WORDS = 180;
const CHUNK_OVERLAP_WORDS = 30;

/** Splits text into overlapping word-count chunks, roughly paragraph-aware. */
export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE_WORDS, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - CHUNK_OVERLAP_WORDS;
  }
  return chunks;
}
