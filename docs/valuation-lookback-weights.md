# Production Lookback Weighting Policy

For the three-year production anchor, use recency weighting of **60% / 30% / 10%** across the three most recent qualifying seasons.

A season qualifies only when the player reaches the configured 8-game minimum. A season that does not qualify is ignored rather than scored as a negative. Missing or ineligible seasons must not inflate value by giving a one- or two-season sample the same confidence as a full three-season history.

The active current season is a special exception to the 8-game qualification threshold. While a season is current and in progress, its production may contribute immediately under the in-season weighting plan even when the player has fewer than 8 games played. The identity of the current season must be determined dynamically from the active Sleeper league season rather than hard-coded: for example, 2026 is current during the 2026 season, 2027 becomes current during the 2027 season, and so on.

When Week 18 of that current season is complete and the season transitions to completed/postseason/offseason status, the exception ends. From that point forward, the just-finished season is treated as historical and must satisfy the same 8-game minimum as every other historical season. A player with fewer than 8 games in the completed season does not qualify that season for the historical scoring lookback.
