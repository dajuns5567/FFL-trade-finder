import {applyWeek2EditorialR16 as applyR169L} from './inquirer-week2-editorial-r169l.mjs';

function closingLine(team,article){
  const top=(team?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0];
  const name=String(top?.name||'the leading scorer'),next=String(team?.next_opponent_name||'the Week 3 opponent'),who=String(article?.reporter?.name||'Nick Swindell');
  if(who==='Tilly Fleecer')return `${name} gave ${team.team_name} the loudest Week 2 reason to believe. ${next} gets the next chance to ruin the mood, because fantasy football considers sustained happiness a design flaw.`;
  if(who==='Bartholomew Roycington III')return `${name} supplied ${team.team_name}'s strongest Week 2 argument for optimism. ${next} now receives the uncouth privilege of testing whether that performance belongs in the estate or merely visited for the weekend.`;
  if(who==='Jefferson Filch')return `${name} gave ${team.team_name} the clearest Week 2 reason for optimism. ${next} gets first crack at determining whether that production was a trend beginning or a very persuasive one-week witness.`;
  return `${name} gave ${team.team_name} the clearest Week 2 reason to feel better. ${next} gets the next shot at proving whether that performance travels or was just one very productive Sunday.`;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169L(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    const lede=(article?.sections||[]).find(s=>String(s?.kind||'')==='lede');
    if(!article||!lede||!Array.isArray(lede.paragraphs))continue;
    lede.paragraphs.push(closingLine(team,article));
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169M=applyWeek2EditorialR16;
