# Fleeced! Inquirer — immutable published archive

This Git branch is a persistent source for **previously published, verified** newspapers. A published newspaper may be added only if its original 32-team edition passes the canonical publication contract and its content digest is recorded in `manifest.json`. Entries are append-only; historical articles must not be regenerated, rewritten, or silently relabeled.

The archive currently contains no migrated Week 3–18 editions. Their contents cannot be reconstructed from site IDs or readiness diagnostics. The existing Week 1–2 preloads remain in the application source.

A read-only runtime fallback may load these files even if a Netlify account changes. Netlify publishing queues and temporary Blob state are not the canonical historical archive. An owner-approved initial import of authentic earlier editions is required before the existing Week 9+ publication safety gates can be lifted.
