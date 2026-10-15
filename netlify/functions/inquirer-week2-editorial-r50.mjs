import {applyWeek2EditorialR16 as applyR49} from './inquirer-week2-editorial-r49.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function shortenOwnTeamReferences(team){
 const article=team?.inquirer_article;if(!article)return team;
 const full=String(team?.team_name||'').trim(),bits=full.split(/\s+/).filter(Boolean),short=bits.at(-1)||full;
 if(!full||!short||full===short)return team;
 const re=new RegExp(`\\b${esc(full)}\\b`,'g');
 let kept=0;
 const budget=6;
 article.sections=(article.sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(raw=>String(raw||'').replace(re,match=>{
  kept++;
  return kept<=budget?match:short;
 }))}));
 article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r50';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR49(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(shortenOwnTeamReferences);
 out.structure_revision='week2-r50';
 if(out.league_overview)out.league_overview.structure_revision='week2-r50';
 return out;
}

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
