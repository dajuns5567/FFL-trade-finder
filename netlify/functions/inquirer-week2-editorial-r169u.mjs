import {applyWeek2EditorialR16 as applyR169T} from './inquirer-week2-editorial-r169t.mjs';

const HISTORICAL=/\baveraged\s+\d+(?:\.\d+)?\s+fantasy points per game in 2025\b/i;

function depthRead(team,article,index){
  const starters=(team?.starter_details||[]).filter(x=>x?.name),p=starters[index%Math.max(1,starters.length)]||starters[0]||{},name=String(p?.name||'the next starter'),next=String(team?.next_opponent_name||team?.upcoming_opponents?.[0]?.team_name||'the Week 3 opponent'),who=String(article?.reporter?.name||'Nick Swindell'),shape=index%3;
  if(who==='Tilly Fleecer'){
    if(shape===0)return `${name} gets another look against ${next}. If ${name}'s Week 2 role survives, lovely; if it vanishes, everyone who planned that particular parade after one Sunday may return the confetti.`;
    if(shape===1)return `Against ${next}, ${name} has to show the Week 2 opportunity was more than a one-Sunday rental. Otherwise the celebration was less victory parade and more very expensive rehearsal.`;
    return `The Week 3 test belongs to ${name} against ${next}: keep the useful role and the optimism gets to live; lose it immediately and the confetti people can start sweeping.`;
  }
  if(who==='Bartholomew Roycington III'){
    if(shape===0)return `${name} now carries the Week 2 role into ${next}. Repeating ${name}'s useful part would be splendid; discovering it was rented for one afternoon would be considerably less distinguished.`;
    if(shape===1)return `Against ${next}, ${name} must demonstrate that Week 2 was substance rather than decorative flourish. One prefers production that survives travel.`;
    return `The matter for ${name} against ${next} is pleasantly simple: preserve the Week 2 opportunity, or admit the previous performance was dressed better than it traveled.`;
  }
  if(who==='Jefferson Filch'){
    if(shape===0)return `${name} takes the Week 2 role into ${next}. The useful question is whether ${name}'s opportunity survives contact with a new matchup; if it does not, the one-week conclusion gets dismissed for lack of evidence.`;
    if(shape===1)return `Against ${next}, ${name}'s Week 2 opportunity goes back under examination. Repeat it and the case gets stronger; lose it and the dramatic conclusions get thrown out.`;
    return `${name} faces ${next} with one useful burden: prove the Week 2 role was real enough to repeat. A disappearing act would leave the optimistic case embarrassingly thin.`;
  }
  if(shape===0)return `${name} takes the Week 2 role into ${next}. Keep ${name}'s opportunity and the result has teeth; lose it immediately and Week 2 becomes a nice story with lousy follow-through.`;
  if(shape===1)return `Against ${next}, ${name} needs the Week 2 opportunity to show up again. Production without a repeatable role is how fantasy managers end up lying to themselves on Tuesday.`;
  return `The Week 3 check for ${name} comes against ${next}. If the role holds, keep buying the result; if it disappears, stop pretending one good Sunday settled anything.`;
}

function foldHistorical(paragraphs){
  const folded=[];
  let pending=[];
  for(const paragraph of paragraphs||[]){
    const text=String(paragraph||'').trim();
    if(!text)continue;
    if(HISTORICAL.test(text)){
      pending.push(text);
      continue;
    }
    folded.push(pending.length?`${text} ${pending.join(' ')}`:text);
    pending=[];
  }
  if(pending.length&&folded.length)folded[folded.length-1]=`${folded[folded.length-1]} ${pending.join(' ')}`;
  return folded;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169T(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
    if(players&&Array.isArray(players.paragraphs)){
      const paras=foldHistorical(players.paragraphs);
      while(paras.length<6)paras.push(depthRead(team,article,paras.length));
      players.paragraphs=paras;
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169U=applyWeek2EditorialR16;
