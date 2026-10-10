import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {finalizeReporterUniqueness} from '../netlify/functions/inquirer-forward-restore-voice.mjs';
const edition={week:11,teams:[{
 roster_id:1,team_name:'Green Bay Packers',starter_details:[{name:'Player One',points:12}],
 inquirer_article:{sections:[
  {kind:'lede',paragraphs:['Green Bay Packers have a win this week. Green Bay Packers played hard this week. Green Bay Packers made an adjustment. Green Bay Packers need to improve.']},
  {kind:'cool-throne',paragraphs:['Green Bay Packers enjoyed a starter performance.']},
  {kind:'revisit',paragraphs:['Young receiver Marvin Harrison posted -0.6 in both round 14 and Week 15.']}
 ]}
}],league_overview:{sections:[{paragraphs:['Broadly, The Week 11 score matters. Accordingly, A second result matters. For now, Another matchup awaits.']}]}};
const checked=finalizeReporterUniqueness(edition,null);
const sections=checked.teams[0].inquirer_article.sections;
assert(sections.every(s=>s.paragraphs?.length),'Final dedupe must not leave an article section empty');
const copy=checked.teams[0].inquirer_article.paragraphs.join(' ');
assert((copy.match(/Green Bay Packers/g)||[]).length>=1,'Preserve verified team references');
assert((copy.match(/(?:^|[.!?]\s+)Green Bay Packers /g)||[]).length<=3,'Cap repeated team-name sentence leads');
assert(!/in both round 14 and Week 15/.test(copy),'Reject bare round-to-week statistical repeats');
const recap=checked.league_overview.sections[0].paragraphs.join(' ');
assert(!/\b(Broadly|Accordingly|For now),?\b/i.test(recap),'No mechanical recap transitions');
assert(/Week 11 score matters/.test(recap)&&/second result matters/i.test(recap),'Preserve substance when removing transitions');
const endpoint=readFileSync('netlify/functions/league-hub-week4-fast.mjs','utf8');
const frontend=readFileSync('league-hub-v451.js','utf8');
assert(endpoint.includes("'netlify-cdn-cache-control':'no-store"),'Week 4 fast route must bypass stale CDN cache');
assert(frontend.includes("cache:y===2026&&w===4?'no-store':'force-cache'"),'Week 4 archive fetch must bypass stale browser cache');
assert(frontend.includes("new XMLHttpRequest()")&&frontend.includes("xhr.timeout=12000"),'Week 4 archive must recover from a stalled fetch with a bounded independent request');
assert(frontend.includes("if(valid(recovered))return recovered"),'Recovered archived content must pass structural validation before opening');
const week4EditorialSource=readFileSync('netlify/functions/inquirer-week4-editorial-rebuild.mjs','utf8');
assert(!/valid\\(p\\.season_avg\\)|n\\(young\\.p\\.season_avg\\)|n\\(star\\.season_avg\\)|n\\(support\\.season_avg\\)/.test(week4EditorialSource),'Unverified average fields must not enter editorial claims');
assert(!/n\\(support\\.prior_season_avg\\)/.test(week4EditorialSource),'Unverified historical average must not enter editorial claims');
const publisher=readFileSync('netlify/functions/league-hub.mjs','utf8');
const scheduler=readFileSync('netlify/functions/inquirer-publish-scheduled.mjs','utf8');
const captureScheduler=readFileSync('netlify/functions/inquirer-projection-capture-scheduled.mjs','utf8');
const netlifyConfig=readFileSync('netlify.toml','utf8');
assert(scheduler.includes("import {weeklyReport} from './league-hub.mjs'")&&scheduler.includes('await weeklyReport(req)')&&!scheduler.includes('capturePregameProjections'),'Scheduled publishing must retain canonical approval and completion gates without optional capture delays');
assert(captureScheduler.includes('await capturePregameProjections()')&&!captureScheduler.includes('weeklyReport(req)')&&netlifyConfig.includes('[functions."inquirer-projection-capture-scheduled"]'),'Independent scheduled projection capture must not publish weekly editions');

assert(publisher.includes("if(!weeklyStats||typeof weeklyStats!=='object'||!Object.keys(weeklyStats).length)return latestPublished?"),'Weekly Inquirer publication must fail closed while retaining the most recent published edition when Sleeper stats are unavailable');
assert(publisher.includes('if(!completion.complete)return latestPublished?'),'Unfinished next week must serve the latest already-published edition');
assert(publisher.includes('rows.length!==rosterIds.size'),'Regular-season publication must reject incomplete matchup roster coverage');
assert(publisher.includes('process.env.INQUIRER_APPROVED_THROUGH_WEEK??4'),'Unapproved Week 5 and later must remain unpublished by default');
assert(publisher.includes('if(week>approvedThroughWeek)return latestPublished?'),'Release gate must retain latest published edition without advancing');
assert(publisher.includes('Final published Inquirer quality gate rejected Week'),'Final postprocessor must not bypass editorial-quality gate before publication');
assert(publisher.includes('fetchJson(`${API}/league/${LEAGUE}/transactions/${week}`).catch(()=>null)')&&publisher.includes('!Array.isArray(transactions)'),'Transaction fetch failures must defer publication rather than masquerade as zero trades');
assert(publisher.includes('Promise.resolve(completion.rows)'),'Publication must use the previously finalized Sleeper matchup snapshot without refetching');
assert(publisher.includes('rosters.length!==completion.rows.length'),'Partial roster responses must defer publication');
assert(publisher.includes('rosters.some(r=>r.owner_id&&!users.some(u=>String(u.user_id)===String(r.owner_id)))'),'Partial Sleeper user records must not silently omit roster-owner attribution');
const start=publisher.indexOf('function matchupComplete(rows){'),end=publisher.indexOf('function raceSort(',start);
assert(start>=0&&end>start,'Missing match-completion helpers');
const testRows=[
 {roster_id:1,matchup_id:1,points:112,players_points:{a:112}},
 {roster_id:2,matchup_id:1,points:90,players_points:{b:90}},
 {roster_id:3,matchup_id:2,points:50,players_points:{c:50}},
 {roster_id:4,matchup_id:2,points:65,players_points:{d:65}}
];
const rosterRecords=[
 {roster_id:1,settings:{wins:1,losses:0}},
 {roster_id:2,settings:{wins:0,losses:1}},
 {roster_id:3,settings:{wins:0,losses:1}},
 {roster_id:4,settings:{wins:1,losses:0}}
];
let activeRows=testRows;
const sandbox={
 API:'https://example.invalid',LEAGUE:'123',INQUIRER_PLAYOFF_START_WEEK:15,
 fetchJson:async url=>url.endsWith('/matchups/1')?activeRows:url.endsWith('/rosters')?rosterRecords:[]
};
vm.createContext(sandbox);
vm.runInContext(publisher.slice(start,end),sandbox);
assert.equal((await sandbox.completedPublicationWeek(1)).complete,true,'Finalized complete four-roster fixture must publish');
assert.equal(sandbox.matchupComplete([testRows[0],{...testRows[1],roster_id:1},...testRows.slice(2)]),false,'Duplicate roster within the same matchup must be rejected');
assert.equal(sandbox.matchupComplete([testRows[0],testRows[1],{...testRows[2],roster_id:2},testRows[3]]),false,'Roster duplicated between matchup groups must be rejected');
assert.equal(sandbox.matchupComplete(testRows.map((row,i)=>i===0?{...row,roster_id:null}:row)),false,'Unidentified matchup roster must be rejected');

const completeStats={a:{pts:112},b:{pts:90},c:{pts:50},d:{pts:65}};
assert.equal(sandbox.missingPublishedWeekPlayerStats(testRows,completeStats).length,0,'Full scorer coverage must pass');
const partialStats={a:{pts:112},b:{pts:90},d:{pts:65}};
assert.deepEqual(Array.from(sandbox.missingPublishedWeekPlayerStats(testRows,partialStats)),['c'],'Partial raw stats must identify missing nonzero matchup scorers');
assert.deepEqual(Array.from(sandbox.missingPublishedWeekPlayerStats(testRows,{...completeStats,c:null})),['c'],'Null raw player stat entry must not be counted as complete');
assert.deepEqual(Array.from(sandbox.missingPublishedWeekPlayerStats(testRows,{...completeStats,c:{}})),['c'],'Empty player stat record must not be counted as complete');
const zeroScorerRows=[...testRows,{roster_id:5,matchup_id:3,points:0,players_points:{zero:0}}];
assert.equal(sandbox.missingPublishedWeekPlayerStats(zeroScorerRows,completeStats).length,0,'Players with zero matchup points need not have a raw stats entry');
const fullMetadata={a:{full_name:'Player A',position:'QB'},b:{full_name:'Player B',position:'RB'},c:{full_name:'Player C',position:'LB'},d:{full_name:'Player D',position:'DB'}};
assert.equal(sandbox.missingPublishedWeekPlayerMetadata(testRows,fullMetadata).length,0,'Complete player directory must support publishing');
assert.deepEqual(Array.from(sandbox.missingPublishedWeekPlayerMetadata(testRows,{...fullMetadata,c:{full_name:'Player C'}})),['c'],'Missing scorer position must defer publication');
assert.deepEqual(Array.from(sandbox.missingPublishedWeekPlayerMetadata(testRows,{...fullMetadata,d:{position:'DB'}})),['d'],'Missing scorer name must defer publication');


activeRows=testRows.slice(0,2);
assert.equal((await sandbox.completedPublicationWeek(1)).complete,false,'Partial roster coverage must never publish');
activeRows=testRows.map(x=>({...x}));activeRows[0].points=null;
assert.equal((await sandbox.completedPublicationWeek(1)).complete,false,'Null matchup total must never count as finalized');
activeRows=testRows.map(x=>({...x}));activeRows[0].points='';
assert.equal((await sandbox.completedPublicationWeek(1)).complete,false,'Blank matchup total must never count as finalized');


const {refreshPublishedSurfaces}=await import('../netlify/functions/inquirer-publish-scheduled.mjs');
const calls=[];
let awardsAttempts=0;
const fakeRequest=async (_origin,path)=>{
 calls.push(path);
 if(path.includes('weekly_awards')){
  awardsAttempts++;
  if(awardsAttempts===1)throw Error('Temporary source outage');
  return {records:[{season:2026,week:4}]};
 }
 return {scoring_history:{through_season:2026,through_week:4}};
};
const recovery=await refreshPublishedSurfaces('https://example.invalid',{season:2026,week:4},fakeRequest);
assert.equal(recovery.weekly_awards_refreshed,true,'Retry a temporarily failing award refresh');
assert.equal(recovery.manager_spotlight_refreshed,true,'Spotlight must reconcile to published week');
assert.equal(awardsAttempts,2,'Retry failing surface but do not rerun successful ones');
assert.equal(calls.filter(x=>x.includes('managers')).length,1,'Do not repeat successful manager update');
assert.equal(recovery.errors.length,0,'Recovered failures must not remain active alerts');
const stale=await refreshPublishedSurfaces('https://example.invalid',{season:2026,week:4},async (_origin,path)=>path.includes('weekly_awards')?{records:[{season:2026,week:3}]}:{scoring_history:{through_season:2026,through_week:3}});
assert.equal(stale.weekly_awards_refreshed,false,'Stale awards must never be marked healthy');
assert.equal(stale.manager_spotlight_refreshed,false,'Stale spotlight must never be marked healthy');
assert.equal(stale.attempts,3,'Bound retries on persistent stale data');
assert(stale.errors.length===2,'Surface both unresolved failures for observability');

const qualityGateSource=readFileSync('netlify/functions/inquirer-editorial-v31.mjs','utf8');
assert(qualityGateSource.includes('findInquirerSourceFactIssues(candidate)'), 'Every future edition must run source-fact checks in its quality evaluator');
assert(qualityGateSource.includes('&&factIssues.length===0'), 'Source-fact errors must block new publication rather than only log warnings');
const {findInquirerSourceFactIssues,buildInquirerEditionFactRegistry}=await import('../netlify/functions/inquirer-source-facts.mjs');
const factFixture={week:4,teams:[{team_name:'Miami Dolphins',starter_details:[{name:'Tetairoa McMillan',points:45.2}],inquirer_article:{sections:[{paragraphs:['Tetairoa McMillan scored 45.2 points in Week 4.']}]} }],league_overview:{sections:[],hot_takes:[{take:'Tetairoa McMillan has a 45.2-point season average.'}]}};
assert(findInquirerSourceFactIssues(factFixture).some(x=>x.id==='unsupported-player-average'),'Reject unsupported season-average claim');
factFixture.league_overview.hot_takes=[{take:'Tetairoa McMillan scored 44.2 points this week.'}];
assert(findInquirerSourceFactIssues(factFixture).some(x=>x.id==='weekly-player-score'),'Reject mismatched weekly player score');
factFixture.league_overview.hot_takes=[{take:'Tetairoa McMillan scored 45.2 points this week.'}];
assert.equal(findInquirerSourceFactIssues(factFixture).length,0,'Accept correct source-grounded weekly points');

factFixture.league_overview.hot_takes=[{take:'Tetairoa McMillan is averaging 45.2 points per game this season.'}];
assert(findInquirerSourceFactIssues(factFixture).some(x=>x.id==='unsupported-player-average'),'Reject unsupported per-game season average');
factFixture.league_overview.hot_takes=[{take:'Tetairoa McMillan finished with 44.2 points.'}];
assert(findInquirerSourceFactIssues(factFixture).some(x=>x.id==='weekly-player-score'),'Reject a mismatched finished-with claim');
factFixture.teams[0].starter_details[0].season_games_played=4;
factFixture.teams[0].starter_details[0].season_total_points=80;
factFixture.league_overview.hot_takes=[{take:'Tetairoa McMillan is averaging 20 points per game this season.'}];
assert.equal(findInquirerSourceFactIssues(factFixture).length,0,'Accept an average with a verified numerator and denominator');
factFixture.league_overview.hot_takes=[{take:'Tetairoa McMillan is averaging 25 points per game this season.'}];
assert(findInquirerSourceFactIssues(factFixture).some(x=>x.id==='unsupported-player-average'),'Reject an average inconsistent with season scoring');

factFixture.teams[0].points=123.4;
factFixture.league_overview.hot_takes=[{take:'Miami Dolphins scored 122.4 points in Week 4.'}];
assert(findInquirerSourceFactIssues(factFixture).some(x=>x.id==='weekly-team-score'),'Reject a misreported current-week team total');
factFixture.league_overview.hot_takes=[{take:'In Week 4, Miami Dolphins scored 123.4 points.'}];
assert.equal(findInquirerSourceFactIssues(factFixture).length,0,'Accept week-qualified source-backed team total');
factFixture.league_overview.hot_takes=[{take:'Miami Dolphins scored 12 points in Week 3.'}];
assert.equal(findInquirerSourceFactIssues(factFixture).length,0,'Do not compare earlier-week facts to the current week score');

factFixture.league_overview.hot_takes=[{take:'Tetairoa McMillan scored 12 points in Week 3.'}];
assert.equal(findInquirerSourceFactIssues(factFixture).length,0,'Older explicitly qualified player results cannot be compared with Week 4 stats');
factFixture.league_overview.hot_takes=[{take:'Tetairoa McMillan scored 12 points in Week 4.'}];
assert(findInquirerSourceFactIssues(factFixture).some(x=>x.id==='weekly-player-score'),'Current-week player scores remain strictly checked');

// Negative IDP scores, missing/invalid denominators and references to older weeks.
const negativeFixture={week:4,teams:[{team_name:'Seattle Seahawks',points:92.5,
 starter_details:[{name:'Defender Example',points:-1.5}],
 inquirer_article:{sections:[{paragraphs:[]}]} }],league_overview:{sections:[],hot_takes:[]}};
function checkTake(take){negativeFixture.league_overview.hot_takes=[{take}];return findInquirerSourceFactIssues(negativeFixture);}
assert.equal(checkTake('Defender Example scored -1.5 points this week.').length,0,'Accept genuine negative IDP weekly score');
assert(checkTake('Defender Example scored -2.5 points this week.').some(x=>x.id==='weekly-player-score'),'Reject incorrect negative IDP score');
assert.equal(checkTake('Defender Example finished with -1.5 points.').length,0,'Accept genuine negative finished-with total');
assert(checkTake('Defender Example finished with -0.5 points.').some(x=>x.id==='weekly-player-score'),'Reject incorrect negative finished-with total');
assert.equal(checkTake('Defender Example scored 8 points in Week 3.').length,0,'Do not equate last week with current week');
assert.equal(checkTake('Defender Example logged two tackles and three assists.').length,0,'Non-fantasy numerical statistics must not be mistaken for point claims');
assert.equal(checkTake('Seattle Seahawks scored 92.5 points in Week 4.').length,0,'Accept verified team weekly points');
assert(checkTake('Seattle Seahawks scored 93.5 points in Week 4.').some(x=>x.id==='weekly-team-score'),'Reject incorrect team weekly points');
negativeFixture.teams[0].starter_details[0].season_total_points=10;
negativeFixture.teams[0].starter_details[0].season_games_played=0;
assert(checkTake('Defender Example is averaging 2.5 points per game this season.').some(x=>x.id==='unsupported-player-average'),'Reject zero-game season average denominator');
negativeFixture.teams[0].starter_details[0].season_games_played=2.5;
assert(checkTake('Defender Example is averaging 4 points per game this season.').some(x=>x.id==='unsupported-player-average'),'Reject fractional games denominator');
negativeFixture.teams[0].starter_details[0].season_games_played=4;
assert.equal(checkTake('Defender Example is averaging 2.5 points per game this season.').length,0,'Accept internally consistent season points and integer games');
assert(checkTake('Defender Example is averaging 2 points per game this season.').some(x=>x.id==='unsupported-player-average'),'Reject incorrect average despite present numerator and denominator');


// Head-to-head facts are checked only when roster IDs corroborate the opponent.
const matchupFixture={week:4,teams:[
 {roster_id:1,opponent_roster_id:2,team_name:'Miami Dolphins',points:120.2,starter_details:[],inquirer_article:{sections:[]}},
 {roster_id:2,opponent_roster_id:1,team_name:'Seattle Seahawks',points:98.4,starter_details:[],inquirer_article:{sections:[]}}
],league_overview:{sections:[],hot_takes:[]}};
const matchupCheck=t=>{matchupFixture.league_overview.hot_takes=[{take:t}];return findInquirerSourceFactIssues(matchupFixture);};
assert.equal(matchupCheck('Miami Dolphins beat Seattle Seahawks 120.2–98.4.').length,0,'Accept exact matchup score');
assert(matchupCheck('Miami Dolphins beat Seattle Seahawks 121.2–98.4.').some(x=>x.id==='matchup-score'),'Reject incorrect matchup winner total');
assert(matchupCheck('Miami Dolphins beat Seattle Seahawks 120.2–99.4.').some(x=>x.id==='matchup-score'),'Reject incorrect opponent total');
assert(matchupCheck('Miami Dolphins lost to Seattle Seahawks 120.2–98.4.').some(x=>x.id==='matchup-result'),'Reject reversed win/loss verb');
assert.equal(matchupCheck('Seattle Seahawks lost to Miami Dolphins 98.4–120.2.').length,0,'Accept reverse-perspective matchup report');
assert.equal(matchupCheck('Miami Dolphins face Seattle Seahawks next week.').length,0,'Future matchup preview has no historical score assertion');
matchupFixture.teams[0].opponent_roster_id=3;
assert.equal(matchupCheck('Miami Dolphins beat Seattle Seahawks 121.2–98.4.').length,0,'Do not guess opponents without matching roster IDs');


matchupFixture.teams[0].league_context={record:{wins:3,losses:1},standings_rank:2};
assert.equal(matchupCheck('Miami Dolphins has a 3-1 record.').length,0,'Accept sourced current team record');
assert(matchupCheck('Miami Dolphins has a 4-1 record.').some(x=>x.id==='team-record'),'Reject wrong W-L record');
assert.equal(matchupCheck('Miami Dolphins ranks in position 2.').length,0,'Accept verified standings rank');
assert(matchupCheck('Miami Dolphins ranks in position 1.').some(x=>x.id==='standings-rank'),'Reject incorrect current standings position');
assert.equal(matchupCheck('Miami Dolphins had a strong Week 3 despite its late loss.').length,0,'Avoid inferring records from ordinary prose');


// Registry is rebuilt from structured edition fields and exposes provenance.
const registryFixture={week:4,teams:[
 {roster_id:1,opponent_roster_id:2,team_name:'Alpha',points:105,league_context:{record:{wins:3,losses:1},standings_rank:2},starter_details:[{name:'IDP Star',points:-2}]},
 {roster_id:2,opponent_roster_id:1,team_name:'Beta',points:90,starter_details:[]}
]};
const registry=buildInquirerEditionFactRegistry(registryFixture);
assert.equal(registry.week,4,'Registry must be scoped to reporting week');
assert.equal(registry.players.get('idp star')[0].source,'edition.team.starter_details','Player scoring records must carry explicit source');
assert.equal(registry.teamScoreRules[0].source,'edition.team.points','Team scores must carry source');
assert.equal(registry.matchups.length,2,'Reciprocal roster links establish two readable matchup perspectives');
assert.equal(registry.matchups[0].source,'edition.teams.reciprocal_opponent_roster_id+points','Matchup scores must expose source fields');
registryFixture.teams[1].opponent_roster_id=8;
assert.equal(buildInquirerEditionFactRegistry(registryFixture).matchups.length,0,'Reject non-reciprocal roster links');
registryFixture.teams[1].opponent_roster_id=1;
registryFixture.teams[0].points=null;
assert.equal(buildInquirerEditionFactRegistry(registryFixture).matchups.length,0,'Missing totals cannot enter matchup fact registry');

console.log('Final Week 11 copy, recap transitions and Week 4 cache protections pass');