import {applyWeek2EditorialR16 as applyR169O} from './inquirer-week2-editorial-r169o.mjs';

const playerSpecific=(text,name)=>String(text||'')
  .replaceAll('That is how a hot week becomes a role worth taking seriously.',`${name} made that hot week look like a role worth taking seriously.`)
  .replaceAll('One game does not rewrite a career, but it can make the old expectations look suspiciously conservative.',`${name}'s one game does not rewrite a career, but it does make the old expectations look suspiciously conservative.`)
  .replaceAll('That is a bad Sunday from a proven player, not permission to invent a crisis because patience is apparently illegal after Week 2.',`${name}'s bad Sunday is not permission to invent a crisis because patience is apparently illegal after Week 2.`)
  .replaceAll('The role gets another look, but the production has to stop asking for charitable interpretation.',`${name}'s role gets another look, but the production has to stop asking for charitable interpretation.`)
  .replaceAll('Projections are not commandments, but beating one that badly is the statistical equivalent of returning the menu and ordering something much more expensive.',`${name} turned the projection into the statistical equivalent of returning the menu and ordering something much more expensive.`)
  .replaceAll('That is not a rounding error; that is the sort of hole the rest of a lineup notices immediately.',`${name}'s miss was not a rounding error; it was the sort of hole the rest of a lineup notices immediately.`);

export function applyWeek2EditorialR16(raw){
  const out=applyR169O(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    for(const section of article.sections||[]){
      if(!Array.isArray(section?.paragraphs))continue;
      section.paragraphs=section.paragraphs.map(paragraph=>{
        const text=String(paragraph||'');
        const player=(team.starter_details||[]).find(p=>String(p?.name||'')&&text.includes(String(p.name)));
        return playerSpecific(text,String(player?.name||'That player'));
      });
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169P=applyWeek2EditorialR16;
