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


## V16 conference playoff rounds + rolling fan sentiment — 2026-09-19

### Exact postseason naming

The Inquirer fantasy calendar remains Weeks 1–17, but playoff weeks now have permanent round identities:

- **Week 14 — AFC Wildcard Round / NFC Wildcard Round**
- **Week 15 — AFC Divisional Round / NFC Divisional Round**
- **Week 16 — AFC Championship / NFC Championship**
- **Week 17 — Super Bowl**

Conference is not guessed from roster ID or team name. It is derived from Sleeper league metadata:
- each roster's `settings.division`
- the corresponding Sleeper `league.metadata.division_<n>` label
- labels beginning `AFC` map to AFC; labels beginning `NFC` map to NFC

League-wide overview copy may refer to the Week 14–16 rounds as **NFC/AFC Wildcard Round**, **NFC/AFC Divisional Round**, and **NFC/AFC Championship** because it covers both conferences. Team beat articles use the team's actual AFC/NFC round. Week 17 is simply the **Super Bowl**.

The reporter must also know the next postseason round when previewing the following week. Week 13 can preview the AFC/NFC Wildcard Round; Week 14 can preview the conference Divisional Round; Week 15 can preview the conference Championship; Week 16 can preview the Super Bowl. No Week 18 fantasy round is invented.

### Fan Sentiment toward management

Every team article contains a dedicated **Fan Sentiment** section describing how that fan base currently feels about its GM/owner.

This is a **running reputation**, not a reaction meter for one Sunday.

Inputs may include:
- the last several completed team results, weighted toward the most recent games
- current winning or losing streak
- season record and league standing
- recent team scoring form versus the prior stretch
- current week's result versus projection
- lineup/bench decision quality
- canonical team Value History movement
- recent completed trade activity
- prior playoff success
- prior regular-season titles
- prior championships
- a newly won current-season championship when Sleeper's winners bracket identifies the Week 17 champion
- the previous archived week's Fan Sentiment for the same manager

The prior week's sentiment carries substantial inertia. A manager who has performed well for months, especially one with playoff success or repeated championships, should not become hated because of one loss. Likewise, a manager with a long losing stretch, deteriorating team value and repeated poor decisions should not reset to neutral because of one fluky win.

The stored sentiment contains a numeric score for continuity and analysis, but the article itself should read naturally rather than like a dashboard.

### Sentiment range

The language should be creative and wide-ranging, with stronger management performance producing more positive fan reactions.

Positive examples can progress through:
- cautious belief
- strong approval
- standing ovation
- parade-permit talk
- build-the-statue demands
- Hall of Fame petitions for proven/repeated champions

Negative examples can progress through:
- sports-radio grumbling
- organized boo birds
- fire-the-GM chants
- joking demands to ban management from the city
- **metaphorical/cartoon** torches-and-pitchforks revolt
- an intentionally absurd imaginary-mansion siege at the very bottom of the scale

Extreme negative language is sports-fan satire, not a literal call for violence. Keep it obviously hyperbolic and fictional while preserving the comedic intensity requested for the Inquirer.

### Continuity rule

When the same manager remains in place, the previous week's archived sentiment is blended with the new evidence. When management changes, the old manager's sentiment does not transfer automatically to the replacement.

Fan Sentiment is commentary only. It must never feed back into player valuation, trade valuation, standings, or any other numerical league system.


## V17 narrative newsroom standard — Week 1 rewrite, 2026-09-19

V17 replaces the original 2026 Week 1 V16 edition because the V16 team stories read like templated requirement summaries rather than real beat columns.

### Article architecture

Every team story is a **sectional long-form beat column**, not a sequence of requirement-checklist paragraphs.

Each team article has six complete sections:
1. the game story / lede
2. player-performance analysis
3. management / lineup / transaction analysis
4. a standalone Value Watch
5. rolling Fan Sentiment
6. next-week outlook / roster-pressure reporting

Each section must contain connected prose, not labels followed by stat fragments.

The archived article keeps a flat `paragraphs` array for compatibility, but `sections` is the canonical V17 presentation and writing structure.

### Prose rules

- Write like a beat reporter who is also a fan of the team being covered.
- Facts should support the story rather than becoming the story's grammar.
- Do not write pipe-delimited stat dumps.
- Do not chain every relevant number into one sentence merely because the data exists.
- When a player is discussed materially, connect fantasy production to the available real NFL stat line in complete prose.
- Use numbers selectively. The reader should come away remembering what happened and why it mattered, not feeling as if a box score was read aloud.
- Avoid fragment-heavy headline-style body copy.
- Tilly Fleecer may be loud, sarcastic and tabloid-minded without turning entire paragraphs into all caps.
- Humor and sarcasm should emerge from each reporter's personality instead of being supplied by a canned all-caps prefix.
- Week-to-week context should be woven into analysis instead of appearing as a detached checklist item.
- Value Watch remains its own section and must fail closed when a valid comparison does not exist.
- Fan Sentiment remains a running reputation rather than a reaction to one game.

### Headline rules

Headlines must vary across the eight teams assigned to each reporter in a week.

The deterministic headline system provides multiple win/loss constructions per reporter and must avoid:
- repeating one formula across most of a desk
- inserting the final score into every title
- awkward possessives
- singular/plural agreement that depends on whether a team name is grammatically singular or plural
- leading/trailing whitespace or accidental stat-dump syntax

### Generated-edition quality gate

The canonical audit is:

`node scripts/inquirer-prose-quality-audit.mjs`

The audit evaluates the **finished archived edition**, not merely source-code structure.

For a 32-team weekly edition it currently requires:
- 32 team articles
- six required section kinds per article
- at least two paragraphs per section / 12 narrative paragraphs per story
- at least 520 words per team article
- median paragraph length of at least 38 words
- numeric-token density no greater than 7.5%
- all-caps-word density no greater than 1.8%
- no pipe-delimited stat-dump prose
- no legacy V16 canned checklist phrases
- very-short-sentence ratio no greater than 22%
- reporter-specific vocabulary/voice evidence
- at least six distinct normalized headline structures per reporter across that reporter's eight weekly stories
- no five-word paragraph opener reused across more than eight stories

The audit is a permanent PR CI gate. If a generated edition fails it, fix the writing engine or generated prose; do not weaken the audit merely to publish.

### 2026 Week 1 replacement

The original V16 Week 1 preload is superseded.

The published 2026 Week 1 V17 replacement:
- contains 32 team stories
- assigns eight team stories to each reporter
- contains six sections and 12 paragraphs per team story
- averages about 840 words per team article
- keeps the four-desk League Overview and four Hot Takes
- passed the generated-edition prose audit before being committed
- retains the Week 1 fail-closed Value Watch because no valid seven-day team-value comparison existed

The immutable Week 1 edition remains at:
`netlify/functions/inquirer-week1-2026-preload.mjs`

with publication metadata at:
`data/inquirer/2026/week-01.meta.json`


## V18 human-first newsroom standard — active as of 2026-09-19

V18 supersedes V17 for both team beat columns and the League Overview. V17 remains documented above as historical context, but it is no longer the active writing standard.

### Core editorial rule

**Report the story. Do not explain the data pipeline to the reader.**

Statistics are supporting evidence, not the grammar of the article. A reporter should sound as though they watched the team all week, followed the transactions, saw the game, talked to the fan base, and then wrote a column.

The article must not narrate internal implementation details such as:
- whether Sleeper returned a row
- whether a "usable real-life stat line" was available
- what the next data point will establish
- what "this section" is designed to measure
- why a numerical metric is technically useful before presenting it
- generic phrases such as "the useful question", "the useful part", or "the numbers are asking"

If a supporting data field is missing, either write around it naturally or omit that claim. Do not turn missing data into article copy.

### Team beat columns

The six-section architecture remains:
1. game story / lede
2. players who shaped the result
3. management / lineup / transaction reporting
4. Value Watch
5. rolling Fan Sentiment
6. next-week outlook

The structure exists to keep coverage complete; it must not make the prose read like six database reports.

V18 team columns should:
- flow in complete reporter prose
- lead with what happened, not with a methodology disclaimer
- use the final score and only the most meaningful supporting numbers
- avoid repeating full stat lines for every player mentioned
- give the primary player meaningful fantasy + real-football context while treating secondary names more lightly
- describe bench mistakes as decisions and consequences rather than as abstract point-gap calculations
- describe transaction activity as front-office behavior rather than a transaction-count dump
- keep each reporter's personality inside the writing instead of printing the internal voice instructions under the byline
- never display the reporter prompt/voice description as published article text

Bench players and comparison players are first-class article subjects. If a best-bench or worst-starter player is discussed, the same weekly Sleeper stat enrichment used for starters must be applied to that player before prose is generated.

### Defensive stat-line rule

IDP stat rendering accepts Sleeper IDP aliases for solo tackles, assists, total tackles, sacks, tackles for loss, quarterback hits, interceptions, forced fumbles, fumble recoveries and passes defended. When solo/assist detail is absent, total tackles may be used. Defensive snaps are a last-resort factual fallback.

Singular grammar must be natural: `1 sack`, `1 QB hit`, `1 tackle`, not plural labels after the number one.

The Week 1 Nate Landman regression case is permanent evidence for this rule. His archived Week 1 row must resolve from player id 8659 to a real defensive line including **5 solo, 3 assists, 1 QB hit and 1 PD** rather than being described as missing.

### League Notebook

The co-authored League Overview is now written as a **League Notebook**, not a statistical report.

Each of the four desks gets a real editorial section with connected paragraphs. League-wide facts such as scoring leaders, standings, trades, roster movement, injuries and market direction may inform the notebook, but the prose should sound like league reporting, gossip and opinion rather than a dashboard narration.

The canonical generated-edition audit is:

`node scripts/inquirer-overview-quality-audit.mjs`

### Hot Takes means predictions

The Hot Takes box is not a second analytics section.

Where the underlying league data permits it, every weekly edition must include bold, falsifiable predictions from these categories:
- **championship / Super Bowl pick**
- **fraud-team call**
- **division-winner picks**
- **Player of the Year pick**
- **upset special**

These are explicitly predictions, not current standings presented with dramatic labels. The article should make clear that a call is a pick/opinion while remaining grounded in the league's real completed results and roster context.

Hot Takes may be wrong. That is part of the feature.

### V18 quality gates

The team-column audit is:

`node scripts/inquirer-prose-quality-audit.mjs`

For the current 32-team edition it requires, among other checks:
- 32 complete team articles
- six section kinds and at least 12 paragraphs per team
- at least 300 words per team column
- median paragraph length of at least 24 words
- numeric-token density no greater than 7.5%
- no provider/pipeline-explainer language in article copy
- no legacy checklist/stat-dump constructions
- reporter-specific voice evidence
- headline diversity
- no five-word paragraph opener reused across more than eight stories

The League Notebook audit independently checks:
- four reporter sections
- connected multi-paragraph prose
- restrained numerical density
- absence of legacy statistical-report phrasing
- at least five real Hot Takes
- championship, fraud, division, player and upset prediction categories

Both audits are permanent PR CI gates.

### 2026 Week 1 V18 replacement

The immutable Week 1 archive was regenerated from completed Sleeper Week 1 data and replaced the V17 edition.

Committed publication metadata records:
- 32 team articles
- eight team articles per reporter
- six sections per team article
- approximately 363 words per team article
- four League Notebook sections
- approximately 496 League Notebook words
- five Hot Takes: championship, fraud, division, player and upset
- verified Nate Landman bench-player real-stat enrichment

The archive remains:
`netlify/functions/inquirer-week1-2026-preload.mjs`

with metadata at:
`data/inquirer/2026/week-01.meta.json`


## V20 passionate beat-reporter newsroom — active standard

V20 supersedes the V18/V19 presentation-oriented editions. The six reporting beats remain available as coverage requirements, but **they are no longer a fixed article template or fixed reading order**.

### Identity and voice

Each writer is a hometown beat reporter and fan whose emotional investment is visible on the page.

All four reporters must:
- be conversational, sarcastic and funny
- use one-liners and observational humor naturally
- show real elation after important wins and championships
- show frustration, impatience and disappointment during losses or prolonged bad stretches
- offer editorial judgment and newsroom insight beyond repeating the inputs
- write as though they have followed the team all week, watched the game, know the manager's habits and have opinions about what happened
- deliver statistics inside the story rather than pausing to explain what the statistics mean

Distinct personality does **not** mean assigning one reporter the role of dry statistics analyst. Bartholomew in particular is a theatrical, overeducated, slightly pretentious hometown columnist with sharp sarcasm, not a "numbers desk" presenter.

### Thirty-two articles, not thirty-two templates

A weekly edition must feel like 32 separately filed stories.

V20 uses the facts of each team's week to choose an editorial angle such as:
- championship celebration
- playoff survival or elimination
- a legal lineup mistake
- blowout win/loss
- close win/loss
- winning heater or losing spiral
- unusually active front office
- a broader win/loss story

The order of the six reporting beats varies by article. The finished-edition audit requires multiple distinct section orders, and no one structure may dominate the edition.

V20 also requires at least 14 narrative paragraphs per team article: the six reporting beats plus additional editorial/newsroom judgment. Extra paragraphs must add voice, insight, humor or emotional context—not filler.

Repeated five-word openings and repeated normalized sentences are audited across the entire 32-team edition. If one line becomes a canned template, change the writer rather than relaxing the audit.

### Lineup hindsight is slot-aware

A reporter may criticize a bench/start decision only when the reserve could legally occupy the starter's actual Sleeper lineup slot.

Examples:
- an RB may replace an RB or eligible offensive FLEX slot
- a WR may replace a WR or eligible offensive FLEX slot
- a QB may replace a QB or eligible Superflex/OP slot
- IDP positions remain inside their IDP-eligible positions/slots

**An IDP player cannot be framed as a replacement for an RB, WR, QB or other offensive slot merely because the IDP player scored more fantasy points.**

This rule applies everywhere, including fallback UI copy. Cross-position "best bench vs. worst starter" comparisons are prohibited unless the substitution is actually legal.

### Archive behavior

The Fleeced! Inquirer archive:
- defaults to the current completed week
- has Year, Week and Team filters
- lets a reader select one team and move through that team's archived coverage
- preserves the selected team when the reader changes archive year where that team remains available
- retains reporter-specific archives in addition to the team/week archive

Source/provenance text is still available but is collapsed behind a **Sources** disclosure so an article ends like journalism rather than a data report.

### V20 generated-edition gate

The canonical team audit remains:

`node scripts/inquirer-prose-quality-audit.mjs`

The audited 2026 Week 1 V20 edition records:
- 32 articles
- six reporting beats per article
- at least 14 paragraphs per article
- about 444 words per article on average
- eight distinct section-order patterns across the league
- zero five-word paragraph openings reused beyond the allowed limit
- zero normalized sentences reused beyond the allowed limit
- approximately 3.3% numeric-token density across the edition
- all four reporters satisfying their personality/voice checks

The separate League Notebook audit remains:

`node scripts/inquirer-overview-quality-audit.mjs`

It requires every desk—not only Tilly—to carry personality/humor, while preserving the five real prediction categories: championship, fraud, division, player and upset.

The immutable Week 1 V20 archive is:
`netlify/functions/inquirer-week1-2026-preload.mjs`

with publication metadata:
`data/inquirer/2026/week-01.meta.json`
