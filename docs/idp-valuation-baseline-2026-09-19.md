# IDP valuation baseline — 2026-09-19

This document records the accepted defensive valuation architecture and the rules for routine weekly refreshes. It is a model baseline, not a frozen player-order snapshot. Players must remain free to move, tie, and cross as new scoring and consensus data change their calculated values.

## Data flow

1. Sleeper production is imported on the scheduled workflow and rebuilt from qualified player-games.
2. Current-season games qualify at >=18% snaps OR >=8 league fantasy points.
3. A current NFL week enters valuation only after the full-week valuation gate says every non-ignored game slot for that week is final.
4. The browser hydrates the verified scoring snapshot, replaces the authoritative current-season scoring sample, and clears valuation caches.
5. Consensus refreshes use the seven-source refresh pipeline. A new composite is promoted only when the complete source batch validates; otherwise the last-known-good validated composite remains active.
6. After either scoring data or consensus data changes, the master ranking caches and V319 canonical map are explicitly rebuilt from the new calculated values.

## Accepted IDP valuation architecture

- V25 remains a 40% consensus / 40% league scoring / 20% league-context model.
- IDP scoring uses qualified historical and current-season production with the existing season-weight plan.
- LB production includes a restrained 20% same-role benchmark blend to prevent the all-IDP population from overstating ordinary linebacker production.
- Established EDGE players with at least two historical seasons and top-decile calculated scoring receive a 0.60 minimum production-confidence floor. Missing seasons still contribute zero scoring weight; this only prevents strong established EDGE evidence from being over-shrunk.
- V72 uses the continuous M6 market floor: 0.60 to 0.76 by upstream baseline, plus 75% of eligible shield contribution.
- DB/S receive a small -0.015 generic floor calibration.
- Mature EDGE players (age 29+) receive a mild, continuous taper below the elite baseline range.
- EDGE/LB upside support remains role/production/evidence based. There are no player-specific boosts.
- Downstream offense/IDP ranking uses full terminal precision when available before V319 canonical normalization.

## Rank-movement invariant

Overall rank and positional rank are outputs of the calculated market, not standalone valuation multipliers. A player must not receive a large value increase merely because a nearby player moved or because the player changed from, for example, IDP 33 to IDP 32.

Consensus source ranks are allowed to affect value only through the smooth consensus rank-to-value curve. Downstream IDP scoring, context, V72 compression, and canonical normalization must operate on calculated numeric values rather than positional-rank step bonuses.

Small rank crossings therefore remain possible and natural, but the value movement accompanying them must come from new scoring, consensus value, age/role context, or another explicit continuous model input.

## Regression protection

`tests/idp-valuation-refresh-contract.test.mjs` protects the baseline by checking:

- one-slot IDP consensus moves stay locally smooth;
- active V25/V72 logic does not reintroduce overall/positional rank as a direct value input;
- the accepted LB blend, EDGE confidence floor, M6 floor, 75% shield contribution, and mature EDGE taper remain present;
- scoring and consensus refreshes explicitly rebuild derived V319 values;
- the completed-week/final-game scoring gates remain mandatory;
- a one-rank promotion with a modest modeled-value increase cannot create a giant canonical-value jump.

Intentional future model changes can update the contract in the same reviewed change. Routine weekly data refreshes should not require code changes.
