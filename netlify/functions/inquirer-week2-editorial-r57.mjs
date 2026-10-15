import {applyWeek2EditorialR16 as applyR56} from './inquirer-week2-editorial-r56.mjs';

function diversifyKansasCityPlayers(team){
  if(String(team?.team_name||'')!=='Kansas City Chiefs')return team;
  const article=team?.inquirer_article;if(!article)return team;
  const section=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
  if(!section||!Array.isArray(section.paragraphs)||section.paragraphs.length<6)return team;
  const ps=[...section.paragraphs];
  const opening=ps.slice(0,6).map(String);
  const has=(text,name)=>String(text||'').toLowerCase().includes(String(name||'').toLowerCase());
  const statish=text=>/\b(?:scored|fantasy points|week 1|week 2|projection|projected)\b/i.test(String(text||''));
  const players=[
    {name:'Michael Burton',comment:'Michael Burton gave Chiefs nothing useful from the fullback spot against Jacksonville Jags; the performance was weak, not proof of a lineup crime.'},
    {name:'Nikko Remigio',comment:'Nikko Remigio never got the wide-receiver spot moving against Jacksonville Jags; zero production deserves criticism without inventing a management indictment.'},
    {name:'Bauer Sharp',comment:"Bauer Sharp's tight-end line against Jacksonville Jags gave Chiefs no fantasy lift; criticize the production without pretending a bench mistake caused it."}
  ];
  const rebuilt=[];
  for(const p of players){
    const matches=opening.filter(x=>has(x,p.name)||has(x,p.name.split(/\s+/).at(-1)));
    const stat=matches.find(statish)||matches[0];
    if(stat)rebuilt.push(stat);
    rebuilt.push(p.comment);
  }
  if(rebuilt.length===6)section.paragraphs=[...rebuilt,...ps.slice(6)];
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r57';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR56(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(diversifyKansasCityPlayers);
  out.structure_revision='week2-r57';
  if(out.league_overview)out.league_overview.structure_revision='week2-r57';
  return out;
}

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
