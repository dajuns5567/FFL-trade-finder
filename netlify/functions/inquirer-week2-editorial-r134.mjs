import {applyWeek2EditorialR16 as applyR133} from './inquirer-week2-editorial-r133.mjs';

const splitSentences=text=>String(text||'').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
const wordCount=text=>(String(text||'').match(/\b[\w’'-]+\b/g)||[]).length;
const reporterStyle=article=>{
  const n=String(article?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'bartholomew';
  if(n==='Jefferson Filch')return'jefferson';
  return'nick';
};
const isOutlookHeading=h=>/week 3|next matchup/i.test(String(h||''));
const isPlayerHeading=h=>/moved the game|made the noise|made the afternoon|names rivals|people who made|who actually|problem everybody saw|thing everybody saw/i.test(String(h||''));

function trimProjectionRepeat(paragraph){
  const ss=splitSentences(paragraph);
  if(ss.length<2)return paragraph;
  const projection=ss.filter(s=>/projection/i.test(s));
  if(projection.length<2)return paragraph;
  let seen=false;
  return ss.filter(s=>{
    if(!/projection/i.test(s))return true;
    if(!seen){seen=true;return true;}
    return !/(win|loss).*(above|below|under|over|missed|exceeded|smashed|nudged).*projection/i.test(s);
  }).join(' ');
}

function trimRoutineSnap(paragraph){
  return splitSentences(paragraph).filter(s=>{
    if(!/snap share/i.test(s))return true;
    const to=s.match(/(?:to|at|showed)\s*(\d{2,3})%/i);
    const current=to?Number(to[1]):null;
    if(current!=null&&current>=95)return false;
    return true;
  }).join(' ');
}

function trimGenericPlayerFollowups(paragraph){
  const ss=splitSentences(paragraph);
  if(ss.length<=3)return paragraph;
  const hasHistory=ss.some(s=>/averag(?:ed|ing).*2025|2025 average|last season/i.test(s));
  const hasProjection=ss.some(s=>/above projection|below projection/i.test(s));
  let dropped=false;
  return ss.filter(s=>{
    if(!dropped&&(hasHistory&&hasProjection)&&/(next test|next check|another week|another Sunday|earned another look|role deserves more trust|role starts to look repeatable|role was real|role travels|sequel|same role|usage holds|usage and production survive)/i.test(s)){
      dropped=true;return false;
    }
    return true;
  }).join(' ');
}

function fixBadDepth(paragraph,style){
  if(!/scoring depth behind the leaders/i.test(paragraph))return paragraph;
  return splitSentences(paragraph).map(s=>{
    if(!/scoring depth behind the leaders/i.test(s))return s;
    const m=s.match(/^(.+?)\s+gave\s+(.+?)\s+scoring depth behind the leaders/i);
    if(m){
      const player=m[1].trim();
      const team=m[2].trim();
      if(style==='tilly')return `${player} did not give ${team} enough secondary scoring to call this depth; Week 3 needs more from that spot before anybody hangs bunting.`;
      if(style==='bartholomew')return `${player} did not give ${team} enough secondary scoring to qualify as depth; Week 3 requires a more substantial contribution before we dress it up.`;
      if(style==='jefferson')return `${player} did not give ${team} enough secondary scoring to call this depth; Week 3 needs more from that spot before the label survives inspection.`;
      return `${player} did not give ${team} enough secondary scoring to call this depth; Week 3 needs more from that spot.`;
    }
    if(style==='tilly')return 'That was not useful depth; the lineup needed more scoring from that spot.';
    if(style==='bartholomew')return 'That was not useful depth; the lineup needed a more substantial scoring contribution.';
    if(style==='jefferson')return 'That was not useful depth; the scoring contribution was part of the problem.';
    return 'That was not useful depth; the lineup needed more from that spot.';
  }).join(' ');
}

function cleanHistoricalBoilerplate(paragraph,style){
  const ss=splitSentences(paragraph);
  return ss.map(s=>{
    if(!/Another result in the same direction would turn a trend into something the losing side has to carry around all season\.?/i.test(s))return s;
    if(style==='tilly')return 'Do it again and the losing side can stop calling the pattern cute.';
    if(style==='bartholomew')return 'One more repeat and coincidence will need a better alibi.';
    if(style==='jefferson')return 'Another repeat would make the trend harder to dismiss.';
    return 'One more result in the same direction would make the trend difficult to ignore.';
  }).join(' ');
}

function depthInsight(article,style){
  const lede=(article.sections?.[0]?.paragraphs||[]).join(' ');
  const m=lede.match(/scored\s+(-?\d+(?:\.\d+)?)\s+in Week 2,\s+ranking\s+(\d+)(?:st|nd|rd|th)?/i);
  const score=m?Number(m[1]):null,rank=m?Number(m[2]):null;
  if(!Number.isFinite(score)||!Number.isFinite(rank))return null;
  if(rank<=8){
    if(style==='tilly')return `A top-eight Week 2 score is the useful part here. ${score} points buys applause, not sainthood; now the lineup has to prove it can keep the volume up when Sunday stops being cooperative.`;
    if(style==='bartholomew')return `A top-eight Week 2 score deserves the good glassware. ${score} points is real production, but one elegant Sunday is not yet a lifestyle; the next game decides whether this was form or merely excellent tailoring.`;
    if(style==='jefferson')return `The useful fact is the top-eight scoring finish: ${score} points gave the result substance. That is stronger than record-based optimism, but Week 3 still has to establish whether the production is repeatable.`;
    return `The top-eight scoring finish matters more than the decoration around it. ${score} points is evidence of a functioning lineup; Week 3 has to show whether that standard can survive a different matchup.`;
  }
  if(rank>=25){
    if(style==='tilly')return `The bottom-eight scoring rank is the part nobody gets to perfume. ${score} points leaves almost no margin for a lineup mistake, bad bounce or quiet star; Week 3 needs actual production, not a prettier explanation.`;
    if(style==='bartholomew')return `The bottom-eight scoring finish is the stain on the jacket. ${score} points leaves far too little room for bad luck or one poor decision; Week 3 requires production before anyone requests sympathy.`;
    if(style==='jefferson')return `The bottom-eight scoring finish is the central problem. ${score} points leaves too little room for variance, lineup error or an opponent spike; Week 3 needs a higher floor before the record gets a more flattering explanation.`;
    return `The bottom-eight scoring finish is the part that matters. ${score} points leaves almost no margin for error, so Week 3 needs a better team total before anyone spends time blaming the schedule or variance.`;
  }
  if(style==='tilly')return `${score} points landed in the league's middle, which is fine if the goal is to avoid public embarrassment. It is less useful if the goal is to win consistently; Week 3 needs a clearer strength to emerge.`;
  if(style==='bartholomew')return `${score} points landed in the league's middle, an acceptable place to visit and a dreary place to live. Week 3 needs one part of the lineup to become unmistakably good rather than merely presentable.`;
  if(style==='jefferson')return `${score} points put the roster in the league's middle tier. That keeps the result in context: neither disaster nor proof of strength, and Week 3 needs a clearer source of reliable scoring.`;
  return `${score} points landed in the league's middle tier. That is enough to keep the result in context, but not enough to answer whether this lineup has a dependable weekly advantage.`;
}

function refineTeam(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const style=reporterStyle(article);
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    let ps=section.paragraphs.map(p=>trimProjectionRepeat(p));
    if(isPlayerHeading(section.heading))ps=ps.map(p=>trimGenericPlayerFollowups(trimRoutineSnap(p))).map(p=>fixBadDepth(p,style));
    else ps=ps.map(p=>fixBadDepth(p,style));
    if(isOutlookHeading(section.heading))ps=ps.map(p=>cleanHistoricalBoilerplate(p,style));
    section.paragraphs=ps.filter(Boolean);
  }
  const teamKey=JSON.stringify([team?.name,team?.team_name,article?.title,article?.headline]);
  if(/Buffalo Billiards/i.test(teamKey)&&article.sections[0]?.paragraphs&&!article.sections[0].paragraphs.some(p=>/margin says close/i.test(p))){
    article.sections[0].paragraphs.push('The margin says close; 49 points says something less flattering. Billiards gave itself almost no room for error, then asked a five-point loss to look respectable. A competitive finish is useful, but the scoring floor is the problem that follows them into Week 3.');
  }
  if(/New England Patriots/i.test(teamKey)&&article.sections[0]?.paragraphs&&!article.sections[0].paragraphs.some(p=>/record can survive a middling/i.test(p))){
    article.sections[0].paragraphs.push('A 2-0 record can survive a middling 73-point Sunday; it cannot make 73 look dominant. New England has earned confidence, not immunity from asking where the missing scoring went. Winning buys patience. It does not turn an ordinary fantasy total into a strength.');
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  if(wordCount(article.paragraphs.join(' '))<760){
    const extra=depthInsight(article,style);
    if(extra&&!article.sections[0].paragraphs.includes(extra))article.sections[0].paragraphs.push(extra);
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  article.structure_revision='week2-r134';
  return team;
}

function rewriteDivisionBoard(overview){
  const section=(overview?.sections||[]).find(s=>/division board/i.test(String(s?.heading||'')));
  if(!section)return;
  section.paragraphs=[
    'AFC EAST: New England Patriots are 2-0, but Miami just answered with 142.4 in Week 2. The record belongs to New England; the loudest scoring warning in the division belongs to Miami.',
    'AFC NORTH: Baltimore Ravens and Cleveland Browns are both 2-0, yet their Week 2 totals were 69.4 and 54.5. Two perfect records, zero permission to confuse the standings with offensive dominance.',
    'AFC SOUTH: Tennessee Titans are 2-0 after scoring 56 in Week 2, with Indianapolis Colts sitting at 1-1. Tennessee owns the early lead; the scoring has not earned anyone a parade route.',
    'AFC WEST: Denver Doncos are 2-0 after an 88.7-point Week 2, while Los Angeles Chargers sit 1-1. Denver has the clean record, but this division still looks more competitive than settled.',
    'NFC EAST: Philadelphia Eagles and Dallas Cowboys are both 2-0. Philadelphia scored 100 in Week 2 and Dallas won by 65.8, so this is the division where the perfect records actually arrived with some muscle.',
    'NFC NORTH: Minnesota Vikings, Detroit Lions and Chicago Bears are all 1-1. Minnesota owned the best Week 2 score of the trio at 121.1; in a division with no record advantage, that is the first useful separator.',
    'NFC SOUTH: New Orleans Aints are 2-0 after 115.8 in Week 2 and still carry the league’s best two-week scoring average among unbeaten teams. Atlanta is 1-1, but the Aints have supplied the strongest reason to believe the standings so far.',
    'NFC WEST: Arizona Cardinals are 2-0 after scoring 123.6 in Week 2, with Los Angeles Rams at 1-1. Arizona has more than a clean record right now; the scoring gives the start actual weight.'
  ];
}

function refineOverview(overview){
  if(!overview)return;
  for(const section of overview.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').replace('Two Sundays can lie; three starts making an argument.','Two Sundays can lie; three starts to make an argument.'));
  }
  rewriteDivisionBoard(overview);
  if(Array.isArray(overview.hot_takes)){
    for(const take of overview.hot_takes){
      if(typeof take?.description==='string')take.description=take.description.replace(/Bold predictions from the desks:?\s*/i,'');
      if(typeof take?.dek==='string')take.dek=take.dek.replace(/Bold predictions from the desks:?\s*/i,'');
    }
  }
  overview.structure_revision='week2-r134';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR133(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refineTeam);
  refineOverview(out.league_overview);
  out.structure_revision='week2-r134';
  return out;
}

export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
