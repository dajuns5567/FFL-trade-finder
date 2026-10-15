import {applyWeek2EditorialR16 as applyR53} from './inquirer-week2-editorial-r53.mjs';

const STATIC_ENDING=/^(?:That belongs in the Week 3 expectation; the rest does not need embellishment\.|one game still does not require a role controversy\.|The performance earned the noise; no fake subplot required\.|not because the article needed another dramatic prop\.|I can admire that without inventing a grander story\.|Decoration would only cheapen the point\.|That is substantial and specific enough to stop there\.|That is the fact worth carrying forward; the evidence does not require a larger theory\.|The result changes the expectation without giving us permission to speculate\.|Week 3 can test whether it repeats\.|Bad production is not a permission slip to invent a lineup crime\.|The performance can be criticized without fabricating a management scandal around it\.|The evidence supports criticism of the performance, not an unsupported claim that management caused it\.|That is a player-performance problem; it is not automatic proof the manager chose wrong\.)$/i;
function splitSentences(text){return String(text||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);}
function stripStaticEndings(team){
 const article=team?.inquirer_article;if(!article)return team;
 article.sections=(article.sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>splitSentences(p).filter(s=>!STATIC_ENDING.test(s)).join(' ').trim()).filter(Boolean)}));
 article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r54';
 return team;
}
export function applyWeek2EditorialR16(raw){
 const out=applyR53(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(stripStaticEndings);
 out.structure_revision='week2-r54';
 if(out.league_overview)out.league_overview.structure_revision='week2-r54';
 return out;
}
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
