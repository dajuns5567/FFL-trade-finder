import {applyWeek2EditorialR16 as applyR46} from './inquirer-week2-editorial-r46.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pluralVerb={is:'are',has:'have',gets:'get',holds:'hold',brings:'bring',turns:'turn'};

function normalizePluralTeamVerbs(team){
 const article=team?.inquirer_article;if(!article)return team;
 const full=String(team?.team_name||'').trim(),bits=full.split(/\s+/).filter(Boolean),mascot=bits.at(-1)||'';
 if(!mascot||!/s$/i.test(mascot))return team;
 const subject=`(?:${esc(full)}|${esc(mascot)})`;
 const re=new RegExp(`(^|[.!?]["'’”]?\\s+)(${subject})\\s+(is|has|gets|holds|brings|turns)\\b`,'gi');
 for(const sec of article.sections||[]){
  sec.paragraphs=(sec.paragraphs||[]).map(raw=>String(raw||'').replace(re,(m,prefix,name,verb)=>`${prefix}${name} ${pluralVerb[String(verb).toLowerCase()]||verb}`));
 }
 article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r47';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR46(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(normalizePluralTeamVerbs);
 out.structure_revision='week2-r47';
 if(out.league_overview)out.league_overview.structure_revision='week2-r47';
 return out;
}

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
