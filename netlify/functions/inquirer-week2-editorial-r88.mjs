import {applyWeek2EditorialR16 as applyR87} from './inquirer-week2-editorial-r87.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');
const top3=t=>[...(t?.starter_details||[])].filter(p=>p?.name&&finite(p?.points)).sort((a,b)=>n(b.points)-n(a.points)).slice(0,3);

function concentrationLine(team){
  const s=short(team?.team_name),actual=n(team?.points),sum=top3(team).reduce((acc,p)=>acc+n(p.points),0),share=actual?sum/actual:0;
  if(share>=0.65)return `${s} leaned heavily on those three, so Week 3 needs more help from the rest of the lineup.`;
  if(share<=0.45)return `${s} spread enough scoring beyond those three that the Week 2 result was not top-heavy.`;
  return `${s} got a healthy share from that trio without asking them to account for nearly the entire score.`;
}

function clean(team,text){
  const s=short(team?.team_name);
  return String(text||'')
    .replace('That matters because it tells us whether the result merely matched expectation or changed what Week 3 should reasonably demand from the lineup.',`${s}'s projection gap is useful only because it changes what Week 3 should reasonably demand from the lineup.`)
    .replace('That concentration is useful context: if the share is high, the rest of the lineup needs more help; if it is modest, the scoring was spread more naturally.',concentrationLine(team))
    .replace('That usage matters more for Week 3 than squeezing another conclusion out of the same fantasy totals.',`${s} should watch whether those snap shares hold in Week 3 before drawing anything more from the fantasy totals.`)
    .replace('Those secondary moves matter because the roster market was not defined by one player alone, but they still belong in a different bucket from the Week 2 football result.',`${s}'s secondary market moves belong in the roster-value discussion; they do not explain the Week 2 score by themselves.`)
    .replace('That matters here because it shows what the lineup received beyond its four leading scorers and helps separate a top-heavy result from a more balanced one.',`${s}'s fifth starter helps show whether useful scoring depth existed beyond the four leaders.`)
    .replace('The file does not contain a clear management error here, so I am not going to manufacture one.','There is no clear management error here, so I am not going to manufacture one.')
    .replace(/I would track ([A-Z][A-Za-z'.-]+)'s role in Week 3 before expanding the case beyond one result\./g,"I would track $1's role in Week 3 before drawing a bigger conclusion from one result.")
    .replace('The useful part of the file is that ','The useful point is that ')
    .replace('I would rather follow that role than invent a second case from the same result.','I would rather follow that role than force another conclusion from the same result.');
}

function refine(team){
  const a=team?.inquirer_article;if(!a)return team;
  for(const section of a.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>clean(team,p));
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r88';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR87(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r88';
  if(out.league_overview)out.league_overview.structure_revision='week2-r88';
  return out;
}
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
