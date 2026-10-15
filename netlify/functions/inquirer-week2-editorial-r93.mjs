import {applyWeek2EditorialR16 as applyR92} from './inquirer-week2-editorial-r92.mjs';

const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');

function refine(team){
  const a=team?.inquirer_article;if(!a)return team;
  const s=short(team?.team_name);
  const management=(a.sections||[]).find(x=>String(x?.kind||'')==='management');
  if(management&&Array.isArray(management.paragraphs)){
    management.paragraphs=management.paragraphs.map(p=>String(p||'')
      .replace('The players own most of what happened on Sunday.',`Most of what happened on Sunday belongs to the players on ${s}.`)
      .replace('I would keep the criticism on player performance unless Week 3 presents a real lineup alternative.',`For ${s}, I would keep the criticism on player performance unless Week 3 presents a real lineup alternative.`)
      .replace('There is no value in blaming the manager for a mistake the roster did not actually offer a way to avoid.',`There is no value in blaming ${s} management for a mistake the roster did not actually offer a way to avoid.`)
      .replace('No lineup scandal this week. I checked, and I am almost disappointed.',`No ${s} lineup scandal this week. I checked, and I am almost disappointed.`)
      .replace('Save the boos for a decision that actually had a better option sitting there.',`Save the boos for a ${s} decision that actually had a better option sitting there.`)
      .replace('We shall resist inventing a managerial felony merely because the result was unpleasant.',`For ${s}, we shall resist inventing a managerial felony merely because the result was unpleasant.`)
      .replace('Criticism should at least have the courtesy to attach itself to a real alternative.',`${s} criticism should at least have the courtesy to attach itself to a real alternative.`)
      .replace('There is no clear management error here, so I am not going to manufacture one.',`There is no clear ${s} management error here, so I am not going to manufacture one.`)
      .replace('If Week 3 produces a compatible alternative, then the management question can become specific.',`If Week 3 produces a compatible alternative for ${s}, then the management question can become specific.`)
      .replace('Correct the specific mistake and spare us a grand indictment of the entire front office.',`Correct the specific ${s} mistake and spare us a grand indictment of the entire front office.`)
      .replace('One tuition payment is sufficient; Week 3 should not charge the same lesson twice.',`One tuition payment is sufficient for ${s}; Week 3 should not charge the same lesson twice.`)
      .replace('One management correction is supported here; a blanket accusation is not.',`One ${s} management correction is supported here; a blanket accusation is not.`)
      .replace('I would track whether the exact decision changes in Week 3 before expanding the case.',`I would track whether the exact ${s} decision changes in Week 3 before drawing a bigger conclusion.`)
      .replace('I would fix that exact choice before turning one miss into a larger management theory.',`I would fix that exact ${s} choice before turning one miss into a larger management theory.`)
      .replace('One bad decision is correctable; repeating it in Week 3 would make the criticism stronger.',`One bad ${s} decision is correctable; repeating it in Week 3 would make the criticism stronger.`)
      .replace('That is one clean “whoops,” not permission to blame management for every bad score on the roster.',`That is one clean ${s} “whoops,” not permission to blame management for every bad score on the roster.`)
      .replace('Fix that one and move on. A sequel would be much harder to defend.',`Fix that ${s} choice and move on. A sequel would be much harder to defend.`)
    );
  }
  a.paragraphs=(a.sections||[]).flatMap(x=>x?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r93';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR92(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r93';
  if(out.league_overview)out.league_overview.structure_revision='week2-r93';
  return out;
}
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
