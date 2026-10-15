import {applyWeek2EditorialR16 as applyR135} from './inquirer-week2-editorial-r135.mjs';

const isActualOutlook=heading=>/^(?:Week 3\b|The Next Matchup\b)/i.test(String(heading||'').trim());

function keepMidaInOutlook(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return team;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs)||isActualOutlook(section.heading))continue;
    section.paragraphs=section.paragraphs.filter(p=>!(/\bMIDA\b/i.test(String(p||''))));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r136';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR135(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(keepMidaInOutlook);
  if(out.league_overview)out.league_overview.structure_revision='week2-r136';
  out.structure_revision='week2-r136';
  return out;
}

export const applyWeek2EditorialR136=applyWeek2EditorialR16;
export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
