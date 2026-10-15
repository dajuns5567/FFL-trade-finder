import assert from 'node:assert/strict';
import {applyInquirerEditorialClarity} from '../netlify/functions/inquirer-editorial-clarity.mjs';
const mk=(week)=>({teams:[{team_name:'Miami Dolphins',next_opponent_name:'New York Jets',starter_details:[{name:'Tetairoa McMillan',points:45.2},{name:'Jonathan Taylor',points:22.3}],inquirer_article:{week,reporter:{id:'walter-mercer'},sections:[{kind:'players',paragraphs:['The star back set the level for Miami Dolphins.','The star receiver gave the lineup a second foothold.']},{kind:'outlook',paragraphs:['The next opponent still gets a vote on whether the strength travels.']}]}}],league_overview:{sections:[{blocks:[{heading:'The Next Edition Is Not Written Yet',paragraphs:['The useful question is whether the lineup repeats itself.']}]}]}});
const old=mk(3),frozen=JSON.stringify(old);applyInquirerEditorialClarity(old,{week:3});assert.equal(JSON.stringify(old),frozen,'Weeks 1–3 must be immutable');
const current=mk(4);applyInquirerEditorialClarity(current,{week:4});const article=current.teams[0].inquirer_article;assert(!article.paragraphs.some(p=>/^The star (back|receiver)/.test(p)),'anonymous athletes must be removed');assert(article.paragraphs.some(p=>p.includes('Tetairoa McMillan')&&p.includes('45.2')),'opponent outlook must use named player data');assert(article.paragraphs.some(p=>p.includes('New York Jets')),'next opponent must appear explicitly');assert(article.paragraphs.some(p=>/souvenirs|scouting|lineup|subscription|points|kickoff|scoreboard/i.test(p)),'opponent-based reporter commentary must survive');assert(current.league_overview.sections[0].blocks[0].heading==='The Week Ahead','recap meta headline rewritten');const referenceCase=mk(4);
referenceCase.teams[0].starter_details.push({name:'Alvin Kamara',points:20},{name:'Josh Downs',points:12});
referenceCase.teams[0].inquirer_article.sections[0].paragraphs=[
 'The high-end back supplied the anchor. Alvin spent 2025 averaging 9.2 points.',
 'That is enough decline to demand a Week 5 answer.',
 'Josh did not need the headline; the value was in the lineup depth.'
];
applyInquirerEditorialClarity(referenceCase,{week:4});
const references=referenceCase.teams[0].inquirer_article.sections[0].paragraphs.join(' ');
assert(!references.includes('The high-end back'),'anonymous opening must be removed');
assert(references.includes('Alvin Kamara spent'),'unique first-name alias must become full name');
assert(!references.includes('That is enough decline'),'contextless filler must be removed');
assert(references.includes('Josh Downs did not need'),'unambiguous Josh alias must be expanded');
const claims=mk(4);
claims.teams[0].inquirer_article.sections.unshift({kind:'management',paragraphs:[
 'The manager added Joe Mixon and dropped Zaire Franklin. The new names reached no Week 4 lineup.',
 'The bench choice deserves a serious look.'
]});
claims.teams[0].inquirer_article.facts={best_lineup_miss:{gap:17.5,starter:{name:'Nik Bonitto'},reserve:{name:'Nick Emmanwori'}}};
applyInquirerEditorialClarity(claims,{week:4});
const management=claims.teams[0].inquirer_article.sections.find(sec=>sec.kind==='management').paragraphs.join(' ');
assert(!management.includes('Joe Mixon')&&!management.includes('Zaire Franklin'),'unverified claims cannot appear as completed transactions');
assert(management.includes('Nick Emmanwori')&&management.includes('Nik Bonitto')&&management.includes('17.5'),'replace with a verified lineup miss');
const prose=mk(4);
prose.teams[0].inquirer_article.sections[0].paragraphs=[
 'On the same lineup, Miami Dolphins won the matchup.',
 'Miami Dolphins should have played its stronger lineup.'
];
applyInquirerEditorialClarity(prose,{week:4});
assert(!prose.teams[0].inquirer_article.paragraphs.join(' ').includes('On the same lineup'),'repeated artificial sentence lead must not survive');
const duplicate=mk(4);
duplicate.teams[0].inquirer_article.facts={best_lineup_miss:{gap:12.1,reserve:{name:'Nick Emmanwori'},starter:{name:'Nik Bonitto'}}};
duplicate.teams[0].inquirer_article.sections.unshift({kind:'management',paragraphs:[
 'Nick Emmanwori beat Nik Bonitto by 12.1, and the manager should have changed the lineup.',
 'The rest of the lineup also mattered.',
 'The manager added an unverified player.'
]});
applyInquirerEditorialClarity(duplicate,{week:4});
const managed=duplicate.teams[0].inquirer_article.sections.find(x=>x.kind==='management').paragraphs;
assert.equal(managed.filter(x=>x.includes('Nick Emmanwori')&&x.includes('Nik Bonitto')).length,1,'one bench mistake should not be restated repeatedly within management');
const jets=mk(4);
jets.teams[0].team_name='New York Jets';
jets.teams[0].starter_details=[{name:'Cooper DeJean',points:27.5},{name:'Ty Johnson',points:3.2}];
jets.teams[0].inquirer_article.sections[0].paragraphs=[
 'Ty Johnson set the pace for the Jets.',
 'Ty brought the fireworks and carried the team.',
 'Cooper DeJean supplied 27.5 to lead the team.'
];
applyInquirerEditorialClarity(jets,{week:4});
const jetsText=jets.teams[0].inquirer_article.paragraphs.join(' ');
assert(!jetsText.includes('Ty Johnson set the pace'),'low scorer cannot be presented as leader');
assert(!jetsText.includes('Ty brought the fireworks'),'weak performance cannot be described as fireworks');
assert(jetsText.includes('Cooper DeJean'),'top scorer must retain credit');
const recapCase=mk(4);
recapCase.teams[0].team_name='Miami Dolphins';
recapCase.teams[0].opponent_name='Tampa Bay Buccaneers';
recapCase.teams[0].points=134.82;
recapCase.teams[0].opponent_points=115.76;
recapCase.league_overview.sections[0].blocks[0].paragraphs=[
 'The Miami Dolphins–Tampa Bay Buccaneers shootout was a reminder that scoring well is not sufficient when the opposing lineup scores even better.',
 'Miami Dolphins beat Tampa Bay Buccaneers 134.8–115.8.'
];
applyInquirerEditorialClarity(recapCase,{week:4});
assert(!recapCase.league_overview.sections[0].blocks[0].paragraphs.some(p=>p.includes('opposing lineup scores even better')),'recap cannot describe a winning team as outscored');
assert(recapCase.teams[0].inquirer_article.sections.length===2,'canonical article sections remain available for rendering');
const voices=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];
const voiceBodies=voices.map((id,i)=>{
 const e=mk(4);
 const t=e.teams[0];
 t.roster_id=String(i+1);
 t.next_opponent_name='New York Jets';
 t.starter_details=[{name:'Tetairoa McMillan',points:45.2},{name:'Josh Downs',points:3.2}];
 t.inquirer_article.reporter={id};
 e.teams.push({team_name:'New York Jets',starter_details:[{name:'Cooper DeJean',points:27.5}]});
 applyInquirerEditorialClarity(e,{week:4});
 const o=t.inquirer_article.sections.find(x=>x.kind==='outlook');
 assert(o&&o.paragraphs.length===2,'reporters retain factual matchup and commentary');
 assert(o.paragraphs.join(' ').includes('Josh Downs'),'critique must reference the actual weak starter');
 assert(o.paragraphs.join(' ').includes('New York Jets'),'opponent must be named');
 return o.paragraphs[1];
});
assert.equal(new Set(voiceBodies).size,4,'each reporter needs a distinguishable outlook voice');

const previous=mk(4);
previous.teams[0].inquirer_article.sections[0].paragraphs=['This exact sentence should never be recycled.'];
const previousSnapshot=JSON.stringify(previous);
const future=mk(5);
future.teams[0].inquirer_article.sections[0].paragraphs=[
 'This exact sentence should never be recycled.',
 'Tetairoa McMillan earned this new factual sentence.'
];
applyInquirerEditorialClarity(future,{week:5,previousEdition:previous});
assert.equal(JSON.stringify(previous),previousSnapshot,'prior published articles cannot be mutated');
assert(!future.teams[0].inquirer_article.paragraphs.join(' ').includes('This exact sentence should never be recycled'),'prior-week sentences must not be copied');
const copied=mk(4);
copied.teams.push(JSON.parse(JSON.stringify(copied.teams[0])));
copied.teams[1].roster_id='9';
copied.teams[1].team_name='Some Other Team';
copied.teams[0].inquirer_article.sections[0].paragraphs=['This identical piece of generic prose is reused.'];
copied.teams[1].inquirer_article.sections[0].paragraphs=['This identical piece of generic prose is reused.'];
applyInquirerEditorialClarity(copied,{week:4});
assert.equal(copied.teams.filter(t=>t.inquirer_article.paragraphs.some(p=>p.includes('This identical piece of generic prose is reused'))).length,1,'cross-team repeated copy must be suppressed');
console.log('Week 4+ editorial clarity contract passed');
