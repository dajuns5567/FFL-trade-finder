import {applyWeek2EditorialR16 as applyR45} from './inquirer-week2-editorial-r45.mjs';

function rotate(items,n){
 const a=[...items];
 if(!a.length)return a;
 const k=((n%a.length)+a.length)%a.length;
 return [...a.slice(k),...a.slice(0,k)];
}

function varyStructure(team,variant){
 const article=team?.inquirer_article;if(!article)return team;
 const sections=article.sections||[];
 const lede=sections.find(s=>String(s?.kind||'')==='lede');
 const outlook=sections.find(s=>String(s?.kind||'')==='outlook');
 const trade=sections.find(s=>String(s?.kind||'')==='trade-commentary');
 const middle=sections.filter(s=>![lede,outlook,trade].includes(s));
 let varied=[...middle];
 if(variant===1)varied=rotate(middle,1);
 else if(variant===2)varied=rotate(middle,2);
 else if(variant===3)varied=[...middle].reverse();
 article.sections=[...(lede?[lede]:[]),...varied,...(trade?[trade]:[]),...(outlook?[outlook]:[])];
 article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r46';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR45(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 const seen=new Map();
 out.teams=(out.teams||[]).map(team=>{
  const rid=String(team?.inquirer_article?.reporter?.id||'');
  const index=seen.get(rid)||0;seen.set(rid,index+1);
  return varyStructure(team,index%4);
 });
 out.structure_revision='week2-r46';
 if(out.league_overview)out.league_overview.structure_revision='week2-r46';
 return out;
}

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
