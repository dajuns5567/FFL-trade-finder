import {applyWeek2EditorialR16 as applyR85} from './inquirer-week2-editorial-r85.mjs';

const STATIC_CLOSES=[
  'That is enough information to evaluate the performance without inventing a controversy.',
  'I want the same role to answer the question again in Week 3.',
  'The next game should tell us whether the useful part is repeatable.',
  'That is real football information, which is much nicer than manufacturing a subplot.',
  'Keep the role; spare us the fake crisis.',
  'Do it again next week and then we can make more noise.',
  'Competence is allowed to be interesting when it is tied to an actual role.',
  'That is substance enough for one week; mythology can wait.',
  'The role, rather than the costume around it, is what deserves another look.',
  'That gives the next evaluation something concrete to test.',
  'I would rather follow that role than invent a second case from the same result.',
  'The useful follow-up is whether the same role survives Week 3.'
];

function playerNameFromStat(text){
  const m=String(text||'').match(/^(.+?)\s+(?:led\b|followed\b|added\b)/i);
  return String(m?.[1]||'').trim();
}
function followup(team,player,index){
  const last=String(player||'').split(/\s+/).filter(Boolean).at(-1)||'that player';
  const name=String(team?.inquirer_article?.reporter?.name||'Nick Swindell');
  const rows={
    'Nick Swindell':[
      `For ${last}, Week 3 should show whether that same role holds against a different opponent.`,
      `${last}'s next test is whether the usage and production survive another Sunday.`,
      `I want ${last}'s role to repeat before treating one Week 2 result as a new standard.`
    ],
    'Tilly Fleecer':[
      `${last} gets another week to prove that role was real before we start making more noise.`,
      `If ${last} repeats the usage in Week 3, then the volume can go up.`,
      `${last} can earn the sequel by showing the same role against a different opponent.`
    ],
    'Bartholomew Roycington III':[
      `${last} has earned another look at the same role in Week 3; mythology remains optional.`,
      `The respectable next question for ${last} is whether the role travels to another matchup.`,
      `${last} may keep the praise if the same role survives a second examination.`
    ],
    'Jefferson Filch':[
      `${last} gives Week 3 a specific role question to test rather than another conclusion to invent.`,
      `The next check on ${last} is whether the usage holds when the matchup changes.`,
      `I would track ${last}'s role in Week 3 before expanding the case beyond one result.`
    ]
  };
  return (rows[name]||rows['Nick Swindell'])[index%3];
}

function refine(team){
  const a=team?.inquirer_article;if(!a)return team;
  const players=(a.sections||[]).find(s=>String(s?.kind||'')==='players');
  if(players&&Array.isArray(players.paragraphs)){
    for(let i=1;i<players.paragraphs.length;i+=2){
      const full=playerNameFromStat(players.paragraphs[i-1]);
      if(!full)continue;
      let text=String(players.paragraphs[i]||'');
      for(const old of STATIC_CLOSES)text=text.replace(old,followup(team,full,(i-1)/2));
      players.paragraphs[i]=text;
    }
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r86';
  return team;
}

export function applyWeek2EditorialR16(raw){const out=applyR85(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;out.teams=(out.teams||[]).map(refine);out.structure_revision='week2-r86';if(out.league_overview)out.league_overview.structure_revision='week2-r86';return out;}
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
