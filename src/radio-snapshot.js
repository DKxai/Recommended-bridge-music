/**
 * P0: strict data boundary for personalized Spotify Song Radio.
 * This module DOES NOT retrieve a Spotify Radio playlist; there is no
 * supported public Spotify Web API endpoint for that operation.
 */
const TRACK_ID = /^[A-Za-z0-9]{22}$/;
export const SONG_RADIO = 'spotify_song_radio';

export class RadioSnapshotError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RadioSnapshotError';
    this.code = code;
  }
}

function requireValue(condition, code, message) {
  if (!condition) throw new RadioSnapshotError(code, message);
}

function normalizeTracks(input) {
  requireValue(Array.isArray(input) && input.length > 0 && input.length <= 100,
    'RADIO_EMPTY_OR_INVALID', 'Expected 1-100 ordered Radio tracks.');
  return Object.freeze(input.map((item, index) => {
    requireValue(item && typeof item.spotifyTrackId === 'string' && TRACK_ID.test(item.spotifyTrackId),
      'RADIO_TRACK_ID_REQUIRED', 'Each Radio track needs a Spotify track ID.');
    requireValue(typeof item.title === 'string' && item.title.trim() &&
      Array.isArray(item.artists) && item.artists.length > 0 &&
      item.artists.every(x => typeof x === 'string' && x.trim()),
      'RADIO_TRACK_METADATA_INVALID', 'Each Radio track needs a title and credited artists.');
    return Object.freeze({
      position: index + 1, spotifyTrackId: item.spotifyTrackId,
      title: item.title.trim(), artists: Object.freeze(item.artists.map(x => x.trim()))
    });
  }));
}

/**
 * capture and verify are independent trusted server-side adapters, not request
 * JSON or untrusted client assertions. No adapters ship until P1 is validated.
 *
 * @returns a read-only snapshot preserving the observed order without fallback.
 */
export async function captureVerifiedSongRadio({
  accountRef, seedSpotifyId, capture, verify, clock = () => Date.now()
} = {}) {
  requireValue(typeof accountRef === 'string' && accountRef.trim() &&
    typeof seedSpotifyId === 'string' && TRACK_ID.test(seedSpotifyId),
    'RADIO_REQUEST_INVALID', 'Exact account and Spotify seed ID are required.');
  requireValue(typeof capture === 'function' && typeof verify === 'function',
    'RADIO_SOURCE_UNAVAILABLE', 'A verified Spotify Radio adapter is not available.');

  const observed = await capture({ accountRef, seedSpotifyId });
  requireValue(observed?.source === SONG_RADIO, 'NOT_SONG_RADIO',
    'The source is not the personalized Spotify Song Radio view.');
  requireValue(observed.accountRef === accountRef && observed.seedSpotifyId === seedSpotifyId,
    'RADIO_SOURCE_MISMATCH', 'Source account or seed does not match the request.');
  const tracks = normalizeTracks(observed.tracks);
  const proof = await verify({ accountRef, seedSpotifyId, observed });
  requireValue(proof?.verified === true && proof.source === SONG_RADIO &&
    proof.accountRef === accountRef && proof.seedSpotifyId === seedSpotifyId &&
    proof.evidenceType === 'direct_radio_view', 'RADIO_PROVENANCE_UNVERIFIED',
    'Trusted adapter did not independently verify the direct Radio view.');

  const capturedAt = new Date(clock()).toISOString();
  requireValue(capturedAt !== 'Invalid Date', 'RADIO_CLOCK_INVALID', 'Invalid capture time.');
  return Object.freeze({
    type: 'verified_spotify_song_radio_snapshot', source: SONG_RADIO,
    accountRef, seedSpotifyId, capturedAt,
    provenance: Object.freeze({ evidenceType: 'direct_radio_view', verification: 'adapter_verified' }),
    tracks
  });
}
