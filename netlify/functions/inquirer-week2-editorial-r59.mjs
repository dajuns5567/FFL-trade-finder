import {applyWeek2EditorialR16 as applyR58} from './inquirer-week2-editorial-r58.mjs';

const ROAD=/^After Week 3 come (.+?) \((\d+-\d+)\) and (.+?) \((\d+-\d+)\); by the current standings, that is a (friendlier|mixed) stretch\.$/i;

function reporterName(article){return String(article?.reporter?.name||'').trim();}

function rewriteRoadSentence(text,article){
  const m=String(text||'').match(ROAD);if(!m)return String(text||'');
  const [,a,ar,b,br,tone]=m,name=reporterName(article);
  if(name==='Nick Swindell')return `Beyond Week 3, ${a} (${ar}) and ${b} (${br}) set up a ${tone} stretch by the current standings.`;
  if(name==='Tilly Fleecer')return `Then come ${a} (${ar}) and ${b} (${br}); the current standings call that a ${tone} stretch.`;
  if(name==='Bartholomew Roycington III')return `Past Week 3 sit ${a} (${ar}) and ${b} (${br}); on current standings, the road reads as a ${tone} stretch.`;
  if(name==='Jefferson Filch')return `Weeks 4 and 5 bring ${a} (${ar}) and ${b} (${br}); current standings make that a ${tone} stretch.`;
  return String(text||'');
}

function diversifyRoadAhead(team){
  const article=team?.inquirer_article;if(!article)return team;
  const outlook=(article.sections||[]).find(s=>String(s?.kind||'')==='outlook');
  if(!outlook||!Array.isArray(outlook.paragraphs))return team;
  outlook.paragraphs=outlook.paragraphs.map(p=>rewriteRoadSentence(p,article));
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r59';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR58(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(diversifyRoadAhead);
  out.structure_revision='week2-r59';
  if(out.league_overview)out.league_overview.structure_revision='week2-r59';
  return out;
}

export const applyWeek2EditorialR59=applyWeek2EditorialR16;
export const applyWeek2EditorialR58=applyWeek2EditorialR16;
export const applyWeek2EditorialR57=applyWeek2EditorialR16;
export const applyWeek2EditorialR56=applyWeek2EditorialR16;
export const applyWeek2EditorialR55=applyWeek2EditorialR16;
export const applyWeek2EditorialR54=applyWeek2EditorialR16;
export const applyWeek2EditorialR53=applyWeek2EditorialR16;
export const applyWeek2EditorialR52=applyWeek2EditorialR16;
export const applyWeek2EditorialR51=applyWeek2EditorialR16;
export const applyWeek2EditorialR50=applyWeek2EditorialR16;
export const applyWeek2EditorialR49=applyWeek2EditorialR16;
export const applyWeek2EditorialR48=applyWeek2EditorialR16;
export const applyWeek2EditorialR47=applyWeek2EditorialR16;
export const applyWeek2EditorialR46=applyWeek2EditorialR16;
export const applyWeek2EditorialR45=applyWeek2EditorialR16;
export const applyWeek2EditorialR44=applyWeek2EditorialR16;
export const applyWeek2EditorialR43=applyWeek2EditorialR16;
export const applyWeek2EditorialR42=applyWeek2EditorialR16;
export const applyWeek2EditorialR41=applyWeek2EditorialR16;
export const applyWeek2EditorialR40=applyWeek2EditorialR16;
export const applyWeek2EditorialR39=applyWeek2EditorialR16;
export const applyWeek2EditorialR38=applyWeek2EditorialR16;
export const applyWeek2EditorialR37=applyWeek2EditorialR16;
export const applyWeek2EditorialR36=applyWeek2EditorialR16;
export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
