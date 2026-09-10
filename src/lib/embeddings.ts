import type { Chunk, RetrievedChunk } from "../types";

export type ProgressCallback = (status: string) => void;

type WorkerResponse =
  | { id: number; type: "progress"; status: string }
  | { id: number; type: "result"; embeddings: number[][] }
  | { id: number; type: "error"; message: string };

let worker: Worker | null = null;
let nextId = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./embeddingWorker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

function runEmbedJob(texts: string[], onProgress?: ProgressCallback): Promise<number[][]> {
  const w = getWorker();
  const id = nextId++;

  return new Promise((resolve, reject) => {
    function handleMessage(event: MessageEvent<WorkerResponse>) {
      if (event.data.id !== id) return;
      if (event.data.type === "progress") {
        onProgress?.(event.data.status);
      } else if (event.data.type === "result") {
        w.removeEventListener("message", handleMessage);
        resolve(event.data.embeddings);
      } else if (event.data.type === "error") {
        w.removeEventListener("message", handleMessage);
        reject(new Error(event.data.message));
      }
    }
    w.addEventListener("message", handleMessage);
    w.postMessage({ id, texts });
  });
}

export function embedTexts(texts: string[], onProgress?: ProgressCallback): Promise<number[][]> {
  return runEmbedJob(texts, onProgress);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await runEmbedJob([text]);
  return embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // embeddings are already normalized, so dot product == cosine similarity
}

export function retrieveTopK(query: number[], chunks: Chunk[], k: number): RetrievedChunk[] {
  return chunks
    .map((chunk) => ({ chunk, score: cosineSimilarity(query, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
