import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedReplacementHistory} from '../netlify/functions/lib/inquirer-replacement-archive-gate.mjs';
const kinds=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
const beats=['lead','standings','players','decisions','league','outlook'];
function edition(week){
 return{available:true,published_locked:true,season:2026,week,inquirer_version:31,editorial_revision:14,
  teams:Array.from({length:32},(_,i)=>({
   roster_id:String(i+1),inquirer_article:{headline:'Specific Team '+(i+1)+' Week '+week+' article',
    reporter:{id:'reporter-'+Math.floor(i/8)},
    sections:kinds.map(kind=>({kind,heading:'The '+kind,paragraphs:['Reported facts']}))}})),
  league_overview:{headline:'Week '+week+' full recap',sections:[
   {blocks:beats.map(kind=>({kind,heading:kind,paragraphs:['Reported analysis']}))},
   {heading:'Desk two',paragraphs:['Some prose']},{heading:'Desk three',paragraphs:['Some prose']},
   {heading:'Desk four',paragraphs:['Some prose']}
  ]}};
}
test('replacement bootstrap requires both original locked weeks with correct years/roster count',()=>{
 const w3=edition(3),w4=edition(4);
 assert.equal(verifiedReplacementHistory(w3,w4).ready,true);
 assert.equal(verifiedReplacementHistory(null,w4).ready,false);
 assert.equal(verifiedReplacementHistory(w3,null).ready,false);
 assert.equal(verifiedReplacementHistory({...w3,published_locked:false},w4).ready,false);
 assert.equal(verifiedReplacementHistory(w3,{...w4,season:2027}).ready,false);
 assert.equal(verifiedReplacementHistory(w3,{...w4,teams:w4.teams.slice(0,31)}).ready,false);
});
test('replacement cutover rejects the old Week 5 regression that omitted approved desks',()=>{
 const w3=edition(3),w4=edition(4);
 w4.teams[0].inquirer_article.sections=w4.teams[0].inquirer_article.sections.filter(s=>s.kind!=='cool-throne');
 assert.equal(verifiedReplacementHistory(w3,w4).ready,false);
 w4.teams[0].inquirer_article.sections=kinds.map(kind=>({kind,heading:kind}));
 w4.league_overview.sections[0].blocks.pop();
 assert.equal(verifiedReplacementHistory(w3,w4).ready,false);
});
test('scheduled publisher never starts from a missing status before verifying original historical migration',()=>{
 const source=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
 const replacement=source.indexOf("if(isReplacement&&process.env.FLEECED_ENABLE_NEW_SITE_PUBLISHER!=='true')");
 const verify=source.indexOf('verifiedReplacementHistory(week3,week4)');
 const seed=source.indexOf("if(status===null)status={state:'waiting',season:2026,week:4,editorial_revision:0}");
 const decision=source.indexOf('inquirerScheduleDecision({status,nfl:current');
 assert.ok(replacement>0&&verify>replacement&&seed>verify&&decision>seed);
 assert.match(source,/siteId==='8776d155-bc7b-4dcd-bafc-3d70d3d51800'/);
 assert.match(source,/if\(!status\|\|typeof status!=='object'\)return skip/);
});
