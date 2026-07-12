// Local-only admin tool for editing data/sources/*.json. Never deployed —
// run with `npm run admin` and it serves a small form UI + JSON API on
// localhost that reads/writes directly to the filesystem. The public
// static site (GitHub Pages build) has no knowledge of this server.

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCES_DIR = path.join(ROOT, 'data', 'sources');
const ADMIN_STATIC_DIR = path.join(ROOT, 'admin');
const PORT = process.env.ADMIN_PORT ? Number(process.env.ADMIN_PORT) : 4000;

const SLUG_RE = /^[a-z0-9-]+$/;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? JSON.parse(raw) : {};
}

async function listSources() {
  const files = (await fs.readdir(SOURCES_DIR)).filter((f) => f.endsWith('.json'));
  return Promise.all(
    files.map(async (file) => JSON.parse(await fs.readFile(path.join(SOURCES_DIR, file), 'utf-8')))
  );
}

function validateSource(source) {
  const errors = [];
  if (!source.id || !SLUG_RE.test(source.id)) {
    errors.push('id is required and must be lowercase letters, numbers, and hyphens only');
  }
  if (!source.title) errors.push('title is required');
  if (!source.abstract) errors.push('abstract is required');
  if (!Array.isArray(source.domain) || source.domain.length === 0) {
    errors.push('at least one domain is required');
  }
  if (!source.spatial?.bbox || source.spatial.bbox.length !== 4) {
    errors.push('spatial.bbox must be [W, S, E, N]');
  }
  if (!source.temporal?.start) errors.push('temporal.start is required');
  if (!source.access?.tier) errors.push('access.tier is required');
  if (!source.quality?.status) errors.push('quality.status is required');
  return errors;
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/sources' && req.method === 'GET') {
    return sendJson(res, 200, await listSources());
  }

  if (pathname === '/api/sources' && req.method === 'POST') {
    const source = await readBody(req);
    const errors = validateSource(source);
    if (errors.length) return sendJson(res, 400, { errors });

    const filePath = path.join(SOURCES_DIR, `${source.id}.json`);
    try {
      await fs.access(filePath);
      return sendJson(res, 409, { errors: [`A source with id "${source.id}" already exists`] });
    } catch {
      // does not exist yet, good
    }
    await fs.writeFile(filePath, JSON.stringify(source, null, 2) + '\n', 'utf-8');
    return sendJson(res, 201, source);
  }

  const idMatch = pathname.match(/^\/api\/sources\/([a-z0-9-]+)$/);
  if (idMatch) {
    const id = idMatch[1];
    if (!SLUG_RE.test(id)) return sendJson(res, 400, { errors: ['invalid id'] });
    const filePath = path.join(SOURCES_DIR, `${id}.json`);

    if (req.method === 'GET') {
      try {
        return sendJson(res, 200, JSON.parse(await fs.readFile(filePath, 'utf-8')));
      } catch {
        return sendJson(res, 404, { errors: ['not found'] });
      }
    }

    if (req.method === 'PUT') {
      const source = await readBody(req);
      if (source.id !== id) return sendJson(res, 400, { errors: ['id in body must match URL'] });
      const errors = validateSource(source);
      if (errors.length) return sendJson(res, 400, { errors });
      await fs.writeFile(filePath, JSON.stringify(source, null, 2) + '\n', 'utf-8');
      return sendJson(res, 200, source);
    }

    if (req.method === 'DELETE') {
      try {
        await fs.unlink(filePath);
        return sendJson(res, 204, {});
      } catch {
        return sendJson(res, 404, { errors: ['not found'] });
      }
    }
  }

  sendJson(res, 404, { errors: ['unknown route'] });
}

async function serveStatic(req, res, pathname) {
  const relPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(ADMIN_STATIC_DIR, relPath);

  if (!filePath.startsWith(ADMIN_STATIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://localhost:${PORT}`).pathname;
  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
    } else {
      await serveStatic(req, res, pathname);
    }
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { errors: [String(err.message ?? err)] });
  }
});

server.listen(PORT, () => {
  console.log(`Admin tool running at http://localhost:${PORT} (local only, edits data/sources/*.json directly)`);
});
