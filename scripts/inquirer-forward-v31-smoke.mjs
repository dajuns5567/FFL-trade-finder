import assert from 'node:assert/strict';
import week2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {applyInquirerEditorialV31,evaluateInquirerEditionQuality,adaptWeekLanguage,polishForwardTeamCopy,FORWARD_INQUIRER_VERSION,FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';
import {inquirerWeekClassification} from '../netlify/functions/inquirer-reporters.mjs';
import {inspectEditionBeforePublication} from '../netlify/functions/inquirer-publication-guard.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const rawForWeek=(week)=>{
  const teams=clone(week2.teams).map((t,i)=>{
    const bump=((i%5)-2)*1.7+(week-2)*0.9;
    t.week=week;
    t.points=Number((Number(t.points)+bump).toFixed(1));
    t.opponent_points=Number((Number(t.opponent_points)-bump/2).toFixed(1));
    t.won=t.points>t.opponent_points;
    t.week_classification=inquirerWeekClassification(week,2026,t.conference);
    t.league_context=t.league_context||{};
    t.league_context.snapshot_through_week=week;
    t.league_context.games_until_playoffs=Math.max(0,14-week);
    t.league_context.playoff_teams=16;
    t.league_context.playoff_teams_per_conference=8;
    t.league_context.playoff_seed=(i%16)+1;
    t.league_context.inside_playoff_line=t.league_context.playoff_seed<=8;
    t.league_context.division_leader=i%4===0;
    t.starter_details=(t.starter_details||[]).map((p,j)=>({...p,points:Number((Number(p.points)+(j===0?(week-2)*1.1:0)).toFixed(1))}));
    return t;
  });
  const overview=clone(week2.league_overview);
  overview.week=week;
  overview.week_classification=inquirerWeekClassification(week,2026);
  return{rawInquirer:{reporters:clone(week2.reporters),teams},rawOverview:overview};
};

const week3raw=rawForWeek(3),w3class=inquirerWeekClassification(3,2026);
let week3=null,quality=null,lastQuality=null,lastCandidate=null;
for(let salt=0;salt<(process.env.INQUIRER_DEBUG_SINGLE_SALT?1:8);salt++){
  const edited=applyInquirerEditorialV31({season:2026,week:3,...week3raw,previousEdition:week2,weekClassification:w3class,variationSalt:salt});
  const candidate={available:true,season:2026,week:3,inquirer_version:FORWARD_INQUIRER_VERSION,editorial_revision:FORWARD_EDITORIAL_REVISION,teams:edited.inquirer.teams,league_overview:edited.leagueOverview,editorial_generation:{variation_salt:salt}};
  lastCandidate=candidate;
  const q=evaluateInquirerEditionQuality(candidate,week2);lastQuality=q;
  if(q.ok){week3=candidate;quality=q;break}
}
const badTeams=(lastQuality?.issues||[]).filter(x=>x.id==='plural-team-agreement').map(x=>x.team);
const badAgreement=(lastCandidate?.teams||[]).flatMap(t=>[t.inquirer_article?.headline,...(t.inquirer_article?.paragraphs||[])]).concat(
  ...(lastCandidate?.league_overview?.sections||[]).flatMap(s=>[s.heading,...(s.paragraphs||[])]),
  ...(lastCandidate?.league_overview?.hot_takes||[]).flatMap(h=>[h.title,h.take])).filter(s=>badTeams.some(name=>String(s||'').toLowerCase().includes(name.toLowerCase())&&new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' (?:does|gets|has|is|needs|sits|keeps|projects)\\b','i').test(String(s||'')))).slice(0,8);
const copyEntities=[...lastCandidate.teams,...week2.teams].flatMap(t=>[t.team_name,t.manager_name,t.opponent_name,t.next_opponent_name,...(t.starter_details||[]).map(p=>p.name)]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
const copyEscape=value=>[...String(value)].map(ch=>".*+?^$(){}|[]".includes(ch)||ch.charCodeAt(0)===92?'\\'+ch:ch).join('');
const copyNorm=value=>{
 let out=String(value||'');
 for(const entity of copyEntities)out=out.replace(new RegExp(copyEscape(entity),'gi'),'[ENTITY]');
 return out.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,'[#]').replace(/\\s+/g,' ').trim();
};
const copiedExamples=(lastCandidate?.teams||[]).filter(t=>['Tampa Bay Buccaneers','Seattle Seahawks'].includes(t.team_name)).map(t=>{
 const prev=week2.teams.find(p=>String(p.roster_id)===String(t.roster_id));
 const sentences=x=>String((x?.inquirer_article?.paragraphs||[]).join(' ')).split(/(?<=[.!?])\\s+/).map(y=>y.trim()).filter(y=>y.split(/\\s+/).length>=10);
 const prior=new Set(sentences(prev).map(copyNorm));
 return{team:t.team_name,reused:sentences(t).filter(y=>prior.has(copyNorm(y))).slice(0,8)};
});
assert.ok(week3,'Forward engine must find a non-copying Week 3 variant within the live retry budget; last quality='+JSON.stringify(lastQuality)+'; grammar excerpts='+JSON.stringify(badAgreement)+'; repeated content='+JSON.stringify(copiedExamples));
assert.equal(week3.teams.length,32);
assert.equal(week3.inquirer_version,31);
assert.equal(week3.editorial_revision,FORWARD_EDITORIAL_REVISION);
assert.match(week3.league_overview.headline,/Week 3/);
assert.ok(week3.teams.every(t=>Number(t.inquirer_article?.week)===3),'Every Week 3 team article must carry the current week');
const w3copy=[...week3.teams.flatMap(t=>t.inquirer_article?.paragraphs||[]),...(week3.league_overview?.sections||[]).flatMap(s=>s.paragraphs||[])].join(' ');
assert.doesNotMatch(w3copy,/\bWeek 2 gets its own newspaper\b/i,'Forward edition must not retain Week 2 publication framing');
assert.doesNotMatch(w3copy,/could not turn the came in result/i,'Lexical freshness must not corrupt the result idiom');

// Protect later weeks against a regression into copied Week 2 phrasing.
// Scores stay paired exactly as in the 32-team fixture so matchup integrity
// remains independently checked; only the week label and editorial history
// change. The locked Week 4 edition is not rewritten or stored by this test.
const realisticForwardRaw=week=>{
  const teams=clone(week2.teams).map(t=>({...t,week,week_classification:inquirerWeekClassification(week,2026,t.conference)}));
  const overview=clone(week2.league_overview);
  overview.week=week;
  overview.week_classification=inquirerWeekClassification(week,2026);
  return{rawInquirer:{reporters:clone(week2.reporters),teams},rawOverview:overview};
};
let editorialSweep=0,week5NarrativeMetrics=null;
for(const week of [5,6,9,14]){
  const raw=realisticForwardRaw(week),classification=inquirerWeekClassification(week,2026);
  for(const salt of (week===5?[0,1,5]:[5])){
    const drafted=applyInquirerEditorialV31({season:2026,week,...raw,previousEdition:week2,weekClassification:classification,variationSalt:salt});
    const edition={season:2026,week,teams:drafted.inquirer.teams,league_overview:drafted.leagueOverview};
    assert.ok(edition.teams.every(t=>!/\b(?:Make|Makes) this Sunday\b/.test(String(t.inquirer_article?.headline||''))),'Forward headlines must use title-case This');
    const audit=inspectEditionBeforePublication(edition);
    const fanDiagnostics=audit.issues.filter(x=>x.id==='fan-sentiment').map(x=>({team:x.team,sections:edition.teams.find(t=>t.team_name===x.team)?.inquirer_article?.sections?.filter(s=>s.kind==='sentiment').map(s=>s.paragraphs?.map(p=>String(p).length))}));
    assert.ok(audit.ok,'Week '+week+' salt '+salt+' failed publication copy audit: '+JSON.stringify(audit.issues.slice(0,8))+'; fan details='+JSON.stringify(fanDiagnostics));
    assert.ok(edition.teams.every(t=>!/(?:could not turn the came in result|eligible option|fleeced signal)/i.test((t.inquirer_article?.paragraphs||[]).join(' '))),'Forward copy must not contain malformed or meta prose');
    const q=evaluateInquirerEditionQuality(edition,week2);
    const badGrammarTeams=q.issues.filter(x=>x.id==='plural-team-agreement').map(x=>x.team);
    const grammarExamples=badGrammarTeams.flatMap(name=>{
      const rows=[...edition.teams.flatMap(t=>[t.inquirer_article?.headline,...(t.inquirer_article?.paragraphs||[])]),
        ...(edition.league_overview.sections||[]).flatMap(sec=>sec.paragraphs||[])];
      return rows.filter(line=>String(line).includes(name)&&/ (?:has|is|does|gets|sits|needs|keeps|faces|projects)\\b/i.test(String(line))).slice(0,6);
    });
    assert.ok(q.ok,'Week '+week+' salt '+salt+' repeated editorial scaffolds: '+JSON.stringify(q.issues.slice(0,8))+'; grammar examples: '+JSON.stringify(grammarExamples));
    if(week===5&&salt===0){
      const sections=edition.teams.map(t=>t.inquirer_article.sections||[]),orders=new Set(sections.map(rows=>rows.map(s=>s.kind).join('|')));
      const leads=sections.map(rows=>(rows.find(s=>s.kind==='lede')?.paragraphs||[]).length);
      const management=sections.map(rows=>(rows.find(s=>s.kind==='management')?.paragraphs||[]).length);
      week5NarrativeMetrics={distinct_section_orders:orders.size,maximum_lede_paragraphs:Math.max(...leads),maximum_management_paragraphs:Math.max(...management),mean_team_paragraphs:Number((edition.teams.reduce((n,t)=>n+(t.inquirer_article.paragraphs||[]).length,0)/32).toFixed(2))};
    }
    assert.ok(edition.teams.every(t=>!/\b(?:the last\s+){2,}two (?:weeks|Sundays)\b|\bthe first the last two\b/i.test((t.inquirer_article?.paragraphs||[]).join(' '))),'Forward copy must never double the last-two-weeks phrase');
    editorialSweep++;
  }
}

// Test a real editorial handoff between two freshly generated adjacent weeks.
// Merely comparing Week 6 to a preloaded Week 2 fixture misses the exact
// previous-week repetition that has repeatedly reached the site.
const adjacentFiveRaw=realisticForwardRaw(5);
const adjacentFiveDraft=applyInquirerEditorialV31({season:2026,week:5,...adjacentFiveRaw,
 previousEdition:week2,weekClassification:inquirerWeekClassification(5,2026),variationSalt:5});
const adjacentFive={season:2026,week:5,published_locked:true,teams:adjacentFiveDraft.inquirer.teams,
 league_overview:adjacentFiveDraft.leagueOverview};
const adjacentSixRaw=realisticForwardRaw(6);
let adjacentSix=null,adjacentFailures=[];
for(const salt of [5,0,1]){
 const draft=applyInquirerEditorialV31({season:2026,week:6,...adjacentSixRaw,
  previousEdition:adjacentFive,weekClassification:inquirerWeekClassification(6,2026),variationSalt:salt});
 const candidate={season:2026,week:6,teams:draft.inquirer.teams,league_overview:draft.leagueOverview};
 const audit=inspectEditionBeforePublication(candidate);
 const quality=evaluateInquirerEditionQuality(candidate,adjacentFive);
 if(audit.ok&&quality.ok){adjacentSix=candidate;break}
 adjacentFailures.push({salt,audit:audit.issues.slice(0,6),quality:quality.issues.slice(0,6)});
}
assert.ok(adjacentSix,'Week 6 candidate search must produce fresh copy after generated Week 5: '+JSON.stringify(adjacentFailures));

const week9raw=rawForWeek(9),week9=applyInquirerEditorialV31({season:2026,week:9,...week9raw,previousEdition:week3,weekClassification:inquirerWeekClassification(9,2026),variationSalt:2});
assert.ok((week9.leagueOverview.sections||[]).some(s=>s.heading==='The Playoff Race Is No Longer Background Noise'),'Late regular-season edition must introduce explicit playoff-race coverage');

const week14raw=rawForWeek(14);
week14raw.rawInquirer.teams=week14raw.rawInquirer.teams.map((t,i)=>({...t,playoff_context:{
  made_playoffs:i<16,
  alive:i<8,
  eliminated:i>=8&&i<16,
  eliminated_week:i>=8&&i<16?14:null,
  eliminated_this_week:i>=8&&i<16,
  advanced_this_week:i<8,
  champion:false,
  runner_up:false,
  current_round:(t.conference?t.conference+' ':'')+'Wildcard Round',
  next_round:(t.conference?t.conference+' ':'')+'Divisional Round'
}}));
const week14=applyInquirerEditorialV31({season:2026,week:14,...week14raw,previousEdition:week3,weekClassification:inquirerWeekClassification(14,2026),variationSalt:3});
const playoffCopy=[...week14.inquirer.teams.flatMap(t=>t.inquirer_article?.paragraphs||[]),...(week14.leagueOverview.sections||[]).flatMap(s=>s.paragraphs||[])].join(' ');
assert.match(playoffCopy,/eliminated from championship contention/i,'Wildcard edition must identify eliminated playoff teams');
assert.match(playoffCopy,/advances to .*Divisional Round/i,'Wildcard edition must identify teams advancing to the Divisional Round');
assert.ok((week14.leagueOverview.sections||[]).some(s=>/Wildcard Round: Who Advanced and Who Went Home/.test(String(s.heading||''))),'Wildcard recap must include explicit round advancement/elimination section');

// Zero- and near-zero-score regression: no journalist may invent a productive trio.
for(const [scenario,scorerPoints] of [['shutout',[0,0,0,0,0,0,0]],['one-scorer',[1.4,0,0,0,0,0,0]]]){
  const raw=realisticForwardRaw(5);
  raw.rawInquirer.teams=raw.rawInquirer.teams.map((t,i)=>i<4?{...t,
    points:scorerPoints.reduce((sum,p)=>sum+p,0),opponent_points:35,won:false,
    starter_details:(t.starter_details||[]).map((p,j)=>({...p,points:scorerPoints[j]||0}))
  }:t);
  const drafted=applyInquirerEditorialV31({season:2026,week:5,...raw,previousEdition:week2,weekClassification:inquirerWeekClassification(5,2026),variationSalt:5});
  for(const t of drafted.inquirer.teams.slice(0,4)){
    const players=t.inquirer_article.sections.find(s=>s.kind==='players');
    const copy=(players?.paragraphs||[]).join(' ');
    assert.doesNotMatch(copy,/enough real scoring|a real scoring spine|usable top end|sustainable instead of solitary|supporting scorer|enough real food|actual voltage|proper center of gravity/i,
      scenario+' must not invent multiple producers for '+t.team_name);
    assert.match(copy,scenario==='shutout'?/0[.]0|zeroes|zero/i:/1[.]4|one contribution|one meaningful/i,
      scenario+' must explain the thin production for '+t.team_name);
  }
}

// Live-preview regressions: forward-week language, real records, headline agreement,
// and partial opponent projections must never be represented as complete forecasts.
assert.equal(adaptWeekLanguage('the first two weeks describe a repeatable lineup',5),'the last two weeks describe a repeatable lineup');
for(const [source,expected] of [
 ['the last two weeks','the last two weeks'],
 ['across the last two weeks','across the last two weeks'],
 ['The last two weeks','The last two weeks'],
 ['the first two Sundays','the last two Sundays'],
 ['The last the last two weeks','The last two weeks'],
 ['across the last the last two Sundays','across the last two Sundays']
])assert.equal(adaptWeekLanguage(source,5),expected,'Week language must not double-normalize: '+source);

const handReview=polishForwardTeamCopy([
 {roster_id:'1',team_name:'Baltimore Ravens',next_opponent_roster_id:'2',next_opponent_name:'Kansas City Chiefs',next_projected:102.1,next_projection_coverage:7,next_opponent_projected:1.35,
  inquirer_article:{headline:'Baltimore Ravens Banks Another Sunday and Raises the Standard',sections:[
   {kind:'outlook',paragraphs:['The forecast gives Baltimore Ravens 102.1 and Kansas City Chiefs 1.4. Baltimore Ravens are favored by 100.8.']},
   {kind:'sentiment',paragraphs:['The Ravens are 2-0 and the crowd is getting loud.']},
   {kind:'management',paragraphs:['We must test whether the first the last two weeks describe a pattern.']}
  ]}},
 {roster_id:'2',team_name:'Kansas City Chiefs',next_opponent_roster_id:'1',next_opponent_name:'Baltimore Ravens',next_projected:1.35,next_projection_coverage:4,next_opponent_projected:102.1,
  inquirer_article:{headline:'Kansas City Chiefs Exposed Its Own Weak Spot',sections:[]}}
],5,5);
assert.match(handReview[0].inquirer_article.headline,/Ravens Bank Another Sunday and Raise/);
assert.match(handReview[1].inquirer_article.headline,/Exposed Their Own Weak Spot/);
assert.match(handReview[0].inquirer_article.paragraphs.join(' '),/Kansas City Chiefs \(4 projected starters\)/);
assert.doesNotMatch(handReview[0].inquirer_article.paragraphs.join(' '),/100\.8/);
assert.match(handReview[0].inquirer_article.paragraphs.join(' '),/Ravens have won their last two games/);
assert.doesNotMatch(handReview[0].inquirer_article.paragraphs.join(' '),/the first the last two weeks/);

console.log(JSON.stringify({ok:true,editorial_sweep:editorialSweep,week3_quality:quality?.metrics||{},week5_narrative:week5NarrativeMetrics,week3_headline:week3.league_overview.headline,week9_playoff_race:true,week14_round:true},null,2));
