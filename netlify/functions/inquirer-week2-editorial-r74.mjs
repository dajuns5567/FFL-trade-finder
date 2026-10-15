import {applyWeek2EditorialR16 as applyR73} from './inquirer-week2-editorial-r73.mjs';

const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');

function cleanTeam(team){
  const article=team?.inquirer_article;if(!article)return team;
  const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
  if(players&&Array.isArray(players.paragraphs)){
    const s=short(team.team_name);
    players.paragraphs=players.paragraphs.map(p=>String(p||'')
      .replace('That is the part of the Week 2 lineup worth preserving before the next matchup changes the assignment.',`For ${s}, that is the Week 2 production worth preserving before the next matchup changes the assignment.`)
      .replace('The useful lesson is distribution: Week 2 had several productive spots, which gives Week 3 more than one workable starting point.',`For ${s}, the useful lesson is distribution: several productive spots give Week 3 more than one workable starting point.`)
      .replace('Keep that production in view when Week 3 asks for a different kind of win.',`${s} should keep that production in view when Week 3 asks for a different kind of win.`)
      .replace('Three productive spots are much nicer than watching the lineup depend on one fragile matchup.',`For ${s}, three productive spots give Week 3 more than one matchup answer.`)
      .replace('That is enough production from multiple spots to make the lineup harder to predict and harder to defend.',`For ${s}, production from multiple spots makes the lineup harder to predict and harder to defend.`)
      .replace('A lineup receiving competent work from several places is less dramatic and considerably more useful.',`${s} receiving competent work from several places is considerably more useful than a single matchup spike.`)
      .replace('Distribution is not glamorous, which is precisely why contenders should treasure it.',`For ${s}, balanced production is valuable because it gives Week 3 more than one path to points.`)
      .replace('That is a healthier scoring shape than asking the same position group to solve every matchup.',`For ${s}, that scoring shape leaves more than one position group capable of answering the next matchup.`)
      .replace('The important detail is that Week 2 production came from several places, which makes the result harder to dismiss as one isolated spike.',`For ${s}, Week 2 production came from several places, making the result harder to dismiss as one isolated spike.`)
      .replace('That is worth keeping in the file.',`${s} can carry that multi-player production into Week 3 without making a larger claim yet.`)
      .replace('Multiple productive spots make the next evaluation cleaner and the excuses thinner.',`For ${s}, multiple productive spots make the Week 3 evaluation cleaner and the excuses thinner.`));
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r74';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR73(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(cleanTeam);
  out.structure_revision='week2-r74';
  if(out.league_overview)out.league_overview.structure_revision='week2-r74';
  return out;
}
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
