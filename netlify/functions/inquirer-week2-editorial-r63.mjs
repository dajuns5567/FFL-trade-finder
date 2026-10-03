import {applyWeek2EditorialR16 as applyR62} from './inquirer-week2-editorial-r62.mjs';

const n=v=>Number(v);
const one=v=>Number.isFinite(n(v))?n(v).toFixed(1).replace(/\.0$/,''):'n/a';
const section=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);

function addDistributionRead(team){
  const a=team?.inquirer_article;if(!a)return team;
  const players=section(a,'players');if(!players||!Array.isArray(players.paragraphs))return team;
  const top=[...(team.starter_details||[])].filter(p=>p?.name&&Number.isFinite(n(p?.points))).sort((x,y)=>n(y.points)-n(x.points)).slice(0,3);
  if(top.length<3)return team;
  const total=top.reduce((s,p)=>s+n(p.points),0),names=top.map(p=>p.name),voice=String(a?.reporter?.name||''),v=Math.abs(Number(team.roster_id)||0)%3;
  const rows={
    'Nick Swindell':[
      `${names[0]}, ${names[1]}, and ${names[2]} combined for ${one(total)} points. That is the part of the Week 2 lineup worth preserving before the next matchup changes the assignment.`,
      `${one(total)} points came from ${names[0]}, ${names[1]}, and ${names[2]}. The useful lesson is distribution: Week 2 had several answers, not one lucky box-score accident.`,
      `The top three Week 2 starters were ${names[0]}, ${names[1]}, and ${names[2]}, totaling ${one(total)} points. Keep that production in view when Week 3 asks for a different kind of win.`
    ],
    'Tilly Fleecer':[
      `${names[0]}, ${names[1]}, and ${names[2]} gave this lineup ${one(total)} points between them. Three useful answers are much nicer than asking one Sunday hero to perform emergency services.`,
      `${one(total)} points from ${names[0]}, ${names[1]}, and ${names[2]} is the kind of distribution that keeps the next loss from becoming an immediate comedy special.`,
      `${names[0]}, ${names[1]}, and ${names[2]} supplied ${one(total)} points. That is enough production from multiple spots to keep us from inventing a one-player miracle story.`
    ],
    'Bartholomew Roycington III':[
      `${names[0]}, ${names[1]}, and ${names[2]} produced ${one(total)} points together. A lineup receiving competent work from several places is less dramatic than a rescue act and considerably more useful.`,
      `Between ${names[0]}, ${names[1]}, and ${names[2]}, the lineup collected ${one(total)} points. Distribution is not glamorous, which is precisely why contenders should treasure it.`,
      `${one(total)} points came from the trio of ${names[0]}, ${names[1]}, and ${names[2]}. That is a healthier shape than demanding one star turn every Sunday into performance art.`
    ],
    'Jefferson Filch':[
      `${names[0]}, ${names[1]}, and ${names[2]} accounted for ${one(total)} points. The important detail is that Week 2 production came from several places, which makes the result harder to dismiss as one isolated spike.`,
      `${one(total)} points from ${names[0]}, ${names[1]}, and ${names[2]} gives the lineup more than one usable lead entering Week 3. That is worth keeping in the file.`,
      `The three highest Week 2 starters were ${names[0]}, ${names[1]}, and ${names[2]}, combining for ${one(total)} points. Multiple productive spots make the next evaluation cleaner and the excuses thinner.`
    ]
  };
  const list=rows[voice]||rows['Nick Swindell'];
  players.paragraphs.push(list[v]);
  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r63';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR62(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(addDistributionRead);
  out.structure_revision='week2-r63';
  if(out.league_overview)out.league_overview.structure_revision='week2-r63';
  return out;
}
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
