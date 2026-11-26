import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const path='trade-specific-max-tier-add-v300.js';
const base='ebdd98fe874f83a0d41cfa4fb4a6fef02a57488f';
const original=execFileSync('git',['show',base+':'+path],{encoding:'utf8'});
const candidate=readFileSync(path,'utf8');
const complement=readFileSync('trade-add-assets-complement-v1.js','utf8');
async function run(src,tier,position,sendPick){
 const outgoing=Array.from({length:34},(_,i)=>({type:i%5===0?'pick':'player',id:'s'+i,owner:1,round:1,season:2027,value:700+i*180,rank:20+i,position:i%2?'RB':'WR'}));
 const target={type:'player',id:'t',owner:2,value:5400,rank:32,position:'RB'};
 const incoming=Array.from({length:32},(_,i)=>({type:i%4===0?'pick':'player',id:'r'+i,owner:2,round:2,season:2027,value:500+i*120,rank:15+i,position:i%2?'RB':'WR'}));
 const selected=outgoing[sendPick?0:tier==='up'?21:1],fairCalls=[];let ranks=0;
 const host={innerHTML:'',appendChild(){}},elements={finderResults:host,findTeam:{value:'1'},desiredPlayerSearch:{value:'Target'},findMode:{value:'value'},tradeTier94:{value:tier},tradeAssist97:{checked:true}};
 const win={state:{allAssets:[...outgoing,target,...incoming],teams:[{id:1},{id:2}]},playerName:id=>id==='t'?'Target':id,groupPos:x=>x.position,playerRankValue:x=>{ranks++;return{rank:x.rank}},tradeValueNormalizationV139:{canonicalValue:x=>x.value},section1V130:{fair(a,b){fairCalls.push([a.map(x=>x.id),b.map(x=>x.id)]);const ar=a.reduce((s,x)=>s+x.value,0),br=b.reduce((s,x)=>s+x.value,0);return {score:83,rejected:false,edgeEffective:br-ar,aRaw:ar,bRaw:br,aAdj:0,bAdj:0,aEffective:ar,bEffective:br}}}};
 const document={getElementById:id=>elements[id],querySelectorAll:q=>q.includes('shopCheck')?[{_asset:selected}]:q.includes('trade97-pos')?[{value:position}]:[],addEventListener(){},createElement(){return {style:{}}}};
 const ctx=vm.createContext({window:win,document,console,setTimeout:fn=>fn()});
 vm.runInContext(complement,ctx);
 const anchor='window.tradeSpecificMaxTierAddV300={run,';
 assert.equal(src.split(anchor).length,2);
 vm.runInContext(src.replace(anchor,'window.tradeSpecificMaxTierAddV300={auditRows:()=>rows,run,'),ctx);
 const api=win.tradeSpecificMaxTierAddV300;assert(api.active());await api.run();
 return {fairCalls:JSON.parse(JSON.stringify(fairCalls)),rows:JSON.parse(JSON.stringify(api.auditRows())),ranks};
}
test('scoped max value tier add preserves every fairness call and complete ordered results while reducing rank reads',async()=>{
 let positive=0,oldRanks=0,newRanks=0;
 for(const tier of ['up','down'])for(const pos of ['ANY','RB','WR'])for(const pick of [false,true]){
  const a=await run(original,tier,pos,pick),b=await run(candidate,tier,pos,pick);
  assert.deepEqual(b.fairCalls,a.fairCalls,'ordered fairness calls '+[tier,pos,pick]);
  assert.deepEqual(b.rows,a.rows,'ordered recommendations '+[tier,pos,pick]);
  positive+=b.rows.length;oldRanks+=a.ranks;newRanks+=b.ranks;
 }
 assert(positive>0,'No nonempty cases');
 assert(newRanks<oldRanks,'Rank calls not reduced');
 console.log(JSON.stringify({positive,oldRanks,newRanks}));
});
