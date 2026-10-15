import {applyWeek2EditorialR16 as applyR40} from './inquirer-week2-editorial-r40.mjs';
import {applyWeek2EditorialR16 as applyR36} from './inquirer-week2-editorial-r36.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));

export function applyWeek2EditorialR16(raw){
 const baseline=applyR36(clone(raw));
 const out=applyR40(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 const originalBoard=(baseline?.league_overview?.hot_takes||[]).find(x=>/division board/i.test(String(x?.title||'')));
 const revisedBoard=(out?.league_overview?.hot_takes||[]).find(x=>/division board/i.test(String(x?.title||'')));
 if(originalBoard&&revisedBoard)revisedBoard.take=String(originalBoard.take||'');
 out.structure_revision='week2-r41';
 if(out.league_overview)out.league_overview.structure_revision='week2-r41';
 for(const t of out.teams||[])if(t?.inquirer_article)t.inquirer_article.structure_revision='week2-r41';
 return out;
}

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
