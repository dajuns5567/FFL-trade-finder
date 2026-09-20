# Inquirer V22

Draft PR 385 only. Do not merge or deploy production without permission.

- Weekly Recap replaces League Notebook; the collapsed headline opens the recap.
- Article/team selection scrolls to the article picker; reporter archive expansion preserves the reader's position.
- MIDA odds use the existing GitHub CSV with its source timestamp and exact normalized team-name mapping. Playoff/title percentages are supplied. Division-title probability is absent in this feed and must remain n/a, never inferred from rank or playoff probability.
- Outlook ties projected matchup margin to MIDA playoff position and recorded recent team results.
- Group production names the players. Hot Seat/Cool Throne compare the matchup against prior recorded scoring games when available. Week 1 has no earlier current-season sample; do not manufacture a trend.
- Unsupported sections contain only n/a. Paragraph/word minimums must not force filler back in.
- Transactions use team-specific incoming/outgoing assets, completed transactions, aggregate production and available canonical current snapshot values. Values are not historical transaction-date valuations; missing assets prevent a fabricated total. The Week 1 generator pins the verified 2026-09-19 snapshot, while new runtime editions read canonical Value History market data.
- Core valuation, scoring, trade evaluation and history persistence remain unchanged.

Checks: reporter smoke, V22 prose audit (including named groups, n/a, MIDA and transaction-value fixtures), overview upset audit, site runtime syntax audit.
