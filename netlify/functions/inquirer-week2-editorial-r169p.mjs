import {applyWeek2EditorialR16 as applyR169O} from './inquirer-week2-editorial-r169o.mjs';

export function applyWeek2EditorialR16(raw){
  const out=applyR169O(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    for(const section of article.sections||[]){
      if(!Array.isArray(section?.paragraphs))continue;
      section.paragraphs=section.paragraphs.map(paragraph=>{
        let text=String(paragraph||'');
        if(!text.includes('That is how a hot week becomes a role worth taking seriously.'))return text;
        const player=(team.starter_details||[]).find(p=>String(p?.name||'')&&text.includes(String(p.name)));
        const name=String(player?.name||'That player');
        return text.replaceAll('That is how a hot week becomes a role worth taking seriously.',`${name} made that hot week look like a role worth taking seriously.`);
      });
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169P=applyWeek2EditorialR16;
