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

## Ideas proposed by ChatGPT

These are proposals only. They are not approved implementation tasks and do not authorize any code, valuation, UI, architecture, or deployment changes.

1. Team Direction / Roster Profile — characterize franchises as contender, competitive, retooling, rebuilding, etc., using roster value, age, positional strength, and draft capital strictly for partner-selection context, never player valuation.
2. Trade Finder “Why This Team?” — explain why a suggested partner is a logical fit based on roster construction, positional depth, and draft capital.
3. Trade Market / Asset Availability — allow assets to be marked Untouchable, Available, or Actively Shopping as preference signals only.
4. Roster Value Dashboard — show total player value, offensive value, IDP value, draft capital, average roster age, and top-end assets by franchise.
5. Position Strength Dashboard — rank each franchise’s QB/RB/WR/TE/IDP strength using existing rankings.
6. Trade Block — allow users to mark players/picks they are willing to move and have Trade Finder search around those assets.
7. Package Builder / Make It Fair — suggest the smallest realistic asset addition/removal that brings an uneven trade toward an acceptable range.
8. Trade Finder Constraints — support preferences such as desired position, desired draft picks, protected assets, package shape, or excluding IDPs.
9. League Asset Search — search any player and immediately view value, rank, position rank, owner, NFL team, comparable assets, and realistic potential buyers.
10. Value History — periodically snapshot values for historical viewing without allowing historical values to influence current valuation.
11. Draft Capital Dashboard — show picks owned by year, projected slots, individual values, total draft capital, and league rank.
12. Shareable Trade Card — generate a clean visual trade summary containing teams, assets, values, fairness assessment, and rationale.

## Completed / remove from incomplete list

- Rookie filtering on Player Values, including offense, defense, and position combinations.
- Draft-pick valuation framework, original/current ownership handling, and pick display.
- Player Value display information in Trade Finder / Trade Evaluator selection surfaces through V89.

## Future beta-testing context

The finished product is expected to be sent to beta test users. Feedback from beta testing may later justify refinement of valuation methodology. This is context only and does not authorize or imply any present valuation, calculation, draft-pick, Trade Finder, data-source, UI, or architecture change.

## Change-control rule

Do not deploy or modify production code solely because an item appears in this notes file. Future implementation requires explicit user instruction/authorization. Draft-pick valuation remains a separate asset-valuation system from player valuation.
