import {applyWeek2EditorialR16 as applyR157} from './inquirer-week2-editorial-r157.mjs';

const CONCENTRATION=/^(.+?)\s+(?:supplied|produced)\s+(-?\d+(?:\.\d+)?),\s+(?:about|roughly)\s+(\d+)%\s+of\s+(.+?)'?(?:s)?\s+Week 2 (?:points|total|scoring)\./i;

function removeRepeatedPlayerScore(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>{
      const text=String(p||'').trim();
      const m=text.match(CONCENTRATION);
      if(!m)return text;
      const player=m[1].trim(),share=m[3],rest=text.slice(m[0].length).trim();
      return `${player} accounted for about ${share}% of the team's Week 2 scoring. ${rest}`.trim();
    });
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r158';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR157(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(removeRepeatedPlayerScore);
  if(out.league_overview)out.league_overview.structure_revision='week2-r158';
  out.structure_revision='week2-r158';
  return out;
}

export const applyWeek2EditorialR158=applyWeek2EditorialR16;
export const applyWeek2EditorialR157=applyWeek2EditorialR16;
export const applyWeek2EditorialR156=applyWeek2EditorialR16;
export const applyWeek2EditorialR155=applyWeek2EditorialR16;
export const applyWeek2EditorialR154=applyWeek2EditorialR16;
export const applyWeek2EditorialR153=applyWeek2EditorialR16;
export const applyWeek2EditorialR152=applyWeek2EditorialR16;
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
