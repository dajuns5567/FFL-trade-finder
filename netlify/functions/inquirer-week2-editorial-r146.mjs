import {applyWeek2EditorialR16 as applyR145} from './inquirer-week2-editorial-r145.mjs';

const shortName=n=>String(n||'team').replace(/^(New England|New York|Los Angeles|Las Vegas|San Francisco|Kansas City|New Orleans|Tampa Bay)\s+/,'').trim();
const teamName=t=>String(t?.team_name||t?.name||t?.mida_outlook?.name||'this team');

function fixPluralPossessives(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const short=shortName(teamName(team));
  if(!/s$/i.test(short))return team;
  const wrong=`${short}'s`,right=`${short}'`;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').split(wrong).join(right));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r146';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR145(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(fixPluralPossessives);
  if(out.league_overview)out.league_overview.structure_revision='week2-r146';
  out.structure_revision='week2-r146';
  return out;
}

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
