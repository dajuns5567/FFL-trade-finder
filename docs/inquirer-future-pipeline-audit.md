# Fleeced! Inquirer — end-to-end future-week pipeline audit
Audit scope: `player-signal-layer-r1`, PR #390. Baseline: served 2026 Week 4 v19 at `editorial-baselines/2026-week4-v19-served-copy.json`.

## Pipeline map and audited boundaries

1. **Completed-week upstream facts**: Scores, starters, league context, opponent, legal bench swaps, sentiment and projections originate in upstream edition data. The prose layer does not authenticate that data. Published weeks 1–3 remain frozen.
2. **Initial story rebuild**: `rebuildForwardInquirerEditorial` in `inquirer-week4-editorial-rebuild.mjs` clones an edition, runs generic story creation, and calls `restoreReporterNarratives`, which attempts prior-edition deduplication. This improves mechanical freshness but is **not a source of unique, sharp sports journalism**. It can preserve or regenerate generic backup prose.
3. **Fact-based analysis + recap legacy transforms**: `upgradeInquirerAnalysis` in `inquirer-evidence-analysis.mjs` computes evidence; the older character, polish and column passes run on a separate `recapWorkspace`. Only that workspace's league overview returns. This is the critical **single-authoritative-team-writer** guard.
4. **Final article writer**: `finalizeInquirerNarrative` in `inquirer-narrative-final.mjs` is the final team assembly stage. Week 4 maintains individually authored verified notes. For future weeks it can accept `future_editorial_briefs` containing new, score-matched section prose from an upstream author. Missing/mismatched briefs remain structurally incomplete, with a visible unapproved status.
5. **Final recap**: The same finalizer accepts fresh future recap prose per existing recap block, preserving structural identity. A missing complete recap brief is marked incomplete.
6. **Edition readiness**: Future editions carry `editorial_quality.status=HOLD_EDITORIAL_APPROVAL`, along with per-team and recap status; this is **informational** and not yet a live publication-blocking gate.
7. **QA**: `scripts/inquirer-future-quality-gate.mjs` checks required sections, reporter opinion signals, repeated sentences, fan theater, score composition, bench arithmetic and cross-week reuse. `check-inquirer-future-brief-assembly.mjs`, `check-inquirer-future-quality-gate.mjs` and `check-inquirer-pipeline-architecture.mjs` test the checker, actual assembly and single-writer invariants in PR CI. A separate manual acceptance workflow can check a committed future-edition JSON against an accepted earlier JSON.
8. **Publication**: The existing publication path was **not modified**. The new HOLD metadata does **not** prevent that independent path from releasing generic prose. Browser automation remains subject to private Netlify preview access.

## Verified strengths and limits

- Week 4 v19 passes the independent editorial checks, and its served prose is stored as a frozen comparison benchmark. Preserve this baseline; never recycle it as next week's article material.
- The final writer isolates team articles from competing legacy recap writers. The architecture test now fails on removal of that ownership guard.
- Deliberately copied future-week prose and absent editorial elements are tested as failures, not merely counted as informational warnings.
- **Automated humor quality is not proven.** Keywords and length detect missing commentary but not whether a joke is funny, a voice is convincing, or a hot take is earned. An editorial read-through remains mandatory.
- **Source-grounded authoring is still an input contract, not a completed service.** No current step automatically takes verified future matchup facts and creates 32 fresh, original, well-researched sections plus a novel full recap that can be trusted without review.
- **A real upcoming-week payload has not yet passed the new cross-week acceptance check.** CI validates synthetic examples and the Week 4 reference. Do not represent this as a real Week 5 prose pass.
- **Edition acceptance is not release enforcement.** Future operation must explicitly connect quality results, approvals and snapshot retention to the actual release trigger; this requires separate approval to change existing publication behavior.
- **The archived baseline is the prior comparison for Week 5 only.** After each accepted future edition, capture the *actual served text*, all 32 team stories, recap and source revision, and retain older editions for cross-issue joke/argument review.
- **Security and infrastructure**: Private Netlify preview SSO can fail anonymous browser CI with 401. Never disable authentication solely to obtain a green browser job. CI completion must be checked at the latest commit.

## Concrete release acceptance process

1. Produce current completed-week fact snapshot (never assume a pregame projection from retrospective data).
2. Draft 32 unique verified briefs and recap blocks using reporter identity, real matchup stakes, bench legality and new story beats; no copied Week 4 notes.
3. Assemble via the final writer; inspect `editorial_quality`, reject every missing/mismatched article and incomplete recap.
4. Execute cross-week gate with previous *accepted* full-edition JSON. Compare more than one prior week when available for repeated comedy, voice and argument arcs.
5. Inspect **all** served prose (32 team articles and recap) manually for: specific judgment, grounded sarcasm, earned praise, different angles per section, plausible mood calibration, fresh imagined fan theater, reporter distinctions, complete Week 5 opponent outlooks and honest use of numerical facts.
6. Check all applicable GitHub Actions, plus authorized browser acceptance. Resolve failures instead of overriding statuses.
7. Explicit editorial approval and only then an independently authorized publish action. Capture the actual served result as the next immutable benchmark.

## Do not claim as completed

- Automatic high-quality editorial drafting for arbitrary future editions;
- publication gating / approval UI connected to the live release route;
- continuous autonomous human-equivalent humor judgment;
- verification of all future weeks in advance.

This file documents remaining engineering work; adding it does not authorize new production access, merges, scheduled changes or standalone Week 5 publication.
