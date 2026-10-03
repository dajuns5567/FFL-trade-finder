import {applyWeek2EditorialR16 as applyR119} from './inquirer-week2-editorial-r119.mjs';

const n=v=>Number(v);
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');

function supporterParagraphs(team){
  const s=short(team?.team_name),reporter=String(team?.inquirer_article?.reporter?.name||'Nick Swindell');
  const r=team?.league_context?.record||{},wins=n(r?.wins)||0,losses=n(r?.losses)||0,won=n(team?.points)>n(team?.opponent_points);
  const first=wins===2
    ? `${s} supporters have every right to enjoy 2-0; ${s} fans can celebrate two wins while still noticing what needs to improve.`
    : losses===2
      ? `${s} supporters are already short on patience at 0-2; another ${s} loss would make the Week 3 complaints much louder.`
      : won
        ? `${s} supporters got the Week 2 response they wanted at 1-1; ${s} fans can enjoy the win without pretending every concern vanished.`
        : `${s} supporters leave Week 2 at 1-1 with a fresh reason to complain; ${s} fans can be irritated without declaring the season ruined.`;

  const secondRows={
    'Nick Swindell': won
      ? `For ${s}, the crowd can appreciate the win and still expect cleaner football next Sunday; ${s} fans are asking for consistency, not perfection.`
      : `For ${s}, fans do not need a dramatic explanation for being annoyed; ${s} supporters need Week 3 to give them fewer reasons to be annoyed.` ,
    'Tilly Fleecer': won
      ? `${s} fans can celebrate without surrendering their right to complain later; if the same weak spots return in Week 3, ${s} supporters will find their volume again.`
      : `${s} fans are allowed to boo a bad Sunday without filing for emotional bankruptcy; give ${s} supporters better football in Week 3 and they will happily yell about something nicer.` ,
    'Bartholomew Roycington III': won
      ? `${s} supporters may enjoy the victory without declaring every concern cured; ${s} fans can manage satisfaction and skepticism at the same time.`
      : `${s} supporters have earned a proper complaint after that loss; asking ${s} fans to applaud it would be indecent.` ,
    'Jefferson Filch': won
      ? `${s} fans have a win to point to, and that matters more than instructions about how they ought to feel; Week 3 gives ${s} supporters another reason to test their confidence.`
      : `${s} fans have a loss to argue about, and the argument is simple enough; ${s} supporters want a better Week 3.`
  };
  const second=secondRows[reporter]||secondRows['Nick Swindell'];

  const third=wins===2
    ? `For ${s}, supporter expectations have moved up with the record; ${s} fans now want the winning to continue without the same weak spots following along.`
    : losses===2
      ? `For ${s}, the Week 3 crowd wants relief more than reassurance; a win would quiet ${s} supporters, while another loss would make the complaints impossible to miss.`
      : won
        ? `For ${s}, Week 3 comes with a simple fan demand; ${s} supporters want proof that the Week 2 win can become something steadier.`
        : `For ${s}, Week 3 offers the fastest way to change the conversation; a win would give ${s} supporters something better to discuss than this loss.`;
  return [first,second,third];
}

function refine(team){
  const article=team?.inquirer_article;if(!article)return team;
  const sentiment=(article.sections||[]).find(s=>String(s?.kind||'')==='sentiment');
  if(sentiment)sentiment.paragraphs=supporterParagraphs(team);
  article.paragraphs=(article.sections||[]).flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r120';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR119(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r120';
  if(out.league_overview)out.league_overview.structure_revision='week2-r120';
  return out;
}
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
