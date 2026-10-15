import {applyInquirerSignalLanguageToEdition} from './inquirer-signal-language.mjs';

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const ordinal=n=>{n=Number(n);if(!Number.isFinite(n)||n<1)return'';const m=n%100,s=n%10;return n+(m>=11&&m<=13?'th':s===1?'st':s===2?'nd':s===3?'rd':'th')};

function voice(article){
  const n=String(article?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'roycington';
  if(n==='Jefferson Filch')return'filch';
  return'nick';
}

function recordText(team){
  const r=team?.league_context?.record||{};
  const w=Number(r.wins)||0,l=Number(r.losses)||0,t=Number(r.ties)||0;
  return `${w}-${l}${t?`-${t}`:''}`;
}

function divisionPlace(team){
  const d=team?.division_context||{},rid=String(team?.roster_id||'');
  const leaders=(d.leaders||[]).filter(Boolean),selfLeader=leaders.some(x=>String(x?.roster_id||'')===rid);
  if(selfLeader)return{rank:1,tied:leaders.length>1};
  if(Array.isArray(d.ahead_teams))return{rank:d.ahead_teams.filter(x=>String(x?.roster_id||'')!==rid).length+1,tied:false};
  return{rank:null,tied:false};
}

function standingsSentence(team,article){
  const div=String(team?.division_context?.division_name||team?.division_name||'').trim();
  const {rank:divRank,tied}=divisionPlace(team),leagueRank=Number(team?.league_context?.standings_rank),rec=recordText(team),v=voice(article);
  const bits=[];
  if(div&&Number.isFinite(divRank))bits.push(`${tied?'tied for ':''}${ordinal(divRank)} in the ${div}`);
  if(Number.isFinite(leagueRank))bits.push(`#${leagueRank} overall`);
  if(!bits.length)return'';
  const lead=`At ${rec}, ${team.team_name} ${bits.length===1?'sits':'sits'} ${bits.join(' and ')}.`;
  if(v==='tilly')return `${lead} September standings are temporary, but being above somebody is still more fun than explaining why you are not.`;
  if(v==='roycington')return `${lead} It is far too early for a coronation, though there is no rule requiring one to apologize for a good seat at the table.`;
  if(v==='filch')return `${lead} The standings are not a theory; they are the part of the file everyone can read without squinting.`;
  if(Number.isFinite(leagueRank)&&leagueRank<=4)return `${lead} That is not a trophy. It is still a much nicer problem than looking up at most of the league.`;
  if(Number.isFinite(leagueRank)&&leagueRank>=25)return `${lead} The division may still be forgiving. The league table is not.`;
  return `${lead} Early, yes. Irrelevant, no.`;
}

function alreadyHasStandings(article,team){
  const text=(article?.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).join(' ');
  const div=String(team?.division_context?.division_name||team?.division_name||'').trim();
  const leagueRank=Number(team?.league_context?.standings_rank);
  const hasDiv=div&&new RegExp(`(?:${div.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}|division).{0,45}(?:standings|lead|first|1st|second|2nd|third|3rd|fourth|4th)`,'i').test(text);
  const hasLeague=Number.isFinite(leagueRank)&&(new RegExp(`#${leagueRank}\\b`).test(text)||/league standings|overall standings/i.test(text));
  return hasDiv&&hasLeague;
}

function injectStandings(team){
  const article=team?.inquirer_article;if(!article||alreadyHasStandings(article,team))return;
  const sentence=standingsSentence(team,article);if(!sentence)return;
  const sections=article.sections||[];
  let target=sections.find(s=>(s?.paragraphs||[]).some(p=>/\b(?:beat|lost to)\b.+\d+(?:\.\d+)?[–-]\d/i.test(String(p))))||sections[0];
  if(!target)return;
  target.paragraphs=Array.isArray(target.paragraphs)?target.paragraphs:[];
  let idx=target.paragraphs.findIndex(p=>/\b(?:beat|lost to)\b.+\d+(?:\.\d+)?[–-]\d/i.test(String(p)));
  if(idx<0)idx=Math.min(0,target.paragraphs.length-1);
  target.paragraphs.splice(idx+1,0,sentence);
  article.paragraphs=sections.flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
}

export function applyInquirerStoryContextToEdition(edition,{season,week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams))return edition;
  applyInquirerSignalLanguageToEdition(edition,{season,week,previousEdition});
  for(const team of edition.teams)injectStandings(team);
  return edition;
}
