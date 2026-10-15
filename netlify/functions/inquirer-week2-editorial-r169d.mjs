import {applyWeek2EditorialR16 as applyR169C} from './inquirer-week2-editorial-r169c.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const wordCount=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentenceParts=text=>clean(text).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);

function dedupeArticle(article){
  if(!article||!Array.isArray(article.sections))return;
  const seen=new Set();
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(raw=>{
      const kept=[];
      for(const sentence of sentenceParts(raw)){
        const key=sentence.toLowerCase();
        if(wordCount(sentence)>=8&&seen.has(key))continue;
        if(wordCount(sentence)>=8)seen.add(key);
        kept.push(sentence);
      }
      return clean(kept.join(' '));
    }).filter(Boolean);
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169C(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[])dedupeArticle(team?.inquirer_article);
  return out;
}

export const applyWeek2EditorialR169D=applyWeek2EditorialR16;
