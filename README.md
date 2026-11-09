# Recommended Bridge Music 2.0

**Spotify Song Radio (personalized) → native YouTube Music.**

This is a V2 **research and integration project**, not a completed native YouTube Music queue connector. The existing Android app is NOT part of this repository yet.

## Current status
- P0: implemented and tested fail-closed Spotify Song Radio snapshot contract (synthetic adapter tests only).
- Botkeep foundation: zero-dependency Node.js server with health/capability endpoints and authenticated Radio request boundary.
- Live account-specific Spotify Radio capture: **not implemented or verified**.
- No-UI native YouTube Music Android queue writes: **not implemented or verified**.
- Do not substitute Last.fm, Spotify Recommendations API, Search, or YouTube Music Radio.

## Run locally
Requires Node.js 22+:
```sh
npm run check
npm start
curl http://localhost:3000/healthz
curl http://localhost:3000/api/v2/capabilities
```
Use `SERVER_PORT` or `PORT` for the listening port. For a private API route, configure a long random `BRIDGE_API_TOKEN` outside Git; without a verified Spotify adapter, even authenticated Radio requests return 503 rather than fabricated lists.

## Deployment
Read [Botkeep setup](docs/BOTKEEP_DEPLOY.md) and [V2 delivery gates](docs/V2_ROADMAP.md).
Deploy only the reviewed `Dev` branch. CI runs on Node 22 and Node 24.
`main` remains unchanged while experimental capabilities are evaluated.
