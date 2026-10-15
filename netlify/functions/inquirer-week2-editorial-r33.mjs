import {applyWeek2EditorialR16 as applyR32} from './inquirer-week2-editorial-r32.mjs';

const SCHEDULE_DIFFICULTY=/\b(?:stiffen|rougher|difficult stretch|hard part|hard stretch|hardens|gauntlet|resistance|heavy part|friendlier|friendly part|softer|manageable|forgiving|breathing room|favorable|mercy|soft landing|lowering the volume|mixed|split schedule|split the|uneven|difficulty level|lands in the middle|split screen)\b/i;

function normalizeOutlookSchedule(team){
 const article=team?.inquirer_article;if(!article)return team;
 const outlook=(article.sections||[]).find(sec=>String(sec?.kind||'')==='outlook');
 const ps=outlook?.paragraphs;if(!Array.isArray(ps)||ps.length<2)return team;
 const later=(team?.upcoming_opponents||[]).slice().sort((a,b)=>Number(a?.week)-Number(b?.week)).slice(1,3);
 const laterNames=later.map(x=>String(x?.team_name||'').trim()).filter(Boolean);
 let idx=ps.findIndex(p=>SCHEDULE_DIFFICULTY.test(String(p||''))&&(laterNames.length<2||laterNames.every(n=>String(p||'').toLowerCase().includes(n.toLowerCase()))));
 if(idx<0)return team;
 const target=Math.max(0,ps.length-2);
 if(idx===target)return team;
 const [road]=ps.splice(idx,1);
 ps.splice(Math.max(0,ps.length-1),0,road);
 article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR32(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(normalizeOutlookSchedule);
 out.structure_revision='week2-r33';
 for(const t of out.teams||[])if(t?.inquirer_article)t.inquirer_article.structure_revision='week2-r33';
 if(out.league_overview)out.league_overview.structure_revision='week2-r33';
 return out;
}

export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
