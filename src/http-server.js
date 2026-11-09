import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { captureVerifiedSongRadio, RadioSnapshotError } from './radio-snapshot.js';

const LIMIT = 16 * 1024;
const digest = value => createHash('sha256').update(value).digest();
const safeEqual = (left, right) => timingSafeEqual(digest(left), digest(right));

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json')
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'JSON request required.');
  if (Number(req.headers['content-length'] || 0) > LIMIT)
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Maximum body size is 16 KiB.');
  let size = 0;
  const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > LIMIT) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Maximum body size is 16 KiB.');
    parts.push(chunk);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw new HttpError(400, 'INVALID_JSON', 'Malformed JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new HttpError(400, 'INVALID_JSON', 'JSON object required.');
  return body;
}

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    Object.assign(this, { status, code });
  }
}

/**
 * Botkeep-compatible single-process HTTP foundation.
 * Production intentionally ships no Spotify source adapter or queue writer.
 * Injected adapters exist only for future verified implementations/tests.
 */
export function createBridgeHttpServer({ apiToken = '', capture, verify } = {}) {
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url || '/', 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/healthz') {
        return json(res, 200, { status: 'ok', service: 'recommended-bridge-music', version: '0.1.0' });
      }
      if (req.method === 'GET' && path === '/api/v2/capabilities') {
        return json(res, 200, {
          spotifySongRadio: { state: 'blocked', reason: 'Live verified source adapter not configured' },
          youtubeMusicNativeQueue: { state: 'unverified', writeEnabled: false }
        });
      }
      if (req.method === 'POST' && path === '/api/v2/radio') {
        if (!apiToken) throw new HttpError(503, 'AUTH_NOT_CONFIGURED', 'Server API secret not configured.');
        const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
        if (!token || !safeEqual(token, apiToken))
          throw new HttpError(401, 'UNAUTHORIZED', 'Invalid client credentials.');
        const body = await readJson(req);
        const snapshot = await captureVerifiedSongRadio({
          accountRef: body.accountRef, seedSpotifyId: body.seedSpotifyId, capture, verify
        });
        return json(res, 200, snapshot);
      }
      return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Unknown API route.' } });
    } catch (error) {
      const known = error instanceof HttpError || error instanceof RadioSnapshotError;
      const status = error instanceof HttpError ? error.status :
        error instanceof RadioSnapshotError
          ? (error.code === 'RADIO_SOURCE_UNAVAILABLE' ? 503 : 400) : 503;
      return json(res, status, {
        error: { code: known ? error.code : 'UPSTREAM_UNAVAILABLE',
          message: known ? error.message : 'The source service is unavailable.' }
      });
    }
  });
}
