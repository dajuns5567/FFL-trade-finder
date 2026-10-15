import {applyWeek2EditorialR16 as applyR169M} from './inquirer-week2-editorial-r169m.mjs';

export function applyWeek2EditorialR16(raw){
  const out=applyR169M(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article,name=String(team?.team_name||'').trim();
    if(!article||!name||!/s$/i.test(name))continue;
    for(const section of article.sections||[]){
      if(!Array.isArray(section?.paragraphs))continue;
      section.paragraphs=section.paragraphs.map(p=>String(p||'').replaceAll(`${name}'s`,`${name}'`));
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169N=applyWeek2EditorialR16;
