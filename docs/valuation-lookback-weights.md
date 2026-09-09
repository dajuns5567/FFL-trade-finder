# Production Lookback Weighting Policy

For the three-year production anchor, use recency weighting of **60% / 30% / 10%** across the three most recent qualifying seasons.

A season qualifies only when the player reaches the configured 8-game minimum. A season that does not qualify is ignored rather than scored as a negative. Missing or ineligible seasons must not inflate value by giving a one- or two-season sample the same confidence as a full three-season history.

The active current season is a special exception to the 8-game qualification threshold. While a season is current and in progress, its production may contribute immediately under the in-season weighting plan even when the player has fewer than 8 games played. The identity of the current season must be determined dynamically from the active Sleeper league season rather than hard-coded: for example, 2026 is current during the 2026 season, 2027 becomes current during the 2027 season, and so on.

When Week 18 of that current season is complete and the season transitions to completed/postseason/offseason status, the exception ends. From that point forward, the just-finished season is treated as historical and must satisfy the same 8-game minimum as every other historical season. A player with fewer than 8 games in the completed season does not qualify that season for the historical scoring lookback.


## Current-season game qualification

The active current season is evaluated game-by-game, not from live in-progress totals. A player's statistics from a current-season game may enter the scoring lookback only after that NFL game is verified final.

For the current season only, a finalized player-game qualifies when either of these is true:

- the player records at least 20% of the relevant team snaps in that game; or
- the player scores at least 8.0 fantasy points under the league scoring settings.

The two conditions are joined by OR. Missing snap-share data does not satisfy the 20% condition, but the game may still qualify through the 8-point condition.

Only qualified finalized player-games are aggregated into the current-season sample. The current-season sample is exempt from the historical 8-game minimum while that season is active, and the current-season confidence system continues to damp small samples. Once Week 18 is complete and the season is no longer active, the current-season exception ends and the normal 8-game historical minimum applies to that season.

The active current season is determined dynamically from the Sleeper league season. No year is hard-coded.
