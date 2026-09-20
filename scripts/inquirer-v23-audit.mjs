import assert from 'node:assert/strict';
import edition from '../netlify/functions/inquirer-week1-2026-preload.mjs';
import {selectImportantMoves,humanSectionsV23,outlookCopy,sentimentCopy,divisionCopy} from '../netlify/functions/inquirer-editorial-v23.mjs';
assert.ok(edition.inquirer_version>=23);
const moods=new Set();
for(const t of edition.teams){
  const sections=t.inquirer_article.sections,management=sections.find(s=>s.kind==='management'),outlook=sections.find(s=>s.kind==='outlook').paragraphs.join(' '),mood=sections.find(s=>s.kind==='sentiment').paragraphs.join(' ');
  assert.ok(management.paragraphs.length<=2);
  assert.doesNotMatch(management.paragraphs.join(' '),/Transaction verdict|Current snapshot value received|These are player totals/);
  assert.doesNotMatch(outlook,/division (?:title|odds)|division.*n\/a/i);
  assert.doesNotMatch(mood,/Strong Approval|crowd.*statement|no pattern finding/);
  for(const rival of t.division_results){assert.ok(outlook.includes(rival.team_name),t.team_name+' missing division result');assert.notEqual(rival.roster_id,t.roster_id)}
  assert.ok(t.division_results.length===3,t.team_name+' must have its three division rivals');
  if(Number(edition.inquirer_version)<25)assert.ok(mood.includes(t.team_name));
  else assert.ok((t.inquirer_article.paragraphs||[]).join(' ').includes(t.team_name),t.team_name+' must remain clearly named in its article without forcing a canned sentiment repeat');
  moods.add(mood);
}
assert.equal(moods.size,32);
const t=structuredClone(edition.teams[0]),r=t.inquirer_article.reporter;
t.transactions=Array.from({length:10},(_,i)=>({id:String(i),status:'complete',adds:['a'+i],drops:['d'+i]}));
const facts=Object.fromEntries(Array.from({length:10},(_,i)=>[['a'+i,{id:'a'+i,name:'Add '+i,value:i===9?6000:100,points:0}],['d'+i,{id:'d'+i,name:'Drop '+i,value:100,points:0}]]).flat());
assert.deepEqual(selectImportantMoves(t,facts).map(x=>x.move.id),['9']);
t.transactions.push({...t.transactions[9]});assert.equal(selectImportantMoves(t,facts).length,1);
t.transactions[9].status='failed';t.transactions.pop();assert.equal(selectImportantMoves(t,facts).length,0);
t.transactions=[];assert.deepEqual(humanSectionsV23({team:t,week:1,reporter:r,facts}).find(s=>s.kind==='management').paragraphs,['n/a']);
const base={...t,team_name:'Test Team',points:100,opponent_points:90,won:true,next_projected:110,next_opponent_projected:90,next_opponent_name:'Opponent',mida_outlook:{playoff:30,title:1,source_date:'2026-09-16'},league_context:{record:{wins:1,losses:0}}};
assert.match(outlookCopy(base,1,r).join(' '),/wasting this opening/);
assert.match(outlookCopy({...base,next_projected:70},1,r).join(' '),/upset here/);
assert.match(outlookCopy({...base,mida_outlook:{...base.mida_outlook,playoff:85}},1,r).join(' '),/protecting a strong playoff path/);
assert.notEqual(sentimentCopy(base,r).join(' '),sentimentCopy({...base,points:40,won:false},r).join(' '));
const division=divisionCopy({...base,division_results:[{team_name:'Rival',opponent_name:'Visitor',points:80,opponent_points:90,record:{wins:0,losses:1}}]});
assert.match(division,/Test Team gained a game on Rival/);
console.log(JSON.stringify({ok:true,version:23,articles:32,distinct_sentiments:moods.size,max_featured_transactions:2}));
