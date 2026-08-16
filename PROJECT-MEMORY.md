# Fleeced! — Durable Project Memory

This file is the durable, non-executable source of truth for the Fleeced! 32-team dynasty trade project. It exists so future work can recover the league context, valuation philosophy, trade-construction rules, UI expectations, deployment safeguards, and known validation examples without relying on chat history alone.

**Important:** this document is documentation only. It must never be imported by runtime code and must not change player values, rankings, draft-pick values, consensus calculations, fairness formulas, or production behavior by itself.

## 1. Project purpose

Fleeced! is a league-specific dynasty trade finder and evaluator for a 32-team Sleeper league. The site should produce realistic, league-aware trade recommendations and evaluate custom trade packages while preserving a single master valuation/ranking system across Finder and Evaluator.

Primary product areas:
- Trade Finder
- Trade Evaluator
- League / team context
- Model diagnostics
- Player Values / master ranking
- Sleeper roster and draft-pick ownership ingestion
- Consensus ranking ingestion

## 2. League format and roster context

- 32 teams.
- Dynasty.
- PPR.
- Superflex.
- IDP included.
- Two IDP starters.
- No required tight-end starting slot.
- Tradable draft picks.
- Draft-pick ownership must come from actual Sleeper league data rather than assumptions.
- Current pick horizon in the 2026 project state extends through 2029 and should extend by one additional year annually as Sleeper exposes the next season.
- There are 32 picks per round, so a late first in this league is materially less valuable than a late first in a typical 10- or 12-team league.
- Team-specific roster construction matters for partner selection and recommendation context, but never for the underlying value of a player or pick.

### New Orleans Aints context used repeatedly for validation

- User team used frequently for testing.
- Team status has generally been treated as Contender.
- Strong/elite QB, WR and IDP groups in the current project context.
- RB is comparatively weaker.
- TE should not be treated as a roster need because TE is not a required starting position.
- Team-fit logic should look at actual positional strength and depth, not merely whether a roster technically contains a player at a position.
- Draft-pick ownership must be read from Sleeper. A previous correction established that New Orleans had no owned picks before 2029 in the referenced snapshot; current ownership should always come from live/refreshable Sleeper data rather than this sentence.

## 3. IDP scoring supplied by the user

Use the league-specific IDP scoring rules when calculating IDP production/value components:

- IDP touchdown: 10
- Sack: 4.5
- QB hit: 2.5
- Tackle for loss: 2.5
- Blocked punt / FG / PAT: 5
- Interception: 9
- Interception return yards: 0.1 per yard
- Fumble recovery: 7.5
- Fumble return yards: 0.1 per yard
- Forced fumble: 7.5
- Safety: 5
- Assisted tackle: 0.5
- Solo tackle: 1
- Pass defended: 6

Combination scoring applies. Example: a sack can also earn sack + tackle-for-loss + QB-hit points; an interception can also earn interception + pass-defended points.

## 4. Scarcity philosophy

The league-specific scarcity adjustments established by the user are:

- QB: 15%
- RB: 15%
- WR: 10%
- TE: 2%
- IDP: 0%

Reasoning:
- QB matters significantly in a 32-team Superflex environment and should not be underweighted.
- RB scarcity matters.
- WR scarcity matters, but less than QB/RB.
- TE scarcity should be minimal because there is no required TE starting slot.
- IDP depth is broad in this league. Only approximately the top 5–10 IDPs should command premium value; replacement-level IDPs are commonly available. Do not create artificial IDP scarcity.

## 5. Master valuation and ranking rules

These are foundational and should not be changed by trade-construction or UI work unless the user explicitly asks for a valuation change.

- One master ranking/value system is used by both Trade Finder and Trade Evaluator.
- Best player in the entire league should anchor the raw scale at 9,999.
- Player values should span roughly 100–9,999 with meaningful dispersion.
- Positional ranks displayed beside players must match the internal value/ranking order.
- Overall ranks displayed beside players must match the master ranking order.
- If Ja’Marr Chase is the highest-valued WR, he must display WR1.
- Team fit must never alter player value.
- Team fit is only for choosing partners, ordering recommendations, and explaining roster context.
- Consensus/expert rankings are an important input and were deliberately given a substantial weight after earlier recommendations were unrealistically detached from market consensus.
- Equal rounded/displayed values do not imply true interchangeability. Internal tie-breaking should preserve finer underlying information such as rank, consensus component, scoring component, CV, TV, and other model inputs.
- The site may display rounded values, but Finder should still distinguish players whose internal profiles differ.

### Consensus/reference sources used in the project

The project has referenced / ingested sources including:
- FantasyPros dynasty rankings
- DraftSharks dynasty rankings
- KeepTradeCut (KTC)
- FanRanked
- The IDP Show combined data
- DraftSharks IDP
- RotoWire IDP
- Other previously wired project feeds where present in source code

Consensus refreshes may legitimately move player rankings or values. Code-only Finder/UI changes must not silently move master Player Values.

## 6. Draft-pick valuation rules

- Draft picks are real league assets and must be owned by the team actually shown as current owner in Sleeper.
- Do not invent or infer ownership from original team alone.
- Pick values depend on year, round, and projected slot/strength as defined by the existing model.
- The 32-team format materially compresses later pick value relative to smaller leagues.
- Pick valuation itself must not change merely because the user selects a Finder filter such as Acquire draft picks.
- Finder filters only constrain which picks/packages are considered; they do not revalue the picks.
- When a user specifically selects a year and/or round in Acquire draft picks, returned picks must obey those selected constraints.
- If no year/round is selected, Finder should choose the best value-matching pick or pick package rather than mechanically rotating through every team’s similar pick.
- Acquire draft picks is a manual priority and should override ordinary roster-fit acquisition logic on the incoming side.
- When selected, the initial recommendations should be draft-pick-only incoming packages unless the user explicitly changes the intent.
- Teams with many selected-round picks may send large pick packages. Do not impose an arbitrary four-pick cap.
- If a user asks for only 2nds and 3rds, Finder may combine many 2nds and 3rds across years when those picks actually exist and ownership is valid.
- If a specific year is selected, combinations may use all qualifying picks in that year if necessary and fair.
- If no team owns enough qualifying picks to reach the minimum fair range, the Finder should explain that no team has enough qualifying draft-pick value rather than returning an unexplained empty result.

## 7. Team context and recommendation logic

Team context is recommendation logic, not valuation logic.

Finder should consider:
- Contender / competitive / retooling / rebuilding / purgatory status
- Expected wins / playoff outlook where available
- Actual roster construction and depth
- Relative positional strength across the league
- Incoming and outgoing roster balance
- Whether a trade leaves a team dangerously thin at a required position
- Whether the other team has a reason to make the trade

Examples of desired behavior:
- A New Orleans tier-up-at-RB search should not casually trade away so many WRs that the team is left with one WR and six RBs unless the trade is much lower in recommendation order.
- “Balanced / any position” should not automatically prioritize QB for a team that already has elite QB depth; it should consider relative roster strengths and weaknesses.
- “Win-now RB” must prioritize genuinely win-now RBs, not young future-oriented backs merely because raw values line up.
- Future-focus searches may legitimately prefer younger players and picks.
- TE must not be treated as a required-position need in this league.
- IDP can be relevant for team fit, but do not inflate IDP player values through scarcity.

## 8. Value Adjustment — established trade-only rule

Value Adjustment is a trade-only fairness mechanism. It does not change any player or pick’s master Value or rank.

Purpose:
- Account for consolidation/premium-asset dynamics that additive raw values cannot represent.
- Especially important in 1-for-1 or package-for-premium trades where two assets with similar raw arithmetic are not equally desirable in practice.

Rules:
- Value Adjustment may apply in single-player-for-single-player trades when appropriate.
- Value Adjustment may apply to the premium side of a package trade.
- It is distinct from Package Quality Penalty.
- It should not be applied mechanically to every trade.
- Finder and Evaluator must use the same adjustment framework.
- Existing Value Adjustment behavior should be preserved unless the user explicitly asks for a formula change.

## 9. Package Quality Penalty — established trade-only rule

Package Quality Penalty exists specifically to solve additive-value consolidation problems from stacks of low-ranked players.

Core concept:
- Three or more weak depth pieces should not be able to purchase a materially better player simply because their rounded raw Values sum to the same number.
- Low-ranked players such as Reggie Virgil, Khalil Herbert, Malik Benson, Barion Brown, Josh Cuevas, and similar depth-tier assets have some individual trade value, but their buying power should degrade when several are bundled to consolidate into a much better asset.

Rules:
- Package penalty is trade-only.
- It never changes an individual player’s master Value or rank.
- It does not apply to a normal one-player-for-one-player trade.
- It may apply when multiple very low-ranked players are bundled together.
- It should be harsher as the package contains deeper-ranked / lower-quality players.
- It may become harsher as more low-tier assets are stacked.
- It should not automatically apply to every multi-player package; mid-tier or high-quality packages should not be punished merely for containing more than one asset.
- It is separate from Value Adjustment.
- A side receiving a package penalty should not simultaneously receive its own Value Adjustment.
- The opposite/premium side may still receive the existing Value Adjustment when appropriate.
- Both can therefore exist in the same trade, but on different sides and only when independently warranted.
- Package penalty must be visible in Finder and Evaluator when it applies, including raw total, penalty, after-penalty value, and trade-adjusted total where relevant.
- Trade rationale should explain when a package penalty materially affects the result.

### Important validation examples

These are behavioral test cases, not hard-coded player-value overrides:

- Jadarian Price for Malik Benson + Barion Brown + Khalil Herbert: should be identified as a fleece / poor consolidation trade. The low-tier package needs a meaningful penalty; merely reaching a similar raw sum is not enough.
- Parker Washington for Benson + Brown + Herbert: should not be near 99/100 merely because arithmetic converges after a weak penalty.
- Three players ranked in the 500s should not readily buy Jadarian Price or another clearly superior asset.
- Players around overall ~800 should contribute roughly the package-buying power of a modest future 3rd-round pick, subject to the model’s existing continuous curve rather than a hard categorical cliff.
- A superstar/premium player receiving a normal premium Value Adjustment should not also be assigned a package penalty just because the other side contains multiple assets.

## 10. Fairness framework and recommendation thresholds

Current established framework from the existing project:
- Fairness score is based on post-adjustment / post-penalty effective values.
- Underlying engine historically labels roughly:
  - 94–100: Excellent Fit
  - 82–93: Fair
  - 65–81: Negotiable
  - Below 65: rejected
- A lower-side effective-value ratio below roughly 72% has historically been a rejection condition in the engine.
- More recent Finder post-processing has used ~72/100 as the minimum recommendation floor.

Project principle:
- Do not compensate for an inadequate package penalty by adding an unrelated arbitrary fairness-score punishment. First correct the effective package value, then compare effective values through the normal fairness framework.
- Recommendation ordering should still consider fairness, partner fit, team context, and package quality.

## 11. Trade Finder intents and controls

### Trade recommendation style

Current UI label: “Trade recommendation style”.

Styles may include balanced/fair, win-now, future-focus, etc. Style changes recommendation construction and ordering, not master player value.

### “I’m trying to…” modes

Established options:
- Make a fair trade
- Tier up
- Tier down
- Acquire draft picks

These modes affect trade construction only.

### Tier up

- Consolidate selected outgoing value into a better centerpiece.
- Must respect package-quality penalty so low-level filler cannot manufacture a tier-up.
- Can add assets only when user enables Add assets if needed.

### Tier down

- Trade a stronger asset for a less-premium centerpiece plus additional value where appropriate.

### Acquire draft picks

- Manual incoming-side priority.
- Incoming side should be draft-pick-only for the initial/recommended results.
- Supports optional year and round filters.
- Supports large pick packages when ownership and fairness support them.
- Must use package penalty on low-tier outgoing player bundles before determining which pick packages they can legitimately buy.

## 12. Add assets if needed

- Optional checkbox.
- Finder should try the explicitly selected outgoing assets first.
- When enabled, Finder may add other outgoing assets only when needed to create a viable/fair package.
- It must never alter the selected assets’ individual values.
- Pending enhancement: allow the user to explicitly exclude assets that the Finder may not auto-add.

## 13. Pending selected-assets controls

These are approved requirements to implement in a later batch unless already completed in source:

### Select-all convenience controls
- Select all assets
- Select all players
- Select all draft picks

These only change checkbox selection state. They do not affect value or fairness.

### Some vs. all selected assets

Only relevant when multiple outgoing assets are selected.

Default behavior:
- Trade away **all selected assets**.

Optional mode:
- “I want to trade some of the selected assets.”

Rules:
- If only one asset is selected, no some/all mode is needed; Finder simply trades that asset.
- With 2+ selected assets, default is all selected assets.
- In “some” mode, the selected assets become an eligible outgoing pool and Finder may explore sensible subsets and varied package structures.
- Selecting an entire roster in “some” mode must not create a whole-roster trade. It should explore reasonable 1-, 2-, 3-asset (and larger when appropriate) combinations.
- In “all” mode, every selected asset must appear in the outgoing package and the incoming package must satisfy the existing fairness framework for the entire selected package.

### Excluded assets

Pending enhancement:
- When Add assets if needed is enabled, user can mark assets that may not be auto-added.
- Excluded assets must remain unavailable to automatic package expansion.

## 14. Finder search and checkbox behavior

Expected UX:
- Searching is a way to locate assets, not a replacement for persistent selection state.
- After selecting Player A through search, user must be able to search Player B and select B without A being deselected.
- Repeat for C, D, etc.
- Removing/deselecting an asset should update the corresponding checkbox.
- Clearing/removing a selected search item in Finder or Evaluator must not leave a stale checked checkbox.
- Clear trade / clear selections should uncheck the relevant checkboxes and remove results.
- Finder and Evaluator should behave consistently.

## 15. Blank-selection Finder behavior

When the user selects a team but no outgoing player/pick:
- Finder should not repeatedly recommend trades for only one player.
- It should vary outgoing assets across the roster.
- Include different structures: 1-for-1, player + pick, multi-player, and occasional multiple outgoing players when sensible.
- Recommendations must be in the best interest of both teams.
- Do not generate duplicate partner suggestions that differ only trivially by swapping similar picks.

## 16. Finder breadth and pagination

- Broad searches should produce a meaningful candidate pool when fair trades actually exist.
- Chuba Hubbard has been used as a test case where only two recommendations appeared despite minimal constraints; this is considered insufficient candidate generation rather than merely a pagination issue.
- Finder should explore more legitimate player, player+pick, and pick-package structures under broad fair-trade searches.
- Current desired presentation: show 5 recommended trades initially.
- “Load more trades” should reveal the next 5.
- Additional trades must use the exact same value, penalty, adjustment, fairness, and recommendation framework as the initial 5.
- Load More is presentation/pagination only; it must not loosen fairness standards.
- Results remain sorted by overall fairness/recommendation quality.

## 17. Trade rationale requirements

Trade rationale should answer “Why is this trade being recommended for my team?” rather than merely restating model notes.

It should include when relevant:
- User team stage/status
- Partner team stage/status
- Actual outgoing and incoming assets
- Roster/depth impact
- Why the partner might reasonably accept
- Whether the trade addresses a real required-position need or improves roster construction
- Value Adjustment if it materially affects fairness
- Package Quality Penalty if it materially affects fairness
- Draft-pick ownership/source context when relevant

Do not use “TE is not a required position” as the entire answer to why a trade is recommended. That can be supporting context, not the rationale itself.

## 18. Finder/Evaluator consistency

- Both use the same master player ranking/value system.
- Both use the same Value Adjustment rules.
- Both use the same Package Quality Penalty rules.
- Both should agree on effective totals and broad fairness classification for the same package.
- Finder may additionally use partner fit and recommendation ordering, but those must not change player values.
- Evaluator should not include redundant “[rank]” text when “overall #” is already displayed in checklist rows.

## 19. UI and logo state

Current approved logo behavior:
- “Fleeced!” in a comic-style speech bubble.
- Current approved version is stable and should be treated as locked unless the user explicitly asks for a logo change.
- Yellow text with bold black outline.
- Flat / one-dimensional rather than layered or 3D.
- Speech bubble rectangular with rounded comic-book styling.
- Transaction-style double-sided black arrow underline beneath the word.
- Do not reintroduce legacy competing logo pollers; an earlier bug was caused by multiple scripts alternately rewriting the header.

## 20. Known validation anchors from the 2026-08-16 project state

These values are examples from a specific project snapshot and may move after legitimate consensus refreshes. They are not hard-coded targets unless the user explicitly freezes them.

Examples observed around the current state:
- Jaxon Smith-Njigba: overall #7, displayed Value ~8060
- Jayden Daniels: overall #8, displayed Value ~7550
- Justin Jefferson: overall #13, displayed Value ~5915
- Maxx Crosby: overall #57, displayed Value ~3525
- Chuba Hubbard: overall #127, displayed Value ~2585
- Denzel Boston: overall ~#136, displayed Value ~2525
- Jadarian Price: overall ~#75, displayed Value ~3167.5 in trade presentation
- Malik Benson: overall ~#465, displayed Value ~1390
- Barion Brown: overall ~#466, displayed Value ~1390
- Khalil Herbert: overall ~#571, displayed Value ~1297.5
- Parker Washington: overall ~#107, displayed Value ~2782.5
- Kenneth Walker: overall ~#36, displayed Value ~4110
- Chris Olave: overall ~#37, displayed Value ~4105
- Christian McCaffrey: overall ~#38, displayed Value ~4050
- Breece Hall: overall ~#39, displayed Value ~3985
- Jordan Love: overall ~#40, displayed Value ~3985

Again: these are snapshot diagnostics. If a consensus source refresh legitimately changes the master ranking, the live ranking may move.

## 21. Deployment and change-management rules

- Never deploy a new version without the user’s explicit approval.
- Before deploying, state what changed and what did not.
- Cosmetic/Finder-logic-only changes must not alter Player Values unless explicitly requested.
- When debugging a deployment, avoid stacking speculative fixes. Identify the actual conflicting script/state first.
- Preserve working approved functionality while fixing isolated bugs.
- The logo is currently approved and should not be touched during unrelated trade-logic work.
- Current code/history in GitHub is authoritative for exact implementation details; this file preserves product rules and context.

## 22. Data durability / reproducibility

Goal:
- Keep enough information in GitHub to recover the project’s logic and product assumptions across chats and over time.

Current durable components:
- Runtime source code and historical commits in GitHub
- Project notes / this memory document
- Static project data files committed to the repository

Important limitation:
- External/live inputs such as Sleeper roster state, current draft-pick ownership, and consensus-source refresh results are not automatically guaranteed to be archived forever merely because runtime code is committed.
- For true reproducibility, each approved production deployment should eventually save a deployment snapshot/manifest containing the effective league state, pick ownership, consensus-source timestamps/results or hashes, and relevant configuration version.
- This snapshotting requirement is a project durability task and must not be confused with changing valuation logic.

## 23. Current V115 change intent

Prepared V115 work is intended to:
- Strengthen Package Quality Penalty for bundles of multiple very low-ranked players.
- Keep 1-for-1 trades exempt from package penalty.
- Preserve Value Adjustment as a separate trade-only mechanism.
- Remove the prior V114 severity-score-cap workaround rather than stacking another score penalty on top of a weak package penalty.
- Expand broad Make-a-fair-trade candidate generation so assets such as Chuba Hubbard can return a healthier set of legitimate recommendations.
- Present results 5 at a time with Load More showing the next 5.
- Keep Player Values, rankings, consensus calculations, pick values, and logo styling unchanged.

## 24. Priority incomplete tasks after V115 verification

1. Verify stronger package penalties on low-tier consolidation examples in both Finder and Evaluator.
2. Verify Jadarian Price and Parker Washington examples are no longer treated as acceptable merely because raw totals add up.
3. Verify broad Chuba Hubbard searches produce substantially more than two recommendations when fair options exist.
4. Verify Load More works in groups of 5 and preserves sorting/fairness.
5. Fix any remaining Brown/Benson Finder flash/disappearing-results behavior.
6. Ensure Benson and Brown can still be distinguished internally even when displayed rounded Values match.
7. Implement persistent multi-player search selection behavior in Finder and Evaluator.
8. Ensure clearing/removing searched selections synchronizes checkboxes.
9. Add Select all assets / Select all players / Select all draft picks controls.
10. Add Some selected assets vs. All selected assets behavior, defaulting to All when multiple assets are selected.
11. Add explicit asset exclusions for Add assets if needed.
12. Preserve existing Acquire draft picks behavior and large-pick-package support.
13. Eventually implement deployment-state snapshots for long-term reproducibility of live external inputs.

## 25. Non-negotiable invariants

Unless the user explicitly requests otherwise:
- Do not bake team fit into player value.
- Do not add IDP scarcity.
- Do not treat TE as a required-position need.
- Do not let low-tier additive packages buy premium assets at full summed Value.
- Do not change Player Values while claiming to make only Finder/UI changes.
- Do not invent Sleeper pick ownership.
- Do not loosen fairness thresholds for Load More.
- Do not deploy without explicit user approval.
- Keep Finder and Evaluator on the same master ranking/value framework.
