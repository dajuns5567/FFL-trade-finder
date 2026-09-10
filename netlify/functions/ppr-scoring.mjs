export const PPR_WEIGHTS={pass_yd:.04,pass_td:4,pass_int:-2,pass_2pt:2,rush_yd:.1,rush_td:6,rush_2pt:2,rec:1,rec_yd:.1,rec_td:6,rec_2pt:2,fum_lost:-2,kr_td:6,pr_td:6,fum_rec_td:6};
export const SCORE_FIELDS=['pts_ppr','pts_half_ppr','pts_std'];
const numeric=(obj,key)=>{const n=Number(obj?.[key]);return Number.isFinite(n)?n:0};

export function standardPpr(stats){
  let seen=false,pts=0;
  for(const [key,w] of Object.entries(PPR_WEIGHTS)){
    if(Number.isFinite(Number(stats?.[key])))seen=true;
    pts+=numeric(stats,key)*w;
  }
  return seen?Number(pts.toFixed(4)):null;
}

export function mergedStats(row){
  const base=row?.stats&&typeof row.stats==='object'?{...row.stats}:{...(row||{})};
  for(const key of SCORE_FIELDS){
    const n=Number(row?.[key]);
    if(Number.isFinite(n)&&!Number.isFinite(Number(base[key])))base[key]=n;
  }
  if(Number.isFinite(Number(base.pts_ppr)))base._pts_ppr_native=1;
  else{
    const calc=standardPpr(base);
    if(calc!=null){base.pts_ppr=calc;base._pts_ppr_reconstructed=1;}
  }
  return base;
}

export function rows(payload){
  if(Array.isArray(payload))return payload.map(r=>[String(r?.player_id||r?.id||''),mergedStats(r)]).filter(([id])=>id);
  if(!payload||typeof payload!=='object')return[];
  return Object.entries(payload).map(([id,v])=>[String(v?.player_id||id),mergedStats(v)]).filter(([id])=>id);
}

export function aggregateWeeks(weekly){
  const out={};
  for(let week=1;week<=18;week++){
    for(const [id,stats] of rows(weekly?.[week])){
      const dst=out[id]||(out[id]={gp:0,_ppr_native_weeks:0,_ppr_reconstructed_weeks:0});
      dst.gp+=1;
      dst._ppr_native_weeks+=numeric(stats,'_pts_ppr_native');
      dst._ppr_reconstructed_weeks+=numeric(stats,'_pts_ppr_reconstructed');
      for(const [k,v] of Object.entries(stats||{})){
        if(k.startsWith('_pts_ppr_'))continue;
        const n=Number(v);
        if(!Number.isFinite(n)||['gp','gms_active','games_played'].includes(k))continue;
        dst[k]=(Number(dst[k])||0)+n;
      }
    }
  }
  return out;
}


export const IDP_SCORE_ALIASES={idp_td:['def_td','td'],idp_sack:['sack'],idp_qb_hit:['qb_hit','qb_hits'],idp_tkl_loss:['tkl_loss','tfl'],idp_blk_kick:['blk_kick'],idp_int:['int'],idp_int_yd:['int_yd'],idp_fum_rec:['fum_rec'],idp_fum_rec_yd:['fum_rec_yd'],idp_ff:['ff'],idp_safety:['safety'],idp_tkl_ast:['tkl_ast','ast_tkl'],idp_tkl_solo:['tkl_solo','solo_tkl'],idp_pass_def:['pass_def','pd']};

export function statValue(stats,key){
  if(Number.isFinite(Number(stats?.[key])))return Number(stats[key]);
  if(String(key).startsWith('idp_')){
    const bare=String(key).slice(4);
    if(Number.isFinite(Number(stats?.[bare])))return Number(stats[bare]);
  }
  for(const alias of IDP_SCORE_ALIASES[key]||[])if(Number.isFinite(Number(stats?.[alias])))return Number(stats[alias]);
  return 0;
}

export function leagueFantasyPoints(stats,scoringSettings={}){
  let points=0,seen=false;
  for(const [key,wRaw] of Object.entries(scoringSettings||{})){
    const w=Number(wRaw);
    if(!Number.isFinite(w)||!w)continue;
    const v=statValue(stats,key);
    if(v!==0||Number.isFinite(Number(stats?.[key])))seen=true;
    points+=v*w;
  }
  if(!seen&&Number.isFinite(Number(stats?.pts_ppr)))return Number(stats.pts_ppr);
  return Number(points.toFixed(4));
}

const firstFinite=(obj,keys)=>{for(const key of keys){const n=Number(obj?.[key]);if(Number.isFinite(n)&&n>=0)return n}return null};
export function playerSnapShare(stats,{phase='offense',teamSnapMax=0}={}){
  const pctKeys=phase==='defense'
    ?['def_snp_pct','def_snap_pct','defensive_snap_pct','snap_pct']
    :['off_snp_pct','off_snap_pct','offensive_snap_pct','snap_pct'];
  const pct=firstFinite(stats,pctKeys);
  if(pct!=null)return pct>1?pct/100:pct;
  const snapKeys=phase==='defense'
    ?['def_snp','def_snaps','defensive_snaps','snaps_defense']
    :['off_snp','off_snaps','offensive_snaps','snaps_offense'];
  const snaps=firstFinite(stats,snapKeys),den=Number(teamSnapMax);
  return snaps!=null&&Number.isFinite(den)&&den>0?snaps/den:null;
}

export function qualifiesCurrentSeasonGame(stats,{phase='offense',teamSnapMax=0,scoringSettings={}}={}){
  const points=leagueFantasyPoints(stats,scoringSettings),snapShare=playerSnapShare(stats,{phase,teamSnapMax});
  return{qualified:(snapShare!=null&&snapShare>=.20)||points>=8,points,snapShare};
}

export const IGNORED_GAME_STATUS_TOKENS=['CANCEL','POSTPON','DELAY','SUSPEND'];
export function classifyGameSlot(status={}){
  const name=String(status?.name||'').toUpperCase(),description=String(status?.description||'').toUpperCase(),detail=String(status?.detail||'').toUpperCase();
  if(status?.completed===true||name==='STATUS_FINAL'||name==='FINAL')return'final';
  const text=`${name} ${description} ${detail}`;
  if(IGNORED_GAME_STATUS_TOKENS.some(token=>text.includes(token)))return'ignored';
  return'blocking';
}
export function weekFinalityFromGameSlots(slots=[]){
  const list=(slots||[]).map((slot,index)=>({...slot,id:String(slot?.id||`slot-${index+1}`),state:slot?.state||classifyGameSlot(slot?.status||{})}));
  const finalGames=list.filter(x=>x.state==='final').length,ignoredGames=list.filter(x=>x.state==='ignored').length,blockingGames=list.filter(x=>x.state==='blocking').length;
  return{scheduledGames:list.length,finalGames,ignoredGames,blockingGames,complete:list.length>0&&blockingGames===0,nullSlots:list.filter(x=>x.state==='ignored').map(x=>x.id),slots:list};
}
export function latestFullyCompletedWeek(finalityByWeek={}){
  let last=0;
  for(let week=1;week<=18;week++){
    if(finalityByWeek?.[week]?.complete===true)last=week;
    else break;
  }
  return last;
}

export function valuationEligibleCurrentSeasonWeeks(qualifiedWeekly={},finalityByWeek={}){
  const completedWeek=latestFullyCompletedWeek(finalityByWeek),weekly={};
  for(let week=1;week<=18;week++)weekly[week]=week<=completedWeek&&finalityByWeek?.[week]?.complete===true?(qualifiedWeekly?.[week]||{}):{};
  return{weekly,completedWeek};
}
