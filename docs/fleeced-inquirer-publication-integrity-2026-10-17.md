# Fleeced! Inquirer release integrity (2026-10-17)

## Why the Week 5 release regressed

The previous Week 5 generator substituted generic scoreboard sentences for
duplicate copy. Structural checks then passed although the live articles had
subject/verb errors, template repetition, misleading two-game record language,
and a formulaic recap. The independent production readback confirmed objects
and index entries, not publication-quality prose. A live 2026 Week 5 browser
audit independently confirmed 32 articles, 16 reciprocal matchups, four
reporters with eight articles each, and editorial regressions.

The existing accepted Week 4 v19 text is frozen and must never be regenerated
or replaced. PR #390 is separate and must not be merged without approval.

## Release state machine

1. Sleeper finalizes a week.
2. The scheduled runner generates a forward edition in the protected new-team
   Netlify context and applies the existing forward editorial transforms.
3. `inspectEditionBeforePublication` performs coverage, matchup symmetry,
   placeholder, grammar, misleading-record and reusable-scaffold checks.
4. Before public Blob or archive writes, the draft and review findings are
   stored privately under
   `inquirer/editorial-staging/YYYY/week-WW.json`.
5. Until there is a **separately reviewed, exact-digest** approval record at
   `inquirer/editorial-approvals/YYYY/week-WW.json`, the endpoint returns
   `review_required:true`. No public broadcast/index/reporter keys change.
6. A reviewer reads the private staged manuscript, confirms real prose/voice,
   facts, recap, 32 teams, and awards/badges, then triggers
   `Approve Reviewed Fleeced Inquirer Edition` workflow with the exact SHA-256
   digest and substantive review note. The workflow revalidates the stored
   draft and writes a create-only approval. It never publishes.
7. On the next scheduled publisher invocation, the candidate must pass the
   same editorial gate AND reproduce the approved exact digest before a public
   write. Any drift returns to staging without publication.
8. Publication then updates reporter article archives and broadcast index.
   Weekly awards are computed independently.

The approval workflow is a publication authority: do not trigger without
reading the actual private article manuscript. A GitHub green status is **not**
an editorial approval. A pending week is an expected safe state.

## Entry points and defenses

- Netlify scheduled entrypoint: `inquirer-publish-scheduled.mjs`.
- Direct weekly endpoint: `/.netlify/functions/league-hub?weekly=1`.
- Both use the same `weeklyReport` write boundary in `league-hub.mjs`.
- Exact-copy enforcement and substantive checks:
  `netlify/functions/inquirer-publication-guard.mjs`.
- Approval workflow:
  `.github/workflows/fleeced-editorial-approve-reviewed-week.yml`.
- Regression tests:
  `tests/inquirer-publication-guard.test.mjs`.
- CI: `.github/workflows/fleeced-editorial-publication-guard.yml`.

Do not treat `weekly_awards=1` as a read-only diagnostic: it can backfill
missing awards. Do not rely on `matchup_id` at the top of the edition's team
records; reciprocal `opponent_roster_id` and cross-reported scores prove the
16 actual matchups.

## Current status and remaining Week 5 repair

2026 Week 5 was published before this admission guard existed. The exact-copy
gate prevents recurring **future** automatic publication errors but does not
retroactively rewrite Week 5. The user-supplied protected Week 5 audit JSON
contains the complete Week 4/5 comparisons. Repairing Week 5 requires an
editorially reviewed, independently scored replacement of all affected copy and
recap material, with a backup/immutable provenance for every replaced Blob,
and a separate explicit targeted release. Never run the regular sequential
publisher to overwrite a locked edition.

Site: `2e556797-6f35-4037-aa5a-1338724eb71d`
(`phenomenal-mousse-f0a00c.netlify.app`, SSO-protected).
Editorial safety PR: #391, main squash commit `a7fda745`.
Original live Weeks 1-4 remain preserved.
