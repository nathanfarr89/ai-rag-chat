import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import type { Chunk, RetrievedChunk } from "../types";

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

export type ProgressCallback = (status: string) => void;

function getExtractor(onProgress?: ProgressCallback): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", EMBEDDING_MODEL, {
      progress_callback: (progress: { status: string; file?: string; progress?: number }) => {
        if (!onProgress) return;
        if (progress.status === "progress" && progress.file) {
          onProgress(`Downloading ${progress.file} (${Math.round(progress.progress ?? 0)}%)`);
        } else if (progress.status === "ready") {
          onProgress("Embedding model ready");
        }
      },
    });
  }
  return extractorPromise;
}

export async function embedTexts(texts: string[], onProgress?: ProgressCallback): Promise<number[][]> {
  const extractor = await getExtractor(onProgress);
  const embeddings: number[][] = [];
  for (const text of texts) {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    embeddings.push(Array.from(output.data as Float32Array));
  }
  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
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
