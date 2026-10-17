import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const runner=path.resolve('scripts/check-future-inquirer-quality.mjs');
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'inquirer-gate-'));
 const baseline={articles:Array.from({length:32},(_,i)=>({team:'Reference '+i,sections:[{paragraphs:['A locked reference paragraph '+i]}]}))};
 const content={teams:Array.from({length:32},(_,i)=>({team_name:'Different '+i,inquirer_article:{sections:[{paragraphs:['A complete editorial paragraph with substantive discussion for team '+i]}]}}))};
 const base=path.join(dir,'baseline.json'),direct=path.join(dir,'candidate.json'),map=path.join(dir,'editions.json');
 fs.writeFileSync(base,JSON.stringify(baseline));fs.writeFileSync(direct,JSON.stringify(content));fs.writeFileSync(map,JSON.stringify({'4':content}));
 return{dir,base,direct,map};
}
test('calibration reports naming and depth differences without blocking validated frozen text',()=>{
 const v=fixture();
 try{
  const x=spawnSync(process.execPath,[runner,v.map,v.base,'--edition-map'],{encoding:'utf8'});
  assert.equal(x.status,0,x.stderr);
  assert.match(x.stdout,/CALIBRATION COMPLETE/);
  assert.match(x.stderr,/team names differ/);
 }finally{fs.rmSync(v.dir,{recursive:true,force:true})}
});
test('future draft quality gate stays fail-closed on the same differences',()=>{
 const v=fixture();
 try{
  const x=spawnSync(process.execPath,[runner,v.direct,v.base],{encoding:'utf8'});
  assert.equal(x.status,1);
  assert.match(x.stderr,/HOLD/);
 }finally{fs.rmSync(v.dir,{recursive:true,force:true})}
});

test('substantive future draft may include legitimately renamed teams',()=>{
 const v=fixture();
 try{
  const candidate=JSON.parse(fs.readFileSync(v.direct,'utf8'));
  for(const team of candidate.teams){
   const original=team.inquirer_article.sections[0].paragraphs[0];
   team.inquirer_article.sections[0].paragraphs=Array.from({length:6},(_,i)=>original+' Distinct football analysis point '+(i+1)+' with documented matchup context.');
  }
  fs.writeFileSync(v.direct,JSON.stringify(candidate));
  const x=spawnSync(process.execPath,[runner,v.direct,v.base],{encoding:'utf8'});
  assert.equal(x.status,0,x.stderr);
  assert.match(x.stdout,/meaningful_paragraphs/);
 }finally{fs.rmSync(v.dir,{recursive:true,force:true})}
});

test('mirrored article and section paragraphs are not false duplicate failures',()=>{
 const v=fixture();
 try{
  const candidate=JSON.parse(fs.readFileSync(v.direct,'utf8'));
  for(const team of candidate.teams){
   const seed=team.inquirer_article.sections[0].paragraphs[0];
   const paragraphs=Array.from({length:6},(_,i)=>seed+' A distinct weekly matchup analysis number '+(i+1)+' anchored to this team.');
   team.inquirer_article.paragraphs=paragraphs.slice();
   team.inquirer_article.sections[0].paragraphs=paragraphs.slice();
  }
  fs.writeFileSync(v.direct,JSON.stringify(candidate));
  const pass=spawnSync(process.execPath,[runner,v.direct,v.base],{encoding:'utf8'});
  assert.equal(pass.status,0,pass.stderr);
  candidate.teams[0].inquirer_article.paragraphs[1]=candidate.teams[0].inquirer_article.paragraphs[0];
  fs.writeFileSync(v.direct,JSON.stringify(candidate));
  const fail=spawnSync(process.execPath,[runner,v.direct,v.base],{encoding:'utf8'});
  assert.equal(fail.status,1);
  assert.match(fail.stderr,/duplicate paragraphs/);
 }finally{fs.rmSync(v.dir,{recursive:true,force:true})}
});
