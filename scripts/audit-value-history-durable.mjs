// Read-only audit of the authoritative GitHub Value History branch.
// No Netlify access, archive PUT, history mutation, or inferred player prices.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const gitShow=path=>JSON.parse(execFileSync('git',['show','origin/value-history-data:'+path],{encoding:'utf8',maxBuffer:30*1024*1024}));
export function inspectDurableHistory(index,latest,snapshots=[]){
  const items=Array.isArray(index?.items)?index.items:[],times=items.map(x=>String(x?.t||'')),unique=new Set(times);
  assert.equal(Number(index?.snapshot_count),items.length,'archive declared count mismatch');
  assert.equal(unique.size,items.length,'duplicate durable archive timestamps');
  assert.equal(String(index.latest),times.at(-1),'durable latest index mismatch');
  assert.equal(String(latest?.latest?.t),String(index.latest),'durable latest pointer mismatch');
  for(let i=1;i<times.length;i++)assert.ok(times[i]>times[i-1],'durable index not strictly chronological');
  const comparable=[];
  const [a,b]=snapshots;
  if(a&&b){
    assert.equal(a.t,snapshots[0].t);
    assert.equal(b.t,snapshots[1].t);
    const old=new Map((a.rows||[]).map(r=>[String(r.id),r]));
    for(const row of b.rows||[]){
      const p=old.get(String(row.id));
      if(!p||!Number.isFinite(Number(row.value))||!Number.isFinite(Number(p.value))||Number(p.value)<=0)continue;
      comparable.push({position:String(row.pos||''),delta:Number(row.value)-Number(p.value),change_fraction:Math.abs((Number(row.value)-Number(p.value))/Number(p.value))});
    }
  }
  const positions={};
  for(const r of comparable){
    const p=positions[r.position]||(positions[r.position]={observations:0,risers:0,fallers:0,unchanged:0,change_over_25pct:0});
    p.observations++;
    if(r.delta>0)p.risers++;else if(r.delta<0)p.fallers++;else p.unchanged++;
    if(r.change_fraction>=.25)p.change_over_25pct++;
  }
  const modelProven=!!a?.valuation_model&&a.valuation_model===b?.valuation_model;
  return{
    durable_snapshot_count:items.length,durable_latest:index.latest,
    last_scheduled_gap_hours: a&&b?Number(((Date.parse(b.t)-Date.parse(a.t))/3600000).toFixed(2)):null,
    compared_players:comparable.length,
    explicit_model_comparability_verified:modelProven,
    warning:modelProven?null:'Both historical points lack matching explicit valuation_model IDs; large deltas could include model repricing. Do not certify all as genuine same-model market movement.',
    movements_by_position:positions
  };
}
if(process.argv.includes('--git-archive')){
  const index=gitShow('value-history/index.json'),latest=gitShow('value-history/latest.json');
  const lastTwo=(index.items||[]).filter(x=>x.source==='scheduled').slice(-2);
  const snaps=lastTwo.map(item=>gitShow(item.path));
  console.log(JSON.stringify(inspectDurableHistory(index,latest,snaps),null,2));
}
