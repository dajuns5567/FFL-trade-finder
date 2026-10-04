import {applyWeek2EditorialR16 as applyR162} from './inquirer-week2-editorial-r162.mjs';

function cleanRepeatedPraise(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').replace(
      /(.+?) fans earned the right to be loud for a week\. The roster earned exactly one week of not hearing about it\./g,
      '$1 fans can be loud for a week; Week 3 will decide whether the volume was confidence or premature noise.'
    ));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r163';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR162(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(cleanRepeatedPraise);
  if(out.league_overview)out.league_overview.structure_revision='week2-r163';
  out.structure_revision='week2-r163';
  return out;
}

export const applyWeek2EditorialR163=applyWeek2EditorialR16;
