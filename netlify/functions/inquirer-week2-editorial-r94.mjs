import {applyWeek2EditorialR16 as applyR93} from './inquirer-week2-editorial-r93.mjs';

const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');

function refine(team){
  const a=team?.inquirer_article;if(!a)return team;
  const s=short(team?.team_name);
  const value=(a.sections||[]).find(x=>String(x?.kind||'')==='value');
  if(value&&Array.isArray(value.paragraphs)){
    value.paragraphs=value.paragraphs.map(p=>String(p||'')
      .replace('That market move belongs in the roster discussion, but it is not a substitute for Sunday production.',`${s}'s market move belongs in the roster discussion, but it is not a substitute for Sunday production.`)
      .replace('That changes roster optionality more than it changes the Week 2 football evaluation.',`That player move changes ${s}'s roster options more than it changes the Week 2 football evaluation.`)
      .replace('Treat the move as market information, not a verdict on one game.',`Treat that ${s} move as market information, not a verdict on one game.`)
    );
  }
  const outlook=(a.sections||[]).find(x=>String(x?.kind||'')==='outlook');
  if(outlook&&Array.isArray(outlook.paragraphs)){
    outlook.paragraphs=outlook.paragraphs.map(p=>String(p||'')
      .replace('I want Week 3 to answer the football question before the schedule turns into an excuse.',`I want ${s}'s Week 3 game to answer the football question before the schedule turns into an excuse.`)
      .replace('The next game is a better test than another paragraph of prediction.',`${s}'s next game is a better test than another prediction.`)
      .replace('Handle Week 3 first. We can make the jokes louder after the result earns them.',`Handle ${s}'s Week 3 game first. We can make the jokes louder after the result earns them.`)
      .replace('Week 3 gets first crack at proving whether this was progress or just one noisy Sunday.',`${s}'s Week 3 gets first crack at proving whether this was progress or just one noisy Sunday.`)
      .replace('Week 3 deserves our attention before we start reserving future applause.',`${s}'s Week 3 deserves our attention before we start reserving future applause.`)
      .replace('One opponent at a time; the calendar will remain available for later overreaction.',`${s} gets one opponent at a time; the calendar will remain available for later overreaction.`)
      .replace('Week 3 is the next piece of evidence. I would rather test the claim than repeat it.',`${s}'s Week 3 is the next result worth examining. I would rather test the claim than repeat it.`)
      .replace('The next result should answer more than another projection paragraph can.',`${s}'s next result should answer more than another projection can.`)
    );
  }
  a.paragraphs=(a.sections||[]).flatMap(x=>x?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r94';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR93(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r94';
  if(out.league_overview)out.league_overview.structure_revision='week2-r94';
  return out;
}
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
