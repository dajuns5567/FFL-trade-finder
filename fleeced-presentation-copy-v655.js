/* Presentation-only copy polish. Exact allowlist; no data, model or control changes. */
(()=>{
'use strict';
const rules=[
  [
    "#valueHistory .vh-sub",
    "Full Market History Table — sort the complete current market by value or historical movement. Select any player to open their Player Value History.",
    ""
  ],
  [
    "#valueHistory .vh-sub",
    "Search for a player to open that player's full Value History.",
    ""
  ],
  [
    "#valueHistory .vh-sub",
    "Choose a fantasy team to browse its current roster using the exact same Market Value History table as Track My Team.",
    ""
  ],
  [
    "#valueHistory .vh-sub",
    "Select one of the 32 league teams. This table is the Full Market Value History dataset filtered to that team's current players.",
    ""
  ],
  [
    "#valueHistory #vhStatus",
    "Track a league roster using the same data as Full Market Value History.",
    ""
  ],
  [
    "#valueHistory .vh-sub",
    "Largest increases in finished player value",
    ""
  ],
  [
    "#valueHistory .vh-sub",
    "Largest decreases in finished player value",
    ""
  ],
  [
    "#valueHistory .vh-sub",
    "Largest improvements in overall rank",
    ""
  ],
  [
    "#valueHistory .vh-sub",
    "Largest declines in overall rank",
    ""
  ],
  [
    "#valueHistory .vh-sub",
    "The chart shows recorded historical values only. Today's Player Values price is shown above and is not saved as history.",
    "Recorded values only; today's value is shown above."
  ],
  [
    "#valueHistory p.tiny.muted",
    "Chart line is display-smoothed only for isolated one-snapshot spikes; hover or tap for every exact original value, timestamp and rank. Model changes are labelled in archived observations and excluded from market-movement calculations. Use arrow keys when focused.",
    "Hover, tap or use arrow keys for exact recorded values. Model changes are excluded from market movement."
  ],
  [
    "#valueHistory .vh-sub",
    "Current totals plus current-roster value movement from stored Value History snapshots. Rank change appears only when every current roster asset has baseline coverage.",
    "Current-roster value changes; rank changes require complete history."
  ],
  [
    "#valueHistory .vh-sub",
    "Current-roster value movement plus completed trade events linked to recorded team net-value points. Descriptive only; these observations never change player values or trade calculations.",
    "Roster value movement and completed trades."
  ],
  [
    "#valueHistory .vh-sub",
    "The snapshot change is observed team net-value movement, not an assumption that the trade alone caused the move. Team-snapshot movement and player trade outcome are separate. Player trade outcome compares the value of received minus sent players at the trade and today, including any valuation-model changes. Draft picks are shown in Trade History.",
    "Team value movement is not caused solely by trades. Player outcomes compare net player value then and now, including model changes. Picks are in Trade History."
  ],
  [
    "#valueHistory .vh-market-section-title p",
    "Top-24 current position cohorts: equal-weight verified percentage movements within each valuation era, combined across the selected window. Model-change repricing is excluded.",
    "Top 24 at each position; model changes excluded."
  ],
  [
    "#valueHistory .vh-market-section-title p",
    "Select a cell to inspect every player and value movement behind the aggregate.",
    "Select a cell for player movements."
  ],
  [
    "#valueHistory .vh-market-section-title p",
    "12 quick-read leaders across current value, position, movement, breakouts, rebounds, and pullbacks.",
    ""
  ],
  [
    "#valueHistory .vh-market-section-title p",
    "New tracked-history value records reached during the selected window, not just at the latest refresh.",
    "New records during the selected period."
  ],
  [
    "#valueHistory .vh-market-section-title p",
    "Underlying completed-week signals shown separately from market value movement.",
    "Weekly performance signals and value movement."
  ],
  [
    "#valueHistory .vh-market-section-title p",
    "Where underlying Fleeced signals and current positional market pricing disagree.",
    "Performance signals versus current market prices."
  ],
  [
    "#valueHistory .vh-market-section-title p",
    "Signal-state flips and short-term price movement against the selected broader trend.",
    "Signal changes and moves against the longer trend."
  ],
  [
    "#valueHistory .vh-market-section-title p",
    "Players with the widest verified value ranges inside the selected window.",
    ""
  ],
  [
    "#valueHistory .vh-intel-period-copy small",
    "Choose the value-history window used across indexes, heat, records, opportunities, reversals, and volatility.",
    ""
  ],
  [
    "#valueHistory .vh-intel-period-note",
    "Value movement uses verified observations inside the selected window. Fleeced player signals remain based on completed NFL weeks only.",
    "Value changes use the selected period; signals use completed NFL weeks."
  ],
  [
    "#tradeHistory .vh-sub",
    "How the trade's current outcome pieces compare today.",
    ""
  ],
  [
    "#tradeHistory .vh-sub",
    "Looking back on trades with today's current value.",
    "Today's values."
  ],
  [
    "#tradeHistory .vh-sub",
    "Current evaluator calculation, read-only.",
    ""
  ],
  [
    "#tradeHistory .vh-sub",
    "The original trade package using the historical values available from when the trade occurred. N/A means this trade occurred before reliable Trade History player values were established, so no historical player value is guessed.",
    "Values at the time of the trade. N/A means reliable historical values are unavailable."
  ],
  [
    "#tradeHistory .vh-sub",
    "The original trade package evaluated with the Trade History valuation context that applied when the trade occurred. Current/future Trade Evaluator and draft-pick logic are not modified.",
    "Values and projections at the time of the trade."
  ],
  [
    "#leagueHub .lh-sub",
    "Weekly results, Players of the Week, Inquirer and Trade Wire follow the selected week. Career and live league records remain current.",
    "Weekly sections follow the selected week; career records stay current."
  ],
  [
    "#leagueHub .lh-sub",
    "Verified canonical historical peaks only. Legacy single-snapshot baselines are retained separately and are never promoted to all-time records without independent evidence.",
    "Verified historical records only."
  ],
  [
    "#leagueHub .lh-sub",
    "Current loaded-roster net value ranking. Use View chart to open the same league comparison pop-out.",
    "Current roster value rankings."
  ],
  [
    "#leagueHub .lh-sub",
    "Browse the four reporter desks and their archived team coverage.",
    ""
  ],
  [
    "#leagueHub .lh-sub",
    "Jump straight to a season, week and team. It opens on the current completed week.",
    ""
  ],
  [
    "#leagueHub .lh-sub",
    "The next report can stay held without hiding the edition that is already published.",
    ""
  ],
  [
    "#leagueHub .lh-sub",
    "Comprehensive career rankings by Sleeper manager ID.",
    ""
  ],
  [
    "#leagueHub .lh-sub",
    "Hot Seat, Cool Throne, Highest Scorer and Lowest Scorer are tracked separately for every completed week.",
    "Weekly awards by completed week."
  ],
  [
    "#leagueHub .lh-sub",
    "All-time scoring record badges are reconstructed from completed team scores since 2024 and remain on the manager profile after the record is surpassed. Six-month award snapshots remain unchanged.",
    "Scoring record badges since 2024 remain after the record is surpassed."
  ],
  [
    "#leagueHub .lh-sub",
    "20 live awards are recalculated from current league data, plus four locked weekly manager awards: Hot Seat, Cool Throne, Highest Scorer and Lowest Scorer. Historic live-award snapshots begin Sep 14, 2026; weekly awards are tracked independently by season and week.",
    "20 live awards and four weekly manager awards. Live award history starts Sep 14, 2026."
  ],
  [
    "#leagueHub .lh-sub",
    "Awaiting finalized Sleeper fantasy matchups. The newspaper does not control these results.",
    "Awaiting finalized fantasy matchups."
  ],
  [
    "#valueHistory th[data-vh-sort=\"posRankDelta7\"]",
    "Pos Δ 1W",
    "Pos Δ 7D"
  ],
  [
    "#settings .notice",
    "V13 data-loading change: Sleeper core data is rendered before market-source refresh. A failed consensus/news source can no longer prevent the team selector from populating.",
    ""
  ],
  [
    "#tradeHistory .vh-trade-note",
    "Historical player value is unavailable for part of this package because the trade predates reliable stored Value History or a player is missing from that snapshot. No value was guessed.",
    "Some player values were not recorded at the time of this trade."
  ],
  [
    "#tradeHistory .vh-trade-note",
    "N/A indicates that the historical player value is unavailable. These trades occurred before Trade History was established, so no historical player value is guessed or replaced with today's value.",
    "N/A: historical player value unavailable."
  ],
  [
    "#valueHistory .vh-sub",
    "Negative Fleeced states and cold recent-form signals. A player can cool statistically while value still rises—the two measures are intentionally shown separately.",
    "Cooling performance may coincide with rising value."
  ],
  [
    "#valueHistory .vh-sub",
    "Completed-week Fleeced directional state changes shown with the most specific verified reporter tags and supporting evidence available.",
    "Changes in completed-week player signals."
  ],
  [
    "#valueHistory .vh-sub",
    "Lower-priced positional assets where positive Fleeced evidence is stronger than the current market tier. Research screen, not a fair-value claim.",
    "Lower-priced players with improving signals."
  ],
  [
    "#valueHistory .vh-sub",
    "Higher-priced positional assets where recent Fleeced momentum is weakening. Temporary cold form alone does not establish overvaluation.",
    "Higher-priced players with weakening signals."
  ],
  [
    "#valueHistory .vh-opportunity-note",
    "Requires positive completed-week signal/hot momentum, improving recent PPG, strong/established confidence, and outside the top 35% of positional market value. No player valuation is changed.",
    "Strong or established positive weekly signal, rising PPG, outside the top 35% at the position."
  ],
  [
    "#valueHistory .vh-opportunity-note",
    "Requires negative completed-week signal/cold momentum, falling recent PPG, strong/established confidence, and inside the top 40% of positional market value. No player valuation is changed.",
    "Strong or established negative weekly signal, falling PPG, inside the top 40% at the position."
  ],
  [
    "#valueHistory .vh-sub",
    "Completed-trade context is available in the dedicated Trade History tab.",
    ""
  ],
  [
    "#valueHistory .vh-sub",
    "5 players immediately above and below by current value",
    "Five players on either side by value."
  ],
  [
    "#valueHistory .vh-sub",
    "5 players immediately above and below in positional rank",
    "Five players on either side by positional rank."
  ],
  [
    "#valueHistory .tiny.muted",
    "Scoring milestones use Sleeper weekly regular-season stats and this league’s scoring settings. Informational only.",
    "Regular-season milestones use league scoring."
  ],
  [
    "#leagueHub .lh-sub",
    "Sleeper league data, canonical Trade History, canonical Value History, verified NFL schedule and Sleeper player/injury metadata. Draft-position discussion is standings-based unless the league provides a verified draft-order rule.",
    "Sources: Sleeper, Trade History, Value History and NFL schedules. Draft projections use standings unless a verified order is available."
  ],
  [
    "#leagueHub .lh-sub",
    "Archived badges are locked to their completed week; provisional finalized-score Hot Seat results are labeled until the weekly award archive catches up.",
    "Weekly badges are archived; provisional Hot Seat results are labeled."
  ],
  [
    "#leagueHub .lh-sub",
    "Sleeper managers found in prior league seasons who are no longer active. Historical ownership is matched by Sleeper user ID across seasons, and playoff scoring only counts winners-bracket participants.",
    "Former league managers. Playoff scoring counts winners-bracket games only."
  ]
];
const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
const patterns=[["#league #leagueInfo p.tiny.muted","^Sleeper league ID (\\d+)\\. Future pick ownership is derived from Sleeper's roster IDs and league draft rounds, with explicit traded-pick ownership overrides from Sleeper's traded_picks endpoint\\.$","Sleeper league ID $1 · Pick ownership from Sleeper."],["#valueHistory .vh-sub","^(\\d+) current players • (?:exact same columns and Market Value History data used in Track My Team|same columns and data as Full Market History)$","$1 current players"],["#valueHistory #vhTrackedTeam .vh-mover-card .vh-sub","^Largest (?:value gains|value declines|overall-rank improvements|overall-rank declines|improvements within each player's position|declines within each player's position) on .+$",""],["#valueHistory .vh-net-note","^Simple addition of the selected team's (\\d+) current player values\\. No scarcity, fit, package, Trade Finder, Trade Evaluator, or other adjustments are applied\\.$","Sum of $1 player values, excluding picks and trade adjustments."],["#valueHistory .vh-sub","^Current neighbors around (.+); informational only\\.$",""],["#valueHistory .vh-sub","^Players reaching verified new tracked-history value (highs|lows) at any time during (.+); earlier records may predate the window\\.$","New value $1 during $2."],["#valueHistory .vh-sub","^Largest verified high-to-low value ranges for (.+) inside (.+)\\. Segment is based on current overall Fleeced rank\\.$","Value ranges for $1 during $2."],["#leagueHub .lh-sub","^(\\d{4} Week \\d+) • Finalized Sleeper fantasy matchups • Independent of Inquirer publication$","$1 • Finalized matchups"],["#leagueHub .lh-sub","^(.+) • every trade below opens that exact deal in Trade History$","$1"]] .map(([selector,pattern,replacement])=>[selector,new RegExp(pattern),replacement]);
const selectors=[...new Set([...rules,...patterns].map(r=>r[0]))].join(',');
const marker='data-ffl-copy-hidden';
function clean(el){
 if(el.children.length){el.removeAttribute(marker);return;}
 const original=normalize(el.textContent);
 const exact=rules.find(r=>original===r[1]&&el.matches(r[0]));
 const dynamic=exact?null:patterns.find(r=>el.matches(r[0])&&r[1].test(original));
 if(exact||dynamic){
  const replacement=exact?exact[2]:original.replace(dynamic[1],dynamic[2]);
  if(replacement){el.removeAttribute(marker);if(el.textContent!==replacement)el.textContent=replacement}
  else el.setAttribute(marker,'1');
 }else if(el.hasAttribute(marker))el.removeAttribute(marker);
}
function scan(node){
 if(node.nodeType!==1)return;
 if(node.matches(selectors))clean(node);
 for(const el of node.querySelectorAll(selectors))clean(el);
}
const observed=new WeakSet();
function attach(root){
 if(!root||observed.has(root))return;
 observed.add(root);
 scan(root);
 new MutationObserver(records=>{
  const pending=new Set();
  for(const rec of records){
   const target=rec.target.nodeType===1?rec.target:rec.target.parentElement;
   if(target?.matches(selectors))pending.add(target);
   for(const node of rec.addedNodes)if(node.nodeType===1)pending.add(node);
  }
  for(const el of pending)if(el.isConnected)scan(el);
 }).observe(root,{childList:true,subtree:true,characterData:true});
}
function init(){
 const roots=['valueHistory','tradeHistory','leagueHub','league','settings'];
 const attachAll=()=>roots.forEach(id=>attach(document.getElementById(id)));
 // The deferred original history modules can create their tab roots after
 // our DOMContentLoaded callback. Only watch direct main children for roots;
 // do not attach a page-wide subtree observer or scan Finder results.
 const main=document.querySelector('main');
 if(main)new MutationObserver(attachAll).observe(main,{childList:true});
 attachAll();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
