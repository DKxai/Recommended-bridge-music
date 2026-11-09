# Deploy the lightweight foundation to Botkeep

Target: https://botkeep.cloud/app

## Preconditions
This revision is a **deployable Node.js health/capability server**, NOT a working Spotify Radio collector or YouTube Music native queue writer. It does not attempt Chromium, scrape Spotify, or use Spotify API Recommendations as a substitute.

## GitHub import
1. In Botkeep, create a Node.js application from GitHub and select **DKxai/Recommended-bridge-music**.
2. Use branch **Dev** only after its CI checks are green; do not deploy an experimental feature branch. Project root is `/`.
3. Node 22 or 24, start command `npm start`. No additional dependencies or Docker required.
4. In **Environment**, set a private long random `BRIDGE_API_TOKEN` (not in Git); configure `HOST=0.0.0.0` if needed. The server reads Botkeep's `SERVER_PORT` automatically.
5. Configure the assigned HTTP port in Network and HTTPS routing in Domains. Do not put the bearer token on plain public HTTP.
6. Inspect Console and test `GET /healthz`; verify `GET /api/v2/capabilities` reports the live Spotify source **blocked**, queue writing **unverified**.
7. Back up persisted app data separately when later stages introduce storage.

## Budget and resource caution
Reported account-wide usage: 1024/2048 MB RAM, 50/150% CPU, 1024/2048 MB storage. This is roughly **1024 MB RAM / 100 percentage points CPU / 1024 MB storage unallocated** at the time of the user's report, not a per-service limit or proof of feasibility.
Start with a small permitted Node.js allocation (e.g. 256 MB RAM if the plan offers it), watch observed RSS and crashes, and adjust using the panel. Do not reserve memory for Chromium or database before checking actual requirements. A stopped service still reserves resources.

## Endpoints
- `GET /healthz`: readiness of the Node process, **not proof of Spotify access**.
- `GET /api/v2/capabilities`: explicit unsupported capabilities.
- `POST /api/v2/radio`: bearer authenticated, takes `{ "accountRef": "...", "seedSpotifyId": "22-character Spotify ID" }`; returns **503 RADIO_SOURCE_UNAVAILABLE** without a real verified source adapter. It never generates synthetic results.

## Limits
There is currently **no Botkeep account connection** available from this chat to create/deploy a live instance. Deployment must be confirmed from the authenticated Botkeep panel, Console and observed health endpoint.

Official references:
- https://botkeep.cloud/docs/hosting
- https://botkeep.cloud/docs/github
- https://botkeep.cloud/docs/nodejs
