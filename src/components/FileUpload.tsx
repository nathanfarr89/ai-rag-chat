import { useRef, useState } from "react";
import { chunkText } from "../lib/chunking";
import type { Chunk } from "../types";

interface Props {
  onDocumentReady: (fileName: string, chunks: Chunk[]) => void;
}

export function FileUpload({ onDocumentReady }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      setStatus("Reading file…");
      let text: string;
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const { extractTextFromPdf } = await import("../lib/pdf");
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        throw new Error("No text could be extracted from this file.");
      }

      setStatus("Splitting into chunks…");
      const texts = chunkText(text);
      if (texts.length === 0) {
        throw new Error("Document appears to be empty.");
      }

      const { embedTexts } = await import("../lib/embeddings");
      const embeddings = await embedTexts(texts, (msg) => setStatus(msg));

      const chunks: Chunk[] = texts.map((t, i) => ({
        id: i,
        text: t,
        embedding: embeddings[i],
      }));

      setStatus(`Ready — ${chunks.length} chunks indexed from ${file.name}`);
      onDocumentReady(file.name, chunks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file.");
      setStatus(null);
    }
  }

  return (
    <div className="file-upload">
      <h2>Document</h2>
      <p className="settings-hint">
        Upload a .txt, .md, or .pdf file. It's parsed and embedded entirely in your browser —
        the file itself is never uploaded anywhere.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.pdf,text/plain,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {status && <p className="status-line">{status}</p>}
      {error && <p className="error-line">{error}</p>}
    </div>
  );
}
