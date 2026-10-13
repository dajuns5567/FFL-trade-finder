# Inquirer editorial quality and nonregression contract

## What went wrong

Earlier Week 4 implementation ran **five overlapping writers**: factual team/recap analysis, reporter character, copy polish, columnist additions, and a final narrative pass. Each mutated the same article sections. The last pass replaced entire paragraphs; earlier improvements disappeared. Static templates repeated statistics and stock punchlines across all 32 teams. Tests often asserted that a heading, name, score or marker existed rather than that the finished article was entertaining, distinctive, or free of duplication. UI fan sentiment retained a score but had two generic factual statements masquerading as crowd commentary.

The 2026-10-12 user-supplied preview audit found **22/32 flagged articles**, **34 recurring sentence patterns**, **six without a detected sarcasm signal**, and **six numerically overloaded**. These are diagnostic counts, not a machine-judged definition of good writing.

## Production and data invariants

- Archived Weeks 1–3 are frozen. Do not edit, retroactively generate, or republish them.
- Week 4 real scores, starters, actual eligibility, rankings, standings, awards, sentiment score, projection provenance and value history are facts; *no prose pass may invent or modify them*.
- Next-week projections must be week-specific and source-verified. Missing coverage in an archived article is not proof that a live projection does not exist. Never assert that all Week 5 projections are unavailable on that basis.
- League-wide recap blocks, division narratives and non-prose UI features must survive all team-article edits.
- No merge, production deploy or Week 5 publication without explicit user permission. Private Netlify team SSO blocks anonymous hosted-browser test automation.

## Single authoritative writer

The Week 4 fast handler builds the archived edition, applies factual analysis and reconstructs recap evidence. In `inquirer-evidence-analysis.mjs`, legacy character/polish/column transforms now run inside `recapWorkspace`, a separate copy; **only their league overview is merged back**. They are no longer authorized to touch final team articles. `finalizeInquirerNarrative` is the only team-authoring pass after structured facts are available. Reintroducing serial write-to-team passes will bring back this exact failure mode.

The 32 individually researched Week 4 editorial arguments are in `inquirer-week4-specific-notes.mjs`. A short distinct lead goes in the opening analysis; the remaining pointed argument goes inside sentiment alongside the verified crowd rating and a distinct reporter reaction. Do not delete the manifest, spread it across generic template strings, or overwrite it after the final writer. These notes are only for the verified 2026 Week 4 fixtures; they must never be reused for another week.

## Editorial standard, not merely a schema

- Explain **why the week mattered**: what real decision changed the margin, what the opposing star comparison conceals, which roster expectation collapsed, or why an ugly win is undeserving of hype.
- Make the piece readable and sometimes genuinely rude or sarcastic. The target is the manager's verifiable choices and the actual game, not fictional quotes from fans.
- Do not turn the same three scores into five descriptions. Facts support an argument; they do not substitute for it.
- Keep Nick dry and seasoned, Bartholomew haughty and acidly amused, Tilly angry and direct, Jefferson competitive and adversarial. Merely changing capitalization is insufficient.
- Fan sentiment interprets the measured score and matchup with *substantive* editorial opinion. The meter is not decoration; avoid invented real-world crowd behaviors.
- Scapegoating the lowest scorer without a verified better eligible selection is not insight. Don't soften valid, documented errors into vague statistics.
- Every section has a distinct editorial job. The recap remains a league-wide narrative, not a duplicated list of the same hot takes.

## QA and release gates

`scripts/inquirer-evidence-analysis-smoke.mjs` checks source immutability, all 32 articles, verified starters and management constraints, substantial fan sentiment, and that all 32 individually written Week 4 arguments survive in the served API response. `.github/workflows/inquirer-week4-live-audit.yml` runs syntax, rebuild/regression and direct-payload checks, then exports rendered copy and examples from all four reporters. Superseded CI runs are cancelled for efficiency.

**Passing CI is necessary but not sufficient.** Read the actual deployed API text end-to-end and the rendered page; compare all 32 articles for clichés and repeated explanations, review each reporter and the full weekly recap, confirm mood meter/text agreement and the projection sources, and compare to previous accepted writing. Do not claim a quality or hosted browser PASS if only local CI passed.

## Future weeks: still requires editorial production

Deterministic fact-to-string templates will remain repetitive if there is no distinct **authored** argument for each fixture. Before expanding this architecture to Week 5 onward, implement week-specific editorial notes or a trusted prose-drafting/editorial-review pipeline that produces source-grounded arguments. Do not silently replace that requirement with generic conditional one-liners. Do not silently disable existing automated publication: any new approval/publishing workflow requires explicit user consent.
