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

function voice(article){
  const n=String(article?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'roycington';
  if(n==='Jefferson Filch')return'filch';
  return'nick';
}

function articleContext(team,article){
  const rows=(article?.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).map(norm);
  for(const row of rows){
    let m=row.match(/(.+?) beat (.+?) (-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)/i);
    if(m)return{won:true,opp:m[2],pf:+m[3],pa:+m[4],margin:Math.abs(+m[3]-+m[4]),team:String(team?.team_name||m[1])};
    m=row.match(/(.+?) lost to (.+?) (-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)/i);
    if(m)return{won:false,opp:m[2],pf:+m[3],pa:+m[4],margin:Math.abs(+m[3]-+m[4]),team:String(team?.team_name||m[1])};
  }
  return{won:null,opp:'the opponent',pf:Number(team?.points)||null,pa:null,margin:null,team:String(team?.team_name||'this team')};
}

function statReaction(signal,article,points,ctx){
  const v=voice(article),state=String(signal?.state||''),dir=String(signal?.direction||'neutral'),n=Number(points),margin=Number(ctx?.margin);
  if(dir==='positive'||['breakout','emerging','surging','established','star-level'].includes(state)){
    if(v==='tilly')return ctx?.opp?`${ctx.opp} had enough problems; this was one with a name.`:'That is enough damage to make the opponent wish the app came with a mute button.';
    if(v==='roycington')return'A contribution large enough to deserve the good glassware.';
    if(v==='filch')return'That moved the matchup. Everything else is decoration.';
    return'That is useful damage, not decorative scoring.';
  }
  if(dir==='negative'||['declining','cooling'].includes(state)||(Number.isFinite(n)&&n<6)){
    if(ctx?.won&&Number.isFinite(margin))return`A ${margin.toFixed(1)}-point win can hide that once. It should not become a hobby.`;
    if(v==='tilly')return'That is how a starter becomes the subject of a very loud group chat.';
    if(v==='roycington')return'A contribution best served with the curtains drawn.';
    if(v==='filch')return'That did not move the matchup; it left somebody else to do the lifting.';
    return'That is how a starter turns into a passenger.';
  }
  return v==='roycington'?'Respectable work, without any need to summon a trumpet.':v==='tilly'?'Useful enough to keep, not loud enough to steal the page.':v==='filch'?'Useful, but only because the points reached the matchup.':'Useful points. No ceremony required.';
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

function findMention(row,entries){
  for(const entry of entries){
    for(const alias of aliasesFor(entry.player)){
      const re=new RegExp(`\\b${esc(alias)}\\b`,'i'),m=row.match(re);
      if(m)return{entry,alias,start:m.index||0};
    }
  }
  return null;
}

function decorateParagraph(text,entries,article,usage,ctx){
  let row=norm(text);
  const mention=findMention(row,entries);
  if(!mention)return row;
  const {entry,alias}=mention,{player,signal}=entry,adj=inquirerSignalAdjective(signal,player),name=String(player.name||''),id=String(player?.id||name);
  if(adj&&!usage.has(id)){
    const label=adj.charAt(0).toUpperCase()+adj.slice(1);
    row=row.replace(new RegExp(`\\b${esc(alias)}\\b`,'i'),`${label} ${name}`);
    usage.add(id);
  }
  if(looksStatOnly(row)){
    const pts=(row.match(/\b(-?\d+(?:\.\d+)?)\s+(?:fantasy\s+)?points?\b/i)||row.match(/\bscored\s+(-?\d+(?:\.\d+)?)\b/i)||[])[1];
    row+=` ${statReaction(signal,article,pts,ctx)}`;
  }
  return norm(row);
}

const sentences=text=>norm(text).split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/).filter(Boolean);
function bareKind(text){
  const s=norm(text);if(!s||sentences(s).length!==1)return'';
  if(/\b(?:Cool Throne|Hot Seat|gets? the (?:first|second|third) .*?spot|award|honor)\b/i.test(s))return'award';
  if(/\b(?:outscored|compatible bench spot|lineup decision|started over|benched)\b/i.test(s))return'lineup';
  if(/\b(?:playoff estimate|projection|projected|odds|chance)\b/i.test(s)&&/\d/.test(s))return'projection';
  if(/\b(?:roster value|added \d+ in value|dropped \d+|gained \d+|market)\b/i.test(s))return'market';
  if(/\b(?:ranked|standings|division leader|playoff seed)\b/i.test(s)&&/\d/.test(s))return'rank';
  return'';
}
function hasCommentary(text){return /\b(?:because|which means|that means|that is|that's|good|bad|ugly|useful|problem|matters?|but|however|fine\.|nice\.|deserved|earned|embarrass|ridiculous|painful|loud|quiet|warning|mistake|worth|should|needs?|cannot|can't|did not|does not|enough to|not enough)\b/i.test(text)}

function contextualTake(kind,article,ctx,mention){
  const v=voice(article),signal=mention?.entry?.signal||null,state=String(signal?.state||''),positive=['breakout','emerging','surging','established','star-level'].includes(state),negative=['declining','cooling'].includes(state),won=ctx?.won,margin=Number(ctx?.margin),opp=ctx?.opp||'the opponent';
  if(kind==='award'){
    if(positive)return v==='filch'?'The title is decorative. The performance was not.':v==='tilly'?'The chair is silly; earning it was not.':v==='roycington'?'One may mock the furniture while still approving the occupant.':'Good. Somebody had to earn the furniture.';
    if(negative)return'An award does not erase the larger trend, but at least Sunday gave the résumé something useful.';
    return v==='filch'?'The award is fluff. The week behind it was not.':v==='roycington'?'A proper little honor, and for once the ceremony is not doing all the work.':'Fine by me. The week earned the bit.';
  }
  if(kind==='lineup'){
    if(won)return Number.isFinite(margin)&&margin<10?'They survived it. That is not the same thing as making it a good decision.':'The win keeps it funny instead of expensive.';
    return Number.isFinite(margin)&&margin<10?'That is the kind of mistake that can actually own the loss.':'Bad decision, yes. Not large enough to explain the whole crater.';
  }
  if(kind==='projection')return won?`The model can enjoy being right after the fact; ${opp} is the part that counts.`:'A projection is not bail money. The loss still happened.';
  if(kind==='market')return v==='filch'?'Price movement is useful context, not an alibi for what happened Sunday.':v==='tilly'?'Cute market move. The standings remain stubbornly uninterested in portfolio theory.':'Worth noting. Not worth confusing with the actual game.';
  if(kind==='rank')return won?'Enjoy the view. The fastest way to keep it is to keep winning.':'The table may still like them more than this week did.';
  return'';
}

function enrichBareFact(text,entries,article,ctx,budget){
  let row=norm(text);if(budget.used>=6||hasCommentary(row))return row;
  const kind=bareKind(row);if(!kind)return row;
  const mention=findMention(row,entries),take=contextualTake(kind,article,ctx,mention);
  if(!take)return row;
  budget.used++;
  return norm(`${row} ${take}`);
}

export function applyInquirerSignalLanguageToTeam(team,{season,week,previousTeam=null}={}){
  const article=team?.inquirer_article;if(!article)return team;
  const previousById=new Map((previousTeam?.starter_details||[]).map(p=>[String(p?.id||''),p]));
  const entries=(team?.starter_details||[]).map((player,slot)=>({player,signal:inquirerPlayerSignal(player,{season,week,previousPlayer:previousById.get(String(player?.id||''))||null,slot})})).filter(x=>x.player?.name);
  const usage=new Set(),ctx=articleContext(team,article),budget={used:0};
  for(const section of article.sections||[]){
    if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(p=>enrichBareFact(decorateParagraph(p,entries,article,usage,ctx),entries,article,ctx,budget)).filter(Boolean);
    for(const block of section?.blocks||[]){
      if(Array.isArray(block?.paragraphs))block.paragraphs=block.paragraphs.map(p=>enrichBareFact(decorateParagraph(p,entries,article,usage,ctx),entries,article,ctx,budget)).filter(Boolean);
    }
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
  return team;
}

export function applyInquirerSignalLanguageToEdition(edition,{season,week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams))return edition;
  const previousByRoster=new Map((previousEdition?.teams||[]).map(t=>[String(t?.roster_id||''),t]));
  for(const team of edition.teams)applyInquirerSignalLanguageToTeam(team,{season,week,previousTeam:previousByRoster.get(String(team?.roster_id||''))||null});
  return edition;
}
