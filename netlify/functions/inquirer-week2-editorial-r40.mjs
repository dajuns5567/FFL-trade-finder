import {applyWeek2EditorialR16 as applyR39} from './inquirer-week2-editorial-r39.mjs';

const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const shortTeam=n=>String(n||'').trim().split(/\s+/).filter(Boolean).at(-1)||'This team';
const articleWords=a=>words((a?.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' '));

const SHARED=[
 /^Enjoy it, then find the mistake that would get punished by a better opponent\.$/i,
 /^The score already hurts enough; find the fixable mistake before Sunday turns it into a habit\.$/i,
 /^The bad part still has seven days to disappear before it becomes material for everyone else\.$/i,
 /^Repeat it and the jokes stop being optional\.$/i,
 /^Winning merely makes the correction less embarrassing\.$/i,
 /^I recommend choosing quickly; ridicule travels faster than improvement\.$/i,
 /^Preserve the decisions that produced it and remove the mistake a better opponent would notice immediately\.$/i,
 /^It needs the correct decisions repeated and the obvious mistake corrected before kickoff\.$/i,
 /^The next lineup should look like Sunday taught somebody something\.$/i,
 /^The correction should be visible before the first bad decision has time to become a habit\.$/i,
 /^Somebody should fix it before the next opponent does the pointing\.$/i,
 /^I would recommend doing so before ridicule becomes the more reliable habit\.$/i,
 /^The next lineup should make that lesson visible rather than merely discuss it afterward\.$/i,
 /^Until then, the weak spot remains specific and fixable\.$/i
];

const UNIQUE={
 'walter-mercer':[
  t=>`${t} gets one useful assignment from this mess: make the avoidable mistake disappear before Week 3 gives it a second life.`,
  t=>`${t} can end this complaint by making the cleaner decision obvious on the next lineup card instead of explaining it Monday.`,
  t=>`${t} should treat Sunday as instruction rather than tragedy, because the fixable part is exactly what cannot be allowed to repeat.`
 ],
 'tess-delaney':[
  t=>`${t} gets to keep the fun part, but Week 3 will happily turn the weak spot into a punchline if nobody fixes it.`,
  t=>`${t} has one week to make the ugly detail look temporary, because a sequel would be much harder to defend with a straight face.`,
  t=>`${t} can keep the swagger only if the next lineup remembers which part of Sunday nearly ruined the celebration.`
 ],
 'mack-hollis':[
  t=>`${t} may keep whatever worked, but preserving the embarrassing detail for another week would be an aggressively unnecessary choice.`,
  t=>`${t} has the rare luxury of knowing exactly which part deserves correction, and wasting that information would be almost artistic.`,
  t=>`${t} can make the criticism disappear with competent football, which is terribly unfashionable but remains remarkably effective.`
 ],
 'nora-voss':[
  t=>`${t} has a specific correction available before Week 3, and the next lineup should show that somebody noticed it.`,
  t=>`${t} does not need a broader theory yet; it needs the identifiable mistake removed before the next opponent gets a chance to exploit it.`,
  t=>`${t} can close this question with better decisions next Sunday, because the weak point is visible enough to test directly.`
 ]
};

function removeShared(article){
 for(const sec of article?.sections||[]){
  const ps=[];
  for(const raw of sec?.paragraphs||[]){
   const kept=sentences(raw).filter(s=>!SHARED.some(re=>re.test(s)));
   const p=kept.join(' ').trim();
   if(p)ps.push(p);
  }
  sec.paragraphs=ps;
 }
}

function revise(team){
 const article=team?.inquirer_article;if(!article)return team;
 removeShared(article);
 const rid=String(article?.reporter?.id||''),tag=shortTeam(team?.team_name);
 const target=(article.sections||[]).find(s=>String(s?.kind||'')==='lede')||article.sections?.[0];
 let i=0;
 while(target&&articleWords(article)<770&&i<3){
  const fn=(UNIQUE[rid]||UNIQUE['walter-mercer'])[i];
  if(fn)target.paragraphs=[...(target.paragraphs||[]),fn(tag)];
  i++;
 }
 article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r40';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR39(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(revise);
 out.structure_revision='week2-r40';
 if(out.league_overview)out.league_overview.structure_revision='week2-r40';
 return out;
}

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
