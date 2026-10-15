import {applyWeek2EditorialR16 as applyR59} from './inquirer-week2-editorial-r59.mjs';

function restoreWeek3Relevance(team){
  const article=team?.inquirer_article;if(!article)return team;
  const name=String(article?.reporter?.name||'').trim();
  const outlook=(article.sections||[]).find(s=>String(s?.kind||'')==='outlook');
  if(!outlook||!Array.isArray(outlook.paragraphs))return team;
  outlook.paragraphs=outlook.paragraphs.map(p=>{
    let text=String(p||'');
    if(/\bWeek 3\b/i.test(text))return text;
    if(name==='Tilly Fleecer'&&/^Then come\b/i.test(text))return text.replace(/^Then come\b/i,'Handle Week 3 first; then come');
    if(name==='Jefferson Filch'&&/^Weeks 4 and 5 bring\b/i.test(text))return text.replace(/^Weeks 4 and 5 bring\b/i,'Week 3 sets the table; Weeks 4 and 5 bring');
    return text;
  });
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r60';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR59(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(restoreWeek3Relevance);
  out.structure_revision='week2-r60';
  if(out.league_overview)out.league_overview.structure_revision='week2-r60';
  return out;
}

export const applyWeek2EditorialR60=applyWeek2EditorialR16;
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
