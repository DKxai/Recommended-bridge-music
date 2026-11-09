import test from 'node:test';
import assert from 'node:assert/strict';
import { captureVerifiedSongRadio, SONG_RADIO } from '../src/radio-snapshot.js';

const accountRef = 'test-account', seedSpotifyId = 'A'.repeat(22);
const tracks = [
  { spotifyTrackId: 'B'.repeat(22), title: 'Song B', artists: ['Artist B'] },
  { spotifyTrackId: 'C'.repeat(22), title: 'Song C', artists: ['Artist C', 'Featured Artist'] }
];
const observed = () => ({ source: SONG_RADIO, accountRef, seedSpotifyId, tracks });
const proof = () => ({ verified: true, source: SONG_RADIO, accountRef, seedSpotifyId, evidenceType: 'direct_radio_view' });
const run = options => captureVerifiedSongRadio({
  accountRef, seedSpotifyId, capture: async () => observed(), verify: async () => proof(),
  clock: () => Date.UTC(2026, 10, 10), ...options
});

test('fails closed when live source adapter is absent', async () => {
  await assert.rejects(captureVerifiedSongRadio({ accountRef, seedSpotifyId }),
    { code: 'RADIO_SOURCE_UNAVAILABLE' });
});

test('rejects search, Recommendations API and ordinary playlists', async () => {
  for (const source of ['spotify_search', 'spotify_recommendations', 'spotify_playlist']) {
    await assert.rejects(run({ capture: async () => ({ ...observed(), source }) }),
      { code: 'NOT_SONG_RADIO' });
  }
});

test('rejects mismatched account and source track', async () => {
  await assert.rejects(run({ capture: async () => ({ ...observed(), accountRef: 'other' }) }),
    { code: 'RADIO_SOURCE_MISMATCH' });
  await assert.rejects(run({ capture: async () => ({ ...observed(), seedSpotifyId: 'X'.repeat(22) }) }),
    { code: 'RADIO_SOURCE_MISMATCH' });
});

test('rejects empty results, missing Spotify IDs and missing artists', async () => {
  await assert.rejects(run({ capture: async () => ({ ...observed(), tracks: [] }) }),
    { code: 'RADIO_EMPTY_OR_INVALID' });
  await assert.rejects(run({ capture: async () => ({ ...observed(), tracks: [{ ...tracks[0], spotifyTrackId: '' }] }) }),
    { code: 'RADIO_TRACK_ID_REQUIRED' });
  await assert.rejects(run({ capture: async () => ({ ...observed(), tracks: [{ ...tracks[0], artists: [] }] }) }),
    { code: 'RADIO_TRACK_METADATA_INVALID' });
});

test('client-provided confirmed flags are never sufficient proof', async () => {
  await assert.rejects(run({ capture: async () => ({ ...observed(), confirmedSpotifySource: true, verified: true }),
    verify: async () => null }), { code: 'RADIO_PROVENANCE_UNVERIFIED' });
});

test('evidence verifier must confirm same source, account, seed and direct view', async () => {
  for (const bad of [{ verified: false }, { source: 'spotify_playlist' },
    { accountRef: 'other' }, { seedSpotifyId: 'X'.repeat(22) }, { evidenceType: 'search_results' }]) {
    await assert.rejects(run({ verify: async () => ({ ...proof(), ...bad }) }),
      { code: 'RADIO_PROVENANCE_UNVERIFIED' });
  }
});

test('preserves track IDs, order, featured artists, source and capture time', async () => {
  const result = await run();
  assert.equal(result.source, SONG_RADIO);
  assert.deepEqual(result.tracks.map(t => t.spotifyTrackId), ['B'.repeat(22), 'C'.repeat(22)]);
  assert.deepEqual(result.tracks.map(t => t.position), [1, 2]);
  assert.deepEqual(result.tracks[1].artists, ['Artist C', 'Featured Artist']);
  assert.equal(result.capturedAt, '2026-11-10T00:00:00.000Z');
  assert.equal(result.provenance.evidenceType, 'direct_radio_view');
});

test('upstream source failure propagates; never falls back to synthetic results', async () => {
  await assert.rejects(run({ capture: async () => { throw new Error('Spotify unavailable'); } }),
    /Spotify unavailable/);
});
