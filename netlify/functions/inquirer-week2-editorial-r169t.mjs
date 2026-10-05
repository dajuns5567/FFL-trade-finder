import {applyWeek2EditorialR16 as applyR169S} from './inquirer-week2-editorial-r169s.mjs';

function scheduleRoad(team,article){
  const up=(team?.upcoming_opponents||[]).slice().sort((a,b)=>Number(a.week)-Number(b.week)),later=up.slice(1,3);
  if(!later.length)return null;
  const ranks=later.map(x=>Number(x?.context?.standings_rank)).filter(Number.isFinite),strong=ranks.filter(x=>x<=8).length,soft=ranks.filter(x=>x>=24).length;
  const difficulty=strong===ranks.length&&ranks.length?'a hard stretch':soft===ranks.length&&ranks.length?'a friendlier stretch':strong&&soft?'a mixed stretch':'an uneven difficulty level';
  const named=later.map(x=>`${x.team_name} (${Number(x?.context?.record?.wins)||0}-${Number(x?.context?.record?.losses)||0})`).join(' and '),who=String(article?.reporter?.name||'Nick Swindell');
  if(who==='Tilly Fleecer')return `After Week 3 come ${named}, which currently reads as ${difficulty}. That makes the Week 3 result worth banking now; wasting the immediate chance and then asking the schedule for emotional support would be very on-brand and very stupid.`;
  if(who==='Bartholomew Roycington III')return `Beyond Week 3 sit ${named}, a run that currently carries ${difficulty}. A Week 3 win therefore has practical value before that stretch arrives; optimism is delightful, but points in the standings remain the less decorative currency.`;
  if(who==='Jefferson Filch')return `Past Week 3 are ${named}, and the current standings make that ${difficulty}. Bank the Week 3 result first, because a favorable-looking future is not an alibi for mishandling the game directly in front of you.`;
  return `After Week 3 come ${named}, a stretch that currently looks like ${difficulty}. Bank the Week 3 win if it is there; the schedule behind it may change, but giving away the immediate result never becomes smarter in hindsight.`;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169S(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article,outlook=(article?.sections||[]).find(s=>String(s?.kind||'')==='outlook');
    if(!article||!outlook||!Array.isArray(outlook.paragraphs)||outlook.paragraphs[0]==='n/a')continue;
    const road=scheduleRoad(team,article);if(!road)continue;
    const existing=outlook.paragraphs.filter(p=>!/(?:After|Beyond|Past) Week 3|After Week 3 come/i.test(String(p||'')));
    const projectionIndex=Math.max(0,existing.length-1);
    existing.splice(projectionIndex,0,road);
    outlook.paragraphs=existing;
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169T=applyWeek2EditorialR16;
