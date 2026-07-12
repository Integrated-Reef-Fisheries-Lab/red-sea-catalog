// Runs at build time (npm run prebuild). Reads every data/sources/*.json record,
// embeds a concatenated text blob per source, and writes public/search-index.json.
// This file is generated — never hand-edit public/search-index.json.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@huggingface/transformers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCES_DIR = path.join(__dirname, '..', 'data', 'sources');
const OUT_FILE = path.join(__dirname, '..', 'public', 'search-index.json');

function buildTextBlob(source) {
  const variableText = (source.resources ?? [])
    .flatMap((r) => r.variables ?? [])
    .flatMap((v) => [v.name, v.label, v.description])
    .filter(Boolean);

  return [
    source.title,
    source.abstract,
    ...(source.domain ?? []),
    ...(source.themes ?? []),
    ...(source.keywords ?? []),
    source.provenance?.originator ?? '',
    ...variableText,
  ]
    .filter(Boolean)
    .join(' ');
}

async function main() {
  const files = (await readdir(SOURCES_DIR)).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.warn(`No source files found in ${SOURCES_DIR}`);
  }

  console.log(`Loading embedding model (Xenova/all-MiniLM-L6-v2)...`);
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  const entries = [];
  for (const file of files) {
    const raw = await readFile(path.join(SOURCES_DIR, file), 'utf-8');
    const source = JSON.parse(raw);
    const text = buildTextBlob(source);

    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data);

    entries.push({ id: source.id, title: source.title, vector });
    console.log(`Embedded: ${source.id}`);
  }

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(entries), 'utf-8');
  console.log(`Wrote ${entries.length} entries to ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
