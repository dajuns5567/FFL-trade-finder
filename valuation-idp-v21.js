(()=>{
const legacyMasterRankings=masterRankings;
const clamp24=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
const PREMIUM_KEYS=new Set(['idp_td','idp_sack','idp_qb_hit','idp_tkl_loss','idp_blk_kick','idp_int','idp_int_yd','idp_fum_rec','idp_fum_rec_yd','idp_ff','idp_safety','idp_pass_def']);
const SCORE_ALIASES={idp_td:['def_td','td'],idp_sack:['sack'],idp_qb_hit:['qb_hit','qb_hits'],idp_tkl_loss:['tkl_loss','tfl'],idp_blk_kick:['blk_kick'],idp_int:['int'],idp_int_yd:['int_yd'],idp_fum_rec:['fum_rec'],idp_fum_rec_yd:['fum_rec_yd'],idp_ff:['ff'],idp_safety:['safety'],idp_tkl_ast:['tkl_ast','ast_tkl'],idp_tkl_solo:['tkl_solo','solo_tkl'],idp_pass_def:['pass_def','pd']};
function statObj24(row){return row?.stats&&typeof row.stats==='object'?row.stats:(row||{})}
function statNumber24(s,key){if(Number.isFinite(Number(s?.[key])))return Number(s[key]);if(key.startsWith('idp_')){const bare=key.slice(4);if(Number.isFinite(Number(s?.[bare])))return Number(s[bare])}for(const a of SCORE_ALIASES[key]||[]){if(Number.isFinite(Number(s?.[a])))return Number(s[a])}return 0}
function games24(row){const s=statObj24(row);for(const k of ['gp','gms_active','games_played','games','gms']){const n=Number(s?.[k]);if(Number.isFinite(n)&&n>=0)return n}return 0}
function activeScoring24(){return{...scoring,...(state.league?.scoring_settings||{})}}
function age24(id){const p=state.players?.[id]||{},a=Number(p.age);if(Number.isFinite(a)&&a>0)return a;if(p.birth_date){const d=new Date(p.birth_date);if(!Number.isNaN(d.getTime()))return(Date.now()-d.getTime())/(365.2425*86400000)}return null}
function idpAgeFactor24(id){const a=age24(id);if(!Number.isFinite(a))return 1;if(a<=23)return 1.06;if(a<=25)return 1.05;if(a<=27)return 1.03;if(a<=29)return 1.01;if(a<=31)return 1;if(a<=33)return .97;return .93}
function offenseAgeFactor24(id,pos){const a=age24(id);if(!Number.isFinite(a))return 1;if(pos==='RB'){if(a<=23)return 1.08;if(a<=25)return 1.05;if(a<=27)return 1.01;if(a<=29)return .95;if(a<=31)return .88;return .80}if(pos==='WR'){if(a<=24)return 1.05;if(a<=27)return 1.03;if(a<=30)return 1;if(a<=32)return .95;return .88}if(pos==='TE'){if(a<=25)return 1.04;if(a<=29)return 1.02;if(a<=32)return .98;return .92}if(pos==='QB'){if(a<=27)return 1.03;if(a<=33)return 1.01;if(a<=36)return .97;return .92}return 1}
function consensus24(id){const v=Number(state.consensusComposite?.byId?.[String(id)]);return Number.isFinite(v)&&v>0?v:null}
function detail24(id){return state.consensusComposite?.detailsById?.[String(id)]||null}
function fallbackWeightPlan24(){const years=Object.keys(state.stats||{}).map(Number).filter(Number.isFinite).sort((a,b)=>b-a),latest=Number(state.league?.season)||years[0]||FALLBACK_SEASON;return{mode:'preseason-offseason',completedWeek:0,yearWeights:{[latest-1]:.60,[latest-2]:.30,[latest-3]:.10}}}
function historyPlan24(){return state.sleeperHistory?.weightPlan?.yearWeights?state.sleeperHistory.weightPlan:fallbackWeightPlan24()}
function seasonConfidence24(historicalCount,currentSample,coverage){const historyConfidence=historicalCount>=3?1:historicalCount===2?.74:historicalCount===1?.42:.20;const currentGameConfidence=currentSample?clamp24(.15,currentSample.games/14,1):1;const coverageConfidence=clamp24(.20,coverage,1);return clamp24(.08,coverageConfidence*(.66+.34*historyConfidence)*(currentSample?(.78+.22*currentGameConfidence):1),1)}
function scoreSeason24(id,y,assigned,kind){
 const row=state.stats?.[y]?.[id];if(!row)return null;const s=statObj24(row),gp=games24(row);if(!gp)return null;
 const plan=historyPlan24(),currentSeason=Number(state.sleeperHistory?.currentSeason),isCurrent=plan.mode==='in-season'&&y===currentSeason;
 if(isCurrent){if(gp<1)return null}else if(gp<8)return null;
 if(kind==='offense'){
   const ptsPpr=Number(s.pts_ppr);let points=Number.isFinite(ptsPpr)?ptsPpr:null;
   if(points==null){points=0;for(const [key,wRaw] of Object.entries(activeScoring24())){if(key.startsWith('idp_'))continue;const w=Number(wRaw||0);if(!w)continue;points+=statNumber24(s,key)*w}}
   return{season:y,games:gp,assignedWeight:assigned,currentSeason:isCurrent,points,ppg:points/gp,pprPoints:Number.isFinite(ptsPpr)?ptsPpr:null,pprPpg:Number.isFinite(ptsPpr)?ptsPpr/gp:null};
 }
 let points=0,premiumPoints=0;const breakdown={};
 for(const [key,wRaw] of Object.entries(activeScoring24())){const w=Number(wRaw||0);if(!w)continue;const qty=statNumber24(s,key);if(!qty)continue;const pts=qty*w;points+=pts;breakdown[key]={qty,weight:w,points:pts};if(PREMIUM_KEYS.has(key))premiumPoints+=pts}
 return{season:y,games:gp,assignedWeight:assigned,currentSeason:isCurrent,points,ppg:points/gp,premiumPoints,premiumPpg:premiumPoints/gp,breakdown};
}
function realScore24(id,kind){
 const plan=historyPlan24(),yearWeights=plan.yearWeights||{},samples=[];
 for(const [yearRaw,assignedRaw] of Object.entries(yearWeights)){const y=Number(yearRaw),assigned=Number(assignedRaw);if(!Number.isFinite(y)||!Number.isFinite(assigned)||assigned<=0)continue;const s=scoreSeason24(id,y,assigned,kind);if(s)samples.push(s)}
 if(!samples.length)return{seasons:0,historicalSeasons:0,ppg:0,premiumPpg:0,confidence:0,weightCoverage:0,samples:[],weightPlan:plan};
 samples.sort((a,b)=>b.season-a.season);const coverage=samples.reduce((s,x)=>s+x.assignedWeight,0),den=Math.max(.0001,coverage),ppg=samples.reduce((s,x)=>s+x.ppg*x.assignedWeight,0)/den;
 const premiumPpg=kind==='idp'?samples.reduce((s,x)=>s+(x.premiumPpg||0)*x.assignedWeight,0)/den:0;const historical=samples.filter(x=>!x.currentSeason),currentSample=samples.find(x=>x.currentSeason),confidence=seasonConfidence24(historical.length,currentSample,coverage);
 return{seasons:samples.length,historicalSeasons:historical.length,ppg,premiumPpg,confidence,weightCoverage:coverage,samples,weightPlan:plan};
}
function percentile24(arr,x){if(!arr.length)return.5;const a=arr.slice().sort((m,n)=>m-n);let below=0,equal=0;for(const v of a){if(v<x)below++;else if(v===x)equal++}return clamp24(.01,(below+.5*equal)/a.length,.99)}
let distCache24=null,distStatsRef24=null,distPlanKey24='';
function distributions24(){
 const planKey=JSON.stringify(state.sleeperHistory?.weightPlan||{});if(distCache24&&distStatsRef24===state.stats&&distPlanKey24===planKey)return distCache24;
 const out={IDP:{ppg:[],premium:[]},QB:{ppg:[]},RB:{ppg:[]},WR:{ppg:[]},TE:{ppg:[]}};const ids=new Set();for(const y of Object.keys(state.stats||{}))for(const id of Object.keys(state.stats?.[y]||{}))ids.add(String(id));
 for(const id of ids){const pos=groupPos({type:'player',id});if(pos==='IDP'){const rs=realScore24(id,'idp');if(rs.seasons){out.IDP.ppg.push(rs.ppg);out.IDP.premium.push(rs.premiumPpg)}}else if(out[pos]){const rs=realScore24(id,'offense');if(rs.seasons)out[pos].ppg.push(rs.ppg)}}
 distStatsRef24=state.stats;distPlanKey24=planKey;distCache24=out;return out;
}
function idpProductionComponent24(id){const rs=realScore24(id,'idp'),d=distributions24().IDP;if(!rs.seasons)return{value:480,rs,ppgPct:null,premiumPct:null,effectivePct:.50};const ppgPct=percentile24(d.ppg,rs.ppg),premiumPct=percentile24(d.premium,rs.premiumPpg),rawPct=.84*ppgPct+.16*premiumPct,effectivePct=.50+rs.confidence*(rawPct-.50);const value=120+1900*Math.pow(clamp24(.03,effectivePct,.99),3.65);return{value,rs,ppgPct,premiumPct,effectivePct}}
function offenseProductionComponent24(id,pos){const rs=realScore24(id,'offense'),d=distributions24()[pos]?.ppg||[];if(!rs.seasons)return{value:null,rs,ppgPct:null,effectivePct:.50};const ppgPct=percentile24(d,rs.ppg),effectivePct=.50+rs.confidence*(ppgPct-.50);const base={QB:1050,RB:900,WR:900,TE:760}[pos]||850,spread={QB:1450,RB:1250,WR:1200,TE:1050}[pos]||1100;const value=base*.35+spread*Math.pow(clamp24(.03,effectivePct,.99),2.15);return{value,rs,ppgPct,effectivePct}}
function otherIdpContext24(id,rs){const sample=rs.historicalSeasons>=3?1:rs.historicalSeasons===2?.96:rs.historicalSeasons===1?.90:.86;return 500*idpAgeFactor24(id)*sample}
function offenseOtherContext24(id,pos,c,detail){let scarcity=1;if(pos==='QB'){const r=Number(detail?.offenseRank);scarcity=Number.isFinite(r)&&r<=24?1.20:Number.isFinite(r)&&r<=72?1.16:1.12}else if(pos==='RB'){const r=Number(detail?.offenseRank);scarcity=Number.isFinite(r)&&r<=80?1.18:Number.isFinite(r)&&r<=180?1.14:1.10}else if(pos==='WR')scarcity=1.03;else if(pos==='TE')scarcity=1.01;return c*scarcity*offenseAgeFactor24(id,pos)}
function universe24(){const ids=new Set(state.allAssets.filter(x=>x.type==='player').map(x=>String(x.id)));for(const id of Object.keys(state.consensusComposite?.byId||{}))ids.add(String(id));return[...ids].filter(id=>state.players?.[id]?.fantasy_positions?.length).map(id=>({type:'player',id,owner:state.allAssets.find(x=>x.type==='player'&&String(x.id)===id)?.owner??null}))}
function model24(x,legacyById){
 const pos=groupPos(x),c=consensus24(x.id),detail=detail24(x.id);
 if(pos==='IDP'){
   const prod=idpProductionComponent24(x.id),rs=prod.rs,other=otherIdpContext24(x.id,rs);
   if(!c){const value=.35*prod.value+.15*other;return{x,value:Math.max(25,Math.min(700,Math.round(value))),consensus:null,context:Math.round(.70*prod.value+.30*other),fallback:true,production:prod}}
   let value=.50*c+.35*prod.value+.15*other;const rank=Number(detail?.idpRank);value=clamp24(c*.58,value,Math.max(c*2.70,c+900));if(Number.isFinite(rank)&&rank<=12&&rs.confidence<.60)value=Math.min(value,c*.80+250);
   return{x,value:Math.max(1,Math.round(value)),consensus:Math.round(c),context:Math.round(.70*prod.value+.30*other),fallback:false,production:prod};
 }
 if(!c)return legacyById.get(String(x.id))||{x,value:1,consensus:null,context:null,fallback:true};
 const prod=offenseProductionComponent24(x.id,pos),other=offenseOtherContext24(x.id,pos,c,detail);const prodValue=Number.isFinite(prod.value)?prod.value:c;
 let value=.70*c+.18*prodValue+.12*other;value=clamp24(c*.78,value,c*1.30);if(Number(detail?.offenseRank)<=24)value=Math.max(value,c*.94);if(Number(detail?.offenseRank)>220)value=Math.min(value,c*1.12);
 return{x,value:Math.max(1,Math.round(value)),consensus:Math.round(c),context:Math.round((.18*prodValue+.12*other)/.30),fallback:false,production:prod};
}
masterRankings=function(){const legacy=legacyMasterRankings(),legacyById=new Map(legacy.map(z=>[String(z.x.id),z]));return universe24().map(x=>model24(x,legacyById)).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
assetLabel=function(x){if(x.type==='pick')return x.name;const m=playerRankValue(x),cv=m.consensus==null?'fallback':m.consensus;return `${playerName(x.id)} <span class="muted">(${groupPos(x)} • CV ${cv} • TV ${m.value})</span>`};
window.idpScoringAudit=function(nameOrId){const q=String(nameOrId||'').toLowerCase(),id=state.players?.[nameOrId]?String(nameOrId):Object.keys(state.players||{}).find(id=>playerName(id).toLowerCase()===q);if(!id)return null;const c=consensus24(id),prod=idpProductionComponent24(id),other=otherIdpContext24(id,prod.rs);return{id,name:playerName(id),consensus:c,finalValue:c?Math.round(.50*c+.35*prod.value+.15*other):null,productionValue:Math.round(prod.value),otherContextValue:Math.round(other),ppg:Number(prod.rs.ppg.toFixed(2)),premiumPpg:Number(prod.rs.premiumPpg.toFixed(2)),qualifyingSeasons:prod.rs.seasons,historicalSeasons:prod.rs.historicalSeasons,confidence:Number(prod.rs.confidence.toFixed(3)),weightCoverage:Number(prod.rs.weightCoverage.toFixed(3)),weightPlan:prod.rs.weightPlan,ppgPercentile:prod.ppgPct==null?null:Number((prod.ppgPct*100).toFixed(1)),premiumPercentile:prod.premiumPct==null?null:Number((prod.premiumPct*100).toFixed(1)),effectivePercentile:Number((prod.effectivePct*100).toFixed(1)),seasons:prod.rs.samples};};
window.offenseScoringAudit=function(nameOrId){const q=String(nameOrId||'').toLowerCase(),id=state.players?.[nameOrId]?String(nameOrId):Object.keys(state.players||{}).find(id=>playerName(id).toLowerCase()===q);if(!id)return null;const pos=groupPos({type:'player',id});if(pos==='IDP')return null;const c=consensus24(id),d=detail24(id),prod=offenseProductionComponent24(id,pos),other=c?offenseOtherContext24(id,pos,c,d):null;return{id,name:playerName(id),position:pos,consensus:c,productionValue:prod.value==null?null:Math.round(prod.value),otherContextValue:other==null?null:Math.round(other),ppg:Number(prod.rs.ppg.toFixed(2)),qualifyingSeasons:prod.rs.seasons,historicalSeasons:prod.rs.historicalSeasons,confidence:Number(prod.rs.confidence.toFixed(3)),weightCoverage:Number(prod.rs.weightCoverage.toFixed(3)),weightPlan:prod.rs.weightPlan,ppgPercentile:prod.ppgPct==null?null:Number((prod.ppgPct*100).toFixed(1)),seasons:prod.rs.samples};};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
const model=document.querySelector('#settings .card');if(model){const n=document.createElement('div');n.className='notice success';n.innerHTML='V24 staged weighting: <b>IDP = 50% consensus + 35% actual Sleeper scoring lookback + 15% other IDP dynasty context</b>. <b>Offense = 70% consensus + 18% Sleeper PPR scoring lookback + 12% other offensive dynasty context</b>. Both scoring lookbacks use the same dynamic 60/30/10 offseason and current-season incremental weighting plan from the Sleeper importer. Historical seasons require 8+ games; current-year production may enter from Week 1 at the scheduled in-season weight.';model.appendChild(n)}
})();
