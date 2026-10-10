import {applyWeek2EditorialR16 as applyR75} from './inquirer-week2-editorial-r75.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');
const sec=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const rec=r=>`${Number(r?.wins)||0}-${Number(r?.losses)||0}${Number(r?.ties)?`-${Number(r.ties)}`:''}`;
const top=t=>[...(t?.starter_details||[])].filter(p=>p?.name&&finite(p?.points)).sort((a,b)=>n(b.points)-n(a.points)).slice(0,3);

function addDepth(t){
  const a=t?.inquirer_article;if(!a)return t;
  const lede=sec(a,'lede'),players=sec(a,'players'),outlook=sec(a,'outlook'),value=sec(a,'value');
  const s=short(t.team_name),name=String(a?.reporter?.name||''),actual=n(t.points),proj=n(t.projected),div=t?.division_context;

  if(lede&&finite(actual)&&finite(proj)){
    const d=actual-proj;
    lede.paragraphs.push(`${s} finished ${one(Math.abs(d))} points ${d>=0?'above':'below'} its Week 2 projection. That matters because it tells us whether the result merely matched expectation or changed what Week 3 should reasonably demand from the lineup.`);
  }
  if(lede&&div?.division_name&&finite(div?.division_rank)){
    lede.paragraphs.push(`In the ${div.division_name}, ${s} sits ${Number(div.division_rank)===1?'first':`No. ${div.division_rank}`} after two weeks. The standings add pressure to the next decision, but they do not turn a two-game sample into a finished season.`);
  }

  if(players){
    const ps=top(t),sum=ps.reduce((x,p)=>x+n(p.points),0),share=actual?sum/actual:0;
    const names=ps.map(p=>p.name).join(', ');
    if(ps.length===3)players.paragraphs.push(`${names} combined for ${one(sum)} points, or ${Math.round(share*100)}% of ${s}'s Week 2 total. That concentration is useful context: if the share is high, the rest of the lineup needs more help; if it is modest, the scoring was spread more naturally.`);
    const snaps=ps.filter(p=>finite(p.current_snap_pct)).map(p=>`${p.name} ${Math.round(n(p.current_snap_pct)*100)}%`).join(', ');
    if(snaps)players.paragraphs.push(`The top group also carried real Week 2 roles: ${snaps} snap share. That usage matters more for Week 3 than squeezing another conclusion out of the same fantasy totals.`);
  }

  if(outlook&&t?.next_opponent_name){
    const nc=t?.next_opponent_context||{};
    if(finite(nc?.recent_avg_points))outlook.paragraphs.push(`${t.next_opponent_name} has averaged ${one(nc.recent_avg_points)} points through two weeks and enters Week 3 at ${rec(nc.record)}. That gives ${s} a concrete next test instead of another abstract prediction.`);
  }

  if(value){
    const movers=t?.value_history_player_movers||{},r=(movers.risers||[])[1],f=(movers.fallers||[])[1];
    if(r||f){
      const bits=[];if(r)bits.push(`${r.player_name} also rose ${one(r.delta)}`);if(f)bits.push(`${f.player_name} also fell ${one(f.delta)}`);
      value.paragraphs.push(`${bits.join(', while ')}. Those secondary moves matter because the roster market was not defined by one player alone, but they still belong in a different bucket from the Week 2 football result.`);
    }
  }

  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r76';
  return t;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR75(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(addDepth);
  out.structure_revision='week2-r76';
  if(out.league_overview)out.league_overview.structure_revision='week2-r76';
  return out;
}
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
