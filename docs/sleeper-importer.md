# Sleeper League History Importer

This importer is read-only with respect to the live FFL Trade Finder application.

- Current Sleeper league ID: `1316867686394769408`
- Follows `previous_league_id` to collect linked seasons.
- Saves league settings, users, roster snapshots, traded picks, weekly transactions, and raw weekly regular-season stats.
- Does **not** replace, merge, or write to the live roster state used by the site.
- Does **not** change `buildTeams`, roster loading, ownership, or the working Sleeper update path.
- Production lookback configuration recorded in the manifest: `60% / 30% / 10%`.
- A season qualifies for the three-year production anchor only at 8+ games.
- Raw stat payloads are retained so stacked IDP scoring can be reconstructed from the actual Sleeper categories and the league's `scoring_settings` rather than guessed.
- `pts_ppr` / PPR values are retained when Sleeper provides them and should be used as the applicable PPR reference.

The GitHub Action publishes snapshots to the separate `sleeper-data` branch with `[skip ci]`. It never commits generated data to `main`.
