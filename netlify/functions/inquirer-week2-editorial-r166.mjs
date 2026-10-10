import {applyWeek2EditorialR16 as applyR165} from './inquirer-week2-editorial-r165.mjs';

function fixAnchoredInterjections(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'')
      .replace(/For ([A-Za-z0-9 .'-]+), good\./g,"For $1, MIDA's confidence is encouraging.")
      .replace(/For ([A-Za-z0-9 .'-]+), lovely\./g,"For $1, MIDA's confidence is welcome.")
      .replace(/For ([A-Za-z0-9 .'-]+), fine\./g,"For $1, the result is acceptable for now.")
    );
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r166';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR165(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(fixAnchoredInterjections);
  if(out.league_overview)out.league_overview.structure_revision='week2-r166';
  out.structure_revision='week2-r166';
  return out;
}

export const applyWeek2EditorialR166=applyWeek2EditorialR16;
