import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Runs in a dedicated Worker so model download + WASM inference never block the main thread's UI.
const ctx = self as unknown as {
  postMessage: (message: unknown) => void;
  onmessage: ((event: MessageEvent) => void) | null;
};

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(onProgress: (status: string) => void): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", EMBEDDING_MODEL, {
      progress_callback: (progress: { status: string; file?: string; progress?: number }) => {
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

// Batching keeps WASM session runs to a handful of calls instead of one per chunk —
// running hundreds of individual inferences was ballooning WASM memory and crashing the tab.
const BATCH_SIZE = 16;

ctx.onmessage = async (event: MessageEvent<{ id: number; texts: string[] }>) => {
  const { id, texts } = event.data;
  try {
    const extractor = await getExtractor((status) => {
      ctx.postMessage({ id, type: "progress", status });
    });

    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const output = await extractor(batch, { pooling: "mean", normalize: true });
      const [batchSize, dim] = output.dims;
      const data = output.data as Float32Array;
      for (let row = 0; row < batchSize; row++) {
        embeddings.push(Array.from(data.subarray(row * dim, (row + 1) * dim)));
      }
      ctx.postMessage({
        id,
        type: "progress",
        status: `Embedding chunks… ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length}`,
      });
    }

    ctx.postMessage({ id, type: "result", embeddings });
  } catch (err) {
    ctx.postMessage({ id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
