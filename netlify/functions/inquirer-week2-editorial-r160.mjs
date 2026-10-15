import {applyWeek2EditorialR16 as applyR159} from './inquirer-week2-editorial-r159.mjs';

function naturalizeSentiment(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const sentiment=article.sections.find(s=>String(s?.kind||'')==='sentiment');
  if(!Array.isArray(sentiment?.paragraphs))return team;
  sentiment.paragraphs=sentiment.paragraphs.map(p=>String(p||'')
    .replace(/\btemperature\b/gi,'mood')
    .replace(/\bmeter\b/gi,'patience')
    .replace(/\brating\b/gi,'opinion')
    .replace(/\bsample doubled\b/gi,'two weeks now exist to argue about')
    .replace(/\bprocess instead\b/gi,'the decisions instead')
    .replace(/\bactual scoring\b/gi,'the points on the board')
    .replace(/\bprojection\b/gi,'expectations')
  );
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r160';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR159(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(naturalizeSentiment);
  if(out.league_overview)out.league_overview.structure_revision='week2-r160';
  out.structure_revision='week2-r160';
  return out;
}

export const applyWeek2EditorialR160=applyWeek2EditorialR16;
export const applyWeek2EditorialR159=applyWeek2EditorialR16;
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
