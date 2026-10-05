import {buildPlayerSignal} from './player-signal-engine.mjs';

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function playerNoun(p){
  const pos=String(p?.position||'').toUpperCase();
  if(pos==='QB')return'quarterback';
  if(['RB','FB'].includes(pos))return'back';
  if(pos==='WR')return'receiver';
  if(pos==='TE')return'tight end';
  if(['LB','ILB','OLB','EDGE'].includes(pos))return'linebacker';
  if(['DB','CB','S','FS','SS'].includes(pos))return'defender';
  if(['DL','DE','DT','NT'].includes(pos))return'lineman';
  if(pos==='K')return'kicker';
  return'player';
}

function syntheticPreviousPlayer(p,week){
  if(Number(week)!==2)return null;
  const avg=Number(p?.season_avg),current=Number(p?.points);
  if(!Number.isFinite(avg)||!Number.isFinite(current))return null;
  return{...p,points:Number((avg*2-current).toFixed(4))};
}

export function inquirerPlayerSignal(p,{season,week,previousPlayer=null,slot=1}={}){
  if(!p)return null;
  const prev=previousPlayer||syntheticPreviousPlayer(p,week);
  return buildPlayerSignal({player:p,previousPlayer:prev,season,week,slot});
}

export function inquirerSignalAdjective(signal,p){
  const state=String(signal?.state||''),status=String(signal?.reporter_status||''),noun=playerNoun(p);
  if(state==='breakout')return`breakout ${noun}`;
  if(state==='emerging')return`emerging ${noun}`;
  if(state==='declining'||['struggling-star','declining-veteran','struggling'].includes(status))return`struggling ${noun}`;
  if(state==='surging')return`surging ${noun}`;
  if(state==='cooling')return`cooling ${noun}`;
  if(state==='rookie'||status==='rookie')return`rookie ${noun}`;
  if(state==='young-player'||status==='young-player')return`young ${noun}`;
  return'';
}

function playerSections(article){
  return (article?.sections||[]).filter(section=>/names rivals|moved the game|made the noise|made the afternoon|people who made|who actually|applause|cool throne/i.test(String(section?.heading||'')));
}

function voice(article){
  const n=String(article?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'roycington';
  if(n==='Jefferson Filch')return'filch';
  return'nick';
}

function statReaction(signal,article,points){
  const v=voice(article),state=String(signal?.state||''),dir=String(signal?.direction||'neutral'),n=Number(points);
  if(dir==='positive'||['breakout','emerging','surging','established','star-level'].includes(state)){
    if(v==='tilly')return'That is enough damage to make the opponent wish the app came with a mute button.';
    if(v==='roycington')return'A contribution large enough to deserve the good glassware.';
    if(v==='filch')return'That moved the matchup. Everything else is decoration.';
    return'That is useful damage, not decorative scoring.';
  }
  if(dir==='negative'||['declining','cooling'].includes(state)||Number.isFinite(n)&&n<6){
    if(v==='tilly')return'That is how a starter becomes the subject of a very loud group chat.';
    if(v==='roycington')return'A contribution best served with the curtains drawn.';
    if(v==='filch')return'That did not move the matchup; it left somebody else to do the lifting.';
    return'That is how a starter turns into a passenger.';
  }
  if(v==='tilly')return'Useful enough to keep, not loud enough to steal the page.';
  if(v==='roycington')return'Respectable work, without any need to summon a trumpet.';
  if(v==='filch')return'It mattered because the points reached the matchup, not because the box score looked tidy.';
  return'Useful points. No ceremony required.';
}

function looksStatOnly(text){
  const s=norm(text),sentences=s.split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/).filter(Boolean);
  if(sentences.length!==1)return false;
  return /\b(?:scored|gave|posted|finished with|put up)\b.*\b\d+(?:\.\d+)?\b/i.test(s)&&/\b(?:points?|against|rec|yds?|TD|solo|assist|sack|TFL|QB hit|carries|passing)\b/i.test(s);
}

function aliasesFor(player){
  const full=String(player?.name||'').trim(),parts=full.split(/\s+/).filter(Boolean),last=parts.at(-1)||full;
  return[full,last].filter((x,i,a)=>x&&a.indexOf(x)===i).sort((a,b)=>b.length-a.length);
}

function decorateParagraph(text,entries,article,usage){
  let row=norm(text),matched=null,alias='';
  for(const entry of entries){
    for(const candidate of aliasesFor(entry.player)){
      if(new RegExp(`^${esc(candidate)}\\b`,'i').test(row)){matched=entry;alias=candidate;break}
    }
    if(matched)break;
  }
  if(!matched)return row;
  const {player,signal}=matched,adj=inquirerSignalAdjective(signal,player),name=String(player.name||''),label=adj?adj.charAt(0).toUpperCase()+adj.slice(1):'';
  const id=String(player?.id||name),mayDecorate=!!adj&&!usage.has(id)&&usage.size<2;
  if(mayDecorate){
    row=row.replace(new RegExp(`^${esc(alias)}\\b`,'i'),`${label} ${name}`);
    usage.add(id);
  }
  if(looksStatOnly(row)){
    const pts=(row.match(/\b(-?\d+(?:\.\d+)?)\s+(?:fantasy\s+)?points?\b/i)||row.match(/\bscored\s+(-?\d+(?:\.\d+)?)\b/i)||[])[1];
    row+=` ${statReaction(signal,article,pts)}`;
  }
  return norm(row);
}

export function applyInquirerSignalLanguageToTeam(team,{season,week,previousTeam=null}={}){
  const article=team?.inquirer_article;if(!article)return team;
  const previousById=new Map((previousTeam?.starter_details||[]).map(p=>[String(p?.id||''),p]));
  const entries=(team?.starter_details||[]).map((player,slot)=>({
    player,
    signal:inquirerPlayerSignal(player,{season,week,previousPlayer:previousById.get(String(player?.id||''))||null,slot})
  })).filter(x=>x.player?.name);
  const usage=new Set();
  for(const section of playerSections(article))section.paragraphs=(section.paragraphs||[]).map(p=>decorateParagraph(p,entries,article,usage)).filter(Boolean);
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  return team;
}

export function applyInquirerSignalLanguageToEdition(edition,{season,week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams))return edition;
  const previousByRoster=new Map((previousEdition?.teams||[]).map(t=>[String(t?.roster_id||''),t]));
  for(const team of edition.teams)applyInquirerSignalLanguageToTeam(team,{season,week,previousTeam:previousByRoster.get(String(team?.roster_id||''))||null});
  return edition;
}
