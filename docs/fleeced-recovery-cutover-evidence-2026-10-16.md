# FLEECED! — verified recovery state and safe account-cutover contract

## Verified evidence (2026-10-16)

- Isolated destination Netlify site: `05a8ec65-a0a3-46f1-9f73-3da47dac662e`.
- Original 24 Blob objects independently restored/read back: [run 38841107577](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38841107577).
- Historical 156 snapshots plus 4 index/month records (160 objects): [run 38841954576](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38841954576).
- Four Inquirer preloads plus accepted Week 4 v19 reference (5 objects): [run 38842388381](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38842388381).
- Independent source-to-isolated-site readback of all 189 objects: [run 38842876217](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38842876217).
- A standalone *read-only recovery viewer* was deployed on the isolated site (deployment `6ad192e396e1aa6eb03e22b1`), but HTTP API response validity under team SSO still needs independent confirmation. This is not a full FLEECED! deployment.

## Material limitations

1. The verified Netlify source ZIP has 3 Inquirer objects and 21 Value History objects; the original live stores were not a complete archive of Inquirer broadcasts.
2. Archived preloads recover Weeks 1–4, but only the explicitly accepted Week 4 v19 served-copy benchmark is separately preserved. Do not claim complete per-week served-copy equality solely from preloads.
3. Historic valuation coverage begins September 19; earlier points and missing September 21 points are not guaranteed recoverable.
4. The 160 historical archive objects and 5 editorial objects are in **rehearsal-named stores**, not the application's normal production keyspace. Rehearsal PASS is not a live full-app cutover.
5. The isolated site belongs to the same connected Netlify team. This verifies **cross-site** migration, not a different-account cutover with different permissions and credentials.

## Migration runtime blockers

- `.github/workflows/value-history-archive.yml` invokes `scripts/resolve-active-netlify-site.mjs` and archives the live buffer only when a linked, ready Netlify production deploy's commit exactly equals the workflow's `github.sha`. An account move will NOT inherit this condition or its tokens automatically.
- Verify Netlify team's access to source and destination, runtime variables, production deployment's repo/branch/commit, scheduled jobs, and server-write permissions before switching.
- Distinguish **GitHub-native archival** from live Netlify buffer ingestion; the existing scheduled workflow logs a skip when the deployed commit is not the expected commit. Treat skips as an operational alarm, not successful archival.
- Verify updated history is appended to GitHub and a fresh scheduled archive after the cutover; avoid test writes to production Blob keys.
- The recovery viewer is intentionally not wired to the normal publication path, does not publish issues, and does not validate full end-user UI or trade finder functionality.

## Safe cutover checklist

1. Retain the original private backup and pin both GitHub branches to the exact audited commit SHA.
2. Freeze source writes only during an approved, scheduled migration window.
3. Export both source Blob stores after the freeze, with complete pagination and SHA-256 verification.
4. Confirm expected published broadcasts, manuscript approvals, and other private keys; do not silently invent or regenerate missing records.
5. Restore to a new site with correct application store names; compare every source/destination object readback.
6. Configure site-specific tokens, runtime environment, repository linkage, functions, domain settings and schedules. Never copy secret values into GitHub content or logs.
7. Deploy an application candidate, test authenticated end-user/API flows, protected editor access and Week 1–4 served content before enabling writes.
8. Validate the exact account/site/commit resolver and both scheduled and on-load publishers using read-only/dry-run checks.
9. Authorize cutover separately. Start writes only after verification; verify a real fresh archive and preserve rollback.
10. Keep the source backup, recovery snapshots and rollback until the user approves retirement.

**No automatic production migration, workflow schedule alteration, or approval to republish Inquirer issues is implied by this document.**
