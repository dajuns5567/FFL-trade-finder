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
  ]
];
const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
const selectors=[...new Set(rules.map(r=>r[0]))].join(',');
const marker='data-ffl-copy-hidden';
function clean(el){
 if(el.children.length)return;
 const original=normalize(el.textContent);
 const rule=rules.find(r=>original===r[1]&&el.matches(r[0]));
 if(rule){
  if(rule[2]){el.removeAttribute(marker);if(el.textContent!==rule[2])el.textContent=rule[2]}
  else el.setAttribute(marker,'1');
 }else if(el.hasAttribute(marker))el.removeAttribute(marker);
}
function scan(node){
 if(node.nodeType!==1)return;
 if(node.matches(selectors))clean(node);
 for(const el of node.querySelectorAll(selectors))clean(el);
}
function init(){
 const roots=['valueHistory','tradeHistory','leagueHub'];
 for(const id of roots){
  const root=document.getElementById(id);if(!root)continue;
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
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
