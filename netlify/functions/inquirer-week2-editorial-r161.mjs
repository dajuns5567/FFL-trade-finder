import {applyWeek2EditorialR16 as applyR160} from './inquirer-week2-editorial-r160.mjs';

function restoreDivisionLeadContext(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const ctx=team?.division_context,leaders=(ctx?.leaders||[]).filter(x=>x?.team_name);
  if(!leaders.length)return team;
  const self=leaders.some(x=>String(x?.roster_id||'')===String(team?.roster_id||''));
  const others=leaders.filter(x=>String(x?.roster_id||'')!==String(team?.roster_id||''));
  if(!self||!others.length)return team;
  const outlook=article.sections.find(s=>String(s?.kind||'')==='outlook');
  if(!Array.isArray(outlook?.paragraphs))return team;
  const copy=outlook.paragraphs.join(' '),names=others.map(x=>String(x.team_name));
  if(/\b(?:tied|shares|level)\b/i.test(copy)&&names.every(n=>copy.toLowerCase().includes(n.toLowerCase())))return team;
  const div=String(ctx?.division_name||'the division');
  const own=String(team?.team_name||'This team');
  const line=others.length===1
    ? `${own} shares the ${div} lead with ${names[0]}; Week 3 is not just another result, it is the first chance to create daylight in a race that is still level.`
    : `${own} is tied atop the ${div} with ${names.join(' and ')}; Week 3 is the first chance to turn a crowded lead into actual separation.`;
  outlook.paragraphs.splice(Math.min(2,outlook.paragraphs.length),0,line);
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r161';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR160(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(restoreDivisionLeadContext);
  if(out.league_overview)out.league_overview.structure_revision='week2-r161';
  out.structure_revision='week2-r161';
  return out;
}

export const applyWeek2EditorialR161=applyWeek2EditorialR16;
export const applyWeek2EditorialR160=applyWeek2EditorialR16;
export const applyWeek2EditorialR159=applyWeek2EditorialR16;
export const applyWeek2EditorialR158=applyWeek2EditorialR16;
export const applyWeek2EditorialR157=applyWeek2EditorialR16;
export const applyWeek2EditorialR156=applyWeek2EditorialR16;
export const applyWeek2EditorialR155=applyWeek2EditorialR16;
export const applyWeek2EditorialR154=applyWeek2EditorialR16;
export const applyWeek2EditorialR153=applyWeek2EditorialR16;
export const applyWeek2EditorialR152=applyWeek2EditorialR16;
export const applyWeek2EditorialR151=applyWeek2EditorialR16;
export const applyWeek2EditorialR150=applyWeek2EditorialR16;
export const applyWeek2EditorialR149=applyWeek2EditorialR16;
export const applyWeek2EditorialR148=applyWeek2EditorialR16;
export const applyWeek2EditorialR147=applyWeek2EditorialR16;
export const applyWeek2EditorialR146=applyWeek2EditorialR16;
export const applyWeek2EditorialR145=applyWeek2EditorialR16;
export const applyWeek2EditorialR144=applyWeek2EditorialR16;
export const applyWeek2EditorialR143=applyWeek2EditorialR16;
export const applyWeek2EditorialR142=applyWeek2EditorialR16;
export const applyWeek2EditorialR141=applyWeek2EditorialR16;
export const applyWeek2EditorialR140=applyWeek2EditorialR16;
export const applyWeek2EditorialR139=applyWeek2EditorialR16;
export const applyWeek2EditorialR138=applyWeek2EditorialR16;
export const applyWeek2EditorialR137=applyWeek2EditorialR16;
export const applyWeek2EditorialR136=applyWeek2EditorialR16;
export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
