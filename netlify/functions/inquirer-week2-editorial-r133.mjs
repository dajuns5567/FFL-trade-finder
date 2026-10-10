import {applyWeek2EditorialR16 as applyR132} from './inquirer-week2-editorial-r132.mjs';

const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');
const sentences=text=>String(text||'').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);

function contextualizeSentence(sentence,team){
  const s=short(team?.team_name);
  const exact=new Map([
    ['For one Sunday, the lineup actually did what the projections keep begging it to do.',`${s}' lineup finally matched the promise behind the projections for one Sunday.`],
    ['They scored enough to stay competitive and still walked away with a loss.',`${s} scored enough to stay competitive and still walked away with the loss.`],
    ['I will permit a little satisfaction; the scoreboard has earned it, even if two weeks have not earned a coronation.',`I will permit ${s} a little satisfaction; the scoreboard earned it, even if two weeks have not earned a coronation.`],
    ["A respectable effort rewarded with absolutely nothing, which is fantasy football's least charming tradition.",`${s} produced a respectable effort and received absolutely nothing for it, one of fantasy football's least charming traditions.`],
    ['Keep the result; now prove the same decisions can survive another opponent.',`Keep ${s}' result; now prove those same decisions can survive another opponent.`],
    ['The production does not excuse the result; somewhere in that lineup, enough value was left unused to matter.',`${s}' production does not excuse the result; enough value was left unused somewhere in that lineup to matter.`],
    ['That is a useful Sunday, not a permission slip to get sentimental about Week 2.',`${s} had a good Sunday, not a permission slip to get sentimental about Week 2.`],
    ['That is the kind of fantasy result that lets you be angry without pretending the whole roster is broken.',`${s} had the kind of fantasy result that justifies anger without pretending the whole roster is broken.`],
    ['That is a management mistake, not bad luck wearing a fake mustache.',`${s} made a management mistake there; bad luck does not get to take the blame for it.`],
    ['Nothing spices up a Sunday like discovering the points after they have stopped counting.',`Nothing spices up ${s}' Sunday like discovering the missing points after they have stopped counting.`],
    ['I admire commitment, but not when it is commitment to the wrong lineup.',`I admire ${s}' commitment, but not when it is commitment to the wrong lineup.`],
    ['That is not a mystery; it is a start/sit miss, and management owns it.',`${s} does not get to call that a mystery; it is a start/sit miss, and management owns it.`],
    ['I would still keep the parade permit in the drawer until Week 3.',`I would still keep ${s}' parade permit in the drawer until Week 3.`],
    ['The lineup gave them enough material.',`${s}' lineup gave its fans enough material.`],
    ['I am more interested in whether the same decisions hold up next week.',`I am more interested in whether ${s}' same decisions hold up next week.`],
    ['The useful question is whether Week 3 gives them the same reasons.',`The question for ${s} is whether Week 3 gives its fans the same reasons.`]
  ]);
  return exact.get(sentence)||sentence;
}

function refineTeam(team){
  const article=team?.inquirer_article;if(!article)return team;
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>sentences(p).map(x=>contextualizeSentence(x,team)).join(' '));
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r133';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR132(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refineTeam);
  out.structure_revision='week2-r133';
  if(out.league_overview)out.league_overview.structure_revision='week2-r133';
  return out;
}

export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
