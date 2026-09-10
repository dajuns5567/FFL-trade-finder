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
  'Original Trade Analysis',
  'Raw asset total',
  'Value adjustment',
  'Trade-adjusted total',
  'vh-eval-scorebar',
  'background:#e4b53f!important',
  'data-vh-open-trade-history',
  "What's Happening With My Team",
  'data-vh-team-attribution',
  'data-vh-team-net-sort',
  '30D Rank Δ',
  'data-vh-trade-team',
  'Trade-linked team net-value points'
])assert(ui.includes(needle),'missing Value History UI feature: '+needle);

for(const forbidden of [
  'modeledPlayerValuesV319.build(',
  'section1V130.install(',
  'tradeFinderV168.generate',
  'tradeEvaluatorAnyTeam',
  'Value Adjustment='
])assert(!ui.includes(forbidden),'Value History must remain read-only relative to trade/value systems: '+forbidden);
assert(ui.includes('function tradeHistoryFair(give,recv,trade)'), 'Trade History must use an isolated historical evaluator adapter');
assert(ui.includes('proximityRate=clamp(.18,.18+2.35*(1-rel),1)'),'Trade History value adjustment must scale continuously with centerpiece proximity');
assert(ui.includes('centerpieceProximityCap=rawGap>0?rawGap*proximityRate:Infinity'),'Trade History value adjustment must cap raw-gap erasure when centerpieces are near peers');
assert(ui.includes('eliteCounterCap,centerpieceProximityCap'),'centerpiece proximity cap must coexist with existing elite-counter protection rather than replacing it');
assert(ui.includes('retroactiveTradeHistoryPickValue(asset,trade)'), 'Trade History retroactive pick timing adapter missing');
assert(ui.includes("window.tradeValueNormalizationV130?.canonicalValue"),'Trade History current player and pick display must use the exact active evaluator canonical value function');
assert(ui.includes('function currentPickRows()'),'Value History must capture live canonical draft-pick values for future exact trade history');
assert(ui.includes('function currentTeamRows(playerRows=currentRows())'),'Value History must capture authoritative per-team net totals at snapshot time');
assert(ui.includes('function teamTradeNetEvents(teamId,netData,period)'),'Track My Team must identify completed trades against authoritative net-value points');
assert(ui.includes('function teamNetPointTradeMap(teamId,points)'),'Overall Net Value chart must map completed trades to authoritative team data points');
assert(ui.includes('data-vh-trades='),'trade-linked Overall Net Value points must carry trade context into the chart tooltip');
assert(ui.includes('Observed team net-value change from prior authoritative snapshot'),'Overall Net Value tooltip must display observed net-value movement tied to the point');
assert(ui.includes('not an assumption that the trade alone caused the change'),'Overall Net Value tooltip must preserve non-causal attribution language');
assert(ui.includes("p?.teamSnapshot===true"),'trade-linked team events must never use legacy reconstructed net points');
assert(ui.includes("tm>prevMs&&tm<=curMs"),'completed trades must be bracketed by the actual before/after team snapshots they are linked to');
assert(ui.includes("What's Happening With My Team"),'approved Track My Team attribution heading missing');
assert(!ui.includes('What Moved My Team'),'legacy team attribution heading must be removed');
assert(!ui.includes('${teamTradeImpactCard(trackedTeamId)}'),'standalone Recent Trade Impact card must not duplicate trade events');
assert(ui.includes('The snapshot change is observed team net-value movement, not an assumption that the trade alone caused the move.'),'trade-linked net movement must include non-causal attribution language');
assert(ui.includes("body:JSON.stringify({league:'1316867686394769408',rows,picks,teams})"),'Value History snapshot POST must include separate player, pick, and team ownership totals');
assert(ui.includes('const recorded=Number(asset.historyRecordedValue)'),'Trade History must prefer recorded historical pick values before retroactive fallback');
assert(ui.includes('vh-assets-title'),'Trade History must visually emphasize Assets received');
assert(ui.includes('tradeOriginalAssets(side)'), 'Trade Evaluator analysis must evaluate the original traded package rather than mutate it into current outcomes');
assert(ui.includes('return Number.isFinite(season)&&season>2000?season+1:null'),'retroactive Trade History nearest draft year must roll from the trade season');
assert(ui.includes('function tradeHistoryPickTimingFactor(year,round,nearestYear)'),'Trade History distance-based pick timing helper missing');
assert(ui.includes('Math.max(0,y-base)'),'Trade History pick distance must be measured from trade-season nearest draft year');
const vhSandbox={window:{},state:{allAssets:[]}};
const vhTradeHelpers=ui.match(/function tradeHistoryNearestDraftYear\(trade\)[\s\S]*?function historicalPlayerValue/);
assert(vhTradeHelpers,'Trade History historical draft timing helpers could not be isolated for regression testing');
vm.runInNewContext(vhTradeHelpers[0].replace(/function historicalPlayerValue[\s\S]*/,''),vhSandbox);
assert(vhSandbox.tradeHistoryNearestDraftYear({season:2024})===2025,'2024 Trade History nearest draft year must be 2025');
assert(vhSandbox.tradeHistoryNearestDraftYear({season:2025})===2026,'2025 Trade History nearest draft year must be 2026');
assert(vhSandbox.tradeHistoryNearestDraftYear({season:2026})===2027,'2026 Trade History nearest draft year must be 2027');
assert(Math.abs(vhSandbox.tradeHistoryPickTimingFactor(2025,1,2025)-1)<1e-9,'2025 pick in a 2024 trade must receive nearest-year timing');
assert(Math.abs(vhSandbox.tradeHistoryPickTimingFactor(2026,1,2025)-0.88)<1e-9,'2026 pick in a 2024 trade must be one year farther away');
assert(Math.abs(vhSandbox.tradeHistoryPickTimingFactor(2027,2,2025)-Math.pow(.88,2))<1e-9,'2027 non-R1 pick in a 2024 trade must be two years farther away');
assert(ui.includes('Math.pow(.88,Math.max(0,y-base))'),'retroactive Trade History must preserve the existing 12% per-year discount cadence');
assert(ui.includes('(y===2027&&r===1)?1.03:1'),'retroactive Trade History must preserve the existing 2027 R1 premium without giving it to 2026');
assert(ui.includes("const historical=side?historicalPlayerValue(side,asset.id):null"),'Original Trade Analysis players must use stored at-time-of-trade values');
assert(ui.includes("return historical==null?null:historical"),'Original Trade Analysis must not substitute current player values when history is missing');
assert(ui.includes("if(asset.type==='pick'&&completedHistoricalPick(asset))return retroactiveTradeHistoryPickValue(asset,trade);"),'Hindsight historical unresolved picks must retain isolated historical pick handling');
assert(ui.includes("return currentEvaluatorValue(asset);"),'Hindsight must continue using today current values for current outcome assets');
assert(ui.includes('text-align:center'),'Trade History time headers must be centered');
assert(ui.includes('function hindsightAnalysis(trade)'),'Trade History Hindsight evaluator missing');
assert(ui.includes("Looking back on trades with today's current value."),'Hindsight description must use the approved current-value wording');
assert(ui.includes("Historical value unavailable"),'Original Trade Analysis must report unavailable historical results rather than fabricate a score');
assert(ui.includes("value==null?'N/A':fmt(value)"),'Original Trade Analysis missing asset values must display N/A');
assert(ui.includes("These trades occurred before Trade History was established"),'pre-history Original Trade Analysis disclaimer missing');
assert(ui.includes("N/A means this trade occurred before reliable Trade History player values were established, so no historical player value is guessed."),'incomplete Original Trade Analysis description must contain the pre-history N/A disclaimer');
assert(ui.includes('function fairWithValue(give,recv,valueFn)'),'Trade History must expose one shared parameterized fairness adapter');
assert(ui.includes('const depth=Math.max(0,otherRaw-otherTop)'),'Trade History fairness adapter must mirror the active evaluator depth-cap logic');
assert(ui.includes('counterElitePressure(otherAssets)'),'Trade History fairness adapter must mirror the active evaluator elite-counter pressure');
assert(ui.includes('function tradeHistoryFair(give,recv,trade){return fairWithValue'), 'original Trade Evaluator Analysis must use the shared current fairness algorithm with historical values');
assert(ui.includes('function hindsightFair(give,recv,trade){return fairWithValue'), 'Hindsight must use the same fairness algorithm as original Trade Evaluator Analysis');
assert(ui.includes('const f=tradeHistoryFair(bReceived,aReceived,trade)'), 'historical Trade Evaluator must use the shared Trade History fairness adapter');
assert(ui.includes('<h4>Hindsight</h4>'),'Trade History Hindsight detail must remain available');
assert(!ui.includes('<h3>Fleeced Trade Breakdown</h3>'),'redundant Fleeced Trade Breakdown wrapper heading must be removed');
assert(ui.includes('return hindsightSection(trade)'),'Hindsight must render directly without the redundant outer breakdown card');
assert(ui.includes('vh-trade-toggle-active'),'selected Trade History detail controls must use the dedicated gold active state');
assert(ui.includes('function compactTradePlayerMeta(id)'),'compact Trade History player rows must include position and NFL team metadata');
assert(ui.includes('function historicalValueComparisonSection(trade)'),'Historical Value Comparison must be a distinct final Trade History section');
assert(ui.includes('function historicalDraftSlotLabel(p)'),'Trade History must format completed rookie selections from Sleeper round and draft slot');
assert(ui.includes("String(slot).padStart(2,'0')")&&ui.includes("historicalDraftSlotLabel(p)"),'completed rookie pick labels must use Sleeper round + draft_slot notation');
assert(ui.includes('function historicalPickOwnershipLabel(p,trade)'),'Historical Value Comparison must expose draft-pick ownership/origin context');
assert(ui.includes("meta:\`From ${slotLabel||\`${p.season} R${p.round}\`} • ${ownership}\`"),'converted picks in Historical Value Comparison must show exact rookie slot and original ownership');
assert(!ui.includes("${p.season}.${String(p.pick_no).padStart(2,'0')}"),'Trade History must not display Sleeper overall pick_no as year.slot');

assert(ui.includes("${open.hindsight?tradeValuePresentation(trade):''}${open.original?tradeEvaluatorSection(trade):''}${anyOpen?historicalValueComparisonSection(trade):''}"),'Trade History expanded order must remain Hindsight, Original Analysis, then Historical Value Comparison');
assert(!ui.includes('Historical player snapshot unavailable'),'redundant unavailable snapshot header label must not be shown');
assert(!ui.includes('historical pick fallback'),'internal retroactive pick fallback wording must remain hidden');
assert(!ui.includes('Historical value change compared with what each side ultimately holds from the deal today.'),'Fleeced Trade Breakdown description must be removed');
assert(ui.includes('function completedHistoricalPick(asset)'),'Hindsight must detect already-historical draft picks');
assert(ui.includes('if(asset.type===\'pick\'&&completedHistoricalPick(asset))return retroactiveTradeHistoryPickValue(asset,trade);'),'historical Hindsight picks must not fall through to live current/future pick valuation');
assert(ui.includes('function tradeResultScoreboard(teamA,totalA,teamB,totalB,score,label)'),'Trade History must render prominent adjusted-total scoreboards');
assert(ui.includes('Winner • trade-adjusted total'),'winner/loser hierarchy must emphasize final adjusted totals');
assert(ui.includes('Current outcome detail'),'Hindsight must present current outcome package detail beneath the scoreboard');
assert(ui.includes('gap:28px'),'completed trades must have stronger visual separation');
assert(ui.includes('border:2px solid color-mix(in srgb,#e4b53f 30%,var(--line))'),'completed trade cards need distinct outer borders');
assert(!ui.includes('nearest-year retroactive frame'),'retroactive pick-frame mechanics must remain hidden from user-facing text');
assert(!ui.includes('<div class="vh-assets-title">Assets received</div>'),'redundant Fleeced Trade Breakdown Assets Received block must be removed');
assert(ui.includes("${open.hindsight?tradeValuePresentation(trade):''}${open.original?tradeEvaluatorSection(trade):''}${anyOpen?historicalValueComparisonSection(trade):''}"),'Trade History expanded sections must render Hindsight first, Original Trade Analysis second, and Historical Value Comparison last');
assert(ui.includes('Overall #'),'Trade History received-player metadata must show current overall rank');
assert(ui.includes('posRank'),'Trade History received-player metadata must show current positional rank');
assert(!ui.includes('Current evaluator rationale'),'Trade History evaluator section must not render the written rationale block');
assert(!ui.includes('state.assetsA='),'Trade History must not overwrite Trade Evaluator Team A selections');
assert(!ui.includes('state.assetsB='),'Trade History must not overwrite Trade Evaluator Team B selections');
assert(!ui.includes('pickValue=function'),'Trade History must not replace draft-pick valuation logic');
assert(!ui.includes('window.pickValue='),'Trade History must never overwrite shared current/future pickValue');
assert(!ui.includes('tradeValueNormalizationV130.canonicalValue='),'Trade History must never overwrite canonical current/future valuation');
assert(!ui.includes('draftPickProjection92='),'Trade History must never overwrite shared draft-pick projection logic');
assert(!ui.includes('YEAR_DISCOUNT92='),'Trade History must not modify the shared current/future draft-pick year discount');
assert(ui.includes("tradeBtn.dataset.tab='tradeHistory'"),'Trade History must be a separate top-level tab');
assert(ui.includes("tradeDetailState=new Map()"),'Trade History expansion state must be maintained independently per trade');
assert(ui.includes('data-vh-trade-toggle="hindsight"'),'Trade History must expose an independent Hindsight toggle');
assert(ui.includes('data-vh-trade-toggle="original"'),'Trade History must expose an independent Original Trade Analysis toggle');
assert(ui.includes("open.hindsight?tradeValuePresentation(trade):''"),'Hindsight detail must render only when selected');
assert(ui.includes("open.original?tradeEvaluatorSection(trade):''"),'Original Trade Analysis must render only when selected');
assert(ui.includes("anyOpen?historicalValueComparisonSection(trade):''"),'Historical Value Comparison must stay hidden until either detail section is opened');
assert(ui.includes('vh-compact-trade'),'Trade History collapsed cards must retain a compact asset summary');



const backend=fs.readFileSync('netlify/functions/value-history.mjs','utf8');
assert(!backend.includes('rows.push({id,value,season,round'),'stored picks must remain outside player rows so player history/rank calculations stay isolated');
assert(backend.includes("MONTH_INDEX_PREFIX='indexes/'"),'partitioned all-time index missing');
assert(!backend.includes('CANONICAL_HISTORY_ORIGIN'),'Value History must not depend on a cross-site Netlify proxy');
assert(backend.includes("ARCHIVE_RAW='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/value-history-data/value-history'"),'durable GitHub Value History archive source missing');
assert(backend.includes("url.searchParams.get('archive_export')==='1'"),'Value History archive export endpoint missing');
assert(backend.includes('archiveAllSnapshots()'),'archived snapshots are not merged into player/team history');
assert(backend.includes('archiveSnapshot(item)'),'market history does not read durable archived snapshots');
assert(backend.includes("function archiveRelativePath(path)"),'archive snapshot paths must normalize branch-root prefixes');
assert(backend.includes("p.startsWith('value-history/')?p.slice('value-history/'.length):p"),'archive-only startup must not double-prefix value-history paths after a Netlify account switch');
assert(backend.includes("archiveJson(archiveRelativePath(item.path))"),'market archive reads must use normalized GitHub paths');

assert(backend.includes("'github-archive+netlify-live'"),'history source does not expose archive/live merge state');
assert(backend.includes("function safeStore(){try{return store()}catch"),'Value History reads must survive Netlify Blob store initialization failure');
assert(backend.includes("'github-archive'"),'Value History must support archive-only history when the live Blob layer is unavailable');
assert(backend.includes("components:{"),'Value History health response must expose independent component diagnostics');
assert(backend.includes("githubArchive:{reachable:"),'Value History health must report GitHub archive reachability separately');
assert(backend.includes("netlifyLive:{reachable:"),'Value History health must report Netlify live-buffer reachability separately');
assert(backend.includes("const archiveSnaps=await archiveAllSnapshots();"),'Value History read paths must load the durable GitHub archive independently of Netlify Blobs');
assert(backend.includes("history_source:historySource"),'Trade History must expose its historical-value source separately from raw Sleeper trade audits');
assert(backend.includes("const trades=await importedCompletedTrades();"),'Trade History must load Sleeper completed trades before optional historical-value storage');

assert(backend.includes("url.searchParams.get('market')==='1'"),'market summary endpoint missing');
assert(backend.includes('LEGACY_INDEX_KEY'), 'legacy V330 history compatibility missing');
assert(backend.includes("url.searchParams.get('team_net')==='1'"),'Track My Team net-value history endpoint missing');
assert(!backend.includes("reason:'unchanged'"),'Value History must not suppress completed calculations just because the fingerprint matches the prior snapshot');
assert(!backend.includes("latest?.fingerprint===fp"),'Value History must record each completed player-value calculation as its own timestamped observation');
assert(backend.includes("const fp=fingerprint(rows,picks,teams);"),'Value History may retain fingerprints for snapshot integrity without using them for deduplication');
assert(backend.includes("url.searchParams.get('trades')==='1'"),'completed trade history endpoint missing');
assert(backend.includes('function cleanPicks(picks)'),'Value History backend must sanitize stored pick snapshots separately from player rows');
assert(backend.includes('function cleanTeams(teams)'),'Value History backend must sanitize team totals separately from player rows');
assert(backend.includes('const snapshot={version:4,league:LEAGUE,t,fingerprint:fp,rows,picks,teams}'),'Value History snapshots must persist player, pick, and team totals as separate collections');
assert(backend.includes('await appendIndex(s,key,t);'),'Value History write must persist the snapshot index before reporting success');
assert(!backend.includes("try{await appendIndex(s,key,t)}catch"),'Value History must not silently report success for an unindexed snapshot');
assert(backend.includes('histPickMap=pickMap'),'completed trade history must read pick values from the exact historical snapshot');
assert(backend.includes('then_picks:thenPicks.values'),'completed trade history must expose recorded pick values to Trade History');
assert(backend.includes('completedTradeHistory(s)'),'completed trade history must remain in Value History backend');
assert(backend.includes('TRADE_AUDIT_SEASONS'),'Sleeper imported multi-season trade audit source missing');
assert(backend.includes('exactDraftResultMap'),'exact Sleeper draft-result mapping missing');
assert(backend.includes('const combinedDraftResults=new Map(),ambiguous=new Set()'),'historical Sleeper draft results must be combined across imported league seasons');
assert(backend.includes('normalizeCompletedTrade(tx,week,bundle.season,bundle.teamNames,combinedDraftResults)'),'historical trades must resolve picks against the cross-season Sleeper draft-result map');
assert(!backend.includes('bundle.teamNames,bundle.draftResults'),'historical trade resolution must not be limited to the transaction season draft list');
assert(backend.includes('slot_to_roster_id'),'draft-result mapping must use Sleeper slot_to_roster_id rather than inference');
assert(backend.includes("TRADE_AUDIT_SEASONS=[2024,2025,2026]"),'2024–2026 linked trade audit coverage missing');
assert(backend.includes('closestSnapshotItem'),'trade history must use stored Value History snapshots rather than fabricated historical values');
assert(backend.includes("async function getTeamNetHistory(s,playerIds,teamId='')"),'team net-value history must accept a team-specific authoritative snapshot key');
assert(backend.includes('snap?.teams||[]'),'team net-value history must prefer stored team ownership totals when available');
assert(backend.includes('teamSnapshot:true'),'authoritative team net points must be identified explicitly');
assert(backend.includes('teamSnapshot:false'),'legacy current-roster reconstructions must remain distinguishable from authoritative team snapshots');
assert(backend.includes('scoringMilestones(playerId)'),'Sleeper scoring milestones endpoint integration missing');
assert(backend.includes("qualifyingSeasonMinimumGames:8"),'8-game qualifying season rule missing');
assert(backend.includes("league?.scoring_settings"),'league scoring settings are not used for milestones');
assert(backend.includes("V346_KTC_CUTOFF_MS=Date.parse('2026-09-08T05:23:00.000Z')"),'V346 KTC cutoff missing');
assert(backend.includes('scrubV346KtcContamination(s)'),'V346 history scrub missing');
assert(backend.includes('writeFilteredIndexes(s,keep)'),'V346 history reindex missing');

assert(ui.includes('scheduleSnapshot(0)'),'first snapshot is not attempted immediately on site load');
assert(ui.includes("function snapshotPreconditions(){if(!window.state||!state.players||Object.keys(state.players).length<100)return false;"),'Value History capture must wait only for usable site player state, not for a specific ranking source');
assert(!ui.includes("Object.keys(state.players).length<100||!hasValidatedKtcSnapshot()"),'Value History player snapshots must not be blocked by the KTC-specific validation gate');
assert(ui.includes("const rows=currentRows();"),'Value History must copy the site already-calculated player values into each snapshot');
assert(!ui.includes("keepalive:true"),'Value History POST must not use browser keepalive because the expanded snapshot payload can exceed keepalive body limits');
assert(ui.includes("body:JSON.stringify({league:'1316867686394769408',rows,picks,teams})"),'Value History POST must send the completed player snapshot payload');
assert(ui.includes("else if(currentView==='player'&&currentPlayerId)loadPlayer(currentPlayerId);"),'successful Value History writes must refresh the currently viewed player chart immediately');
assert(ui.includes("try{picks=currentPickRows()}catch"),'draft-pick snapshot enrichment must never block the core player snapshot');
assert(ui.includes("try{teams=currentTeamRows(rows)}catch"),'team snapshot enrichment must never block the core player snapshot');
assert(ui.includes("if(rows.length<100){scheduleSnapshot(2000);return false}"),'player rows must be the only required snapshot payload before enrichment');
assert(ui.indexOf("const rows=currentRows();")<ui.indexOf("try{picks=currentPickRows()}catch"),'core player snapshot must be built before optional pick enrichment');
assert(ui.indexOf("const rows=currentRows();")<ui.indexOf("try{teams=currentTeamRows(rows)}catch"),'core player snapshot must be built before optional team enrichment');
assert(ui.includes('scheduleSnapshot(1000)'),'Update-triggered value recalculation must schedule a new historical observation');
assert(ui.includes('scheduleSnapshot(1000)'),'post-update snapshot is not scheduled promptly');
const updateSource=fs.readFileSync('netlify/functions/update.mjs','utf8');
assert(updateSource.includes("failedSources=diagnostics.filter(result=>!result.ok)"),'consensus refresh is not checking all source failures');
assert(updateSource.includes("integrityReady=results.length>=7&&failedSources.length===0"),'consensus replacement is not gated on all required sources');
assert(updateSource.includes("sources:integrityReady?sources:{}"),'partial consensus refresh can replace the prior validated source set');
assert(backend.includes("V348_BAD_WINDOWS"),'V348 exact contaminated timestamp windows missing');
assert(backend.includes("scrubV348ConsensusContamination(s)"),'V348 contaminated timestamp scrub missing');
assert(backend.includes("V380_BAD_WINDOW"),'V380 requested 9/9 11:30 PM Eastern scrub window missing');
assert(backend.includes("scrubV380PartialWeekSnapshot(s)"),'V380 requested partial-week Value History scrub missing');
assert(archiveWriter.includes("isV380BadSnapshot"),'V380 scrubbed point must be blocked from durable archive ingestion');
const fanRankedSource=fs.readFileSync('netlify/functions/fanranked-adapter.mjs','utf8');
assert(fanRankedSource.includes("sort((a,b)=>b.value-a.value"),'FanRanked current ranking is not rebuilt from current market values');
assert(fanRankedSource.includes(".map((row,index)=>({rank:index+1"),'FanRanked current ranking is not reassigned contiguously');
const teamContextOwner368=fs.readFileSync('team-context-owner-map-v368.js','utf8');
assert(teamContextOwner368.includes("'detroit lions':'729929924969865216'"),'Detroit Lions projection identity must resolve through its stable Sleeper user ID');
assert(teamContextOwner368.includes("const byOwner=new Map((state.teams||[]).map(t=>[String(t.owner||''),t]))"),'owner adapter must resolve current rosters by Sleeper owner ID rather than mutable team names');
assert(teamContextOwner368.includes("Projection owner mapping incomplete"),'owner-ID projection mapping must fail closed if a stable owner cannot be resolved');
assert(teamContextOwner368.includes("mapped 32/32 by Sleeper owner ID"),'owner adapter must expose successful 32/32 owner mapping health');
const siteV17=fs.readFileSync('netlify/functions/site-v17.mjs','utf8');
assert(siteV17.includes('/team-context-v90.js?v=90'), 'frozen team-context runtime cache key must remain unchanged');
assert(siteV17.includes('/team-context-owner-map-v368.js?v=368'), 'owner-ID identity adapter must load immediately after frozen team context');
const siteV29=fs.readFileSync('netlify/functions/site-v29.mjs','utf8');
assert(siteV29.includes('/value-history-v276.js?v=379'),'production shell must cache-bust the current V379 Value History presentation runtime');
const archiveWriter=fs.readFileSync('scripts/archive-value-history.mjs','utf8');
assert(archiveWriter.includes("dataBranch='value-history-data'"),'archive writer must target the durable data branch');
assert(archiveWriter.includes('Archive Value History snapshot'),'archive writer snapshot commit path missing');
assert(archiveWriter.includes('months/'),'archive writer monthly bundle persistence missing');
assert(archiveWriter.includes("getStore({name:'fll-value-history-v2',siteID:netlifySiteId,token:netlifyToken"),'archive writer must read the production Blob store directly instead of depending on anonymous access to an SSO-protected site');
assert(archiveWriter.includes("source:'netlify-blobs-direct'"),'archive writer direct Blob source marker missing');
assert(archiveWriter.includes('Durable Value History archive verification failed after write'),'archive writer must verify the durable index after persistence');
assert(archiveWriter.includes('configure NETLIFY_BLOBS_TOKEN repository secret'),'archive writer must provide an actionable SSO-authentication failure');

const archiveWorkflow=fs.readFileSync('.github/workflows/value-history-archive.yml','utf8');
assert(archiveWorkflow.includes("cron: '17 * * * *'"),'hourly durable archive schedule missing');
assert(archiveWorkflow.includes('contents: write'),'archive workflow needs contents write permission');
assert(archiveWorkflow.includes('NETLIFY_BLOBS_TOKEN:'),'archive workflow must inject an authenticated Blob token instead of relying on public site access');
assert(archiveWorkflow.includes('NETLIFY_SITE_ID: 0cc03543-09f9-4de9-9b52-6cbc4fbc4357'),'archive workflow must target the production Blob site explicitly');
assert(archiveWorkflow.includes('npm install --ignore-scripts --no-audit --no-fund'),'archive workflow must install the Netlify Blobs client before direct access');

console.log('V348 Value History/consensus source integrity regression passed');
