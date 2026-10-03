import {applyWeek2EditorialR16 as applyR89} from './inquirer-week2-editorial-r89.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'0';
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');
const record=r=>`${Number(r?.wins)||0}-${Number(r?.losses)||0}${Number(r?.ties)?`-${Number(r.ties)}`:''}`;

function sentimentParagraphs(team){
  const a=team?.inquirer_article||{},fan=a?.fan_sentiment||{},score=finite(fan?.score)?n(fan.score):0;
  const s=short(team?.team_name),won=n(team?.points)>n(team?.opponent_points),rec=record(team?.league_context?.record),voice=String(a?.reporter?.name||'Nick Swindell');
  const signed=score>0?`+${one(score)}`:one(score);
  let first;
  if(score>=30&&won)first=`For ${s}, fan sentiment is ${signed} after a Week 2 win. The confidence makes sense, but Week 3 still has to show that the strongest parts of Sunday can travel.`;
  else if(score>=30)first=`For ${s}, fan sentiment is still ${signed} despite the Week 2 loss. That patience is real, though another loss would make the crowd much less interested in silver linings.`;
  else if(score<=-30&&won)first=`For ${s}, fan sentiment is ${signed} even after a Week 2 win. The result helped, but the crowd clearly wants cleaner football before confidence follows the record.`;
  else if(score<=-30)first=`For ${s}, fan sentiment is ${signed} after the Week 2 loss. The frustration fits the result; Week 3 is the first chance to keep one bad Sunday from becoming the mood of the season.`;
  else if(won)first=`For ${s}, fan sentiment sits near neutral at ${signed} after the Week 2 win. Supporters noticed the good result without deciding every concern disappeared with it.`;
  else first=`For ${s}, fan sentiment sits near neutral at ${signed} after the Week 2 loss. The crowd is irritated without treating two games as a crisis, which is about the right temperature for now.`;

  const middle={
    'Nick Swindell':`At ${rec}, ${s} has earned exactly as much patience as the football supports. I would expect the crowd to change its tone quickly if Week 3 gives it a reason.`,
    'Tilly Fleecer':`At ${rec}, ${s} supporters can be loud without being ridiculous. Give them better football in Week 3 and they will find something happier to yell about.`,
    'Bartholomew Roycington III':`At ${rec}, ${s} supporters are entitled to their current mood without turning September into opera. Week 3 can improve the atmosphere or make the complaints considerably more theatrical.`,
    'Jefferson Filch':`At ${rec}, ${s} has a crowd reacting to what it has actually seen, not to a management theory recycled from another section. Week 3 will either ease that pressure or give it firmer footing.`
  }[voice]||`At ${rec}, ${s} has a crowd reacting to two real results. Week 3 should move that mood more than another explanation of Week 2.`;

  const close=won
    ? `For ${s}, the emotional standard is simple now: keep winning without making supporters ignore the same weak spots every Sunday.`
    : `For ${s}, supporters do not need a speech next week; they need a result that gives them a different reason to talk.`;
  return [first,middle,close];
}

function refine(team){
  const a=team?.inquirer_article;if(!a)return team;
  const sentiment=(a.sections||[]).find(s=>String(s?.kind||'')==='sentiment');
  if(sentiment)sentiment.paragraphs=sentimentParagraphs(team);
  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r90';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR89(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r90';
  if(out.league_overview)out.league_overview.structure_revision='week2-r90';
  return out;
}
export const applyWeek2EditorialR90=applyWeek2EditorialR16;
export const applyWeek2EditorialR89=applyWeek2EditorialR16;
export const applyWeek2EditorialR88=applyWeek2EditorialR16;
export const applyWeek2EditorialR87=applyWeek2EditorialR16;
export const applyWeek2EditorialR86=applyWeek2EditorialR16;
export const applyWeek2EditorialR85=applyWeek2EditorialR16;
export const applyWeek2EditorialR84=applyWeek2EditorialR16;
export const applyWeek2EditorialR83=applyWeek2EditorialR16;
export const applyWeek2EditorialR82=applyWeek2EditorialR16;
export const applyWeek2EditorialR81=applyWeek2EditorialR16;
export const applyWeek2EditorialR80=applyWeek2EditorialR16;
export const applyWeek2EditorialR79=applyWeek2EditorialR16;
export const applyWeek2EditorialR78=applyWeek2EditorialR16;
export const applyWeek2EditorialR77=applyWeek2EditorialR16;
export const applyWeek2EditorialR76=applyWeek2EditorialR16;
export const applyWeek2EditorialR75=applyWeek2EditorialR16;
export const applyWeek2EditorialR74=applyWeek2EditorialR16;
export const applyWeek2EditorialR73=applyWeek2EditorialR16;
export const applyWeek2EditorialR72=applyWeek2EditorialR16;
export const applyWeek2EditorialR71=applyWeek2EditorialR16;
export const applyWeek2EditorialR70=applyWeek2EditorialR16;
export const applyWeek2EditorialR69=applyWeek2EditorialR16;
export const applyWeek2EditorialR68=applyWeek2EditorialR16;
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
