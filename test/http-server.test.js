import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createBridgeHttpServer } from '../src/http-server.js';

async function withServer(t, options = {}) {
  const server = createBridgeHttpServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  return 'http://127.0.0.1:' + server.address().port;
}
const payload = { accountRef: 'account-1', seedSpotifyId: 'A'.repeat(22) };
const post = (base, token, body = payload) => fetch(base + '/api/v2/radio', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
  body: JSON.stringify(body)
});

test('health endpoint is ready without Spotify or client secrets', async t => {
  const base = await withServer(t);
  const res = await fetch(base + '/healthz');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('capabilities explicitly mark Spotify unavailable and native queue unverified', async t => {
  const base = await withServer(t);
  const res = await fetch(base + '/api/v2/capabilities');
  assert.equal(res.status, 200);
  const value = await res.json();
  assert.equal(value.spotifySongRadio.state, 'blocked');
  assert.equal(value.youtubeMusicNativeQueue.writeEnabled, false);
});

test('no API token configured means no radio response', async t => {
  const base = await withServer(t);
  const res = await post(base, 'guess');
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error.code, 'AUTH_NOT_CONFIGURED');
});

test('invalid or missing client token does not expose source data', async t => {
  const base = await withServer(t, { apiToken: 'test-only-secret' });
  assert.equal((await post(base, 'wrong')).status, 401);
  assert.equal((await post(base, '')).status, 401);
});

test('authenticated request fails closed without independently verified Radio adapter', async t => {
  const base = await withServer(t, { apiToken: 'test-only-secret' });
  const res = await post(base, 'test-only-secret');
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error.code, 'RADIO_SOURCE_UNAVAILABLE');
});

test('invalid Spotify seed ID is rejected; no placeholder recommendations', async t => {
  const base = await withServer(t, { apiToken: 'test-only-secret' });
  const res = await post(base, 'test-only-secret', { accountRef: 'account-1', seedSpotifyId: 'bad' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'RADIO_REQUEST_INVALID');
});

test('unknown queue-write requests cannot modify YouTube Music', async t => {
  const base = await withServer(t, { apiToken: 'test-only-secret' });
  const res = await fetch(base + '/api/v2/queue', { method: 'POST' });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'NOT_FOUND');
});
