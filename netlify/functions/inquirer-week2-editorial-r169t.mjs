import {applyWeek2EditorialR16 as applyR169S} from './inquirer-week2-editorial-r169s.mjs';

function scheduleRoad(team,article){
  const up=(team?.upcoming_opponents||[]).slice().sort((a,b)=>Number(a.week)-Number(b.week)),later=up.slice(1,3);
  if(!later.length)return null;
  const ranks=later.map(x=>Number(x?.context?.standings_rank)).filter(Number.isFinite),strong=ranks.filter(x=>x<=8).length,soft=ranks.filter(x=>x>=24).length;
  const difficulty=strong===ranks.length&&ranks.length?'a hard stretch':soft===ranks.length&&ranks.length?'a friendlier stretch':strong&&soft?'a mixed stretch':'an uneven difficulty level';
  const named=later.map(x=>`${x.team_name} (${Number(x?.context?.record?.wins)||0}-${Number(x?.context?.record?.losses)||0})`).join(' and '),who=String(article?.reporter?.name||'Nick Swindell'),club=String(team?.team_name||'this team');
  if(who==='Tilly Fleecer')return `After Week 3 come ${named}, which currently reads as ${difficulty}. For ${club}, that makes the Week 3 result worth banking now; wasting the immediate chance and then asking the schedule for emotional support would be very on-brand and very stupid.`;
  if(who==='Bartholomew Roycington III')return `Beyond Week 3 sit ${named}, a run that currently carries ${difficulty}. ${club} should bank the Week 3 win before that stretch arrives; optimism is delightful, but actual wins remain the currency with the least room for interpretation.`;
  if(who==='Jefferson Filch')return `Past Week 3 are ${named}, and the current standings make that ${difficulty}. ${club} needs to bank the Week 3 result first, because a favorable-looking future is not an alibi for mishandling the game directly in front of you.`;
  return `After Week 3 come ${named}, a stretch that currently looks like ${difficulty}. ${club} should bank the Week 3 win if it is there; the schedule behind it may change, but giving away the immediate result never becomes smarter in hindsight.`;
}

function projectionRead(team,article){
  const own=Number(team?.next_projected),opp=Number(team?.next_opponent_projected);
  if(!Number.isFinite(own)||!Number.isFinite(opp))return null;
  const club=String(team?.team_name||'This team'),alias=club.trim().split(/\s+/).at(-1)||club,next=String(team?.next_opponent_name||team?.upcoming_opponents?.[0]?.team_name||'the next opponent'),who=String(article?.reporter?.name||'Nick Swindell');
  const margin=Math.abs(own-opp),favored=own>opp,even=margin<0.05;
  const verdict=even?`dead even at ${own.toFixed(1)} apiece`:favored?`${club} favored ${own.toFixed(1)} to ${opp.toFixed(1)} over ${next}`:`${next} favored ${opp.toFixed(1)} to ${own.toFixed(1)} over ${club}`;
  if(who==='Tilly Fleecer')return `Week 3 opens with the projection ${verdict}. ${even?`${alias} gets no excuse in advance; inconvenient, I know.`:favored?`That edge gives ${alias} permission to win, not permission to become unbearable before kickoff.`:`A ${margin.toFixed(1)}-point gap is ugly for ${alias}; fortunately, fantasy projections have been publicly humiliated before and will be again.`}`;
  if(who==='Bartholomew Roycington III')return `The Week 3 projection has ${verdict}. ${even?`${alias} receives a perfectly level forecast, which is wonderfully useless; performance will have to do the vulgar work of deciding it.`:favored?`${alias} may accept the edge graciously, then remember that projections do not award victories.`:`The ${margin.toFixed(1)}-point deficit is impolite to ${alias}, but surrendering to a decimal before Sunday would be considerably more embarrassing.`}`;
  if(who==='Jefferson Filch')return `The Week 3 projection has ${verdict}. ${even?`${alias} has no edge and therefore no alibi; somebody has to create the separation on the field.`:favored?`That edge favors ${alias}, and now the burden is simple: make the number look intelligent.`:`That ${margin.toFixed(1)}-point deficit is evidence against ${alias}, not a conviction; the lineup can beat it, but it has to give us a reason instead of an appeal.`}`;
  return `Week 3 has the projection ${verdict}. ${even?`${alias} has nothing to hide behind there.`:favored?`Good; now ${alias} has to play like the favorite instead of admiring the number.`:`A ${margin.toFixed(1)}-point deficit is a warning for ${alias}, not a funeral.`}`;
}

function stripRetiredRoycingtonMotifs(text){
  return String(text||'')
    .replace(/drawing room/gi,'public square')
    .replace(/folding chairs/gi,'excuses')
    .replace(/\bfurniture\b/gi,'nonsense')
    .replace(/\bchairs\b/gi,'excuses')
    .replace(/\bchair\b/gi,'excuse')
    .replace(/\btablecloths?\b/gi,'ceremony')
    .replace(/\blinens?\b/gi,'decorum')
    .replace(/\bnapkins?\b/gi,'formalities')
    .replace(/\bchina\b/gi,'ornament')
    .replace(/\bsilverware\b/gi,'decoration')
    .replace(/\bplace settings?\b/gi,'arrangements')
    .replace(/\bseating\b/gi,'positioning')
    .replace(/\bcenterpieces?\b/gi,'showpieces')
    .replace(/\bdining room\b/gi,'private club')
    .replace(/\bdinner\b/gi,'occasion')
    .replace(/\bplates?\b/gi,'standards')
    .replace(/\breservations?\b/gi,'expectations')
    .replace(/\bguest list\b/gi,'pecking order')
    .replace(/\bvelvet rope\b/gi,'gatekeeping')
    .replace(/\bchaise\b/gi,'pedestal')
    .replace(/\bballroom\b/gi,'grand hall')
    .replace(/\bsalon\b/gi,'club')
    .replace(/\bcoat check\b/gi,'front desk');
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169S(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article,outlook=(article?.sections||[]).find(s=>String(s?.kind||'')==='outlook');
    if(!article)continue;
    if(outlook&&Array.isArray(outlook.paragraphs)&&outlook.paragraphs[0]!=='n/a'){
      const road=scheduleRoad(team,article),projection=projectionRead(team,article);
      let existing=outlook.paragraphs.filter(p=>!/(?:After|Beyond|Past) Week 3|After Week 3 come/i.test(String(p||'')));
      if(projection){
        existing=existing.filter(p=>!/\bprojects?\b|\bprojection\b/i.test(String(p||'')));
        existing.push(projection);
      }
      if(road){
        const projectionIndex=projection?Math.max(0,existing.length-1):existing.length;
        existing.splice(projectionIndex,0,road);
      }
      outlook.paragraphs=existing;
    }
    if(String(article?.reporter?.name||'')==='Bartholomew Roycington III'){
      article.headline=stripRetiredRoycingtonMotifs(article.headline);
      for(const section of article.sections||[]){
        section.heading=stripRetiredRoycingtonMotifs(section.heading);
        if(Array.isArray(section.paragraphs))section.paragraphs=section.paragraphs.map(stripRetiredRoycingtonMotifs);
      }
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169T=applyWeek2EditorialR16;
