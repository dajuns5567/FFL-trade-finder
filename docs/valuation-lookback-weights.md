# Production Lookback Weighting Policy

For the three-year production anchor, use recency weighting of **60% / 30% / 10%** across the three most recent qualifying seasons.

A season qualifies only when the player reaches the configured 8-game minimum. A season that does not qualify is ignored rather than scored as a negative. Missing or ineligible seasons must not inflate value by giving a one- or two-season sample the same confidence as a full three-season history.

Once the current season begins, it becomes the most recent season only after the player reaches the 8-game qualification threshold. Until then, the model continues to use the three most recent qualifying seasons available.
