// Static source-level feature inventory. This validates code and data-reader wiring,
// NOT live Sleeper freshness, saved awards, browser interaction or publication.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SECTION_CONTRACTS=[
 {area:'Navigation and trade',file:'index.html',markers:[
  'data-tab="home"','data-tab="finder"','data-tab="evaluator"',
  'data-tab="leagueHub"','data-tab="league"','data-tab="settings"',
  'id="runFinder"','id="finderResults"','id="evaluate"','id="evalResults"','id="updateBtn"'
 ]},
 {area:'League Hub views',file:'league-hub-v451.js',markers:[
  'data-lh-view="awards"','data-lh-view="hall"','data-lh-view="daily"','data-lh-view="managers"'
 ]},
 {area:'Awards and all-time highs UI',file:'league-hub-v451.js',markers:[
  'weekly_awards=1','award_highs=1','All-Time Highs','Hot Seat'
 ]},
 {area:'Manager histories and identities UI',file:'league-hub-v451.js',markers:[
  'async function managers()','managerCache=null','manager_history_snapshot'
 ]},
 {area:'Inquirer and Fleeced Daily refresh UI',file:'league-hub-v451.js',markers:[
  'broadcast_archive=1','league_latest=1','refreshPublishedInquirerIfAdvanced',
  'refreshLiveLeagueWeekIfAdvanced','setInterval(refreshPublishedInquirerIfAdvanced,60000)',
  'setInterval(refreshLiveLeagueWeekIfAdvanced,60000)'
 ]},
 {area:'Market Dashboard and Market Intelligence',file:'value-history-v276.js',markers:[
  'vhMarketMovers','vhPositionIndexes','vhMarketHeat','vhMarketVolatility',
  'vhOpportunityWatch','loadMarketIntelligence(force)','market_insights=1',
  'fll:canonical-values-ready'
 ]},
 {area:'Trade History and Hindsight',file:'value-history-v276.js',markers:[
  'renderTradeHistory','tradeHistoryFetch({force:true})','refreshVisibleTradeHistory',
  'data-vh-trade-team','data-vh-trade-year','data-vh-trade-month'
 ]},
 {area:'Team and player value history',file:'value-history-v276.js',markers:[
  'renderTrackMyTeam','renderPlayerProfile','renderPlayerHistoryHub',
  'loadPlayerScoring','scoring_milestones'
 ]},
 {area:'League Hub live data endpoints',file:'netlify/functions/league-hub.mjs',markers:[
  "u.searchParams.get('managers')","u.searchParams.get('weekly_awards')",
  "u.searchParams.get('award_highs')","u.searchParams.get('awards')",
  "u.searchParams.get('draft_records')","u.searchParams.get('broadcast_archive')",
  "u.searchParams.get('league_latest')"
 ]},
 {area:'Market and history server endpoints',file:'netlify/functions/value-history.mjs',markers:[
  'market_insights','player_scoring','scoring_milestones'
 ]}
];

export function auditSectionReadiness(read){
 const results=SECTION_CONTRACTS.map(section=>{
  const source=String(read(section.file)||'');
  const missing=section.markers.filter(marker=>!source.includes(marker));
  return{area:section.area,file:section.file,checks:section.markers.length,present:!missing.length,missing};
 });
 const failed=results.filter(x=>!x.present);
 return{results,failed,areas:results.length,checks:results.reduce((n,x)=>n+x.checks,0)};
}
export function assertSectionReadiness(read){
 const report=auditSectionReadiness(read);
 if(report.failed.length)throw Error('Site subsection source regression: '+report.failed.map(x=>x.area+' ('+x.missing.join(', ')+')').join('; '));
 return report;
}
const isCli=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCli){
 const root=process.cwd();
 try{
  const report=assertSectionReadiness(file=>{
   try{return fs.readFileSync(path.join(root,file),'utf8')}catch{return''}
  });
  console.log('SITE_SUBSECTION_READINESS',JSON.stringify({areas:report.areas,checks:report.checks,verified:report.results.map(x=>x.area),note:'source only; live preview and data freshness require separate verification'}));
 }catch(error){console.error(error.message);process.exitCode=1}
}
