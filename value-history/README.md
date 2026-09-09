# Fleeced! Value History Archive

This branch is the durable source of truth for Fleeced! Value History snapshots.

- Netlify may keep a live write buffer, but historical continuity lives here.
- Snapshots are append-only.
- Historical values are never reconstructed or guessed.
- A Netlify migration must not reset this archive.
- The canonical league is Sleeper league 1316867686394769408.

Data layout:
- `value-history/metadata.json`
- `value-history/index.json`
- `value-history/snapshots/YYYY/MM/<timestamp>.json`

The archive intentionally starts fresh in September 2026. Anything before the archive start is unavailable unless later recovered from an authoritative source.
