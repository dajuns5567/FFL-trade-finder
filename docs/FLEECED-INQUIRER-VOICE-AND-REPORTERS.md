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
