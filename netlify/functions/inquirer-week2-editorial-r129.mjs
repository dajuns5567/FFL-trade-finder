import {applyWeek2EditorialR16 as applyR128} from './inquirer-week2-editorial-r128.mjs';

const styleOf=article=>{
  const name=String(article?.reporter?.name||'Nick Swindell');
  if(name==='Tilly Fleecer')return 'tilly';
  if(name==='Bartholomew Roycington III')return 'bartholomew';
  if(name==='Jefferson Filch')return 'jefferson';
  return 'nick';
};

function cleanSentence(text,style){
  let m;
  if((m=text.match(/^The civilized reading is that the (.+?) lost with bottom-quarter scoring, which makes the weak production impossible to hide behind the final margin\.$/))){
    return `${m[1]} lost and finished in the bottom quarter of Week 2 scoring. The offense was too quiet for the final margin to excuse it.`;
  }
  if((m=text.match(/^The civilized reading is that the (.+?) won and backed the result with top-quarter scoring\.$/))){
    return `${m[1]} won and finished in the top quarter of Week 2 scoring. That is the kind of result that deserves confidence without turning two games into a season-long conclusion.`;
  }
  if((m=text.match(/^For (.+?), the division position is respectable context, but September remains an uncivilized time for permanent conclusions\.$/))){
    const team=m[1];
    if(style==='bartholomew')return `${team}' place in the division matters, but two weeks is far too early to treat the standings as settled.`;
    return `${team}' place in the division matters, but two weeks is too early to call the race settled.`;
  }
  if((m=text.match(/^(.+?)'s next test is whether the same role survives a second examination\.$/))){
    const player=m[1];
    if(style==='bartholomew')return `If ${player} gets comparable work again in Week 3, the role starts to look repeatable rather than temporary.`;
    if(style==='jefferson')return `Another week of similar usage would make ${player}'s role much easier to trust.`;
    if(style==='tilly')return `Give ${player} this kind of work again in Week 3 and I will stop calling it a one-week spike.`;
    return `Similar Week 3 usage would make ${player}'s role look more stable.`;
  }
  if((m=text.match(/^If (.+?) repeats the usage in Week 3, then the volume can go up\.$/))){
    const player=m[1];
    if(style==='tilly')return `If ${player} sees this kind of work again in Week 3, the role deserves more trust.`;
    return `Another week of similar usage would make ${player}'s role more convincing.`;
  }
  if((m=text.match(/^Last season, (.+?) averaged ([0-9.]+) points per game; this week's number moved far enough (above|below) that to get my attention\.$/))){
    return `${m[1]} averaged ${m[2]} points per game in 2025, so this Week 2 result landed clearly ${m[3]} last season's norm.`;
  }
  if((m=text.match(/^(.+?)'s 2025 average was ([0-9.]+); this performance sat materially (above|below) it\.$/))){
    return `${m[1]} averaged ${m[2]} in 2025; Week 2 finished clearly ${m[3]} that mark.`;
  }
  if((m=text.match(/^(.+?) finished in the middle scoring tier and lost; the result matters, but two games are not enough to define the team\.$/))){
    return `${m[1]} lost despite landing in the middle of the Week 2 scoring pack. That deserves criticism without pretending two games have already defined the roster.`;
  }
  return text;
}

function refineTeam(team){
  const article=team?.inquirer_article;if(!article)return team;
  const style=styleOf(article);
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').split(/(?<=[.!?])\s+/).map(s=>cleanSentence(s,style)).join(' '));
  }
  article.paragraphs=(article.sections||[]).flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r129';
  return team;
}

function rewriteOverview(overview){
  if(!overview||!Array.isArray(overview.sections))return;
  const byHeading=new Map(overview.sections.map(s=>[String(s?.heading||''),s]));
  const mattered=byHeading.get('What Actually Mattered This Week');
  if(mattered)mattered.paragraphs=[
    'Miami Dolphins scored 142.4, the best total of Week 2, while Kansas City Chiefs finished at -0.2. The 142.6-point gap between the top and bottom scores was the clearest league-wide fact of the week: some lineups produced at a contender level, while others never gave themselves a realistic chance.',
    'New England Patriots and Cincinnati Bungals were separated by only 1.2 points, the tightest matchup of Week 2. That is where one start/sit decision can legitimately decide a game; it is very different from blaming one bench choice for a blowout that was broken across the roster.',
    'Miami also made the biggest jump from Week 1 to Week 2, rising 43.3 points from 99.1 to 142.4. That rebound mattered more than a generic “hot week” label because it changed the early scoring picture; Week 3 now has to show whether the same roles can support it again.'
  ];
  const contender=byHeading.get('The Week 2 Contender Line');
  if(contender)contender.paragraphs=[
    'New Orleans Aints are 2-0 and own the best two-week scoring average among undefeated teams at 133.7. The record is clean, but the more important part is that the scoring underneath it has been strong enough to make the start believable.',
    'Washington Commanders are 0-2 despite averaging 101.1 points, the best two-week scoring average among winless teams. Their record is bad; their scoring is not. Through two weeks, that makes Washington a much more interesting team than the standings alone suggest.',
    'The league-wide two-week median is 84.5 points per game. That is the useful early dividing line: teams well above it have produced enough to deserve attention regardless of record, while teams below it need more than a lucky win to make a convincing case.'
  ];
  const matchups=byHeading.get('The Matchups That Defined Week 2');
  if(matchups)matchups.paragraphs=[
    'Miami Dolphins and Pittsburgh Steelers combined for 274.7 points, the highest-scoring matchup of Week 2. Both teams brought enough offense to make the game matter on its own; no manufactured drama was necessary.',
    'Kansas City Chiefs and Jacksonville Jags combined for only 57.1 points, the lowest-scoring matchup of the week. When a game is that quiet, the right question is not who technically led the box score; it is why neither roster generated enough usable production.',
    'Dallas Cowboys beat Green Bay Packers by 65.8 points, the largest margin of Week 2. A gap that large is not a one-player problem. Green Bay needs a broader scoring answer, while Dallas gets credit for turning a favorable week into a complete win.'
  ];
  const changed=byHeading.get('What Week 2 Changed About Week 3');
  if(changed)changed.paragraphs=[
    'Los Angeles Chargers and Las Vegas Raiders are a verified Week 3 matchup, with early projections of 93.4 and 2.6. That 90.8-point gap is enormous on paper, but Week 3 still has to decide whether the projection reflects a real roster gap or an early-season overreaction.',
    'Washington enters Week 3 as the highest-scoring winless team at 101.1 points per game, well above the 84.5 two-week league median. Another strong scoring week would make 0-2 look increasingly misleading; another loss would make the gap between production and results impossible to ignore.',
    'Week 2 had a 72.4-point median team score. Week 3 should tell us which early trends are actually repeatable: stable roles, corrected lineup mistakes and teams that can score well again matter more now than any dramatic conclusion built from only two Sundays.'
  ];
  overview.structure_revision='week2-r129';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR128(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refineTeam);
  rewriteOverview(out.league_overview);
  out.structure_revision='week2-r129';
  return out;
}
export const applyWeek2EditorialR129=applyWeek2EditorialR16;
export const applyWeek2EditorialR128=applyWeek2EditorialR16;
export const applyWeek2EditorialR127=applyWeek2EditorialR16;
export const applyWeek2EditorialR126=applyWeek2EditorialR16;
export const applyWeek2EditorialR125=applyWeek2EditorialR16;
export const applyWeek2EditorialR124=applyWeek2EditorialR16;
export const applyWeek2EditorialR123=applyWeek2EditorialR16;
export const applyWeek2EditorialR122=applyWeek2EditorialR16;
export const applyWeek2EditorialR121=applyWeek2EditorialR16;
export const applyWeek2EditorialR120=applyWeek2EditorialR16;
export const applyWeek2EditorialR119=applyWeek2EditorialR16;
export const applyWeek2EditorialR118=applyWeek2EditorialR16;
export const applyWeek2EditorialR117=applyWeek2EditorialR16;
export const applyWeek2EditorialR116=applyWeek2EditorialR16;
export const applyWeek2EditorialR115=applyWeek2EditorialR16;
export const applyWeek2EditorialR114=applyWeek2EditorialR16;
export const applyWeek2EditorialR113=applyWeek2EditorialR16;
export const applyWeek2EditorialR112=applyWeek2EditorialR16;
export const applyWeek2EditorialR111=applyWeek2EditorialR16;
export const applyWeek2EditorialR110=applyWeek2EditorialR16;
export const applyWeek2EditorialR109=applyWeek2EditorialR16;
export const applyWeek2EditorialR108=applyWeek2EditorialR16;
export const applyWeek2EditorialR107=applyWeek2EditorialR16;
export const applyWeek2EditorialR106=applyWeek2EditorialR16;
export const applyWeek2EditorialR105=applyWeek2EditorialR16;
export const applyWeek2EditorialR104=applyWeek2EditorialR16;
export const applyWeek2EditorialR103=applyWeek2EditorialR16;
export const applyWeek2EditorialR102=applyWeek2EditorialR16;
export const applyWeek2EditorialR101=applyWeek2EditorialR16;
export const applyWeek2EditorialR100=applyWeek2EditorialR16;
export const applyWeek2EditorialR99=applyWeek2EditorialR16;
export const applyWeek2EditorialR98=applyWeek2EditorialR16;
export const applyWeek2EditorialR97=applyWeek2EditorialR16;
export const applyWeek2EditorialR96=applyWeek2EditorialR16;
export const applyWeek2EditorialR95=applyWeek2EditorialR16;
export const applyWeek2EditorialR94=applyWeek2EditorialR16;
export const applyWeek2EditorialR93=applyWeek2EditorialR16;
export const applyWeek2EditorialR92=applyWeek2EditorialR16;
export const applyWeek2EditorialR91=applyWeek2EditorialR16;
export const applyWeek2EditorialR90=applyWeek2EditorialR16;
export const applyWeek2EditorialR89=applyWeek2EditorialR16;
export const applyWeek2EditorialR88=applyWeek2EditorialR16;
export const applyWeek2EditorialR87=applyWeek2EditorialR16;
export const applyWeek2EditorialR86=applyWeek2EditorialR16;
export const applyWeek2EditorialR85=applyWeek2EditorialR16;
export const applyWeek2EditorialR84=applyWeek2EditorialR16;
export const applyWeek2EditorialR83=applyWeek2EditorialR16;
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
