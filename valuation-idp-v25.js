(()=>{
const priorMaster25=masterRankings;
const priorAudit25=window.idpScoringAudit;
const clamp25=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
const q25=(arr,p)=>{if(!arr.length)return 0;const a=[...arr].sort((x,y)=>x-y),i=clamp25(0,(a.length-1)*p,a.length-1),lo=Math.floor(i),hi=Math.ceil(i);return a[lo]+(a[hi]-a[lo])*(i-lo)};
const pct25=(arr,x)=>{if(!arr.length)return .5;let below=0,equal=0;for(const v of arr){if(v<x)below++;else if(v===x)equal++}return clamp25(.01,(below+.5*equal)/arr.length,.99)};
function age25(id){const p=state.players?.[id]||{},a=Number(p.age);if(Number.isFinite(a)&&a>0)return a;if(p.birth_date){const d=new Date(p.birth_date);if(!Number.isNaN(d.getTime()))return(Date.now()-d.getTime())/(365.2425*86400000)}return null}
function ageScore25(id){const a=age25(id);if(!Number.isFinite(a))return .5;if(a<=23)return 1;if(a<=25)return .9;if(a<=27)return .8;if(a<=29)return .67;if(a<=31)return .52;if(a<=33)return .35;return .2}
function breakdownQty25(sample,keys){let n=0;for(const k of keys){const b=sample?.breakdown?.[k];if(b&&Number.isFinite(Number(b.qty)))n+=Number(b.qty)}return n}
function historyMetrics25(a){
 const samples=Array.isArray(a?.seasons)?a.seasons:[],coverage=samples.reduce((s,x)=>s+Number(x.assignedWeight||0),0);if(!samples.length||coverage<=0)return{ppg:0,tackleRate:0,spikeRate:0,confidence:0,coverage:0,seasons:0};
 let ppg=0,tackles=0,spikes=0;
 for(const s of samples){const w=Number(s.assignedWeight||0),g=Math.max(1,Number(s.games||0));ppg+=Number(s.ppg||0)*w;tackles+=((breakdownQty25(s,['idp_tkl_solo'])+breakdownQty25(s,['idp_tkl_ast']))/g)*w;spikes+=((breakdownQty25(s,['idp_sack'])+breakdownQty25(s,['idp_int'])+breakdownQty25(s,['idp_ff'])+breakdownQty25(s,['idp_fum_rec'])+breakdownQty25(s,['idp_pass_def']))/g)*w}
 return{ppg:ppg/coverage,tackleRate:tackles/coverage,spikeRate:spikes/coverage,confidence:clamp25(0,Number(a.confidence||0),1),coverage,seasons:Number(a.qualifyingSeasons||samples.length)};
}
let cache25=null,statsRef25=null,planKey25='';
function distributions25(){
 const key=JSON.stringify(state.sleeperHistory?.weightPlan||{});if(cache25&&statsRef25===state.stats&&planKey25===key)return cache25;
 const rows=[];for(const id of Object.keys(state.players||{})){if(groupPos({type:'player',id})!=='IDP')continue;const a=typeof priorAudit25==='function'?priorAudit25(id):null;if(!a?.qualifyingSeasons)continue;const m=historyMetrics25(a);rows.push({id,a,m})}
 cache25={rows,ppg:rows.map(r=>r.m.ppg),tackles:rows.map(r=>r.m.tackleRate),spikes:rows.map(r=>r.m.spikeRate)};statsRef25=state.stats;planKey25=key;return cache25;
}
function scoring25(id){
 const a=typeof priorAudit25==='function'?priorAudit25(id):null,m=historyMetrics25(a),d=distributions25();
 if(!a?.qualifyingSeasons||!d.ppg.length)return{value:520,a,m,ppgPct:null,relative:null,strength:.45};
 const p50=q25(d.ppg,.50),p99=Math.max(p50+.01,q25(d.ppg,.99)),ppgPct=pct25(d.ppg,m.ppg),relative=clamp25(0,(m.ppg-p50)/(p99-p50),1.10),raw=.55*ppgPct+.45*relative,strength=.45+m.confidence*(raw-.45),value=180+1270*Math.pow(clamp25(.08,strength,1),2.70);
 return{value:clamp25(180,value,1500),a,m,ppgPct,relative,strength};
}
function context25(id,score){
 const d=distributions25(),m=score.m,conf=m.confidence||0,tPct=d.tackles.length?pct25(d.tackles,m.tackleRate):.5,sPct=d.spikes.length?pct25(d.spikes,m.spikeRate):.5;
 const tackle=.5+conf*(tPct-.5),spike=.5+conf*(sPct-.5),age=ageScore25(id),index=.35*tackle+.45*spike+.20*age;
 // This is deliberately modest: tackle/spike frequency and age can nudge IDP value, not replace the 40% scoring-history signal.
 const value=430+420*clamp25(.05,index,.95);
 return{value,tacklePct:tPct,spikePct:sPct,tackleRate:m.tackleRate,spikeRate:m.spikeRate,age,index};
}
function model25(z){
 if(groupPos(z.x)!=='IDP')return z;
 const c=Number(z.consensus),score=scoring25(z.x.id),ctx=context25(z.x.id,score);
 if(!Number.isFinite(c)||c<=0){const v=.40*score.value+.20*ctx.value;return{...z,value:Math.max(25,Math.min(700,Math.round(v))),context:Math.round(ctx.value),production:{...score,leagueContext:ctx},fallback:true}}
 let value=.40*c+.40*score.value+.20*ctx.value;
 // Consensus is a sanity rail, not the dominant IDP engine.
 value=clamp25(c*.45,value,Math.max(c*2.15,c+760));
 return{...z,value:Math.max(1,Math.round(value)),consensus:Math.round(c),context:Math.round(ctx.value),production:{...score,leagueContext:ctx},fallback:false};
}
masterRankings=function(){return priorMaster25().map(model25).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
assetLabel=function(x){if(x.type==='pick')return x.name;const m=playerRankValue(x),cv=m.consensus==null?'fallback':m.consensus;return `${playerName(x.id)} <span class="muted">(${groupPos(x)} • CV ${cv} • TV ${m.value})</span>`};
window.idpScoringAudit=function(nameOrId){const q=String(nameOrId||'').toLowerCase(),id=state.players?.[nameOrId]?String(nameOrId):Object.keys(state.players||{}).find(pid=>playerName(pid).toLowerCase()===q);if(!id)return null;const base=typeof priorAudit25==='function'?priorAudit25(id):null,score=scoring25(id),ctx=context25(id,score),c=Number(base?.consensus);return{...base,consensus:Number.isFinite(c)?c:null,finalValue:Number.isFinite(c)?Math.round(.40*c+.40*score.value+.20*ctx.value):null,productionValue:Math.round(score.value),otherContextValue:Math.round(ctx.value),tackleRate:Number(ctx.tackleRate.toFixed(2)),spikeRate:Number(ctx.spikeRate.toFixed(2)),tacklePercentile:Number((ctx.tacklePct*100).toFixed(1)),spikePercentile:Number((ctx.spikePct*100).toFixed(1)),ageContext:Number((ctx.age*100).toFixed(0)),modelWeights:{consensus:.40,scoringLookback:.40,otherLeagueDynastyContext:.20}}};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
const card=document.querySelector('#settings .card');if(card){const n=document.createElement('div');n.className='notice success';n.innerHTML='V25 IDP calibration staged: <b>40% consensus + 40% actual Sleeper scoring lookback + 20% other league/dynasty context</b>. The 20% context uses age plus small tackle-volume and spike-play-frequency signals (sacks, interceptions, forced fumbles, recoveries and pass defenses) from the same imported Sleeper history. All history-dependent pieces refresh with Update. Missing qualifying years shrink confidence toward neutral rather than transferring their full weight to a short sample.';card.appendChild(n)}
})();
