import {applyWeek2EditorialR16 as applyR163} from './inquirer-week2-editorial-r163.mjs';

const escapeRe=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const shortRef=name=>String(name||'team').trim().split(/\s+/).filter(Boolean).at(-1)||'team';

function naturalizeMidaTeamRefs(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const name=String(team?.team_name||team?.name||'').trim();if(!name)return team;
  const re=new RegExp(escapeRe(name),'g');
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>{
      let text=String(p||'');
      if(!/\bMIDA\b/i.test(text))return text;
      let seen=false;
      return text.replace(re,()=>{if(!seen){seen=true;return name;}return shortRef(name);});
    });
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r164';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR163(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(naturalizeMidaTeamRefs);
  if(out.league_overview)out.league_overview.structure_revision='week2-r164';
  out.structure_revision='week2-r164';
  return out;
}

export const applyWeek2EditorialR164=applyWeek2EditorialR16;
