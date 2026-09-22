# Inquirer V26

Draft PR 385 only. V26 extends the accepted V25 editorial rewrite; it does not change canonical player/pick values, Finder/Evaluator fairness, Value Adjustment, Trade History valuation, Value History, scoring qualification, or persistence.

- Weekly Recap now develops up to five editorially selected matchups in **What Actually Mattered This Week**, adding natural divisional, standings, playoff-path and future-schedule implications instead of stopping at the score and top performers.
- Jefferson Filch's next-week desk now develops the featured matchup beyond the projection: current records, divisional stakes when applicable, playoff-path context and what a win or loss does to each team's remaining runway.
- Team articles retain the existing stats but add reporter commentary about what the result means, whether the roster's shape looks repeatable, supporting-cast pressure, management consequences, fan expectations and the road ahead.
- Canonical Trade History now feeds a roster's player-acquisition context into Inquirer facts. A current player acquired by trade can be identified as a trade acquisition in the current week and referenced in later coverage with the known trade week/counterpart/outgoing-player or pick context. Missing trade evidence is never invented.
- Current transaction prose now respects Sleeper transaction type. A trade acquisition is no longer described as a waiver/free-agent "ADD ALERT."
- Division comparison rows now carry complete opponent/result/record context, and next-opponent facts include division relationship plus the opponent's available MIDA outlook.
- V26 deliberately invalidates the older V25 Week 1 preload for active reads until a V26 preload is regenerated. Runtime generation therefore cannot silently serve stale V25 copy. League Hub browser cache is 508.

Validation continues through the existing Inquirer smoke/prose audits plus the expanded V25-named editorial audit, which now checks the V26 version, five-game recap capacity, implication writing and acquisition callbacks. The one-time Week 1 generator now stamps V26 for the next exact preload regeneration.


## Recovered Work-state reconciliation

V26 editorial revision 2 restores the accepted Work-state that predates the V26 expansion:

- **Weekly Recap** is the only user-facing name for the league-wide weekly article.
- Year / Week / Team archive filters, latest-completed-week default, top article picker, article auto-scroll, Reporter Desks Close, reporter-story archive controls, Value History team links, transparent Hot Takes and collapsed Sources are protected UI behavior.
- Nick, Bartholomew, Tilly and Filch no longer receive one shared `sectionCommentary()` layer. Each has a dedicated expansion path and two reporter-specific section structures.
- Bartholomew is explicitly theatrical, cultured/pretentious, sarcastic and funny; he is not the analytics desk.
- Nick is clipped, historically minded and assignment-driven; Tilly is punchy/tabloid; Filch is case-file oriented and carries lineup/trade questions forward.
- Value History prose is reporter-specific instead of inherited from older mechanical copy.
- Existing same-version V26 stored articles are not trusted automatically: `editorial_revision: 2` forces migration of stale V26 copy generated before this recovery.
- Missing-evidence sections remain exactly `n/a`; added length must come from commentary, context and connective reporting rather than filler.

## Editorial revision 5

Revision 5 deepens individual team columns without changing the V26 article architecture. Player statistics now carry reporter interpretation about workload, repeatability and consequence; poor records receive reporter-specific pessimistic sarcasm; and broad balance/depth claims are gated to weeks with three 18+ point scorers.

Incomplete canonical trade-history packets no longer generate explanatory Trade Receipt prose. The dedicated trade-history beat is omitted until the original and current value evidence is complete. Tilly Fleecer’s output is normalized away from capitalization-for-emphasis, and cross-article repetition remains subject to the generated-copy fingerprint audit.
