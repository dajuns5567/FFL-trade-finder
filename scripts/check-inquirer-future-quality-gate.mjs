// Self-tests for future edition gate: a good edition passes; cross-week
// copy/paste, missing theater, score composition and absent recap must fail.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fleeced-newsroom-'));
const required=['lede','players','management','hot-seat','cool-throne','sentiment','outlook'];
const base='The very real decision mattered because the roster played hard and the manager must live with the outcome';
const phrase=i=>base+' on club '+String.fromCharCode(65+i%26)+String.fromCharCode(65+Math.floor(i/26))+'. ';
const make=(week,variant='')=>({
 season:2026,week,
 articles:Array.from({length:32},(_,i)=>({
  team:'Team '+i,
  future_brief_status:'COMPLETE_UNAPPROVED',
  reporter:['Nick Swindell','Tilly Fleecer','Jefferson Filch','Bartholomew Roycington III'][i%4],
  sections:required.map(kind=>({kind,paragraphs:[kind==='sentiment'
   ?'In this fictional city for '+String.fromCharCode(65+i%26)+String.fromCharCode(65+Math.floor(i/26))+', the imaginary crowd holds a '+variant+' champagne parade and debates why the fans should trust their manager. '+phrase(i).replace('The very real decision','The '+variant+' decision').repeat(3)+i
   :kind==='outlook'?'Week '+(week+1)+' brings Team '+((i+1)%32)+'. '+phrase(i).replace('The very real decision','The '+variant+' decision').repeat(3)+i
   :kind==='players'?'Player '+i+' (12.0 pts) supplied a memorable performance. '+phrase(i).replace('The very real decision','The '+variant+' decision').repeat(3)+i
   :phrase(i).replace('The very real decision','The '+variant+' decision').repeat(3)+i]})),
  starters:[{name:'Player '+i,points:12}],
  benchDecision:null
 })),
 weeklyRecap:{future_recap_brief_status:'COMPLETE_UNAPPROVED',fullText:(base+' league-wide '+variant+'. ').repeat(12)}
});
const file=(name,obj)=>{const p=path.join(dir,name);fs.writeFileSync(p,JSON.stringify(obj));return p};
const run=(a,b)=>spawnSync(process.execPath,['scripts/inquirer-future-quality-gate.mjs',a,...(b?[b]:[])],{encoding:'utf8'});
const prev=file('prev.json',make(5,'last slate'));
const current=file('current.json',make(6,'fresh distinct angle'));
const pass=run(current,prev);
assert.equal(pass.status,0,pass.stdout+pass.stderr);
const reused=file('reused.json',make(6,'last slate'));
const fail=run(reused,prev);
assert.notEqual(fail.status,0,'Identical prior-week content must fail');
assert.match(fail.stdout,/VERBATIM_CROSS_WEEK/);
const noScene=make(6,'fresh distinct angle');
noScene.articles[0].sections.find(s=>s.kind==='sentiment').paragraphs=['Fans had a decent weekend, perhaps. '+phrase(0).repeat(2)];
const sceneFail=run(file('noscene.json',noScene),prev);
assert.notEqual(sceneFail.status,0);
assert.match(sceneFail.stdout,/FAN_SCENE_MISSING/);
const noRecap=make(6,'fresh distinct angle');delete noRecap.weeklyRecap;
const recapFail=run(file('norecap.json',noRecap),prev);
assert.notEqual(recapFail.status,0);
assert.match(recapFail.stdout,/RECAP_MISSING/);
const sterile=make(6,'fresh distinct angle');
for(const a of sterile.articles)for(const sec of a.sections)
 sec.paragraphs=sec.paragraphs.map(p=>p.replace(/manager must live/gi,'manager can live').replace(/fans should trust/gi,'fans may notice'));
const voiceFail=run(file('sterile.json',sterile),prev);
assert.notEqual(voiceFail.status,0,'Reporter voice collapse must fail editorial certification');
assert.match(voiceFail.stdout,/EDITORIAL_VOICE_COLLAPSE/);
console.log('PASS: positive fixture, cross-week copying, missing fan scene and missing recap, reporter voice collapse');
