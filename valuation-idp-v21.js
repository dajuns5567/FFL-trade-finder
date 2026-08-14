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
function ageFactor24(id){const a=age24(id);if(!Number.isFinite(a))return 1;if(a<=23)return 1.08;if(a<=25)return 1.06;if(a<=27)return 1.04;if(a<=29)return 1.02;if(a<=31)return 1;if(a<=33)return .97;return .93}
function consensus24(id){const v=Number(state.consensusComposite?.byId?.[String(id)]);return Number.isFinite(v)&&v>0?v:null}
function detail24(id){return state.consensusComposite?.detailsById?.[String(id)]||null}
function fallbackWeightPlan24(){const years=Object.keys(state.stats||{}).map(Number).filter(Number.isFinite).sort((a,b)=>b-a),latest=Number(state.league?.season)||years[0]||FALLBACK_SEASON;return{mode:'preseason-offseason',completedWeek:0,yearWeights:{[latest-1]:.60,[latest-2]:.30,[latest-3]:.10}}}
function historyPlan24(){return state.sleeperHistory?.weightPlan?.yearWeights?state.sleeperHistory.weightPlan:fallbackWeightPlan24()}
function realIdpScore24(id){
 const plan=historyPlan24(),yearWeights=plan.yearWeights||{},currentSeason=Number(state.sleeperHistory?.currentSeason),settings=activeScoring24(),samples=[];
 for(const [yearRaw,assignedRaw] of Object.entries(yearWeights)){
  const y=Number(yearRaw),assigned=Number(assignedRaw);if(!Number.isFinite(y)||!Number.isFinite(assigned)||assigned<=0)continue;
  const row=state.stats?.[y]?.[id];if(!row)continue;const s=statObj24(row),gp=games24(row),isCurrent=plan.mode==='in-season'&&y===currentSeason;
  if(isCurrent){if(gp<1)continue}else if(gp<8)continue;
  let points=0,premiumPoints=0;const breakdown={};
  for(const [key,weightRaw] of Object.entries(settings)){
   const weight=Number(weightRaw||0);if(!weight)continue;const qty=statNumber24(s,key);if(!qty)continue;const pts=qty*weight;points+=pts;breakdown[key]={qty,weight,points:pts};if(PREMIUM_KEYS.has(key))premiumPoints+=pts;
  }
  const pprRef=Number.isFinite(Number(s.pts_ppr))?Number(s.pts_ppr):null;
  samples.push({season:y,games:gp,assignedWeight:assigned,currentSeason:isCurrent,points,ppg:points/gp,premiumPoints,premiumPpg:premiumPoints/gp,pprRef,breakdown});
 }
 if(!samples.length)return{seasons:0,historicalSeasons:0,ppg:0,premiumPpg:0,confidence:0,weightCoverage:0,samples:[],weightPlan:plan};
 samples.sort((a,b)=>b.season-a.season);
 const coverage=samples.reduce((s,x)=>s+x.assignedWeight,0),den=Math.max(.0001,coverage);
 const ppg=samples.reduce((s,x)=>s+x.ppg*x.assignedWeight,0)/den,premiumPpg=samples.reduce((s,x)=>s+x.premiumPpg*x.assignedWeight,0)/den;
 const historical=samples.filter(x=>!x.currentSeason),historicalCount=historical.length;
 const historyConfidence=historicalCount>=3?1:historicalCount===2?.74:historicalCount===1?.42:.20;
 const currentSample=samples.find(x=>x.currentSeason),currentGameConfidence=currentSample?clamp24(.15,currentSample.games/14,1):1;
 const coverageConfidence=clamp24(.20,coverage,1);
 const confidence=clamp24(.08,coverageConfidence*(.66+.34*historyConfidence)*(currentSample?(.78+.22*currentGameConfidence):1),1);
 return{seasons:samples.length,historicalSeasons:historicalCount,ppg,premiumPpg,confidence,weightCoverage:coverage,samples,weightPlan:plan};
}
function percentile24(arr,x){if(!arr.length)return.5;const a=arr.slice().sort((m,n)=>m-n);let below=0,equal=0;for(const v of a){if(v<x)below++;else if(v===x)equal++}return clamp24(.01,(below+.5*equal)/a.length,.99)}
let distCache24=null,distStatsRef24=null,distPlanKey24='';
function idpDistribution24(){
 const planKey=JSON.stringify(state.sleeperHistory?.weightPlan||{});if(distCache24&&distStatsRef24===state.stats&&distPlanKey24===planKey)return distCache24;
 const ppg=[],premium=[];const ids=new Set();for(const y of Object.keys(state.stats||{}))for(const id of Object.keys(state.stats?.[y]||{}))ids.add(String(id));
 for(const id of ids){if(groupPos({type:'player',id})!=='IDP')continue;const rs=realIdpScore24(id);if(!rs.seasons)continue;ppg.push(rs.ppg);premium.push(rs.premiumPpg)}
 distStatsRef24=state.stats;distPlanKey24=planKey;distCache24={ppg,premium};return distCache24;
}
function productionComponent24(id){
 const rs=realIdpScore24(id),d=idpDistribution24();if(!rs.seasons)return{value:500,rs,ppgPct:null,premiumPct:null,effectivePct:.50};
 const ppgPct=percentile24(d.ppg,rs.ppg),premiumPct=percentile24(d.premium,rs.premiumPpg),rawPct=.82*ppgPct+.18*premiumPct;
 const effectivePct=.50+rs.confidence*(rawPct-.50);
 // Nonlinear top end: only sustained elite actual league scoring produces elite production value.
 const value=150+1800*Math.pow(clamp24(.03,effectivePct,.99),3.4);
 return{value,rs,ppgPct,premiumPct,effectivePct};
}
function otherIdpContext24(id,rs){
 // No IDP positional-scarcity multiplier. This 20% portion is modest dynasty horizon/sample context only.
 const sample=rs.historicalSeasons>=3?1:rs.historicalSeasons===2?.96:rs.historicalSeasons===1?.90:.86;
 return 520*ageFactor24(id)*sample;
}
function universe24(){const ids=new Set(state.allAssets.filter(x=>x.type==='player').map(x=>String(x.id)));for(const id of Object.keys(state.consensusComposite?.byId||{}))ids.add(String(id));return[...ids].filter(id=>state.players?.[id]?.fantasy_positions?.length).map(id=>({type:'player',id,owner:state.allAssets.find(x=>x.type==='player'&&String(x.id)===id)?.owner??null}))}
function model24(x,legacyById){
 if(groupPos(x)!=='IDP')return legacyById.get(String(x.id))||{x,value:1,consensus:null,context:null,fallback:true};
 const c=consensus24(x.id),prod=productionComponent24(x.id),rs=prod.rs,other=otherIdpContext24(x.id,rs);
 if(!c){const value=.30*prod.value+.20*other;return{x,value:Math.max(25,Math.min(650,Math.round(value))),consensus:null,context:Math.round(.60*prod.value+.40*other),fallback:true,production:prod}}
 // IDP total = 50% consensus + 30% actual Sleeper scoring lookback + 20% other IDP dynasty context.
 let value=.50*c+.30*prod.value+.20*other;
 const rank=Number(detail24(x.id)?.idpRank);value=clamp24(c*.62,value,Math.max(c*2.60,c+850));if(Number.isFinite(rank)&&rank<=12&&rs.confidence<.60)value=Math.min(value,c*.82+260);
 return{x,value:Math.max(1,Math.round(value)),consensus:Math.round(c),context:Math.round(.60*prod.value+.40*other),fallback:false,production:prod};
}
masterRankings=function(){const legacy=legacyMasterRankings(),legacyById=new Map(legacy.map(z=>[String(z.x.id),z]));return universe24().map(x=>model24(x,legacyById)).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
assetLabel=function(x){if(x.type==='pick')return x.name;const m=playerRankValue(x),cv=m.consensus==null?'fallback':m.consensus;return `${playerName(x.id)} <span class="muted">(${groupPos(x)} • CV ${cv} • TV ${m.value})</span>`};
window.idpScoringAudit=function(nameOrId){const q=String(nameOrId||'').toLowerCase(),id=state.players?.[nameOrId]?String(nameOrId):Object.keys(state.players||{}).find(id=>playerName(id).toLowerCase()===q);if(!id)return null;const c=consensus24(id),prod=productionComponent24(id),other=otherIdpContext24(id,prod.rs);return{id,name:playerName(id),consensus:c,finalValue:c?Math.round(.50*c+.30*prod.value+.20*other):null,productionValue:Math.round(prod.value),otherContextValue:Math.round(other),ppg:Number(prod.rs.ppg.toFixed(2)),premiumPpg:Number(prod.rs.premiumPpg.toFixed(2)),qualifyingSeasons:prod.rs.seasons,historicalSeasons:prod.rs.historicalSeasons,confidence:Number(prod.rs.confidence.toFixed(3)),weightCoverage:Number(prod.rs.weightCoverage.toFixed(3)),weightPlan:prod.rs.weightPlan,ppgPercentile:prod.ppgPct==null?null:Number((prod.ppgPct*100).toFixed(1)),premiumPercentile:prod.premiumPct==null?null:Number((prod.premiumPct*100).toFixed(1)),effectivePercentile:Number((prod.effectivePct*100).toFixed(1)),seasons:prod.rs.samples};};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
const model=document.querySelector('#settings .card');if(model){const n=document.createElement('div');n.className='notice success';n.innerHTML='V24 IDP calibration: <b>50% consensus + 30% actual Sleeper scoring lookback + 20% other IDP dynasty context</b>. The scoring lookback is reconstructed from the importer using this league\'s scoring settings and dynamic current/prior-season weights. There is <b>no IDP positional scarcity multiplier</b>. Production is nonlinear so only sustained elite PPG/premium-event scoring receives elite production value. Offensive valuation math is unchanged.';model.appendChild(n)}
})();
