import {applyWeek2EditorialR16 as applyR155} from './inquirer-week2-editorial-r155.mjs';

const KIRK_CONTEXT='Cousins averaged 9.1 fantasy points across 10 games in 2025; his 18.82 in Week 2 was more than double that per-game norm, so this was a real spike rather than ordinary production wearing a nicer suit.';

function dedupeJetsHistory(team){
  if(String(team?.team_name||'')!=='New York Jets')return team;
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  let seen=false;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>{
      let text=String(p||'');
      if(!text.includes(KIRK_CONTEXT))return text;
      if(!seen){seen=true;return text;}
      return text.replace(KIRK_CONTEXT,'').replace(/\s{2,}/g,' ').trim();
    }).filter(Boolean);
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r156';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR155(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(dedupeJetsHistory);
  if(out.league_overview)out.league_overview.structure_revision='week2-r156';
  out.structure_revision='week2-r156';
  return out;
}

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
