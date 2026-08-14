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
