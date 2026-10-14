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

## Score-grounded prose gate (2026-10-13)

A Week 4 article must be readable without a separate roster table. When commentary names a player as a reason the team won or lost, insert that player's **verified starter score into the argument**, rather than adjoining an isolated sentence ("X scored N"). `embedVerifiedPlayerEvidence` in the single final writer currently performs this join for Week 4 player columns using the returned `starter_details` and unique-name matching. It does not fabricate missing statistics. Week-specific authored claims must still be edited when a named player is *not* present in the verified lineup.

Regression tests must reject (1) scoreless analysis of an otherwise scored player feature, (2) standalone player-scoring sentences offered as commentary, (3) generic top-three-scorer math in the opening, and (4) sentiment that does not discuss supporters' measured mood. Human QA must also inspect repetitive *ideas* across the lede, player feature, management, hot seat, fan sentiment and outlook—identical-sentence counts alone cannot detect that failure.

**Section ownership:** Opening = what happened and why it matters; Players = specific contributors + their actual numeric evidence + a judgment; Management = verifiable decision and actual margin consequence; Hot Seat/Cool Throne = concise accountability and praise, not another recap; Fan Sentiment = public confidence, disappointment and trust tied to the real meter, never a second box-score article; Outlook = named next matchup and a defensible next action, not a re-telling of the previous bench mistake. A section may refer to a fact introduced earlier but must add a genuinely new conclusion.

The current 32 manually authored Week 4 verdicts are editorial source material, **not a scalable solution for future weeks**. The evidence composer fixes mechanical stat detachment but cannot independently make generic prose incisive or funny. Do not claim it does. Future newsroom iterations should select distinct story beats *before* authoring paragraphs and hold actual rendered prose to a substantive editorial read-through.

## Crowd theater and natural newsroom language (2026-10-13)

Fan sentiment requires **outlandish, clearly imagined sports-columnist scenes** covering the full emotional spectrum: champagne and fireworks for high approval, reluctant toasts for mild optimism, and comic pitchforks or front-office protest theater for strong dissatisfaction. These are satirical hypotheticals, *never eyewitness assertions or fabricated genuine fan quotes*. Each scene must still lead to a real conclusion about fan confidence and match the measured sentiment rather than inflating a -5 into a literal riot.

Words such as `eligible option`, `verified swap`, `documented replacement`, `retrospective`, and `projection provenance` belong to calculation/QA metadata, not the reporter's voice. Translate valid lineup comparisons into plain football language, state actual scores, and confine the calculation to the management section. Don't repeat the same bench pairing in the lede, Hot Seat and next-week outlook. The Fleeced! player-signal concept may be discussed in context of actual observed production, but **never invent numeric Fleeced! grades or signal changes** when signal values are not available.

## Outlook and recap acceptance rule (2026-10-13)

Every completed-week article's **next-matchup outlook** should identify the next opponent and develop a concrete, source-grounded reason to watch the matchup. Do **not** require the previous week's leading scorer to appear merely to satisfy a mechanical test; an all-zero or broadly deficient lineup calls for a different angle. A one-line matchup identifier is metadata, not sufficient commentary by itself. For future editions, allocate a new substantive forward-looking story beat per team, rather than recycling 'X scored N, but counting on a repeat would be reckless.' Never invent next-week performances, projections or availability and never publish an unpublished week as a side effect of editorial changes.

Management analysis should describe the actual player score difference and whether it could affect the outcome; avoid stock sarcasm such as 'stroke of managerial genius' appearing across teams. Continue to differentiate bad decisions from unavoidable losses and good winning lineups from lucky escapes. Recap desks should each contribute a distinct league-wide story: a high-scoring loss, a close complete-lineup defeat, an uncompetitive no-show, or the race among contenders. Do not repeat the same Miami/Las Vegas extremes in every section. Keep all verified statistics, mood-based fictional fan theater, and naturally grounded Fleeced! references. Acceptance requires reviewing the rendered copy and checking double-upgrade idempotency, not merely a low count of verbatim repeated sentences.

## Joke-rhythm diversity (2026-10-13)

Editorial review must check **rhetorical setup patterns**, not just duplicate strings. Overusing 'not X, but Y', 'it wasn't X; it was Y', 'this isn't X; it's Y', or the same score-to-metaphor turn across different teams makes individually accurate columns monotonous. Use that contrast construction occasionally, never as a default punchline. Vary with direct accusations, distinctive imagery, specific character/manager behavior, concise verdicts, earned admiration, and genuinely different transitions. Judge the entire 32-team edition plus recap aloud for cadence and sentence-level rhythm. Preserve factual scoring, legal-lineup evidence, sarcasm and theatrical mood. Do not eliminate all contrast or enforce a hard keyword quota that damages natural writing. Future weeks should use this as a newsroom acceptance check before publication.

## Future newsroom release architecture — established 2026-10-14

**Important boundary:** The accepted Week 4 edition is a benchmark, not a reusable text source. Existing `week4...` dictionaries and `inquirer-week4-specific-notes.mjs` are strictly 2026 Week 4 only. Copying their sentences into another edition is prohibited. The final writer's generic future-week path does **not** yet automatically deliver Week 4-caliber characterful authored prose. No engineer or assistant may describe a clean schema/keyword test as proof it does.

### Week-by-week editorial inputs

Produce one **fresh, fact-anchored story brief for each of 32 teams** before generating an edition. An editorial brief must contain (a) this week's unique central conflict or triumph, (b) verified winner/loser/player score evidence, (c) the actual legal bench-decision consequence or an explicit no-legal-rescue finding, (d) the reporter's distinct critical position and a one-sentence reason for it, (e) a measured-mood-compatible, clearly imaginary new fan tableau, (f) a different accountable Hot Seat/Cool Throne conclusion, and (g) the verified next opponent with a forward-looking question. Each item is factual when factual, opinionated when commentary, and must never imply invented injuries, quotes, trades, past championships or projections. Require an original league-wide recap plan with separate desks/storylines. Preserve precise scoring and eligibility in data fields; the copy layer may only select and express them.

The four reporters' enduring **character rules** are stable; their imagery, jokes, sentence structures, rhetorical openings, scene props, grievances and closing verdicts must be refreshed every week. A reporter's bank supplies options and dislikes, **not** prewritten paragraphs or a round-robin phrase picker. Sample the football event and its meaningful contradiction *first*, then choose a fitting character delivery; never reverse that ordering. Comparison against recent editions must expose recycled gags and similar argument arcs even when names and numbers change. Maintain diversity **within a reporter**, across 32 teams, and between successive weeks.

### Mandatory pre-release comparison

Save the actual served API JSON or full independent audit JSON for every accepted edition as the reference for the next release. Run:

`node scripts/inquirer-future-quality-gate.mjs next-edition.json previous-accepted-edition.json`

The gate refuses missing sections, ungrounded score composition, empty fan tableaux, replicated cross-team sentences, unchanged prior-week sections/recap, and factual bench-gap inconsistency. High lexical overlap and repetitious contrast are **editorial review warnings**, not automatically rewritten by a script. Investigate all errors and read warnings in context. Compare the current draft against more than one earlier week when available. Generated prose should never be deployed by using the previous edition's authored notes with a new week number.

**Human release criterion:** Someone must read every team's finished lede, player commentary, management, hot/cool verdict, sentiment and outlook, plus all recap blocks, against previous accepted articles from the same reporter. Judge whether *new insights, fresh jokes, reporter-specific cadence and emotionally coherent fan scenes* survive the final assembly. Mark missing sections/meaningless stat explanations as failures even when numbers are right. A numeric pass cannot substitute for this process. Save a signed editorial decision, acceptance timestamp, source-week and revision SHA with the edition.

### Non-regression and safety

`inquirer-evidence-analysis.mjs` must keep the **single authoritative team writer**; recap-only legacy passes stay isolated. Do not add a polishing step after `finalizeInquirerNarrative`. Keep starter scores, bench eligibility, results, projections, standings, recap and mood immutable. Test final served copy, not just raw manifest or intermediate strings. Keep a frozen accepted Week 4 output for visual/editorial comparison but **never** use it as content for future weeks. The future-week QA CI workflow validates the auditor itself; it does not assert that ungenerated future articles are excellent or that a future release passed. Wire the gate to the actual future-edition release payload before authorizing automated publication, and retain the earlier-week snapshot for the comparison.

Do not silently disable or change the existing publication schedule, make previews public, weaken authentication, merge PR #390, deploy production, or publish Week 5. Those actions require a separate explicit user instruction.

### Current future brief integration contract

`finalizeInquirerNarrative` reads an optional `edition.future_editorial_briefs` object on weeks greater than 4, shaped as `{season, week, teams: { [team_name]: {opponent, reporter_id, team_points, opponent_points, lede, players, management, 'hot-seat', 'cool-throne', sentiment, outlook} } }`. Each section entry must be an array of complete original paragraphs. It accepts a team's brief only when the brief's season/week, named next opponent, reporter ID, final score and opponent score match actual edition data and all seven prose sections are nonempty. This happens **inside** the single authoritative final writer. All future articles, including those whose briefs pass structural checks, retain `editorial_review_required: true`. Accepted briefs report `future_brief_status: 'COMPLETE_UNAPPROVED'`; absent or mismatched briefs report `MISSING_OR_FACT_MISMATCH`.

The future quality gate treats the latter as an error: this is a **quality certification failure**, not an instruction to remove an existing publication mechanism or alter live authentication. At present the upstream production of these briefs and passing prior-week edition snapshots are **not automated**. Before claiming full forward coverage, attach a trusted fact-grounded editorial briefing step to future edition creation, compare the served assembled results, and obtain explicit approval for any change to the existing publication workflow. The manifest alone never grants editorial sign-off and an unreviewed brief must never be marked approved.

The optional `future_editorial_briefs.recap` object is keyed by every existing recap block `kind` (where the overview has blocks) and by each remaining section's `heading`. Every key must provide an array of newly authored paragraphs. The single final writer preserves section/block identity and applies only these prose arrays when all are complete. `league_overview.future_recap_brief_status` becomes `COMPLETE_UNAPPROVED` or `MISSING_OR_INCOMPLETE`; the future-edition quality gate requires the former. Recap content still needs a manual factual and literary review before publication.

### Edition-level release status (future weeks)

The single final writer now adds `edition.editorial_quality` for weeks after Week 4. Its `status` remains `HOLD_EDITORIAL_APPROVAL` even when all 32 fact-matched team briefs and recap briefs are assembled, because complete input is not approval. `fresh_briefs_complete`, `missing_or_mismatched_articles`, `recap_status` and `requires_cross_week_comparison` provide the release review with actionable evidence. `scripts/check-inquirer-future-brief-assembly.mjs` exercises the actual writer in memory, including rejected mismatched-opponent and missing-recap cases. This status is *informational*, not an automatic blocker on the existing publishing mechanism. Connecting it to any automated publication trigger must be designed and authorized separately, without silently disabling existing publication or weakening preview authentication.
