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
assert(frontend.includes("cache:(y===2026&&w===4)?'no-store'"),'Week 4 archive fetch must bypass stale browser cache');
const publisher=readFileSync('netlify/functions/league-hub.mjs','utf8');
assert(publisher.includes("if(!weeklyStats||typeof weeklyStats!=='object'||!Object.keys(weeklyStats).length)return latestPublished?"),'Weekly Inquirer publication must fail closed while retaining the most recent published edition when Sleeper stats are unavailable');
assert(publisher.includes('if(!completion.complete)return latestPublished?'),'Unfinished next week must serve the latest already-published edition');
assert(publisher.includes('rows.length!==rosterIds.size'),'Regular-season publication must reject incomplete matchup roster coverage');
assert(publisher.includes('process.env.INQUIRER_APPROVED_THROUGH_WEEK??4'),'Unapproved Week 5 and later must remain unpublished by default');
assert(publisher.includes('if(week>approvedThroughWeek)return latestPublished?'),'Release gate must retain latest published edition without advancing');
assert(publisher.includes('Final published Inquirer quality gate rejected Week'),'Final postprocessor must not bypass editorial-quality gate before publication');
assert(publisher.includes('fetchJson(`${API}/league/${LEAGUE}/transactions/${week}`).catch(()=>null)')&&publisher.includes('!Array.isArray(transactions)'),'Transaction fetch failures must defer publication rather than masquerade as zero trades');
assert(publisher.includes('Promise.resolve(completion.rows)'),'Publication must use the previously finalized Sleeper matchup snapshot without refetching');
assert(publisher.includes('rosters.length!==completion.rows.length'),'Partial roster responses must defer publication');
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
const completeStats={a:{pts:112},b:{pts:90},c:{pts:50},d:{pts:65}};
assert.equal(sandbox.missingPublishedWeekPlayerStats(testRows,completeStats).length,0,'Full scorer coverage must pass');
const partialStats={a:{pts:112},b:{pts:90},d:{pts:65}};
assert.deepEqual(Array.from(sandbox.missingPublishedWeekPlayerStats(testRows,partialStats)),['c'],'Partial raw stats must identify missing nonzero matchup scorers');
const zeroScorerRows=[...testRows,{roster_id:5,matchup_id:3,points:0,players_points:{zero:0}}];
assert.equal(sandbox.missingPublishedWeekPlayerStats(zeroScorerRows,completeStats).length,0,'Players with zero matchup points need not have a raw stats entry');

activeRows=testRows.slice(0,2);
assert.equal((await sandbox.completedPublicationWeek(1)).complete,false,'Partial roster coverage must never publish');
activeRows=testRows.map(x=>({...x}));activeRows[0].points=null;
assert.equal((await sandbox.completedPublicationWeek(1)).complete,false,'Null matchup total must never count as finalized');
activeRows=testRows.map(x=>({...x}));activeRows[0].points='';
assert.equal((await sandbox.completedPublicationWeek(1)).complete,false,'Blank matchup total must never count as finalized');

console.log('Final Week 11 copy, recap transitions and Week 4 cache protections pass');