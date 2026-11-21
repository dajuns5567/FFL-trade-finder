import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const start=ui.indexOf('function buildVerifiedLiveMoversV109(');
const end=ui.indexOf('function liveDashboardPeriodV109(',start);
assert.ok(start>=0&&end>start,'missing actual market live-movement runtime');
const context={Map,Set,Number,String,Date,Array,Math};
vm.runInNewContext(ui.slice(start,end)+';this.build=buildVerifiedLiveMoversV109;',context);
const now=Date.parse('2026-11-20T20:00:00Z');
const latest='2026-11-17T20:00:00Z';
const old={
 latest,valuation_model:'verified-v101',marketRows:[
 {id:'a',pos:'WR',overall:10,posRank:4,value:5000},
 {id:'b',pos:'RB',overall:20,posRank:8,value:4000},
 {id:'c',pos:'QB',overall:30,posRank:6,value:3000}],
 periods:{'7D':{valueRisers:[{id:'a',delta:200,overallDelta:2,posRankDelta:1}],
 valueFallers:[{id:'b',delta:-150,overallDelta:-2,posRankDelta:-1}]}}
};
const live=[
 {id:'a',pos:'WR',overall:8,posRank:3,value:5500},
 {id:'b',pos:'RB',overall:22,posRank:9,value:3900},
 {id:'c',pos:'QB',overall:29,posRank:5,value:3300}
];
test('verified same-era live movement updates value and rank leaderboards without altering the archive',()=>{
 const before=JSON.stringify(old);
 const result=context.build(old,'7D',live,'verified-v101',now);
 assert.equal(result.live_unarchived,true);
 assert.equal(result.latest_recorded_t,latest);
 assert.equal(result.valueRisers[0].id,'a');
 assert.equal(result.valueRisers[0].delta,700);
 assert.equal(result.valueRisers[0].observedDelta,500);
 assert.equal(result.valueRisers[0].recordedValue,5000);
 assert.equal(result.valueRisers[0].value,5500);
 assert.equal(result.valueRisers[1].id,'c');
 assert.equal(result.valueRisers[1].delta,300);
 assert.equal(result.valueFallers[0].delta,-250);
 assert.equal(result.rankRisers[0].overallDelta,4);
 assert.equal(JSON.stringify(old),before,'historical observations must remain immutable');
});
test('model repricing remains a real observed value change; stale windows still fail closed',()=>{
 assert.equal(context.build(old,'7D',live,'different-v101',now)?.valueRisers[0]?.delta,700);
 assert.equal(context.build(old,'1D',live,'verified-v101',now),null,'3-day-old snapshot cannot claim 1D movement');
 assert.equal(context.build(old,'7D',live,'verified-v101',Date.parse('2026-11-30T20:00:00Z')),null);
 assert.equal(context.build({...old,latest:'2026-11-21T20:00:00Z'},'7D',live,'verified-v101',now),null);
 assert.equal(context.build({...old,valuation_model:null},'7D',live,'verified-v101',now)?.valueRisers[0]?.delta,700);
});
test('dashboard hides the two noisy model-era paragraphs and the earlier-market board, not the actual history data',()=>{
 const start=ui.indexOf('function renderMarketDashboard(){');
 const end=ui.indexOf('function renderFullMarketHistory(){',start);
 assert.ok(start>=0&&end>start);
 const dashboard=ui.slice(start,end);
 assert.ok(!dashboard.includes('${modelEraNote(m)}'));
 assert.ok(!dashboard.includes('${archivedEraBoard(m)}'));
 assert.ok(!dashboard.includes('Current values and ranks come from Player Values;'));
 assert.ok(dashboard.includes('liveDashboardPeriodV109(m,p)'));
 assert.ok(dashboard.includes('Current Player Values changes are included; model repricing may be part of these movements'));
 assert.ok(ui.includes('function archivedEraBoard(m){'),'underlying archived-era data and code must not be deleted');
 assert.ok(ui.includes('function marketFetch(){')||ui.includes('async function marketFetch(){'));
 assert.ok(ui.includes("if(isValueHistoryDeployPreview())return false;"),'preview must retain its no-write guard');
});
test('live augmentation requires confirmed canonical consensus refresh and completed player map, not historical model identity',()=>{
 const start=ui.indexOf('function liveDashboardPeriodV109(');
 const end=ui.indexOf('function archivedEraBoard(m){',start);
 assert.ok(start>=0&&end>start);
 const guard=ui.slice(start,end);
 for(const needle of ["refresh?.phase!=='complete'","consensus?.ok!==true","Number(consensus.successful)<7","window.modeledPlayerValuesV319?.ready!==true","window.valueHistoryModelV90"]){
  assert.ok(guard.includes(needle),'missing fail-closed guard '+needle);
 }
 assert.ok(ui.includes('await verifyLiveValuationModelV95()'),'market view must check actual active valuation identity');
});
