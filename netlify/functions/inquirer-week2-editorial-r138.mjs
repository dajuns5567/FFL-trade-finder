import {applyWeek2EditorialR16 as applyR137} from './inquirer-week2-editorial-r137.mjs';

const fullName=team=>String(team?.name||team?.team_name||team?.mida_outlook?.name||'this team').trim();
const mascot=name=>String(name||'team').trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function shortenFollowups(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return team;
  const full=fullName(team),short=mascot(full);
  const re=new RegExp(`\\bFor ${esc(full)},`,'g');
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').replace(re,`For ${short},`));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r138';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR137(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(shortenFollowups);
  if(out.league_overview)out.league_overview.structure_revision='week2-r138';
  out.structure_revision='week2-r138';
  return out;
}

export const applyWeek2EditorialR138=applyWeek2EditorialR16;
export const applyWeek2EditorialR137=applyWeek2EditorialR16;
export const applyWeek2EditorialR136=applyWeek2EditorialR16;
export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
