import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectEditionBeforePublication,editorialCopyDigest,editorialApprovalMatches}
 from '../netlify/functions/inquirer-publication-guard.mjs';

const makeEdition=()=>{
 const teams=Array.from({length:32},(_,i)=>{
  const id=i+1,opp=i%2===0?id+1:id-1;
  const name='Team '+id,opponent_name='Team '+opp;
  const points=100+id,opponent_points=100+opp;
  const distinct='lexeme'+String.fromCharCode(97+i%26)+String.fromCharCode(97+Math.floor(i/26));
  const prose=Array.from({length:6},(_,j)=>
   'Editorial evidence '+distinct+' for '+name+' in '+distinct+' chapter '+j+': '+
   Array(i+5).fill('distinctive football detail '+distinct).join(' ')+
   ' as the scoring and strategic choices develop.');
  const sections=[
   {kind:'lede',paragraphs:prose},
   {kind:'sentiment',paragraphs:[
    'Supporters '+distinct+' of '+name+' are '+distinct+' reacting to '+Array(i+4).fill('distinctly local evidence '+distinct).join(' ')+' as the '+distinct+' roster assesses the matchup.',
    'The '+distinct+' group chat for '+name+' has '+distinct+' '+Array(i+5).fill('a separate observation '+distinct).join(' ')+' before the manager responds.'
   ]}
  ];
  return{roster_id:String(id),team_name:name,opponent_name,
   opponent_roster_id:String(opp),points,opponent_points,
   league_context:{record:{wins:3,losses:2}},
   inquirer_article:{headline:name+' Week 5 analysis',byline:'Editorial desk',reporter:{id:'writer-'+(i%4)},
    sections,paragraphs:sections.flatMap(s=>s.paragraphs)}};
 });
 return{season:2026,week:5,teams,
  league_overview:{headline:'Week 5 recap',sections:[{heading:'Review',paragraphs:[
   'The final outcomes were confirmed, and the recap reports what happened without pretending an algorithm approved style.'
  ]}]}};
};

test('complete original reporting candidate can pass structural and prose checks',()=>{
 const result=inspectEditionBeforePublication(makeEdition());
 assert.equal(result.ok,true,JSON.stringify(result.issues.slice(0,5)));
});

test('the exact real Week 5 regression patterns block publication',()=>{
 const e=makeEdition(),article=e.teams[0].inquirer_article;
 article.sections[0].paragraphs.push('The first result on Team 1 were 80.9 to 51.6 against Team 2.');
 article.sections[0].paragraphs.push('Team 1 gave rivals the sequel they wanted after an previous-week win.');
 article.sections[0].paragraphs.push('The useful weakness-or-strength note is this: the lineup requires improvement.');
 article.sections[1].paragraphs.push('At 1-1, supporters can cherry-pick the season.');
 e.league_overview.sections[0].paragraphs.push('The football read is straightforward: the result was a result.');
 const ids=new Set(inspectEditionBeforePublication(e).issues.map(i=>i.id));
 for(const id of ['grammatical-regression','mechanical-draft-language','misleading-record','recap-mechanical-draft-language'])
  assert(ids.has(id),'missing regression detection '+id);
});

test('approval requires a named reviewer and exact copy hash',()=>{
 const e=makeEdition(),digest=editorialCopyDigest(e);
 const valid={season:2026,week:5,sha256:digest,approved:true,reviewed_by:'editor',reviewed_at:'2026-10-17T19:00:00Z'};
 assert.equal(editorialApprovalMatches(e,valid).approved,true);
 assert.equal(editorialApprovalMatches(e,{...valid,sha256:'wrong'}).approved,false);
 assert.equal(editorialApprovalMatches(e,{...valid,reviewed_by:''}).approved,false);
 assert.equal(editorialApprovalMatches(e,{...valid,approved:false}).approved,false);
 e.teams[0].inquirer_article.sections[0].paragraphs[0]+=' A significant editorial correction.';
 assert.equal(editorialApprovalMatches(e,valid).approved,false);
});

test('approval digest covers every user-visible editorial surface',()=>{
 const base=makeEdition(),digest=editorialCopyDigest(base);
 for(const field of ['deck','aside','fan_sentiment','paragraphs','facts']){
  const e=makeEdition();
  e.teams[0].inquirer_article[field]=field==='paragraphs'?['A separate article paragraph.']:
   field==='facts'?{editorial_note:'A different award claim.'}:'A new editorial claim.';
  assert.notEqual(editorialCopyDigest(e),digest,'unprotected article field: '+field);
 }
 for(const field of ['content','deck','byline']){
  const e=makeEdition();e.league_overview[field]='Different published recap copy.';
  assert.notEqual(editorialCopyDigest(e),digest,'unprotected recap field: '+field);
 }
});

test('matches use reciprocating roster IDs and scores, not absent matchup_id',()=>{
 const e=makeEdition();
 assert.equal(inspectEditionBeforePublication(e).issues.filter(i=>i.id==='matchup-consistency').length,0);
 e.teams[0].opponent_points=999;
 assert(inspectEditionBeforePublication(e).issues.some(i=>i.id==='matchup-consistency'));
});

test('deep copy-forward quality must pass independently of manual approval',()=>{
 const hub=fs.readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const approval=fs.readFileSync(new URL('../scripts/approve-staged-inquirer.mjs',import.meta.url),'utf8');
 assert(hub.includes('const deepQualityOk=week<3||quality.ok===true'));
 assert(hub.includes('if(!audit.ok||!deepQualityOk||!admission.approved)'));
 assert(hub.includes('generation_quality:quality'));
 assert(approval.includes('stage.generation_quality?.ok===true'));
});

test('recycled editorial eight-word phrases are blocked across teams',()=>{
 const e=makeEdition();
 for(const team of e.teams.slice(0,6))team.inquirer_article.sections[0].paragraphs.push(
  'The latest Sunday changed the evidence enough to stand on its own, even if the standings refused to cooperate.');
 const issues=inspectEditionBeforePublication(e).issues;
 assert(issues.some(x=>x.id==='shared-editorial-phrase'&&x.teams.length>=6));
});
