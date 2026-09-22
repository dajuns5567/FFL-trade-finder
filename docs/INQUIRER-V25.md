# Inquirer V25

Draft PR 385 only. V25 supersedes V24 editorial reporting on the active release branch; it is not authorization to merge or production-deploy.

- Weekly Recap is editorial rather than exhaustive. It selects the week’s consequential results, genuine surprises, player/value movement when verified, material transactions, lineup-impacting availability, and the most compelling next-week matchup. It no longer has a contract to mention every matchup, division or team.
- The recap develops those selected stories in more depth than an individual team column. Real-generation validation requires the recap to exceed the longest generated team article while still mentioning fewer than all 32 teams.
- Four reporter desks now differ in body voice as well as headings: Nick Swindell reads like a beat writer/notebook, Bartholomew Roycington III is theatrical and mannered, Tilly Fleecer uses tabloid/back-page cadence, and Jefferson Filch uses inquiry/evidence framing. Sarcasm is preserved without making all four writers share the same sentence templates.
- Player coverage emphasizes what performances mean to the team story. It avoids arithmetic tutorials, scoring-rule explainers and meta-commentary about the writing itself.
- Breakout Watch is evidence-gated. A candidate needs supported age, a prior scoring baseline, meaningful recent scoring improvement and actual opportunity/usage from trusted player facts. Missing age/baseline/opportunity produces no breakout claim rather than a fabricated one. Week 1 therefore does not force a breakout when no prior current-season sample exists.
- Same-player add/drop churn is consolidated before editorial transaction selection. Current Sleeper ownership resolves whether an add or drop survived; contradictory churn is suppressed when ownership cannot establish the final state. Existing maximum-two material completed moves per team is preserved.
- Inline team links retain normal surrounding text color with a simple one-pixel yellow underline. Team destinations remain team Value History.
- Next-opponent scouting continues to name verified scoring/value leaders. Verified starter injury designations may enter the Weekly Recap as availability stories, but an injury designation is not converted into an assumed absence.
- Stored/preloaded editions older than the active Inquirer version are gated so V24 copy cannot silently overwrite V25. League Hub browser cache is 506.
- V25 does not change canonical player or pick values, Value Adjustment, Finder/Evaluator fairness, Trade History, Value History, scoring qualification or persistence.

Validation:
- `scripts/inquirer-v25-audit.mjs`: breakout evidence, veteran/missing-baseline false positives, editorial selection and rejected source phrasing.
- `scripts/inquirer-v25-generated-audit.mjs`: real generated Week 1 edition, 32 articles, eight beats, selective recap, recap depth versus team columns, and rejected generated phrasing.
- Existing site-runtime syntax, Inquirer smoke/prose audits, Finder runtime smoke and IDP scoring smoke remain regression gates as applicable.
- The Week 1 preload is generated with `scripts/one-time-generate-inquirer-week1.mjs` and packed with `scripts/pack-inquirer-preload.mjs`; compressed preload contents are never hand-edited.

Live browser behavior still requires preview access. Code inspection and generated-edition validation do not substitute for protected-preview UI verification.
