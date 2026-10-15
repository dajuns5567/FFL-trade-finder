import {applyWeek2EditorialR16 as applyR81} from './inquirer-week2-editorial-r81.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';

function replacement(team){
  const actual=n(team?.points),proj=n(team?.projected),won=n(team?.points)>n(team?.opponent_points),name=String(team?.inquirer_article?.reporter?.name||'Nick Swindell');
  if(!finite(actual)||!finite(proj))return null;
  const d=actual-proj,mag=Math.abs(d),size=mag>=20?'large':mag>=10?'clear':'modest';
  const key=`${won?'win':'loss'}-${d>=0?'above':'below'}-${size}`;
  const rows={
    'Nick Swindell':{
      'win-above-large':`The win also cleared projection by ${one(mag)} points, so Week 3 gets to test whether that surge was repeatable rather than merely pleasant.`,
      'win-above-clear':`The win beat projection by ${one(mag)} points; I want Week 3 to show whether the offense can hold that higher level.`,
      'win-above-modest':`The win finished ${one(mag)} points above projection, useful confirmation without changing the entire Week 3 standard.`,
      'win-below-large':`The win came despite finishing ${one(mag)} points below projection, which makes the result safer than the scoring process.`,
      'win-below-clear':`The win missed projection by ${one(mag)} points, so the record improved faster than the scoring expectation did.`,
      'win-below-modest':`The win landed ${one(mag)} points below projection; that is a small warning to carry into Week 3.`,
      'loss-above-large':`The loss still beat projection by ${one(mag)} points, which is why the offense does not deserve to absorb the whole result.`,
      'loss-above-clear':`The loss finished ${one(mag)} points above projection, evidence that the scoring process was better than the record suggests.`,
      'loss-above-modest':`The loss nudged ${one(mag)} points above projection; useful, but not enough to erase the result.`,
      'loss-below-large':`The loss also missed projection by ${one(mag)} points, a combination that makes Week 3 improvement non-negotiable.`,
      'loss-below-clear':`The loss fell ${one(mag)} points below projection, so both the result and the scoring level need a better Week 3 answer.`,
      'loss-below-modest':`The loss came in ${one(mag)} points below projection, a manageable miss that still belongs in the Week 3 review.`
    },
    'Tilly Fleecer':{
      'win-above-large':`The win smashed projection by ${one(mag)} points. Lovely. Do it again before I order confetti in bulk.`,
      'win-above-clear':`The win beat projection by ${one(mag)} points, which is enough for applause and not enough for a parade route.`,
      'win-above-modest':`The win edged projection by ${one(mag)} points. Nice work; nobody needs to rent a float yet.`,
      'win-below-large':`The win missed projection by ${one(mag)} points, so take the victory and keep the champagne in the fridge.`,
      'win-below-clear':`The win came ${one(mag)} points under projection. Celebrate the result; keep an eye on the missing offense.`,
      'win-below-modest':`The win slipped ${one(mag)} points below projection. Annoying, not alarming.`,
      'loss-above-large':`The loss still beat projection by ${one(mag)} points, which is a cruel little reminder that good scoring can still get punched in the mouth.`,
      'loss-above-clear':`The loss finished ${one(mag)} points above projection. The offense showed up; the opponent simply brought more.`,
      'loss-above-modest':`The loss beat projection by ${one(mag)} points. Useful, but nobody gets a consolation trophy for almost making Sunday nicer.`,
      'loss-below-large':`The loss missed projection by ${one(mag)} points. That is not a subplot; that is the fire alarm.`,
      'loss-below-clear':`The loss came ${one(mag)} points under projection. Week 3 gets the privilege of cleaning that up.`,
      'loss-below-modest':`The loss missed projection by ${one(mag)} points. Small bruise, still worth noticing.`
    },
    'Bartholomew Roycington III':{
      'win-above-large':`The win exceeded projection by ${one(mag)} points, an unexpectedly tasteful overachievement.`,
      'win-above-clear':`The win cleared projection by ${one(mag)} points; one may appreciate the surplus without commissioning a statue.`,
      'win-above-modest':`The win finished ${one(mag)} points above projection, modest excess but respectable excess.`,
      'win-below-large':`The win arrived ${one(mag)} points below projection, so the record may keep its dignity while the scoring reviews its manners.`,
      'win-below-clear':`The win missed projection by ${one(mag)} points; victory is welcome, but the scoring left crumbs on the table.`,
      'win-below-modest':`The win came ${one(mag)} points under projection, a small imperfection on an otherwise acceptable afternoon.`,
      'loss-above-large':`The loss still beat projection by ${one(mag)} points, proof that respectable scoring can be trapped in an indecent result.`,
      'loss-above-clear':`The loss exceeded projection by ${one(mag)} points; the offense may plead not guilty while the result remains ugly.`,
      'loss-above-modest':`The loss edged projection by ${one(mag)} points, faint comfort but not entirely worthless.`,
      'loss-below-large':`The loss missed projection by ${one(mag)} points, a performance requiring correction rather than embroidery.`,
      'loss-below-clear':`The loss came ${one(mag)} points under projection, enough of a miss to make Week 3 considerably less decorative.`,
      'loss-below-modest':`The loss finished ${one(mag)} points below projection, an irritation worth filing before Week 3.`
    },
    'Jefferson Filch':{
      'win-above-large':`The win beat projection by ${one(mag)} points. That gives Week 3 a clear question: was the jump role-driven or matchup-driven?`,
      'win-above-clear':`The win cleared projection by ${one(mag)} points, enough movement to test whether the improvement survives a new opponent.`,
      'win-above-modest':`The win finished ${one(mag)} points above projection. I would log that as confirmation, not transformation.`,
      'win-below-large':`The win missed projection by ${one(mag)} points. The record improved; the expected scoring case did not.`,
      'win-below-clear':`The win came ${one(mag)} points below projection, which leaves a specific scoring question for Week 3.`,
      'win-below-modest':`The win missed projection by ${one(mag)} points. Small discrepancy, still worth tracking.`,
      'loss-above-large':`The loss still exceeded projection by ${one(mag)} points, evidence that the offense and the final result should be evaluated separately.`,
      'loss-above-clear':`The loss beat projection by ${one(mag)} points. That narrows the problem away from simple scoring failure.`,
      'loss-above-modest':`The loss finished ${one(mag)} points above projection, a small positive that should not be confused with a good result.`,
      'loss-below-large':`The loss missed projection by ${one(mag)} points. That gives Week 3 a direct scoring problem to investigate.`,
      'loss-below-clear':`The loss came ${one(mag)} points under projection, enough of a gap to demand a better Week 3 explanation.`,
      'loss-below-modest':`The loss finished ${one(mag)} points below projection. I would track the miss without turning it into a larger theory.`
    }
  };
  return rows[name]?.[key]||rows['Nick Swindell'][key];
}

function refine(team){
  const a=team?.inquirer_article;if(!a)return team;
  const repl=replacement(team);
  if(repl){
    const lede=(a.sections||[]).find(s=>String(s?.kind||'')==='lede');
    if(lede&&Array.isArray(lede.paragraphs))lede.paragraphs=lede.paragraphs.map(p=>String(p||'').replace(/That matters because it tells us whether the result merely matched expectation or changed what Week 3 should reasonably demand from the lineup\./i,repl));
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r82';
  return team;
}

export function applyWeek2EditorialR16(raw){const out=applyR81(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;out.teams=(out.teams||[]).map(refine);out.structure_revision='week2-r82';if(out.league_overview)out.league_overview.structure_revision='week2-r82';return out;}
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
