import {applyWeek2EditorialR16 as applyR141} from './inquirer-week2-editorial-r141.mjs';

function fixPluralNick(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return team;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').replace(/\b([A-Za-z0-9'’.-]+s) has a specific, fixable mistake here\b/g,'$1 have a specific, fixable mistake here'));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r142';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR141(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(fixPluralNick);
  if(out.league_overview)out.league_overview.structure_revision='week2-r142';
  out.structure_revision='week2-r142';
  return out;
}

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
