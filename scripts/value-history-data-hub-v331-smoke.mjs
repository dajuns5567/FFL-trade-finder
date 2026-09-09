import fs from 'node:fs';
import vm from 'node:vm';
import { extractKtcSuperflexRankings } from '../netlify/functions/ktc-adapter.mjs';

const backendSource=fs.readFileSync('netlify/functions/value-history.mjs','utf8');
const pureSource=backendSource.replace(/^import .*$/m,'').replace(/export \{[^}]+\};/,'').split('export default async')[0];
const context={console,Response,URL,setTimeout,clearTimeout};context.globalThis=context;vm.createContext(context);
vm.runInContext(pureSource+`;globalThis.__vh={marketFromSnapshots,monthKey,baselineFor,leagueScore,weeklyPlayerRow,normalizeCompletedTrade};`,context,{filename:'value-history-pure.mjs'});
const {marketFromSnapshots,monthKey,baselineFor,leagueScore,weeklyPlayerRow,normalizeCompletedTrade}=context.__vh;

function assert(x,m){if(!x)throw new Error(m)}
const day=86400000;
const t0=Date.parse('2026-09-01T12:00:00Z');
const P=(id,value,overall,pos='RB',posRank=1)=>({id,value,overall,pos,posRank});
const snap=(days,rows)=>({t:new Date(t0+days*day).toISOString(),rows});
const snaps=[
  snap(0,[P('a',4000,100,'RB',20),P('b',7000,40,'WR',10),P('c',5000,80,'QB',15)]),
  snap(7,[P('a',4300,92,'RB',17),P('b',6800,44,'WR',11),P('c',5200,74,'QB',13)]),
  snap(30,[P('a',4700,82,'RB',14),P('b',6500,50,'WR',13),P('c',5500,65,'QB',10),P('rook',3600,130,'WR',35)]),
  snap(365,[P('a',6100,55,'RB',8),P('b',5900,70,'WR',18),P('c',6400,48,'QB',7),P('rook',5200,88,'WR',22)])
];

assert(monthKey('2026-09-07T21:07:00Z')==='2026-09','month partition key incorrect');
assert(baselineFor(snaps,Date.parse(snaps[3].t),365)===snaps[0],'365-day baseline selection incorrect');

const m=marketFromSnapshots(snaps);
assert(m.has7&&m.has30&&m.has365,'period availability flags incorrect');
assert(m.periods['1D'],'1D market period missing');
assert(m.tracking_since===snaps[0].t,'tracking start incorrect');
assert(m.latest===snaps[3].t,'latest snapshot incorrect');
assert(m.periods['1Y'].valueRisers[0].id==='a'&&m.periods['1Y'].valueRisers[0].delta===2100,'1Y value riser calculation incorrect');
assert(m.periods['1Y'].valueFallers[0].id==='b'&&m.periods['1Y'].valueFallers[0].delta===-1100,'1Y value faller calculation incorrect');
assert(m.periods['30D'].rankRisers.some(x=>x.id==='a'&&x.overallDelta>0),'30D rank risers missing');
assert(m.periods['30D'].rankFallers.some(x=>x.id==='b'&&x.overallDelta<0),'30D rank fallers missing');
assert(Array.isArray(m.periods['1D'].valueRisers)&&Array.isArray(m.periods['1D'].valueFallers),'1D mover lists missing');
assert(Array.isArray(m.periods['30D'].posRankRisers)&&Array.isArray(m.periods['30D'].posRankFallers),'positional-rank mover lists missing');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'posRankDelta7'),'market rows missing 7D positional-rank delta');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'posRankDelta30'),'market rows missing 30D positional-rank delta');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'posRankDelta365'),'market rows missing 1Y positional-rank delta');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'deltaAll'),'market rows missing all-time value delta');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'posRankDeltaAll'),'market rows missing all-time positional-rank delta');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'overallDelta7'),'market rows missing 7D overall-rank delta');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'delta1'),'market rows missing 1D value delta');
assert(Object.prototype.hasOwnProperty.call(m.marketRows[0],'posRankDelta1'),'market rows missing 1D positional-rank delta');
assert(leagueScore({sack:1,tkl_loss:1,qb_hit:1},{sack:4.5,tkl_loss:2.5,qb_hit:2.5})===9.5,'league scoring must preserve stacked IDP categories');
assert(weeklyPlayerRow({'p1':{stats:{sack:1}}},'p1').sack===1,'weekly player row extraction failed');
const exactDraftResults=new Map([['2028|1|2',{player_id:'rookie1',draft_slot:7,pick_no:7,draft_id:'d1',source:'Sleeper draft result + slot_to_roster_id'}]]);
const tradeSample=normalizeCompletedTrade({type:'trade',status:'complete',transaction_id:'t1',status_updated:Date.parse('2026-09-08T12:00:00Z'),roster_ids:[1,2],adds:{p1:1,p2:2},draft_picks:[{season:'2028',round:1,roster_id:2,owner_id:1}]},1,2026,{'1':'Alpha','2':'Beta'},exactDraftResults);
assert(tradeSample?.sides?.length===2,'completed trade normalization failed');
assert(tradeSample.sides.find(x=>x.roster_id==='1')?.player_ids?.[0]==='p1','trade player receiver mapping failed');
assert(tradeSample.sides.find(x=>x.roster_id==='1')?.picks?.[0]?.season==='2028','trade pick receiver mapping failed');
assert(tradeSample.sides.find(x=>x.roster_id==='1')?.picks?.[0]?.drafted_player_id==='rookie1','exact Sleeper draft-result mapping failed');
assert(tradeSample.team_names?.['1']==='Alpha','historical Sleeper team name mapping failed');
const ktcPlayers=Array.from({length:320},(_,i)=>({playerName:`Player ${i+1}`,position:['QB','RB','WR','TE'][i%4],superflexValues:{value:10000-i,rank:i+1}}));
const ktcParsed=extractKtcSuperflexRankings(`<script type="application/json" id="ktc-players">${JSON.stringify(ktcPlayers)}</script><script>var playersArray = JSON.parse(document.getElementById('ktc-players').textContent);</script>`);
assert(ktcParsed.rows.length===320,'KTC embedded JSON parser must recover the complete player universe');
assert(ktcParsed.rows[0].rank===1&&ktcParsed.rows.at(-1).rank===320,'KTC embedded JSON ranks are not preserved');
assert(!m.marketRows.find(x=>x.id==='rook')?.delta365,'new player should not receive fabricated pre-entry 365-day history');

const ui=fs.readFileSync('value-history-v276.js','utf8');
for(const needle of [
  "['1D','7D','30D','90D','1Y','ALL']",
  'Biggest Value Risers',
  'Biggest Value Fallers',
  'Biggest Rank Risers',
  'Biggest Rank Fallers',
  'data-vh-market-period',
  'Full Market History Table',
  'Overall Rank — Last 30 Days',
  'Recent Changes',
  'All-Time Milestones',
  'Lowest ${esc(meta.pos)} Rank',
  'Overall #${r.overall}',
  "state.players?.[String(r.id)]?.team",
  'posRankDelta7',
  'posRankDelta30',
  'View chart',
  'vh-point-hit',
  'vh-chart-tooltip',
  'stroke="#e4b53f"',
  'vh-rank-line',
  'stroke:#e4b53f',
  'Overall rank',
  'Date',
  'vh-profile-info',
  'Fantasy team',
  'Current rank',
  'dateTime(r.t)',
  'Track my team',
  "root.addEventListener('click',handleContentClick)",
  "root.addEventListener('change',handleContentChange)",
  'vh-subnav-active',
  'Overall #${r.overall}',
  'same columns and data as Full Market History',
  'marketTableRowsMarkup(rows)',
  'currentView===\'team\'',
  'Similar Value Players',
  'Closest in Overall Value',
  'Nearest ${esc(target.pos)} Ranks',
  'slice(Math.max(0,vi-5),vi)',
  'slice(vi+1,vi+6)',
  'slice(Math.max(0,pi-5),pi)',
  'slice(pi+1,pi+6)',
  'vh-rank-hit',
  'data-vh-rank-label',
  'marketCache=null;teamNetCache.clear();scheduleSnapshot(1000)',
  'Tracked since',
  "'1D','7D','30D','90D','1Y','ALL'",
  "period==='1D'",
  "if(period==='1D')return inRange",
  'View full list',
  'data-vh-view-all',
  'vh-modal-backdrop',
  'Top Value Risers',
  'Top Value Fallers',
  'Top Rank Risers',
  'Top Rank Fallers',
  "marketCache.periods?.[period]?.[category]",
  "filter(r=>owned.has(String(r.id)))",
  'Top Positional Rank Risers',
  'Top Positional Rank Fallers',
  'posRankRisers',
  'posRankFallers',
  'Value 1Y',
  'Value All',
  'Overall Δ 7D',
  'Pos Δ 1W',
  'Pos Δ All',
  'deltaAll',
  'posRankDeltaAll',
  'Since last refresh',
  'refreshValue',
  'refreshPos',
  'Player value',
  'Date / time',
  'vh-filter-label',
  'History range',
  'vh-overall-cell',
  'vh-rank-arrow',
  'title="Overall rank improved in the last 7 days"',
  'title="Overall rank fell in the last 7 days"',
  'View</button>',
  'vh-chart-col',
  'vh-refresh-metrics',
  'Value change',
  'rank change',
  '#valueHistory .vh-card-periods button:not(.secondary)',
  '#valueHistory .vh-search-wrap input:focus',
  'vh-control-row',
  'vh-mover-card',
  'vh-team-picker',
  '#valueHistory input[type="search"]:focus',
  '#valueHistory .vh-team-toolbar select:focus',
  'border-left:2px solid color-mix(in srgb,#e4b53f',
  'rgba(228,181,63,.30)',
  'vh-brand-title',
  'vh-similar-title',
  'vh-selected-divider',
  '-webkit-text-stroke:.7px #05070a',
  'background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important',
  '#valueHistory .vh-value-axis{fill:currentColor;font-size:13px;font-weight:700',
  'text-transform:uppercase;color:#e4b53f!important',
  'Closest in Overall Value',
  'Nearest ${esc(target.pos)} Ranks',
  '${esc(playerName(id))}',  'vh-brand-copy',
  '#valueHistory #vhContent{display:grid;gap:16px}',
  '#valueHistory .vh-periods button:not(.secondary)',
  'background:var(--card)',
  'Value Δ 1D',
  'Pos Δ 1D',
  'Player pool',
  'Top ${p}',
  'marketPools',
  'teamPools',
  'applyMoverPool',
  'Full Market History Table',
  'vh-state-open',
  'vh-state-close',
  'scoring_milestones',
  'Highest points in a week',
  'Highest points in a season',
  'Highest PPG in qualifying season',
  'Sleeper weekly regular-season stats',
  'vh-metric-time',
  'dateTime(highPoint.t)',
  'dateTime(lowPoint.t)',
  'dateTime(bestOverallPoint.t)',
  'playerScoringCache',
  'target.overall',
  'target.value',
  '#valueHistory>.card{border:0!important;background:color-mix(in srgb,var(--card) 72%,#06080c)',
  '#valueHistory .vh-market-table summary',
  'align-items:center;justify-content:center;text-align:center;min-height:82px',
  'Overall Net Value',
  'teamNetFetch',
  'teamNetChart',
  'Simple addition of the selected team',
  'View full list',
  'vh-milestone-time',
  'No qualifying 8+ game season yet',
  'text-align:center;color:#e4b53f',
  'top:4px',
  'Search player history',
  'hasValidatedKtcSnapshot',
  'currentTeamNetStandings',
  'League Net Value Comparison',
  'data-vh-team-net-all',
  'All-time high',
  'All-time low',
  'vh-net-hit',
  'market history unavailable (',
  'Value Range',
  '.vh-value-chart{position:relative;padding-top:98px}',
  'padding:10px 16px;min-width:0',
  "tradeBtn.textContent='Trade History'",
  'Completed Trade History',
  'Fleeced Trade Breakdown',
  'Trade Evaluator Analysis',
  'Raw asset total',
  'Value adjustment',
  'Trade-adjusted total',
  'vh-eval-scorebar',
  'background:#e4b53f!important',
  'data-vh-open-trade-history',
  'Recent Trade Impact',
  'What Moved My Team',
  'data-vh-team-attribution',
  'data-vh-team-net-sort',
  '30D Rank Δ',
  'data-vh-trade-team',
  'current-roster value movement'
])assert(ui.includes(needle),'missing Value History UI feature: '+needle);

for(const forbidden of [
  'modeledPlayerValuesV319.build(',
  'section1V130.install(',
  'tradeFinderV168.generate',
  'tradeEvaluatorAnyTeam',
  'Value Adjustment='
])assert(!ui.includes(forbidden),'Value History must remain read-only relative to trade/value systems: '+forbidden);
assert(ui.includes("const fair=window.section1V130?.fair"),'Trade History must consume the exact current shared evaluator fairness function');
assert(ui.includes("typeof window.tradeAssetValue93==='function'"),'Trade History must consume the existing evaluator asset-value function');
assert(ui.includes('tradeOriginalAssets(side)'), 'Trade Evaluator analysis must evaluate the original traded package rather than mutate it into current outcomes');
assert(!ui.includes('Current evaluator rationale'),'Trade History evaluator section must not render the written rationale block');
assert(!ui.includes('state.assetsA='),'Trade History must not overwrite Trade Evaluator Team A selections');
assert(!ui.includes('state.assetsB='),'Trade History must not overwrite Trade Evaluator Team B selections');
assert(!ui.includes('pickValue=function'),'Trade History must not replace draft-pick valuation logic');
assert(ui.includes("tradeBtn.dataset.tab='tradeHistory'"),'Trade History must be a separate top-level tab');


const backend=fs.readFileSync('netlify/functions/value-history.mjs','utf8');
assert(backend.includes("MONTH_INDEX_PREFIX='indexes/'"),'partitioned all-time index missing');
assert(!backend.includes('CANONICAL_HISTORY_ORIGIN'),'Value History must not depend on a cross-site Netlify proxy');
assert(backend.includes("url.searchParams.get('market')==='1'"),'market summary endpoint missing');
assert(backend.includes('LEGACY_INDEX_KEY'), 'legacy V330 history compatibility missing');
assert(backend.includes("url.searchParams.get('team_net')==='1'"),'Track My Team net-value history endpoint missing');
assert(backend.includes("url.searchParams.get('trades')==='1'"),'completed trade history endpoint missing');
assert(backend.includes('completedTradeHistory(s)'),'completed trade history must remain in Value History backend');
assert(backend.includes('TRADE_AUDIT_SEASONS'),'Sleeper imported multi-season trade audit source missing');
assert(backend.includes('exactDraftResultMap'),'exact Sleeper draft-result mapping missing');
assert(backend.includes('slot_to_roster_id'),'draft-result mapping must use Sleeper slot_to_roster_id rather than inference');
assert(backend.includes("TRADE_AUDIT_SEASONS=[2024,2025,2026]"),'2024–2026 linked trade audit coverage missing');
assert(backend.includes('closestSnapshotItem'),'trade history must use stored Value History snapshots rather than fabricated historical values');
assert(backend.includes('getTeamNetHistory(s,ids)'),'team net-value history must be simple snapshot summation');
assert(backend.includes('value+=n;found++'),'team net-value history must sum stored player values directly');
assert(backend.includes('scoringMilestones(playerId)'),'Sleeper scoring milestones endpoint integration missing');
assert(backend.includes("qualifyingSeasonMinimumGames:8"),'8-game qualifying season rule missing');
assert(backend.includes("league?.scoring_settings"),'league scoring settings are not used for milestones');
assert(backend.includes("V346_KTC_CUTOFF_MS=Date.parse('2026-09-08T05:23:00.000Z')"),'V346 KTC cutoff missing');
assert(backend.includes('scrubV346KtcContamination(s)'),'V346 history scrub missing');
assert(backend.includes('writeFilteredIndexes(s,keep)'),'V346 history reindex missing');

assert(ui.includes('scheduleSnapshot(0)'),'first snapshot is not attempted immediately on site load');
assert(ui.includes('scheduleSnapshot(1000)'),'post-update snapshot is not scheduled promptly');
const updateSource=fs.readFileSync('netlify/functions/update.mjs','utf8');
assert(updateSource.includes("failedSources=diagnostics.filter(result=>!result.ok)"),'consensus refresh is not checking all source failures');
assert(updateSource.includes("integrityReady=results.length>=7&&failedSources.length===0"),'consensus replacement is not gated on all required sources');
assert(updateSource.includes("sources:integrityReady?sources:{}"),'partial consensus refresh can replace the prior validated source set');
assert(backend.includes("V348_BAD_WINDOWS"),'V348 exact contaminated timestamp windows missing');
assert(backend.includes("scrubV348ConsensusContamination(s)"),'V348 contaminated timestamp scrub missing');
const fanRankedSource=fs.readFileSync('netlify/functions/fanranked-adapter.mjs','utf8');
assert(fanRankedSource.includes("sort((a,b)=>b.value-a.value"),'FanRanked current ranking is not rebuilt from current market values');
assert(fanRankedSource.includes(".map((row,index)=>({rank:index+1"),'FanRanked current ranking is not reassigned contiguously');
console.log('V348 Value History/consensus source integrity regression passed');
