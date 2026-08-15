# V97 Trade Logic Guardrails

V97 is an isolated Trade Finder / Trade Evaluator UI and package-construction layer.

## Immutable valuation boundary
- Do not change player valuation formulas, consensus inputs, IDP/offense valuation, scoring, overall ranks, positional ranks, or draft-pick valuation from this layer.
- `trade-engine-v97.js` consumes `tradeEngine96.assetValue()` and `tradeEngine96.fairness()` as read-only inputs.
- Value Adjustment is transaction-only. It never changes an individual asset Value or rank.
- Draft-pick ownership remains Sleeper-derived. Projection context does not assign ownership.

## Finder controls
- Package assistance is an unchecked checkbox labeled `Add assets if needed`.
- Unchecked: only user-selected outgoing assets are used.
- Checked: Finder evaluates selected-only packages first and may add unselected outgoing assets only when needed. Diversification prioritizes at least two selected-only recommendations when qualifying selected-only trades exist.
- Position targets are multi-select checkboxes: Any, QB, RB, WR, TE, IDP.
- Selecting a specific position clears Any; selecting Any clears specific positions.

## Trade presentation
- Raw asset totals remain visible.
- If a Value Adjustment applies, the side receiving the premium/concentrated asset shows `VALUE ADJUSTMENT` and `TRADE-ADJUSTED TOTAL` separately.
- Finder summary highlights Value Adjustment.
- Evaluator uses the same fairness engine and receives the same adjusted-total presentation.
- Global evaluator player search must synchronize the corresponding roster checkbox after selection.

## UI
- Use restrained color accents for receive/send panels, fairness states, Value Adjustment, and controls. Do not make the interface visually noisy.
