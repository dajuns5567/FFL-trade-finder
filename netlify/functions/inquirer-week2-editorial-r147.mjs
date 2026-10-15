import {applyWeek2EditorialR16 as applyR146} from './inquirer-week2-editorial-r146.mjs';

const teamName=t=>String(t?.team_name||t?.name||t?.mida_outlook?.name||'this team');
const mascot=n=>String(n||'team').trim().split(/\s+/).filter(Boolean).at(-1)||'team';

function replaceAfterFirst(text,full,short){
  let seen=false;
  let out=String(text||'').replaceAll(full,()=>{
    if(!seen){seen=true;return full;}
    return short;
  });
  if(/s$/i.test(short))out=out.split(`${short}'s`).join(`${short}'`);
  return out;
}

function naturalTeamRefs(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const full=teamName(team),short=mascot(full);
  if(full&&short&&full!==short){
    for(const section of article.sections){
      if(!Array.isArray(section?.paragraphs))continue;
      section.paragraphs=section.paragraphs.map(p=>replaceAfterFirst(p,full,short));
    }
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r147';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR146(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(naturalTeamRefs);
  if(out.league_overview)out.league_overview.structure_revision='week2-r147';
  out.structure_revision='week2-r147';
  return out;
}

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
