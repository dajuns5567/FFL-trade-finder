# FFL Trade Finder — Full-site behavior and freshness audit
**Date:** 2026-11-22  
**Baseline:** `main` at `2382e6f2a2c12a1aba61e1eb8d361b803c531e89`.  
**Method:** Read actual GitHub runtime, site loader, client readers and Netlify functions. Compare existing isolated PR code, rather than assuming a pending PR is installed. Run source-contract, mutation, assembled-script and (where available) executed behavior tests.  
**Not established:** authenticated Netlify Preview navigation, live current Sleeper correctness, actual scheduled GitHub publication, rendered screenshots, all trade fairness, actual IDP consensus/production refresh. A green source gate **never** means those have been certified.

## Acceptance standard (every subsection)
1. **Source/provenance:** canonical current Dynasty PPR values or verified historical/league data; no false fallback.
2. **Time semantics:** latest completed Sleeper week vs published edition vs current live market, archive window vs current values, Hindsight vs at-trade.
3. **Freshness trigger:** entry, open, focus/resume, new completed week, new trade or new canonical value, scheduled refresh.
4. **Invalidation/races:** old request cannot overwrite newer data; unchanged data need not rerender; retry is bounded.
5. **Failure:** don't turn missing projection/source into zero, invent badges, or overwrite verified history.
6. **Surface/version:** actual assembled V29 page loads one correct JS version in dependency order; shared functions and preview-only restrictions intact.
7. **Evidence:** behavior tests and protected live preview, not merely marker presence.

## Audit matrix
Legend: **Open source defect** = reproduced by directly tracing current code; **Pending isolated PR** = corrected source exists in an unmerged PR, not in main; **Source path verified** = code exists but browser/data acceptance pending; **Not certified** = requires further behavioral evidence.

| Section | Subsection | Source finding / next acceptance | Status |
|---|---|---|---|
| Home | Main league data | `index.html` calls `updateData()` when booted, even after restoring cached data. Must test an actual live fetch and partial API failures | Source path verified |
| Home | Ranked players | `fleeced-home-v424.js` schedules once after consensus/manual update; PR #587 adds focus and periodic refresh | Pending isolated PR #587 |
| Home | Top-10 7D risers | `scheduleValueRisers` runs on initialization/manual update; PR #587 adds canonical active-view fetch with safe retry | Pending isolated PR #587 |
| Player Values | Offense, IDP, young players | Canonical refresh path exists; dynasty-only consensus coverage, fallback, IDP scoring and breakout balance need source-by-source live acceptance | Not certified |
| Player Values | Browser model version | Cache/bundle consistency tracked by PR #582; never revert script to accommodate another branch | Protected by isolated CI |
| Trade Finder | Specific acquire / Tier Up | Main still has pre-restoration targeted engines; PR #585's filter/performance suite must be retained | Pending isolated PR #585 |
| Trade Finder | Add Assets / Select All / bounded combos | Complementary assets module absent on main V29; assembled-site and runtime tests pass in PR #585 | Pending isolated PR #585 |
| Trade Evaluator | Canonical player/pick values | Reader route exists; require actual parity with Player Values and Finder across filtered packages | Not certified |
| Trade Evaluator | Fairness ±100 / year discount | Need outcome-based sample tests across types and draft horizons | Not certified |
| Trade History | Completed Sleeper trades | `value-history-v276.js` has 5-minute refresh, focus/visibility and site-open forced check; live provider completeness unverified | Source path verified |
| Trade History | Original Trade Analysis pick slots | Historical ranking must be locked to preceding completed week; PR #559 pending | Pending isolated PR #559 |
| Trade History | Hindsight | Must use present canonical values and current pick projections, never reuse original snapshots as current | Not certified |
| Market Dashboard | 1D/7D/30D/90D/ALL | Current windows driven by archive; PR #561 for uniform window source is unmerged | Pending isolated PR #561 |
| Market Dashboard | Movers, heat map, volatility | Historical `marketCache` has no active-view periodic reload; timeline can be stale while open | Open source defect |
| Market Dashboard | Buy/Sell / signals | `marketInsightsCache` and pending fetches survive source changes on main; PR #583 invalidates stale data | Pending isolated PR #583 |
| Market Dashboard | Removed white explanations | PR #583 removes returned helper paragraphs; main still includes them | Pending isolated PR #583 |
| Position Indexes | Chart history / rendering | Derived from same market cache and canonical ranking; shares market cache freshness risk | Open inherited risk |
| Player Value History | Player chart and current dot | Reader exists; hover/line continuity and latest snapshot require browser testing | Not certified |
| Player Value History | Player-of-Week/all-time milestones | Browser `playerScoringCache` has no TTL on main; PR #579 introduces timed cache and badge sync | Pending isolated PR #579 |
| Track My Team | Team history / player deltas | Current `teamNetCache` only keyed by selected IDs/team and never expires; new snapshots may leave stale history | Open source defect |
| Track My Team | Trade-linked team value | PR #555 separately restores verified trade linkage and history refresh | Pending isolated PR #555 |
| League Hub | Hall of Fleeced | Shared trade cache does not expire on main; PR #588 adds fresh read with server bypass and view polling | Pending isolated PR #588 |
| League Hub | Awards live ranking | Derived using trades/drafts; both source caches can remain stale while page stays open | Open source defect |
| League Hub | Weekly Awards / PoW | Unbounded `weeklyAwardsCache`; PR #588 refreshes client, while #580 backend week sync and #579 badges remain pending | Pending isolated PRs #588/#580/#579 |
| League Hub | All-Time Highs | Storage/capture/validation fix in PR #584; not main | Pending isolated PR #584 |
| League Hub | Hot Seat / Cool Throne | Main lacks verified completed-week projections; #584 adds source helper; #586 fixes Spotlight browser path | Pending isolated PRs #584/#586 |
| League Hub | Managers / Graveyard / career | Main `managerCache` indefinite, preview-only cache 503; verified matchup reconstruction, TTL and no-write fallback in PR #586 | Pending isolated PR #586 |
| League Hub | Manager Spotlight | Main uses Inquirer fallback and accepts `Number(null)`; #586 verifies independent week and strict projections | Pending isolated PR #586 |
| League Hub | Draft rankings / manager drafts | Session-lifetime `draftCache`; PR #588 adds five-minute / focus refresh, while draft rating correctness needs separate verification | Pending isolated PR #588 |
| Fleeced Daily | Completed-week results | Independent `league_latest=1` route polled every 60 seconds only while Daily is visible; verify week rollover and no old-Inquirer fallback | Source path verified, live unverified |
| Fleeced Daily | Manager / team summaries | Uses `trades()` and `managers()` caches, inheriting stale data risk until independent source changes are accepted | Open inherited risk |
| Inquirer | Latest public edition | `broadcast_archive=1` index is polled with 60s cadence; visible archive still needs PR #581 readback and actual published edition check | Pending isolated PR #581 |
| Inquirer | Team articles / recap editorial | PR #578 improves editorial system; strict 32-team attribution, uniqueness, sarcasm requires published-readback and rendered checks | Pending isolated PR #578 |
| Inquirer | Archive controls | Duplicate selectors issue fixed in PR #578 only; ensure only one archive-navigation set in compiled page | Pending isolated PR #578 |
| All subpages | Script cache versions | PR #582 rendered 93 references and changed byte/key check; branch rules still need admin enablement | CI-only branch, not required yet |
| Scheduled refresh | Production/week completion | Must verify jobs publish correctly, refresh valuations/history, awards, market and dependent caches. Source presence does not establish live scheduling | Not certified |
| UI shared | Chart hover, tabs, selectors, mobile | Browser interaction matrix required to validate handlers, empty states and latest point, not settled by source scans | Not certified |

## Immediate release priorities
1. Keep **Trade Finder PR #585** restored and source-correct; do not merge unrelated older loader snapshots.
2. Reconcile **Market PR #583** and **historical windows PR #561** without reverting Finder.
3. Accept **Managers PR #586**, **Awards PRs #580/#584**, **Milestones PR #579** after preview + live readback.
4. Accept the isolated Home refresh PR #587 after preview checks; fix League Hub trade/weekly-awards/draft cache lifetimes in a separate subsystem release.
5. Audit live publisher / schedule / site-opening with actual provider results. Require branch protection for PR #582 checks.

## Machine-readable risk report
`node scripts/audit-site-live-freshness.mjs` reports source-derived unresolved freshness risks and explicitly labels them **risk**, even if code-presence and release-version tests are green. No automated CI test should claim all sections functional merely because one HTTP response or script exists. Source audit warnings do not merge other isolated subsystem PRs.
