import {applyWeek2EditorialR16 as applyR115} from './inquirer-week2-editorial-r115.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');

function deservingPlayers(team){
  return [...(team?.starter_details||[])].filter(p=>{
    const pts=n(p?.points),prior=n(p?.prior_season_avg),proj=n(p?.projected),delta=finite(proj)?pts-proj:null;
    return finite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(finite(prior)&&prior>0&&pts>=prior*1.2));
  }).sort((a,b)=>n(b?.points)-n(a?.points)).slice(0,2);
}

function coolSentence(team,p,i,other){
  const s=short(team?.team_name),reporter=String(team?.inquirer_article?.reporter?.name||'Nick Swindell');
  const rows={
    'Nick Swindell':[
      `${p.name} gets the first Cool Throne nod for ${s}; Week 2 gave the lineup a performance worth carrying forward.`,
      `${p.name} joins ${other?.name||'the first name'} on ${s}'s Cool Throne after supplying another result that mattered.`
    ],
    'Tilly Fleecer':[
      `${p.name} claims the first Cool Throne spot for ${s}, because good Sundays are allowed to be enjoyed before somebody ruins them.`,
      `${p.name} makes it two deserving names for ${s}; apparently competence can travel in pairs when it feels like showing off.`
    ],
    'Bartholomew Roycington III':[
      `${p.name} receives the first Cool Throne mention for ${s}, a Week 2 performance civilized people may admire without overreacting.`,
      `${p.name} gives ${s} a second worthy Cool Throne name, which makes restraint considerably less fashionable this week.`
    ],
    'Jefferson Filch':[
      `${p.name} gets the first Cool Throne spot for ${s}; the Week 2 performance earned another look without requiring a larger theory.`,
      `${p.name} gives ${s} a second deserving Cool Throne name, and Week 3 can decide how much of that result holds up.`
    ]
  };
  return (rows[reporter]||rows['Nick Swindell'])[i];
}

function refine(team){
  const article=team?.inquirer_article;if(!article)return team;
  const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
  const opp=String(team?.opponent_name||'').trim();
  if(players&&Array.isArray(players.paragraphs)&&opp){
    for(const idx of [0,2]){
      if(!players.paragraphs[idx]||String(players.paragraphs[idx]).includes(opp))continue;
      let text=String(players.paragraphs[idx]);
      if(idx===0)text=`Against ${opp}, ${text}`;
      else if(/\bfollowed with\b/i.test(text))text=text.replace(/\bfollowed with\b/i,`followed against ${opp} with`);
      else text=`Against ${opp}, ${text}`;
      players.paragraphs[idx]=text;
    }
  }

  const cool=(article.sections||[]).find(s=>String(s?.kind||'')==='cool-throne');
  const picks=deservingPlayers(team);
  if(cool&&picks.length>=2){
    cool.paragraphs=[coolSentence(team,picks[0],0,picks[1]),coolSentence(team,picks[1],1,picks[0])];
  }

  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r116';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR115(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r116';
  if(out.league_overview)out.league_overview.structure_revision='week2-r116';
  return out;
}
export const applyWeek2EditorialR116=applyWeek2EditorialR16;
export const applyWeek2EditorialR115=applyWeek2EditorialR16;
export const applyWeek2EditorialR114=applyWeek2EditorialR16;
export const applyWeek2EditorialR113=applyWeek2EditorialR16;
export const applyWeek2EditorialR112=applyWeek2EditorialR16;
export const applyWeek2EditorialR111=applyWeek2EditorialR16;
export const applyWeek2EditorialR110=applyWeek2EditorialR16;
export const applyWeek2EditorialR109=applyWeek2EditorialR16;
export const applyWeek2EditorialR108=applyWeek2EditorialR16;
export const applyWeek2EditorialR107=applyWeek2EditorialR16;
export const applyWeek2EditorialR106=applyWeek2EditorialR16;
export const applyWeek2EditorialR105=applyWeek2EditorialR16;
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
