import {applyWeek2EditorialR16 as applyR169U} from './inquirer-week2-editorial-r169u.mjs';

const RECEIVING_FAMILY=/\b([A-Z][A-Za-z'’.-]+)(?:'s)?\s+(?:takes that\s+)?target and receiving volume\b[^.]*\./g;
const escapeRe=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function receivingVariation(rawLast,opponent,count,sentence){
  const last=String(rawLast||'').replace(/['’]s$/i,'');
  if(count===0)return sentence;
  if(count===1)return `${last}'s receiving workload gets one useful Week 3 test against ${opponent}: repeat the volume and the role deserves more trust; lose it and one loud Sunday starts looking like a cameo.`;
  return '';
}

function diversifyRepeatedReceivingRead(article,team){
  const seen=new Map(),opponent=String(team?.next_opponent_name||team?.upcoming_opponents?.[0]?.team_name||'the Week 3 opponent');
  for(const section of article?.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>String(paragraph||'').replace(RECEIVING_FAMILY,(sentence,rawLast)=>{
      const last=String(rawLast||'').replace(/['’]s$/i,''),key=last.toLowerCase(),count=seen.get(key)||0;
      seen.set(key,count+1);
      return receivingVariation(rawLast,opponent,count,sentence);
    }).replace(/\s{2,}/g,' ').trim()).filter(Boolean);
  }
}

function pluralTeamGrammar(text,team){
  const full=String(team?.team_name||'').trim(),short=full.split(/\s+/).filter(Boolean).at(-1)||'';
  if(!full||!short||!/s$/i.test(short))return String(text||'');
  const re=new RegExp(`(^|[.!?]\\s+)(${escapeRe(full)}|${escapeRe(short)})\\s+(has|is|gets|holds|brings|turns)\\b`,'gi');
  const verbs={has:'have',is:'are',gets:'get',holds:'hold',brings:'bring',turns:'turn'};
  return String(text||'').replace(re,(_all,prefix,name,verb)=>`${prefix}${name} ${verbs[String(verb).toLowerCase()]||verb}`);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169U(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    diversifyRepeatedReceivingRead(article,team);
    for(const section of article.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(paragraph=>pluralTeamGrammar(paragraph,team));
    }
    article.paragraphs=article.sections.flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169V=applyWeek2EditorialR16;
