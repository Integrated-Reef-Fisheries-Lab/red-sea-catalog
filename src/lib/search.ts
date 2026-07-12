// Browser-side semantic search. Lazily loads the ONNX model + search index on
// first use so the initial page load stays fast. Must only be called from
// client components ('use client'); never during SSR/static generation.
import type { SearchIndexEntry } from './types';

let extractorPromise: Promise<any> | null = null;
let indexPromise: Promise<SearchIndexEntry[]> | null = null;

function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? '';
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers').then(({ pipeline, env }) => {
      // Model weights are fetched from the HF CDN and cached in IndexedDB by
      // transformers.js automatically — ~23 MB, first visit only.
      env.allowLocalModels = false;
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    });
  }
  return extractorPromise;
}

async function getIndex(): Promise<SearchIndexEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch(`${basePath()}/search-index.json`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load search index: ${res.status}`);
      return res.json();
    });
  }
  return indexPromise;
}

// Kicks off model + index loading without waiting — call on first keystroke
// so the "loading model..." indicator can be shown while the user keeps typing.
export function warmUpSearch(): void {
  void getExtractor();
  void getIndex();
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export interface SearchResult {
  id: string;
  title: string;
  score: number;
}

export async function search(query: string, topK = 8): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [extractor, index] = await Promise.all([getExtractor(), getIndex()]);
  const output = await extractor(trimmed, { pooling: 'mean', normalize: true });
  const queryVector = Array.from(output.data) as number[];

  const scored = index.map((entry) => ({
    id: entry.id,
    title: entry.title,
    // Vectors are already L2-normalized, so cosine similarity is just the dot product.
    score: dotProduct(queryVector, entry.vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function isSearchReady(): boolean {
  return extractorPromise !== null && indexPromise !== null;
}
