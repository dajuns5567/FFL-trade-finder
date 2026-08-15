# V98 Continuous Trade Adjustment

V98 trade fairness uses a continuous, trade-only consolidation adjustment. It does not modify player Value, player rank, consensus, scoring, IDP/offense valuation, draft-pick valuation, or Sleeper draft-pick ownership.

The adjustment scales smoothly with the existing Value of the stronger centerpiece, the relative Value of the opposing package's strongest asset, and package fragmentation. There are no player-Value tier thresholds or player-specific exceptions. Premium-vs-depth receives a stronger adjustment; premium-vs-premium receives a much smaller adjustment; mid-tier-vs-low-tier receives a smaller adjustment; low-tier packages receive progressively less adjustment.

Current V97 rollback checkpoints remain preserved on `preserve-v97-before-v98` and `checkpoint-production-v97-2026-08-15`.

Deployment rule: only the V98 trade engine, V98 UI stylesheet, loader activation, and this documentation may differ from V97 production.

This note documents the deployed behavior and is not executable site logic.