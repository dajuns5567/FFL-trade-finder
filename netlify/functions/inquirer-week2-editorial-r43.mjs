import {applyWeek2EditorialR16 as applyR42} from './inquirer-week2-editorial-r42.mjs';

function naturalList(items){
 if(items.length<=1)return items.join('');
 if(items.length===2)return items.join(' and ');
 return items.slice(0,-1).join(', ')+', and '+items.at(-1);
}

function ensureTopThreeFullNames(team){
 const article=team?.inquirer_article;if(!article)return team;
 const copy=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' ');
 const missing=(team?.starter_details||[]).slice(0,3).filter(p=>{
  const name=String(p?.name||'').trim();
  return name&&!copy.includes(name);
 });
 if(!missing.length)return team;
 const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players')||article.sections?.[0];
 if(!players)return team;
 const names=naturalList(missing.map(p=>String(p.name).trim()));
 players.paragraphs=[...(players.paragraphs||[]),`The rest of ${team.team_name}'s top-three starter group included ${names}.`];
 article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r43';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR42(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(ensureTopThreeFullNames);
 out.structure_revision='week2-r43';
 if(out.league_overview)out.league_overview.structure_revision='week2-r43';
 return out;
}

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
