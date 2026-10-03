import {applyWeek2EditorialR16 as applyR34} from './inquirer-week2-editorial-r34.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();

function ensureNextOpponentRecord(team){
 const article=team?.inquirer_article;if(!article)return team;
 const outlook=(article.sections||[]).find(sec=>String(sec?.kind||'')==='outlook');
 const ps=outlook?.paragraphs;if(!Array.isArray(ps)||!ps.length||ps[0]==='n/a')return team;
 const next=(team?.upcoming_opponents||[]).slice().sort((a,b)=>Number(a?.week)-Number(b?.week))[0];
 const rec=team?.next_opponent_context?.record||next?.context?.record;
 if(!rec)return team;
 const wins=Number(rec?.wins),losses=Number(rec?.losses);
 if(!Number.isFinite(wins)||!Number.isFinite(losses))return team;
 const recText=`${wins}-${losses}`;
 const copy=ps.join(' ');
 if(copy.includes(recText))return team;
 const week=Number(next?.week)||3;
 const idx=ps.findIndex(p=>String(p||'').includes(String(next?.team_name||team?.next_opponent_name||'')));
 const target=idx>=0?idx:0;
 ps[target]=clean(`${ps[target]} That Week ${week} opponent comes in at ${recText}.`);
 article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR34(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(ensureNextOpponentRecord);
 out.structure_revision='week2-r35';
 for(const t of out.teams||[])if(t?.inquirer_article)t.inquirer_article.structure_revision='week2-r35';
 if(out.league_overview)out.league_overview.structure_revision='week2-r35';
 return out;
}

export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
