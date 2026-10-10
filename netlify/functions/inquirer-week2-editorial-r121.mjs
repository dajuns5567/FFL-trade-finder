import {applyWeek2EditorialR16 as applyR120} from './inquirer-week2-editorial-r120.mjs';

const styleOf=article=>{
  const name=String(article?.reporter?.name||'Nick Swindell');
  if(name==='Tilly Fleecer')return 'tilly';
  if(name==='Bartholomew Roycington III')return 'bartholomew';
  if(name==='Jefferson Filch')return 'jefferson';
  return 'nick';
};

function varySentence(text,style){
  let m;
  if((m=text.match(/^(.+?) lost to (.+?) ([0-9.]+)–([0-9.]+) and finished Week 2 at ([0-9-]+)\.$/))){
    const [,team,opp,pts,oppPts,rec]=m;
    if(style==='tilly')return `${opp} handed ${team} a ${oppPts}–${pts} loss; ${team} is ${rec} after two weeks.`;
    if(style==='bartholomew')return `A ${pts}–${oppPts} defeat to ${opp} left ${team} at ${rec} through Week 2.`;
    if(style==='jefferson')return `${team} came up short ${pts}–${oppPts} against ${opp}, leaving the record at ${rec}.`;
    return `${team} fell ${pts}–${oppPts} to ${opp}, so the Week 2 record is ${rec}.`;
  }
  if((m=text.match(/^(.+?) beat (.+?) ([0-9.]+)–([0-9.]+) and finished Week 2 at ([0-9-]+)\.$/))){
    const [,team,opp,pts,oppPts,rec]=m;
    if(style==='tilly')return `${team} took care of ${opp} ${pts}–${oppPts}; two weeks in, that puts ${team} at ${rec}.`;
    if(style==='bartholomew')return `A ${pts}–${oppPts} victory over ${opp} moved ${team} to ${rec} through Week 2.`;
    if(style==='jefferson')return `${team} beat ${opp} ${pts}–${oppPts}, and the record now sits at ${rec}.`;
    return `${team} moved to ${rec} with a ${pts}–${oppPts} win over ${opp}.`;
  }
  if((m=text.match(/^(.+?) followed against (.+?) with (.+)$/))){
    const [,player,opp,line]=m;
    if(style==='tilly')return `${player} chipped in against ${opp}, finishing with ${line}`;
    if(style==='bartholomew')return `Against ${opp}, ${player} supplied the next notable line: ${line}`;
    if(style==='jefferson')return `${player} was next against ${opp}, posting ${line}`;
    return `${player} added the second featured line against ${opp}: ${line}`;
  }
  if((m=text.match(/^(.+?) added (.+)$/))){
    const [,player,line]=m;
    if(style==='tilly')return `${player} joined the damage with ${line}`;
    if(style==='bartholomew')return `${player} contributed another useful entry: ${line}`;
    if(style==='jefferson')return `${player} put another mark on the board with ${line}`;
    return `${player} supplied another part of the scoring with ${line}`;
  }
  if((m=text.match(/^That is criticism of (.+?)'s production, not automatic evidence that management used the player incorrectly\.$/))){
    const [,player]=m;
    if(style==='tilly')return `${player} gets the blame for the dud here; there is no reason to invent a coaching crime that the usage does not support.`;
    if(style==='bartholomew')return `${player}'s production deserves the criticism, while the available usage gives management no automatic indictment.`;
    if(style==='jefferson')return `Put this one on ${player}'s output, not on a management mistake the role does not actually show.`;
    return `${player}'s bad production is the issue; the role itself does not show an obvious management error.`;
  }
  if((m=text.match(/^(.+?) was the largest positive roster-value mover at (.+)\.$/))){
    const [,player,move]=m;
    if(style==='tilly')return `${player} made the biggest upward move in roster value at ${move}.`;
    if(style==='bartholomew')return `The strongest positive roster-value change belonged to ${player}: ${move}.`;
    if(style==='jefferson')return `${player} led the roster's value gains with a move of ${move}.`;
    return `${player} posted the roster's largest value increase, moving ${move}.`;
  }
  if((m=text.match(/^(.+?) was the largest faller at (.+)\.$/))){
    const [,player,move]=m;
    if(style==='tilly')return `${player} took the roster's biggest value hit at ${move}.`;
    if(style==='bartholomew')return `The steepest negative roster-value change belonged to ${player}: ${move}.`;
    if(style==='jefferson')return `${player} led the roster's value losses with a move of ${move}.`;
    return `${player} posted the roster's largest value decline, moving ${move}.`;
  }
  if((m=text.match(/^After Week 3, (.+?) and (.+?) follow\.$/))){
    const [,one,two]=m;
    if(style==='tilly')return `Then the schedule turns to ${one}, with ${two} waiting behind it.`;
    if(style==='bartholomew')return `Beyond Week 3, the next two dates are ${one} and ${two}.`;
    if(style==='jefferson')return `The road after Week 3 runs through ${one} before ${two}.`;
    return `After this matchup, ${one} comes next and ${two} follows.`;
  }
  if((m=text.match(/^(.+?) gets the harder player-level review after (.+?) points\.$/))){
    const [,player,points]=m;
    if(style==='tilly')return `${player}'s ${points}-point day is the player performance that deserves the sharpest side-eye.`;
    if(style==='bartholomew')return `At ${points} points, ${player} merits the sternest individual review from this lineup.`;
    if(style==='jefferson')return `${player} is the player I would question hardest after a ${points}-point result.`;
    return `${player}'s ${points} points make that the clearest individual performance to scrutinize.`;
  }
  if((m=text.match(/^(.+?) also rose (.+?), while (.+?) also fell (.+?)\.$/))){
    const [,up,upMove,down,downMove]=m;
    if(style==='tilly')return `${up} moved up ${upMove}; on the other side, ${down} dropped ${downMove}.`;
    if(style==='bartholomew')return `Elsewhere in the roster market, ${up} gained ${upMove} and ${down} declined ${downMove}.`;
    if(style==='jefferson')return `${up} gained ${upMove} in value, while ${down} lost ${downMove}.`;
    return `The secondary moves went opposite ways: ${up} up ${upMove}, ${down} down ${downMove}.`;
  }
  return text;
}

function refine(team){
  const article=team?.inquirer_article;if(!article)return team;
  const style=styleOf(article);
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').split(/(?<=[.!?])\s+/).map(s=>varySentence(s,style)).join(' '));
  }
  article.paragraphs=(article.sections||[]).flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r121';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR120(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r121';
  if(out.league_overview)out.league_overview.structure_revision='week2-r121';
  return out;
}
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
