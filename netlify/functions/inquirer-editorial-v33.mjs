// Forward-only Fleeced! Inquirer V33 refinement.
// V33 keeps V32's fact-driven brutality/interpretation, then removes the few
// reusable sentence shapes caught by the existing forward quality gate.

import {
  applyInquirerEditorialV32,
  evaluateInquirerEditionQuality as evaluateV32EditionQuality
} from './inquirer-editorial-v32.mjs';

export const FORWARD_INQUIRER_VERSION=33;
export const FORWARD_EDITORIAL_REVISION=1;
export const evaluateInquirerEditionQuality=evaluateV32EditionQuality;

const reporterId=a=>String(a?.reporter?.id||'walter-mercer');
const teamName=t=>String(t?.team_name||'this team');
const one=v=>Number(v||0).toFixed(1);

function removeRetiredMotifs(text){
  return String(text||'')
    .replace(/which is what happens when a perfectly respectable place setting suddenly kicks open the ballroom doors\./gi,'and suddenly turned a normal lineup spot into the loudest problem in the matchup.')
    .replace(/The only useful question now is whether this was a fabulous one-night outfit or the beginning of a much more expensive wardrobe\./gi,'Now the useful question is whether opponents have to treat that ceiling as real.')
    .replace(/the sort of total that should arrive with a handwritten note explaining what happened to the rest of dinner/gi,'the sort of total that should arrive with a formal explanation for where the rest of the scoring went')
    .replace(/arriving late, empty-handed and offended anyone asked where the food went/gi,'arriving unprepared and somehow offended anyone noticed the missing points')
    .replace(/presenting an empty plate and asking why dinner feels tense/gi,'vacating a lineup spot and asking why the matchup feels tense')
    .replace(/several people to arrive empty-handed at the same party; blaming one chair would be far too kind/gi,'several starters to disappear together; blaming one player would be far too kind')
    .replace(/one disappointing seat into an entire miserable table/gi,'one disappointing starter into an entire miserable lineup')
    .replace(/lukewarm champagne is technically still champagne/gi,'a limp win is technically still a win')
    .replace(/brought champagne/gi,'brought actual scoring')
    .replace(/brought a napkin and good intentions/gi,'brought excuses and good intentions')
    .replace(/brought something technically edible and emotionally disappointing/gi,'brought something technically competitive and emotionally disappointing');
}

function dropRepeatedProjectionAside(text){
  return String(text||'')
    .replace(/\s*They finished \d+(?:\.\d+)? (?:above|below) projection, and that gap was loud enough to matter\./gi,'')
    .replace(/\s{2,}/g,' ')
    .trim();
}

function interpretHighDelta(team,article,player){
  const rid=reporterId(article),name=String(player?.name||'That starter'),club=teamName(team),won=team?.won===true;
  if(rid==='walter-mercer')return won
    ?`${name} did more than beat his usual range; he gave ${club} a real weekly advantage. That kind of surplus makes everyone else’s ordinary mistakes cheaper, which is why opponents now have to respect the ceiling.`
    :`${name} delivered far more than that lineup spot usually supplies and ${club} still lost. That is less a celebration than an indictment of everybody who failed to cash in on the help.`;
  if(rid==='tess-delaney')return won
    ?`${name} turned a normally respectable lineup spot into something indecently helpful. ${club} got to enjoy the luxury; the next opponent gets to discover whether the extravagance has an encore.`
    :`${name} dramatically overdelivered and ${club} still found a way to lose. Imagine receiving that kind of gift and using it to decorate a defeat.`;
  if(rid==='mack-hollis')return won
    ?`${name} did not merely outperform expectation; he kicked the matchup hard enough to change its shape. ${club} should keep leaning on that advantage until somebody proves it was a one-week accident.`
    :`${name} handed ${club} an oversized advantage and the team still managed to waste it. How many extra points does a lineup need before the rest of the roster agrees to participate?`;
  return won
    ?`${name} gave ${club} more than rivals had any reasonable right to expect. Skeptics can call it temporary after they explain why the extra production just mattered to a real win.`
    :`${name} gave ${club} a genuine scoring windfall and the team still lost. Rivals do not need to question his performance when the more embarrassing question is what everybody else did with it.`;
}

function interpretModerateDelta(team,article,player){
  const rid=reporterId(article),name=String(player?.name||'That starter'),club=teamName(team),won=team?.won===true;
  if(rid==='walter-mercer')return won
    ?`${name} gave ${club} more than this lineup spot normally provides, and that extra margin made the win easier to survive. That is the fantasy consequence worth remembering.`
    :`${name} supplied an above-normal contribution and ${club} still came up short. The useful takeaway is that the roster received help here and failed somewhere else.`;
  if(rid==='tess-delaney')return won
    ?`${name} slipped a little extra scoring into ${club}’s pocket and the team actually spent it well. Lovely. Now do it without acting surprised next week.`
    :`${name} brought more than usual and ${club} still turned the afternoon into a loss. Waste is so much uglier when someone has already handed you something useful.`;
  if(rid==='mack-hollis')return won
    ?`${name} produced enough extra scoring to give ${club} room to breathe. That is not spreadsheet trivia; that is a lineup spot doing more work than the opponent planned for.`
    :`${name} beat the usual expectation and ${club} still lost. Congratulations to the rest of the lineup for turning surplus production into a footnote.`;
  return won
    ?`${name} gave ${club} a real edge from a spot that usually attracts less attention. Rivals can dismiss the bump after they explain away the win it helped create.`
    :`${name} exceeded the normal return and ${club} still lost. The investigation therefore moves immediately to the lineup spots that received the extra help and did nothing with it.`;
}

function rewriteDeltaScaffolds(text,team,article){
  let s=String(text||''),club=teamName(team);
  for(const player of team?.starter_details||[]){
    const prior=Number(player?.prior_season_avg),now=Number(player?.points),name=String(player?.name||'');
    if(!name||!Number.isFinite(prior)||prior<=0||!Number.isFinite(now))continue;
    const p=one(prior),n=one(now),high=interpretHighDelta(team,article,player),moderate=interpretModerateDelta(team,article,player);
    const highThree=`${name} normally lived around ${p} a game and just dropped ${n} into this matchup. That is not a cute statistical bump; it is the kind of starter explosion that changes who gets to survive Sunday. If the role supports it again, opponents have a new problem.`;
    const highTwo=`${name} normally lived around ${p} a game and just dropped ${n} into this matchup. That is not a cute statistical bump; it is the kind of starter explosion that changes who gets to survive Sunday.`;
    if(s.includes(highThree))s=s.replace(highThree,high);
    else if(s.includes(highTwo))s=s.replace(highTwo,high);
    const modA=`${name} beat his usual ${p}-point neighborhood with ${n} this week. The important part is not the math lesson; it is that ${club} got a real matchup edge from a spot that normally asks for less attention.`;
    const modB=`${n} from ${name} is meaningfully above his usual ${p}. That extra scoring bought ${club} actual breathing room, which is far more interesting than congratulating the decimal point.`;
    if(s.includes(modA))s=s.replace(modA,moderate);
    if(s.includes(modB))s=s.replace(modB,moderate);
  }
  return s;
}

function rewriteMiddleScoreCliche(text,team,article){
  if(!/nobody should be throwing a parade or holding a funeral over it/i.test(String(text||'')))return text;
  const rid=reporterId(article),club=teamName(team);
  if(rid==='walter-mercer')return String(text).replace(/Fine is the right word, which is also why nobody should be throwing a parade or holding a funeral over it\./i,`Fine is the right word. ${club} earned neither panic nor swagger; the next week has to supply the stronger opinion.`);
  if(rid==='tess-delaney')return String(text).replace(/Fine is the right word, which is also why nobody should be throwing a parade or holding a funeral over it\./i,`Fine is the right word, tragically. ${club} gave us competence without the courtesy of being interesting.`);
  if(rid==='mack-hollis')return String(text).replace(/Fine is the right word, which is also why nobody should be throwing a parade or holding a funeral over it\./i,`Fine is the right word. ${club} did enough to avoid ridicule and nowhere near enough to demand respect.`);
  return String(text).replace(/Fine is the right word, which is also why nobody should be throwing a parade or holding a funeral over it\./i,`Fine is the right word. ${club} has not earned a verdict stronger than that, and rivals should resist inventing one.`);
}

function refineArticle(team){
  const article=team?.inquirer_article;if(!article)return;
  for(const sec of article.sections||[]){
    sec.paragraphs=(sec.paragraphs||[]).map(p=>{
      let s=removeRetiredMotifs(p);
      s=dropRepeatedProjectionAside(s);
      s=rewriteDeltaScaffolds(s,team,article);
      s=rewriteMiddleScoreCliche(s,team,article);
      return s.replace(/\s{2,}/g,' ').trim();
    }).filter(Boolean);
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]).filter(Boolean);
}

function refineOverview(overview,teams){
  const byName=new Map((teams||[]).map(t=>[String(t.team_name||'').toLowerCase(),t]));
  const fallback=teams?.[0]||null;
  const refine=(text,reporter)=>{
    let s=removeRetiredMotifs(text);
    s=dropRepeatedProjectionAside(s);
    const lower=s.toLowerCase(),team=[...byName.entries()].find(([name])=>name&&lower.includes(name))?.[1]||fallback;
    if(team)s=rewriteDeltaScaffolds(s,team,{reporter});
    return s.replace(/\s{2,}/g,' ').trim();
  };
  for(const sec of overview?.sections||[]){
    sec.paragraphs=(sec.paragraphs||[]).map(p=>refine(p,sec.reporter));
    for(const block of sec.blocks||[])block.paragraphs=(block.paragraphs||[]).map(p=>refine(p,sec.reporter));
  }
  for(const take of overview?.hot_takes||[])take.take=refine(take.take,take.reporter);
}

function ensurePostseasonResolution(out,weekClassification){
  if(!weekClassification?.playoffs)return;
  const teams=out?.inquirer?.teams||[],overview=out?.leagueOverview;
  const eliminated=teams.filter(t=>t?.playoff_context?.eliminated_this_week),advanced=teams.filter(t=>t?.playoff_context?.advanced_this_week);
  for(const team of eliminated){
    const article=team?.inquirer_article;if(!article)continue;
    const all=(article.paragraphs||[]).join(' ');
    if(!/eliminated from championship contention/i.test(all)){
      const lede=(article.sections||[]).find(s=>s.kind==='lede')||(article.sections||[])[0];
      if(lede?.paragraphs)lede.paragraphs.unshift(`${teamName(team)} was eliminated from championship contention in ${String(team.playoff_context?.current_round||weekClassification.round||'this playoff round')}. There is no softer fantasy interpretation: the title path ended here.`);
      article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]);
    }
  }
  for(const team of advanced){
    const article=team?.inquirer_article;if(!article)continue;
    const next=String(team.playoff_context?.next_round||'the next round'),all=(article.paragraphs||[]).join(' ');
    if(!new RegExp(`advances to ${next.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'i').test(all)){
      const outlook=(article.sections||[]).find(s=>s.kind==='outlook')||(article.sections||[]).at(-1);
      if(outlook?.paragraphs)outlook.paragraphs.push(`${teamName(team)} advances to ${next}. Surviving the bracket is the only argument that matters now.`);
      article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]);
    }
  }
  const playoffSection=(overview?.sections||[]).find(s=>/Who Advanced and Who Went Home|Super Bowl/i.test(String(s?.heading||'')));
  if(playoffSection){
    const copy=(playoffSection.paragraphs||[]).join(' ');
    if(eliminated.length&&!/eliminated from championship contention/i.test(copy))playoffSection.paragraphs.push(`${eliminated.map(teamName).join(', ')} ${eliminated.length===1?'was':'were'} eliminated from championship contention. Their remaining games cannot reopen the title path.`);
    if(advanced.length&&!/advances to .*Divisional Round/i.test(copy)){
      const next=String(advanced[0]?.playoff_context?.next_round||'the next round');
      playoffSection.paragraphs.push(`${advanced.map(teamName).join(', ')} ${advanced.length===1?'advances':'advance'} to ${next}.`);
    }
  }
}

export function applyInquirerEditorialV33(args={}){
  const base=applyInquirerEditorialV32(args);
  if(!base||Number(args.week)<3)return base;
  const out=structuredClone(base),teams=out?.inquirer?.teams||[];
  for(const team of teams)refineArticle(team);
  refineOverview(out?.leagueOverview,teams);
  ensurePostseasonResolution(out,args.weekClassification);
  return out;
}
