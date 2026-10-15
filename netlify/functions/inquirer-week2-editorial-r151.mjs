import {applyWeek2EditorialR16 as applyR150} from './inquirer-week2-editorial-r150.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fmt=v=>Number.isFinite(Number(v))?Number(v).toFixed(1):null;

function dedupeHotSeatScore(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const worst=team?.worst_starter||{};
  const name=String(worst?.name||'').trim(),score=fmt(worst?.points);
  if(!name||score===null)return team;
  const hot=article.sections.find(s=>String(s?.kind||'')==='hot-seat');
  if(!hot||!Array.isArray(hot.paragraphs))return team;
  const scoreRe=new RegExp(`\\b${esc(score)}(?:-point|\\s+points?)\\b`,'gi');
  hot.paragraphs=hot.paragraphs.map((p,idx)=>idx===0?String(p||''):String(p||'').replace(scoreRe,'that Week 2 dud'));
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r151';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR150(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(dedupeHotSeatScore);
  if(out.league_overview)out.league_overview.structure_revision='week2-r151';
  out.structure_revision='week2-r151';
  return out;
}

export const applyWeek2EditorialR151=applyWeek2EditorialR16;
export const applyWeek2EditorialR150=applyWeek2EditorialR16;
export const applyWeek2EditorialR149=applyWeek2EditorialR16;
export const applyWeek2EditorialR148=applyWeek2EditorialR16;
export const applyWeek2EditorialR147=applyWeek2EditorialR16;
export const applyWeek2EditorialR146=applyWeek2EditorialR16;
export const applyWeek2EditorialR145=applyWeek2EditorialR16;
export const applyWeek2EditorialR144=applyWeek2EditorialR16;
export const applyWeek2EditorialR143=applyWeek2EditorialR16;
export const applyWeek2EditorialR142=applyWeek2EditorialR16;
export const applyWeek2EditorialR141=applyWeek2EditorialR16;
export const applyWeek2EditorialR140=applyWeek2EditorialR16;
export const applyWeek2EditorialR139=applyWeek2EditorialR16;
export const applyWeek2EditorialR138=applyWeek2EditorialR16;
export const applyWeek2EditorialR137=applyWeek2EditorialR16;
export const applyWeek2EditorialR136=applyWeek2EditorialR16;
export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
