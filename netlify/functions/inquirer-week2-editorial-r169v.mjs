import {applyWeek2EditorialR16 as applyR169U} from './inquirer-week2-editorial-r169u.mjs';

const TARGET_RE=/\b([A-Z][A-Za-z'’.-]+) takes that target and receiving volume into Week 3 against ([^.]+)\./g;

function diversifyRepeatedReceivingRead(article){
  const seen=new Set();
  for(const section of article?.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>String(paragraph||'').replace(TARGET_RE,(sentence,last,opponent)=>{
      const key=sentence.toLowerCase();
      if(!seen.has(key)){
        seen.add(key);
        return sentence;
      }
      return `${last}'s receiving workload gets another Week 3 test against ${opponent}; if that volume holds, the role deserves more trust than one loud Sunday.`;
    }));
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
