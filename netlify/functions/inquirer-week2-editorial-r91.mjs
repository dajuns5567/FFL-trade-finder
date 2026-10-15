import {applyWeek2EditorialR16 as applyR90} from './inquirer-week2-editorial-r90.mjs';

const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');

function refine(team){
  const a=team?.inquirer_article;if(!a)return team;
  const s=short(team?.team_name);
  const sentiment=(a.sections||[]).find(x=>String(x?.kind||'')==='sentiment');
  if(sentiment&&Array.isArray(sentiment.paragraphs)){
    sentiment.paragraphs=sentiment.paragraphs.map(p=>String(p||'')
      .replace('The confidence makes sense, but Week 3 still has to show that the strongest parts of Sunday can travel.',`${s}'s confidence makes sense, but Week 3 still has to show that the strongest parts of Sunday can travel.`)
      .replace('That patience is real, though another loss would make the crowd much less interested in silver linings.',`${s} supporters are showing real patience, though another loss would make them much less interested in silver linings.`)
      .replace('The result helped, but the crowd clearly wants cleaner football before confidence follows the record.',`${s}'s result helped, but its crowd clearly wants cleaner football before confidence follows the record.`)
      .replace('The frustration fits the result; Week 3 is the first chance to keep one bad Sunday from becoming the mood of the season.',`${s}'s frustration fits the result; Week 3 is the first chance to keep one bad Sunday from becoming the mood of the season.`)
      .replace('Supporters noticed the good result without deciding every concern disappeared with it.',`${s} supporters noticed the good result without deciding every concern disappeared with it.`)
      .replace('The crowd is irritated without treating two games as a crisis, which is about the right temperature for now.',`${s}'s crowd is irritated without treating two games as a crisis, which is about the right temperature for now.`)
      .replace('I would expect the crowd to change its tone quickly if Week 3 gives it a reason.',`I would expect ${s}'s crowd to change its tone quickly if Week 3 gives it a reason.`)
      .replace('Give them better football in Week 3 and they will find something happier to yell about.',`Give ${s} supporters better football in Week 3 and they will find something happier to yell about.`)
      .replace('Week 3 can improve the atmosphere or make the complaints considerably more theatrical.',`Week 3 can improve ${s}'s atmosphere or make the complaints considerably more theatrical.`)
      .replace('Week 3 will either ease that pressure or give it firmer footing.',`Week 3 will either ease ${s}'s pressure or give it firmer footing.`)
    );
  }
  a.paragraphs=(a.sections||[]).flatMap(x=>x?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r91';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR90(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r91';
  if(out.league_overview)out.league_overview.structure_revision='week2-r91';
  return out;
}
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
