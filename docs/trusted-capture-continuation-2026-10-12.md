# Fleeced public-release continuation — 2026-10-12 UTC

Status: **BLOCKED FOR PUBLIC LAUNCH**. Work only on `player-signal-layer-r1`, draft PR #390.
Never merge, publish production, change SSO, alter immutable Weeks 1–3, or unlock Week 5 without the owner's explicit approval.

## Current implementation

- Public page-load/manual-update requests send only a UUID and event type to `value-history-capture-background`. They cannot submit valuations, timestamps, league overrides, or publishing commands.
- An isolated local Chromium instance runs the existing application from the deployed assets and real Sleeper inputs. All seven valuation sources, importer completion, modeled-value readiness, stable rows, and exact canonical-player-value parity are required. No valuation formula, Finder, Evaluator, trade grade or historical pick formula is redesigned.
- The private renderer permits only self scripts and hashes of its legitimate inline scripts, approved data connections, and self/data images. An inline-handler injection probe is covered by the runtime test. The public website's CSP remains unchanged.
- Only update promotion and the three canonical awards/draft POST routes receive an in-process Request capability. It cannot survive cloning/HTTP serialization. Platform deployment metadata is registered separately and never grants write permission.
- Snapshots require at least 700 complete player rows, 32 unique teams and complete pick rows. Each accepted event has its own immutable snapshot key. Timestamp reservations and compare-and-swap indexes prevent concurrent events from losing records; retrying after a partial storage failure reuses the original snapshot.
- `t` is reserved around actual server measurement time; `measured_at` records the exact calculation time. Older jobs finishing later do not replace a newer latest pointer.
- The UI treats 202 as queued, polls for actual persistence, stops after exhausted failures, and keeps historical charts available. Preview writes remain disabled.
- The concurrent archival-copy/minute-coalescing implementation remains behind `FLEECED_ARCHIVE_OBSERVATION_FALLBACK=1`, disabled by default. Do not enable it without approval: it changes the per-load/current-valuation contract.
- Public consensus supports the actual 12,229-entry Sleeper directory (bounded at 20,000, with bounded matching fields), remains calculation-only, and can read validated last-known-good fallback. Trusted backend calls alone promote LKG; promotion is not reported successful after a storage error.
- Public awards reads no longer try browser writes. Trusted collector maintenance calculates awards/draft records with the existing UI formulas. The shared draft-pick helper fixes the former out-of-scope `retroPick` reference. Backend award-period validation accepts the UI's date format. Optional awards failures do not invalidate an otherwise valid canonical value capture.
- Approval filtering is shared by normal readers, fast latest/weekly-awards readers, the fast archive index, and live weekly-player awards. Stored Week 5 and next-season Week 1 are not implicitly approved. Preview GET readers work without writing.
- Legacy on-load and scheduled HTTP endpoints remain token-protected. New `inquirer-publish-native-scheduled` and `inquirer-projection-capture-native-scheduled` wrappers have native Netlify schedules, no public URL, production-context/preview guards, and internal Request capabilities. They delegate to the existing canonical publishers and preserve the current authenticated GitHub maintenance workflow as an optional alternative. Intervening trusted consensus/awards manifest export and promotion workflows are retained.
- History maintenance deletion now requires an explicit authenticated `maintenance=1`; captures do not silently run historical cleanup.
- Archive workflow receives the HTTP export token when used and binds live-buffer discovery to the approved current site `b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323`. Missing credentials must not silently select an older project. GitHub-native scheduled history remains independent of Netlify.

## Verification evidence and limits

Before the workspace disconnected, production-context refusal, trusted capture, replay/recovery, concurrent indexes, public player/team/market reads, consensus promotion/fallback, approval boundaries, and preview isolation tests passed.
The real application with controlled provider fixtures and real Sleeper inputs produced **1,484 players / 32 teams / 288 picks**, persisted awards/draft/history and a canonical event through the real Blobs SDK into an intercepted memory transport, and blocked an injected inline event handler.
The deployment bundle was approximately **79 MB compressed / 92 MB unpacked**, included the required app/data assets and Chromium dependencies, excluded scratch/Git files, and exposed the intended native schedules and rate-limit configuration.
Local newsroom browser acceptance passed all 32 Week 4 articles, 33 selection options and Week 3/4 navigation with no page errors.
Week 3 and Week 4 direct audits, Week 4 rebuild/projection tests, forward freshness Weeks 3–17, Finder compiled-runtime smoke, value-history regressions and the high-confidence credential-pattern scan passed.
A full live-source collector attempt in this Work workspace failed closed at **6/7**; a subsequent source diagnostic identified a RotoWire IDP fetch timeout. One later controlled run also hit a transient Sleeper core timeout; a subsequent isolated run completed.
The durable GitHub index was reachable with 132 snapshots and latest timestamp `2026-10-12T00:00:58.911Z`.

The workspace disconnected before push. Source was recovered from exact repository anchors through the GitHub API, retaining intervening commits; the final recovered revision must be verified by CI. A local dependency lock could not be recovered, so production dependencies are pinned in package.json and CI installs them directly.

## Remaining release gates

1. All final-commit CI must finish; inspect failures rather than hiding them. Run `scripts/trusted-capture-security-smoke.mjs` and `scripts/trusted-capture-runtime-smoke.mjs` plus existing newsroom/Finder checks.
2. Verify actual Netlify packaging, background execution, rate limits, SDK metadata and native schedule behavior on the intended hosting configuration. PR previews are read-only; do not weaken that boundary to test writes.
3. Verify all-seven-source capture with live provider data. The collector still follows the existing strict seven-live-source readiness contract; do not assert complete per-load parity during provider outages or substitute copied archival values without approval.
4. Verify account-specific Actions/Netlify credentials and live-buffer archival from the approved current site. The connector cannot configure Actions secrets or site-level function secrets. Automatic internal writes do not require the shared HTTP token; authenticated remote admin/export paths do.
5. Hosted preview/browser acceptance can still be blocked by team SSO. Do not disable SSO or create complicated additional test accounts merely to turn a badge green.
6. Inspect hosting secrets/scopes and GitHub secret-scanning alerts; source pattern scans do not prove historical/hosting secret safety.
7. Stop for the owner's explicit authorization before production release or Week 5 approval.

Authoritative source: https://github.com/dajuns5567/FFL-trade-finder/pull/390
