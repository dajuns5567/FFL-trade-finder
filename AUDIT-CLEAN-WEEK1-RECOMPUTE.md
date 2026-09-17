# Clean Week 1 recompute audit

Purpose: create an isolated deployable control from current main for validating the corrected Week 1 valuation state without changing valuation philosophy or production.

## Invariants

- Preserve offense model weights at 60/23/12/5.
- Preserve canonical value-from-rank normalization.
- Preserve current young-player and RB calibration.
- Preserve the repaired scheduled Week 1 denominator behavior.
- Preserve the repaired established-player confidence behavior.
- Do not manually restore player values or ranks.

## Acceptance test

1. Start from a clean page/runtime state so valuation caches are rebuilt.
2. Require completed Week 1 scoring data and a successful full consensus refresh.
3. Verify scoring integrity diagnostics before evaluating ranks.
4. Compare the resulting exact-ID master ordering with the last-good 2026-09-14 Value History snapshot.
5. Treat remaining differences as residual model/input differences; do not compensate by forcing canonical values.

This commit intentionally changes no executable valuation code. It exists to produce an isolated preview/deploy and a clean recomputation control before any further repair is considered.
