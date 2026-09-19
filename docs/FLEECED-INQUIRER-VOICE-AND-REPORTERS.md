# Fleeced! Inquirer — House Style, Reporters, Data & Archive Contract

**Current state:** 2026-09-19

This document is the durable source of truth for the Fleeced! Inquirer. It is documentation only; runtime source remains authoritative for implementation details.

## House style

The publication is explicitly **Fleeced! Inquirer**.

Voice:
- humorous sports-column writing
- old-school newspaper energy when appropriate
- punchy, brief sentences mixed with normal sports-column paragraphs
- dramatic and occasionally sensational framing is encouraged
- humor may be braggy, obnoxious, mocking, ominous, or exaggerated when the underlying result earns it
- criticism and praise should feel like a columnist reacting to evidence, not generic recap copy
- every reporter should sound like a beat writer who is also a fan of the team being covered that week: first-person rooting interest is encouraged
- sarcasm should be frequent, not occasional; jokes should feel embedded in the reporting rather than appended as a token punch line
- reporters may needle rivals, complain about their own team, reference recent suffering, celebrate irresponsibly after wins, and act personally offended by bad lineup decisions
- avoid robotic transitions such as “Season context,” “Production leaders,” or “The larger story is…” when a more human sportswriter sentence can carry the same facts
- harmless Inquirer-style asides about managers are allowed as obvious comedy
- the humor must never fabricate scores, standings, transactions, player production, injuries, or real-world events

Data rules:
- use completed weekly scores and the actual opponent
- use Sleeper projection when enough projection data exists
- use starting-lineup and positional production
- use transactions
- use standings/division implications
- use season record and current league rank
- identify active winning and losing streaks from completed Sleeper matchups
- identify sustained strong or poor team scoring stretches from recent completed games when enough history exists
- surface playoff-push context when the team is close enough to the playoff window for that language to be meaningful, including whether the club is inside/outside the current playoff line
- use manager information and relevant league awards when available
- when mentioning a player in a performance context, include **fantasy points and real-life stat production** from Sleeper weekly stats
- when enough weekly history exists, compare a player's recent multi-game fantasy production with the preceding stretch and call out genuine hot/cold runs rather than treating every game as isolated
- real-life stat examples include passing attempts/completions/yards/TD/INT, rushing attempts/yards/TD, receptions/targets/yards/TD, and IDP tackles/sacks/TFL/QB hits/INT/FF/FR/PD
- if Sleeper does not return a usable real-life stat line, say so or avoid the unsupported detail; never invent it
- never fabricate 0.0–0.0 results
- if the required completed scoring data is unavailable, fail gracefully rather than publishing a fake recap

## Four permanent reporters

### Nick Swindell — Senior Football Correspondent
Desk: **The Old Desk**

Personality:
- veteran beat writer
- clipped and declarative
- box-score-first
- dry skepticism
- sounds like ink, coffee, and a deadline

Signature:
> No hysteria without a box score.

### Bartholomew Roycington III — Performance & Tactics Columnist
Desk: **The Numbers Desk**

Personality:
- analytical
- precise
- dryly sarcastic
- cares about projection, usage, efficiency, and lineup decisions
- treats numbers as evidence rather than decoration

Signature:
> The numbers are allowed to be rude.

### Tilly Fleecer — Tabloid Sports Editor
Desk: **The Back Page**

Personality:
- loud back-page sports voice
- punchy and sensational
- braggy when deserved
- mocking when earned
- may use EXTRA!, RED INK!, and oversized-newspaper energy
- drama must remain anchored to actual results

Signature:
> If it happened, it belongs in 48-point type.

### Jefferson Filch — Investigations & Front Office
Desk: **The Inquiry Desk**

Personality:
- sardonic investigative columnist
- forensic about roster decisions and transactions
- skeptical of easy narratives
- darker dry humor
- treats lineup cards and transaction logs like evidence

Signature:
> Every lineup leaves fingerprints.

## Rotation

Every completed week:
- 32 teams are sorted by stable roster ID
- four reporters split the league evenly: 8 teams each
- reporter assignment shifts by one desk each week
- across four consecutive weeks, each reporter covers every team exactly once
- assignment is deterministic, so an archived article always keeps the reporter it was originally assigned

## Article persistence

A completed weekly report stores:
- reporter ID and profile
- byline
- headline
- article paragraphs
- comedic aside
- source description
- fantasy-point facts
- real-life Sleeper stat lines used in the article

Each reporter also receives a persistent archive in the League Hub Blob store:
- an immutable standalone JSON file for every published article
- reporter identity
- season/week
- team
- manager
- headline
- archive index entry
- link back to the preserved weekly report

Once an Inquirer article has been stored for a completed week, ordinary refreshes reuse that stored article instead of silently rewriting its prose. Reporter article files are write-once unless an explicit migration is intentionally performed.

**V10 was an explicit migration** requested on 2026-09-19 so existing V9 articles could be regenerated once with the richer live-league contract: standings, streaks, playoff positioning, recent team scoring form, and multi-week player form.

**V11 is an explicit reporter-name migration** requested on 2026-09-19. The four stable internal reporter IDs and archive paths are retained. V11 introduced Nick Swindell, Penny Picket, Tilly Fleecer, and Frank Filcher; V12 replaces Penny Picket with cjminnich and Frank Filcher with Jefferson Filch. Existing V10 articles may be regenerated once so saved bylines/archive metadata use the new names. After the V11 migration, ordinary refreshes preserve the V11 article.

## Runtime files

- reporter/data engine: \`netlify/functions/inquirer-reporters.mjs\`
- weekly capture/archive API: \`netlify/functions/league-hub.mjs\`
- League Hub / Inquirer UI: \`league-hub-v451.js\`

## Source precedence

For future work:
1. current runtime code
2. this document
3. canonical system document
4. older chat notes

Do not collapse the four reporters back into one generic voice unless explicitly requested.


**V12 reporter-name migration — 2026-09-19:** public bylines became Nick Swindell, cjminnich, Tilly Fleecer, and Jefferson Filch. Internal reporter IDs remained unchanged.

**V13 style/name migration — 2026-09-19:** cjminnich becomes Bartholomew Roycington III. More importantly, the house style is upgraded from neutral-ish sports recap to **hometown beat reporter + fan**: more sarcasm, more first-person rooting interest, more callbacks to recent pain/success, more rival needling, and less robotic section language. The reporters may be petty, dramatic, mocking, boastful, skeptical, or exasperated as long as the football facts remain grounded in Sleeper data.


## V14 long-form article standard — 2026-09-19

The Inquirer is not a recap feed. Each published team story should read like a full beat column that happens to be powered by structured Sleeper data.

Expected article shape:
- roughly 9–10 substantive paragraphs when the underlying data exists
- a narrative lead rather than a score dump
- a season thesis that explains what the result means
- callbacks to recent games so the story has memory
- analysis of how the team score was constructed, including concentration/depth and projection hits/misses
- multiple player discussions with fantasy points, real-life NFL production, and multi-game form where available
- supporting-cast and weak-link analysis
- lineup/bench/transaction analysis that evaluates managerial process without pretending hindsight is certainty
- opponent-quality context
- next-opponent/playoff implications
- a closing beat-writer kicker that sounds like someone who will be back covering the same team next week

The story should not read like a list of required fields. Facts should be woven into an argument about the team: what changed, what is sustainable, what is worrying, what the manager got right or wrong, and what this week means inside the larger season. Sarcasm and fandom should continue throughout the article, not appear only in a final aside.


## V15 live-league desk expansion — 2026-09-19

V15 expands the Inquirer from team-only beat columns into a full league newspaper.

### Team article additions

Every team beat article now includes a **Value Watch** section sourced from the canonical Value History team snapshots:
- compare the latest team value with the observation at or before seven days earlier
- if seven full days are not yet available, use the earliest valid observation and label it as available history rather than claiming a full 7D move
- include absolute team-value movement, percentage movement when available, and the beginning/ending team value
- Value Watch is commentary on market movement, not a standings result and not a valuation input

Every team beat article also includes a **Next Week Personnel** section:
- use the verified NFL schedule already trusted by the scoring/import pipeline to identify actual bye weeks
- use current Sleeper player metadata for injury/status designations
- distinguish current starters from the rest of the roster
- discuss positional/roster pressure without pretending an injury designation is a guaranteed absence
- if the schedule or injury data is unavailable, withhold the unsupported claim instead of guessing

### In-season week classification

The Fleeced! fantasy season is archived as:
- **Weeks 1–13 — Regular Season**
- **Weeks 14–17 — Playoffs**

Week 14 is the permanent Inquirer playoff boundary. Every reporter must write from a playoffs-have-started perspective in Weeks 14–17 rather than calling those weeks a playoff push. Week 18 is not an Inquirer in-season fantasy week.

### League Overview

Each completed week also publishes a first-class **Fleeced! League Overview** article co-authored by all four reporters.

The overview contains four desk sections and all four reporters appear in the byline/archive.

Required league-wide analysis:
- the game week as a whole: top scores, margins, major streaks and what changed
- standings and playoff/seeding context
- current bubble pressure before Week 14 and playoff consequences from Week 14 onward
- league-wide waiver/free-agent/transaction activity
- reactions to completed trades using the canonical Trade History feed
- team Value History risers/fallers using canonical team Value History
- next-week bye/injury roster pressure around the league
- a standings-based **Race to the Bottom / No. 1 Pick** section analyzing the bottom five teams and their trajectory toward potentially finishing last
- do not invent a lottery, odds, max-PF rule, or tiebreaker that the league data does not establish; describe the bottom-five race as standings/draft-position pressure unless the real draft-order rule is known

### Hot Takes

The League Overview contains a dedicated **Hot Takes** segment with one take from each reporter.

The takes should be opinionated, funny, sarcastic and forward-looking while remaining grounded in real league/player data. Appropriate topics include:
- what a sustained player hot/cold stretch means for the future of that roster
- whether a manager's repeated lineup selections indicate a process problem
- implications of bench/start decisions
- whether a winning/losing streak looks sustainable
- how a transaction or trade changes a team's future options
- whether a bottom-five team is drifting into a real No. 1-pick race
- how upcoming byes or injury designations stress roster construction

Hot Takes are analysis, not new facts. Do not invent injuries, usage, standings, transactions or player production to make a stronger take.

### Archive behavior

The League Overview is archived independently at:
`inquirer/league-overview/<season>/week-<NN>.json`

Because all four reporters contribute to it, the same League Overview also appears in each reporter's personal archive alongside that reporter's team beat articles.
