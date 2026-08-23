# V215 Future-Oriented isolation audit

Baseline: V209 exact tree `bc7700c0d8ffd1986b98a3e154dc737e5823ad4c`.

Scope:
- Future-Oriented is active only when `searchStyle()==='rebuild'` and `finderMode()!=='draft'`.
- Acquire Draft Picks is an explicit hard bypass.
- Existing V209 package generation, tier eligibility, fairness, valuation, Value Adjustment, Package Quality Penalty, Partner Fit, Maximum Value, 2-for-2 logic, 3-asset logic, and Evaluator remain untouched.

Implementation strategy:
1. Preserve receive-package shape in Future-Oriented dedupe keys so Future ranking cannot collapse distinct package structures.
2. In Future-Oriented partner candidate retention, cycle existing V209 FAIR_SHAPES (`single-player`, `player-pick`, `multi-player`) before filling from the existing receive-count mixer. This is candidate retention only; it does not create or validate trades.
3. Keep V209 true 2-player-for-2-player retention inside the Future branch.
4. Add a quality-gated future score to the existing presentation comparator and candidate dedupe comparator only when Future-Oriented is active.
5. Do not add a final global sort. All V209 final structure mixers continue to run after Future ranking.

Future score behavior:
- Low-value young players receive little benefit because age benefit is multiplied by canonical asset quality.
- Tier Up: existing tier-up eligibility remains authoritative; Future ranking favors the stronger incoming centerpiece when it also has better long-term age/value quality.
- Tier Down: existing tier-down eligibility and package rules remain authoritative; Future ranking favors useful young assets and meaningful pick liquidity among already-valid packages.
- Make a Fair Trade: existing fair-trade eligibility remains authoritative; Future ranking prefers better long-term asset quality without forcing a package shape.
- Acquire Draft Picks: exact V209 behavior; no Future score is used.

Known non-goals:
- No changes to displayed underlying player/pick values.
- No new trade eligibility rules.
- No forced youth quotas.
- No global result re-sort after V209 structure diversification.
