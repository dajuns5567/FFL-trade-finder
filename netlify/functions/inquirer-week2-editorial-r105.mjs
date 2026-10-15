import {applyWeek2EditorialR16 as applyR104} from './inquirer-week2-editorial-r104.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';

function scoringRebound(out){
  const rows=(out?.teams||[]).map(team=>{
    const games=[...(team?.league_context?.recent_games||[])].sort((a,b)=>n(a?.week)-n(b?.week));
    const w1=games.find(g=>n(g?.week)===1),w2=games.find(g=>n(g?.week)===2);
    if(!finite(w1?.points)||!finite(w2?.points))return null;
    return {team,w1:n(w1.points),w2:n(w2.points),delta:n(w2.points)-n(w1.points)};
  }).filter(x=>x&&x.delta>0).sort((a,b)=>b.delta-a.delta)[0];
  if(!rows)return null;
  return {
    title:`Week 2 biggest rebound: ${rows.team.team_name}`,
    take:`${rows.team.team_name} jumped ${one(rows.delta)} points from Week 1 to Week 2, from ${one(rows.w1)} to ${one(rows.w2)}. That is the league's biggest scoring rebound through two weeks; Week 3 gets to show whether the higher level has any staying power.`
  };
}

function projectionSpotlight(out){
  const byRoster=new Map((out?.teams||[]).map(t=>[String(t?.roster_id||''),t]));
  const seen=new Set(),pairs=[];
  for(const team of out?.teams||[]){
    const opp=byRoster.get(String(team?.next_opponent_roster_id||''));
    if(!opp||String(opp?.next_opponent_roster_id||'')!==String(team?.roster_id||''))continue;
    if(!finite(team?.next_projected)||!finite(opp?.next_projected))continue;
    if(n(team.next_projected)<50||n(opp.next_projected)<50)continue;
    const key=[String(team.roster_id),String(opp.roster_id)].sort().join(':');
    if(seen.has(key))continue;seen.add(key);
    const a=n(team.next_projected),b=n(opp.next_projected),fav=a>=b?team:opp,dog=a>=b?opp:team;
    pairs.push({fav,dog,gap:Math.abs(a-b)});
  }
  const pick=pairs.sort((a,b)=>b.gap-a.gap)[0];
  if(!pick)return null;
  return {
    title:`Week 3 projection spotlight: ${pick.fav.team_name} vs. ${pick.dog.team_name}`,
    take:`${pick.fav.team_name} projects for ${one(pick.fav.next_projected)} against ${pick.dog.team_name}'s ${one(pick.dog.next_projected)} in Week 3, a ${one(pick.gap)}-point edge. Projections are not points already scored, but that gap makes this the clearest early expectation test of Week 3.`
  };
}

function expandHotTakes(out){
  const overview=out?.league_overview;if(!overview)return;
  const takes=[...(overview.hot_takes||[])];
  const titles=takes.map(x=>String(x?.title||''));
  const additions=[];
  if(!titles.some(x=>/biggest rebound/i.test(x)))additions.push(scoringRebound(out));
  if(!titles.some(x=>/projection spotlight/i.test(x)))additions.push(projectionSpotlight(out));
  const clean=additions.filter(Boolean);
  if(!clean.length)return;
  const division=takes.findIndex(x=>/division board/i.test(String(x?.title||'')));
  if(division>=0)takes.splice(division,0,...clean);else takes.push(...clean);
  overview.hot_takes=takes;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR104(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  expandHotTakes(out);
  out.structure_revision='week2-r105';
  if(out.league_overview)out.league_overview.structure_revision='week2-r105';
  return out;
}
export const applyWeek2EditorialR105=applyWeek2EditorialR16;
export const applyWeek2EditorialR104=applyWeek2EditorialR16;
export const applyWeek2EditorialR103=applyWeek2EditorialR16;
export const applyWeek2EditorialR102=applyWeek2EditorialR16;
export const applyWeek2EditorialR101=applyWeek2EditorialR16;
export const applyWeek2EditorialR100=applyWeek2EditorialR16;
export const applyWeek2EditorialR99=applyWeek2EditorialR16;
export const applyWeek2EditorialR98=applyWeek2EditorialR16;
export const applyWeek2EditorialR97=applyWeek2EditorialR16;
export const applyWeek2EditorialR96=applyWeek2EditorialR16;
export const applyWeek2EditorialR95=applyWeek2EditorialR16;
export const applyWeek2EditorialR94=applyWeek2EditorialR16;
export const applyWeek2EditorialR93=applyWeek2EditorialR16;
export const applyWeek2EditorialR92=applyWeek2EditorialR16;
export const applyWeek2EditorialR91=applyWeek2EditorialR16;
export const applyWeek2EditorialR90=applyWeek2EditorialR16;
export const applyWeek2EditorialR89=applyWeek2EditorialR16;
export const applyWeek2EditorialR88=applyWeek2EditorialR16;
export const applyWeek2EditorialR87=applyWeek2EditorialR16;
export const applyWeek2EditorialR86=applyWeek2EditorialR16;
export const applyWeek2EditorialR85=applyWeek2EditorialR16;
export const applyWeek2EditorialR84=applyWeek2EditorialR16;
export const applyWeek2EditorialR83=applyWeek2EditorialR16;
export const applyWeek2EditorialR82=applyWeek2EditorialR16;
export const applyWeek2EditorialR81=applyWeek2EditorialR16;
export const applyWeek2EditorialR80=applyWeek2EditorialR16;
export const applyWeek2EditorialR79=applyWeek2EditorialR16;
export const applyWeek2EditorialR78=applyWeek2EditorialR16;
export const applyWeek2EditorialR77=applyWeek2EditorialR16;
export const applyWeek2EditorialR76=applyWeek2EditorialR16;
export const applyWeek2EditorialR75=applyWeek2EditorialR16;
export const applyWeek2EditorialR74=applyWeek2EditorialR16;
export const applyWeek2EditorialR73=applyWeek2EditorialR16;
export const applyWeek2EditorialR72=applyWeek2EditorialR16;
export const applyWeek2EditorialR71=applyWeek2EditorialR16;
export const applyWeek2EditorialR70=applyWeek2EditorialR16;
export const applyWeek2EditorialR69=applyWeek2EditorialR16;
export const applyWeek2EditorialR68=applyWeek2EditorialR16;
export const applyWeek2EditorialR67=applyWeek2EditorialR16;
export const applyWeek2EditorialR66=applyWeek2EditorialR16;
export const applyWeek2EditorialR65=applyWeek2EditorialR16;
export const applyWeek2EditorialR64=applyWeek2EditorialR16;
export const applyWeek2EditorialR63=applyWeek2EditorialR16;
export const applyWeek2EditorialR62=applyWeek2EditorialR16;
export const applyWeek2EditorialR61=applyWeek2EditorialR16;
export const applyWeek2EditorialR60=applyWeek2EditorialR16;
export const applyWeek2EditorialR59=applyWeek2EditorialR16;
export const applyWeek2EditorialR58=applyWeek2EditorialR16;
export const applyWeek2EditorialR57=applyWeek2EditorialR16;
export const applyWeek2EditorialR56=applyWeek2EditorialR16;
export const applyWeek2EditorialR55=applyWeek2EditorialR16;
export const applyWeek2EditorialR54=applyWeek2EditorialR16;
export const applyWeek2EditorialR53=applyWeek2EditorialR16;
export const applyWeek2EditorialR52=applyWeek2EditorialR16;
export const applyWeek2EditorialR51=applyWeek2EditorialR16;
export const applyWeek2EditorialR50=applyWeek2EditorialR16;
export const applyWeek2EditorialR49=applyWeek2EditorialR16;
export const applyWeek2EditorialR48=applyWeek2EditorialR16;
export const applyWeek2EditorialR47=applyWeek2EditorialR16;
export const applyWeek2EditorialR46=applyWeek2EditorialR16;
export const applyWeek2EditorialR45=applyWeek2EditorialR16;
export const applyWeek2EditorialR44=applyWeek2EditorialR16;
export const applyWeek2EditorialR43=applyWeek2EditorialR16;
export const applyWeek2EditorialR42=applyWeek2EditorialR16;
export const applyWeek2EditorialR41=applyWeek2EditorialR16;
export const applyWeek2EditorialR40=applyWeek2EditorialR16;
export const applyWeek2EditorialR39=applyWeek2EditorialR16;
export const applyWeek2EditorialR38=applyWeek2EditorialR16;
export const applyWeek2EditorialR37=applyWeek2EditorialR16;
export const applyWeek2EditorialR36=applyWeek2EditorialR16;
export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
