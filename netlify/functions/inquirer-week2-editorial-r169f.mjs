import {applyWeek2EditorialR16 as applyR169E} from './inquirer-week2-editorial-r169e.mjs';

const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const shortRef=team=>String(team?.team_name||team?.name||'this team').trim().split(/\s+/).filter(Boolean).at(-1)||'this team';
const reporter=team=>String(team?.inquirer_article?.reporter?.name||'Nick Swindell');
const opponent=team=>String(team?.next_opponent_name||team?.next_opponent||'the Week 3 opponent');
const topStarter=team=>(team?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).sort((a,b)=>Number(b.points)-Number(a.points))[0]?.name||'the best Week 2 starter';

function synthesis(team){
  const ref=shortRef(team),who=reporter(team),next=opponent(team),star=topStarter(team);
  if(who==='Tilly Fleecer')return `${ref} does not need another spreadsheet recital after this one. It needs somebody to get angry. ${star} can point to a real contribution, but one useful answer cannot disinfect an afternoon this ugly. The rest of the roster should spend the week deciding whether it wants to be remembered as a temporary disaster or a recurring comedy bit. ${next} is next, and another performance with this little resistance would turn embarrassment into a personality trait.`;
  if(who==='Bartholomew Roycington III')return `${ref} has already endured enough numerical indignity for one sitting. ${star} at least offered something one could discuss without lowering the curtains, but the broader performance lacked the basic manners expected of a competitive fantasy lineup. ${next} now arrives with a simple opportunity: demonstrate that this was an unfortunate afternoon rather than the roster's preferred form of public etiquette. A competent response would be welcome; a convincing one would be positively luxurious.`;
  if(who==='Jefferson Filch')return `${ref} does not need the same evidence entered again. The result already raises the useful questions. ${star} supplied one answer, but the roster around that performance still has to explain why the week became this difficult. ${next} is where the investigation moves from description to accountability: which choices hold up, which roles deserve trust, and which assumptions should be discarded before they create the same problem again. Another bad result would make coincidence a much harder defense.`;
  return `${ref} has enough numbers on the page already. The useful conclusion is simpler: ${star} gave the lineup something to work with, and the overall result still left too much unresolved. ${next} is the next test, and it should tell us more than another ranking or projection ever could. If the roster responds, this week can be filed as an ugly outlier. If it does not, the early warning stops being theoretical and becomes the main story of the team.`;
}

function restoreDepth(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return;
  const text=article.sections.flatMap(s=>s?.paragraphs||[]).join(' ');
  if(words(text)>=750)return;
  const target=article.sections.find(s=>String(s?.kind||'')==='outlook')||article.sections.at(-1);
  if(!target)return;
  if(!Array.isArray(target.paragraphs))target.paragraphs=[];
  target.paragraphs.push(synthesis(team));
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169E(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[])restoreDepth(team);
  return out;
}

export const applyWeek2EditorialR169F=applyWeek2EditorialR16;
