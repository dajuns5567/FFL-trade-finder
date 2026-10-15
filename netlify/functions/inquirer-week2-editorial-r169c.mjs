import {applyWeek2EditorialR16 as applyR169B} from './inquirer-week2-editorial-r169b.mjs';

const shortRef=team=>String(team?.team_name||team?.name||'').trim().split(/\s+/).filter(Boolean).at(-1)||'';
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function fixStrings(value,bad,good){
  if(typeof value==='string')return value.replace(bad,good);
  if(Array.isArray(value))return value.map(v=>fixStrings(v,bad,good));
  if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value))value[k]=fixStrings(v,bad,good);
  }
  return value;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169B(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const ref=shortRef(team);
    if(!/s$/i.test(ref))continue;
    const bad=new RegExp(`\\b${esc(ref)}(?:'s|’s)\\b`,'g');
    fixStrings(team,bad,`${ref}'`);
  }
  return out;
}

export const applyWeek2EditorialR169C=applyWeek2EditorialR16;
