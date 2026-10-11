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
console.log('Week 4+ editorial clarity contract passed');
