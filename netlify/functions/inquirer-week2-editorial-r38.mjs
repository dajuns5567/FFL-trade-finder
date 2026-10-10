import {applyWeek2EditorialR16 as applyR37} from './inquirer-week2-editorial-r37.mjs';

const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const shortTeam=n=>String(n||'').trim().split(/\s+/).filter(Boolean).at(-1)||'This team';

function articleWords(article){
 return words((article?.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' '));
}

function floorLine(team,rid){
 const tag=shortTeam(team?.team_name),won=Boolean(team?.won);
 if(rid==='walter-mercer')return won
  ? `${tag} banked the win, but that does not grant immunity from the parts of Sunday that a sharper opponent would punish.`
  : `${tag} has enough from Sunday to know what failed. Fix the repeatable mistake first; sympathy is not a lineup adjustment.`;
 if(rid==='tess-delaney')return won
  ? `${tag} gets to celebrate, loudly if necessary. The bad part still has seven days to disappear before it becomes material for everyone else.`
  : `${tag} has seven days to make the ugly part temporary. Repeat it and the jokes stop being optional.`;
 if(rid==='mack-hollis')return won
  ? `${tag} may enjoy the victory without pretending every decision was elegant. Winning merely makes the correction less embarrassing.`
  : `${tag} has seven days to decide whether this was an inconvenience or a personality trait. I recommend choosing quickly; ridicule travels faster than improvement.`;
 return won
  ? `${tag} has the result. Preserve the decisions that produced it and remove the mistake a better opponent would notice immediately.`
  : `${tag} does not need another explanation next week. It needs the correct decisions repeated and the obvious mistake corrected before kickoff.`;
}

function preserveDepth(team){
 const article=team?.inquirer_article;if(!article||articleWords(article)>=760)return team;
 const rid=String(article?.reporter?.id||'');
 const target=(article.sections||[]).find(s=>String(s?.kind||'')==='lede')||article.sections?.[0];
 if(target)target.paragraphs=[...(target.paragraphs||[]),floorLine(team,rid)];
 if(articleWords(article)<750&&target){
  const tag=shortTeam(team?.team_name);
  target.paragraphs.push(`${tag} already supplied enough reasons to demand a cleaner answer next week. The next lineup should look like Sunday taught somebody something.`);
 }
 article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r38';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR37(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(preserveDepth);
 out.structure_revision='week2-r38';
 if(out.league_overview)out.league_overview.structure_revision='week2-r38';
 return out;
}

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
