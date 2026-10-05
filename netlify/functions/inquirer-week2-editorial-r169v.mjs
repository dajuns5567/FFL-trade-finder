import {applyWeek2EditorialR16 as applyR169U} from './inquirer-week2-editorial-r169u.mjs';

const RECEIVING_PATTERNS=[
  /\b([A-Z][A-Za-z'’.-]+) takes that target and receiving volume into Week 3 against ([^.]+)\./g,
  /\b([A-Z][A-Za-z'’.-]+)'s target and receiving volume when ([^.]+) arrives next\./g
];

function diversifyRepeatedReceivingRead(article){
  const seen=new Map();
  for(const section of article?.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>{
      let out=String(paragraph||'');
      for(const re of RECEIVING_PATTERNS){
        out=out.replace(re,(sentence,last,opponent)=>{
          const key=sentence.toLowerCase(),count=seen.get(key)||0;
          seen.set(key,count+1);
          if(count===0)return sentence;
          if(count===1)return `${last}'s receiving workload gets another Week 3 test against ${opponent}; if that volume holds, the role deserves more trust than one loud Sunday.`;
          return `Against ${opponent}, ${last} needs the same receiving opportunity to survive again; otherwise the Week 2 usage starts looking more like a cameo than a trend.`;
        });
      }
      return out;
    });
  }
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169U(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    diversifyRepeatedReceivingRead(article);
    article.paragraphs=article.sections.flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169V=applyWeek2EditorialR16;
