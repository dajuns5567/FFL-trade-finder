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
