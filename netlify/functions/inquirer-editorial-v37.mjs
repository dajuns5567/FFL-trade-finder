// Fleeced! Inquirer forward reporter engine V37.
// V36 owns the forward reporter voice. V37 is the final safety pass: it removes
// residual newsroom/process phrasing after every editorial transform and makes
// playoff advancement/elimination facts impossible to lose in later rewrites.

import {
  applyInquirerEditorialV36,
  evaluateInquirerEditionQuality as evaluateV36EditionQuality
} from './inquirer-editorial-v36.mjs';

export const FORWARD_INQUIRER_VERSION=37;
export const FORWARD_EDITORIAL_REVISION=1;
export const evaluateInquirerEditionQuality=evaluateV36EditionQuality;

function scrub(text){
  return String(text||'')
    .replace(/\bplace settings?\b/gi,'lineup spot')
    .replace(/\bballroom doors?\b/gi,'matchup')
    .replace(/\bwardrobes?\b/gi,'roster')
    .replace(/\bempty plates?\b/gi,'empty lineup spot')
    .replace(/\bblaming one chairs?\b/gi,'blaming one player')
    .replace(/\bmiserable tables?\b/gi,'miserable lineup')
    .replace(/\bgroup chats?\b/gi,'rival managers')
    .replace(/\brival chats?\b/gi,'rivals')
    .replace(/\bscreenshot(?:s|ting|ted)?\b/gi,'talking point')
    .replace(/\bcopy desks?\b/gi,'league')
    .replace(/\bnewsrooms?\b/gi,'league')
    .replace(/\b(?:tomorrow(?:’s|'s)\s+)?back[- ]pages?\b/gi,'league conversation')
    .replace(/\bback[- ]pages? version is simple:\s*/gi,'The football consequence is simple: ')
    .replace(/\bthis is the sentence the rival managers will keep:\s*/gi,'This is what rivals will remember: ')
    .replace(/\bthe part rival managers will talking point is this:\s*/gi,'Rivals will notice this: ')
    .replace(/\bthe part rival managers will talking points? is this:\s*/gi,'Rivals will notice this: ')
    .replace(/\bfan base has talking points?, memes and exactly one volume setting\b/gi,'fan base has one complaint and exactly one volume setting')
    .replace(/\s{2,}/g,' ')
    .trim();
}

function deepScrub(value){
  if(typeof value==='string')return scrub(value);
  if(Array.isArray(value))return value.map(deepScrub);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,deepScrub(v)]));
  return value;
}

function scrubArticle(article){
  if(!article)return;
  article.headline=scrub(article.headline);
  article.deck=scrub(article.deck);
  for(const section of article.sections||[]){
    section.heading=scrub(section.heading);
    section.paragraphs=(section.paragraphs||[]).map(scrub).filter(Boolean);
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]).filter(Boolean);
}

function scrubOverview(overview){
  if(!overview)return;
  overview.headline=scrub(overview.headline);
  overview.deck=scrub(overview.deck);
  for(const section of overview.sections||[]){
    section.heading=scrub(section.heading);
    section.paragraphs=(section.paragraphs||[]).map(scrub).filter(Boolean);
    for(const block of section.blocks||[]){
      block.heading=scrub(block.heading);
      block.paragraphs=(block.paragraphs||[]).map(scrub).filter(Boolean);
    }
  }
  for(const take of overview.hot_takes||[]){
    take.title=scrub(take.title);
    take.take=scrub(take.take);
  }
}

function postseasonSource(args,outTeam){
  const raw=(args?.rawInquirer?.teams||[]).find(t=>String(t.roster_id)===String(outTeam?.roster_id));
  return outTeam?.playoff_context||raw?.playoff_context||null;
}

function ensurePostseason(out,args){
  if(!args?.weekClassification?.playoffs)return;
  const teams=out?.inquirer?.teams||[],overview=out?.leagueOverview,eliminated=[],advanced=[];
  for(const team of teams){
    const ctx=postseasonSource(args,team);if(!ctx)continue;
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
  let playoffSection=(overview?.sections||[]).find(s=>/Who Advanced and Who Went Home|Super Bowl/i.test(String(s?.heading||'')));
  if(!playoffSection&&overview&&Number(args.week)===14){
    playoffSection={heading:`${args.weekClassification.round||'Wildcard Round'}: Who Advanced and Who Went Home`,paragraphs:[],reporter:overview?.sections?.[0]?.reporter||null};
    overview.sections=[...(overview.sections||[]).slice(0,1),playoffSection,...(overview.sections||[]).slice(1)];
  }
  if(playoffSection){
    const copy=(playoffSection.paragraphs||[]).join(' ');
    if(eliminated.length&&!/eliminated from championship contention/i.test(copy))playoffSection.paragraphs.push(`${eliminated.map(x=>x.team.team_name).join(', ')} ${eliminated.length===1?'was':'were'} eliminated from championship contention.`);
    if(advanced.length&&!/advances to .*Divisional Round/i.test(copy)){
      const next=String(advanced[0]?.ctx?.next_round||'the next round');
      playoffSection.paragraphs.push(`${advanced.map(x=>x.team.team_name).join(', ')} ${advanced.length===1?'advances':'advance'} to ${next}.`);
    }
  }
}

export function applyInquirerEditorialV37(args={}){
  const base=applyInquirerEditorialV36(args);
  if(!base||Number(args.week)<3)return base;
  const out=structuredClone(base);
  for(const team of out?.inquirer?.teams||[])scrubArticle(team?.inquirer_article);
  scrubOverview(out?.leagueOverview);
  ensurePostseason(out,args);
  return deepScrub(out);
}
