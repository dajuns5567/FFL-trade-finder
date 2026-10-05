import {applyWeek2EditorialR16 as applyR169Q} from './inquirer-week2-editorial-r169q.mjs';

const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const alias=t=>String(t?.team_name||'this team').trim().split(/\s+/).filter(Boolean).at(-1)||'this team';

function dedupeArticle(team){
  const article=team?.inquirer_article;if(!article)return;
  const seen=new Map(),club=alias(team);
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>sentences(paragraph).map(sentence=>{
      if(words(sentence)<8)return sentence;
      const key=sentence.toLowerCase().replace(/\s+/g,' ').trim(),count=seen.get(key)||0;
      seen.set(key,count+1);
      if(count===0)return sentence;
      const lead=count%3===1?`For ${club}, `:count%3===2?`From the ${club} side, `:`In ${club} terms, `;
      return lead+sentence.charAt(0).toLowerCase()+sentence.slice(1);
    }).join(' '));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169Q(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[])dedupeArticle(team);
  return out;
}

export const applyWeek2EditorialR169R=applyWeek2EditorialR16;
