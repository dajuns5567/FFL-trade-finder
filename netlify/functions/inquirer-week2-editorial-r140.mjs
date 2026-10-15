import {applyWeek2EditorialR16 as applyR139} from './inquirer-week2-editorial-r139.mjs';

const mascot=name=>String(name||'team').trim().split(/\s+/).filter(Boolean).at(-1)||'team';

function smoothNick(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return team;
  const short=mascot(team?.name||team?.team_name||team?.mida_outlook?.name);
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').replace('That is the useful criticism: specific, fixable, and much harder to hide behind the word luck.',`${short} has a specific, fixable mistake here, which is a lot harder to hide behind the word luck.`));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r140';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR139(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(smoothNick);
  if(out.league_overview)out.league_overview.structure_revision='week2-r140';
  out.structure_revision='week2-r140';
  return out;
}

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
