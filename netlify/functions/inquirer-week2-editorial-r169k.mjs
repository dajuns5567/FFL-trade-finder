import {applyWeek2EditorialR16 as applyR169J} from './inquirer-week2-editorial-r169j.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function contextualLine(article,next,division,record){
  const who=String(article?.reporter?.name||'Nick Swindell');
  if(who==='Tilly Fleecer')return `Week 3 brings ${next} in at ${record} from the ${division}; lovely, now somebody has to turn that context into a Sunday worth enjoying.`;
  if(who==='Bartholomew Roycington III')return `Week 3 brings ${next} in at ${record} from the ${division}; useful context, certainly, though one would still prefer the lineup to provide the proof.`;
  if(who==='Jefferson Filch')return `Week 3 brings ${next} in at ${record} from the ${division}; that is context rather than a verdict, and the matchup gets to test the assumptions around it.`;
  return `Week 3 brings ${next} in at ${record} from the ${division}; the record matters, but the lineup still has to prove what it can do with the matchup.`;
}

function rewriteOpponentContext(team){
  const article=team?.inquirer_article,outlook=(article?.sections||[]).find(s=>String(s?.kind||'')==='outlook');
  const next=String(team?.next_opponent_name||team?.next_opponent||'').trim(),division=String(team?.next_opponent_division_context?.division_name||'').trim(),rec=team?.next_opponent_context?.record;
  if(!article||!outlook||!Array.isArray(outlook.paragraphs)||!next||!division||!rec)return;
  const record=`${Number(rec?.wins)||0}-${Number(rec?.losses)||0}`;
  const old=new RegExp(`${esc(next)}\\s+enters from the\\s+${esc(division)}\\s+at\\s+${esc(record)}\\.`, 'gi');
  let changed=false;
  outlook.paragraphs=outlook.paragraphs.map(p=>{
    const text=String(p||'');
    if(!old.test(text)){old.lastIndex=0;return text;}
    old.lastIndex=0;changed=true;
    return clean(text.replace(old,contextualLine(article,next,division,record)));
  });
  if(changed)article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169J(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[])rewriteOpponentContext(team);
  return out;
}

export const applyWeek2EditorialR169K=applyWeek2EditorialR16;
