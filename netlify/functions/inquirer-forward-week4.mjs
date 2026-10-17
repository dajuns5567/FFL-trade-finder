// Week 4 v19 is the editorial style source for future Inquirer editions.
// Do not import, paraphrase, or evolve the Week 1–3 article bank here.
import {humanSectionsV19} from './inquirer-human-v19.mjs';

const one=value=>Number(value||0).toFixed(1);
const sectionsToParagraphs=sections=>sections.flatMap(section=>section.paragraphs||[]);
const endings=[
  ['Markets can argue about tomorrow. Tonight the lineup has a score, and the loudest shareholder is the fan who sat through it.', 'Supporters have not forgotten the weakest starting slot. Their group chat has already held a disciplinary hearing without bothering to invite counsel.'],
  ['Valuation chatter is fine until it becomes an alibi for Sunday. The board does not award points for winning a trade in theory.', 'A win may bring champagne to the sidewalk; defeat brings neighbors with metaphorical pitchforks and extremely literal screenshots.'],
  ['There is a distinction between owning an attractive asset and fielding an effective starter. This team provided another reminder.', 'The stands have a short memory for excuses and an absurdly long one for roster decisions. Management knows which screenshots circulate.'],
  ['The market can admire the pieces while the final score insults the assembly instructions. One of those evaluations gets printed in bold.', 'Fans are writing their reaction in the least diplomatic language they know. Even the optimistic half is preparing a complaint about one position.'],
  ['The future price tag did not play a snap. Someone should send that detail to anyone attempting to negotiate with the scoreboard.', 'The local mood has jumped from cautious hope to street-corner argument. Nobody here has ever celebrated a sensible amount.'],
  ['Every market rise deserves context: useful until the actual matchup exposes a different problem. This desk still counts Sundays first.', 'If management wants a quieter Monday, it could try a lineup that does not inspire twelve competing conspiracy theories.'],
  ['A roster might look magnificent in a trade calculator and still play like somebody forgot the batteries. The distinction remains important.', 'One half of the crowd wants fireworks. The other is Googling pitchfork suppliers. Such is the emotional stability of fantasy football.'],
  ['Keep the valuation graph open if you enjoy it. The final score is the less forgiving chart and the one opponents will remember.', 'Sunday has either purchased a week of public goodwill or emptied the account. The fan base is already checking the balance.']
];

export function writeWeek4StyleForward({rawInquirer,rawOverview,previousEdition,week,weekClassification}) {
  const previous=new Map((previousEdition?.teams||[]).map(team=>[String(team.roster_id),team]));
  const teams=(rawInquirer?.teams||[]).map(team=>{
    const old=previous.get(String(team.roster_id));
    const article=team.inquirer_article||{};
    const reporter=article.reporter||rawInquirer.reporters?.find(r=>r.id===team.reporter_id);
    const sections=humanSectionsV19({team,week,reporter,facts:article.facts||{},sentiment:article.fan_sentiment||{}});
    // V19's two generic essays repeat verbatim across four teams. Retain its
    // section rhythm, but give every desk a fresh editorial closing beat.
    const id=Number(team.roster_id)||1,beat=endings[(id-1)%endings.length];
    const market=sections.find(section=>section.kind==='value');
    if(market)market.paragraphs[1]=beat[0];
    const fan=sections.find(section=>section.kind==='sentiment');
    if(fan)fan.paragraphs[1]=beat[1];
    const context=old?.points!=null?Number(team.points)-Number(old.points):null;
    if(Number.isFinite(context)&&Math.abs(context)>0.05){
      const lede=sections.find(section=>section.kind==='lede');
      const comparison=Math.abs(context).toFixed(1);
      const trend=context>0.05?`${comparison} more than last week`:`${comparison} fewer than last week`;
      lede?.paragraphs.push(`${team.team_name} scored ${one(team.points)} against ${team.opponent_name}, ${trend}. Last Sunday's version would not have survived the same arguments.`);
    }
    const forward={...article,week:Number(week),sections,paragraphs:sectionsToParagraphs(sections),editorial_source:'week4-v19-style'};
    return {...team,inquirer_article:forward};
  });
  const overview={...rawOverview,editorial_source:'week4-v19-style',week_classification:weekClassification};
  return {inquirer:{...rawInquirer,teams},leagueOverview:overview};
}
