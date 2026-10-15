import {applyWeek2EditorialR16 as applyR82} from './inquirer-week2-editorial-r82.mjs';

function variant(team){
  const name=String(team?.inquirer_article?.reporter?.name||'Nick Swindell');
  const slot=Math.abs(Number(team?.roster_id)||0)%4;
  const rows={
    'Nick Swindell':[
      'The division spot matters because Week 3 can reinforce it or expose how early the table still is.',
      'I care about the division position only as a Week 3 pressure point; two games are not enough to make it permanent.',
      'The standings are useful context, but the next lineup decision still matters more than a September ranking.',
      'Keep the division position in view and the sample size in perspective; Week 3 gets the next word.'
    ],
    'Tilly Fleecer':[
      'The division spot is fun to yell about, but two weeks is too early to start engraving anything.',
      'Enjoy the standings while they are flattering; Week 3 still has plenty of opportunity to ruin the mood.',
      'The division table can have its moment, but nobody gets to declare September finished after two Sundays.',
      'Put the division rank on the refrigerator if you want. Just leave room for Week 3 to redraw it.'
    ],
    'Bartholomew Roycington III':[
      'The division position is respectable context, though September remains a dreadful time for permanent conclusions.',
      'One may acknowledge the standings without behaving as though the table has been carved into stone.',
      'The division rank deserves notice, not a coronation; Week 3 retains the right to be inconvenient.',
      'A pleasant place in the table is welcome, but two weeks is hardly a sufficient sample for aristocratic certainty.'
    ],
    'Jefferson Filch':[
      'The division position is one data point. Week 3 will tell us whether it survives a different matchup and another lineup decision.',
      'I would log the standings as context, not conclusion; two games leave too many variables unresolved.',
      'The table adds pressure to Week 3, but it does not close the case after two Sundays.',
      'The division rank is worth tracking because it changes the stakes, not because it proves the roster has settled anything.'
    ]
  };
  return (rows[name]||rows['Nick Swindell'])[slot];
}

function refine(team){
  const a=team?.inquirer_article;if(!a)return team;
  const repl=variant(team);
  const lede=(a.sections||[]).find(s=>String(s?.kind||'')==='lede');
  if(lede&&Array.isArray(lede.paragraphs))lede.paragraphs=lede.paragraphs.map(p=>String(p||'').replace(/The standings add pressure to the next decision, but they do not turn a two-game sample into a finished season\./i,repl));
  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r83';
  return team;
}

export function applyWeek2EditorialR16(raw){const out=applyR82(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;out.teams=(out.teams||[]).map(refine);out.structure_revision='week2-r83';if(out.league_overview)out.league_overview.structure_revision='week2-r83';return out;}
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
