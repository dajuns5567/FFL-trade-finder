import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {approvedWeek5Record,REVIEWED_AT_CUTOFF,SIGNOFF_EXPIRES} from '../netlify/functions/lib/inquirer-week5-owner-signoff.mjs';
import {editorialCopyDigest,editorialApprovalMatches} from '../netlify/functions/inquirer-publication-guard.mjs';
import {FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';

function edition(){
 const teams=Array.from({length:32},(_,i)=>{
  const id=i+1,other=i%2===0?id+1:id-1;
  const label='Team '+id,opponent='Team '+other,token='lexeme'+String.fromCharCode(97+i%26)+String.fromCharCode(97+Math.floor(i/26));
  const base=Array.from({length:6},(_,j)=>'Editorial evidence '+token+' for '+label+' in '+token+' chapter '+j+': '+Array(Math.min(i+6,13)).fill('distinctive football detail '+token).join(' ')+' as the scoring and strategic choices develop.');
  const sections=[
   {kind:'lede',heading:'Week 5 account',paragraphs:base.slice(0,2)},
   {kind:'players',heading:'Player story',paragraphs:[token+' delivered 20 fantasy points. '+base[2]]},
   {kind:'management',heading:'Management judgment',paragraphs:[base[3]]},
   {kind:'hot-seat',heading:'The problem to solve',paragraphs:[base[4]]},
   {kind:'cool-throne',heading:'The bright spot',paragraphs:[base[5]]},
   {kind:'value',heading:'Market movement report',paragraphs:[label+' '+token+' recorded a verified '+id+'-point market movement; '+token+' '+Array(12).fill('independent roster evidence '+token).join(' ')+' supports an independent market reading.']},
   {kind:'sentiment',heading:'Fan reaction',paragraphs:[
    'Supporters '+token+' of '+label+' are '+token+' reacting to '+Array(Math.min(i+4,13)).fill('distinctly local evidence '+token).join(' ')+' as the '+token+' roster assesses the matchup.',
    'The '+token+' group chat for '+label+' has '+token+' '+Array(Math.min(i+5,13)).fill('a separate observation '+token).join(' ')+' before the manager responds.']},
   {kind:'outlook',heading:'The Week Ahead',paragraphs:['The team has a verifiable next matchup.']}
  ];
  if(i%4===1){const c=sections.splice(4,1)[0];sections.splice(2,0,c)}
  if(i%4===2){const c=sections.splice(4,1)[0];sections.splice(1,0,c)}
  if(i%4===3){const c=sections.splice(2,1)[0];sections.splice(1,0,c)}
  return{roster_id:String(id),team_name:label,opponent_name:opponent,opponent_roster_id:String(other),
   points:100+id,opponent_points:100+other,league_context:{record:{wins:3,losses:2}},
   inquirer_article:{headline:label+' Week 5 analysis',byline:'Editorial desk',reporter:{id:'writer-'+(i%4)},sections,paragraphs:sections.flatMap(s=>s.paragraphs)}};
 });
 const kinds=['lead','standings','players','decisions','league','outlook'];
 const blocks=kinds.map((kind,i)=>{
  const covered=teams.slice(i*3,i*3+10).map(t=>t.team_name+' scored '+t.points+' against '+t.opponent_name+' on '+t.opponent_points).join('; ');
  return{kind,heading:kind,paragraphs:['The '+kind+' report develops distinct verified Week 5 league evidence rather than a generic closing thought. '+covered+'. The '+kind+' desk must account for its own named evidence: '+teams[(i*3)%32].team_name+' recorded '+teams[(i*3)%32].points+' points, while '+teams[(i*3)%32].opponent_name+' had '+teams[(i*3)%32].opponent_points+'. Each beat draws a different documented consequence from those numbers.',
   ...(['league','outlook'].includes(kind)?['Another independent '+kind+' perspective studies the next contest using these named participants and their recorded scoring totals.']:[])]};
 });
 return{available:true,published_locked:false,season:2026,week:5,editorial_revision:FORWARD_EDITORIAL_REVISION,
  editorial_generation:{engine:'v31-forward'},generated_at:'2026-11-04T08:00:58Z',teams,
  league_overview:{headline:'Week 5 recap',sections:[{heading:'Review',blocks,paragraphs:blocks.flatMap(b=>b.paragraphs)},...['Second reporter','Third reporter','Fourth reporter'].map(heading=>({heading,paragraphs:['Independent commentary.']}))]}};
}
function setup(){
 const e=edition(),stage={season:2026,week:5,digest:editorialCopyDigest(e),generated_at:e.generated_at,generation_quality:{ok:true},edition:e};
 return{status:{state:'editorial-hold',season:2026,week:5,editorial_revision:FORWARD_EDITORIAL_REVISION},stage,existingApproval:null,published:null,now:Date.parse('2026-11-05T02:00:00Z')};
}
test('owner signoff creates an exact-copy review approval only for the pre-reviewed Week 5 edition',()=>{
 const a=setup(),approved=approvedWeek5Record(a);
 assert(approved,'valid existing staging must be approvable');
 assert.equal(approved.sha256,a.stage.digest);
 assert.equal(approved.reviewed_by,'league-owner-explicit-chat-approval-2026-11-04');
 assert.equal(approved.approval_source,'explicit-owner-chat-signoff-2026-11-04');
 assert.equal(editorialApprovalMatches(a.stage.edition,approved).approved,true);
});
test('no approval for overwritten, future, new, or failed drafts',()=>{
 const a=setup();
 for(const partial of [
  {existingApproval:{approved:true}},
  {published:{available:true}},
  {status:{...a.status,state:'waiting'}},
  {status:{...a.status,editorial_revision:FORWARD_EDITORIAL_REVISION-1}},
  {stage:{...a.stage,digest:'wrong'}},
  {stage:{...a.stage,generated_at:'2026-11-05T03:00:00Z'}},
  {stage:{...a.stage,generation_quality:{ok:false}}},
  {stage:{...a.stage,edition:{...a.stage.edition,week:6}}},
  {stage:{...a.stage,edition:{...a.stage.edition,teams:a.stage.edition.teams.slice(1)}}},
  {now:Date.parse(REVIEWED_AT_CUTOFF)-1},
  {now:Date.parse(SIGNOFF_EXPIRES)}
 ])assert.equal(approvedWeek5Record({...a,...partial}),null);
});
test('signoff occurs only in the already-verified production scheduler and uses create-only write',()=>{
 const source=fs.readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
 assert.match(source,/verifiedReplacementHistory\(week3,week4\)/);
 assert.match(source,/if\(!checked\.ready\)return skip/);
 assert.match(source,/approvedWeek5Record\(\{status,stage,existingApproval,published\}\)/);
 assert.match(source,/store\.setJSON\('inquirer\/editorial-approvals\/'\+suffix,approved,\{onlyIfNew:true\}\)/);
 assert.match(source,/if\(isReplacement&&context!=='deploy-preview'&&context!=='branch-deploy'/);
 assert.doesNotMatch(source,/store\.setJSON\('broadcasts\//);
});
