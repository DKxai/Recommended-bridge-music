# Bridge Music 2.0 — delivery and acceptance

## Product invariants
- Recommendation source: **real, personalized Spotify Song Radio**, for the exact Spotify seed track and user's designated account.
- Preserve Spotify track IDs, order, credited artists, account binding and capture time. Never replace with Last.fm, Search, Recommendations API, YTM Radio or local rankings.
- Android's normal experience must be **YouTube Music only**; no Spotify foreground launch or repeated user searches.
- An attempted Accessibility click is **not** proof of writing the native YouTube Music queue.

## Feature and release gates
1. **P0 — feature/v2-p0-radio-contract:** fail-closed data/provenance contract, tested using synthetic adapters. This proves software validation, **not live Spotify access**.
2. **P1 — feature/v2-spotify-source:** validate a permitted stable, account-specific Song Radio read method. Compare at least two distinct seed tracks with what the account actually displays, across restart. If no permitted method exists, mark blocked.
3. **P2 — feature/v2-source-service:** only after P1; authenticated HTTPS API, account/seed-partitioned snapshots, expiration, stale playback protection, rate limits and secure session handling.
4. **P3 — feature/v2-native-queue:** prove a supported, no-navigation write path into the **actual native** YouTube Music Android queue with post-write verification, otherwise blocked.
5. **P4 — feature/v2-android:** only after P1 and P3; thin MediaSession client, no Spotify Android navigation, no blind retries.
6. **P5 — feature/v2-pairing:** explicit user login/consent and secure token handling; no secrets committed to Git.

## Environment and deployment
User-specified destination: Botkeep (https://botkeep.cloud/app). Reported account usage: RAM 1024/2048 MB, CPU 50/150%, storage 1024/2048 MB; **remaining approximate budgets** are 1024 MB RAM, 100 percentage points CPU and 1024 MB storage. These are account-wide figures, not a measured per-service allowance. Avoid Chromium on this host until runtime feasibility, policy and headroom are verified. Use a small Node service only after deployment checks.

## Explicit limitations
The Spotify Web API has no public Song Radio endpoint. Neither mock tests nor Spotify OAuth alone demonstrate Song Radio capture. The native Android YouTube Music application does not expose a general, guaranteed queue-writing interface for third-party apps. A complete end-to-end bridge has not been verified.

## Merge policy
Each feature originates from `Dev`; merge tested code to `Dev` through PRs. Keep `main` unchanged until live gates pass. If any gate fails, do not label unverified work complete.
