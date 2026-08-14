# Sleeper importer safety checklist

Before any importer release is merged to `main`, verify:

1. No changes to `index.html` roster loading.
2. No changes to `buildTeams`, `state.rosters`, or ownership assignment.
3. No changes to Trade Finder roster selectors or Trade Evaluator roster selectors.
4. Import workflow writes generated snapshots only to the separate `sleeper-data` branch.
5. Importer uses Sleeper endpoints in read-only mode.
6. Existing live roster update continues to read directly from Sleeper as before.
7. Import failure cannot replace or clear the live application's cached rosters.
