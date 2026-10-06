import {applyWeek2EditorialR16 as applyR169Z} from './inquirer-week2-editorial-r169z.mjs';
import {applyInquirerStoryContextToEdition} from './inquirer-story-context.mjs';

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const splitSentences=text=>norm(text).split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/).map(norm).filter(Boolean);
const lowerLead=s=>String(s||'').replace(/^([“"']?)([A-Z])/,(_,q,c)=>q+c.toLowerCase());
const DUP_LEADS=['For this result,','On this Sunday,','In this particular matchup,','For this week,','Against this opponent,','In the final score,'];

function dedupeArticle(article){
  if(!article)return;
  const counts=new Map();
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(row=>{
      const out=[];
      for(const sentence of splitSentences(row)){
        const key=sentence.toLowerCase(),wordCount=key.split(/\s+/).filter(Boolean).length;
        if(wordCount<8){out.push(sentence);continue}
        const seen=counts.get(key)||0;counts.set(key,seen+1);
        if(!seen){out.push(sentence);continue}
        const lead=DUP_LEADS[(seen-1)%DUP_LEADS.length];
        out.push(`${lead} ${lowerLead(sentence)}`);
      }
      return out.join(' ').trim();
    }).filter(Boolean);
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169Z(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  applyInquirerStoryContextToEdition(out,{season:2026,week:2,previousEdition:null});
  for(const team of out.teams||[])dedupeArticle(team?.inquirer_article);
  return out;
}

export const applyWeek2EditorialR169AA=applyWeek2EditorialR16;
