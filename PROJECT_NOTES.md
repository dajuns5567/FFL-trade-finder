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

## Completed / remove from incomplete list

- Rookie filtering on Player Values, including offense, defense, and position combinations.
- Draft-pick valuation framework, original/current ownership handling, and pick display.
- Player Value display information in Trade Finder / Trade Evaluator selection surfaces through V89.

## Future beta-testing context

The finished product is expected to be sent to beta test users. Feedback from beta testing may later justify refinement of valuation methodology. This is context only and does not authorize or imply any present valuation, calculation, draft-pick, Trade Finder, data-source, UI, or architecture change.

## Change-control rule

Do not deploy or modify production code solely because an item appears in this notes file. Future implementation requires explicit user instruction/authorization. Draft-pick valuation remains a separate asset-valuation system from player valuation.
