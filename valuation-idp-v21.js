(()=>{
const legacyMasterRankings=masterRankings;
const clamp21=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
const PREMIUM_KEYS=new Set(['idp_td','idp_sack','idp_qb_hit','idp_tkl_loss','idp_blk_kick','idp_int','idp_int_yd','idp_fum_rec','idp_fum_rec_yd','idp_ff','idp_safety','idp_pass_def']);
const SCORE_ALIASES={idp_td:['def_td','td'],idp_sack:['sack'],idp_qb_hit:['qb_hit','qb_hits'],idp_tkl_loss:['tkl_loss','tfl'],idp_blk_kick:['blk_kick'],idp_int:['int'],idp_int_yd:['int_yd'],idp_fum_rec:['fum_rec'],idp_fum_rec_yd:['fum_rec_yd'],idp_ff:['ff'],idp_safety:['safety'],idp_tkl_ast:['tkl_ast','ast_tkl'],idp_tkl_solo:['tkl_solo','solo_tkl'],idp_pass_def:['pass_def','pd']};
function statObj(row){return row?.stats&&typeof row.stats==='object'?row.stats:(row||{})}
function statNumber(s,key){if(Number.isFinite(Number(s?.[key])))return Number(s[key]);if(key.startsWith('idp_')){const bare=key.slice(4);if(Number.isFinite(Number(s?.[bare])))return Number(s[bare])}for(const a of SCORE_ALIASES[key]||[]){if(Number.isFinite(Number(s?.[a])))return Number(s[a])}return 0}
function games(row){const s=statObj(row);for(const k of ['gp','gms_active','games_played','games','gms']){const n=Number(s?.[k]);if(Number.isFinite(n)&&n>=0)return n}return 0}
function activeScoring(){return{...scoring,...(state.league?.scoring_settings||{})}}
function idpProfile21(id){const ps=new Set((state.players?.[id]?.fantasy_positions||[]).map(x=>String(x).toUpperCase()));if([...ps].some(x=>['DL','DE','DT'].includes(x)))return'front';if(ps.has('LB'))return'lb';if([...ps].some(x=>['DB','CB','S'].includes(x)))return'db';return'idp'}
function age21(id){const p=state.players?.[id]||{},a=Number(p.age);if(Number.isFinite(a)&&a>0)return a;if(p.birth_date){const d=new Date(p.birth_date);if(!Number.isNaN(d.getTime()))return(Date.now()-d.getTime())/(365.2425*86400000)}return null}
function ageFactor21(id){const a=age21(id);if(!Number.isFinite(a))return 1;if(a<=23)return 1.10;if(a<=25)return 1.07;if(a<=27)return 1.04;if(a<=29)return 1.02;if(a<=31)return 1;if(a<=33)return .96;return .92}
function consensus21(id){const v=Number(state.consensusComposite?.byId?.[String(id)]);return Number.isFinite(v)&&v>0?v:null}
function detail21(id){return state.consensusComposite?.detailsById?.[String(id)]||null}
function fallbackWeightPlan21(){
 const years=Object.keys(state.stats||{}).map(Number).filter(Number.isFinite).sort((a,b)=>b-a),latest=years[0]||Number(state.league?.season)||FALLBACK_SEASON;
 return{mode:'preseason-offseason',completedWeek:0,yearWeights:{[latest-1]:.60,[latest-2]:.30,[latest-3]:.10}};
}
function historyPlan21(){return state.sleeperHistory?.weightPlan?.yearWeights?state.sleeperHistory.weightPlan:fallbackWeightPlan21()}
function realIdpScore(id){
 const plan=historyPlan21(),yearWeights=plan.yearWeights||{},currentSeason=Number(state.sleeperHistory?.currentSeason),settings=activeScoring(),samples=[];
 for(const [yearRaw,assignedRaw] of Object.entries(yearWeights)){
  const y=Number(yearRaw),assigned=Number(assignedRaw);if(!Number.isFinite(y)||!Number.isFinite(assigned)||assigned<=0)continue;
  const row=state.stats?.[y]?.[id];if(!row)continue;const s=statObj(row),gp=games(row),isCurrent=plan.mode==='in-season'&&y===currentSeason;
  if(isCurrent){if(gp<1)continue}else if(gp<8)continue;
  let points=0,premiumPoints=0;const breakdown={};
  for(const [key,weightRaw] of Object.entries(settings)){
   const weight=Number(weightRaw||0);if(!weight)continue;const qty=statNumber(s,key);if(!qty)continue;const pts=qty*weight;points+=pts;breakdown[key]={qty,weight,points:pts};if(PREMIUM_KEYS.has(key))premiumPoints+=pts;
  }
  const pprRef=Number.isFinite(Number(s.pts_ppr))?Number(s.pts_ppr):null;
  samples.push({season:y,games:gp,assignedWeight:assigned,currentSeason:isCurrent,points,ppg:points/gp,premiumPoints,premiumPpg:premiumPoints/gp,pprRef,breakdown});
 }
 if(!samples.length)return{seasons:0,ppg:0,premiumPpg:0,confidence:0,weightCoverage:0,samples:[],weightPlan:plan};
 samples.sort((a,b)=>b.season-a.season);
 const coverage=samples.reduce((s,x)=>s+x.assignedWeight,0),den=Math.max(.0001,coverage);
 const ppg=samples.reduce((s,x)=>s+x.ppg*x.assignedWeight,0)/den,premiumPpg=samples.reduce((s,x)=>s+x.premiumPpg*x.assignedWeight,0)/den;
 const historical=samples.filter(x=>!x.currentSeason),historicalCount=historical.length;
 const historyConfidence=historicalCount>=3?1:historicalCount===2?.78:historicalCount===1?.52:.22;
 const currentSample=samples.find(x=>x.currentSeason),currentGameConfidence=currentSample?clamp21(.20,currentSample.games/14,1):1;
 const coverageConfidence=clamp21(.20,coverage,1),confidence=clamp21(.10,coverageConfidence*(.70+.30*historyConfidence)*(currentSample?(.82+.18*currentGameConfidence):1),1);
 return{seasons:samples.length,historicalSeasons:historicalCount,ppg,premiumPpg,confidence,weightCoverage:coverage,samples,weightPlan:plan};
}
function percentile(arr,x){if(!arr.length)return.5;const a=arr.slice().sort((m,n)=>m-n);let below=0,equal=0;for(const v of a){if(v<x)below++;else if(v===x)equal++}return clamp21(.01,(below+.5*equal)/a.length,.99)}
let distCache=null,distStatsRef=null,distPlanKey='';
function idpDistributions(){
 const planKey=JSON.stringify(state.sleeperHistory?.weightPlan||{});if(distCache&&distStatsRef===state.stats&&distPlanKey===planKey)return distCache;
 const groups={front:{ppg:[],premium:[]},lb:{ppg:[],premium:[]},db:{ppg:[],premium:[]},idp:{ppg:[],premium:[]},all:{ppg:[],premium:[]}};
 const ids=new Set();for(const y of Object.keys(state.stats||{}))for(const id of Object.keys(state.stats?.[y]||{}))ids.add(String(id));
 for(const id of ids){if(groupPos({type:'player',id})!=='IDP')continue;const rs=realIdpScore(id);if(!rs.seasons)continue;const g=idpProfile21(id);groups[g].ppg.push(rs.ppg);groups[g].premium.push(rs.premiumPpg);groups.all.ppg.push(rs.ppg);groups.all.premium.push(rs.premiumPpg)}
 distStatsRef=state.stats;distPlanKey=planKey;distCache=groups;return groups;
}
function idpContext21(id,consensus){
 const rs=realIdpScore(id),profile=idpProfile21(id),dists=idpDistributions(),g=(dists[profile]?.ppg.length>=20?dists[profile]:dists.all);
 if(!rs.seasons){const scarcity={front:1.10,lb:1.03,db:.98,idp:1}[profile]||1;return{value:consensus*scarcity*ageFactor21(id),rs,ppgPct:null,premiumPct:null,index:null}}
 const ppgPct=percentile(g.ppg,rs.ppg),premiumPct=percentile(g.premium,rs.premiumPpg);
 const rawIndex=.78*ppgPct+.17*premiumPct+.05*Math.min(1,rs.historicalSeasons/3);
 const index=.50+rs.confidence*(rawIndex-.50);
 const cfg={front:{floor:220,ceiling:1750},lb:{floor:210,ceiling:1550},db:{floor:175,ceiling:1325},idp:{floor:190,ceiling:1450}}[profile]||{floor:190,ceiling:1450};
 let value=cfg.floor+(cfg.ceiling-cfg.floor)*Math.pow(clamp21(.03,index,.99),1.55);value*=ageFactor21(id);
 return{value,rs,ppgPct,premiumPct,index};
}
function universe21(){const ids=new Set(state.allAssets.filter(x=>x.type==='player').map(x=>String(x.id)));for(const id of Object.keys(state.consensusComposite?.byId||{}))ids.add(String(id));return[...ids].filter(id=>state.players?.[id]?.fantasy_positions?.length).map(id=>({type:'player',id,owner:state.allAssets.find(x=>x.type==='player'&&String(x.id)===id)?.owner??null}))}
function model21(x,legacyById){
 if(groupPos(x)!=='IDP')return legacyById.get(String(x.id))||{x,value:1,consensus:null,context:null,fallback:true};
 const c=consensus21(x.id),ctx=c?idpContext21(x.id,c):null,rs=ctx?.rs||realIdpScore(x.id);
 if(!c){if(rs.seasons){const prod=idpContext21(x.id,250);return{x,value:Math.max(40,Math.min(520,Math.round(prod.value*(.22+.22*rs.confidence)))),consensus:null,context:Math.round(prod.value),fallback:true}}return{x,value:1,consensus:null,context:null,fallback:true}}
 let value=.50*c+.50*ctx.value;const rank=Number(detail21(x.id)?.idpRank);
 value=clamp21(c*.70,value,Math.max(c*3.2,c+1050));if(Number.isFinite(rank)&&rank<=20)value=Math.max(value,c*.92);
 return{x,value:Math.max(1,Math.round(value)),consensus:Math.round(c),context:Math.round(ctx.value),fallback:false,production:ctx};
}
masterRankings=function(){const legacy=legacyMasterRankings(),legacyById=new Map(legacy.map(z=>[String(z.x.id),z]));return universe21().map(x=>model21(x,legacyById)).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
assetLabel=function(x){if(x.type==='pick')return x.name;const m=playerRankValue(x),cv=m.consensus==null?'fallback':m.consensus;return `${playerName(x.id)} <span class="muted">(${groupPos(x)} • CV ${cv} • TV ${m.value})</span>`};
window.idpScoringAudit=function(nameOrId){const q=String(nameOrId||'').toLowerCase(),id=state.players?.[nameOrId]?String(nameOrId):Object.keys(state.players||{}).find(id=>playerName(id).toLowerCase()===q);if(!id)return null;const c=consensus21(id),ctx=c?idpContext21(id,c):idpContext21(id,250);return{id,name:playerName(id),profile:idpProfile21(id),consensus:c,context:Math.round(ctx.value),ppg:Number(ctx.rs.ppg.toFixed(2)),premiumPpg:Number(ctx.rs.premiumPpg.toFixed(2)),qualifyingSeasons:ctx.rs.seasons,historicalSeasons:ctx.rs.historicalSeasons,confidence:Number(ctx.rs.confidence.toFixed(3)),weightCoverage:Number(ctx.rs.weightCoverage.toFixed(3)),weightPlan:ctx.rs.weightPlan,ppgPercentile:ctx.ppgPct==null?null:Number((ctx.ppgPct*100).toFixed(1)),premiumPercentile:ctx.premiumPct==null?null:Number((ctx.premiumPct*100).toFixed(1)),seasons:ctx.rs.samples};};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
const model=document.querySelector('#settings .card');if(model){const n=document.createElement('div');n.className='notice success';n.innerHTML='V22 IDP history plan: <b>IDP remains 50% consensus + 50% league-specific context</b>. The history input refreshes from Sleeper when Update is run. Offseason weighting is 60/30/10 across the three most recent completed seasons. In-season, current-year results begin at 10% after Week 1 and rise toward 60% by Week 18 while the prior three seasons decline proportionally from 55/25/10. Historical seasons require 8+ games; the current season may contribute from Week 1 at its deliberately small scheduled weight. Missing history reduces confidence instead of being treated as poor production. Offensive valuation is unchanged.';model.appendChild(n)}
})();
