import {applyWeek2EditorialR16 as applyR154} from './inquirer-week2-editorial-r154.mjs';

function naturalizeJetsHistory(team){
  if(String(team?.team_name||'')!=='New York Jets')return team;
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').replace(
      'Cousins averaged 9.1 fantasy points across 10 games in 2025; his 18.82 in Week 2 was a real jump from that baseline, not just a louder version of normal.',
      'Cousins averaged 9.1 fantasy points across 10 games in 2025; his 18.82 in Week 2 was more than double that per-game norm, so this was a real spike rather than ordinary production wearing a nicer suit.'
    ));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r155';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR154(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(naturalizeJetsHistory);
  if(out.league_overview)out.league_overview.structure_revision='week2-r155';
  out.structure_revision='week2-r155';
  return out;
}

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
