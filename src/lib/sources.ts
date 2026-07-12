// Server-side (build-time) loading of data/sources/*.json — used by statically
// generated pages via fs, never shipped to the client.
import fs from 'node:fs';
import path from 'node:path';
import type { Source } from './types';

const SOURCES_DIR = path.join(process.cwd(), 'data', 'sources');

export function getAllSources(): Source[] {
  const files = fs.readdirSync(SOURCES_DIR).filter((f) => f.endsWith('.json'));
  return files
    .map((file) => JSON.parse(fs.readFileSync(path.join(SOURCES_DIR, file), 'utf-8')) as Source)
    .sort((a, b) => {
      const order = { 'analysis-ready': 0, cleaned: 1, raw: 2, deprecated: 3 } as const;
      const statusDiff = order[a.quality.status] - order[b.quality.status];
      if (statusDiff !== 0) return statusDiff;
      return b.temporal.end.localeCompare(a.temporal.end);
    });
}

export function getSourceById(id: string): Source | undefined {
  return getAllSources().find((s) => s.id === id);
}
