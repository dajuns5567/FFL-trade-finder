import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectEditionBeforePublication,editorialCopyDigest,editorialApprovalMatches,deterministicInquirerAdmission,isReadOnlyEditorialPreview}
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
   {kind:'lede',heading:'Week 5 account',paragraphs:prose.slice(0,2)},
   {kind:'players',heading:'Player story',paragraphs:[distinct+' delivered 20 fantasy points. '+prose[2]]},
   {kind:'management',heading:'Management judgment',paragraphs:[prose[3]]},
   {kind:'hot-seat',heading:'The problem to solve',paragraphs:[prose[4]]},
   {kind:'cool-throne',heading:'The bright spot',paragraphs:[prose[5]]},
   {kind:'value',heading:'Market movement report',paragraphs:[]},
   {kind:'sentiment',heading:'Fan reaction',paragraphs:[
    'Supporters '+distinct+' of '+name+' are '+distinct+' reacting to '+Array(i+4).fill('distinctly local evidence '+distinct).join(' ')+' as the '+distinct+' roster assesses the matchup.',
    'The '+distinct+' group chat for '+name+' has '+distinct+' '+Array(i+5).fill('a separate observation '+distinct).join(' ')+' before the manager responds.'
   ]},
   {kind:'outlook',heading:'The Week Ahead',paragraphs:['The team has a verifiable next matchup.']}
  ];
  if(i%4===1){const c=sections.splice(4,1)[0];sections.splice(2,0,c)}
  if(i%4===2){const c=sections.splice(4,1)[0];sections.splice(1,0,c)}
  if(i%4===3){const c=sections.splice(2,1)[0];sections.splice(1,0,c)}
  return{roster_id:String(id),team_name:name,opponent_name,
   opponent_roster_id:String(opp),points,opponent_points,
   league_context:{record:{wins:3,losses:2}},
   inquirer_article:{headline:name+' Week 5 analysis',byline:'Editorial desk',reporter:{id:'writer-'+(i%4)},
    sections,paragraphs:sections.flatMap(s=>s.paragraphs)}};
 });
 return{season:2026,week:5,teams,
  league_overview:{headline:'Week 5 recap',sections:[
   {heading:'Review',blocks:['lead','standings','players','decisions','league','outlook'].map(kind=>({kind,heading:kind,paragraphs:['Verified '+kind+' football reporting.',...(['league','outlook'].includes(kind)?['A second independently reported '+kind+' angle.']:[])]})),paragraphs:['lead','standings','players','decisions','league','outlook'].flatMap(kind=>['Verified '+kind+' football reporting.',...(['league','outlook'].includes(kind)?['A second independently reported '+kind+' angle.']:[])])},
   ...['Second reporter','Third reporter','Fourth reporter'].map(heading=>({heading,paragraphs:['Independent commentary.']}))]}};
};

test('complete original reporting candidate can pass structural and prose checks',()=>{
 const result=inspectEditionBeforePublication(makeEdition());
 assert.equal(result.ok,true,JSON.stringify(result.issues.slice(0,5)));
});

test('Week 5 cannot regress from the locked Week 4 newspaper format',()=>{
 const e=makeEdition();
 e.teams[0].inquirer_article.sections=e.teams[0].inquirer_article.sections.filter(s=>!['cool-throne','value'].includes(s.kind));
 e.teams[1].inquirer_article.sections.find(s=>s.kind==='outlook').paragraphs=Array(7).fill('Extra future-week paragraph.');
 e.teams[2].inquirer_article.sections.find(s=>s.kind==='cool-throne').heading='cool-throne';
 e.league_overview.sections[0].blocks=e.league_overview.sections[0].blocks.slice(0,5);
 e.league_overview.sections[0].blocks.find(b=>b.kind==='league').paragraphs=['Only a single thin league paragraph.'];
 const found=new Set(inspectEditionBeforePublication(e).issues.map(x=>x.id));
 for(const id of ['week4-team-section-contract','week4-overstuffed-outlook','week4-missing-section-heading','week4-recap-six-beat-contract','week4-thin-recap-beat'])
  assert(found.has(id),'missing independent format gate: '+id);
});

test('the exact real Week 5 regression patterns block publication',()=>{
 const e=makeEdition(),article=e.teams[0].inquirer_article;
 article.sections[0].paragraphs.push('The first result on Team 1 were 80.9 to 51.6 against Team 2.');
 article.sections[0].paragraphs.push('Team 1 gave rivals the sequel they wanted after an previous-week win.');
 article.sections[0].paragraphs.push('The useful weakness-or-strength note is this: the lineup requires improvement.');
 article.sections[1].paragraphs.push('At 1-1, supporters can cherry-pick the season.');
 e.league_overview.sections[0].paragraphs.push('The football read is straightforward: the result was a result.');
 e.league_overview.sections[1].paragraphs.push('The useful lesson is not to ask the obvious question.');
 const ids=new Set(inspectEditionBeforePublication(e).issues.map(i=>i.id));
 for(const id of ['grammatical-regression','mechanical-draft-language','misleading-record','recap-mechanical-draft-language','recap-mechanical-lesson-scaffold'])
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
 assert(hub.includes('deterministicInquirerAdmission(result'));
 assert(hub.includes("if(previewReadOnly&&!new URL(req.url).searchParams.has('preview_editorial'))"));
 const previewReturn=hub.indexOf('if(previewReadOnly)return{...result');
 const firstStageWrite=hub.indexOf('await s.setJSON(stageKey');
 assert(previewReturn>0&&firstStageWrite>previewReturn,'Preview must return an in-memory draft before any shared Blob publication write');
 assert(hub.includes('preview_only:true'),'Preview draft must be explicitly marked unpublished');
 assert(approval.includes('stage.generation_quality?.ok===true'));
});

test('recycled editorial eight-word phrases are blocked across teams',()=>{
 const e=makeEdition();
 for(const team of e.teams.slice(0,6))team.inquirer_article.sections[0].paragraphs.push(
  'The latest Sunday changed the evidence enough to stand on its own, even if the standings refused to cooperate.');
 const issues=inspectEditionBeforePublication(e).issues;
 assert(issues.some(x=>x.id==='shared-editorial-phrase'&&x.teams.length>=6));
});

test('audited original V31 newsroom auto-admits only Week 5+ after locked Week 4',()=>{
 const edition=makeEdition();
 // Keep the canonical Week 4 six-beat recap fixture intact for admission.
 edition.inquirer_version=31;
 edition.editorial_generation={engine:'v31-forward',variation_salt:5};
 const prev={season:2026,week:4,published_locked:true};
 const audit=inspectEditionBeforePublication(edition);
 const clean={quality:{ok:true},audit,previousEdition:prev};
 assert.equal(audit.ok,true);
 const good=deterministicInquirerAdmission(edition,clean);
 assert.equal(good.approved,true);
 assert.match(good.digest,/^[a-f0-9]{64}$/);
 assert.equal(deterministicInquirerAdmission(edition,{...clean,quality:{ok:false}}).approved,false);
 assert.equal(deterministicInquirerAdmission(edition,{...clean,previousEdition:{...prev,published_locked:false}}).approved,false);
 assert.equal(deterministicInquirerAdmission(edition,{...clean,previousEdition:{...prev,week:3}}).approved,false);
 assert.equal(deterministicInquirerAdmission(edition,{...clean,audit:{ok:false}}).approved,false);
 assert.equal(deterministicInquirerAdmission({...edition,editorial_generation:{engine:'week4-v19-style-ai-draft'}},clean).approved,false);
 assert.equal(deterministicInquirerAdmission({...edition,week:4},clean).approved,false);
 assert.equal(deterministicInquirerAdmission({...edition,teams:edition.teams.slice(1)},clean).approved,false);
});

test('deploy previews are read-only before shared-Blob publication can run',()=>{
 assert.equal(isReadOnlyEditorialPreview('https://deploy-preview-398--some-site.netlify.app/.netlify/functions/league-hub'),true);
 assert.equal(isReadOnlyEditorialPreview('https://some-site.netlify.app/.netlify/functions/league-hub','deploy-preview'),true);
 assert.equal(isReadOnlyEditorialPreview('https://some-site.netlify.app/.netlify/functions/league-hub','branch-deploy'),true);
 assert.equal(isReadOnlyEditorialPreview('https://some-site.netlify.app/.netlify/functions/league-hub','production'),false);
});
