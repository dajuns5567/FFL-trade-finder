# Fleeced! Inquirer — immutable original publication archive

This dedicated Git branch preserves **previously published, verified** editions without generating replacement articles or changing their original bytes. The archive is not a publishing authorization. A locked, structurally valid original plus independent historical publication evidence is required for every entry.

## Verified originals

- **2026 Weeks 3–4:** original user Library editions; preserved with their original SHA-256 hashes and Week 4 editorial revision 14.
- **2026 Weeks 5–9:** recovered original locked editions, each verified against its SHA-256 digest, the historical `broadcasts/index.json` publication record, and the contemporaneous weekly awards metadata.
- **2026 Weeks 1–2:** existing application preloads; not duplicated into this archive.
- **2026 Week 10:** **NOT PUBLISHED**. The recovered original publication-status record documents a November 17 editorial hold after two repeat/copy-forward findings. Do not fabricate a newspaper, set a lock flag, or promote the held draft. A separately reviewed authentic Week 10 publication is required.

Original newspaper files live at `2026/week-XX.json`; their immutable checksums live in `manifest.json`. Independent recovered evidence is stored under `evidence/2026/`. The legacy Week 3–4 index rows intentionally lack newer `captured_at` metadata: do not rewrite those records to make them resemble Weeks 5–9.

## Integrity verification

Run `node scripts/verify-inquirer-immutable-archive.mjs` from the repository root on this branch. GitHub Actions runs `inquirer-immutable-archive-integrity.yml` on archive or checker changes. The verification checks immutable SHA-256 digests, 32 distinct team articles, independent index and awards lineage, and the Week 10 hold. Its success proves **historical source integrity**, not deployment, site readback, quality approval of future editions, or successful automatic publishing.

A reader may use this branch as a read-only fallback across Netlify account migrations. The active application's publication-selection logic, scheduled pipeline, and Netlify preview still require separate live acceptance. Do not merge into main, deploy to production, or enable a scheduled publisher as a consequence of archive recovery alone.
