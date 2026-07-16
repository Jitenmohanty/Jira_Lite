import { createHash } from 'node:crypto';

/**
 * Local sentence-embedding model for the "Ask Tracer" assistant.
 *
 * Uses `all-MiniLM-L6-v2` via Hugging Face Transformers.js — it runs fully
 * in-process with no external API or key, produces 384-dim vectors, and is
 * small enough to load on a worker. Keeping embeddings local means semantic
 * search works even when the LLM (which does need a key) is disabled, and it
 * keeps recurring cost at zero. The model weights are downloaded once on first
 * use and cached on disk.
 *
 * Package note: we use `@huggingface/transformers` (the maintained successor to
 * the now-deprecated `@xenova/transformers`) — the old package pulled a
 * vulnerable `protobufjs`/`onnxruntime` chain. The API is unchanged.
 */

export const EMBEDDING_DIMENSIONS = 384;
const MODEL = 'Xenova/all-MiniLM-L6-v2';

// transformers.js is ESM-only and heavy; load it lazily so importing this
// module (e.g. from the API process, which never embeds) stays cheap.
type Extractor = (
  text: string,
  opts: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;

let extractorPromise: Promise<Extractor> | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      // Only use the remote hub for the first download; cache locally after.
      env.allowLocalModels = true;
      const pipe = await pipeline('feature-extraction', MODEL);
      return pipe as unknown as Extractor;
    })();
  }
  return extractorPromise;
}

/** Embed a single string into a normalized 384-dim vector. */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text.slice(0, 8000), { pooling: 'mean', normalize: true });
  return Array.from(output.data as ArrayLike<number>);
}

/** Format a JS vector as a pgvector literal: `[0.1,0.2,...]`. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

/** Stable content hash so the embedding worker can skip unchanged issues. */
export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
