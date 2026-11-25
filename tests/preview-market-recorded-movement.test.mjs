import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const audit=readFileSync(new URL('../ffl-preview-audit-v2.js',import.meta.url),'utf8');
const start=audit.indexOf('function auditRecordedMovement('),end=audit.indexOf('function auditHotSeat(',start);
assert.ok(start>=0&&end>start);
const calc=vm.runInNewContext(audit.slice(start,end)+';auditRecordedMovement');
const model='new-model';
const points=[
 {t:'2026-11-18T02:04:31.378Z',value:329},
 {t:'2026-11-21T00:58:36.636Z',value:324},
 {t:'2026-11-21T03:52:31.983Z',value:2090},
 {t:'2026-11-21T04:35:59.148Z',value:2090,valuation_model:model},
 {t:'2026-11-24T21:18:35.726Z',value:3147,valuation_model:model}
];
const options={baseline:points[0].t,through:points.at(-1).t,model,modelChangeAt:points[2].t};
test('a genuine large recorded gain passes exact segment arithmetic, not a magnitude threshold',()=>{
 const result=calc(points,options);
 assert.equal(result.delta,1052);assert.equal(result.segments.length,2);
 assert.equal(result.segments[0].delta,-5);assert.equal(result.segments[1].delta,1057);
 assert.notEqual(result.delta,3147-329);
 assert.doesNotMatch(audit,/Math\.abs\(Number\(candidate\.delta\)\)<500/);
});
test('missing baseline, endpoint or handoff is not treated as verified',()=>{
 for(const i of [0,2,4])assert.equal(calc(points.filter((_,j)=>i!==j),options),null);
});
test('explicit conflicting model tags within the current era cannot pass',()=>{
 assert.equal(calc(points.map((p,i)=>i===3?{...p,valuation_model:'conflicting'}:p),options),null);
});

const hotStart=audit.indexOf('function auditHotSeat('),hotEnd=audit.indexOf('const consoleError=',hotStart);
const hot=vm.runInNewContext(audit.slice(hotStart,hotEnd)+';auditHotSeat');
const teams=Array.from({length:32},(_,i)=>({roster_id:String(i+1),team_name:'Team '+(i+1),projection_coverage:1,projected:100,opponent_projected:95,points:85,opponent_points:100,won:false}));
teams[16]={...teams[16],projected:110};
test('Hot Seat checks the exact projected favorite with largest expected winning margin, not mere badge presence',()=>{
 const record=id=>({manager_awards:[{type:'hot-seat',roster_id:String(id),provisional:true}]});
 assert.equal(hot(teams,record(17)).matches,true);
 assert.equal(hot(teams,record(1)).matches,false);
 assert.equal(hot(teams,record(17)).recorded.provisional,true);
 assert.equal(hot(teams.slice(0,31),record(17)).complete,false);
 assert.equal(hot(teams.map((r,i)=>i===3?{...r,projection_coverage:0}:r),record(17)).complete,false);
});
test('no eligible upset means no Hot Seat badge, and duplicates never pass',()=>{
 const noUpset=teams.map(r=>({...r,projected:80}));
 assert.equal(hot(noUpset,{manager_awards:[]}).matches,true);
 assert.equal(hot(noUpset,{manager_awards:[{type:'hot-seat',roster_id:'17'}]}).matches,false);
 assert.equal(hot(teams,{manager_awards:[{type:'hot-seat',roster_id:'17'},{type:'hot-seat',roster_id:'17'}]}).matches,false);
});
