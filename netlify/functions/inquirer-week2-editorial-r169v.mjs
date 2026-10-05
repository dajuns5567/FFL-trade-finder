import {applyWeek2EditorialR16 as applyR169U} from './inquirer-week2-editorial-r169u.mjs';

const RECEIVING_FAMILY=/\b([A-Z][A-Za-z'’.-]+)(?:'s)?\s+(?:takes that\s+)?target and receiving volume\b[^.]*\./g;

function receivingVariation(last,opponent,count,sentence){
  if(count===0)return sentence;
  if(count===1)return `${last}'s receiving workload gets another Week 3 test against ${opponent}; if that volume holds, the role deserves more trust than one loud Sunday.`;
  if(count===2)return `Against ${opponent}, ${last} needs the same receiving opportunity to survive again; otherwise the Week 2 usage starts looking more like a cameo than a trend.`;
  if(count===3)return `${last} can settle the receiving-role argument against ${opponent}: repeat the targets and the optimism has evidence, lose them and the one-week spike gets a lot less impressive.`;
  return `${last}'s Week 3 assignment against ${opponent} is simple: make the receiving workload repeat before anyone treats one Sunday like permanent job security.`;
}

function diversifyRepeatedReceivingRead(article,team){
  const seen=new Map(),opponent=String(team?.next_opponent_name||team?.upcoming_opponents?.[0]?.team_name||'the Week 3 opponent');
  for(const section of article?.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>String(paragraph||'').replace(RECEIVING_FAMILY,(sentence,last)=>{
      const key=String(last).toLowerCase(),count=seen.get(key)||0;
      seen.set(key,count+1);
      return receivingVariation(last,opponent,count,sentence);
    }));
  }
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169U(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    diversifyRepeatedReceivingRead(article,team);
    article.paragraphs=article.sections.flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169V=applyWeek2EditorialR16;
