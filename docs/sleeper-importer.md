# Sleeper League History Importer

This importer is read-only with respect to the live FFL Trade Finder roster model.

- Current Sleeper league ID: `1316867686394769408`.
- Follows `previous_league_id` to collect the current league plus up to three linked prior seasons.
- Saves league settings, users, roster snapshots, traded picks, weekly transactions, and raw weekly regular-season stats.
- Does **not** replace, merge, or write to the live roster state used by the site.
- Does **not** change `buildTeams`, roster loading, ownership, or the working Sleeper roster update path.
- The live refresh endpoint `/.netlify/functions/sleeper-history-live` is valuation/history-only and intentionally does not fetch or mutate rosters.
- Historical completed-season samples qualify at 8+ games.
- During the NFL regular season, current-year results are allowed to contribute beginning after Week 1 so the model can react in-season. The current-year share starts at 10% after Week 1 and rises linearly to 60% by Week 18.
- Week 1 is exactly: current year 10%, previous year 55%, two years ago 25%, three years ago 10%.
- As current-year weight rises, the three historical shares decline proportionally while preserving the Week-1 historical ratio of 55:25:10.
- After the regular season concludes, the model returns to the offseason structure: previous year 60%, two years ago 30%, three years ago 10%, with the oldest season falling out.
- Missing historical seasons do not become negative production. Any valuation consumer must renormalize only across available qualifying historical seasons and must not inflate a one-year sample as if it were a full history.
- Raw stat payloads are retained so stacked IDP scoring can be reconstructed from the actual Sleeper categories and the league's `scoring_settings` rather than guessed.
- `pts_ppr` / PPR values are retained when Sleeper provides them and should be used as the applicable PPR reference.

The GitHub Action publishes archival snapshots to the separate `sleeper-data` branch with `[skip ci]`; it never commits generated data to `main`.

The site's **Update** button should eventually call the live history endpoint in parallel with the existing roster refresh. The history response should only populate a separate valuation/history state object. The existing roster refresh remains the canonical source for current roster ownership.
