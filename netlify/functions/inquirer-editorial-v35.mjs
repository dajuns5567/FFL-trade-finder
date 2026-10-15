// Fleeced! Inquirer forward reporter engine V35.
// Narrow refinement over V34: diversify the last normalized team-article
// reactions caught by the existing cross-team copy gate, remove residual
// newsroom/social meta language, and preserve explicit playoff resolution.

import {
  applyInquirerEditorialV34,
  evaluateInquirerEditionQuality as evaluateV34EditionQuality
} from './inquirer-editorial-v34.mjs';

export const FORWARD_INQUIRER_VERSION=35;
export const FORWARD_EDITORIAL_REVISION=1;
export const evaluateInquirerEditionQuality=evaluateV34EditionQuality;

const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(seed,rows)=>rows[hash(seed)%rows.length];
const reporterId=a=>String(a?.reporter?.id||'walter-mercer');

function diversifyNickWaste(text,team,article,week){
  if(reporterId(article)!=='walter-mercer')return text;
  const s=String(text||'');
  const m=s.match(/^(.+?) delivered far more than this lineup spot usually supplies and (.+?) still lost\. That turns a great individual Sunday into an indictment of the help around him\.$/i);
  if(!m)return s;
  const player=m[1],club=m[2],seed=[week,team?.roster_id,player,'nick-wasted-explosion'].join('|');
  return pick(seed,[
    `${club} received an oversized Sunday from ${player} and somehow converted it into a defeat. The teammates who wasted that cushion own the uncomfortable part of this result.`,
    `${player} did nearly everything a fantasy manager could ask from his slot; ${club} lost anyway. That is what wasted surplus scoring looks like.`,
    `A matchup-breaking performance from ${player} landed in ${club}'s lineup and the team still came up short. Somebody else should be volunteering for the explanation.`,
    `${player} created extra margin almost by himself, and ${club} burned through every bit of it. Great player day, miserable team use of it.`,
    `${club} got far more from ${player} than it had any right to demand and still lost. The failure moved elsewhere in the lineup the moment that happened.`,
    `The lineup was handed a huge advantage by ${player}, yet ${club} could not cash it. That makes the rest of the roster, not the overachiever, the part worth criticizing.`
  ]);
}

function diversifyFilchHotSeat(text,team,article,week){
  if(reporterId(article)!=='nora-voss')return text;
  const s=String(text||'');
  const m=s.match(/^(.+?) gave them ([0-9.]+)\. Rivals will point there first because it is easy, but a score near the floor requires a committee of bad answers\.$/i);
  if(!m)return s;
  const player=m[1],points=m[2],seed=[week,team?.roster_id,player,'filch-hot-seat'].join('|');
  return pick(seed,[
    `${player} finished at ${points}, which is ugly. More damning is that the team total needed several other failures to sink this low.`,
    `The easy accusation lands on ${player} at ${points}. The harder truth is that one bad starter cannot manufacture a catastrophe this complete.`,
    `${player}'s ${points} deserves criticism, but not exclusive rights to the embarrassment. Too many lineup spots joined him.`,
    `Start with ${player} at ${points} if you want. You still need several bad Sundays at once to explain a team score this miserable.`,
    `${player} was quiet at ${points}; the rest of the roster made sure that silence became a team-wide problem.`,
    `Rivals can circle ${player}'s ${points}, but stopping there would let too many teammates escape. A bottom-tier total takes cooperation.`
  ]);
}

function scrubResidualMeta(text){
  return String(text||'')
    .replace(/\bplace setting\b/gi,'lineup spot')
    .replace(/\bballroom doors\b/gi,'matchup')
    .replace(/\bwardrobe\b/gi,'roster')
    .replace(/\bempty plate\b/gi,'empty lineup spot')
    .replace(/\bblaming one chair\b/gi,'blaming one player')
    .replace(/\bmiserable table\b/gi,'miserable lineup')
    .replace(/\bgroup chat\b/gi,'rival managers')
    .replace(/\brival chat\b/gi,'rivals')
    .replace(/\bscreenshot(?:s|ting)?\b/gi,'talking point')
    .replace(/\bcopy desk\b/gi,'league')
    .replace(/\bnewsroom\b/gi,'league')
    .replace(/\b(?:tomorrow(?:’s|'s)\s+)?back[- ]page\b/gi,'league conversation')
    .replace(/\bthe part rival managers will talking point is this:\s*/gi,'Rivals will notice this: ')
    .replace(/\bthis is the sentence the rival managers will keep:\s*/gi,'This is what rivals will remember: ')
    .replace(/\bthe league conversation version is simple:\s*/gi,'The football consequence is simple: ')
    .replace(/\bfan base has talking point, memes and exactly one volume setting\b/gi,'fan base has one complaint and exactly one volume setting')
    .replace(/\bthe the decision-makers result\b/gi,'the management problem')
    .replace(/\bhit the board hard enough to leave 2-0 with reminder\b/gi,'done enough to make an undefeated start feel earned rather than decorative')
    .replace(/\s{2,}/g,' ')
    .trim();
}

function refineArticle(team,week){
  const article=team?.inquirer_article;if(!article)return;
  for(const section of article.sections||[]){
    section.paragraphs=(section.paragraphs||[]).map(p=>{
      let out=diversifyNickWaste(p,team,article,week);
      out=diversifyFilchHotSeat(out,team,article,week);
      return scrubResidualMeta(out);
    });
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]).filter(Boolean);
}

function refineOverview(overview){
  if(!overview)return;
  overview.deck=scrubResidualMeta(overview.deck);
  for(const section of overview.sections||[]){
    section.paragraphs=(section.paragraphs||[]).map(scrubResidualMeta);
    for(const block of section.blocks||[])block.paragraphs=(block.paragraphs||[]).map(scrubResidualMeta);
  }
  for(const take of overview.hot_takes||[])take.take=scrubResidualMeta(take.take);
}

function ensurePostseasonResolution(out,args){
  if(!args?.weekClassification?.playoffs)return;
  const sourceByRoster=new Map((args?.rawInquirer?.teams||[]).map(t=>[String(t.roster_id),t?.playoff_context||null]));
  const teams=out?.inquirer?.teams||[],overview=out?.leagueOverview,eliminated=[],advanced=[];
  for(const team of teams){
    const ctx=team?.playoff_context||sourceByRoster.get(String(team.roster_id));
    if(!ctx)continue;
    if(ctx.eliminated_this_week)eliminated.push({team,ctx});
    if(ctx.advanced_this_week)advanced.push({team,ctx});
  }
  for(const {team,ctx} of eliminated){
    const article=team?.inquirer_article;if(!article)continue;
    if(!/eliminated from championship contention/i.test((article.paragraphs||[]).join(' '))){
      const lede=(article.sections||[]).find(s=>s.kind==='lede')||(article.sections||[])[0];
      if(lede?.paragraphs)lede.paragraphs.unshift(`${team.team_name} was eliminated from championship contention in ${ctx.current_round||args.weekClassification.round||'this playoff round'}. There is no softer fantasy interpretation: the title path ended here.`);
      article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]).filter(Boolean);
    }
  }
  for(const {team,ctx} of advanced){
    const article=team?.inquirer_article;if(!article)continue;
    const next=String(ctx.next_round||'the next round');
    if(!new RegExp(`advances to ${next.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'i').test((article.paragraphs||[]).join(' '))){
      const outlook=(article.sections||[]).find(s=>s.kind==='outlook')||(article.sections||[]).at(-1);
      if(outlook?.paragraphs)outlook.paragraphs.push(`${team.team_name} advances to ${next}. Surviving the bracket is the only argument that matters now.`);
      article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]).filter(Boolean);
    }
  }
  const playoffSection=(overview?.sections||[]).find(s=>/Who Advanced and Who Went Home|Super Bowl/i.test(String(s?.heading||'')));
  if(playoffSection){
    const copy=(playoffSection.paragraphs||[]).join(' ');
    if(eliminated.length&&!/eliminated from championship contention/i.test(copy))playoffSection.paragraphs.push(`${eliminated.map(x=>x.team.team_name).join(', ')} ${eliminated.length===1?'was':'were'} eliminated from championship contention.`);
    if(advanced.length&&!/advances to .*Divisional Round/i.test(copy)){
      const next=String(advanced[0]?.ctx?.next_round||'the next round');
      playoffSection.paragraphs.push(`${advanced.map(x=>x.team.team_name).join(', ')} ${advanced.length===1?'advances':'advance'} to ${next}.`);
    }
  }
}

export function applyInquirerEditorialV35(args={}){
  const base=applyInquirerEditorialV34(args);
  if(!base||Number(args.week)<3)return base;
  const out=structuredClone(base),week=Number(args.week);
  for(const team of out?.inquirer?.teams||[])refineArticle(team,week);
  refineOverview(out?.leagueOverview);
  ensurePostseasonResolution(out,args);
  return out;
}
