import fs from 'node:fs';
import {buildPlayerSignal,recentFormProfile,reporterPlayerStatusProfile,PLAYER_SIGNAL_VERSION} from '../netlify/functions/player-signal-engine.mjs';

const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const base=(overrides={})=>({
  id:'p1',name:'Signal Test',position:'WR',nfl_team:'NO',age:23,years_exp:2,
  points:15,season_avg:14.5,prior_season_games:12,prior_season_avg:8,
  current_snap_count:52,current_snap_pct:.78,prior_season_snaps_per_game:31,
  ...overrides
});

const breakout=reporterPlayerStatusProfile(base(),1,{points:14});
assert(breakout.status==='breakout','young strong two-week rise + role lift must remain breakout');
assert(breakout.strongTwoWeekRise===true&&breakout.roleLift===true,'breakout evidence flags missing');
assert(PLAYER_SIGNAL_VERSION===3,'signal version must advance for corrected null evidence semantics');

const star=reporterPlayerStatusProfile(base({age:26,years_exp:4,prior_season_avg:18,season_avg:18,points:18,current_snap_pct:.8}),1,{points:17});
assert(star.status==='established-star','established star classification drifted');

const declining=reporterPlayerStatusProfile(base({age:30,years_exp:7,prior_season_avg:16,season_avg:10,points:9,current_snap_count:18,current_snap_pct:.35,prior_season_snaps_per_game:52,prior_season_snap_pct:.82}),1,{points:10});
assert(declining.status==='declining-veteran','declining veteran classification drifted');
const injuredStar=reporterPlayerStatusProfile(base({age:30,years_exp:8,prior_season_avg:18,season_avg:10,points:8,current_snap_count:12,current_snap_pct:.2,prior_season_snaps_per_game:50,prior_season_snap_pct:.8,injury_status:'OUT'}),1,{points:9});
assert(injuredStar.status==='established-star','injured established star must not be mislabeled declining veteran');
const youngDrop=reporterPlayerStatusProfile(base({age:24,years_exp:3,prior_season_avg:15,season_avg:9,points:8,current_snap_count:24,current_snap_pct:.4,prior_season_snaps_per_game:55,prior_season_snap_pct:.82}),1,{points:9});
assert(youngDrop.status!=='declining-veteran','young player must never be mislabeled declining veteran');

const reliable=reporterPlayerStatusProfile(base({position:'RB',age:29,years_exp:6,prior_season_avg:12,season_avg:12,points:12,current_snap_pct:.6}),1,{points:12});
assert(reliable.status==='reliable-veteran','reliable veteran classification drifted');

const hot=recentFormProfile([{week:1,points:6},{week:2,points:7},{week:3,points:8},{week:4,points:12},{week:5,points:13},{week:6,points:14}]);
assert(hot.label==='hot','recent-form hot threshold drifted');
const cold=recentFormProfile([{week:1,points:18},{week:2,points:17},{week:3,points:16},{week:4,points:10},{week:5,points:9},{week:6,points:8}]);
assert(cold.label==='cold','recent-form cold threshold drifted');
const shortForm=recentFormProfile([{week:1,points:10},{week:2,points:12}]);
const shortSignal=buildPlayerSignal({player:base({prior_season_avg:8,season_avg:11,points:12}),previousPlayer:{points:10},recentForm:shortForm,season:2026,week:2,slot:1});
assert(shortForm.delta===null&&shortSignal.evidence.recent_form_delta===null,'insufficient recent-form evidence must remain null instead of becoming 0');

const first=buildPlayerSignal({player:base(),previousPlayer:{points:14},recentForm:hot,season:2026,week:6,slot:1});
assert(first.version===PLAYER_SIGNAL_VERSION&&first.state==='breakout','signal must preserve reporter breakout as normalized state');
assert(first.duration_weeks===1&&first.started_at?.week===6,'new signal duration/start incorrect');
const held=buildPlayerSignal({player:base({points:16,season_avg:15}),previousPlayer:{points:15},recentForm:hot,season:2026,week:7,slot:1,previousSignal:first});
assert(held.state==='breakout'&&held.duration_weeks===2&&held.started_at?.week===6&&!held.changed,'held signal continuity incorrect');

const cooledPlayer=base({age:26,years_exp:3,prior_season_games:0,prior_season_avg:null,season_avg:7,points:6,current_snap_count:20,current_snap_pct:.3,prior_season_snaps_per_game:null});
const cooled=buildPlayerSignal({player:cooledPlayer,previousPlayer:{points:7},recentForm:cold,season:2026,week:7,slot:1,previousSignal:first});
assert(cooled.state==='cooling'&&cooled.changed===true&&cooled.previous_state==='breakout','signal reversal transition incorrect');

const editorial=fs.readFileSync('netlify/functions/inquirer-editorial-v31.mjs','utf8');
assert(editorial.includes("import {reporterPlayerStatusProfile} from './player-signal-engine.mjs';"),'Inquirer is not importing shared player signal classifier');
assert(editorial.includes('return reporterPlayerStatusProfile(p,slot,pp);'),'Inquirer status wrapper is not delegated to shared classifier');
const vh=fs.readFileSync('value-history-v276.js','utf8');
for(const marker of ['/.netlify/functions/player-signals','Fleeced Signals','loadPlayerSignals','playerSignalCache'])assert(vh.includes(marker),'Value History signal integration missing '+marker);
for(const marker of ['vhPositionIndexes','vhMarketHeat','vhCategoryLeaders','vhMarketHighLow','vhMomentumLeaders','vhOpportunityWatch','vhMarketReversals','vhMarketVolatility','market_insights=1','marketSignalsFetch','data-vh-intel-period','data-vh-heat-pos','data-vh-intel-view-all','openHeatMapModal','openMarketIntelModal','Buy Low Watch','Sell High Watch','Overall Market Volatility','Positional Market Volatility','Player Market Volatility','marketVolatilityPool','volatilityPoolRows','data-vh-volatility-pool',"['10','50','100','200','300','500','ALL']",'marketSignalDirection(sig.state)','rebound_pct','marketLeaderEligible','finiteMarketNumber','verifiedValueMove','livePlayerMeta(id)','player_changes','Offensive Breakout Watch','Defensive Breakout Watch','Strongest Rebound','Deepest Pullback','New Player Market Highs / Lows','View all ↗','View history ↗','Above prior','Below prior','breadth=sample.length','Market Intelligence'])assert(vh.includes(marker),'Market Dashboard intelligence integration missing '+marker);
for(const marker of ['justify-content:flex-start;height:100%','align-content:start;grid-auto-rows:minmax(58px,auto)','vh-intel-title','background:transparent!important;color:#f4f4f5!important'])assert(vh.includes(marker),'Market Intelligence alignment/header styling missing '+marker);
const rankPos=vh.indexOf('class="vh-rank-grid"'),signalPos=vh.indexOf('id="vhPlayerSignals"',rankPos),recentPos=vh.indexOf('Recent Changes',signalPos);
assert(rankPos>=0&&signalPos>rankPos&&recentPos>signalPos,'Fleeced Signals must render below rank charts and above Recent Changes');
const historyFn=fs.readFileSync('netlify/functions/value-history.mjs','utf8');
for(const marker of ['getMarketInsights','marketInsightsFromSnapshots','marketInsightRange','marketInsightWindow','marketVolatilitySummary',"url.searchParams.get('market_insights')==='1'",'ranges','position_indexes','market_volatility','position_volatility','player_changes','firstSeen','from_overall','overall_delta','baseSnap=ordered.find','identity_clean','new_highs','new_lows','volatility','drawdown_pct','delta90'])assert(historyFn.includes(marker),'Market intelligence backend missing '+marker);
const signalsFn=fs.readFileSync('netlify/functions/player-signals.mjs','utf8');
assert(signalsFn.includes('transitions=compact?Object.values(data.history_by_player||{}).flatMap(history=>')&&signalsFn.includes('x?.changed')&&signalsFn.includes('previous_reporter_label'),'Compact signal API must expose historical transitions with prior classifier metadata for range filtering');

for(const marker of ['canonicalWeeklyAwards(origin)','awardByPlayerWeek','player_of_week:playerOfWeek','Offensive Player of the Week','Defensive Player of the Week'])assert(signalsFn.includes(marker),'Fleeced Signals Player of the Week integration missing '+marker);
for(const marker of ['Promise.all(unique.map(loadSparseItem))','market.archive_reachable=arch.reachable!==false',"title:group==='offense'?'Offensive Player of the Week':'Defensive Player of the Week'","pushWeeklyAward","if(payload&&(!canonical||Number(year)===currentSeason))"])assert(historyFn.includes(marker),'Market/POTW backend regression missing '+marker);
for(const marker of ['Permanent Fleeced weekly award','current.player_of_week','id="vhScoringMilestones"','Player of the Week'])assert(vh.includes(marker),'Player Value History POTW milestone integration missing '+marker);
const scoringFn=vh.slice(vh.indexOf('function scoringMilestonesRows('),vh.indexOf('async function loadPlayerScoring',vh.indexOf('function scoringMilestonesRows(')));assert(!scoringFn.includes('scoringMilestonesRows(scoring,scoringLoading)'), 'Scoring milestone renderer must not recurse');

console.log('Fleeced player signal engine + Market Dashboard intelligence + Player of the Week smoke passed');
