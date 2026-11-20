(()=>{
const priorMaster25=masterRankings;
const priorAudit25=window.idpScoringAudit;
const clamp25=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
const q25=(arr,p)=>{if(!arr.length)return 0;const a=[...arr].sort((x,y)=>x-y),i=clamp25(0,(a.length-1)*p,a.length-1),lo=Math.floor(i),hi=Math.ceil(i);return a[lo]+(a[hi]-a[lo])*(i-lo)};
const pct25=(arr,x)=>{if(!arr.length)return .5;let below=0,equal=0;for(const v of arr){if(v<x)below++;else if(v===x)equal++}return clamp25(.01,(below+.5*equal)/arr.length,.99)};
const IDP_V25_MARKET_CENTER_OFFSET=80.15;
function age25(id){const p=state.players?.[id]||{},a=Number(p.age);if(Number.isFinite(a)&&a>0)return a;if(p.birth_date){const d=new Date(p.birth_date);if(!Number.isNaN(d.getTime()))return(Date.now()-d.getTime())/(365.2425*86400000)}return null}
function role25(id){const p=state.players?.[String(id)]||{},primary=String(p.position||'').toUpperCase(),vals=[primary,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(v=>String(v).toUpperCase());if(['DT','NT'].includes(primary))return'INTERIOR';if(vals.some(v=>['DE','EDGE','DL'].includes(v)))return'EDGE';if(vals.some(v=>['LB','ILB','MLB','OLB'].includes(v)))return'LB';if(vals.some(v=>['S','SS','FS','CB','DB'].includes(v)))return'DB';return'OTHER'}
function ageScore25(id){const a=age25(id);if(!Number.isFinite(a))return .5;if(a<=23)return 1;if(a<=25)return .9;if(a<=27)return .8;if(a<=29)return .67;if(a<=31)return .52;if(a<=33)return .35;return .2}
function breakdownQty25(sample,keys){let n=0;for(const k of keys){const b=sample?.breakdown?.[k];if(b&&Number.isFinite(Number(b.qty)))n+=Number(b.qty)}return n}
function historyMetrics25(a,id){
 const samples=Array.isArray(a?.seasons)?a.seasons:[],coverage=samples.reduce((s,x)=>s+Number(x.assignedWeight||0),0);if(!samples.length||coverage<=0)return{ppg:0,tackleRate:0,spikeRate:0,confidence:0,coverage:0,seasons:0};
 // A two-game current-season sample cannot carry the same seasonal weight
 // as eight verified games. Preserve the past three regular seasons as an
 // anchor, shifting share toward a sufficiently sampled current breakout.
 // This is a league-wide, games-only rule; never a player or role adjustment.
 const current=samples.find(x=>x.currentSeason&&Number(x.games)>0),historicalWeight=current?coverage-Number(current.assignedWeight||0):0;
 const currentGames=Number(current?.games||0);
 // Stable, piecewise linear maturity curve: do not change a four-game
 // season's preexisting 33.53% share, and gradually reach 55% at 8 games.
 const v75CurrentShare=current&&historicalWeight>0
  ?currentGames<=4
   ?.10+(.33529411764705885-.10)*clamp25(0,(currentGames-2)/2,1)
   :.33529411764705885+(.55-.33529411764705885)*clamp25(0,(currentGames-4)/4,1)
  :null;
 // Current-season weighting above 33.53% needs independent opportunity evidence.
 // Source: verified Sleeper defensive snaps. No guesses or player exceptions.
 let verifiedRoleGrowthSupport=0,v94StableDeclineSupport=0;
 const currentShare=(()=>{

  if(v75CurrentShare===null||currentGames<=4)return v75CurrentShare;
  const baseShare=Math.min(v75CurrentShare,.33529411764705885);
  const prior=samples.filter(x=>!x.currentSeason&&Number(x.games)>=8)
   .sort((x,y)=>Number(y.season)-Number(x.season))[0];
  if(prior&&Number(current.ppg)<=Number(prior.ppg)){
   // V94: incomplete down years for established, consistently productive IDPs
   // should not erase three verified prior regular seasons. Shrink the
   // current-year share continuously by observed historical stability,
   // magnitude of the downturn and games remaining. Never invent production
   // and restore the original share as the season matures.
   const established=samples.filter(s=>!s.currentSeason&&Number(s.games)>=8);
   if(established.length>=3&&currentGames>=6&&currentGames<16){
    const ppgs=established.map(s=>Number(s.ppg)).filter(x=>Number.isFinite(x)&&x>0);
    const mean=ppgs.reduce((a,b)=>a+b,0)/ppgs.length;
    const dispersion=(Math.max(...ppgs)-Math.min(...ppgs))/Math.max(1,mean);
    const stability=clamp25(0,(.40-dispersion)/.20,1);
    const decline=clamp25(0,((mean-Number(current.ppg))/Math.max(1,mean)-.08)/.12,1);
    const incomplete=clamp25(0,(16-currentGames)/6,1);
    const support=mean>=10?stability*decline*incomplete:0;
    v94StableDeclineSupport=support;
    return v75CurrentShare-Math.max(0,v75CurrentShare-.40)*support;
   }
   return v75CurrentShare;
  }
  if(!prior||currentGames<6||Number(current.ppg)<12)return baseShare;
  const statsFor=year=>{const row=state.stats?.[year]?.[String(id)]||{};
   return row.stats&&typeof row.stats==='object'?row.stats:row;};
  const now=statsFor(current.season),was=statsFor(prior.season);
  const snaps=Number(now.def_snp),past=Number(was.def_snp),team=Number(now.tm_def_snp);
  // V101 offline research: a previous 8+ game role with 100+ verified
  // defensive snaps is meaningful evidence of low initial opportunity.
  // The previous 200-snap threshold excluded genuine second-year
  // progressions despite verified 250+ current snaps and team participation.
  // Never infer historical team snaps, role, or future production.
  if(!Number.isFinite(snaps)||!Number.isFinite(past)||!Number.isFinite(team)
   ||snaps<250||past<100||team<snaps)return baseShare;
  const priorRate=past/Number(prior.games),nowRate=snaps/currentGames;
  const snapGain=priorRate>0?nowRate/priorRate-1:0;
  const ppgGain=Number(current.ppg)-Number(prior.ppg);
  if(snaps/team<.65||snapGain<.15||ppgGain<3||Number(current.ppg)<1.20*Number(prior.ppg))
   return baseShare;
  const snapEvidence=clamp25(0,(snapGain-.15)/.15,1);
  const scoringEvidence=clamp25(0,(ppgGain-3)/2,1);
  const gamesEvidence=clamp25(0,(currentGames-5)/3,1);
  const support=Math.min(snapEvidence,scoringEvidence,gamesEvidence);
  // Evidence must reflect both increased opportunity and productive use.
  verifiedRoleGrowthSupport=support;
  // The first sustained full-time defensive role makes low-snap historical
  // seasons a weaker predictor of the next dynasty season. Retain at least
  // 30% verified regular-season scoring as an anchor. For all other IDPs,
  // the existing current-season share and its conservative safeguards stay.
  const sustainedRoleShare=Math.min(.70,v75CurrentShare+.15*support);
  return baseShare+(sustainedRoleShare-baseShare)*support;
 })();
 const legacyPpg=samples.reduce((total,row)=>total+Number(row.ppg||0)*Number(row.assignedWeight||0),0)/coverage;
 let ppg=0,tackles=0,spikes=0;
 for(const s of samples){
  const base=Number(s.assignedWeight||0);
  const w=currentShare===null?base/coverage:
   s===current?currentShare:(1-currentShare)*base/historicalWeight;
  const g=Math.max(1,Number(s.games||0));
  ppg+=Number(s.ppg||0)*w;
  tackles+=((breakdownQty25(s,['idp_tkl_solo'])+breakdownQty25(s,['idp_tkl_ast']))/g)*w;
  spikes+=((breakdownQty25(s,['idp_sack'])+breakdownQty25(s,['idp_int'])+breakdownQty25(s,['idp_ff'])+breakdownQty25(s,['idp_fum_rec'])+breakdownQty25(s,['idp_pass_def']))/g)*w;
 }
 // Changes to a completed year cannot move the scoring anchor by more
 // than 1.5 league PPG in one full refresh. This is a uniform sample-size
 // volatility guard rather than a player-specific dynasty price control.
 // Verified, sustained role expansion can support more than the generic
 // +/-1.5 PPG refresh guard. Without corroborating snaps, retain that guard.
 // At full support the maximum is 4.5 PPG; still a conservative anchor,
 // not a projection of future production or a player-specific exception.
 const supportedBreakoutGuard=1.5+3*verifiedRoleGrowthSupport;
 const weightedPpg=clamp25(legacyPpg-supportedBreakoutGuard,ppg,legacyPpg+supportedBreakoutGuard);
 return{ppg:weightedPpg,tackleRate:tackles,spikeRate:spikes,confidence:clamp25(0,Number(a.confidence||0),1),coverage:1,seasons:Number(a.qualifyingSeasons||samples.length),currentSeasonGames:current?currentGames:null,currentSeasonWeight:currentShare??null,uncappedPpg:ppg,legacyPpg,weightBasis:'games-matured-snap-confirmed-role-breakout-max70pct-and-v94-verified-stable-downyear-with-evidence-tiered-1.5to4.5ppg-guard',v94StableDeclineSupport,verifiedRoleGrowthSupport,scoringGuardPpg:supportedBreakoutGuard,v75CurrentSeasonWeight:v75CurrentShare};
}
function historicalBenchmarkMetrics25(a){
 const samples=(Array.isArray(a?.seasons)?a.seasons:[]).filter(s=>!s.currentSeason).sort((x,y)=>Number(y.season)-Number(x.season)).slice(0,3),weights=[.60,.30,.10];
 if(!samples.length)return null;let ppg=0,tackles=0,spikes=0,coverage=0;
 for(let i=0;i<samples.length;i++){const s=samples[i],w=weights[i]||0,g=Math.max(1,Number(s.games||0));coverage+=w;ppg+=Number(s.ppg||0)*w;tackles+=((breakdownQty25(s,['idp_tkl_solo'])+breakdownQty25(s,['idp_tkl_ast']))/g)*w;spikes+=((breakdownQty25(s,['idp_sack'])+breakdownQty25(s,['idp_int'])+breakdownQty25(s,['idp_ff'])+breakdownQty25(s,['idp_fum_rec'])+breakdownQty25(s,['idp_pass_def']))/g)*w}
 return coverage>0?{ppg:ppg/coverage,tackleRate:tackles/coverage,spikeRate:spikes/coverage}:null;
}
let cache25=null,statsRef25=null,playersRef25=null,consensusRef25=null,leagueRef25=null,planKey25='',baseAuditCache25=new Map(),metricsCache25=new Map(),scoreCache25=new Map(),contextCache25=new Map();
function generation25(){
 const key=JSON.stringify(state.sleeperHistory?.weightPlan||{});
 if(statsRef25!==state.stats||playersRef25!==state.players||consensusRef25!==state.consensusComposite||leagueRef25!==state.league||planKey25!==key){
   statsRef25=state.stats;playersRef25=state.players;consensusRef25=state.consensusComposite;leagueRef25=state.league;planKey25=key;cache25=null;baseAuditCache25.clear();metricsCache25.clear();scoreCache25.clear();contextCache25.clear();
 }
 return key;
}
function baseAudit25(id){generation25();id=String(id);if(baseAuditCache25.has(id))return baseAuditCache25.get(id);const a=typeof priorAudit25==='function'?priorAudit25(id):null;baseAuditCache25.set(id,a);return a}
function metrics25(id,a){generation25();id=String(id);if(metricsCache25.has(id))return metricsCache25.get(id);const m=historyMetrics25(a,id);metricsCache25.set(id,m);return m}
function isIndividualIdp25(id){const p=state.players?.[String(id)]||{},vals=[p.position,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(v=>String(v).toUpperCase()),allowed=new Set(['DL','DE','DT','EDGE','NT','LB','ILB','MLB','OLB','DB','CB','S','SS','FS']);return vals.some(v=>allowed.has(v))}
function distributions25(){
 generation25();if(cache25)return cache25;
 // A qualifying score in priorAudit25 requires a Sleeper regular-season row.
 // Iterate the union of observed scoring IDs instead of 12k+ NFL metadata IDs.
 // Preserve the dictionary's original insertion order for stable tied percentiles.
 const scoringIds=new Set();
 for(const year of Object.values(state.stats||{}))for(const id of Object.keys(year||{}))scoringIds.add(String(id));
 const rows=[];
 for(const id of Object.keys(state.players||{})){
  if(!scoringIds.has(id)||groupPos({type:'player',id})!=='IDP'||!isIndividualIdp25(id))continue;
  const a=baseAudit25(id);if(!a?.qualifyingSeasons)continue;
  const m=historicalBenchmarkMetrics25(a);if(m)rows.push({id,a,m});
 }
 const ppg=rows.map(r=>r.m.ppg),tackles=rows.map(r=>r.m.tackleRate),spikes=rows.map(r=>r.m.spikeRate),p50=q25(ppg,.50),p99=Math.max(p50+.01,q25(ppg,.99));
 const topPpg=[...rows].sort((a,b)=>b.m.ppg-a.m.ppg).slice(0,30).map(r=>({id:r.id,name:playerName(r.id),position:state.players?.[r.id]?.position||null,historicalBenchmarkPpg:r.m.ppg,qualifyingSeasons:r.a?.qualifyingSeasons??null,confidence:r.a?.confidence??null,seasons:(r.a?.seasons||[]).filter(s=>!s.currentSeason).sort((a,b)=>Number(b.season)-Number(a.season)).slice(0,3).map(s=>({season:s.season,games:s.games,ppg:s.ppg,assignedWeight:s.assignedWeight,points:s.points}))}));
 const playerRows=rows.filter(r=>String(state.players?.[r.id]?.position||'').toUpperCase()!=='DEF'),playerPpg=playerRows.map(r=>r.m.ppg),playerP50=q25(playerPpg,.50),playerP99=Math.max(playerP50+.01,q25(playerPpg,.99)),rolePpg={EDGE:[],LB:[],DB:[],INTERIOR:[]};
 for(const r of rows){const k=role25(r.id),x=Number(r.m?.ppg);if(rolePpg[k]&&Number.isFinite(x))rolePpg[k].push(x)}
 cache25={rows,ppg,tackles,spikes,p50,p99,rolePpg,historicalBenchmark:true,topPpg,playerOnlyBenchmark:{n:playerPpg.length,p50:playerP50,p99:playerP99}};return cache25;
}
function scoring25(id){
 generation25();id=String(id);if(scoreCache25.has(id))return scoreCache25.get(id);const a=baseAudit25(id),m=metrics25(id,a),d=distributions25(),role=role25(id);let out;
 // Missing qualified Sleeper production is missing evidence, not a
 // league-scored 520-point performance. Apply the existing conservative
 // 180-point scoring floor to EVERY source-covered or source-free IDP with
 // no qualifying season. Verified dynasty consensus remains in its own 20%
 // bucket; no invented NFL games, player exceptions, or manual rank targets.
 if(!a?.qualifyingSeasons||!d.ppg.length)out={value:180,a,m,ppgPct:null,relative:null,strength:0,role,noQualifiedSleeperScoring:true};
 else{const ppgPct=pct25(d.ppg,m.ppg),relative=clamp25(0,(m.ppg-d.p50)/(d.p99-d.p50),1.10),historicalSeasons=Number(a?.historicalSeasons||0),confidenceApplied=role==='EDGE'&&historicalSeasons>=2&&ppgPct>=.90?Math.max(m.confidence,.60):m.confidence,raw=.55*ppgPct+.45*relative,strength=.45+confidenceApplied*(raw-.45),overallValue=clamp25(180,180+1270*Math.pow(clamp25(.08,strength,1),2.70),1500);let value=overallValue,roleValue=null,roleBlend=0;if(role==='LB'){const xs=d.rolePpg?.LB||[];if(xs.length){const rp50=q25(xs,.50),rp99=Math.max(rp50+.01,q25(xs,.99)),rpct=pct25(xs,m.ppg),rrel=clamp25(0,(m.ppg-rp50)/(rp99-rp50),1.10),rraw=.55*rpct+.45*rrel,rstrength=.45+confidenceApplied*(rraw-.45);roleValue=clamp25(180,180+1270*Math.pow(clamp25(.08,rstrength,1),2.70),1500);roleBlend=.20;value=.80*overallValue+.20*roleValue}}out={value,a,m,ppgPct,relative,raw,strength,role,confidenceApplied,overallValue,roleValue,roleBlend,benchmarkP50:d.p50,benchmarkP99:d.p99,benchmarkN:d.ppg.length}}
 scoreCache25.set(id,out);return out;
}
// Dynasty development belongs in context for every defensive role, not just
// EDGE. Age and NFL experience establish runway; verified playing evidence
// determines how much of the *positive* developmental projection is trusted.
// Never substitute invented future scoring for qualified Sleeper production.
function development25(age,yearsExp,confidence,qualifyingSeasons){
 const ageKnown=Number.isFinite(age)&&age>=18&&age<=45;
 const expKnown=Number.isFinite(yearsExp)&&yearsExp>=0&&yearsExp<=25;
 if(!ageKnown&&!expKnown)return{index:.5,ageIndex:.5,careerStage:.5,evidence:0,runway:.5};
 const ageIndex=!ageKnown?.5:age<=23?1:age<=25?.90:age<=27?.80:age<=29?.67:age<=31?.52:age<=33?.35:.20;
 const careerStage=!expKnown?.5:yearsExp<=1?.65:yearsExp<=3?.88:yearsExp<=6?.84:yearsExp<=9?.67:.45;
 const runway=ageKnown&&expKnown?.70*ageIndex+.30*careerStage:ageKnown?ageIndex:careerStage;
 const evidence=Math.max(0,Math.min(1,Number(confidence)||0));
 const supported=Number(qualifyingSeasons)>0;
 const upwardReliability=supported?.30+.70*evidence:.15;
 const index=runway>.5?.5+(runway-.5)*upwardReliability:runway;
 return{index:clamp25(.1,index,1),ageIndex,careerStage,evidence:supported?evidence:0,runway};
}
// Context uses independent, observable dynasty signals. Production PPG remains
// exclusively in the 45% scoring bucket; its *direction of change* is a bounded
// corroboration of career development, never another absolute PPG ranking.
function trajectory25(a,confidence){
 const seasons=(Array.isArray(a?.seasons)?a.seasons:[])
  .filter(s=>Number(s?.games)>= (s?.currentSeason?6:4)&&Number(s?.ppg)>0&&Number.isFinite(Number(s?.season)))
  .sort((x,y)=>Number(y.season)-Number(x.season));
 if(seasons.length<2)return{index:.5,evidence:false,reason:'insufficient-comparable-seasons',change:null};
 const [recent,previous]=seasons;
 if(Number(recent.season)-Number(previous.season)>2)return{index:.5,evidence:false,reason:'noncontiguous-seasons',change:null};
 const change=clamp25(-.60,(Number(recent.ppg)-Number(previous.ppg))/Math.max(8,Number(previous.ppg)),.60);
 const sample=Math.min(1,(Number(recent.games)+Number(previous.games))/16);
 const reliability=clamp25(0,Number(confidence)||0,1)*sample;
 return{index:clamp25(.35,.5+.35*change*reliability,.65),evidence:true,reason:'verified-season-direction',change,sample,reliability,
  recentSeason:Number(recent.season),previousSeason:Number(previous.season)};
}
// Games played over multiple prior seasons are only an availability/role
// continuity proxy. They cannot certify a starting job or talent grade.
function continuity25(a,confidence){
 const seasons=(Array.isArray(a?.seasons)?a.seasons:[]).filter(s=>!s.currentSeason&&Number(s.games)>=8);
 const reliable=seasons.length>=2;
 const index=reliable?.5+.10*Math.min(1,seasons.length/3)*clamp25(0,Number(confidence)||0,1):.5;
 return{index,evidence:reliable,verifiedHistoricalSeasons:seasons.length,reason:reliable?'multi-season-availability':'insufficient-role-evidence'};
}
function context25(id,score){
 generation25();id=String(id);if(contextCache25.has(id))return contextCache25.get(id);
 const m=score.m||{},p=state.players?.[id]||{},expRaw=p.years_exp;
 const yearsExp=expRaw==null||expRaw===''?null:Number(expRaw);
 const development=development25(age25(id),yearsExp,m.confidence,score.a?.qualifyingSeasons);
 const trajectory=trajectory25(score.a,m.confidence);
 const continuity=continuity25(score.a,m.confidence);
 // In the unchanged 35% global IDP context bucket: 65% age/career runway,
 // 25% evidenced career trajectory, 10% availability continuity.
 // No extra tackles/sacks PPG percentile, unknown scouting grades or assumed roles.
 const index=.65*development.index+.25*trajectory.index+.10*continuity.index;
 const value=430+420*clamp25(.05,index,.95),out={
  value,index,development,trajectory,continuity,
  age:development.ageIndex,yearsExp:Number.isFinite(yearsExp)?yearsExp:null,
  roleEvidence:'seasonal games proxy only; no verified snaps/depth-chart data'
 };
 contextCache25.set(id,out);return out;
}
function blend25(c,scoreValue,contextValue){
 if(!Number.isFinite(c)||c<=0){
   const raw=.40*scoreValue+.20*contextValue;
   return{value:Math.max(25,Math.min(700,Math.round(raw))),raw,fallback:true};
 }
 const raw=.20*c+.45*scoreValue+.35*contextValue-IDP_V25_MARKET_CENTER_OFFSET;
 const centered=clamp25(c*.45,raw,Math.max(c*2.15,c+760));
 return{value:Math.max(1,Math.round(centered)),raw,fallback:false};
}
// V100: SOURCE-FREE IDP early-career fallback. No implied dynasty consensus.
// Credible, verified two-season opportunity + LEAGUE-SCORED production warrants
// using the existing full 45% scoring / 35% context contributions rather than
// discounting them again to 40% / 20%. The missing 20% consensus stays ZERO.
// Still capped at the existing 700-point source-free IDP ceiling at this stage.
function emergingSourceFreeIdpEvidence100(id,score){
 const p=state.players?.[String(id)]||{},age=Number(p.age),exp=Number(p.years_exp),
  qualified=Number(score?.a?.qualifyingSeasons)||0,
  confidence=Number(score?.m?.confidence)||0;
 if(p.age==null||p.years_exp==null||!Number.isFinite(age)||age<18||age>26||
   !Number.isFinite(exp)||exp<0||exp>3||qualified<2||confidence<.40)
   return{verified:false,reason:'age-experience-history-or-confidence'};
 const seasons=(Array.isArray(score?.a?.seasons)?score.a.seasons:[])
  .filter(q=>Number(q.season)>0&&Number(q.games)>0&&Number(q.ppg)>0);
 const current=seasons.find(q=>q.currentSeason===true);
 const previous=seasons.filter(q=>!q.currentSeason&&Number(q.season)===Number(current?.season)-1)[0];
 if(!current||Number(current.games)<8||!previous||Number(previous.games)<4||
   !(Number(current.ppg)>=Number(previous.ppg)*1.20))
   return{verified:false,reason:'insufficient-contiguous-scoring-improvement'};
 const snapShare=row=>{
   const stats=row?.stats&&typeof row.stats==='object'?row.stats:row||{};
   const player=Number(stats.def_snp),team=Number(stats.tm_def_snp);
   return Number.isFinite(player)&&player>=0&&Number.isFinite(team)&&team>0
     ?Math.max(0,Math.min(1,player/team)):null;
 };
 const currentRow=state.stats?.[current.season]?.[String(id)]||null,
  previousRow=state.stats?.[previous.season]?.[String(id)]||null;
 const now=snapShare(currentRow),before=snapShare(previousRow);
 const raw=row=>row?.stats&&typeof row.stats==='object'?row.stats:row||{};
 const currentSnaps=Number(raw(currentRow).def_snp),priorSnaps=Number(raw(previousRow).def_snp);
 const currentRate=currentSnaps/Number(current.games),priorRate=priorSnaps/Number(previous.games);
 const verifiedShare=now!=null&&before!=null&&now>=.40&&now-before>=.12;
 // Older compact Sleeper snapshots can omit the historical team-snap
 // denominator. Never invent one: the prior *player* defensive snaps and
 // games still prove a per-game role change when current participation
 // is substantial. A full snap-share delta is used only when both team
 // denominators actually exist.
 const verifiedRate=before==null&&now!=null&&now>=.65&&
  Number(previous.games)>=6&&Number(current.games)>=8&&
  Number.isFinite(priorSnaps)&&priorSnaps>=100&&
  Number.isFinite(currentSnaps)&&currentSnaps>=250&&
  Number.isFinite(priorRate)&&priorRate>0&&
  Number.isFinite(currentRate)&&currentRate/priorRate>=1.50;
 if(!verifiedShare&&!verifiedRate)
   return{verified:false,reason:'unverified-sustained-opportunity'};
 return{verified:true,reason:'consecutive-league-scored-seasons-and-snap-growth',
   games:Number(current.games),previousGames:Number(previous.games),
   scoringImprovement:Number((Number(current.ppg)/Number(previous.ppg)-1).toFixed(4)),
   snapShare:Number(now.toFixed(4)),
   priorSnapShare:before==null?null:Number(before.toFixed(4)),
   playerSnapRateGrowth:Number((currentRate/priorRate-1).toFixed(4)),
   opportunityEvidenceMethod:verifiedShare?'two-season-snap-share':'verified-snaps-per-game',
   confidence:Number(confidence.toFixed(4))};
}
function model25(z){
 if(groupPos(z.x)!=='IDP'||!isIndividualIdp25(z.x.id))return z;
 const c=Number(z.consensus),score=scoring25(z.x.id),ctx=context25(z.x.id,score);
// Missing qualified Sleeper seasons never imply neutral 520-point
// performance, even if a single dynasty publisher lists the player.
// Use the existing conservative 180-point scoring floor for all
// no-production IDPs, while leaving independently sourced dynasty consensus
// in its 20% component and verified regular-season performance unchanged.
const noQualifiedScoring=!(Number(score.a?.qualifyingSeasons)>0);
const unverifiedFallback=!(c>0)&&noQualifiedScoring;
const effectiveScoringValue=noQualifiedScoring?Math.min(score.value,180):score.value;
const sourceFree=!(Number.isFinite(c)&&c>0);
const breakoutEvidence=sourceFree&&!noQualifiedScoring
  ?emergingSourceFreeIdpEvidence100(z.x.id,score)
  :{verified:false,reason:sourceFree?'no-qualified-scoring':'verified-consensus'};
const originalBlend=blend25(c,effectiveScoringValue,ctx.value);
const fullEvidenceRaw=.45*effectiveScoringValue+.35*ctx.value;
const blend=breakoutEvidence.verified
  ?{...originalBlend,
    // A missing market source is still uncertainty. Protect the established
    // rank-based canonical curve from abrupt leaps even when the available
    // scoring/context evidence is convincing. Apply the lower of full
    // observed-evidence math and 10% of the prior source-free model value.
    value:Math.min(700,Math.round(originalBlend.value*1.10),
      Math.max(originalBlend.value,Math.round(fullEvidenceRaw))),
    raw:fullEvidenceRaw}
  :originalBlend;
 return{...z,value:blend.value,consensus:Number.isFinite(c)&&c>0?Math.round(c):z.consensus,context:Math.round(ctx.value),production:{...score,leagueContext:ctx,idpV25MarketCenterOffset:IDP_V25_MARKET_CENTER_OFFSET,idpV25RawBlend:blend.raw,idpUnverifiedNoConsensusFallbackV73:unverifiedFallback,idpEffectiveFallbackScoringV73:effectiveScoringValue,idpNoQualifiedSleeperScoringV95:noQualifiedScoring,
  idpV100SourceFreeBreakout:breakoutEvidence,
  idpV100PreFallbackValue:originalBlend.value,
  idpV100CandidateFallbackValue:blend.value,
  idpV100NoInventedConsensus:sourceFree},fallback:blend.fallback};
}
masterRankings=function(){return priorMaster25().map(model25).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
assetLabel=function(x){if(x.type==='pick')return x.name;const m=playerRankValue(x),cv=m.consensus==null?'fallback':m.consensus;return `${playerName(x.id)} <span class="muted">(${groupPos(x)} • CV ${cv} • TV ${m.value})</span>`};
window.idpV25PropagationAudit=function(){generation25();const rows=[];for(const id of Object.keys(state.players||{})){if(groupPos({type:'player',id})!=='IDP'||!isIndividualIdp25(id))continue;const base=baseAudit25(id),score=scoring25(id),ctx=context25(id,score),consensus=Number(base?.consensus),v25=blend25(consensus,score.value,ctx.value).value;rows.push({id,name:playerName(id),position:state.players?.[id]?.position||null,consensus:Number.isFinite(consensus)?consensus:null,scoring:Math.round(score.value),context:Math.round(ctx.value),v25,weightedPpg:score.m?.ppg??null,confidence:score.m?.confidence??null})}const vals=rows.map(r=>r.v25).filter(Number.isFinite).sort((a,b)=>a-b),q=p=>q25(vals,p);return{n:rows.length,summary:{p25:q(.25),median:q(.5),p75:q(.75),p90:q(.9),p95:q(.95),max:vals.at(-1)||null},topV25:[...rows].filter(r=>Number.isFinite(r.v25)).sort((a,b)=>b.v25-a.v25).slice(0,50),rows}};
window.idpV25ScoringCalibrationAudit=function(){const a=window.idpV25PropagationAudit(),rows=(a.rows||[]).filter(r=>Number(r.consensus)>0&&Number(r.weightedPpg)>0&&Number.isFinite(Number(r.scoring))&&Number.isFinite(Number(r.v25))),q=(xs,p)=>{if(!xs.length)return null;const s=[...xs].sort((x,y)=>x-y),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return Number((s[l]+(s[h]-s[l])*(i-l)).toFixed(2))},scores=rows.map(r=>Number(r.scoring)),ppgs=rows.map(r=>Number(r.weightedPpg));return{criterion:'individual IDPs with positive consensus and weighted PPG in V25 propagation audit',n:rows.length,scoring:{p10:q(scores,.1),p25:q(scores,.25),median:q(scores,.5),p75:q(scores,.75),p90:q(scores,.9),p95:q(scores,.95),p99:q(scores,.99),max:scores.length?Math.max(...scores):null,atOrAbove1400:scores.filter(x=>x>=1400).length,atCeiling1450:scores.filter(x=>x>=1450).length},weightedPpg:{p25:q(ppgs,.25),median:q(ppgs,.5),p75:q(ppgs,.75),p90:q(ppgs,.9),p95:q(ppgs,.95),p99:q(ppgs,.99),max:ppgs.length?Math.max(...ppgs):null},topScoring:[...rows].sort((x,y)=>Number(y.scoring)-Number(x.scoring)).slice(0,40)}};
window.idpV25RoleBenchmarkCounterfactual=function(){generation25();const d=distributions25(),role=id=>{const p=state.players?.[String(id)]||{},v=[p.position,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(x=>String(x).toUpperCase());if(v.some(x=>['DT','NT'].includes(x))&&!v.some(x=>['DE','EDGE'].includes(x)))return'INTERIOR';if(v.some(x=>['DE','EDGE','DL'].includes(x)))return'EDGE';if(v.some(x=>['LB','ILB','MLB','OLB'].includes(x)))return'LB';if(v.some(x=>['S','SS','FS','CB','DB'].includes(x)))return'DB';return'OTHER'},bench={};for(const r of d.rows||[]){const k=role(r.id),x=Number(r.m?.ppg);if(k!=='OTHER'&&Number.isFinite(x))(bench[k]??=[]).push(x)}const scoreWith=(id,m,conf,xs)=>{if(!xs?.length)return null;const p50=q25(xs,.5),p99=Math.max(p50+.01,q25(xs,.99)),ppgPct=pct25(xs,m.ppg),relative=clamp25(0,(m.ppg-p50)/(p99-p50),1.10),raw=.55*ppgPct+.45*relative,strength=.45+conf*(raw-.45),value=clamp25(180,180+1270*Math.pow(clamp25(.08,strength,1),2.70),1500);return{p50,p99,ppgPct,relative,raw,strength,value}},rows=[];for(const r of window.idpV25PropagationAudit().rows||[]){if(!(Number(r.consensus)>0&&Number(r.weightedPpg)>0))continue;const s=scoring25(r.id),k=role(r.id),alt=scoreWith(r.id,s.m,s.m?.confidence||0,bench[k]);if(!alt)continue;const current=Number(s.value),v25Current=Number(r.v25),v25Role=blend25(Number(r.consensus),alt.value,Number(r.context)).value;rows.push({id:r.id,name:r.name,position:r.position,role:k,ppg:Number(r.weightedPpg),consensus:Number(r.consensus),currentScoring:Number(current.toFixed(2)),roleScoring:Number(alt.value.toFixed(2)),scoringDelta:Number((alt.value-current).toFixed(2)),currentV25:v25Current,roleV25:v25Role,v25Delta:v25Role-v25Current,roleP50:Number(alt.p50.toFixed(3)),roleP99:Number(alt.p99.toFixed(3)),currentPercentile:Number((s.ppgPct*100).toFixed(2)),rolePercentile:Number((alt.ppgPct*100).toFixed(2))})}const summarize=rs=>{const ds=rs.map(r=>r.v25Delta).sort((a,b)=>a-b);return{n:rs.length,medianDelta:ds.length?q25(ds,.5):null,p25Delta:ds.length?q25(ds,.25):null,p75Delta:ds.length?q25(ds,.75):null,up25:ds.filter(x=>x>=25).length,down25:ds.filter(x=>x<=-25).length}};const groups={};for(const r of rows)(groups[r.role]??=[]).push(r);return{criterion:'counterfactual only; replace all-IDP production benchmark with same-role benchmark while preserving the centered 20/45/35 V25 weights and scoring curve',currentBenchmark:{p50:d.p50,p99:d.p99,n:d.ppg.length},roleBenchmarks:Object.fromEntries(Object.entries(bench).map(([k,x])=>[k,{n:x.length,p50:q25(x,.5),p99:q25(x,.99)}])),overall:summarize(rows),byRole:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,summarize(v)])),largestUp:[...rows].sort((a,b)=>b.v25Delta-a.v25Delta).slice(0,25),largestDown:[...rows].sort((a,b)=>a.v25Delta-b.v25Delta).slice(0,25),controls:rows.filter(r=>['3973','4070','5991','8289','10892','12578','10880','4960','11667','7640','5041','8659'].includes(String(r.id)))}};
window.idpV25BenchmarkPopulationAudit=function(){generation25();const d=distributions25(),role=id=>{const p=state.players?.[String(id)]||{},v=[p.position,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(x=>String(x).toUpperCase());if(v.some(x=>['DE','EDGE','DL'].includes(x)))return'EDGE';if(v.some(x=>['LB','ILB','MLB','OLB'].includes(x)))return'LB';if(v.some(x=>['DT','NT'].includes(x)))return'INTERIOR';if(v.some(x=>['S','SS','FS','CB','DB'].includes(x)))return'DB';return'OTHER'},q=(xs,p)=>{if(!xs.length)return null;const s=[...xs].sort((a,b)=>a-b),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return Number((s[l]+(s[h]-s[l])*(i-l)).toFixed(3))},rows=(d.rows||[]).map(r=>({id:r.id,name:playerName(r.id),position:state.players?.[r.id]?.position||null,role:role(r.id),ppg:Number(r.m?.ppg),confidence:Number(r.m?.confidence),qualifyingSeasons:Number(r.a?.qualifyingSeasons||0),latestHistoricalSeason:Math.max(0,...(r.a?.seasons||[]).filter(s=>!s.currentSeason).map(s=>Number(s.season)||0))})).filter(r=>Number.isFinite(r.ppg)),summ=rs=>{const x=rs.map(r=>r.ppg);return{n:rs.length,p10:q(x,.1),p25:q(x,.25),median:q(x,.5),p75:q(x,.75),p90:q(x,.9),p95:q(x,.95),p99:q(x,.99),max:x.length?Math.max(...x):null}},groups={};for(const r of rows)(groups[r.role]??=[]).push(r);const seasonCounts={};for(const r of rows)seasonCounts[r.latestHistoricalSeason]=(seasonCounts[r.latestHistoricalSeason]||0)+1;return{criterion:'actual historical benchmark population used by V25 scoring',overall:summ(rows),byRole:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,summ(v)])),latestHistoricalSeasonCounts:seasonCounts,qualifyingSeasonCounts:Object.fromEntries([0,1,2,3,4].map(n=>[n,rows.filter(r=>r.qualifyingSeasons===n).length])),bottom25:[...rows].sort((a,b)=>a.ppg-b.ppg).slice(0,25),aroundMedian:[...rows].sort((a,b)=>a.ppg-b.ppg).slice(Math.max(0,Math.floor(rows.length/2)-12),Math.floor(rows.length/2)+13),top25:[...rows].sort((a,b)=>b.ppg-a.ppg).slice(0,25)}};
window.idpV25ScoringShapeAudit=function(){generation25();const a=window.idpV25PropagationAudit(),rows=(a.rows||[]).filter(r=>Number(r.consensus)>0&&Number(r.weightedPpg)>0&&Number.isFinite(Number(r.v25))),detail=r=>{const s=scoring25(r.id);return{id:r.id,name:r.name,position:r.position,consensus:r.consensus,v25:r.v25,weightedPpg:s.m?.ppg??null,confidence:s.m?.confidence??null,ppgPercentile:s.ppgPct==null?null:Number((s.ppgPct*100).toFixed(2)),relativeP50P99:s.relative==null?null:Number(s.relative.toFixed(4)),rawStrength:s.raw==null?null:Number(s.raw.toFixed(4)),postConfidenceStrength:s.strength==null?null:Number(s.strength.toFixed(4)),scoringValue:Number(s.value.toFixed(2)),benchmarkP50:s.benchmarkP50??null,benchmarkP99:s.benchmarkP99??null}},q=(xs,p)=>{if(!xs.length)return null;const s=[...xs].sort((x,y)=>x-y),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return Number((s[l]+(s[h]-s[l])*(i-l)).toFixed(3))},summ=rs=>{const ds=rs.map(detail),field=k=>ds.map(x=>Number(x[k])).filter(Number.isFinite);return{n:ds.length,weightedPpg:{p25:q(field('weightedPpg'),.25),median:q(field('weightedPpg'),.5),p75:q(field('weightedPpg'),.75)},ppgPercentile:{p25:q(field('ppgPercentile'),.25),median:q(field('ppgPercentile'),.5),p75:q(field('ppgPercentile'),.75)},relativeP50P99:{p25:q(field('relativeP50P99'),.25),median:q(field('relativeP50P99'),.5),p75:q(field('relativeP50P99'),.75)},rawStrength:{p25:q(field('rawStrength'),.25),median:q(field('rawStrength'),.5),p75:q(field('rawStrength'),.75)},postConfidenceStrength:{p25:q(field('postConfidenceStrength'),.25),median:q(field('postConfidenceStrength'),.5),p75:q(field('postConfidenceStrength'),.75)},scoringValue:{p25:q(field('scoringValue'),.25),median:q(field('scoringValue'),.5),p75:q(field('scoringValue'),.75)}}},bands={cluster580to650:rows.filter(r=>r.v25>=580&&r.v25<=650),below510to579:rows.filter(r=>r.v25>=510&&r.v25<580),below440to509:rows.filter(r=>r.v25>=440&&r.v25<510)};return{criterion:'decompose V25 scoring transform across dense and adjacent V25 bands',formula:'raw=.55*PPG percentile+.45*relative(P50→P99); strength=.45+confidence*(raw-.45); scoring=180+1270*strength^2.70',benchmark:{p50:distributions25().p50,p99:distributions25().p99,n:distributions25().ppg.length},bands:Object.fromEntries(Object.entries(bands).map(([k,v])=>[k,summ(v)])),clusterRows:bands.cluster580to650.map(detail).sort((x,y)=>y.scoringValue-x.scoringValue),adjacentBelowRows:bands.below510to579.map(detail).sort((x,y)=>y.scoringValue-x.scoringValue)}};
window.idpV25ClusterAudit=function(){const a=window.idpV25PropagationAudit(),q=(xs,p)=>{if(!xs.length)return null;const s=[...xs].sort((x,y)=>x-y),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return Number((s[l]+(s[h]-s[l])*(i-l)).toFixed(2))},rows=(a.rows||[]).filter(r=>Number(r.consensus)>0&&Number(r.weightedPpg)>0&&Number.isFinite(Number(r.v25))),summ=rs=>{const field=k=>rs.map(r=>Number(r[k])).filter(Number.isFinite);return{n:rs.length,consensus:{p25:q(field('consensus'),.25),median:q(field('consensus'),.5),p75:q(field('consensus'),.75)},scoring:{p25:q(field('scoring'),.25),median:q(field('scoring'),.5),p75:q(field('scoring'),.75)},context:{p25:q(field('context'),.25),median:q(field('context'),.5),p75:q(field('context'),.75)},v25:{p25:q(field('v25'),.25),median:q(field('v25'),.5),p75:q(field('v25'),.75)}}},bands={above650:rows.filter(r=>r.v25>650),cluster580to650:rows.filter(r=>r.v25>=580&&r.v25<=650),below510to579:rows.filter(r=>r.v25>=510&&r.v25<580),below440to509:rows.filter(r=>r.v25>=440&&r.v25<510)};return{criterion:'positive-consensus individual IDPs with weighted PPG; decompose V25 density bands before downstream stages',formula:'V25 = 20% consensus + 45% scoring + 35% context - 80.15 market center for positive-consensus IDPs; zero-consensus fallback unchanged',bands:Object.fromEntries(Object.entries(bands).map(([k,v])=>[k,summ(v)])),clusterRows:[...bands.cluster580to650].sort((x,y)=>y.v25-x.v25),adjacentBelowRows:[...bands.below510to579].sort((x,y)=>y.v25-x.v25)}};
window.idpV25RoleAudit=function(){const a=window.idpV25PropagationAudit();const role=id=>{const p=state.players?.[String(id)]||{},vals=[p.position,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(v=>String(v).toUpperCase());if(vals.some(v=>['DE','EDGE','DL'].includes(v)))return'EDGE';if(vals.some(v=>['LB','ILB','MLB','OLB'].includes(v)))return'LB';if(vals.some(v=>['DT','NT'].includes(v)))return'INTERIOR';if(vals.some(v=>['S','SS','FS','CB','DB'].includes(v)))return'DB';return'OTHER'};const summarize=rows=>{const vals=rows.map(r=>r.v25).filter(Number.isFinite).sort((x,y)=>x-y),q=p=>q25(vals,p);return{n:rows.length,p25:q(.25),median:q(.5),p75:q(.75),p90:q(.9),max:vals.at(-1)||null}};const meaningful=a.rows.filter(r=>Number.isFinite(r.v25)&&(Number(r.consensus)>180||Number(r.weightedPpg)>=8||Number(r.confidence)>=.42));const classified=meaningful.map(r=>({...r,role:role(r.id)})),eligible=classified.filter(r=>r.role!=='OTHER'),groups={};for(const r of eligible)(groups[r.role]??=[]).push(r);return{criteria:'consensus>180 OR weightedPpg>=8 OR confidence>=0.42',roleLogic:'existing V65-style player.position + fantasy_positions; DL/DE/EDGE => EDGE, LB variants => LB, DT/NT => INTERIOR, S/CB/DB => DB; unsupported identities excluded from role distributions',all:summarize(a.rows),meaningful:summarize(meaningful),classified:summarize(eligible),excludedOther:classified.filter(r=>r.role==='OTHER').slice(0,25).map(r=>({name:r.name,pos:r.position,consensus:r.consensus,ppg:r.weightedPpg,conf:r.confidence})),byRole:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,summarize(v)])),topByRole:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,[...v].sort((x,y)=>y.v25-x.v25).slice(0,12).map(x=>({name:x.name,pos:x.position,consensus:x.consensus,scoring:x.scoring,context:x.context,v25:x.v25,ppg:x.weightedPpg,conf:x.confidence}))]))}};
window.idpV25EligibilityAudit=function(){const allowed=new Set(['DL','DE','DT','EDGE','NT','LB','ILB','MLB','OLB','DB','CB','S','SS','FS']);const rows=[];for(const id of Object.keys(state.players||{})){const x={type:'player',id},p=state.players?.[id]||{},vals=[p.position,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(v=>String(v).toUpperCase()),gp=groupPos(x),explicit=vals.some(v=>allowed.has(v));if(gp==='IDP'&&!explicit)rows.push({id,name:playerName(id),position:p.position||null,fantasyPositions:p.fantasy_positions||[],groupPos:gp,consensus:Number(state.consensusComposite?.byId?.[id]||0)});}return{rule:'groupPos=IDP but no explicit individual defensive position in position/fantasy_positions',count:rows.length,rows:rows.sort((a,b)=>b.consensus-a.consensus).slice(0,250)}};
window.idpV25PositionSetAudit=function(){const a=window.idpV25PropagationAudit();const meaningful=a.rows.filter(r=>Number.isFinite(r.v25)&&(Number(r.consensus)>180||Number(r.weightedPpg)>=8||Number(r.confidence)>=.42));const norm=id=>{const p=state.players?.[String(id)]||{},vals=[p.position,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(v=>String(v).toUpperCase());return [...new Set(vals)].sort().join('+')||'NONE'};const map={};for(const r of meaningful){const set=norm(r.id);(map[set]??=[]).push(r)}const summarize=rows=>{const vals=rows.map(r=>r.v25).filter(Number.isFinite).sort((x,y)=>x-y),q=p=>q25(vals,p);return{n:rows.length,p25:q(.25),median:q(.5),p75:q(.75),p90:q(.9),max:vals.at(-1)||null}};return{criteria:'same meaningful-evidence filter; no forced role mapping',positionSets:Object.fromEntries(Object.entries(map).sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>[k,{...summarize(v),top:[...v].sort((x,y)=>y.v25-x.v25).slice(0,8).map(x=>({name:x.name,pos:x.position,consensus:x.consensus,scoring:x.scoring,v25:x.v25,ppg:x.weightedPpg,conf:x.confidence}))}]))}};
window.idpScoringAudit=function(nameOrId){generation25();const q=String(nameOrId||'').toLowerCase(),id=state.players?.[nameOrId]?String(nameOrId):(()=>{const matches=Object.keys(state.players||{}).filter(pid=>playerName(pid).toLowerCase()===q);return matches.length===1?matches[0]:null})();if(!id)return null;const base=baseAudit25(id),score=scoring25(id),ctx=context25(id,score),c=Number(base?.consensus);return{...base,consensus:Number.isFinite(c)?c:null,finalValue:blend25(c,score.value,ctx.value).value,productionValue:Math.round(score.value),otherContextValue:Math.round(ctx.value),tackleRate:Number.isFinite(Number(score.m?.tackleRate))?Number(Number(score.m.tackleRate).toFixed(2)):null,spikeRate:Number.isFinite(Number(score.m?.spikeRate))?Number(Number(score.m.spikeRate).toFixed(2)):null,tacklePercentile:null,spikePercentile:null,ageContext:Number.isFinite(Number(ctx.age))?Number((Number(ctx.age)*100).toFixed(0)):null,v25RuntimeTrace:{weightedPpg:score.m?.ppg??null,confidence:score.m?.confidence??null,coverage:score.m?.coverage??null,seasons:score.m?.seasons??null,ppgPercentile:score.ppgPct??null,relativeAboveP50:score.relative??null,rawStrength:score.raw??null,postConfidenceStrength:score.strength??null,benchmarkP50:score.benchmarkP50??null,benchmarkP99:score.benchmarkP99??null,benchmarkN:score.benchmarkN??null,benchmarkTopPpg:distributions25().topPpg,playerOnlyBenchmark:distributions25().playerOnlyBenchmark,productionValue:score.value??null,sourceSeasons:(score.a?.seasons||[]).map(s=>({season:s.season,games:s.games,assignedWeight:s.assignedWeight,currentSeason:s.currentSeason,ppg:s.ppg}))},modelWeights:{consensus:.20,scoringLookback:.45,otherLeagueDynastyContext:.35,marketCenterOffset:IDP_V25_MARKET_CENTER_OFFSET,zeroConsensusFallback:'legacy-40-scoring-20-context'}}};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
window.fflIdpScoringModelV94='v94-verified-stable-veteran';

 // Read-only IDP source/identity/scoring audit. Does not edit the market.
 window.idpSourceIntegrityAuditV73=function(){
  const master=ensureMaster(),rows=[],flags=[],byName=new Map();
  const canonical=n=>String(n||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+(jr|sr|ii|iii|iv|v)$/,'');
  for(let i=0;i<master.length;i++){
   const z=master[i],id=String(z?.x?.id||'');
   if(!z?.x||groupPos(z.x)!=='IDP'||!isIndividualIdp25(id))continue;
   const p=state.players?.[id]||{},name=playerName(id),key=canonical(name);
   const a=baseAudit25(id),detail=state.consensusComposite?.detailsById?.[id]||{};
   const observedSources=(Array.isArray(detail.idpSources)?detail.idpSources:[])
    .filter(s=>!String(s).endsWith(' (not listed)'));
   const consensus=Number(z.consensus)>0?Number(z.consensus):null;
   const qualified=Number(a?.qualifyingSeasons)||0;
   const current=(a?.seasons||[]).find(s=>s.currentSeason&&Number(s.games)>0)||null;
   const item={id,name,position:p.position||null,team:p.team||null,age:p.age??null,
    yearsExp:p.years_exp??null,overallRank:i+1,value:z.value,consensus,
    sourceCount:new Set(observedSources).size,sources:[...new Set(observedSources)],
    qualifyingSeasons:qualified,currentGames:current?.games??null,
    currentPpg:current?.ppg??null,confidence:a?.confidence??null,
    effectiveScoringFallback:z.production?.idpEffectiveFallbackScoringV73??null,
    unverifiedNoSourceNoProduction:z.production?.idpUnverifiedNoConsensusFallbackV73===true,
    qualifyingSeasonEvidence:(a?.seasons||[]).map(s=>({season:s.season,games:s.games,points:s.points,ppg:s.ppg,currentSeason:s.currentSeason}))};
   rows.push(item);
   const peers=byName.get(key)||[];peers.push(item);byName.set(key,peers);
   if(consensus==null&&qualified===0)flags.push({kind:'no-consensus-no-qualified-scoring',...item});
   if(consensus==null&&qualified>0)flags.push({kind:'verified-scoring-consensus-missing',...item});
   if(consensus!=null&&qualified===0&&!p.team)flags.push({kind:'publisher-consensus-no-scoring-or-team',...item});
   if(current&&Number(current.games)<4&&Number(current.ppg)>18)flags.push({kind:'small-current-scoring-sample',...item});
  }
  for(const [key,peers]of byName)if(key&&peers.length>1)
   flags.push({kind:'same-canonical-idp-name',canonical:key,ids:peers.map(p=>p.id),
    players:peers.map(p=>({id:p.id,team:p.team,position:p.position,consensus:p.consensus}))});
  return{version:73,readOnly:true,generatedAt:new Date().toISOString(),
   summary:{rankedIdp:rows.length,withConsensus:rows.filter(r=>r.consensus!=null).length,
    missingConsensusWithVerifiedScoring:rows.filter(r=>r.consensus==null&&r.qualifyingSeasons>0).length,
    missingConsensusAndScoring:rows.filter(r=>r.consensus==null&&r.qualifyingSeasons===0).length,
    publisherConsensusWithoutScoring:rows.filter(r=>r.consensus!=null&&r.qualifyingSeasons===0).length,
    flagged:flags.length},flags,rows};
 };
const card=document.querySelector('#settings .card');if(card){const n=document.createElement('div');n.className='notice success';n.innerHTML='V25 IDP calibration staged: <b>20% consensus + 45% actual Sleeper scoring lookback + 35% other league/dynasty context</b>, market-centered by 80.15 for positive-consensus IDPs. Zero-consensus players retain the prior fallback. The 35% context uses age plus small tackle-volume and spike-play-frequency signals (sacks, interceptions, forced fumbles, recoveries and pass defenses) from the same imported Sleeper history. All history-dependent pieces refresh with Update. Missing qualifying years shrink confidence toward neutral rather than transferring their full weight to a short sample.';card.appendChild(n)}
})();

/* PR384 preview retrigger: role benchmark audit */
