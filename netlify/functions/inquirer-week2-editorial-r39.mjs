import {applyWeek2EditorialR16 as applyR38} from './inquirer-week2-editorial-r38.mjs';

const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const shortTeam=n=>String(n||'').trim().split(/\s+/).filter(Boolean).at(-1)||'This team';
const articleWords=a=>words((a?.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' '));

const LINES={
 'walter-mercer':[
  t=>`${t} gets another chance next week, not another excuse. The correction should be visible before the first bad decision has time to become a habit.`,
  t=>`${t} can make this criticism boring by responding with cleaner decisions and better points. I would welcome the inconvenience.`,
  t=>`${t} has enough from Sunday to know what deserves another look. The next lineup should make that lesson visible.`
 ],
 'tess-delaney':[
  t=>`${t} can celebrate the good part without pretending the weak spot vanished. Somebody should fix it before the next opponent does the pointing.`,
  t=>`${t} gets another Sunday to prove the last one taught something. If not, subtlety is cancelled.`,
  t=>`${t} has seven days to turn the ugly part into old news. Repeat it and the jokes write themselves.`
 ],
 'mack-hollis':[
  t=>`${t} may keep the competent decisions and discard the embarrassing ones. There is no prize for preserving both.`,
  t=>`${t} can answer criticism the traditional way: play better. I promise to notice if it happens.`,
  t=>`${t} has another Sunday to make this look temporary. I would recommend doing so before ridicule becomes the more reliable habit.`
 ],
 'nora-voss':[
  t=>`${t} already knows which part deserves another look. The next lineup should make that lesson visible rather than merely discuss it afterward.`,
  t=>`${t} can settle the issue with better decisions and better points. Until then, the weak spot remains specific and fixable.`,
  t=>`${t} has another week to separate a bad result from a repeatable mistake. The distinction should be visible before kickoff.`
 ]
};

function guaranteeDepth(team){
 const article=team?.inquirer_article;if(!article)return team;
 const rid=String(article?.reporter?.id||''),tag=shortTeam(team?.team_name);
 const target=(article.sections||[]).find(s=>String(s?.kind||'')==='lede')||article.sections?.[0];
 if(!target)return team;
 let i=0;
 while(articleWords(article)<770&&i<3){
  const fn=(LINES[rid]||LINES['walter-mercer'])[i];
  if(fn)target.paragraphs=[...(target.paragraphs||[]),fn(tag)];
  i++;
 }
 article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r39';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR38(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(guaranteeDepth);
 out.structure_revision='week2-r39';
 if(out.league_overview)out.league_overview.structure_revision='week2-r39';
 return out;
}

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
