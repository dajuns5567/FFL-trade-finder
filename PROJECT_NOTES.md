# FFL Trade Market — Project Notes

This file is for development planning only. It is intentionally separate from production code, valuation logic, draft-pick valuation, calculations, data sourcing, and UI behavior.

## Current protected production checkpoint

V89 production state: `591a9bee1d9e12ea33070413c96a3efad13218a8`

The protected rollback branch should remain an exact code checkpoint and should not be modified merely to update these notes.

## Incomplete tasks

1. Correct remaining IDP valuation archetypes, including the type of profile represented by Nick Bosa, without player-specific calculation conditions.
2. Refine Trade Finder logic.
3. Improve information-sourcing/startup efficiency to reduce initial load time without sacrificing data accuracy, refresh behavior, Sleeper data, consensus ingestion, valuation methodology, or calculations.
4. Develop visual aid for Trade Evaluator.
5. Comprehensive rationale for Trade Finder and Trade Evaluator.
6. Value adjustment within Trade Finder and Trade Evaluator results.
7. Team Direction / Roster Profile — classify franchises as contender, competitive, retooling, rebuilding, etc., using roster value, age, positional strength, and draft capital. This informs trade-partner selection and does not alter player valuation.
8. Trade Finder “Why This Team?” — explain why each suggested trade partner makes sense based on roster construction, positional depth, and draft capital.
9. Trade Market / Asset Availability — mark assets as Untouchable, Available, or Actively Shopping, used as preference signals rather than valuation adjustments.
10. Roster Value Dashboard — show each franchise's total player value, offensive value, IDP value, draft capital, average roster age, and top-end assets.
11. Position Strength Dashboard — rank every franchise's QB/RB/WR/TE/IDP strength using existing rankings.
12. Package Builder / Make It Fair — suggest the smallest realistic asset addition/removal needed to bring an uneven trade toward an acceptable range.
13. Trade Finder Constraints — support options such as desired position, wanting picks, protecting particular assets, specifying package structure, or excluding IDPs.
14. League Asset Search — search any player and immediately show value, rank, positional rank, owner, NFL team, comparable assets, and realistic potential buyers.
15. Value History — periodically snapshot player values so changes can be viewed over time, while never allowing historical values to determine current value.
16. Draft Capital Dashboard — display picks owned by year, projected slots, individual pick values, total draft capital, and league-wide draft-capital rank.
17. Shareable Trade Card — create a clean visual summary of a trade containing both teams, assets, values, fairness assessment, and rationale.

## Ideas proposed by ChatGPT

The previously proposed ideas above have now been approved as incomplete implementation tasks, with the exception of Trade Block, which was declined because its functionality is redundant with Trade Finder. No proposal or task entry by itself authorizes a production change or deployment.

## Completed / remove from incomplete list

- Rookie filtering on Player Values, including offense, defense, and position combinations.
- Draft-pick valuation framework, original/current ownership handling, and pick display.
- Player Value display information in Trade Finder / Trade Evaluator selection surfaces through V89.

## Future beta-testing context

The finished product is expected to be sent to beta test users. Feedback from beta testing may later justify refinement of valuation methodology. This is context only and does not authorize or imply any present valuation, calculation, draft-pick, Trade Finder, data-source, UI, or architecture change.

## Change-control rule

Do not deploy or modify production code solely because an item appears in this notes file. Future implementation requires explicit user instruction/authorization. Draft-pick valuation remains a separate asset-valuation system from player valuation.
