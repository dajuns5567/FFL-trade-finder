import {applyWeek2EditorialR16 as applyR52} from './inquirer-week2-editorial-r52.mjs';

const ROAD_CODA=/^(?:A Week 3 win would bank something useful before that sequence\.|Handle Week 3 and that road looks different for reasons the standings can actually explain\.|Beat the Week 3 opponent and the pressure attached to those later games changes immediately\.|Week 3 matters first; a win would keep that later stretch from carrying extra weight\.)$/i;
function splitSentences(text){return String(text||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);}
function stripRoadCoda(team){
 const article=team?.inquirer_article;if(!article)return team;
 article.sections=(article.sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>splitSentences(p).filter(s=>!ROAD_CODA.test(s)).join(' ').trim()).filter(Boolean)}));
 article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r53';
 return team;
}
export function applyWeek2EditorialR16(raw){
 const out=applyR52(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(stripRoadCoda);
 out.structure_revision='week2-r53';
 if(out.league_overview)out.league_overview.structure_revision='week2-r53';
 return out;
}
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
