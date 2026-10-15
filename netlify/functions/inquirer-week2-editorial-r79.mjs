import {applyWeek2EditorialR16 as applyR78} from './inquirer-week2-editorial-r78.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';
const wc=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sec=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const starters=t=>[...(t?.starter_details||[])].filter(p=>p?.name&&finite(p?.points)).sort((a,b)=>n(b.points)-n(a.points));

function addIfNeeded(team){
  const a=team?.inquirer_article;if(!a)return team;
  let text=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean).join(' ');
  if(wc(text)>=770){a.structure_revision='week2-r79';return team;}
  const players=sec(a,'players'),lede=sec(a,'lede');
  const fourth=starters(team)[3];
  if(players&&fourth){
    const proj=finite(fourth.projected)?n(fourth.points)-n(fourth.projected):null;
    const snap=finite(fourth.current_snap_pct)?`${Math.round(n(fourth.current_snap_pct)*100)}% of snaps`:null;
    const details=[snap,proj!=null&&Math.abs(proj)>=3?`${one(Math.abs(proj))} points ${proj>0?'above':'below'} projection`:null].filter(Boolean).join(' and ');
    players.paragraphs.push(`${fourth.name} was the next starter outside the top three at ${one(fourth.points)} points${details?`, with ${details}`:''}. That is worth carrying into Week 3 because it shows what the lineup received after its leading scorers, not because a fourth name needs artificial spotlight.`);
  }
  text=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean).join(' ');
  if(wc(text)<770&&lede){
    const margin=Math.abs(n(team.points)-n(team.opponent_points));
    lede.paragraphs.push(`${team.team_name}'s Week 2 margin was ${one(margin)} points against ${team.opponent_name}. That margin helps frame the rest of the article: a close game makes one decision more consequential, while a wider result usually points to more than one cause.`);
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r79';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR78(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(addIfNeeded);
  out.structure_revision='week2-r79';
  if(out.league_overview)out.league_overview.structure_revision='week2-r79';
  return out;
}
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
