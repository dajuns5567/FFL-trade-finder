import {applyWeek2EditorialR16 as applyR138} from './inquirer-week2-editorial-r138.mjs';

function smoothTeam(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return team;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').replace(/For ([A-Za-z0-9'’.-]+), good teams are allowed to enjoy good numbers, although apparently they must first survive everyone declaring the season solved\./g,'$1 can enjoy good numbers without pretending the season is solved; that part can wait until the games stop arguing back.'));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r139';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR138(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(smoothTeam);
  if(out.league_overview)out.league_overview.structure_revision='week2-r139';
  out.structure_revision='week2-r139';
  return out;
}

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
