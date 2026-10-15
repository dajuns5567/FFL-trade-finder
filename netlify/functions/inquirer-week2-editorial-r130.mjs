import {applyWeek2EditorialR16 as applyR129} from './inquirer-week2-editorial-r129.mjs';

function rewriteOverview(overview){
  if(!overview||!Array.isArray(overview.sections))return;
  const byHeading=new Map(overview.sections.map(s=>[String(s?.heading||''),s]));

  const mattered=byHeading.get('What Actually Mattered This Week');
  if(mattered)mattered.paragraphs=[
    'Miami Dolphins scored 142.4, the best total of Week 2, while Kansas City Chiefs finished at -0.2. I care more about that 142.6-point league-wide gap than any early-season slogan: some lineups looked ready to win immediately, while others never gave themselves a chance.',
    'New England Patriots and Cincinnati Bungals were separated by only 1.2 points, the tightest matchup of Week 2. That is where I will blame one start/sit decision without hesitation; in a blowout, pretending one bench choice caused everything is lazy analysis.',
    'Miami also made the biggest jump from Week 1 to Week 2, rising 43.3 points from 99.1 to 142.4. I want to see the same roles survive Week 3 before calling it a new normal, but that kind of rebound changed the early scoring picture.'
  ];

  const contender=byHeading.get('The Week 2 Contender Line');
  if(contender)contender.paragraphs=[
    'New Orleans Aints are 2-0 and own the best two-week scoring average among undefeated teams at 133.7. I will grant them this much: the record is not floating on luck; the scoring has been strong enough to make the start believable.',
    'Washington Commanders are 0-2 despite averaging 101.1 points, the best two-week scoring average among winless teams. I am not dressing up an 0-2 record, but the offense has been too productive to treat Washington like a bottom-tier roster.',
    'The league-wide two-week median is 84.5 points per game. That is my early dividing line: teams well above it have done enough to demand attention, while teams below it need more than one fortunate result before I start applauding.'
  ];

  const matchups=byHeading.get('The Matchups That Defined Week 2');
  if(matchups)matchups.paragraphs=[
    'Miami Dolphins and Pittsburgh Steelers combined for 274.7 points, the highest-scoring matchup of Week 2. I do not need extra drama here; both teams scored enough to make the game worth watching on its own.',
    'Kansas City Chiefs and Jacksonville Jags combined for only 57.1 points, the lowest-scoring matchup of the week. I am not handing out gold stars for leading a game that quiet; the useful question is why neither roster generated enough real production.',
    'Dallas Cowboys beat Green Bay Packers by 65.8 points, the largest margin of Week 2. I can make jokes about the wreckage, but the football point is simpler: Green Bay needs answers across the lineup, while Dallas turned a favorable week into a complete win.'
  ];

  const changed=byHeading.get('What Week 2 Changed About Week 3');
  if(changed)changed.paragraphs=[
    'Los Angeles Chargers and Las Vegas Raiders are a verified Week 3 matchup, with early projections of 93.4 and 2.6. I want that gap tested on the field before treating it as truth; Week 3 will tell us whether the projection reflects a real roster difference or an early-season overreaction.',
    'Washington enters Week 3 as the highest-scoring winless team at 101.1 points per game, well above the 84.5 two-week league median. I am watching that contradiction closely: another strong scoring week makes 0-2 look increasingly misleading, while another loss raises a harder question about why the production is not becoming wins.',
    'Week 2 had a 72.4-point median team score. What I want from Week 3 is repetition where it matters: stable roles, corrected lineup mistakes and teams proving they can score again matter more than any sweeping conclusion built from two Sundays.'
  ];

  overview.structure_revision='week2-r130';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR129(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  rewriteOverview(out.league_overview);
  out.structure_revision='week2-r130';
  return out;
}

export const applyWeek2EditorialR130=applyWeek2EditorialR16;
