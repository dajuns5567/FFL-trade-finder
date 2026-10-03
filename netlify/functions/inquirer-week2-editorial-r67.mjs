import {applyWeek2EditorialR16 as applyR66} from './inquirer-week2-editorial-r66.mjs';

const n=v=>Number(v);
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');
const section=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const rec=t=>`${Number(t?.league_context?.record?.wins)||0}-${Number(t?.league_context?.record?.losses)||0}`;

function coolNames(team){
  const starters=[...(team.starter_details||[])].filter(p=>p?.name&&Number.isFinite(n(p?.points))).sort((a,b)=>n(b.points)-n(a.points));
  const eligible=starters.filter(p=>{
    const pts=n(p.points),proj=n(p.projected),prior=n(p.prior_season_avg);
    return pts>=15||(Number.isFinite(proj)&&pts-proj>=4)||(prior>0&&pts>=prior*1.2);
  }).slice(0,2);
  const picks=eligible.length?eligible:starters.slice(0,2);
  return picks.map(p=>p.name).filter(Boolean);
}

function cleanTeam(team){
  const a=team?.inquirer_article;if(!a)return team;
  const s=short(team.team_name),voice=String(a?.reporter?.name||''),won=n(team.points)>n(team.opponent_points);

  const value=section(a,'value');
  if(value?.paragraphs?.length){
    value.paragraphs=value.paragraphs.map(p=>String(p||'')
      .replace('The number is worth noting; Sunday still decides whether it was useful.',`For ${s}, the number is worth noting; Sunday still decides whether the movement was useful.`)
      .replace('Now make the football justify the price tag.',`Now ${s} has to make the football justify the price tag.`)
      .replace('Markets may swoon; lineups still have to perform in public.',`${s} can let the market swoon; the lineup still has to perform in public.`)
      .replace('I will record the movement and reserve the celebration until it survives Sunday.',`For ${s}, the movement is recorded; celebration can wait until the value survives Sunday.`));
  }

  const sentiment=section(a,'sentiment');
  if(sentiment?.paragraphs?.length){
    const lines={
      'Nick Swindell':won?`${s} fans can enjoy ${rec(team)} without pretending every question disappeared; this win buys patience, not immunity from Week 3 criticism.`:`${s} fans have a legitimate complaint after the loss, and the useful version of that frustration points at what can actually change before Week 3.`,
      'Tilly Fleecer':won?`${s} supporters are allowed to be loud after a win, and they are also allowed to notice the parts that would become unbearable if Week 3 flips the result.`:`${s} fans are annoyed, correctly; a bad Sunday becomes easier to forgive when Week 3 fixes the football instead of selling the loss as character building.`,
      'Bartholomew Roycington III':won?`${s} supporters may savor ${rec(team)}; moderation remains available in theory and will almost certainly be ignored until Week 3.`:`${s} supporters are not staging a tragedy; they are asking the next Sunday to look less foolish, which is unusually reasonable by our standards.`,
      'Jefferson Filch':won?`${s} supporters have the pleasant problem of arguing about flaws after a win; Week 3 gets to decide which complaints were useful.`:`${s} supporters saw the same weak spots everyone else did; if Week 3 repeats them, frustration becomes pressure with a much cleaner case.`
    };
    sentiment.paragraphs[0]=lines[voice]||lines['Nick Swindell'];
  }

  const cool=section(a,'cool-throne');
  if(cool?.paragraphs?.length){
    const names=coolNames(team),joined=names.length>1?`${names[0]} and ${names[1]}`:(names[0]||'the best Week 2 performers');
    const lines={
      'Nick Swindell':`For ${s}, ${joined} earned the Week 2 praise; Week 3 can decide whether the production becomes a trend.`,
      'Tilly Fleecer':`${s} gets to celebrate ${joined} this week; enjoy the good football now, because this league is always one Sunday away from new material.`,
      'Bartholomew Roycington III':`${s} may direct the civilized applause toward ${joined}; strong Week 2 production deserves recognition without a second ceremony.`,
      'Jefferson Filch':`For ${s}, ${joined} survived inspection and earned the positive note; Week 3 keeps the follow-up questions open.`
    };
    cool.paragraphs[0]=lines[voice]||lines['Nick Swindell'];
  }

  const management=section(a,'management');
  if(management?.paragraphs){
    management.paragraphs=management.paragraphs.map(p=>String(p||'').replace('That is the actionable Week 2 lineup decision; it does not need three different paragraphs pretending to discover it.',`For ${s}, that is the actionable Week 2 lineup decision; one clear correction is more useful than repeating the same mistake in different words.`));
  }

  const hot=section(a,'hot-seat');
  if(hot?.paragraphs){
    const who=team?.worst_starter?.name||s;
    hot.paragraphs=hot.paragraphs.map(p=>String(p||'').replace('The production is the issue; the player does not need a new identity after one Sunday.',`${who}'s production is the issue; one Sunday does not require a new identity for the player.`));
  }

  const outlook=section(a,'outlook');
  if(outlook?.paragraphs){
    outlook.paragraphs=outlook.paragraphs.map(p=>String(p||'')
      .replace('Week 3 can separate that tie without pretending September standings are permanent.',`${s} can use Week 3 to separate that tie without pretending September standings are permanent.`)
      .replace('The schedule can be judged when those games arrive; no invented difficulty label is needed.',`${s} can judge that schedule when those games arrive; no invented difficulty label is needed now.`));
  }

  a.paragraphs=(a.sections||[]).flatMap(x=>x?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r67';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR66(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(cleanTeam);
  out.structure_revision='week2-r67';
  if(out.league_overview)out.league_overview.structure_revision='week2-r67';
  return out;
}
export const applyWeek2EditorialR67=applyWeek2EditorialR16;
export const applyWeek2EditorialR66=applyWeek2EditorialR16;
export const applyWeek2EditorialR65=applyWeek2EditorialR16;
export const applyWeek2EditorialR64=applyWeek2EditorialR16;
export const applyWeek2EditorialR63=applyWeek2EditorialR16;
export const applyWeek2EditorialR62=applyWeek2EditorialR16;
export const applyWeek2EditorialR61=applyWeek2EditorialR16;
export const applyWeek2EditorialR60=applyWeek2EditorialR16;
export const applyWeek2EditorialR59=applyWeek2EditorialR16;
export const applyWeek2EditorialR58=applyWeek2EditorialR16;
export const applyWeek2EditorialR57=applyWeek2EditorialR16;
export const applyWeek2EditorialR56=applyWeek2EditorialR16;
export const applyWeek2EditorialR55=applyWeek2EditorialR16;
export const applyWeek2EditorialR54=applyWeek2EditorialR16;
export const applyWeek2EditorialR53=applyWeek2EditorialR16;
export const applyWeek2EditorialR52=applyWeek2EditorialR16;
export const applyWeek2EditorialR51=applyWeek2EditorialR16;
export const applyWeek2EditorialR50=applyWeek2EditorialR16;
export const applyWeek2EditorialR49=applyWeek2EditorialR16;
export const applyWeek2EditorialR48=applyWeek2EditorialR16;
export const applyWeek2EditorialR47=applyWeek2EditorialR16;
export const applyWeek2EditorialR46=applyWeek2EditorialR16;
export const applyWeek2EditorialR45=applyWeek2EditorialR16;
export const applyWeek2EditorialR44=applyWeek2EditorialR16;
export const applyWeek2EditorialR43=applyWeek2EditorialR16;
export const applyWeek2EditorialR42=applyWeek2EditorialR16;
export const applyWeek2EditorialR41=applyWeek2EditorialR16;
export const applyWeek2EditorialR40=applyWeek2EditorialR16;
export const applyWeek2EditorialR39=applyWeek2EditorialR16;
export const applyWeek2EditorialR38=applyWeek2EditorialR16;
export const applyWeek2EditorialR37=applyWeek2EditorialR16;
export const applyWeek2EditorialR36=applyWeek2EditorialR16;
export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
