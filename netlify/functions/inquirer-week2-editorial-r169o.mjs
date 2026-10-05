import {applyWeek2EditorialR16 as applyR169N} from './inquirer-week2-editorial-r169n.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

export function applyWeek2EditorialR16(raw){
  const out=applyR169N(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article,full=String(team?.team_name||'').trim();
    const alias=full.split(/\s+/).filter(Boolean).at(-1)||full;
    if(!article||!full||!alias||alias===full)continue;
    const fullRe=new RegExp(esc(full),'g');
    let kept=0;
    for(const section of article.sections||[]){
      if(!Array.isArray(section?.paragraphs))continue;
      section.paragraphs=section.paragraphs.map(paragraph=>String(paragraph||'').replace(fullRe,match=>{
        kept++;
        return kept<=6?match:alias;
      }));
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169O=applyWeek2EditorialR16;
