import {applyWeek2EditorialR16 as applyR130} from './inquirer-week2-editorial-r130.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');
const sentences=text=>String(text||'').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);

function styleOf(article){
  const name=String(article?.reporter?.name||'Nick Swindell');
  if(name==='Tilly Fleecer')return 'tilly';
  if(name==='Bartholomew Roycington III')return 'bartholomew';
  if(name==='Jefferson Filch')return 'jefferson';
  return 'nick';
}

function cleanRoutineSnapShare(section){
  if(!section||!Array.isArray(section.paragraphs))return;
  const comparative=/\b(?:week 1|2025|last week|last season|prior|usual|normal|typical|career|rose|fell|jumped|dropped|increased|decreased|up from|down from|higher|lower|changed|shifted|injur|limited|return|rotation|competition|breakout)\b/i;
  section.paragraphs=section.paragraphs.map(p=>{
    const text=String(p||'');
    if(/The top group also carried real Week 2 roles:/i.test(text)&&/snap share/i.test(text))return '';
    return sentences(text).filter(s=>!(/snap share/i.test(s)&&!comparative.test(s))).join(' ');
  }).filter(Boolean);
}

function resultComment(team,style){
  const s=short(team?.team_name),pts=n(team?.points),opp=n(team?.opponent_points);
  if(!finite(pts)||!finite(opp))return null;
  const won=pts>opp,margin=Math.abs(pts-opp);
  if(style==='tilly'){
    if(won)return `${s} won by ${one(margin)} with ${one(pts)} points. Beautiful. For one Sunday, the lineup actually did what the projections keep begging it to do.`;
    return `${s} scored ${one(pts)} and still lost by ${one(margin)}. Lovely. Fantasy football found a way to turn useful production into a receipt for disappointment.`;
  }
  if(style==='bartholomew'){
    if(won)return `${s} won by ${one(margin)} after scoring ${one(pts)}. I will permit a little satisfaction; the scoreboard has earned it, even if two weeks have not earned a coronation.`;
    return `${s} lost by ${one(margin)} after scoring ${one(pts)}. A respectable effort rewarded with absolutely nothing, which is fantasy football's least charming tradition.`;
  }
  if(style==='jefferson'){
    if(won)return `${s} won by ${one(margin)} with ${one(pts)} points. Good. Keep the result; now prove the same decisions can survive another opponent.`;
    return `${s} scored ${one(pts)} and lost by ${one(margin)}. The production does not excuse the result; somewhere in that lineup, enough value was left unused to matter.`;
  }
  if(won)return `${s} won by ${one(margin)} with ${one(pts)} points. That is a useful Sunday, not a permission slip to get sentimental about Week 2.`;
  return `${s} scored ${one(pts)} and lost by ${one(margin)}. That is the kind of fantasy result that lets you be angry without pretending the whole roster is broken.`;
}

function managementPunch(team,section,style){
  if(!section||!Array.isArray(section.paragraphs)||!section.paragraphs.length)return;
  const body=section.paragraphs.join(' ');
  if(!/outscored .* by .*compatible bench|compatible bench spot|lineup decision worth reviewing/i.test(body))return;
  const s=short(team?.team_name);
  const variants={
    nick:`${s} had an actual alternative on the bench. That is a management mistake, not bad luck wearing a fake mustache.`,
    tilly:`${s} had the better answer sitting on the bench. Fantastic. Nothing spices up a Sunday like discovering the points after they have stopped counting.`,
    bartholomew:`${s} had a better compatible option available and declined the invitation. I admire commitment, but not when it is commitment to the wrong lineup.`,
    jefferson:`${s} had the better compatible option available. That is not a mystery; it is a start/sit miss, and management owns it.`
  };
  section.paragraphs.push(variants[style]||variants.nick);
}

function fanPunch(team,section,style){
  if(!section||!Array.isArray(section.paragraphs))return;
  const s=short(team?.team_name),won=n(team?.points)>n(team?.opponent_points);
  const text=style==='tilly'
    ? (won?`${s} fans are allowed to enjoy this one. I would still keep the parade permit in the drawer until Week 3.`:`${s} fans are allowed to be loud about the loss. The lineup gave them enough material.`)
    : style==='bartholomew'
      ? (won?`${s} supporters may celebrate, preferably without declaring the season conquered after two Sundays.`:`${s} supporters are entitled to complain. The score supplied the invitation.`)
      : style==='jefferson'
        ? (won?`${s} supporters can be happy with the win. I am more interested in whether the same decisions hold up next week.`:`${s} supporters do not need a motivational speech; they need fewer repeatable mistakes in Week 3.`)
        : (won?`${s} fans should enjoy the win and keep one hand on the skepticism. Two weeks is still two weeks.`:`${s} fans have earned the right to complain. The useful question is whether Week 3 gives them the same reasons.`);
  if(!section.paragraphs.some(p=>String(p).includes(text)))section.paragraphs.push(text);
}

function refineTeam(team){
  const article=team?.inquirer_article;if(!article)return team;
  const style=styleOf(article);
  const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
  cleanRoutineSnapShare(players);
  const lede=(article.sections||[]).find(s=>String(s?.kind||'')==='lede');
  const comment=resultComment(team,style);
  if(lede&&comment&&Array.isArray(lede.paragraphs)&&!lede.paragraphs.includes(comment))lede.paragraphs.push(comment);
  const management=(article.sections||[]).find(s=>String(s?.kind||'')==='management');
  managementPunch(team,management,style);
  const sentiment=(article.sections||[]).find(s=>String(s?.kind||'')==='fan-sentiment');
  fanPunch(team,sentiment,style);
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r131';
  return team;
}

function fixBreakoutContinuity(out){
  const hot=out?.league_overview?.hot_takes;if(!Array.isArray(hot))return;
  let item=hot.find(h=>/breakout player to watch|breakout watch/i.test(String(h?.title||'')));
  if(!item){item={title:'Breakout Player to Watch',take:''};hot.push(item);}
  item.title='Breakout Player to Watch: Dallas Turner';
  item.take='Dallas Turner entered Week 2 on Breakout Watch, and Week 2 did not erase that case. Keep the watch on Turner for Week 3; Devin Lloyd\'s enormous Week 2 belongs in the Player-of-the-Week conversation, not as a reason to quietly replace the breakout candidate.';
}

function rewriteRecap(overview){
  if(!overview||!Array.isArray(overview.sections))return;
  const byHeading=new Map(overview.sections.map(s=>[String(s?.heading||''),s]));

  const mattered=byHeading.get('What Actually Mattered This Week');
  if(mattered)mattered.paragraphs=[
    'Miami Dolphins dropped 142.4, Kansas City Chiefs managed -0.2, and the league somehow fit both performances into the same Sunday. That 142.6-point spread is not subtle: some managers had working lineups, and some managers should be grateful fantasy apps do not issue citations.',
    'New England Patriots and Cincinnati Bungals finished only 1.2 points apart. This is where I will yell about one start/sit mistake all week, because in a game that close one choice can actually decide the thing; blaming a single bench call in a 50-point loss is just looking for a convenient suspect.',
    'Miami also made the biggest Week 1-to-Week 2 jump, climbing 43.3 points. I am not calling it a transformation after one good Sunday, but I am absolutely making Week 3 prove it was not a sugar rush.'
  ];

  const contender=byHeading.get('The Week 2 Contender Line');
  if(contender)contender.paragraphs=[
    'New Orleans Aints are 2-0 with the best two-week scoring average among the unbeaten teams at 133.7. Fine, Aints: take the flowers. Just do not eat them before Week 3, because the scoring—not the undefeated label—is the part that actually makes this start scary.',
    'Washington Commanders are 0-2 while averaging 101.1, the best mark among the winless teams. That record is ugly, but calling Washington bad would require ignoring the inconvenient part where they keep scoring like a competent roster.',
    'The league-wide two-week median is 84.5 points per game. Above that line, I am listening. Well below it, I need more than optimism and a lucky matchup before anyone starts using the word contender with a straight face.'
  ];

  const matchups=byHeading.get('The Matchups That Defined Week 2');
  if(matchups)matchups.paragraphs=[
    'Miami Dolphins and Pittsburgh Steelers combined for 274.7 points, the loudest matchup of Week 2. Both lineups did enough to win most weeks; Pittsburgh merely had the misfortune of showing up to the same party as the team that brought 142.4 points.',
    'Kansas City Chiefs and Jacksonville Jags combined for 57.1 points. I have seen richer offensive displays from an elevator button panel. The useful part is not naming the least-bad scorer; it is figuring out why neither roster produced enough to make the matchup breathe.',
    'Dallas Cowboys beat Green Bay Packers by 65.8. Once the margin gets that large, stop hunting for one villain. Green Bay had a roster-wide problem, and Dallas did exactly what good fantasy teams are supposed to do when the opponent leaves the door open: walk through it and take everything.'
  ];

  const changed=byHeading.get('What Week 2 Changed About Week 3');
  if(changed)changed.paragraphs=[
    'Los Angeles Chargers and Las Vegas Raiders are a verified Week 3 matchup with early projections of 93.4 and 2.6. That 90.8-point gap looks ridiculous, which is exactly why I want the game: either the projection is exposing a real roster canyon or Week 3 gets to embarrass the number.',
    'Washington enters Week 3 as the highest-scoring 0-2 team at 101.1 points per game, well above the 84.5 two-week league median. If the scoring holds and the losses continue, somebody is going to have to explain how a productive roster keeps finding banana peels.',
    'Week 2 had a 72.4-point median team score. Week 3 is where I stop rewarding theories and start rewarding repetition: keep the roles that worked, fix the lineup mistakes that were real, and make the good scoring happen twice. Two Sundays can lie; three starts making an argument.'
  ];
  overview.structure_revision='week2-r131';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR130(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refineTeam);
  fixBreakoutContinuity(out);
  rewriteRecap(out.league_overview);
  out.structure_revision='week2-r131';
  if(out.league_overview)out.league_overview.structure_revision='week2-r131';
  return out;
}

export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
