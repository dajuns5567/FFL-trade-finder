# V133 proposal — do not deploy yet

Scope limited to two corrections before touching Finder/Evaluator behavior:

1. Restore the pre-V132 load order for Sleeper player metadata and scoring history. Remove the V132 deferred-boot interception and remove the extra V132 metadata refresh layer. Let the existing site-v17 loadCore/updateData/cache path own players, stats, and cached fallback again.
2. Keep the existing draft-pick calculation untouched. Read the already-calculated source pick value and rescale it for display only so the strongest nearest-year first is approximately 7,000. Relative differences by projected slot, round, year, projection document, and ownership remain unchanged.

After these two are confirmed in-browser, address the remaining issues in small regression-checked batches rather than layering more runtime overrides.
