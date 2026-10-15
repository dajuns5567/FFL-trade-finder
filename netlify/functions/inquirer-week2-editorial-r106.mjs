import {applyWeek2EditorialR16 as applyR105} from './inquirer-week2-editorial-r105.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';
const record=r=>`${n(r?.wins)||0}-${n(r?.losses)||0}${n(r?.ties)?`-${n(r.ties)}`:''}`;

function divisionRead(out,divisionName,leaders){
  const teams=(out?.teams||[]).filter(t=>String(t?.division_context?.division_name||'')===divisionName);
  const leaderTeams=leaders.map(l=>teams.find(t=>String(t?.roster_id||'')===String(l?.roster_id||''))||teams.find(t=>String(t?.team_name||'')===String(l?.team_name||''))).filter(Boolean);
  if(leaders.length>1){
    const scored=leaderTeams.filter(t=>finite(t?.points)).sort((a,b)=>n(b.points)-n(a.points));
    const top=scored[0];
    return top?`${top.team_name} had the stronger Week 2 score among the co-leaders at ${one(top.points)}.`:`The lead is shared after two weeks, so Week 3 gets the first chance to separate it.`;
  }
  const leader=leaderTeams[0],leaderIds=new Set(leaders.map(l=>String(l?.roster_id||'')));
  const chasers=teams.filter(t=>!leaderIds.has(String(t?.roster_id||''))).sort((a,b)=>n(b?.league_context?.record?.wins)-n(a?.league_context?.record?.wins)||n(a?.league_context?.record?.losses)-n(b?.league_context?.record?.losses)||n(b?.points)-n(a?.points));
  const chaser=chasers[0];
  if(leader&&chaser&&finite(leader?.points))return `${leader.team_name} scored ${one(leader.points)} in Week 2; ${chaser.team_name} is the nearest chaser at ${record(chaser?.league_context?.record)}.`;
  if(leader&&finite(leader?.points))return `${leader.team_name} scored ${one(leader.points)} in Week 2 and owns the early lead alone.`;
  return `The division has a single leader after two weeks, with Week 3 next to test the gap.`;
}

function rebuildDivisionBoard(out){
  const overview=out?.league_overview,hot=overview?.hot_takes;
  if(!Array.isArray(hot))return;
  const board=hot.find(x=>/division board/i.test(String(x?.title||'')));
  if(!board)return;
  const contexts=new Map();
  for(const team of out?.teams||[]){
    const ctx=team?.division_context,name=String(ctx?.division_name||'').trim();
    if(name&&!contexts.has(name))contexts.set(name,ctx);
  }
  const order=['AFC EAST','AFC NORTH','AFC SOUTH','AFC WEST','NFC EAST','NFC NORTH','NFC SOUTH','NFC WEST'];
  const lines=[];
  for(const name of order){
    const ctx=contexts.get(name),leaders=[...(ctx?.leaders||[])];
    if(!leaders.length)continue;
    const label=leaders.map(l=>`${l.team_name} (${record(l.record)})`).join(' and ');
    lines.push(`${name}: ${label} — ${divisionRead(out,name,leaders)}`);
  }
  if(lines.length===8)board.take=`The division board after two weeks:\n\n${lines.join('\n')}`;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR105(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  rebuildDivisionBoard(out);
  out.structure_revision='week2-r106';
  if(out.league_overview)out.league_overview.structure_revision='week2-r106';
  return out;
}
export const applyWeek2EditorialR106=applyWeek2EditorialR16;
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
