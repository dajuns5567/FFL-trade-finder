import test from 'node:test';
import assert from 'node:assert/strict';
import {reinforceForwardReporterVoice,rotateForwardRecapOpening,FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';

const team=(id,reporter='mack-hollis')=>({
 roster_id:id,team_name:'New Orleans Aints',opponent_name:'New York Giants',points:163.2,opponent_points:72.6,
 starter_details:[{name:'Dallas Turner',points:34.4},{name:'Denzel Boston',points:2.6}],
 inquirer_article:{reporter:{id:reporter},sections:[{kind:'sentiment',paragraphs:['The manager has questions to answer about a recorded Week 10 lineup.']}],paragraphs:['The manager has questions to answer about a recorded Week 10 lineup.']}
});
const recap=()=>({sections:[{heading:'Week 11',blocks:[{kind:'lead',paragraphs:['Old opening','Second paragraph reports league standings facts.']}],paragraphs:['Old opening','Second paragraph reports league standings facts.']}],paragraphs:[]});

test('fact-grounded sarcasm is available to every byline and never mutates signed-off prior weeks',()=>{
 assert.equal(FORWARD_EDITORIAL_REVISION,113);
 const reporters=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];
 const draft=reporters.map((r,i)=>team(i+1,r));
 reinforceForwardReporterVoice(draft,11,0,[]);
 const lines=draft.map(t=>t.inquirer_article.sections[0].paragraphs.at(-1));
 assert.equal(new Set(lines).size,4);
 for(const line of lines){assert.match(line,/Denzel Boston/);assert.match(line,/2\.6/);assert.match(line,/New Orleans Aints/);}
 assert(draft.every(t=>t.inquirer_article.paragraphs.at(-1)===t.inquirer_article.sections[0].paragraphs.at(-1)));
 const historical=[team(7)];reinforceForwardReporterVoice(historical,9,0,[]);
 assert.equal(historical[0].inquirer_article.sections[0].paragraphs.length,1);
});
test('reporter labels cannot impose distinct tonal treatment on the same verified facts',()=>{
 const reporters=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];
 const lines=reporters.map(reporter=>{
  const draft=team(902,reporter);
  reinforceForwardReporterVoice([draft],11,4,[]);
  return draft.inquirer_article.sections[0].paragraphs.at(-1);
 });
 assert.equal(new Set(lines).size,1,'the editorial style must be independent of reporter identity');
 assert.match(lines[0],/Denzel Boston/);
 assert.match(lines[0],/2\.6/);
 assert.match(lines[0],/New Orleans Aints/);
});

test('recap rotations look past the immediate previous edition and retain feature mirrors',()=>{
 const t=team(2),issue=recap();
 rotateForwardRecapOpening(issue,[t],11,0,[]);
 const first=issue.sections[0].blocks[0].paragraphs[0];
 assert.match(first,/New Orleans Aints/);
 assert.match(first,/163\.2/);
 assert.equal(issue.sections[0].paragraphs[0],first);
 const next=recap();
 rotateForwardRecapOpening(next,[t],12,0,[{league_overview:issue}]);
 assert.notEqual(next.sections[0].blocks[0].paragraphs[0],first);
 assert.equal(next.sections[0].paragraphs[0],next.sections[0].blocks[0].paragraphs[0]);
 const copy=recap();rotateForwardRecapOpening(copy,[t],9,0,[]);
 assert.equal(copy.sections[0].blocks[0].paragraphs[0],'Old opening');
});

test('plural fantasy teams retain proper verb agreement across reporter and salt rotations',()=>{
 const reporters=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];
 for(let salt=0;salt<8;salt++){
  const rows=Array.from({length:32},(_,i)=>{
   const t=team(i+1,reporters[i%4]);
   t.team_name=i%2?'Los Angeles Rams':'Kansas City Chiefs';
   t.opponent_name=i%2?'Kansas City Chiefs':'Los Angeles Rams';
   return t;
  });
  reinforceForwardReporterVoice(rows,14,salt,[]);
  const copy=rows.map(t=>t.inquirer_article.sections.find(s=>s.kind==='sentiment').paragraphs.at(-1)).join(' ');
  assert.doesNotMatch(copy,/\b(?:Kansas City Chiefs|Los Angeles Rams) (?:has|is|does|gets|needs|sits|keeps|projects|faces)\b/i);
 }
});
