import {applyWeek2EditorialR16 as applyR169L} from './inquirer-week2-editorial-r169l.mjs';

export function applyWeek2EditorialR16(raw){
  const out=applyR169L(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    const lede=(article?.sections||[]).find(s=>String(s?.kind||'')==='lede');
    if(!article||!lede||!Array.isArray(lede.paragraphs))continue;
    lede.paragraphs.push(`The useful part is simple: ${team.team_name} now has to make the next Sunday say something new.`);
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169M=applyWeek2EditorialR16;
