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
- harmless Inquirer-style asides about managers are allowed as obvious comedy
- the humor must never fabricate scores, standings, transactions, player production, injuries, or real-world events

Data rules:
- use completed weekly scores and the actual opponent
- use Sleeper projection when enough projection data exists
- use starting-lineup and positional production
- use transactions
- use standings/division implications
- use manager information and relevant league awards when available
- when mentioning a player in a performance context, include **fantasy points and real-life stat production** from Sleeper weekly stats
- real-life stat examples include passing attempts/completions/yards/TD/INT, rushing attempts/yards/TD, receptions/targets/yards/TD, and IDP tackles/sacks/TFL/QB hits/INT/FF/FR/PD
- if Sleeper does not return a usable real-life stat line, say so or avoid the unsupported detail; never invent it
- never fabricate 0.0–0.0 results
- if the required completed scoring data is unavailable, fail gracefully rather than publishing a fake recap

## Four permanent reporters

### Walter Mercer — Senior Football Correspondent
Desk: **The Old Desk**

Personality:
- veteran beat writer
- clipped and declarative
- box-score-first
- dry skepticism
- sounds like ink, coffee, and a deadline

Signature:
> No hysteria without a box score.

### Tess Delaney — Performance & Tactics Columnist
Desk: **The Numbers Desk**

Personality:
- analytical
- precise
- dryly sarcastic
- cares about projection, usage, efficiency, and lineup decisions
- treats numbers as evidence rather than decoration

Signature:
> The numbers are allowed to be rude.

### Mack Hollis — Tabloid Sports Editor
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

### Nora Voss — Investigations & Front Office
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

Once an Inquirer article has been stored for a completed week, ordinary refreshes and future Inquirer code versions reuse that stored article instead of silently rewriting its prose. Reporter article files are write-once unless an explicit migration is intentionally performed.

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
