import {applyWeek2EditorialR16 as applyR103} from './inquirer-week2-editorial-r103.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');
const starters=t=>[...(t?.starter_details||[])].filter(p=>p?.name&&finite(p?.points)).sort((a,b)=>n(b.points)-n(a.points));

function coolParagraphs(team){
  const a=team?.inquirer_article||{},s=short(team?.team_name),voice=String(a?.reporter?.name||'Nick Swindell');
  const picks=starters(team).filter(p=>n(p.points)>=12).slice(0,2);
  if(!picks.length)return [`Nobody on ${s} earned a Cool Throne spot from Week 2, so Week 3 can reopen nominations.`];
  const first=picks[0]?.name,second=picks[1]?.name;
  const rows={
    'Nick Swindell':[
      `${first} gets the first Cool Throne nod for ${s}, with Week 3 now responsible for showing whether that strong Sunday can travel.`,
      second?`${second} earns the other ${s} mention, giving this roster two Week 2 performances worth expecting something from again.`:null
    ],
    'Tilly Fleecer':[
      `${first} gets first dibs on the Cool Throne for ${s}, because a good Sunday deserves a compliment without a marching band.`,
      second?`${second} joins the good side for ${s}, which means two players managed to earn praise before somebody made this weird again.`:null
    ],
    'Bartholomew Roycington III':[
      `${first} receives the first Cool Throne seat for ${s}, a civilized reward for a Week 2 performance that actually warranted one.`,
      second?`${second} earns the other ${s} mention, proof that excellence becomes easier to admire when more than one player provides it.`:null
    ],
    'Jefferson Filch':[
      `${first} gets the first Cool Throne spot for ${s}, with Week 3 left to determine whether the performance has staying power.`,
      second?`${second} gives ${s} a second deserving name, which is more useful than forcing another conclusion out of the same star.`:null
    ]
  };
  return (rows[voice]||rows['Nick Swindell']).filter(Boolean);
}

function refine(team){
  const a=team?.inquirer_article;if(!a)return team;
  const cool=(a.sections||[]).find(x=>String(x?.kind||'')==='cool-throne');
  if(cool)cool.paragraphs=coolParagraphs(team);
  a.paragraphs=(a.sections||[]).flatMap(x=>x?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r104';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR103(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r104';
  if(out.league_overview)out.league_overview.structure_revision='week2-r104';
  return out;
}
export const applyWeek2EditorialR104=applyWeek2EditorialR16;
export const applyWeek2EditorialR103=applyWeek2EditorialR16;
export const applyWeek2EditorialR102=applyWeek2EditorialR16;
export const applyWeek2EditorialR101=applyWeek2EditorialR16;
export const applyWeek2EditorialR100=applyWeek2EditorialR16;
export const applyWeek2EditorialR99=applyWeek2EditorialR16;
export const applyWeek2EditorialR98=applyWeek2EditorialR16;
export const applyWeek2EditorialR97=applyWeek2EditorialR16;
export const applyWeek2EditorialR96=applyWeek2EditorialR16;
export const applyWeek2EditorialR95=applyWeek2EditorialR16;
export const applyWeek2EditorialR94=applyWeek2EditorialR16;
export const applyWeek2EditorialR93=applyWeek2EditorialR16;
export const applyWeek2EditorialR92=applyWeek2EditorialR16;
export const applyWeek2EditorialR91=applyWeek2EditorialR16;
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
