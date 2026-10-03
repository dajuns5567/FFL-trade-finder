import {applyWeek2EditorialR16 as applyR131} from './inquirer-week2-editorial-r131.mjs';

function cleanParagraph(text){
  return String(text||'')
    .replace('Fantasy football found a way to turn useful production into a receipt for disappointment.','They scored enough to stay competitive and still walked away with a loss.')
    .replace('some managers should be grateful fantasy apps do not issue citations.','some managers should be grateful the standings do not grade on style.');
}

export function applyWeek2EditorialR16(raw){
  const out=applyR131(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    for(const section of article.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(cleanParagraph);
    }
    article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
    article.structure_revision='week2-r132';
  }
  for(const section of out?.league_overview?.sections||[]){
    if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(cleanParagraph);
  }
  out.structure_revision='week2-r132';
  if(out.league_overview)out.league_overview.structure_revision='week2-r132';
  return out;
}

export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
