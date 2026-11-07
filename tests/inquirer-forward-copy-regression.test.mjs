import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');
test('revision 62 keeps reviewed Week 5 recycled prose out of source templates',()=>{
 for(const phrase of [
  'supplies the new reference point this week',
  'be read aloud before the mock hearing begins',
  'needing a specific plan for ',
  'schedule offers no free results',
  'is to make that contribution less lonely'
 ])assert.equal(source.includes(phrase),false,'recycled narrative scaffold: '+phrase);
});
test('a modest projected gap is not called heavily favored',()=>{
 assert.match(source,/gap<12\?"favored":"strongly favored"/);
 assert.doesNotMatch(source,/gap<8\?"modestly favored":"heavily favored"/);
});

test('forward editions compare with multiple locked historical weeks, not just the immediately preceding edition',()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert.match(hub,/const historicalEditorialMemory=\[\]/);
 assert.match(hub,/oldWeek=Math\.max\(1,week-4\)/);
 assert.match(hub,/isLockedInquirerEdition\(archived,season,oldWeek\)/);
 assert.match(hub,/inspectPreviousWeekEditorialReuse\(candidate,old\)/);
 assert.match(hub,/if\(archivalReuse\.length\)\{q\.issues\.push\(\.\.\.archivalReuse\);q\.ok=false\}/);
});
test('forward humor is not a single reporter-wide repeated tagline',()=>{
 assert.match(source,/const kicker=\[/);
 assert.match(source,/Number\(t\.roster_id\)/);
 assert.doesNotMatch(source,/sentiment\.paragraphs\.push\(joke\)/);
});


import {finishReviewedForwardCopy,polishReviewedGrammar} from '../netlify/functions/inquirer-reviewed-copy.mjs';
import {attributeForwardPlayerStatFragments} from '../netlify/functions/inquirer-narrative-architecture.mjs';
import {inquirerMarketCutoff,snapshotsThroughEdition,editionAvailability} from '../netlify/functions/lib/inquirer-market-window.mjs';

test('the final reader boundary removes late short market scaffolds while retaining the ledger',()=>{
 const teams=['North Birds','South Dogs','East Cats','West Foxes'].map((name,i)=>({roster_id:i+1,team_name:name,opponent_name:'Other Bears',inquirer_article:{sections:[{kind:'value',paragraphs:['Value before: 100. Value after: 110. '+name+' still had to play Other Bears and scored 70.0.']} ]}}));
 finishReviewedForwardCopy({week:5,teams});
 for(const t of teams){assert.match(t.inquirer_article.paragraphs.join(' '),/Value before: 100/);assert.doesNotMatch(t.inquirer_article.paragraphs.join(' '),/still had to play/)}
});

test('archive originality starts at Week 5 and the final sweep sees every supplied edition',()=>{
 const sentence='Red ink ruined another attempt to pretend that the fantasy roster market had stopped moving altogether.';
 const t={roster_id:1,team_name:'North Birds',inquirer_article:{sections:[{kind:'value',paragraphs:['North Birds lost 120 valuation points. '+sentence]}]}};
 const before=JSON.stringify(t);const old={week:2,teams:[structuredClone(t)]};
 finishReviewedForwardCopy({week:5,teams:[t]},[old]);
 assert.doesNotMatch(t.inquirer_article.paragraphs.join(' '),/Red ink/);assert.equal(JSON.stringify(old.teams[0]),before);
 const historical={week:4,teams:[structuredClone(old.teams[0])]};const frozen=JSON.stringify(historical);finishReviewedForwardCopy(historical,[old]);assert.equal(JSON.stringify(historical),frozen);
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');assert.match(hub,/if\(week>=5\)\{\s*for\(let oldWeek/);assert.match(hub,/previousEditions:historicalEditorialMemory/);
});

test('club agreement respects the actual subject and removes late newsroom prefixes',()=>{
 const names=['New York Jets','Washington Commanders','Seattle Seahawks'];
 assert.equal(polishReviewedGrammar('New York Jets does need help.',names),'New York Jets do need help.');
 assert.equal(polishReviewedGrammar('New York Jets still needs help.',names),'New York Jets still need help.');
 assert.equal(polishReviewedGrammar('87.5 points against Seattle Seahawks are the one detail.',names),'87.5 points against Seattle Seahawks is the one detail.');
 assert.equal(polishReviewedGrammar('The final score against New York Jets do not erase the work.',names),'The final score against New York Jets does not erase the work.');
 assert.equal(polishReviewedGrammar('The optimism around Washington Commanders are understandable.',names),'The optimism around Washington Commanders is understandable.');
 assert.equal(polishReviewedGrammar('The next test against Seattle Seahawks are difficult.',names),'The next test against Seattle Seahawks is difficult.');
 assert.equal(polishReviewedGrammar('Nicely put, but: A 11.7-point loss.',names),'An 11.7-point loss.');
});

test('a stat fragment inside a paragraph is attributed only by a unique recorded stat match',()=>{
 const t={starter_details:[{name:'Verified Receiver',real_stats:{rec:7,rec_tgt:11,rec_yd:118}}],inquirer_article:{sections:[{kind:'players',paragraphs:['The quarterback led the team. 7 catches on 11 targets for 118 yards.']} ]}};
 attributeForwardPlayerStatFragments(t);assert.match(t.inquirer_article.paragraphs[0],/Verified Receiver recorded 7 catches/);
 t.starter_details.push({name:'Ambiguous Receiver',real_stats:{rec:7,rec_tgt:11,rec_yd:118}});t.inquirer_article.sections[0].paragraphs=['7 catches on 11 targets for 118 yards.'];attributeForwardPlayerStatFragments(t);assert.doesNotMatch(t.inquirer_article.paragraphs[0],/Receiver recorded/);
});

test('edition market selection excludes subsequent snapshots and never guesses a missing window',()=>{
 const cutoff=inquirerMarketCutoff({game_starts:['2026-10-11T17:00:00Z','2026-10-13T00:15:00Z']});
 assert.equal(cutoff,'2026-10-14T00:15:00.000Z');
 const snapshots=[{t:'2026-10-06T01:00:00Z'},{t:'2026-10-13T22:00:00Z'},{t:'2026-10-31T01:00:00Z'}];
 assert.equal(snapshotsThroughEdition(snapshots,cutoff).length,2);assert.deepEqual(snapshotsThroughEdition(snapshots,'invalid'),[]);assert.equal(inquirerMarketCutoff({}),null);
 assert.deepEqual(snapshotsThroughEdition(snapshots,null),snapshots);
});

test('preview manager provenance uses only completed issue-week games and cannot write shared keys',async()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const body=hub.slice(hub.indexOf('async function managerHistory('),hub.indexOf('async function awardHighs('));
 const rosters=Array.from({length:32},(_,i)=>({roster_id:i+1,owner_id:'u'+i,settings:{wins:9,losses:0,division:1}}));
 const users=rosters.map((r,i)=>({user_id:r.owner_id,display_name:'Manager '+i}));
 const fetchJson=async url=>url.endsWith('/state/nfl')?{season:2026,week:10}:url.endsWith('/rosters')?rosters:url.endsWith('/users')?users:url.endsWith('/winners_bracket')?[]:/\/matchups\/\d+$/.test(url)?rosters.map((r,i)=>({roster_id:r.roster_id,matchup_id:Math.floor(i/2)+1,points:i%2?50:100})):{league_id:'fixture',season:'2026',settings:{playoff_week_start:15}};
 const scoring=(games,_career,season,week)=>({games,through_season:season,through_week:week-1});
 const build=new Function('fetchJson','store','LEAGUE','API','VERIFIED_HISTORICAL_MANAGER_ASSIGNMENTS','sleeperConference','managerScoringSummary','MANAGER_CACHE_VERSION',body+';return managerHistory;')(fetchJson,()=>{throw Error('Shared store must not be accessed')},'fixture','https://sleeper.invalid',{},()=> 'AFC',scoring,Number(hub.match(/MANAGER_CACHE_VERSION=(\d+)/)[1]));
 const result=await build({persist:false,snapshotSeason:2026,snapshotWeek:5});
 assert.equal(result.current.length,32);assert.equal(result.career[0].wins,5);assert.equal(result.career[1].losses,5);assert.equal(result.scoring_history.through_week,5);assert.ok(result.games.every(g=>g.week<=5));assert.equal(result.preview_read_only,true);
});

test('current injury tags cannot masquerade as a historical next-week designation',()=>{
 const current={schedule_verified:true,bye_players:[{id:'bye'}],injury_players:[{id:'new-injury'}],injury_current_starters:[{id:'new-injury'}]};
 const old=editionAvailability(current,5,8);assert.deepEqual(old.injury_players,[]);assert.deepEqual(old.bye_players,current.bye_players);assert.equal(old.historical_injury_status_unavailable,true);assert.equal(current.injury_players.length,1);assert.equal(editionAvailability(current,7,8),current);
});

test('archive cleanup preserves recorded player evidence while still removing old commentary',async()=>{
 const {isRecordedPlayerStatSentence}=await import('../netlify/functions/inquirer-reviewed-copy.mjs');
 const stats='Verified Receiver recorded 7 catches on 11 targets for 118 yards, 1 receiving touchdown.';
 assert.equal(isRecordedPlayerStatSentence(stats),true);assert.equal(isRecordedPlayerStatSentence(stats.slice(0,-1)+' and the manager should resign.'),false);
 const lead='Against South Cats, Verified Receiver led the Birds with 18.8 fantasy points; receiving: 7/11 rec, 118 yds, 1 TD.';
 const t={roster_id:1,team_name:'North Birds',opponent_name:'South Cats',starter_details:[{name:'Verified Receiver',points:18.8}],inquirer_article:{sections:[{kind:'players',paragraphs:[lead,stats]}]}};
 finishReviewedForwardCopy({week:5,teams:[t]},[{week:2,teams:[structuredClone(t)]}]);
 assert.deepEqual(t.inquirer_article.sections[0].paragraphs,[lead,stats]);
});

test('a thin no-swap management desk receives genuine scoring concentration instead of a fabricated bench option',()=>{
 const t={roster_id:1,team_name:'North Birds',opponent_name:'South Cats',points:100,opponent_points:80,best_lineup_miss:null,starter_details:[{name:'Verified Receiver',points:40}],inquirer_article:{sections:[{kind:'management',paragraphs:['The recorded starters won this matchup.']}]}};
 finishReviewedForwardCopy({week:5,teams:[t]});const copy=t.inquirer_article.paragraphs.join(' ');assert.match(copy,/40.0%/);assert.match(copy,/other starters supplied 60.0 points/);assert.match(copy,/20.0-point winning margin/);assert.doesNotMatch(copy,/substitution|reserve/);
});


test('Week 7 final writer removes the inherited transaction-wire joke only when reporting depth survives',async()=>{
 const {pruneForwardTransactionWireSlogans}=await import('../netlify/functions/inquirer-editorial-v31.mjs');
 const wire='Example Manager stayed off the Week 7 transaction wire. That means Example Player at 7.5 points is the management headline, not a move count.';
 const actual='Example Player recorded 7.5 fantasy points for the chosen lineup. The verified team score was 104.2 against Opponent Club, whose final total was 102.1. The manager must assess this recorded output before the next game.';
 const extra='The certified Week 7 results contain a specific lineup, individual player returns, opponents and a completed scoreboard. The manuscript retains independently sourced football analysis and does not need the inherited newspaper joke to describe the selected team. '.repeat(15);
 const team={roster_id:9,inquirer_article:{sections:[
  {kind:'management',paragraphs:[wire,actual]},
  {kind:'players',paragraphs:[extra]}
 ]}};
 const locked=structuredClone(team);
 pruneForwardTransactionWireSlogans([team]);
 assert.doesNotMatch(team.inquirer_article.paragraphs.join(' '),/stayed off the Week 7 transaction wire/);
 assert.match(team.inquirer_article.paragraphs.join(' '),/Example Player recorded 7.5 fantasy points/);
 assert.deepEqual(locked.inquirer_article.sections[0].paragraphs,[wire,actual]);
 const short={roster_id:10,inquirer_article:{sections:[{kind:'management',paragraphs:[wire,actual]}]}};
 pruneForwardTransactionWireSlogans([short]);
 assert.match(short.inquirer_article.sections[0].paragraphs.join(' '),/transaction wire/,'underlength manuscript remains held, not silently shortened');
});

test('revision 100 fixes final recap originality without relaxing the independent deep quality checks',()=>{
 assert.match(source,/FORWARD_EDITORIAL_REVISION=100/);
 assert.match(source,/if\(week>=7&&week%2===1\)/);
 assert.match(source,/previousNorm=new Set\(forwardRecapSentences\(previousEdition\)/);
 assert.match(source,/if\(collisions\.length\)/);
});


test('shared Week 7 newsroom boilerplate can be pruned without losing scoring facts or shrinking under publication floors',async()=>{
 const {pruneForwardSharedEditorialBoilerplate}=await import('../netlify/functions/inquirer-editorial-v31.mjs');
 const stock='Someone announced the season was over before bothering to read the actual box score.';
 const managers='The owner selected Player Alpha and recorded the result instead of pretending to forecast it. Verified Reporter credited 18.6 fantasy points to Player Alpha. The starting team completed its contest against Opponent Bears.';
 const filler='This roster has a verifiable week with a completed lineup and an independently counted set of selected player performances. The game was contested against the scheduled opponent, rather than a fictional rival. '.repeat(15);
 const teams=Array.from({length:5},(_,i)=>({roster_id:i+1,team_name:'Club '+String.fromCharCode(65+i),
  opponent_name:'Opponent Bears',inquirer_article:{sections:[
   {kind:'management',paragraphs:[stock,managers]},
   {kind:'players',paragraphs:[filler]}]}}));
 pruneForwardSharedEditorialBoilerplate(teams);
 for(const team of teams){
  const prose=team.inquirer_article.paragraphs.join(' ');
  assert.doesNotMatch(prose,/Someone announced the season was over/);
  assert.match(prose,/18.6 fantasy points/);
  assert.ok(prose.trim().split(/\s+/).length>=300);
 }
 const short=Array.from({length:5},(_,i)=>({roster_id:i+1,team_name:'Short Club '+i,
  inquirer_article:{sections:[{kind:'management',paragraphs:[stock,managers]}]}}));
 pruneForwardSharedEditorialBoilerplate(short);
 assert.match(short[0].inquirer_article.sections[0].paragraphs.join(' '),/Someone announced/);
});

test('final Week 7 recap removes copied rhetoric only when substantive reporting remains',async()=>{
 const {pruneFinalRecapCopyForward}=await import('../netlify/functions/inquirer-editorial-v31.mjs');
 const recurring='The season standings still owe this club an explanation before the next whistle blows.';
 const evidence='North Birds finished Week 7 on 115.3 points against South Cats at 108.2, a 7.1-point outcome from a completed matchup. The club remains in the title race because its accumulated results, rather than last week\'s rhetoric, place it among the leaders.';
 const old={league_overview:{sections:[{blocks:[{kind:'lead',paragraphs:[recurring]}],paragraphs:[recurring]}]}};
 const current={sections:[{blocks:[{kind:'lead',paragraphs:[recurring,evidence]}],paragraphs:[recurring,evidence]}]};
 const frozen=structuredClone(old);
 const clean=pruneFinalRecapCopyForward(current,old,[]);
 assert.deepEqual(clean.sections[0].blocks[0].paragraphs,[evidence]);
 assert.deepEqual(old,frozen,'locked prior week remains immutable');
 const thin={sections:[{blocks:[{kind:'lead',paragraphs:[recurring]}],paragraphs:[recurring]}]};
 const held=pruneFinalRecapCopyForward(thin,old,[]);
 assert.deepEqual(held.sections[0].blocks[0].paragraphs,[recurring],'thin beat stays blocked, not silently erased');
});

test('Week 7 inherited slogans are replaced with verified lineup and division evidence',async()=>{
 const {replaceForwardInheritedWeek7Slogans}=await import('../netlify/functions/inquirer-editorial-v31.mjs');
 const team={roster_id:11,team_name:'South Bears',opponent_name:'North Hawks',points:115.3,
  opponent_points:109.2,division_context:{division_name:'AFC West'},
  league_context:{standings_rank:8},
  starter_details:[{name:'Player A',points:7.5},{name:'Player B',points:21}],
  inquirer_article:{sections:[
   {kind:'management',paragraphs:['Manager A stayed off the Week 7 transaction wire. That means Player A at 7.5 is the management headline, not a move count.']},
   {kind:'outlook',paragraphs:['The Bears enter Week 7 with division leverage still available. The season has a lot left to decide.']}
  ]}};
 const old=structuredClone(team);
 replaceForwardInheritedWeek7Slogans([team],7);
 const text=team.inquirer_article.paragraphs.join(' ');
 assert.doesNotMatch(text,/transaction wire|division leverage still available/i);
 assert.match(text,/Player A/);
 assert.match(text,/7\.5/);
 assert.match(text,/115\.3/);
 assert.match(text,/North Hawks/);
 assert.match(text,/AFC West/);
 assert.match(text,/8/);
 assert.match(text,/The season has a lot left to decide/);
 assert.match(old.inquirer_article.paragraphs?.join(' ')||old.inquirer_article.sections[0].paragraphs[0],/transaction wire/);
});
test('Week 7 slogan repair never guesses absent scoreboard or standings facts',async()=>{
 const {replaceForwardInheritedWeek7Slogans}=await import('../netlify/functions/inquirer-editorial-v31.mjs');
 const wire='Manager A stayed off the Week 7 transaction wire. That means an old lineup is the management headline, not a move count.';
 const division='The Bears enter Week 7 with division leverage still available.';
 const team={roster_id:12,team_name:'South Bears',inquirer_article:{sections:[
  {kind:'management',paragraphs:[wire]},{kind:'outlook',paragraphs:[division]}
 ]}};
 replaceForwardInheritedWeek7Slogans([team],7);
 assert.deepEqual(team.inquirer_article.sections.map(s=>s.paragraphs[0]),[wire,division]);
 const withFacts=structuredClone(team);
 withFacts.points=115.3;withFacts.opponent_points=109.2;withFacts.starter_details=[{name:'Player A',points:7.5}];
 withFacts.opponent_name='North Hawks';withFacts.division_context={division_name:'AFC West'};
 withFacts.league_context={standings_rank:8};
 replaceForwardInheritedWeek7Slogans([withFacts],6);
 assert.deepEqual(withFacts.inquirer_article.sections.map(s=>s.paragraphs[0]),[wire,division]);
});
