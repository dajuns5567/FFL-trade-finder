import {humanSectionsV23,selectImportantMoves,divisionCopy} from './inquirer-editorial-v23.mjs';
import {humanSectionsV21} from './inquirer-human-v21.mjs';
// Team prose is calibrated against the approved Weekly Recap style control and direct beat-reporting contract.

const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const one=x=>Number(x).toFixed(1);
const record=t=>{const r=t.league_context?.record||{};return `${r.wins||0}-${r.losses||0}${r.ties?'-'+r.ties:''}`};
const list=t=>(t.starter_details||[]).filter(p=>valid(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
const delta=p=>valid(p?.projected)?Number(p.points)-Number(p.projected):null;
const group=p=>/^(DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT)$/.test(String(p?.position||''))?'defense':p?.position==='QB'?'quarterback':p?.position==='RB'?'backfield':p?.position==='TE'?'tight end':'receiving corps';
const names=xs=>xs.map(x=>x.name).filter(Boolean).join(', ');
const chance=n=>valid(n)?one(n)+'%':null;
const voice=r=>({'walter-mercer':0,'tess-delaney':1,'mack-hollis':2,'nora-voss':3}[r?.id]??0);
const choose=(t,items)=>items[Math.abs(Number(t?.roster_id)||0)%items.length];
const deskChoice=(t,r,sets)=>choose(t,sets[voice(r)]||sets[0]);
const keyedChoice=(key,items)=>{const s=String(key||''),h=[...s].reduce((n,ch)=>((n*31)+ch.charCodeAt(0))>>>0,7);return items[h%items.length]};
const naturalJoin=xs=>{const a=(xs||[]).filter(Boolean);return a.length<2?(a[0]||''):a.length===2?a[0]+' and '+a[1]:a.slice(0,-1).join(', ')+', and '+a[a.length-1]};
const defensivePlayer=p=>/^(DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT)$/.test(String(p?.position||'').toUpperCase());
const articlePlayers=t=>[...(t?.starter_details||[]),...(t?.opponent_roster?.starters||t?.opponent_roster?.players||[]),...(t?.next_opponent_roster?.starters||t?.next_opponent_roster?.players||[]),...Object.values(t?.transaction_player_facts||{})].filter(p=>p?.name);
const escapeRe=value=>String(value??'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function splitSentencesSafeV28(value){
  const protectedText=String(value??'')
    .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
    .replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'));
  return protectedText.split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.')).filter(Boolean);
}

function naturalizePlayerReferences(t,value){
  const text=String(value??''),players=articlePlayers(t),firstCounts=new Map();
  for(const p of players){const first=String(p.name).trim().split(/\s+/)[0];if(first)firstCounts.set(first,(firstCounts.get(first)||0)+1)}
  const names=[...new Set(players.map(p=>String(p.name||'').trim()).filter(Boolean))].sort((a,b)=>b.length-a.length),last=new Map();
  return splitSentencesSafeV28(text).map((sentence,index)=>{
    let out=sentence;
    for(const name of names){
      const first=name.split(/\s+/)[0];if(!first||firstCounts.get(first)!==1)continue;
      const re=new RegExp(escapeRe(name),'gi');
      if(!re.test(out))continue;
      re.lastIndex=0;
      const prev=last.get(name);
      if(Number.isInteger(prev)&&index-prev<=3)out=out.replace(re,first);
      else last.set(name,index);
    }
    return out;
  }).join(' ');
}

function statClause(p){
  const line=teamStatLine(p);if(!line)return null;
  const name=String(p?.name||'').trim(),re=new RegExp('^'+escapeRe(name)+'\\s+','i');
  const clause=String(line).replace(re,'').replace(/\.$/,'');
  return clause?clause.charAt(0).toLowerCase()+clause.slice(1):null;
}

function opportunity(p){
  const s=p?.real_stats||{},position=String(p?.position||'').toUpperCase();
  if(position==='RB') {
    const carries=Number(s.rush_att),targets=Number(s.rec_tgt??s.targets);
    if(Number.isFinite(carries)||Number.isFinite(targets))return {strong:(carries||0)>=12||(targets||0)>=5,text:`${Number.isFinite(carries)?carries+' carries':''}${Number.isFinite(carries)&&Number.isFinite(targets)?' and ':''}${Number.isFinite(targets)?targets+' targets':''}`};
  }
  if(position==='WR'||position==='TE'){
    const targets=Number(s.rec_tgt??s.targets);
    if(Number.isFinite(targets))return {strong:targets>=6,text:`${targets} targets`};
  }
  if(position==='QB'){
    const att=Number(s.pass_att),rush=Number(s.rush_att);
    if(Number.isFinite(att)||Number.isFinite(rush))return {strong:(att||0)>=25||(rush||0)>=6,text:`${Number.isFinite(att)?att+' pass attempts':''}${Number.isFinite(att)&&Number.isFinite(rush)?' and ':''}${Number.isFinite(rush)?rush+' carries':''}`};
  }
  const d=teamDefenseUsage(p);
  return d?{strong:!!d.strong,text:d.text}:null;
}

function statSituation(p){
  const s=p?.real_stats||{},pos=String(p?.position||'').toUpperCase(),n=p?.name||'The player',plural=(x,sing,plur=sing+'s')=>Number(x)===1?sing:plur;
  if(pos==='QB'){
    const cmp=Number(s.pass_cmp),att=Number(s.pass_att),yd=Number(s.pass_yd),td=Number(s.pass_td),ints=Number(s.pass_int),rush=Number(s.rush_att),rushYd=Number(s.rush_yd),rushTd=Number(s.rush_td),parts=[];
    if(Number.isFinite(cmp)&&Number.isFinite(att))parts.push(`completed ${cmp} of ${att}`);
    if(Number.isFinite(yd))parts.push(`for ${yd} passing yards`);
    if(Number.isFinite(td)&&td>0)parts.push(`with ${td} passing ${plural(td,'touchdown')}`);
    if(Number.isFinite(ints)&&ints>0)parts.push(`and ${ints} ${plural(ints,'interception')}`);
    let text=parts.length?`${n} ${parts.join(' ')}.`:'';
    if(Number.isFinite(rush)&&rush>0)text+=` He also carried ${rush} ${plural(rush,'time')} for ${Number.isFinite(rushYd)?rushYd:0} yards${Number.isFinite(rushTd)&&rushTd>0?' and '+rushTd+' rushing '+plural(rushTd,'touchdown'):''}.`;
    if(text)return text.trim();
  }
  if(pos==='RB'){
    const carries=Number(s.rush_att),rushYd=Number(s.rush_yd),rushTd=Number(s.rush_td),targets=Number(s.rec_tgt??s.targets),rec=Number(s.rec),recYd=Number(s.rec_yd),recTd=Number(s.rec_td),parts=[];
    if(Number.isFinite(carries))parts.push(`${n} ran ${carries} ${plural(carries,'time')} for ${Number.isFinite(rushYd)?rushYd:0} yards${Number.isFinite(rushTd)&&rushTd>0?', scoring '+rushTd+' rushing '+plural(rushTd,'touchdown'):''}.`);
    if(Number.isFinite(targets))parts.push(`He caught ${Number.isFinite(rec)?rec:0} of ${targets} targets for ${Number.isFinite(recYd)?recYd:0} yards${Number.isFinite(recTd)&&recTd>0?' and '+recTd+' receiving '+plural(recTd,'touchdown'):''}.`);
    if(parts.length)return parts.join(' ');
  }
  if(pos==='WR'||pos==='TE'){
    const targets=Number(s.rec_tgt??s.targets),rec=Number(s.rec),yd=Number(s.rec_yd),td=Number(s.rec_td);
    if(Number.isFinite(targets))return `${n} caught ${Number.isFinite(rec)?rec:0} of ${targets} targets for ${Number.isFinite(yd)?yd:0} yards${Number.isFinite(td)&&td>0?', scoring '+td+' '+plural(td,'touchdown'):''}.`;
  }
  const solo=Number(s.tkl_solo??s.idp_tkl_solo),ast=Number(s.tkl_ast??s.idp_tkl_ast),total=Number(s.tkl??s.idp_tkl),sacks=Number(s.sack??s.idp_sack),tfl=Number(s.tkl_loss??s.tfl??s.idp_tkl_loss??s.idp_tfl),qb=Number(s.qb_hit??s.idp_qb_hit),pd=Number(s.pass_def??s.idp_pass_def),ints=Number(s.int??s.idp_int),ff=Number(s.ff??s.idp_ff),snaps=Number(s.def_snp??s.def_snaps??s.defensive_snaps),bits=[];
  if(Number.isFinite(solo))bits.push(`${solo} solo ${plural(solo,'tackle')}`);
  if(Number.isFinite(ast)&&ast>0)bits.push(`${ast} assisted ${plural(ast,'tackle')}`);
  if(!Number.isFinite(solo)&&!Number.isFinite(ast)&&Number.isFinite(total)&&total>0)bits.push(`${total} total ${plural(total,'tackle')}`);
  if(Number.isFinite(sacks)&&sacks>0)bits.push(`${sacks} ${plural(sacks,'sack')}`);
  if(Number.isFinite(tfl)&&tfl>0)bits.push(`${tfl} ${plural(tfl,'tackle for loss','tackles for loss')}`);
  if(Number.isFinite(qb)&&qb>0)bits.push(`${qb} QB ${plural(qb,'hit')}`);
  if(Number.isFinite(pd)&&pd>0)bits.push(`${pd} ${plural(pd,'pass breakup')}`);
  if(Number.isFinite(ints)&&ints>0)bits.push(`${ints} ${plural(ints,'interception')}`);
  if(Number.isFinite(ff)&&ff>0)bits.push(`${ff} forced ${plural(ff,'fumble')}`);
  if(bits.length){
    let text=`${n} finished with ${bits.join(', ')}.`;
    if(Number.isFinite(snaps)&&snaps<=25&&Number(p?.points)>=12)text+=` He did it in only ${snaps} defensive snaps.`;
    return text;
  }
  const line=String(p?.real_stat_line||'').split(/\s*•\s*|\s*,\s*/).map(x=>x.trim()).filter(x=>x&&!/\b(?:def(?:ensive)?\s+)?snaps?\b/i.test(x)).join(', ');
  return line?`${n} finished with ${line}.`:null;
}

function scopedFootballRead(t,p,angle='matchup'){
  const raw=statSituation(p);if(!raw)return null;
  const compact=String(raw).trim().replace(/\.\s+He\s+/g,', and he ').replace(/\.\s+/g,'; ').replace(/\.$/,'');
  const prefix=angle==='opponent'?`Against ${t.team_name}, `:angle==='next-opponent'?`Looking ahead to ${t.team_name}’s next matchup, `:angle==='supporting-cast'?`Behind the ${t.team_name} headline, `:`For ${t.team_name}, `;
  return prefix+compact+'.';
}

function teamDefenseUsage(p){
  const s=p?.real_stats||{},solo=Number(s.tkl_solo??s.idp_tkl_solo),ast=Number(s.tkl_ast??s.idp_tkl_ast),total=Number(s.tkl??s.idp_tkl),sacks=Number(s.sack??s.idp_sack),tfl=Number(s.tkl_loss??s.tfl??s.idp_tkl_loss??s.idp_tfl),qb=Number(s.qb_hit??s.idp_qb_hit),pd=Number(s.pass_def??s.idp_pass_def),ints=Number(s.int??s.idp_int),ff=Number(s.ff??s.idp_ff),snaps=Number(s.def_snp??s.def_snaps??s.defensive_snaps),points=Number(p?.points),parts=[];
  const tackles=(Number.isFinite(total)&&total>0)?total:(Number.isFinite(solo)?solo:0)+(Number.isFinite(ast)?ast:0);
  if(tackles>0)parts.push(`${tackles} total ${tackles===1?'tackle':'tackles'}`);
  if(Number.isFinite(sacks)&&sacks>0)parts.push(`${sacks} ${sacks===1?'sack':'sacks'}`);
  if(Number.isFinite(tfl)&&tfl>0)parts.push(`${tfl} ${tfl===1?'tackle for loss':'tackles for loss'}`);
  if(Number.isFinite(qb)&&qb>0)parts.push(`${qb} QB ${qb===1?'hit':'hits'}`);
  if(Number.isFinite(pd)&&pd>0)parts.push(`${pd} ${pd===1?'pass breakup':'pass breakups'}`);
  if(Number.isFinite(ints)&&ints>0)parts.push(`${ints} ${ints===1?'interception':'interceptions'}`);
  if(Number.isFinite(ff)&&ff>0)parts.push(`${ff} forced ${ff===1?'fumble':'fumbles'}`);
  if(parts.length)return {strong:tackles>=6||Number(sacks)>=1.5||Number(ints)>=1||Number(ff)>=1||Number(qb)>=2,text:parts.slice(0,3).join(', '),limited_snap:false,snaps:Number.isFinite(snaps)?snaps:null};
  if(Number.isFinite(snaps))return {strong:snaps>=40,text:`${snaps} defensive snaps`,limited_snap:snaps<=25,snaps};
  return null;
}

function teamOpportunity(p){
  const s=p?.real_stats||{},position=String(p?.position||'').toUpperCase(),count=(n,oneWord,manyWord=oneWord+'s')=>Number(n)===1?oneWord:manyWord;
  if(position==='RB'){
    const carries=Number(s.rush_att),targets=Number(s.rec_tgt??s.targets),parts=[];
    if(Number.isFinite(carries))parts.push(`${carries} ${count(carries,'carry','carries')}`);
    if(Number.isFinite(targets))parts.push(`${targets} ${count(targets,'target')}`);
    if(parts.length)return {strong:(carries||0)>=12||(targets||0)>=5,text:parts.join(' and '),limited_snap:false};
  }
  if(position==='WR'||position==='TE'){const targets=Number(s.rec_tgt??s.targets);if(Number.isFinite(targets))return {strong:targets>=6,text:`${targets} ${count(targets,'target')}`,limited_snap:false};}
  if(position==='QB'){
    const att=Number(s.pass_att),rush=Number(s.rush_att),parts=[];
    if(Number.isFinite(att))parts.push(`${att} pass ${count(att,'attempt')}`);
    if(Number.isFinite(rush))parts.push(`${rush} ${count(rush,'carry','carries')}`);
    if(parts.length)return {strong:(att||0)>=25||(rush||0)>=6,text:parts.join(' and '),limited_snap:false};
  }
  return teamDefenseUsage(p);
}

function teamStatLine(p){
  const s=p?.real_stats||{},pos=String(p?.position||'').toUpperCase(),n=p?.name||'The player',count=(x,oneWord,manyWord=oneWord+'s')=>Number(x)===1?oneWord:manyWord;
  if(pos==='QB'){
    const cmp=Number(s.pass_cmp),att=Number(s.pass_att),yd=Number(s.pass_yd),td=Number(s.pass_td),ints=Number(s.pass_int),rush=Number(s.rush_att),rushYd=Number(s.rush_yd),rushTd=Number(s.rush_td);
    if(Number.isFinite(cmp)&&Number.isFinite(att)){let text=`${n} completed ${cmp} of ${att} passes`;if(Number.isFinite(yd))text+=` for ${yd} yards`;if(Number.isFinite(td)&&td>0)text+=`, throwing ${td} ${count(td,'touchdown')}`;if(Number.isFinite(ints)&&ints>0)text+=` with ${ints} ${count(ints,'interception')}`;if(Number.isFinite(rush)&&rush>0)text+=`, and added ${rush} ${count(rush,'carry','carries')} for ${Number.isFinite(rushYd)?rushYd:0} rushing yards${Number.isFinite(rushTd)&&rushTd>0?', including '+rushTd+' rushing '+count(rushTd,'touchdown'):''}`;return text+'.';}
  }
  if(pos==='RB'){
    const carries=Number(s.rush_att),rushYd=Number(s.rush_yd),rushTd=Number(s.rush_td),targets=Number(s.rec_tgt??s.targets),rec=Number(s.rec),recYd=Number(s.rec_yd),recTd=Number(s.rec_td);let text='';
    if(Number.isFinite(carries))text=`${n} carried ${carries} ${count(carries,'time')} for ${Number.isFinite(rushYd)?rushYd:0} yards${Number.isFinite(rushTd)&&rushTd>0?', scoring '+rushTd+' rushing '+count(rushTd,'touchdown'):''}`;
    if(Number.isFinite(targets)){const receiving=`caught ${Number.isFinite(rec)?rec:0} of ${targets} targets for ${Number.isFinite(recYd)?recYd:0} yards${Number.isFinite(recTd)&&recTd>0?', adding '+recTd+' receiving '+count(recTd,'touchdown'):''}`;text+=text?`, and ${receiving}`:`${n} ${receiving}`;}if(text)return text+'.';
  }
  if(pos==='WR'||pos==='TE'){const targets=Number(s.rec_tgt??s.targets),rec=Number(s.rec),yd=Number(s.rec_yd),td=Number(s.rec_td);if(Number.isFinite(targets))return `${n} caught ${Number.isFinite(rec)?rec:0} of ${targets} targets for ${Number.isFinite(yd)?yd:0} yards${Number.isFinite(td)&&td>0?', scoring '+td+' '+count(td,'touchdown'):''}.`;}
  const solo=Number(s.tkl_solo??s.idp_tkl_solo),ast=Number(s.tkl_ast??s.idp_tkl_ast),total=Number(s.tkl??s.idp_tkl),sacks=Number(s.sack??s.idp_sack),tfl=Number(s.tkl_loss??s.tfl??s.idp_tkl_loss??s.idp_tfl),qb=Number(s.qb_hit??s.idp_qb_hit),pd=Number(s.pass_def??s.idp_pass_def),ints=Number(s.int??s.idp_int),ff=Number(s.ff??s.idp_ff),bits=[];
  if(Number.isFinite(solo))bits.push(`${solo} solo ${count(solo,'tackle')}`);if(Number.isFinite(ast)&&ast>0)bits.push(`${ast} assisted ${count(ast,'tackle')}`);if(!Number.isFinite(solo)&&!Number.isFinite(ast)&&Number.isFinite(total)&&total>0)bits.push(`${total} total ${count(total,'tackle')}`);if(Number.isFinite(sacks)&&sacks>0)bits.push(`${sacks} ${count(sacks,'sack')}`);if(Number.isFinite(tfl)&&tfl>0)bits.push(`${tfl} ${count(tfl,'tackle for loss','tackles for loss')}`);if(Number.isFinite(qb)&&qb>0)bits.push(`${qb} QB ${count(qb,'hit')}`);if(Number.isFinite(pd)&&pd>0)bits.push(`${pd} ${count(pd,'pass breakup')}`);if(Number.isFinite(ints)&&ints>0)bits.push(`${ints} ${count(ints,'interception')}`);if(Number.isFinite(ff)&&ff>0)bits.push(`${ff} forced ${count(ff,'fumble')}`);
  const role=teamDefenseUsage(p);
  if(bits.length){let text=`${n} finished with ${bits.join(', ')}.`;if(role?.limited_snap)text+=` He did it on only ${role.snaps} defensive snaps, one of the rare cases where the snap count actually makes the performance more interesting.`;return text;}
  if(role?.limited_snap)return `${n} produced ${one(p.points)} fantasy points on only ${role.snaps} defensive snaps, unusually efficient work in a genuinely limited role.`;
  if(Number.isFinite(role?.snaps))return `${n} played ${role.snaps} defensive snaps.`;
  const line=String(p?.real_stat_line||'').split(/\s*•\s*|\s*,\s*/).map(x=>x.trim()).filter(x=>x&&!/\b(?:def(?:ensive)?\s+)?snaps?\b/i.test(x)).join(', ');return line?`${n} finished with ${line}.`:null;
}


function focusedPlayerStatsV32(players){
  return (players||[]).filter(Boolean).map(p=>{
    const fp=valid(p?.points)?one(p.points)+" fantasy points":null,clause=statClause(p);
    if(fp&&clause)return p.name+": "+fp+"; "+clause+".";
    if(fp)return p.name+": "+fp+".";
    if(clause)return p.name+": "+clause+".";
    return p.name+".";
  }).join(" ");
}

function playerEditorialReadV32(t,r,f=articleFrameV29(t,r)){
  const trio=[f.top,f.second,f.third].filter(Boolean),team=teamIdentityV28(t).mascot,scope=String(t.division_name||t.conference||'this league');
  if(trio.length<3||trio.some(p=>Number(p?.points)<18))return null;
  const establishedSupport=trio.slice(1).find(p=>establishedStarV29(p)),twoWay=trio.some(defensivePlayer)&&trio.some(p=>!defensivePlayer(p)),
    concentrated=Number(f.share)>=.7,names=naturalJoin(trio.map(p=>p.name)),v=voice(r);
  if(v===0){
    if(establishedSupport)return "For "+team+" in "+scope+", "+establishedSupport.name+" showing up as support instead of emergency rescue is the part worth keeping. "+names+" give "+team+" more than one independent way to build a winning score, which makes one ordinary star week less dangerous. I have seen worse roster problems. Usually on purpose.";
    if(twoWay)return names+" gave "+team+" production from both sides of the lineup. That matters because an IDP eruption did not have to cover for an empty offense, or vice versa. Depth that travels across positions is harder to game-plan around than one hot hand, inconveniently enough for everybody else.";
    if(concentrated)return names+" did enough of the scoring that the compliment comes with a warning label. The stars are real; the lower half still has to prove it can survive one merely normal Sunday from the top of the card. Nothing ruins a nice September clipping like discovering it needed three perfect performances.";
    return names+" gave "+team+" a genuinely layered scoring base. The useful takeaway is not that several players scored; it is that the roster had multiple ways to reach the same result. That is how a good week starts looking repeatable instead of lucky.";
  }
  if(v===1){
    if(establishedSupport)return establishedSupport.name+" functioning as a luxury rather than a life raft is the indulgence here in "+scope+". "+names+" force opponents to wait for several good players to fail at once, an awfully rude requirement. For "+team+" in "+scope+", I would call that roster leverage before I called it beautiful, though it is flirting with both.";
    if(twoWay)return names+" turned "+team+" into a two-sided nuisance: offense and IDP both supplied real leverage. A roster that can win from different rooms of the house is harder to embarrass when one chandelier falls. How disappointingly practical.";
    if(concentrated)return names+" supplied a glamorous amount of the total, which is exactly why the quiet chairs still deserve inspection. A top-heavy lineup is exquisite until one star has the indecency to be human.";
    return names+" gave "+team+" an ensemble instead of a recital. The important part is that the paths to production were different enough to survive one performer missing a note. I hate to reward practicality, but here we are.";
  }
  if(v===2){
    if(establishedSupport)return establishedSupport.name.toUpperCase()+" AS THE SUPPORTING LUXURY IS THE SCARY PART IN "+scope.toUpperCase()+". "+names.toUpperCase()+" GIVE "+team.toUpperCase()+" MULTIPLE WAYS TO HURT SOMEBODY, SO ONE QUIET STAR WEEK DOES NOT AUTOMATICALLY BECOME A FIRE DRILL. FOR "+team.toUpperCase()+" IN "+scope.toUpperCase()+", I WOULD LIKE TO FILE A COMPLAINT ON BEHALF OF THE SCHEDULE.";
    if(twoWay)return names.toUpperCase()+" HIT FROM OFFENSE AND IDP IN "+scope.toUpperCase()+". FOR "+team.toUpperCase()+", THAT IS NOT JUST THREE NICE BOX-SCORE LINES; IT IS THREE DIFFERENT WAYS TO RUIN AN OPPONENT'S SUNDAY. VERY INCONSIDERATE. KEEP IT.";
    if(concentrated)return names.toUpperCase()+" DID A LOT OF THE HEAVY LIFTING. GREAT. NOW THE REST OF "+team.toUpperCase()+" HAS TO PROVE THIS IS A LINEUP AND NOT THREE PEOPLE RUNNING A RESCUE MISSION WITH MATCHING UNIFORMS.";
    return names.toUpperCase()+" GAVE "+team.toUpperCase()+" REAL SCORING WIDTH. NOT ONE MIRACLE, NOT ONE LUCKY BUTTON, MULTIPLE USEFUL PATHS. I AM TRYING TO BE NORMAL ABOUT IT AND FAILING.";
  }
  if(establishedSupport)return establishedSupport.name+" appearing as support instead of the sole source of oxygen changes the risk profile for "+team+" in "+scope+". "+names+" create several independent scoring paths, so an opponent needs more than one favorable failure to crack the lineup. For "+team+" in "+scope+", I am comfortable calling that meaningful leverage; I am not issuing immunity from next week.";
  if(twoWay)return names+" produced across offensive and IDP lanes, which makes the "+team+" total harder to dismiss as one isolated spike. Different sources of production reduce the chance that one role failure collapses the whole case. Annoyingly, the evidence is fairly clean.";
  if(concentrated)return names+" carried enough of the "+team+" total to create a dependency question alongside the praise. The evidence supports the stars; it does not yet clear the quieter lineup spots. One normal week from the leaders will test that distinction quickly.";
  return names+" gave "+team+" several independent sources of useful production. That is stronger evidence than a single ceiling game because the lineup did not need one player to explain everything. I will still be checking whether the same roles survive contact with Week 2.";
}

function deMetaReporterFunctionsV32(value,r){
  let text=String(value??"");
  const id=String(r?.id||"");
  const banks={
    "walter-mercer":[
      [/\bNick’s\b/g,"my"],[/\bNick will\b/g,"I’ll"],[/\bNick would\b/g,"I would"],[/\bNick wants\b/g,"I want"],[/\bNick sees\b/g,"I see"],[/\bNick circles\b/g,"I circle"],[/\bNick can\b/g,"I can"],[/\bNick keeps\b/g,"I keep"],[/\bNick trusts\b/g,"I trust"],[/\bNick is keeping\b/g,"I’m keeping"],[/\bNick has seen\b/g,"I’ve seen"],[/\bNick calls\b/g,"I call"],[/\bNick starts\b/g,"I start"],[/\bNick refuses\b/g,"I refuse"],[/\bNick considers\b/g,"I consider"],[/\bleaves Nick watching\b/g,"leaves me watching"],[/\bgets Nick’s\b/g,"gets my"]
    ],
    "tess-delaney":[
      [/\bBartholomew’s\b/g,"my"],[/\bBartholomew will\b/g,"I’ll"],[/\bBartholomew would\b/g,"I would"],[/\bBartholomew wants\b/g,"I want"],[/\bBartholomew can\b/g,"I can"],[/\bBartholomew accepts\b/g,"I accept"],[/\bBartholomew respects\b/g,"I respect"],[/\bBartholomew adores\b/g,"I adore"],[/\bBartholomew refuses\b/g,"I refuse"],[/\bBartholomew keeps\b/g,"I keep"],[/\bBartholomew is more interested\b/g,"I’m more interested"],[/\bBartholomew grants\b/g,"I grant"],[/\bBartholomew considers\b/g,"I consider"],[/\bBartholomew appreciates\b/g,"I appreciate"],[/\bBartholomew starts\b/g,"I start"],[/\bBartholomew calls\b/g,"I call"],[/\bBartholomew sees\b/g,"I see"],[/\bgave Bartholomew\b/g,"gave me"],[/\bleaves Bartholomew\b/g,"leaves me"]
    ],
    "mack-hollis":[
      [/\bTilly’s\b/g,"my"],[/\bTilly starts\b/g,"I start"],[/\bTilly does\b/g,"I do"],[/\bTilly would\b/g,"I would"],[/\bTilly resents\b/g,"I resent"],[/\bTilly calls\b/g,"I call"],[/\bTilly will\b/g,"I’ll"],[/\bTilly keeps\b/g,"I keep"],[/\bTilly wants\b/g,"I want"],[/\bTilly has\b/g,"I have"],[/\bTilly is\b/g,"I’m"],[/\bTilly thinks\b/g,"I think"],[/\bTilly can\b/g,"I can"],[/\bTilly sees\b/g,"I see"]
    ],
    "nora-voss":[
      [/\bFilch’s\b/g,"my"],[/\bFilch would\b/g,"I would"],[/\bFilch recommends\b/g,"I recommend"],[/\bFilch enters\b/g,"I enter"],[/\bFilch treats\b/g,"I treat"],[/\bFilch does\b/g,"I do"],[/\bFilch starts\b/g,"I start"],[/\bFilch wants\b/g,"I want"],[/\bFilch sees\b/g,"I see"],[/\bFilch considers\b/g,"I consider"],[/\bFilch records\b/g,"I record"],[/\bFilch separates\b/g,"I separate"],[/\bFilch keeps\b/g,"I keep"],[/\bFilch leaves\b/g,"I leave"],[/\bFilch reads\b/g,"I read"],[/\bFilch marks\b/g,"I mark"],[/\bFilch thinks\b/g,"I think"],[/\bFilch will\b/g,"I’ll"],[/\bFilch has\b/g,"I have"]
    ]
  };
  for(const [re,to] of banks[id]||[])text=text.replace(re,to);
  text=text.replace(/(^|[.!?]\s+)(my\b)/g,(m,p)=>p+'My');
  return text;
}
const TILLY_ACRONYMS_V33=new Set(['IDP','QB','RB','WR','TE','DL','DE','DT','LB','DB','CB','FS','SS','ILB','OLB','NT','NFL','TFL','PPR','AFC','NFC']);
function normalizeTillyCaseV33(value,properNames=[]){
  let text=String(value??'');
  text=text.replace(/\b[A-Z][A-Z0-9'’.-]*[A-Z0-9]\b/g,w=>TILLY_ACRONYMS_V33.has(w)?w:w.toLowerCase());
  text=text.replace(/(^|[.!?]\s+|:\s+)([“"'‘(]*)([a-z])/g,(m,p,q,c)=>p+q+c.toUpperCase());
  const names=[...new Set((properNames||[]).map(x=>String(x||'').trim()).filter(Boolean))].sort((a,b)=>b.length-a.length);
  for(const name of names)text=text.replace(new RegExp(escapeRe(name),'gi'),name);
  return text;
}
function teamProperNamesV33(t,r){
  return [...articlePlayers(t).map(p=>p.name),...(t?.trade_acquisitions||[]).flatMap(a=>[a?.player_name,...(a?.outgoing_player_names||[])]),t?.team_name,t?.manager_name,t?.opponent_name,t?.next_opponent_name,t?.division_name,t?.conference,r?.name].filter(Boolean);
}
function finalReporterCaseV33(t,r,value){
  return r?.id==='mack-hollis'?normalizeTillyCaseV33(value,teamProperNamesV33(t,r)):String(value??'');
}
function grammarSafeTeamVerbsV35(names,value){
  let text=String(value??"");
  const map={is:"are",has:"have",gets:"get",holds:"hold",brings:"bring",turns:"turn"};
  const candidates=[...new Set((names||[]).map(x=>String(x||"").trim()).filter(Boolean))].sort((a,b)=>b.length-a.length);
  for(const name of candidates){
    const mascot=name.split(/\s+/).filter(Boolean).at(-1)||"";
    if(!/s$/i.test(mascot))continue;
    const re=new RegExp("(^|[^A-Za-z0-9])("+escapeRe(name)+")\\s+(is|has|gets|holds|brings|turns)\\b","gi");
    text=text.replace(re,(m,p,n,v)=>p+n+" "+(map[String(v).toLowerCase()]||v));
  }
  return text;
}
function articleGrammarV35(t,value){
  const id=teamIdentityV28(t),names=[t?.team_name,id?.mascot,t?.opponent_name,t?.next_opponent_name];
  return grammarSafeTeamVerbsV35(names,value);
}

function threeHighScorersV33(f){
  const trio=[f?.top,f?.second,f?.third].filter(Boolean);
  return trio.length===3&&trio.every(p=>Number(p?.points)>=18);
}
function playerContextLabelV33(p){
  const pos=String(p?.position||'player').toUpperCase(),age=Number(p?.age),years=Number(p?.years_exp);
  const stage=(Number.isFinite(years)&&years<=2)||(Number.isFinite(age)&&age<=24)?'young':(Number.isFinite(years)&&years>=7)||(Number.isFinite(age)&&age>=30)?'veteran':'prime-age';
  return stage+' '+pos;
}
function playerUsageReadV34(t,p){
  const s=p?.real_stats||{},pos=String(p?.position||'').toUpperCase(),rows=articlePlayers(t)||[],
    n=(...keys)=>{for(const k of keys){const v=Number(s?.[k]);if(Number.isFinite(v))return v}return null},
    rowN=(row,...keys)=>{const rs=row?.real_stats||{};for(const k of keys){const v=Number(rs?.[k]);if(Number.isFinite(v))return v}return null};
  if(pos==='WR'||pos==='TE'){
    const targets=n('rec_tgt','targets'),rec=n('rec'),yards=n('rec_yd'),td=n('rec_td'),
      teamTargets=rows.reduce((sum,row)=>{const v=rowN(row,'rec_tgt','targets');return sum+(Number.isFinite(v)?v:0)},0);
    return {pos,targets,rec,yards,td,targetShare:Number.isFinite(targets)&&teamTargets>0?targets/teamTargets:null,
      catchRate:Number.isFinite(rec)&&Number.isFinite(targets)&&targets>0?rec/targets:null,
      yardsPerTarget:Number.isFinite(yards)&&Number.isFinite(targets)&&targets>0?yards/targets:null};
  }
  if(pos==='RB'){
    const carries=n('rush_att'),rushYards=n('rush_yd'),rushTd=n('rush_td'),targets=n('rec_tgt','targets'),rec=n('rec'),recYards=n('rec_yd'),recTd=n('rec_td'),
      touches=(Number.isFinite(carries)?carries:0)+(Number.isFinite(targets)?targets:0),
      teamTouches=rows.reduce((sum,row)=>{const rs=row?.real_stats||{},c=Number(rs.rush_att),tg=Number(rs.rec_tgt??rs.targets);return sum+(Number.isFinite(c)?c:0)+(Number.isFinite(tg)?tg:0)},0);
    return {pos,carries,rushYards,rushTd,targets,rec,recYards,recTd,touches,touchShare:teamTouches>0?touches/teamTouches:null,
      ypc:Number.isFinite(rushYards)&&Number.isFinite(carries)&&carries>0?rushYards/carries:null};
  }
  if(pos==='QB'){
    const attempts=n('pass_att'),passYards=n('pass_yd'),passTd=n('pass_td'),ints=n('pass_int'),rushAtt=n('rush_att'),rushYards=n('rush_yd');
    return {pos,attempts,passYards,passTd,ints,rushAtt,rushYards,ypa:Number.isFinite(passYards)&&Number.isFinite(attempts)&&attempts>0?passYards/attempts:null};
  }
  const solo=n('tkl_solo','idp_tkl_solo'),ast=n('tkl_ast','idp_tkl_ast'),total=n('tkl','idp_tkl'),
    tackles=Number.isFinite(total)?total:(Number.isFinite(solo)?solo:0)+(Number.isFinite(ast)?ast:0),
    sacks=n('sack','idp_sack'),qbHits=n('qb_hit','idp_qb_hit'),ints=n('int','idp_int'),ff=n('ff','idp_ff'),
    snaps=n('def_snp','def_snaps','defensive_snaps');
  return {pos,tackles,sacks,qbHits,ints,ff,snaps,pressurePlays:(Number.isFinite(sacks)?sacks:0)+(Number.isFinite(qbHits)?qbHits:0)};
}

function matchupMoodV35(t){
  const won=Number(t?.points)>Number(t?.opponent_points),margin=Math.abs(Number(t?.points)-Number(t?.opponent_points)),
    projected=Number(t?.projected),oppProjected=Number(t?.opponent_projected),
    hasProjection=Number.isFinite(projected)&&Number.isFinite(oppProjected),
    underdog=hasProjection&&projected+5<=oppProjected,favorite=hasProjection&&projected>=oppProjected+5,
    team=teamIdentityV28(t).mascot,opp=String(t?.opponent_name||"the opponent"),score=one(t?.points)+"–"+one(t?.opponent_points);
  return{won,margin,projected,oppProjected,hasProjection,underdog,favorite,team,opp,score};
}

function playerStatInsightV33(t,p,r){
  if(!p)return null;
  const m=playerUsageReadV34(t,p),q=matchupMoodV35(t),name=p.name,pos=String(p.position||"player").toUpperCase(),v=voice(r),
    key=String(t.roster_id)+":"+String(p.id||name)+":matchup-commentary-v35:"+String(r?.id||"");
  let football="";
  if(pos==="QB"){
    const rows=q.won&&q.underdog?[
      name+" made "+q.opp+" spend the afternoon reacting instead of dictating. The pregame favorite never got the comfortable script it expected, and "+q.team+" kept pushing the pressure back across the matchup.",
      name+" turned "+q.opp+"’s paper advantage into a bad joke. The favorite kept searching for control while "+q.team+" kept finding another answer.",
      name+" was the reason "+q.opp+"’s favorite status aged badly. "+q.team+" did not need a miracle; it needed its quarterback to make the favorite chase.",
      name+" changed the posture of the game. "+q.opp+" entered with the edge and finished reacting to "+q.team+"."
    ]:q.won&&q.margin>=20?[
      name+" gave "+q.team+" control instead of drama. Once "+q.opp+" fell behind, the game stopped asking for hero ball and started asking whether the opponent had any answer at all.",
      name+" kept "+q.opp+" on the wrong side of the scoreboard until the matchup became damage control.",
      q.team+" did not need late-game magic from "+name+"; it needed him to make "+q.opp+" chase early and keep chasing.",
      name+" turned the afternoon into a long defensive meeting for "+q.opp+"."
    ]:q.won&&q.margin<=7?[
      name+" mattered because "+q.team+" had almost no room for a wasted possession. Against "+q.opp+", every successful answer kept a one-score game from tipping the other way.",
      q.opp+" stayed close enough to punish one empty stretch, and "+name+" kept that punishment from arriving.",
      name+" had to keep answering because "+q.opp+" never went away. In a game this tight, control mattered more than a pretty stat profile.",
      q.opp+" made this uncomfortable, which made "+name+"’s best possessions more valuable."
    ]:!q.won&&q.favorite?[
      name+" never turned "+q.team+"’s pregame edge into control. "+q.opp+" kept the favorite uncomfortable long enough for the scoreboard to become an accusation rather than a surprise.",
      q.team+" was supposed to make "+q.opp+" chase. Instead, "+name+" and the offense spent too much of the day answering someone else’s game.",
      name+" had a matchup that was supposed to belong to "+q.team+"; "+q.opp+" stole the terms of engagement.",
      q.opp+" refused to let "+name+" make the game orderly. For a favorite, losing control is the uglier story than any one fantasy total."
    ]:[
      name+" gave "+q.team+" moments, but "+q.opp+" kept the leverage. Useful quarterback production feels different when the opponent is still deciding what kind of game everyone is playing.",
      q.opp+" kept forcing "+q.team+" to answer instead of letting "+name+" set the terms.",
      name+" gave "+q.team+" something to work with, but "+q.opp+" kept finding the better response.",
      q.team+" got enough from "+name+" to stay in the conversation and not enough to control it."
    ];
    football=keyedChoice(key,rows);
  }else if(pos==="WR"||pos==="TE"){
    const redZone=Number(m?.td)>=2;
    const rows=[
      q.won?name+" kept giving "+q.opp+" a coverage problem it never solved. "+q.team+" could return to the same matchup without making it feel predictable.":name+" gave "+q.opp+" a problem, but "+q.team+" could not make that problem decide the game.",
      q.underdog&&q.won?name+" helped turn the favorite into the team doing the chasing. "+q.opp+" kept having to decide how much help it could afford to send his way.":name+" forced "+q.opp+" to keep accounting for him, and the defense never got to settle into the coverage it wanted.",
      q.margin<=7?name+" was dangerous in exactly the kind of game where one catch or one missed assignment becomes the story everyone remembers.":name+" made "+q.opp+" pay attention all afternoon. "+q.opp+" saw "+name+" becoming the problem and still never made him disappear.",
      q.won?name+" gave "+q.team+" a receiving threat "+q.opp+" never fully pushed out of the script.":name+" had enough success to make "+q.opp+" uncomfortable, but not enough help around him to turn discomfort into defeat.",
      q.won?name+" kept dragging extra attention into his part of the field, and "+q.team+" kept making "+q.opp+" pay for leaving the matchup unresolved.":q.opp+" spent too much of the afternoon shading help toward "+name+" for the threat to be considered harmless.",
      q.margin<=7?name+" kept one defender from feeling sufficient, which is exactly how a close game starts bending toward one receiver.":q.opp+" never found a coverage answer that made "+name+" disappear from the important snaps.",
      q.underdog&&q.won?name+" helped make the favorite defend scared; every adjustment toward him opened another place for "+q.team+" to breathe.":name+" made "+q.opp+" keep changing the picture after the snap, even if "+q.team+" never turned that stress into a win.",
      q.won?name+" kept winning enough attention that "+q.opp+" had to treat his side of the field like a recurring emergency.":name+" made "+q.opp+" spend real defensive attention on him, which kept the matchup from ever feeling routine."
    ];
    football=keyedChoice(key,rows)+(redZone?" By the high-leverage snaps, "+q.opp+" was already choosing between overreacting to "+name+" and risking another punishment.":"");
  }else if(pos==="RB"){
    football=keyedChoice(key,[
      q.won?name+" gave "+q.team+" a way to make "+q.opp+" feel the score, not just see it. Every useful series shortened the opponent’s patience.":name+" gave "+q.team+" enough backfield work to stay credible, but "+q.opp+" never had to abandon its own plan.",
      q.underdog&&q.won?name+" helped the underdog stay on schedule and kept "+q.opp+" from turning the afternoon into the chase it expected.":name+" kept "+q.opp+" from treating every snap like an obvious passing situation.",
      q.margin<=7?name+" mattered in a game where every possession felt rented by the minute. "+q.opp+" never gave "+q.team+" room to waste touches.":name+" helped "+q.team+" control the temperature of the matchup instead of letting "+q.opp+" dictate pace.",
      q.won?name+" helped turn a winning script into something "+q.opp+" could not easily speed up.":q.opp+" never let "+name+"’s work become game control, which left "+q.team+" with production that felt better in the box score than on the scoreboard."
    ]);
  }else{
    const pressure=(Number(m?.qbHits)||0)+(Number(m?.sacks)||0),takeaway=(Number(m?.ints)||0)+(Number(m?.ff)||0);
    football=keyedChoice(key,[
      q.won&&pressure>=3?name+" kept dragging "+q.opp+" into hurried decisions. The opponent started calling plays while wondering where the next hit was coming from.":q.won?name+" made "+q.opp+" earn its offensive possessions instead of letting the game become an exchange of easy scores.":name+" gave "+q.team+" defensive resistance, but "+q.opp+" still found enough clean possessions to win.",
      q.underdog&&q.won?name+" helped make the favorite uncomfortable on the side of the ball it expected to control. "+q.opp+" spent too many possessions playing through disruption.":name+" was part of the reason "+q.opp+" never got to treat this as a clean offensive afternoon.",
      q.margin<=7?name+" mattered because there was no garbage time to hide in. Every tackle, pressure or broken play arrived in a game where one clean possession could have changed the result.":q.won?name+" helped keep "+q.opp+" from finding the easy path back into the game.":name+" made enough plays to deserve credit even though "+q.opp+" won.",
      takeaway?name+" gave the matchup the kind of defensive jolt that changes a sideline instantly. "+q.opp+" went from building a drive to dealing with the consequences of losing the football.":keyedChoice(key+":idp-disruption",[name+" made "+q.opp+" work harder for its offense. "+q.opp+" spent too many snaps accounting for where "+name+" was coming from.",name+" kept showing up in the part of the game "+q.opp+" wanted to make comfortable. By the end, the defense had turned his presence into one more thing the offense had to solve.",keyedChoice(key+":idp-clean-possession",[q.opp+" could not string together a comfortable afternoon because "+name+" kept turning ordinary possessions into contested ones.",name+" kept showing up where "+q.opp+" expected clean football, forcing the offense to spend more attention on him than it wanted.",q.opp+" kept trying to settle into routine possessions and "+name+" kept making those snaps feel crowded.",name+" made the supposedly easy parts of "+q.opp+"’s afternoon expensive, repeatedly inserting himself before the offense could relax.",q.opp+" never got to treat "+name+" as background noise; his presence kept changing how ordinary possessions had to be handled.",name+" kept disturbing the part of the game "+q.opp+" wanted to make routine, which is how a defender starts changing play-calling without needing a turnover.",q.opp+" had to keep planning around "+name+" because too many normal possessions became uncomfortable when he entered the picture.",name+" kept turning "+q.opp+"’s cleanest-looking possessions into work, and by the end the offense was accounting for him before the snap."]),name+" did not need a turnover to make himself felt. "+q.opp+" kept having to finish drives with "+name+" somewhere in the problem, which is exactly the kind of defensive nuisance "+q.team+" needed."])
    ]);
  }
  const close=[
    q.won?"I keep coming back to "+name+" because "+q.opp+" had to change how it played around him; "+q.team+" got the better end of that adjustment.":"I can praise "+name+" without pretending "+q.team+" won; "+q.opp+" got the result, but the player still made part of the afternoon difficult.",
    q.won?"I’ll take the compliment because "+q.opp+" spent too much of Sunday rearranging itself around "+name+"; that is the sort of inconvenience a good player should create.":"I hate that "+name+" gave "+q.team+" something real and "+q.opp+" still left with the better evening; the performance deserved more help.",
    q.won?name+" made "+q.opp+" miserable enough to matter; "+q.team+" kept finding the same pressure point and "+q.opp+" never found a comfortable answer.":name+" gave "+q.team+" useful football and "+q.opp+" still got to celebrate; that is a good performance trapped inside an ending nobody wanted.",
    q.won?"I like this because "+name+" made "+q.opp+" change its afternoon; keep doing that and opponents start planning for him before kickoff.":name+" complicated "+q.opp+"’s afternoon; "+q.team+" still lost, so the next job is turning that individual problem into an actual team advantage."
  ][v];
  return (football+" "+close).replace(/\s+/g," ").trim();
}

function losingRecordAsideV33(t,r){
  const rec=t?.league_context?.record||{},w=Number(rec.wins)||0,l=Number(rec.losses)||0,ties=Number(rec.ties)||0,games=w+l+ties,rank=Number(t?.league_context?.standings_rank),size=Number(t?.league_context?.league_size)||32;
  if(!((l>=2&&l>w)||(games>=4&&Number.isFinite(rank)&&rank>Math.floor(size*.75))))return null;
  const team=teamIdentityV28(t).mascot,manager=t.manager_name||'management',v=voice(r),key=String(t.roster_id)+':bad-record-v36:'+w+'-'+l+':'+String(r?.id||'');
  const banks=[
    ['At '+w+'-'+l+', the '+team+' start has moved past the stage where “early” does much work; '+manager+' needs wins before the explanations become their own losing streak.','I have covered enough '+w+'-'+l+' starts to know patience is useful right up until it becomes a hobby.'],
    ['The '+team+' record is '+w+'-'+l+', which is less a slow start than an increasingly committed aesthetic; '+manager+' can improve the décor by winning.','A '+w+'-'+l+' record is an awfully durable stain for '+team+'; I recommend the radical cleansing agent known as victories.'],
    ['The '+team+' record is '+w+'-'+l+'; the good news is nobody can accuse this roster of peaking too early, and '+manager+' should try the fashionable new trend called winning.','At '+w+'-'+l+', '+team+' has made pessimism look less like a mood and more like responsible preparation.'],
    ['The '+team+' record is '+w+'-'+l+'; I have seen enough losses now that '+manager+' needs wins, not a cleaner explanation.','The '+team+' record sits at '+w+'-'+l+'; another loss starts looking like a habit, and '+manager+' can change that only on the scoreboard.']
  ][v];
  return keyedChoice(key,banks);
}
function teamPlayerCodaV33(t,r,f){
  const top=f?.top,team=teamIdentityV28(t).mascot,v=voice(r),projDelta=valid(t.projected)?Number(t.points)-Number(t.projected):null,topShare=top&&Number(t.points)>0?Math.round(Number(top.points)/Number(t.points)*100):0;
  if(f?.lost)return [
    `The ${team} loss was not an equal-opportunity failure; the useful performances still matter, and the quieter lineup spots are where the pressure belongs next week.`,
    `I am not spreading the blame evenly across ${team}; some players gave the roster enough to win, which makes the missing production elsewhere more irritating.`,
    `The ${team} loss is ugly enough without blaming everybody equally; keep the players who changed the game, then demand more from the spots that went quiet.`,
    `Some ${team} players did their jobs and still watched the result get away; I want the quiet parts of the lineup to stop making the useful performances feel wasted.`
  ][v];
  if(topShare>=28)return [
    `${top.name} supplied about ${topShare}% of the ${team} total; that is star-level influence, and the next useful step is making sure ${team} does not need that much of one player every Sunday.`,
    `${top.name} produced about ${topShare}% of the ${team} score; I admire the centerpiece, but I would also like the supporting cast to make the room less dependent on one chair.`,
    `${top.name} supplied about ${topShare}% of the ${team} score; great star line, now give him enough help that the whole afternoon does not have to orbit one name.`,
    `${top.name} accounted for about ${topShare}% of the ${team} total; I want that kind of star performance again, just with more resistance from the rest of the lineup.`
  ][v];
  if(projDelta!=null&&Math.abs(projDelta)>=12)return [
    `${team} finished ${one(Math.abs(projDelta))} points ${projDelta>0?'above':'below'} projection; the interesting part is which player roles created that gap and whether those same roles can move another matchup.`,
    `${team} landed ${one(Math.abs(projDelta))} points ${projDelta>0?'above':'below'} forecast; I care much more about the players who bent the afternoon than about giving the projection a personality.`,
    `${team} finished ${one(Math.abs(projDelta))} points ${projDelta>0?'above':'below'} projection; fine, now show me which parts of that surprise can travel.`,
    `${team} ended ${one(Math.abs(projDelta))} points ${projDelta>0?'above':'below'} projection; if the same players create the same stress next week, the number starts looking less accidental.`
  ][v];
  return [
    `${team} has enough real player stories here without inventing praise for everybody; the next opponent will tell us which roles deserve to keep growing.`,
    `I have enough to like about the best ${team} performances without pretending every lineup spot deserves the same compliment; another Sunday can widen the cast.`,
    `The players who changed the game get the praise; everybody else can make next week’s page harder to write by forcing their way into it.`,
    `${team} has a few performances worth carrying forward; I want the next opponent to feel more of the roster before I call the lineup complete.`
  ][v];
}
function resultShapeV33(f){
  const margin=Math.abs(Number(f?.margin)||0);
  if(margin<=7)return f?.won?'close win':'close loss';
  if(margin>=35)return f?.won?'rout win':'rout loss';
  return f?.won?'win':'loss';
}
function teamPlayerExtraV33(t,r,f,slot){
  const top=f?.top,team=teamIdentityV28(t).mascot,next=t.next_opponent_name||'the next opponent',v=voice(r),kind=Math.abs(Number(slot)||0)%3,rec=record(t),roleLabel=playerContextLabelV33(top),key=String(t.roster_id)+':player-extra-v36:'+kind+':'+String(r?.id||'');
  const banks=[
    [
      [
        `${top.name} has become one of the ${team} pieces that has to travel; if the ${roleLabel} role keeps creating the same stress next week, the next opponent will have to plan around him too.`,
        `${top.name} gave ${team} something worth carrying forward; another Sunday with this ${roleLabel} role would make the performance feel a lot less temporary.`,
        `${team} needs ${top.name} to make this role matter again; one strong Sunday is useful, two starts changing what opponents have to prepare for.`,
        `${top.name} already made this matchup bend; now ${team} needs the same ${roleLabel} role to make the next opponent uncomfortable too.`
      ],
      [
        `${top.name} looked important enough that I want the same ${roleLabel} role next week; good furniture is nice, but making another opponent rearrange the room is better.`,
        `${team} can enjoy what ${top.name} did without turning one Sunday into mythology; repeat the role against a new opponent and the story gets much more persuasive.`,
        `${top.name} already owns the flattering paragraph; I want to see whether the ${roleLabel} workload still looks elegant when the matchup gets less accommodating.`,
        `${top.name} has my attention now; another week of this ${roleLabel} role would make the next opponent’s preparation considerably less pleasant.`
      ],
      [
        `${top.name} was one of the best things ${team} had going; do it again and the next opponent can start worrying before kickoff.`,
        `${team} got a real Sunday from ${top.name}; repeat the ${roleLabel} role and this stops looking like a one-week souvenir.`,
        `${top.name} earned the praise; now make another opponent deal with the same problem.`,
        `${top.name} mattered this week; if that same role travels, I will gladly make the next headline even louder.`
      ],
      [
        `${top.name} needs to make the next opponent feel this role too; repeat it and ${team} has something opponents actually have to respect.`,
        `${team} got a useful version of ${top.name}; I want that same ${roleLabel} job changing another matchup instead of living on one Week 1 page.`,
        `${top.name} made himself hard to ignore; another Sunday like this turns one good performance into a recurring problem for the league.`,
        keyedChoice(key+':filch-role-close',[`${top.name} has the next opponent’s attention now; keep it by making the same role hurt again.`,`${top.name} forced his way into the next opponent’s preparation; make that extra attention feel justified on Sunday.`,`${top.name} gave the next opponent a reason to prepare for him; the useful follow-up is making that preparation fail.`,`${top.name} made this role matter once; repeat it and the next opponent has to start moving pieces around him.`,`${top.name} already changed one matchup; the next step is making a prepared opponent suffer through the same problem.`,`${top.name} earned a place in the next opponent’s plan; keep it there by turning the same role into another difficult afternoon.`,`${top.name} is no longer an easy part of the lineup to overlook; another week like this makes the next opponent spend real attention there.`,`${top.name} gave the league one reason to notice him; a second Sunday like this turns notice into preparation.`])
      ]
    ],
    [
      [
        `${team} sits at ${rec}; ${top.name} gave it something worth carrying forward, but the standings still demand more good Sundays from the rest of the roster.`,
        `${top.name} can be good while ${team} still has work to do at ${rec}; both things are true, and the next game gets to move the bigger story.`,
        `${team} leaves the week at ${rec}; ${top.name} gave the roster a useful building block, not permission to relax.`,
        `${top.name} gave ${team} one reason to feel better about a ${rec} record; now the rest of the lineup has to make that optimism less lonely.`
      ],
      [
        `${team} is ${rec}; I can admire ${top.name} without pretending the standings suddenly became tasteful.`,
        `${top.name} gave ${team} a handsome performance, but ${rec} is still hanging in the room; the next Sunday needs a fuller cast.`,
        `At ${rec}, ${team} has larger concerns than one player can solve; ${top.name} at least gave the roster something worth dressing up next week.`,
        `${team} carries ${rec} into the next game; ${top.name} deserves the compliment, and the rest of the roster can earn one beside him.`
      ],
      [
        `${team} is ${rec}; ${top.name} did his part, and the standings are still asking for more.`,
        `${top.name} gave ${team} good football; ${rec} says somebody else needs to join him.`,
        `${team} leaves the week at ${rec}; I like what ${top.name} did, and I want more names making that sentence next week.`,
        `${top.name} earned the praise; ${team} still has a ${rec} record that will not improve itself.`
      ],
      [
        `${team} is ${rec}; ${top.name} gave it something useful, and the roster still needs more places where an opponent feels pressure.`,
        `${top.name} did enough to help; a ${rec} record still says ${team} needs more of that from more people.`,
        `${team} carries ${rec} forward; ${top.name} is one answer, not the whole solution.`,
        `${top.name} gave ${team} a real advantage; at ${rec}, the next step is making that advantage less lonely.`
      ]
    ],
    [
      [
        `${next} is next; I want ${team} to carry the player role that worked and make the new opponent adjust first.`,
        `Against ${next}, ${team} should keep feeding the role that mattered this week; make the opponent solve it before changing anything.`,
        `${next} gets the next look at ${team}; keep what worked, clean up what did not, and make the opponent react.`,
        `${team} turns to ${next}; the useful part of this week should travel before the bad habits get another chance to.`
      ],
      [
        `${next} is next; I would very much like the useful ${team} roles to arrive intact instead of as charming stories from last Sunday.`,
        `${team} gets ${next}; the elegant outcome is the same useful role with fewer of this week’s unattractive accessories.`,
        `${next} is next, and I want ${team} to make the good part of this matchup travel; nostalgia is terribly common and not particularly useful.`,
        `${team} meets ${next}; make the useful role survive a new guest list and the performance starts looking much more expensive.`
      ],
      [
        `${next} is next; keep the good ${team} role, lose the excuses, and make me find a different joke.`,
        `${team} gets ${next}; the best player can turn this into a trend while the weaker spots stop giving the opponent easy places to attack.`,
        `${next} is waiting; I want the good ${team} role to travel and the bad one to miss the bus.`,
        `${team} turns to ${next}; repeat what worked, fix what went quiet, and spare me the copy-and-paste complaint.`
      ],
      [
        `${next} is next; keep the role that hurt this opponent and make the new one prove it has a better answer.`,
        `${team} gets ${next}; I want the useful player role to travel and the weak spots to stop volunteering relief.`,
        `${next} will see exactly what worked for ${team}; the job now is making that knowledge useless.`,
        `${team} turns to ${next}; repeat the good part loudly enough that the new opponent still cannot stop it.`
      ]
    ]
  ];
  return keyedChoice(key,banks[kind][v]);
}
function teamUsageComment(t,p,angle='star'){
  const o=teamOpportunity(p);if(!o)return null;
  if(o.limited_snap)return keyedChoice(`${p.id||p.name}:${angle}:limited`,[`${p.name} squeezed that production out of only ${o.snaps} defensive snaps.`,`${p.name} did all of that in a genuinely limited defensive role.`]);
  const strong={
    opponent:[`${p.name} stayed in the middle of the plan all afternoon.`,`${t.team_name} saw a full-sized ${p.name} role, not one lucky play.`],
    'next-opponent':[`${p.name} arrives with a full-sized role. ${t.team_name} cannot treat him as a side note.`,`${p.name} was heavily involved last week, and ${t.team_name} should expect the same job again.`],
    'supporting-cast':[`${p.name} stayed involved from start to finish.`,`${t.team_name} kept ${p.name} involved all afternoon.`],
    'hot-seat':[`${p.name} still got the work; the production was the problem.`,`${p.name} did not disappear from the plan. He simply did too little with it.`],
    'cool-throne':[`${p.name} got the work to match the big Sunday.`,`${p.name} had a full role and cashed it in.`],
    star:[`${p.name} got a full workload and made it count.`,`${p.name} stayed central to the plan all afternoon.`]
  };
  const light={
    opponent:[`${p.name} hurt ${t.team_name} without needing a huge workload.`,`${p.name} did damage on fewer chances than the final score suggests.`],
    'next-opponent':[`${p.name} is coming off a big result on a lighter role; ${t.team_name} should make him do it the hard way again.`,`${p.name} was efficient on a smaller workload last week. ${t.team_name} gets a chance to keep that role small.`],
    'supporting-cast':[`${p.name} helped on a narrower role.`,`${p.name} gave ${t.team_name} useful work without owning a huge share of the plan.`],
    'hot-seat':[`${p.name}’s role was light and the score followed.`,`${p.name} did not get many chances, and none of them rescued the week.`],
    'cool-throne':[`${p.name} made a smaller role pay off.`,`${p.name} squeezed a big Sunday out of a lighter workload.`],
    star:[`${p.name} squeezed a lot out of a smaller workload.`,`${p.name} did not need a huge role to own the afternoon.`]
  };
  const bank=(o.strong?strong:light)[angle]||(o.strong?strong.star:light.star);return keyedChoice(`${p.id||p.name}:${angle}:${t.roster_id}`,bank);
}

function teamFootballRead(t,p,r,angle='star'){
  let line=teamStatLine(p);
  if(line){
    if(angle==='opponent')line=`On the other side, ${line}`;
    else if(angle==='next-opponent')line=`Last week, ${line}`;
    else if(angle==='supporting-cast')line=line;
    else if(angle==='hot-seat')line=`Even on the bad fantasy day, ${line}`;
  }
  const comment=teamUsageComment(t,p,angle);
  return [line,comment].filter(Boolean).join(' ')||null;
}

function establishedStarV29(p){
  const prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0,years=Number(p?.years_exp),pos=String(p?.position||'').toUpperCase();
  if(!Number.isFinite(prior)||games<8)return false;
  const threshold=pos==='QB'?18:pos==='RB'?14:pos==='WR'?14:pos==='TE'?11:defensivePlayer(p)?11:13;
  if(prior>=threshold*1.2)return true;
  return prior>=threshold&&(!Number.isFinite(years)||years>=1);
}

function teamTrajectory(p){
  const prior=Number(p?.prior_season_avg),priorGames=Number(p?.prior_season_games)||0,current=Number(p?.season_avg),games=Number(p?.season_games)||0,age=Number(p?.age),years=Number(p?.years_exp),pos=String(p?.position||'').toUpperCase(),key=p?.id||p?.name,role=teamOpportunity(p),points=Number(p?.points);
  const rookie=Number.isFinite(years)&&years===0,young=(Number.isFinite(age)&&age<=26)||(Number.isFinite(years)&&years<=3),oldThreshold=pos==='QB'?34:pos==='RB'?28:(pos==='WR'||pos==='TE')?30:29,veteran=(Number.isFinite(years)&&years>=7)||(Number.isFinite(age)&&age>=oldThreshold);
  if(rookie)return {kind:'rookie',strength:1,text:keyedChoice(key,[
    `${p.name} is a rookie, and the first Sunday gave the coaching staff a reason to keep him involved.`,
    `Rookie ${p.name} has already made himself difficult to ignore. Another week in the same role would make that attention harder to dismiss.`,
    `${p.name} got his first real NFL Sunday on the page. Earning another one is the useful part.`
  ])};
  if(!Number.isFinite(prior)||prior<=0||priorGames<6||!Number.isFinite(current)||games<1)return null;
  const ratio=current/prior,established=establishedStarV29(p);
  if(games>=3&&veteran&&ratio<=.68)return {kind:'decline',strength:1-ratio,text:keyedChoice(key,[
    `${p.name} is a veteran and the quiet stretch has lasted long enough to be a real concern. The old weekly floor is no longer automatic.`,
    `${p.name} has been quiet for several weeks now, long enough that the old standard deserves a real challenge.`,
    `${p.name} has moved past “slow start.” At this stage of his career, a multi-week drop deserves a sharper eye on the role.`
  ])};
  if(!established&&games>=3&&young&&ratio>=1.28&&role?.strong)return {kind:'breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} is starting to look like one of this season’s breakout players. The role has grown with the production.`,
    `${p.name} is becoming a much bigger weekly problem than he was last season, and the larger role keeps giving the jump room to breathe.`,
    `${p.name} is making a real breakout case over multiple Sundays: a larger role keeps producing larger results.`
  ])};
  const earlyBreakoutFloor=pos==='QB'?18:pos==='RB'?14:pos==='WR'?14:pos==='TE'?11:defensivePlayer(p)?11:13;
  if(!established&&games===1&&young&&ratio>=1.4&&role?.strong&&points>=earlyBreakoutFloor)return {kind:'early-breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} is making an early case to be a breakout player after a first Sunday that was both loud and busy. One more week with the same role would make it much harder to shrug off.`,
    `${p.name} looked like a potential breakout player right away: real involvement and a much bigger Sunday than fantasy managers were used to seeing.`,
    `${p.name} changed the conversation for one week. Keep the same workload next Sunday and the breakout case starts looking much more real.`
  ])};
  if(games>=3&&Math.abs(ratio-1)<=.15&&prior>=8)return {kind:established?'star':'reliable',strength:1-Math.abs(ratio-1),text:keyedChoice(key,established?[
    `${p.name} already owns a star-level baseline, and another week near it reinforces the expectation.`,
    `${p.name} did what established stars are supposed to do: make a strong weekly role look ordinary.`,
    `${p.name} looked like an established player doing the kind of work his roster already expects.`
  ]:[
    `${veteran?'Veteran ':''}${p.name} keeps showing up in the same useful neighborhood every week. That is reliability, and contenders need plenty of it.`,
    `${p.name} has become pleasantly predictable. The production keeps landing where this roster expects it.`
  ])};
  if(games===1&&points<=prior*.5)return {kind:'stumble',strength:1-points/prior,text:keyedChoice(key,[
    `${veteran?'Veteran ':''}${p.name} had a bad opener. His longer track record earns him patience, not immunity.`,
    `${p.name} started quietly enough to get noticed. One ugly Sunday is a stumble; two starts becoming a pattern.`,
    `${p.name} gave the roster far less than it usually gets from him. The useful test comes next week, not in a Week 1 obituary.`
  ])};
  if(established)return {kind:'star',strength:Math.max(.5,ratio),text:keyedChoice(key,[
    `${p.name} already owns star status. A big week strengthens that reputation and raises the standard for the next one.`,
    `${p.name} entered the season with a star-level track record, so Sunday belongs in the confirmation column rather than the discovery column.`,
    `${p.name} entered Sunday with an established reputation; another substantial role keeps that reputation intact.`
  ])};
  if(games===1&&Math.abs(points-prior)<=Math.max(2,prior*.22)&&prior>=8)return {kind:'reliable',strength:1-Math.abs(points-prior)/prior,text:keyedChoice(key,[
    `${veteran?'Veteran ':''}${p.name} averaged ${one(prior)} last season and looked like the same player Sunday. No reinvention required.`,
    `${p.name} gave his roster a very familiar Sunday after averaging ${one(prior)} last year. Boring can be profitable.`
  ])};
  if(veteran)return {kind:'veteran',strength:.25,text:`Veteran ${p.name} has too much history for one Sunday to rewrite him. The week belongs in the file, not on the tombstone.`};
  return null;
}

function playerTrajectory(p){
  const prior=Number(p?.prior_season_avg),priorGames=Number(p?.prior_season_games)||0,current=Number(p?.season_avg),games=Number(p?.season_games)||0,age=Number(p?.age),opp=opportunity(p),pos=String(p?.position||'').toUpperCase(),key=p?.id||p?.name,established=establishedStarV29(p);
  if(!Number.isFinite(prior)||prior<=0||priorGames<6||!Number.isFinite(current)||games<1)return null;
  const ratio=current/prior,oldThreshold=pos==='QB'?34:pos==='RB'?28:(pos==='WR'||pos==='TE')?30:29;
  if(games>=3&&Number.isFinite(age)&&age>=oldThreshold&&ratio<=.68)return {kind:'decline',strength:1-ratio,text:keyedChoice(key,[
    `${p.name} has earned a real decline watch: ${one(current)} per game this season versus ${one(prior)} last year. At age ${age}, the old weekly floor no longer gets the benefit of the doubt.`,
    `The uncomfortable veteran question belongs to ${p.name}: ${one(current)} now after ${one(prior)} last season. At age ${age}, the drop deserves attention.`,
    `${p.name} is giving us a decline story worth monitoring. Production has fallen from ${one(prior)} last year to ${one(current)} this season.`
  ])};
  if(!established&&games>=3&&Number.isFinite(age)&&age<=26&&ratio>=1.28&&opp?.strong)return {kind:'breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} has climbed from ${one(prior)} per game last season to ${one(current)} this year. The role has grown with the production, and he is starting to look like a genuine breakout player.`,
    `${p.name} is averaging ${one(current)} after sitting at ${one(prior)} last year. The old expectation is starting to look stale.`,
    `Last year’s ${one(prior)}-point average looks small next to ${p.name}’s ${one(current)} this season. This has lasted long enough to call it a real leap.`
  ])};
  if(!established&&games===1&&Number.isFinite(age)&&age<=26&&ratio>=1.4&&opp?.strong)return {kind:'early-breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} cleared last year’s ${one(prior)}-point average by a wide margin. One Sunday is not a trend, but it is enough to get attention.`,
    `${p.name} averaged ${one(prior)} last season and opened well above it. Give the new role another Sunday before calling it permanent.`,
    `${p.name} opened far above last year’s ${one(prior)}-point level. He is making an early breakout case, but one Sunday is still only the beginning.`
  ])};
  if(games===1&&Number(p.points)<=prior*.5)return {kind:'stumble',strength:1-Number(p.points)/prior,text:keyedChoice(key,[
    `${p.name} opened well below last year’s ${one(prior)}-point average. One bad Sunday is a stumble, not a decline.`,
    `${p.name} started the year far under the ${one(prior)}-point average he carried last season. The next workload gets a brighter light.`,
    `${p.name} opened a long way below last year’s ${one(prior)}-point average. The production disappeared for a week; the career did not.`
  ])};
  if(games>=3&&Math.abs(ratio-1)<=.15&&prior>=8)return {kind:established?'star':'reliable',strength:1-Math.abs(ratio-1),text:keyedChoice(key,established?[
    `${p.name} remains an established star. ${one(current)} per game this season sits in the same conversation as last year’s ${one(prior)}.`,
    `${p.name} is doing star-level work that the league already knew belonged in his range.`
  ]:[
    `${p.name} keeps doing the boring valuable thing: ${one(current)} per game this season after ${one(prior)} last year.`,
    `${p.name} is supplying continuity: ${one(current)} per game this season compared with ${one(prior)} last year.`
  ])};
  if(established)return {kind:'star',strength:Math.max(.5,ratio),text:keyedChoice(key,[
    `${p.name} already owns a star-level track record. This week can reinforce or dent that reputation, but it cannot honestly be sold as a breakout.`,
    `${p.name} belongs in the established-star bucket; Sunday changes the weekly conversation, not his career category.`
  ])};
  if(games===1&&Math.abs(Number(p.points)-prior)<=Math.max(2,prior*.22)&&prior>=8)return {kind:'reliable',strength:1-Math.abs(Number(p.points)-prior)/prior,text:keyedChoice(key,[
    `${p.name} gave his team a familiar opening line after a ${one(prior)}-point average last year.`,
    `There was nothing exotic about ${p.name}’s opener. Last season’s ${one(prior)}-point level still looks like home.`
  ])};
  return null;
}

function playerContextParagraph(p){return statSituation(p)||''}

function leaguePlayerPulse(teams){
  const rows=(teams||[]).flatMap(t=>(t.starter_details||[]).map(p=>({t,p,tr:playerTrajectory(p)}))).filter(x=>x.tr),
    pick=kind=>rows.filter(x=>x.tr.kind===kind).sort((a,b)=>Number(b.tr.strength)-Number(a.tr.strength))[0]||null,out=[],seen=new Set();
  for(const kind of ["breakout","early-breakout","reliable","decline","stumble"]){
    const x=pick(kind);if(!x||seen.has(String(x.p.id)))continue;seen.add(String(x.p.id));
    const opp=x.t.opponent_name||"the opponent",stat=statSituation(x.p)||"",won=Number(x.t.points)>Number(x.t.opponent_points);
    if(kind==="breakout"||kind==="early-breakout")out.push(x.p.name+" made "+opp+" account for a player it may not have entered Week 1 fearing. "+stat+" "+(won?x.t.team_name+" turned that new problem into a win; the next opponent now has to prepare as if the role is real.":x.t.team_name+" lost, but the performance gave the next opponent one more threat it cannot casually dismiss."));
    else if(kind==="reliable")out.push(x.p.name+" gave "+x.t.team_name+" the familiar kind of trouble opponents hate. "+stat+" "+opp+" knew the established threat was coming and still had to spend the afternoon dealing with it.");
    else out.push(x.p.name+" gave "+x.t.team_name+" a quieter Week 1 than its prior expectations promised. "+opp+" got the benefit of that absence; the next opponent will attack the same weakness until "+x.p.name+" makes it disappear.");
    if(out.length>=3)break;
  }
  return out;
}

function bartholomewPlayerBoard(teams){
  const rows=(teams||[]).flatMap(t=>(t.starter_details||[]).map(p=>{
    const prior=Number(p?.prior_season_avg),priorGames=Number(p?.prior_season_games)||0,pts=Number(p?.points),age=Number(p?.age),years=Number(p?.years_exp),
      role=teamOpportunity(p),tr=teamTrajectory(p),ratio=Number.isFinite(prior)&&prior>0&&Number.isFinite(pts)?pts/prior:null,established=establishedStarV29(p);
    return {t,p,tr,role,prior,priorGames,pts,ratio,established,young:(Number.isFinite(age)&&age<=26)||(Number.isFinite(years)&&years<=3)};
  })).filter(x=>Number.isFinite(x.pts));
  const breakoutScore=x=>{
    if(x.established)return -Infinity;
    if(["breakout","early-breakout"].includes(x.tr?.kind))return 300+Number(x.tr.strength||0)*100;
    if(x.tr?.kind==="rookie"&&x.pts>=8)return 240+x.pts;
    if(x.young&&x.priorGames>=6&&x.ratio!=null&&x.ratio>=1.2&&x.role?.strong)return 180+x.ratio*10+x.pts/10;
    if(defensivePlayer(x.p)&&x.young&&x.priorGames>=6&&x.ratio!=null&&x.ratio>=1.35&&x.pts>=14)return 170+x.ratio*10+x.pts/10;
    if(x.young&&x.pts>=12&&x.role?.strong)return 120+x.pts;
    return -Infinity;
  };
  const reliableScore=x=>{
    if(x.tr?.kind==="star")return 360+Number(x.tr.strength||0)*50;
    if(x.tr?.kind==="reliable")return 300+Number(x.tr.strength||0)*100;
    if(x.established&&x.pts>=x.prior*.7)return 250+x.pts/10;
    if(x.priorGames>=6&&Number.isFinite(x.prior)&&x.prior>=6&&x.ratio!=null&&Math.abs(x.ratio-1)<=.3)return 180-Math.abs(x.ratio-1)*100+x.prior/10;
    return -Infinity;
  };
  const take=(defense,n,score,exclude=new Set())=>rows.filter(x=>defensivePlayer(x.p)===defense&&!exclude.has(String(x.p.id))&&Number.isFinite(score(x))).sort((a,b)=>score(b)-score(a)||b.pts-a.pts).slice(0,n);
  const bo=take(false,2,breakoutScore),bd=take(true,1,breakoutScore),used=new Set([...bo,...bd].map(x=>String(x.p.id))),
    ro=take(false,2,reliableScore,used),rd=take(true,1,reliableScore,used),ps=[];
  const breakoutLine=x=>{
    const opp=x.t.opponent_name||"the opponent",stat=statSituation(x.p),won=Number(x.t.points)>Number(x.t.opponent_points);
    return x.p.name+" gave "+x.t.team_name+" a Week 1 performance that changed how "+opp+" had to defend. "+(stat||"")+" "+(won?opp+" saw the problem and still never made it disappear before "+x.t.team_name+" took the win.":x.t.team_name+" lost, but "+x.p.name+" gave the next opponent a reason not to treat the performance as opening-week noise.");
  };
  const reliableLine=x=>{
    const opp=x.t.opponent_name||"the opponent",stat=statSituation(x.p),won=Number(x.t.points)>Number(x.t.opponent_points);
    return x.p.name+" gave "+x.t.team_name+" the kind of familiar production that makes an opponent miserable because there was no surprise to solve. "+(stat||"")+" "+(won?opp+" knew what was coming and still had to live with it.":opp+" survived it, which makes the rest of "+x.t.team_name+" the more uncomfortable part of the review.");
  };
  if(bo.length||bd.length){
    const picks=[...bo,...bd],lead=[];
    if(bo.length>=2)lead.push("On offense, "+bo[0].p.name+" and "+bo[1].p.name+" are making the strongest breakout cases this week.");
    else if(bo.length===1)lead.push("On offense, "+bo[0].p.name+" is making one of the strongest breakout cases this week.");
    if(bd.length)lead.push("On defense, "+bd[0].p.name+" is making a breakout case of his own.");
    ps.push(lead.join(" ")+" "+picks.map(breakoutLine).join(" "));
  }
  if(ro.length||rd.length){
    const picks=[...ro,...rd],lead=[];
    if(ro.length>=2)lead.push("On offense, "+ro[0].p.name+" and "+ro[1].p.name+" look like the two players Bartholomew can trust to keep showing up.");
    else if(ro.length===1)lead.push("On offense, "+ro[0].p.name+" looks like the player Bartholomew can trust to keep showing up.");
    if(rd.length)lead.push("On defense, "+rd[0].p.name+" has been just as dependable.");
    ps.push(lead.join(" ")+" "+picks.map(reliableLine).join(" "));
  }
  return ps;
}

export function breakoutWatch(t){
  const direct=(t.starter_details||[]).map(p=>({p,tr:playerTrajectory(p)})).filter(x=>['breakout','early-breakout'].includes(x.tr?.kind)&&!establishedStarV29(x.p)).sort((a,b)=>Number(b.tr.strength)-Number(a.tr.strength))[0];
  if(direct)return direct.tr.text;
  const candidates=(t.starter_details||[]).map(p=>{
    if(establishedStarV29(p))return null;
    const age=Number(p.age),f=p.recent_form||{},baseline=Number(f.prior3_avg),current=Number(f.last3_avg),opp=opportunity(p);
    if(!Number.isFinite(age)||age>26||!Number.isFinite(baseline)||baseline<=0||!Number.isFinite(current)||!opp?.strong)return null;
    const lift=current-baseline;if(lift<3||current<baseline*1.2)return null;
    return {p,age,baseline,current,lift,opp,score:lift+Math.max(0,26-age)*.5};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
  const x=candidates[0];if(!x)return null;
  return `${x.p.name} is making a breakout case for ${t.team_name}. At age ${x.age}, the scoring has climbed from ${one(x.baseline)} per game across the prior sample to ${one(x.current)} over the last three, and this week’s ${x.opp.text} gives the jump actual opportunity behind it. The next few Sundays still decide whether the new level holds.`;
}

function consolidateTransactions(t){
  const roster=new Set((t.roster_player_ids||[]).map(String)),moves=(t.transactions||[]).map((m,i)=>({...m,__i:i,adds:[...(m.adds||[])].map(String),drops:[...(m.drops||[])].map(String)}));
  const actionMap=new Map();
  for(const m of moves){
    for(const id of m.adds) {const a=actionMap.get(id)||[];a.push({kind:'add',m});actionMap.set(id,a)}
    for(const id of m.drops){const a=actionMap.get(id)||[];a.push({kind:'drop',m});actionMap.set(id,a)}
  }
  const keep=new Map();
  for(const [id,actions] of actionMap){
    const kinds=new Set(actions.map(a=>a.kind));
    if(kinds.size===1){keep.set(id,kinds.has('add')?'add':'drop');continue}
    if(roster.size)keep.set(id,roster.has(id)?'add':'drop');
    else keep.set(id,'suppress');
  }
  return moves.map(m=>({...m,adds:m.adds.filter(id=>keep.get(id)==='add'),drops:m.drops.filter(id=>keep.get(id)==='drop')})).filter(m=>m.adds.length||m.drops.length);
}

function management(t,facts,reporter){
  const cleanTeam={...t,transactions:consolidateTransactions(t)},selected=selectImportantMoves(cleanTeam,facts);
  if(!selected.length)return ['n/a'];
  return selected.map((m,moveIndex)=>{
    const add=names(m.add),drop=names(m.drop),trade=String(m.move?.type||'').toLowerCase()==='trade',bits=[],moveTeam={...t,roster_id:(Number(t.roster_id)||0)+moveIndex};
    if(add&&drop)bits.push(deskChoice(moveTeam,reporter,[
      [`${t.manager_name} brought in ${add} and moved on from ${drop}.`,`${t.manager_name} changed the room by adding ${add} and sending out ${drop}.`],
      [`${t.manager_name} welcomed ${add} and showed ${drop} the less glamorous side of the velvet rope.`,`${t.manager_name} rearranged the guest list: ${add} in, ${drop} out.`],
      [`${t.manager_name} MADE A MOVE: ${add} in, ${drop} out.`,`${t.manager_name} hit the transaction wire with ${add} arriving and ${drop} leaving.`],
      [`${t.manager_name} brought in ${add} and moved ${drop} out; the roster changed in a way Sunday can actually expose.`,`${t.manager_name} made the exchange plain enough: ${add} arrived and ${drop} departed.`]
    ]));
    else if(add)bits.push(trade?deskChoice(moveTeam,reporter,[
      [`${t.manager_name} acquired ${add} by trade, so this is part of a roster bet rather than waiver-wire housekeeping.`,`${add} came to ${t.manager_name} through a trade, which gives every useful Sunday a little more context.`],
      [`${t.manager_name} traded for ${add}; one does not send assets across the table merely to decorate the bench.`,`${add} arrived by trade, and the price of admission means the role deserves to be watched.`],
      [`TRADE ARRIVAL: ${t.manager_name} brought in ${add}. This one came with a receipt, not a waiver claim.`,`${add} landed via trade, which makes the next few weeks part performance review, part trade follow-up.`],
      [`${t.manager_name} traded for ${add}. The acquisition now has an actual Sunday attached to it.`,`${add} came to ${t.manager_name} by trade, so every useful week becomes part of how that deal ages.`]
    ]):deskChoice(moveTeam,reporter,[
      [`${t.manager_name} added ${add}, a move worth tracking beyond the transaction crawl.`,`${add} is the addition from ${t.manager_name} that earned space in the notebook.`],
      [`${t.manager_name} added ${add}; at least one waiver move came dressed for the column.`,`${add} joined ${t.manager_name}’s roster and, unlike most wire activity, deserves another look.`],
      [`${t.manager_name} went shopping and came home with ${add}. This one makes the back page.`,`ADD ALERT: ${t.manager_name} landed ${add}, a move loud enough to escape the ticker.`],
      [`${t.manager_name} added ${add}, a move that now has to earn a place in the lineup rather than in a transaction log.`,`${add} is the incoming name worth remembering for ${t.manager_name}.`]
    ]));
    else bits.push(deskChoice(moveTeam,reporter,[
      [`${t.manager_name} cut ${drop}; the replacement plan now matters.`,`${drop} is gone from ${t.manager_name}’s roster, which makes the next move worth watching.`],
      [`${t.manager_name} showed ${drop} the door. ${t.team_name} now has to prove that roster spot has a better use.`,`${drop} was removed from ${t.manager_name}’s guest list; an empty chair is not a strategy.`],
      [`CUT: ${t.manager_name} moved on from ${drop}. ${t.team_name} now has to show the replacement can give the lineup something the old spot did not.`,`${drop} is off the ${t.team_name} roster. Fine. The next move should make the reason obvious on Sundays.`],
      [`${t.manager_name} cut ${drop}. What replaces that production matters more than the paperwork.`,`${drop} is out for ${t.manager_name}; the replacement now has to make the roster better.`]
    ]));
    const incoming=m.add.filter(p=>valid(p.value)).sort((a,b)=>b.value-a.value)[0],outgoing=m.drop.filter(p=>valid(p.value)).sort((a,b)=>b.value-a.value)[0];
    if(incoming&&m.lineup)bits.push(deskChoice(moveTeam,reporter,[
      [`${incoming.name} went straight into the lineup, so the move already had a job attached to it.`,`${incoming.name} immediately drew a starting assignment; this was not a stash.`],
      [`${incoming.name} went directly into the lineup, an admirably decisive use of the new arrival.`,`The new arrival, ${incoming.name}, skipped the waiting room and started immediately.`],
      [`${incoming.name} HIT THE LINEUP IMMEDIATELY. That is a move with intent.`,`${incoming.name} was not brought in to collect dust; the starter card had his name on it right away.`],
      [`${incoming.name} went straight into the starting lineup after arriving. The move had a real job attached to it.`,`${incoming.name} went directly from acquisition to the starting lineup. There was no waiting period.`]
    ]));
    else if(incoming)bits.push(deskChoice(moveTeam,reporter,[
      [`${incoming.name} is the biggest incoming market piece at ${Math.round(incoming.value).toLocaleString('en-US')}. A real Sunday role now has to follow the price tag.`,`${incoming.name}, valued at ${Math.round(incoming.value).toLocaleString('en-US')}, is the addition with enough market weight to keep watching.`],
      [`${incoming.name} carries ${Math.round(incoming.value).toLocaleString('en-US')} of current value, expensive enough to merit more than decorative depth.`,`At ${Math.round(incoming.value).toLocaleString('en-US')} in current value, ${incoming.name} is not merely a charming bench accessory.`],
      [`${incoming.name} brings ${Math.round(incoming.value).toLocaleString('en-US')} of value with him. The roster now has to turn that market weight into an actual Sunday role.`,`The biggest incoming chip is ${incoming.name} at ${Math.round(incoming.value).toLocaleString('en-US')}; the back page awaits the role.`],
      [`${incoming.name} is the most substantial incoming asset at ${Math.round(incoming.value).toLocaleString('en-US')} in current value. A real Sunday role would make that market price feel less theoretical.`,`${incoming.name} is the largest incoming market piece at ${Math.round(incoming.value).toLocaleString('en-US')}; a real role would make that price feel less theoretical.`]
    ]));
    if(outgoing&&(!incoming||Number(outgoing.value)>Number(incoming.value)*1.15))bits.push(deskChoice(moveTeam,reporter,[
      [`${outgoing.name} is the meaningful cost; that departure has to be replaced somewhere.`,`${outgoing.name} carries enough value out the door that the rest of the plan cannot be ignored.`],
      [`${outgoing.name} is the expensive goodbye. ${t.team_name} now has to make the vacancy more useful than the player it surrendered.`,`${outgoing.name} leaves the larger bill behind, which makes the replacement more than a matter of taste.`],
      [`${outgoing.name} IS THE COST. If ${t.team_name} improves from here, management will have a football answer instead of a transaction explanation.`,`Moving ${outgoing.name} out created a hole with his name on it. The replacement has to make ${t.team_name} stop missing him.`],
      [`${outgoing.name} is the meaningful outgoing cost, and ${t.team_name} still has to replace what left with him.`,`The cost side centers on ${outgoing.name}, a departure too substantial to wave away.`]
    ]));
    const addStar=m.add.filter(p=>valid(p.points)).sort((a,b)=>b.points-a.points)[0],dropStar=m.drop.filter(p=>valid(p.points)).sort((a,b)=>b.points-a.points)[0];
    const dropDestination=dropStar?.current_fantasy_team_name&&String(dropStar.current_fantasy_roster_id)!==String(t.roster_id)?` for ${dropStar.current_fantasy_team_name}`:` after leaving ${t.team_name}`;
    if(addStar&&strongTransactionPerformance(addStar))bits.push(deskChoice(moveTeam,reporter,[
      [`${addStar.name} was excellent immediately after the move.`,`${addStar.name} gave ${t.team_name} exactly the kind of debut it wanted.`],
      [`${addStar.name} introduced himself with a strong debut. Tasteful, even.`,`${addStar.name} gave the move the sort of debut that makes a transaction look well dressed.`],
      [`${addStar.name} PAID OUT IMMEDIATELY with a genuinely strong debut.`,`${addStar.name} gave management exactly the kind of instant headline it wanted.`],
      [`${addStar.name} produced a strong performance immediately after the move. ${t.manager_name} got an immediate payoff on Sunday.`,`${addStar.name} was strong enough in his debut to make the move look good immediately.`]
    ]));
    else if(dropStar&&strongTransactionPerformance(dropStar))bits.push(deskChoice(moveTeam,reporter,[
      [`${dropStar.name} answered the departure with ${one(dropStar.points)} points${dropDestination}, enough to keep the decision in next week’s notebook.`,`${dropStar.name} produced ${one(dropStar.points)} points${dropDestination}, so this exit gets a follow-up.`],
      [`${dropStar.name} answered the move with ${one(dropStar.points)} points${dropDestination}. That is enough to make ${t.manager_name} revisit the decision without pretending one Sunday settles it.`,`The departed ${dropStar.name} posted ${one(dropStar.points)} points${dropDestination}, which is how an exit earns a second column.`],
      [`OF COURSE ${dropStar.name} SCORED ${one(dropStar.points)}${dropDestination.toUpperCase()}. See you next week.`,`${dropStar.name} left and immediately hung ${one(dropStar.points)} points${dropDestination} on the board. For ${t.team_name}, that turns the departure into a decision worth tracking instead of a transaction-line footnote.`],
      [`${dropStar.name} produced ${one(dropStar.points)} points${dropDestination}. ${t.team_name} will remember that if the replacement stays quiet.`,`The outgoing ${dropStar.name} answered with ${one(dropStar.points)} points${dropDestination}, enough to keep the replacement under pressure.`]
    ]));
    return bits.join(' ');
  });
}

function opponentPreview(t,r){
  const o=t.next_opponent_roster;if(!o)return null;
  const scored=(o.players||[]).filter(p=>Number(p.season_games)>0&&valid(p.season_fantasy_points)).sort((a,b)=>Number(b.season_fantasy_points)-Number(a.season_fantasy_points)).slice(0,2);
  const valued=(o.players||[]).filter(p=>valid(p.value)).sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,2),seen=new Set(),parts=[];
  for(const p of [...scored,...valued])if(!seen.has(String(p.id))){seen.add(String(p.id));parts.push(p)}
  if(!parts.length)return null;
  const stars=parts.slice(0,3).map(p=>p.name),lead=scored[0],market=valued[0],opp=t.next_opponent_name||o.team_name;
  const intro=deskChoice(t,r,[
    [`${opp} is next, with ${stars.join(', ')} at the front of the matchup.`,`${stars.join(', ')} are the names ${t.team_name} will see first when ${opp} comes up on the schedule.`],
    [`${opp} arrives with ${stars.join(', ')}. An inconvenient guest list, but at least the danger is not hiding.`,`${stars.join(', ')} give ${opp} enough star power to make the next appointment properly unpleasant.`],
    [`${opp.toUpperCase()} IS NEXT, and ${stars.join(', ')} are the names worth circling in thick ink.`,`${opp} brings ${stars.join(', ')} next week. That is plenty of trouble for one headline.`],
    [`${opp} brings ${stars.join(', ')} into the next matchup.`,`${stars.join(', ')} are the first ${opp} names ${t.team_name} has to account for.`]
  ]);
  let tail='';
  if(lead&&market&&String(lead.id)!==String(market.id))tail=deskChoice(t,r,[
    [`${lead.name} has been the scoring leader, while ${market.name} remains the roster’s most valuable market piece. ${t.team_name} has more than one problem to solve.`],
    [`${lead.name} owns the recent scoring headline and ${market.name} carries the bigger price tag. Very tasteful, very inconvenient.`],
    [`${lead.name} has done the scoreboard damage; ${market.name} is still the expensive centerpiece. Pick your poison.`],
    [`${lead.name} leads the recent scoring while ${market.name} carries the larger market value. ${t.team_name} cannot treat either as background noise.`]
  ]);
  else if(lead)tail=deskChoice(t,r,[
    [`${lead.name} has been the scoring headliner, so the assignment is not especially mysterious.`],
    [`${lead.name} has supplied the points. Even good manners allow ${t.team_name} to be rude about stopping him.`],
    [`The scoreboard keeps shouting ${lead.name}. Make somebody else earn the headline.`],
    [`${lead.name} has been the clearest scoring threat for ${opp}. ${t.team_name} cannot let him own the afternoon.`]
  ]);
  return [intro,tail].filter(Boolean).join(' ');
}
function divisionStory(t,r){
  const d=divisionCopy(t);if(!d)return null;
  return d
    .replace('Another loss would leave this team relying more heavily on help from those rivals.',deskChoice(t,r,[
      [`${t.team_name} can make the math kinder by winning its own game next week.`],
      [`Depending on rival charity twice in a row would be terribly unbecoming.`],
      [`Next week, ${t.team_name} can stop asking the neighbors for help and win its own game.`],
      [`Rival losses limited the damage. ${t.team_name} gets a chance to do the rest itself next week.`]
    ]))
    .replace('Next week is a chance to improve that position before the division has time to separate.',deskChoice(t,r,[
      [`${t.team_name} can add to that early ground before the division has time to stretch out.`],
      [`A little more ground next week and the table may deserve the good china.`],
      [`The division opened a door. ${t.team_name} can kick it wider next week.`],
      [`${t.team_name} has an opening now; another clean result would make it more than an opening-week curiosity.`]
    ]));
}
function naturalLede(t,r){
  const rows=list(t),top=rows[0],second=rows[1],margin=Number(t.points)-Number(t.opponent_points),bad=rows.filter(p=>delta(p)!=null&&delta(p)<=-5).sort((a,b)=>delta(a)-delta(b))[0],ps=[];
  if(!top)return [`${t.team_name} finished the week without enough verified player detail for a responsible star turn.`];
  if(margin>0)ps.push(deskChoice(t,r,[
    [`${t.team_name} beat ${t.opponent_name} ${one(t.points)}–${one(t.opponent_points)} and moved to ${record(t)}. ${top.name} did the loud work with ${one(top.points)} points, ${Math.abs(margin)>=20?'setting the tone for a Sunday fans can actually enjoy':'giving the win the headliner it needed'}.`,`${top.name} put ${one(top.points)} on the board and ${t.team_name} handled ${t.opponent_name} ${one(t.points)}–${one(t.opponent_points)}. At ${record(t)}, that is a clipping worth keeping.`],
    [`${t.team_name} left ${t.opponent_name} with the bill, ${one(t.points)}–${one(t.opponent_points)}, and ${top.name} supplied ${one(top.points)} reasons not to argue. A ${record(t)} start looks rather nicer in ink.`,`${top.name} gave ${t.team_name} the star turn, ${one(top.points)} points in a ${one(t.points)}–${one(t.opponent_points)} win over ${t.opponent_name}. For one week, the good china survives.`],
    [`${t.team_name} is on the front page after a ${one(t.points)}–${one(t.opponent_points)} win over ${t.opponent_name}. ${top.name} kicked the door open with ${one(top.points)} points.`,`${top.name} supplied ${one(top.points)} points and ${t.team_name} supplied the result: ${one(t.points)}–${one(t.opponent_points)} over ${t.opponent_name}. Print the ${record(t)} record large enough for the rival chat.`],
    [`${t.team_name} beat ${t.opponent_name} ${one(t.points)}–${one(t.opponent_points)}, with ${top.name} supplying ${one(top.points)} points at the center of it. The cleanest part of the argument is the scoreboard: ${record(t)}.`,`${t.team_name} beat ${t.opponent_name} ${one(t.points)}–${one(t.opponent_points)}, and ${top.name} was impossible to miss at ${one(top.points)} points. The result holds up without dressing it as anything more complicated.`]
  ]));
  else ps.push(deskChoice(t,r,[
    [`${t.team_name} fell ${one(t.points)}–${one(t.opponent_points)} to ${t.opponent_name}, and ${top.name}’s ${one(top.points)} points deserved better company. The record is ${record(t)}; the notebook has questions.`,`${top.name} gave ${t.team_name} ${one(top.points)} points, but ${t.opponent_name} still walked out with a ${one(t.opponent_points)}–${one(t.points)} win. File the ${record(t)} record and start the homework.`],
    [`${top.name} brought ${one(top.points)} points to the table; ${t.team_name} still lost ${one(t.points)}–${one(t.opponent_points)} to ${t.opponent_name}. An unpleasant result, elegantly documented.`,`${t.team_name} lost ${one(t.points)}–${one(t.opponent_points)}, a dreadful frame for ${top.name}’s ${one(top.points)}-point afternoon. The ${record(t)} record is not improved by good typography.`],
    [`${top.name} showed up with ${one(top.points)} points. The rest of the headline is uglier: ${t.opponent_name} beat ${t.team_name} ${one(t.opponent_points)}–${one(t.points)}.`,`${t.team_name} takes the loss, ${one(t.points)}–${one(t.opponent_points)}, while ${top.name} gets the only flattering type at ${one(top.points)} points.`],
    [`${t.team_name} lost ${one(t.points)}–${one(t.opponent_points)} to ${t.opponent_name}, even with ${one(top.points)} from ${top.name}. The problem was not the headliner; it was everything the lineup failed to build around him.`,`${top.name} gave ${t.team_name} ${one(top.points)} points, but ${t.opponent_name} still won ${one(t.opponent_points)}–${one(t.points)}. ${t.team_name} leaves the week at ${record(t)} with the rest of the lineup owing a better answer.`]
  ]));
  if(margin>0&&bad&&String(bad.id)!==String(top.id))ps.push(deskChoice(t,r,[
    [`${top.name} and the other leaders made ${bad.name}’s ${one(bad.points)}-point off day easy to forgive once. Next week offers a cleaner line in the notebook.`,`${bad.name} managed only ${one(bad.points)}, but the stars covered the bill. ${t.team_name} would rather see the supporting cast pay its share next week.`],
    [`${bad.name}’s ${one(bad.points)}-point afternoon was the ugly accessory nobody noticed because ${top.name} and company dressed the win so well. A repeat would be less charming.`,`The victory was generous enough to hide ${bad.name} at ${one(bad.points)}. Good teams accept the gift and ask for better tailoring next Sunday.`],
    [`${bad.name} gave ${t.team_name} only ${one(bad.points)}, and the superstars made sure it stayed a footnote. Consider next week the comeback headline audition.`,`${bad.name} disappeared into a ${one(bad.points)}-point afternoon. The win survived it; the same problem will be much louder if it happens twice.`],
    [`${bad.name} managed only ${one(bad.points)}, and the win kept it from becoming the story. Another week like that would be harder for ${t.team_name} to hide.`,`${bad.name} finished at ${one(bad.points)}, and the win kept that from becoming a larger problem. Another quiet week would be harder to excuse.`]
  ]));
  else if(second)ps.push(deskChoice(t,r,[
    [`${top.name} had company from ${second.name}, which made the top of the lineup feel like a story rather than a solo act.`,`${second.name} gave ${top.name} company at the top of the lineup, and ${t.team_name} never had to turn the afternoon into a one-man rescue.`],
    [`${second.name} supplied the supporting performance behind ${top.name}; even a star appreciates competent company.`,`${top.name} owned the marquee, with ${second.name} doing enough nearby to keep the production from becoming a one-person salon.`],
    [`${second.name} joined ${top.name} among the names worth printing. Two headline performances made the lineup considerably harder to flatten.`,`${top.name} got the biggest type, but ${second.name} earned ink too. That is how a lineup starts sounding dangerous.`],
    [`${second.name} gave ${top.name} meaningful company, which kept ${t.team_name} from leaning on a single scorer all afternoon.`,`${top.name} led the way, and ${second.name} supplied enough behind him to keep the afternoon from becoming a one-player argument.`]
  ]));
  const topScore=one(top.points);
  if(ps[0]&&!/fantasy points/i.test(ps[0])){
    if(ps[0].includes(topScore+' points'))ps[0]=ps[0].replace(topScore+' points',topScore+' fantasy points');
    // Bare numbers can be part of a joke (for example, “34.1 reasons”), so only explicit point labels are normalized.
  }
  return ps;
}

function playerSection(t,r){
  const rows=list(t),top=rows[0],ps=[];if(!top)return ['n/a'];
  const topThree=rows.slice(0,3),bad=rows.filter(p=>delta(p)!=null&&delta(p)<-4).sort((a,b)=>delta(a)-delta(b))[0],support=names(topThree.slice(1));
  ps.push(deskChoice(t,r,[
    [`${top.name} led ${t.team_name}’s player story. ${support?support+' gave the lineup a second wave behind him.':''}`,`${top.name} led the page for ${t.team_name}. ${support?support+' gave the lineup more than one place to find a big Sunday.':''}`],
    [`${top.name} gets the good china after owning the week for ${t.team_name}. ${support?support+' made respectable company.':''}`,`${top.name} was the elegant part of the card. ${support?'Behind that, '+support+' kept the table from looking bare.':''}`],
    [`PUT ${top.name.toUpperCase()} IN THE BIG TYPE. ${support?support+' earned space below the fold.':''}`,`${top.name} owned the player page. ${support?'The supporting headline goes to '+support+'.':''}`],
    [`${top.name} gave ${t.team_name} the best player line on the roster. ${support?support+' supplied enough behind him to keep the afternoon from becoming a solo act.':''}`,`${top.name} was the clear centerpiece. ${support?support+' mattered around him too.':''}`]
  ]));
  if(bad&&String(bad.id)!==String(top.id))ps.push(deskChoice(t,r,[
    [`${bad.name} finished at ${one(bad.points)} against a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The win kept that miss in the margins; another week may not.':'In a loss, that quiet slot earns a longer look.'}`,`${bad.name} never found the expected afternoon, ${one(bad.points)} against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'The stars covered for it this time.':'The loss gave the miss nowhere to hide.'}`],
    [`${bad.name} supplied only ${one(bad.points)} against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'The victory makes that forgivable, not fashionable.':'That is the kind of detail a loss refuses to accessorize away.'}`,`${one(bad.points)} from ${bad.name}, against ${one(bad.projected)} projected, was the part of the card we would politely send back. ${Number(t.points)>Number(t.opponent_points)?'Winning bought grace.':'Losing did not.'}`],
    [`${bad.name} landed at ${one(bad.points)} after a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The rest of the lineup kept it out of the headline.':'The final score dragged it straight onto the back page.'}`,`${bad.name} missed the expected mark, ${one(bad.points)} against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'Call it a warning under a winning headline.':'Call it one of the places the loss went missing.'}`],
    [`${bad.name} gave ${t.team_name} only ${one(bad.points)} against a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The win covered it; the same miss in a close loss would feel much louder.':'That shortfall belongs in the explanation for the loss.'}`,`${bad.name} finished ${one(Number(bad.projected)-Number(bad.points))} points under projection. ${Number(t.points)>Number(t.opponent_points)?'This time, the rest of the lineup made it survivable.':'This time, it mattered.'}`]
  ]));
  const topContext=teamFootballRead(t,top,r,'star');if(topContext)ps.push(topContext);
  if(bad&&String(bad.id)!==String(top.id)){const badContext=teamFootballRead(t,bad,r,'hot-seat');if(badContext)ps.push(badContext)}
  const trajectoryRows=rows.map(p=>({p,tr:teamTrajectory(p)})).filter(x=>x.tr).sort((a,b)=>{const priority={breakout:6,'early-breakout':5,decline:5,rookie:4,reliable:3,stumble:2,veteran:1};return (priority[b.tr.kind]||0)-(priority[a.tr.kind]||0)||Number(b.tr.strength)-Number(a.tr.strength)}),used=new Set();
  for(const x of trajectoryRows){if(used.has(String(x.p.id)))continue;used.add(String(x.p.id));ps.push(x.tr.text);if(used.size>=2)break}
  return ps;
}


function teamLedeV27(t,r){
  const core=naturalLede(t,r),rows=list(t),top=rows[0],topLine=top?teamStatLine(top):null,score=teamScoreConstructionStory(t,r),
    opponent=currentOpponentFootballStory(t,r),season=seasonContextStoryV26(t,r),ps=[];
  const starVerdict=top?deskChoice(t,r,[
    [`${top.name} handled a role ${t.team_name} can comfortably hand him again next Sunday.`],
    [`${top.name} did the work with enough volume to make the result look as good on Monday as it did Sunday night.`],
    [`THE STAR LINE WAS REAL. ${top.name} did the heavy lifting and left everybody else room to breathe.`],
    [`${top.name} handled enough real work that calling the afternoon a fluke would require ignoring the evidence.`]
  ]):null;
  ps.push([core[0],topLine,starVerdict].filter(Boolean).join(' '));
  ps.push([core[1],score].filter(Boolean).join(' '));
  ps.push([opponent,season].filter(Boolean).join(' '));
  return ps.filter(Boolean);
}
function watchSentenceV27(x){
  const p=x.p,tr=x.tr,key=p.id||p.name;
  if(tr.kind==='breakout'||tr.kind==='early-breakout')return keyedChoice(key,[
    `${p.name} is making a real case to become one of this season’s breakout players. ${tr.text}`,
    `${p.name} is the upside name worth circling because the role keeps getting harder for opponents to ignore. ${tr.text}`,
    `${p.name} is starting to look like a player defenses may have to plan around every week. ${tr.text}`
  ]);
  if(tr.kind==='reliable')return keyedChoice(key,[
    `${p.name} is the steadier story. ${tr.text}`,
    `No alarm bells around ${p.name}. ${tr.text}`,
    `${p.name} looks like the boring kind of useful. ${tr.text}`
  ]);
  if(tr.kind==='decline')return `${p.name} has earned the uncomfortable paragraph. ${tr.text}`;
  if(tr.kind==='stumble')return `${p.name} gets a mulligan, not a free pass. ${tr.text}`;
  if(tr.kind==='rookie')return `${p.name} is the rookie worth tracking. ${tr.text}`;
  return tr.text;
}

function teamPlayersV27(t,r){
  const rows=list(t),top=rows[0];if(!top)return ['n/a'];
  const bad=rows.filter(p=>delta(p)!=null&&delta(p)<-4&&String(p.id)!==String(top.id)).sort((a,b)=>delta(a)-delta(b))[0],
    topLine=teamStatLine(top),support=supportingCastFootballStory(t,r),topUsage=teamUsageComment(t,top,'star'),
    trajectoryRows=rows.map(p=>({p,tr:teamTrajectory(p)})).filter(x=>x.tr).sort((a,b)=>{
      const priority={breakout:6,'early-breakout':5,decline:5,rookie:4,reliable:3,stumble:2,veteran:1};
      return (priority[b.tr.kind]||0)-(priority[a.tr.kind]||0)||Number(b.tr.strength)-Number(a.tr.strength);
    }).slice(0,2),ps=[];
  const topOpen=deskChoice(t,r,[
    [`${top.name} gets the lead paragraph after ${one(top.points)} fantasy points. ${t.team_name} got the volume and efficiency it needed from him.`],
    [`${top.name} gets the good china after ${one(top.points)} fantasy points. ${top.name}’s performance was excessive, elegant and entirely welcome.`],
    [`PUT ${top.name.toUpperCase()} IN THE BIG TYPE: ${one(top.points)} fantasy points. ${top.name} did the heavy lifting and made the headline easy.`],
    [`${top.name} is the first name in the file after ${one(top.points)} fantasy points. ${top.name}’s workload makes the case cleaner than the headline does.`]
  ]);
  ps.push([topOpen,topLine,topUsage].filter(Boolean).join(' '));
  if(support)ps.push(support);
  const badRead=bad?teamFootballRead(t,bad,r,'hot-seat'):null;
  const watch=trajectoryRows.map(watchSentenceV27).join(' ');
  const close=deskChoice(t,r,[
    [`${t.team_name} has a headliner, useful company and at least one player worth checking again next Sunday. ${t.team_name} can live with that problem more easily than searching the roster for a pulse.`],
    [`${t.team_name} has a proper cast: stars, supporting actors and somebody making the critic reach for a sharper pen.`],
    [`STARS, SUPPORT AND ONE PROBLEM TO FIX. ${t.team_name} gave the back page enough material without turning the article into an autopsy.`],
    [`${t.team_name} has players to trust and players to watch. ${t.team_name}’s next Sunday gets to separate the useful pattern from the convenient story.`]
  ]);
  ps.push([badRead,watch,close].filter(Boolean).join(' '));
  return ps.filter(Boolean);
}

function hotCool(t,kind,r){
  const rows=list(t).filter(p=>delta(p)!=null);if(!rows.length)return ['n/a'];
  if(kind==='hot-seat'){const p=rows.slice().sort((a,b)=>delta(a)-delta(b))[0],d=delta(p);if(d>=-2)return ['n/a'];return [deskChoice(t,r,[
    [`${p.name} gets the Hot Seat after a week that fell well short of expectation. ${Number(t.points)>Number(t.opponent_points)?'The win buys patience; another quiet Sunday may not.':'The loss gives the miss nowhere to hide.'}`],
    [`${p.name} is on the Hot Seat. Even the good china cannot disguise a week that missed the standard, and ${Number(t.points)>Number(t.opponent_points)?'winning grants only temporary diplomatic immunity.':'losing makes the review considerably less tasteful.'}`],
    [`HOT SEAT: ${p.name}. Sunday filed a complaint in all caps. ${Number(t.points)>Number(t.opponent_points)?'The team won anyway; do not test that magic twice.':'The team lost, so the angry font stays.'}`],
    [`${p.name} lands on the Hot Seat after missing the expected level. ${Number(t.points)>Number(t.opponent_points)?t.team_name+' survived it once.':t.team_name+' lost, so the miss becomes part of the explanation.'}`]
  ])];}
  const p=rows.slice().sort((a,b)=>delta(b)-delta(a))[0],d=delta(p);if(d<=2)return ['n/a'];return [deskChoice(t,r,[
    [`${p.name} gets the Cool Throne after supplying the kind of week ${t.team_name} would happily order again. ${Number(t.points)>Number(t.opponent_points)?'It belonged in the win.':'The loss could not bury it.'}`],
    [`${p.name} takes the Cool Throne. Tasteful excess is still excess, but nobody is sending it back.`],
    [`COOL THRONE: ${p.name}. No further lobbying required.`],
    [`${p.name} earns the Cool Throne. ${Number(t.points)>Number(t.opponent_points)?'That was winning work.':'That was good work trapped inside a bad result.'}`]
  ])];
}

function sentiment(t,r){
  const won=Number(t.points)>Number(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points)),top=list(t)[0],ctx=t.league_context||{},rank=Number(ctx.standings_rank),m=t.mida_outlook,miss=t.best_lineup_miss,tx=Number(t.current_week_trade_count||0),ps=[],resultTone=margin>=20?'comfortable':margin<=6?'nervy':'useful';
  ps.push(won?deskChoice(t,r,[
    [`${t.team_name} fans get a ${resultTone} win and ${top?top.name+' as an obvious Monday hero.':'a scoreboard worth enjoying.'} ${t.team_name} can enjoy it; September is still early enough to make parade plans look ridiculous by Halloween.`],
    [`The ${t.team_name} mood is appropriately overdressed after a ${resultTone} win. ${top?top.name+' gets the toast; ':''}anyone pricing parade confetti in September is still being asked to leave the dining room.`],
    [`${t.team_name} WON, so the group chat is behaving like a municipal emergency. ${top?top.name+' is the easiest name to scream; ':''}the rest of the fan base may now enjoy exactly one week of dangerous confidence.`],
    [`${t.team_name} supporters have a win, which means suspicion has temporarily been replaced by screenshots. ${top?top.name+' is where the praise starts; ':''}the important change is that optimism now has a receipt.`]
  ]):deskChoice(t,r,[
    [`${t.team_name} fans have a ${resultTone} loss to complain about, and the complaint is legitimate. ${top?top.name+' is not where the blame starts; ':''}the frustration belongs to the lineup around the useful pieces.`],
    [`The ${t.team_name} mood has all the grace a ${resultTone} loss deserves, which is to say very little. ${top?top.name+' can keep a seat at the good table; ':''}everyone else should expect reviews.`],
    [`${t.team_name} LOST, so the group chat has skipped lowercase letters entirely. ${top?top.name+' is spared the first wave; ':''}the fan base has moved straight to demanding names and explanations.`],
    [`${t.team_name} supporters have moved from optimism to cross-examination. ${top?top.name+' is not the first defendant; ':''}the loss gives the fan base plenty of other places to point.`]
  ]));
  const position=Number.isFinite(rank)?`No. ${rank} of ${Number(ctx.league_size)||32}`:record(t),expectation=valid(m?.playoff)?Number(m.playoff)>=70?'contender-level expectations':Number(m.playoff)<20?'a fan base already running short on patience':'a season that is still very much up for argument':'an unsettled season';
  ps.push(deskChoice(t,r,[
    [`At ${position}, ${t.team_name} has ${expectation}. ${won?t.team_name+' has earned a calmer Tuesday; another win would turn optimism into expectation.':t.team_name+' has already made next Sunday louder than it needed to be.'}`],
    [`At ${position}, ${t.team_name} has ${expectation}. The tasteful fan response is apparently impossible, so expect every good decision to become genius and every bad one to become a referendum by Tuesday morning.`],
    [`PUBLIC NUISANCE REPORT: ${t.team_name} sits at ${position} with ${expectation}. The fan base has enough information to be loud and nowhere near enough information to be reasonable. Perfect.`],
    [`The public mood has context: ${t.team_name} is ${position} with ${expectation}. Supporters are not reacting only to Sunday; they are reacting to what this roster was supposed to become.`]
  ]));
  if((miss?.reserve&&miss?.starter&&Number(miss.gap)>5)||tx>0)ps.push(deskChoice(t,r,[
    [`Management is part of the mood too. ${miss?.reserve&&Number(miss.gap)>5?'A real eligible lineup alternative was left unused, so fans have a concrete decision to revisit.':'The roster changed this week, so the fan base now gets to grade the move against actual football instead of transaction-day optimism.'}`],
    [`Naturally, the crowd has also found management. ${miss?.reserve&&Number(miss.gap)>5?'There was a real lineup choice available, which means this is criticism rather than hindsight cosplay.':'Recent roster changes have moved from cocktail conversation to performance review.'}`],
    [`AND YES, MANAGEMENT IS IN THE COMMENTS. ${miss?.reserve&&Number(miss.gap)>5?'There was an eligible better lineup available, so the screenshot folder is open.':'The recent moves now have Sundays attached to them, which is when the fun starts.'}`],
    [`${t.team_name} supporters also have a management angle. ${miss?.reserve&&Number(miss.gap)>5?'An eligible lineup alternative existed, so that decision belongs in the criticism.':'Recent transactions now have on-field consequences to judge.'}`]
  ]));
  const trajectory=list(t).map(p=>({p,tr:teamTrajectory(p)})).filter(x=>x.tr&&['rookie','breakout','early-breakout','decline','stumble'].includes(x.tr.kind)).sort((a,b)=>Number(b.tr.strength)-Number(a.tr.strength))[0],next=t.next_opponent_name||'the next opponent';
  ps.push(deskChoice(t,r,[
    [`The mood does not reset at midnight. ${trajectory?trajectory.p.name+' has become part of the week-to-week conversation, and ':''}${next} is where ${t.team_name} either gives its supporters a calmer Tuesday or adds another clipping to the complaint folder.`],
    [`${t.team_name} supporters now have something specific to obsess over, which is always healthier than free-range panic. ${trajectory?trajectory.p.name+' is one of the names changing expectations, and ':''}${next} gets the next opportunity to ruin the table setting.`],
    [`PUBLIC MOOD FORECAST: nobody is calming down. ${trajectory?trajectory.p.name+' has joined the weekly argument, and ':''}${next} gets the next chance to turn confidence into confetti or complaints into a full municipal service.`],
    [`Supporters are carrying this result into ${next}, not filing it away. ${trajectory?trajectory.p.name+' is now one of the names under the brightest light, and ':''}another Sunday will either make the current mood look perceptive or hilariously premature.`]
  ]));
  return ps;
}

function scheduleSignificanceStory(t,r){
  const currentWeek=Number(t.week_classification?.week)||1,up=(t.upcoming_opponents||[]).filter(x=>Number(x.week)>currentWeek).slice().sort((a,b)=>Number(a.week)-Number(b.week)),next=up[0],later=up.slice(1,3),a=t.next_week_availability||{};
  const strength=x=>{const rank=Number(x?.context?.standings_rank),p=Number(x?.mida?.playoff);if((Number.isFinite(rank)&&rank<=8)||(Number.isFinite(p)&&p>=65))return 'strong';if((Number.isFinite(rank)&&rank>=24)||(Number.isFinite(p)&&p<20))return 'soft';return 'middle'};
  const laterStrong=later.filter(x=>strength(x)==='strong'),laterSoft=later.filter(x=>strength(x)==='soft'),nextStrength=strength(next),parts=[];
  if(next&&laterStrong.length>=2)parts.push(deskChoice(t,r,[
    [`The schedule gets meaner immediately after ${next.team_name}: ${laterStrong.map(x=>x.team_name).join(' and ')} are waiting. Banking this next game would buy ${t.team_name} breathing room before the gauntlet starts collecting rent.`],
    [`After ${next.team_name}, the guest list turns unpleasant with ${laterStrong.map(x=>x.team_name).join(' and ')}. ${t.team_name} would be wise to pocket the next win before the schedule brings out the expensive cutlery.`],
    [`WIN NOW, COMPLAIN LATER: ${laterStrong.map(x=>x.team_name).join(' and ')} follow ${next.team_name}. ${t.team_name} does not need to make the coming gauntlet harder by donating the game in front of it.`],
    [`The road after ${next.team_name} runs through ${laterStrong.map(x=>x.team_name).join(' and ')}. That makes the next result more than a one-week assignment; ${t.team_name} can buy itself margin before the difficult stretch arrives.`]
  ]));
  else if(next&&laterStrong.length)parts.push(deskChoice(t,r,[
    [`${laterStrong[0].team_name} is waiting shortly after ${next.team_name}, so a win now would keep ${t.team_name} from asking a harder opponent to repair an avoidable mistake.`],
    [`The schedule puts ${laterStrong[0].team_name} behind ${next.team_name}. One should generally collect the easier plate before the chef sends out something hostile.`],
    [`${laterStrong[0].team_name} is coming soon. ${t.team_name} would prefer to meet that week with a win already in the bank instead of a rescue mission on the calendar.`],
    [`${laterStrong[0].team_name} follows soon after ${next.team_name}. That turns the next matchup into a chance to bank margin before a stronger test.`]
  ]));
  else if(next&&nextStrength==='strong'&&laterSoft.length)parts.push(deskChoice(t,r,[
    [`The hard part of this short stretch is ${next.team_name}; softer ground follows. An upset would be a bonus win, while a loss would make those later opportunities less optional.`],
    [`${next.team_name} is the unpleasant centerpiece before the schedule softens. Steal this one and the table looks lovely; lose it and ${t.team_name} simply has less permission to waste the friendlier weeks.`],
    [`${next.team_name} is the heavyweight before some relief arrives. A win would be stolen money. A loss would make the upcoming softer games look a lot more like invoices.`],
    [`${next.team_name} is the strongest immediate test before the road eases. The consequence is simple: an upset creates cushion; a loss shifts more pressure onto the friendlier games behind it.`]
  ]));
  if((a.bye_current_starters||[]).length){const names=(a.bye_current_starters||[]).slice(0,3).map(x=>x.name).join(', ');parts.push(deskChoice(t,r,[
    [`The next lineup also loses ${names} to verified NFL byes. This is where bench depth stops being decorative and starts deciding whether ${t.team_name} can survive the schedule.`],
    [`A bye-week bill is due too: ${names} will be unavailable. Depth is about to leave the brochure and enter the dining room.`],
    [`BYE-WEEK DEPTH TEST: ${names} will be unavailable. ${t.team_name} gets to find out whether the bench is furniture or actually part of the house.`],
    [`Verified NFL byes remove ${names} from the next lineup. That turns depth into part of the matchup rather than an abstract roster compliment.`]
  ]));}
  if((a.injury_current_starters||[]).length){const injuryRows=(a.injury_current_starters||[]).slice(0,3),names=injuryRows.map(x=>x.name).join(', '),verb=injuryRows.length===1?'enters':'enter',carry=injuryRows.length===1?'carries':'carry';parts.push(deskChoice(t,r,[
    [`Availability matters before kickoff: ${names} ${carry} an injury/status designation. ${t.team_name} needs a plan that does not depend on optimistic refresh-button behavior.`],
    [`${names} ${verb} the week with injury/status flags. Hope is charming; a bench plan is more useful.`],
    [`INJURY WATCH: ${names}. ${t.team_name} should prepare an actual contingency before Sunday turns the inactive list into breaking news.`],
    [`${names} ${carry} injury/status designations, so ${t.team_name} has a real depth question to solve before the matchup decides it for them.`]
  ]));}
  return parts;
}

function outlook(t,week,r){
  const ps=[],m=t.mida_outlook,op=t.next_opponent_name,gap=valid(t.next_projected)&&valid(t.next_opponent_projected)?Number(t.next_projected)-Number(t.next_opponent_projected):null;
  if(op&&gap!=null){
    const close=Math.abs(gap)<6,favored=gap>0;
    ps.push(close?deskChoice(t,r,[
      [`${t.team_name} and ${op} are separated by only ${one(Math.abs(gap))} projected points. One ordinary mistake can own a game that close.`],
      [`Only ${one(Math.abs(gap))} projected points separate ${t.team_name} and ${op}. A small margin for a large amount of future complaining.`],
      [`${one(Math.abs(gap))} projected points separate ${t.team_name} and ${op}: one lineup call, one monster quarter, one group-chat disaster.`],
      [`${t.team_name} and ${op} are nearly even on paper. In a matchup that tight, the weak spots get expensive very quickly.`]
    ]):favored?deskChoice(t,r,[
      [`The projection leans toward ${t.team_name} against ${op}. Good teams make those afternoons look ordinary.`],
      [`${t.team_name} gets the nicer side of the forecast against ${op}. Manners require taking advantage.`],
      [`The forecast likes ${t.team_name} against ${op}. Fine. Put the favorite status on the scoreboard instead of the group chat.`],
      [`${t.team_name} owns the projected edge over ${op}. A favorable matchup is only useful once it becomes a win.`]
    ]):deskChoice(t,r,[
      [`${op} has the projected edge over ${t.team_name}. One headliner probably has to steal the afternoon.`],
      [`The forecast favors ${op}. How vulgar. ${t.team_name} will need a star turn to improve the décor.`],
      [`${op} owns the projected edge. Fine—${t.team_name} gets a chance to make the upset louder than the forecast.`],
      [`${op} is favored on paper. ${t.team_name} needs its best players to make that paper irrelevant.`]
    ]));
  }
  const scout=opponentPreview(t,r);if(scout)ps.push(scout);
  if(m&&valid(m.playoff)){
    const p=Number(m.playoff),title=valid(m.title)?Number(m.title):null;
    if(p>=70)ps.push(deskChoice(t,r,[
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs${Number.isFinite(title)?' and '+one(title)+'% chance to win the championship':''}. That is expectation territory now.`],
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs${Number.isFinite(title)?', with '+one(title)+'% title odds beside it':''}. A seat at the serious table is no longer theoretical.`],
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. Those odds are too loud for ${t.team_name} to settle for interesting losses.`],
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. A roster with that much early-season promise should be collecting wins.`]
    ]));
    else if(p<20)ps.push(deskChoice(t,r,[
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. The runway is already short enough that winnable weeks matter.`],
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. There is very little room left for decorative losses.`],
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. ${t.team_name} keeps the font small until its wins get louder.`],
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. The next result needs to be a win.`]
    ]));
    else ps.push(deskChoice(t,r,[
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. ${t.team_name} is still in the middle ground where ordinary wins can change the math quickly.`],
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. ${t.team_name} is neither guest of honor nor outside the velvet rope yet.`],
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. Those are fight-your-way-up-the-page odds for ${t.team_name}.`],
      [`${t.team_name} has around a ${one(p)}% chance of reaching the playoffs. ${t.team_name} has enough runway to matter and not enough to relax.`]
    ]));
  }
  const div=divisionStory(t,r);if(div)ps.push(div);
  ps.push(...scheduleSignificanceStory(t,r));
  return ps.length?ps:['n/a'];
}

function seasonContextStoryV26(t,r){
  const ctx=t.league_context||{},rank=Number(ctx.standings_rank),size=Number(ctx.league_size)||32,st=ctx.streak||{},week=Number(t.week_classification?.week)||1,
    recent=Number(ctx.recent_avg_points),prior=Number(ctx.prior_five_avg_points),won=Number(t.points)>Number(t.opponent_points);
  const rankText=Number.isFinite(rank)?`, No. ${rank} of ${size}`:'';
  const streakText=Number(st.length)>=2?` ${t.team_name} also carries a ${Number(st.length)}-game ${st.type==='W'?'winning':st.type==='L'?'losing':'result'} streak.`:'';
  const form=(week>=3&&Number.isFinite(recent)&&Number.isFinite(prior)&&prior>0&&Math.abs(recent-prior)>=4)?` Recent scoring sits at ${one(recent)} per game versus ${one(prior)} in the preceding stretch.`:'';
  return deskChoice(t,r,[
    [won
      ?`${t.team_name} leaves Week ${week} at ${record(t)}${rankText}.${streakText}${form} ${t.team_name} has one result in the bank; the next one gets to decide whether the clipping grows legs.`
      :`${t.team_name} leaves Week ${week} at ${record(t)}${rankText}.${streakText}${form} The first clipping is ugly. ${t.team_name} gets a week to keep it from becoming company.`],
    [won
      ?`${t.team_name} leaves Week ${week} at ${record(t)}${rankText}.${streakText}${form} The table looks nicer already. One should resist ordering the commemorative silverware.`
      :`${t.team_name} leaves Week ${week} at ${record(t)}${rankText}.${streakText}${form} The table is already less flattering. Kindly keep the commemorative silverware boxed.`],
    [won
      ?`${t.team_name.toUpperCase()} IS ${record(t)}${rankText}.${streakText}${form} Keep the parade route folded, but nobody has to apologize for enjoying the scoreboard.`
      :`${t.team_name.toUpperCase()} IS ${record(t)}${rankText}.${streakText}${form} ${t.team_name} can put the parade route back in the drawer and circle next Sunday in angry ink.`],
    [won
      ?`${t.team_name} is ${record(t)} through Week ${week}${rankText}.${streakText}${form} ${t.team_name}’s record is small; the consequences are not imaginary.`
      :`${t.team_name} is ${record(t)} through Week ${week}${rankText}.${streakText}${form} One loss is not a pattern. It is, however, already in the record.`]
  ]);
}

function currentOpponentFootballStory(t,r){
  const o=t.opponent_roster,rows=(o?.starters||o?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const star=rows[0],second=rows[1];if(!star)return null;
  const won=Number(t.points)>Number(t.opponent_points),clause=statClause(star),support=second?` ${second.name} added ${one(second.points)} fantasy points.`:'';
  return deskChoice(t,r,[
    [`${t.opponent_name} did not go quietly. ${star.name} ${clause||'produced the best line on the other roster'}, a performance worth ${one(star.points)} fantasy points.${support} ${won?t.team_name+' absorbed the best counterpunch and kept scoring.':t.team_name+' never found enough elsewhere to answer it.'}`],
    [`${star.name} was the attractive part of ${t.opponent_name}’s afternoon. ${star.name} ${clause||'did the useful work'}; the line was worth ${one(star.points)} fantasy points.${support} ${won?'Winning through that makes the '+t.team_name+' result look sturdier.':'That was enough elegance across the table to make '+t.team_name+' pay.'}`],
    [`${star.name.toUpperCase()} KEPT ${t.opponent_name.toUpperCase()} ALIVE by ${clause||'doing the useful work'}, and the line became ${one(star.points)} fantasy points.${support} ${won?t.team_name+' took the punch and kept moving.':t.team_name+' never produced the counterpunch it needed.'}`],
    [`${star.name} supplied the strongest answer for ${t.opponent_name} by ${clause||'leading the opposing lineup'}, good for ${one(star.points)} fantasy points.${support} ${won?t.team_name+' won anyway, which makes the result sturdier.':t.team_name+' never found an answer of equal weight.'}`]
  ]);
}

function teamScoreConstructionStory(t,r){
  const rows=list(t);if(!rows.length||!valid(t.points))return null;
  const top3=rows.slice(0,3),top3pts=top3.reduce((n,p)=>n+Number(p.points||0),0),share=Number(t.points)>0?top3pts/Number(t.points):0,
    projDelta=valid(t.projected)?Number(t.points)-Number(t.projected):null,won=Number(t.points)>Number(t.opponent_points),
    topNames=top3.map(p=>p.name).join(', '),pct=Math.round(share*100),key='score-shape:'+String(t.roster_id);
  let shape;
  if(share>=.7)shape=keyedChoice(key,[
    `${topNames} accounted for about ${pct}% of ${t.team_name}’s scoring. The stars carried almost everything.`,
    `About ${pct}% of ${t.team_name}’s points came from ${topNames}. The top of the lineup did nearly all of the heavy lifting.`,
    `${t.team_name} leaned hard on ${topNames}, who combined for ${one(top3pts)} points — roughly ${pct}% of the team total.`,
    `The score was top-heavy: ${topNames} supplied roughly ${pct}% of ${t.team_name}’s production.`
  ]);
  else if(share>=.58)shape=keyedChoice(key,[
    `${topNames} supplied about ${pct}% of ${t.team_name}’s scoring. ${t.team_name}’s stars drove the week without turning it into a one-man rescue.`,
    `${t.team_name} got roughly ${pct}% of its points from ${topNames}. Star-driven, not star-dependent.`,
    `${topNames} combined for ${one(top3pts)} points, about ${pct}% of the ${t.team_name} total. ${t.team_name}’s core showed up and the rest still mattered.`,
    `Most of ${t.team_name}’s scoring ran through ${topNames}, who produced about ${pct}% of the total.`
  ]);
  else shape=keyedChoice(key,[
    `${topNames} supplied about ${pct}% of ${t.team_name}’s scoring. The rest of the lineup did real work too.`,
    `${t.team_name} spread the work around: its top three scorers, ${topNames}, accounted for only about ${pct}% of the total.`,
    `Even ${topNames} combined for just ${one(top3pts)} points, roughly ${pct}% of ${t.team_name}’s total. The supporting slots carried their share.`,
    `Only about ${pct}% of ${t.team_name}’s scoring came from ${topNames}. Balance did a lot of the work.`
  ]);
  let expectation='';
  if(projDelta!=null){
    const ekey='score-proj:'+String(t.roster_id);
    if(Math.abs(projDelta)<6)expectation=' '+keyedChoice(ekey,[
      `${t.team_name} finished within ${one(Math.abs(projDelta))} of projection. No miracle, no collapse.`,
      `The final score landed only ${one(Math.abs(projDelta))} from projection. ${t.team_name} looked about as dangerous as advertised.`,
      `${t.team_name} came in ${one(Math.abs(projDelta))} from its projection. The surprise came from where the points showed up, not how many arrived.`
    ]);
    else if(projDelta>0)expectation=' '+keyedChoice(ekey,[
      `${t.team_name} beat projection by ${one(projDelta)} and gave itself room the pregame forecast never promised.`,
      `${t.team_name} finished ${one(projDelta)} above projection. ${t.team_name} used that cushion to make the afternoon considerably less stressful.`,
      `The lineup cleared projection by ${one(projDelta)}. ${won?`${t.team_name} turned the extra production into a win.`:`${t.team_name} still could not turn the overperformance into a win.`}`
    ]);
    else expectation=' '+keyedChoice(ekey,[
      `${t.team_name} left ${one(Math.abs(projDelta))} projected points on the table, and ${won?'the win hid the shortfall.':'the loss made it impossible to ignore.'}`,
      `${t.team_name} finished ${one(Math.abs(projDelta))} below projection. ${won?'Winning kept it from becoming the headline.':'In a loss, those missing points get very loud.'}`,
      `The lineup missed projection by ${one(Math.abs(projDelta))}. ${won?`${t.team_name} survived it.`:`${t.team_name} needed more and never found it.`}`
    ]);
  }
  return shape+expectation;
}

function supportingCastFootballStory(t,r){
  const rows=list(t),bad=rows.filter(p=>delta(p)!=null&&delta(p)<-4).sort((a,b)=>delta(a)-delta(b))[0],
    supportRows=rows.slice(1).filter(p=>!bad||String(p.id)!==String(bad.id)).slice(0,2);
  if(!supportRows.length)return null;
  const pieces=[];
  for(const p of supportRows){
    const line=teamStatLine(p),prior=Number(p.prior_season_avg),priorGames=Number(p.prior_season_games)||0,pts=one(p.points);
    let context='';
    if(Number.isFinite(prior)&&prior>0&&priorGames>=6){
      context=Number(p.points)>=prior*1.25
        ?keyedChoice(p.id||p.name,[`That was a considerably louder Sunday than the ${one(prior)} fantasy points ${p.name} averaged last season.`,`Last year’s ${one(prior)}-point average suddenly looks modest beside this one.`,`${p.name} averaged ${one(prior)} last season; Sunday was the upgraded version.`])
        :Number(p.points)<=prior*.7
          ?keyedChoice(p.id||p.name,[`Last season’s ${one(prior)}-point average makes the quiet day harder to wave away.`,`${p.name} averaged ${one(prior)} last year, which is why this one deserves a second look next Sunday.`,`The old ${one(prior)}-point average says ${t.team_name} is used to getting more here.`])
          :keyedChoice(p.id||p.name,[`${p.name} averaged ${one(prior)} last season, and Sunday looked comfortably familiar.`,`This was the same neighborhood as last year’s ${one(prior)}-point average — useful, unsurprising production.`,`The ${one(prior)}-point average from last season still looks like a fair description of ${p.name}.`]);
    }
    if(line)pieces.push(`${line.replace(/\.$/,'')}; that work was worth ${pts} fantasy points. ${context}`.trim());
    else pieces.push(`${p.name} supplied ${pts} fantasy points for ${t.team_name}. ${context}`.trim());
  }
  const close=deskChoice(t,r,[
    [`${rows[0]?.name||'The leading scorer'} owned the headline, but ${t.team_name} had enough competent company to make the lineup look like a roster instead of a rescue mission.`],
    [`Stars prefer company, and ${t.team_name} supplied enough of it to keep the afternoon tastefully plural.`],
    [`SECONDARY SCORING MADE THE PAPER TOO. ${t.team_name} did not need one superhero and eleven witnesses.`],
    [`Two useful supporting lines make the ${t.team_name} result harder to dismiss as one player doing all the work.`]
  ]);
  return pieces.join(' ')+' '+close;
}

function lineupProcessStory(t,r){
  const miss=t.best_lineup_miss;if(!(miss?.reserve&&miss?.starter&&Number.isFinite(Number(miss.gap))&&Number(miss.gap)>0))return null;
  const slot=miss.slot||miss.starter.lineup_slot||'lineup';
  return deskChoice(t,r,[
    [`${miss.reserve.name} could have replaced ${miss.starter.name} at ${slot} and improved the score by ${one(miss.gap)}. ${t.manager_name} survived that call this week; the next close matchup may be less forgiving.`],
    [`${miss.reserve.name} was a real eligible alternative to ${miss.starter.name} at ${slot}. A civilized manager calls that something to remember, not something to confess.`],
    [`LINEUP RECEIPT: ${miss.reserve.name} had a legal path into ${miss.starter.name}’s ${slot} spot and would have improved the lineup. That screenshot gets louder if the same choice appears next Sunday.`],
    [`${miss.reserve.name} had a legitimate path into ${miss.starter.name}’s ${slot} spot and would have improved the lineup. Whether it changed the final result is the only mercy.`]
  ]);
}

function chairFootballStory(t,kind,r){
  const rows=list(t).filter(p=>delta(p)!=null);if(!rows.length)return null;const p=kind==='hot-seat'?rows.slice().sort((a,b)=>delta(a)-delta(b))[0]:rows.slice().sort((a,b)=>delta(b)-delta(a))[0];if(!p)return null;const tr=teamTrajectory(p);if(!tr)return null;
  if(tr.kind==='rookie')return `${p.name} is a rookie, so this is the first checkpoint of a much longer season.`;
  if(tr.kind==='breakout'||tr.kind==='early-breakout')return `${p.name} is making a real case to be one of this season’s breakout players. A few more Sundays like this will make the old baseline look badly out of date.`;
  if(tr.kind==='decline')return `Veteran ${p.name} has slid for several weeks now. The old weekly standard is no longer automatic.`;
  if(tr.kind==='reliable')return kind==='hot-seat'?`${p.name} has usually been steadier than this. One bad week is an annoyance; another would be a story.`:`${p.name} landed near an established weekly level again. Boring can be very profitable.`;
  if(tr.kind==='stumble')return `${p.name} has a longer track record than this one result. Call ${p.name}’s week a stumble until repetition says otherwise.`;
  if(tr.kind==='veteran')return `Veteran ${p.name} already owns a long baseline. Week 1 barely moved ${p.name} away from it.`;
  return null;
}

function nextOpponentFootballStory(t,r){
  const o=t.next_opponent_roster,rows=(o?.starters||o?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),star=rows[0],second=rows[1];
  if(!o||!star)return null;
  const ctx=teamFootballRead(t,star,r,'next-opponent'),opp=t.next_opponent_name||o.team_name,rec=t.next_opponent_context?.record,playoff=Number(t.next_opponent_mida?.playoff),support=second?` ${second.name} added ${one(second.points)}.`:'';
  const open=deskChoice(t,r,[
    [`${opp} is next, and ${star.name} arrives off a ${one(star.points)}-point week.${support}`],
    [`${star.name} just gave ${opp} ${one(star.points)} fantasy points.${support} That is enough form to make next week interesting before the forecast enters the room.`],
    [`NEXT WEEK HAS A HEADLINER: ${star.name}, fresh off ${one(star.points)} for ${opp}.${support}`],
    [`${star.name} comes into next week after ${one(star.points)} for ${opp}.${support}`]
  ]);
  const stakes=[];
  if(t.next_divisional)stakes.push(`${opp} shares ${t.division_name||'the division'} with ${t.team_name}, so the result moves both teams at once.`);
  if(rec)stakes.push(`${opp} enters at ${Number(rec.wins)||0}-${Number(rec.losses)||0}.`);
  if(Number.isFinite(playoff)&&(playoff>=70||playoff<20))stakes.push(playoff>=70?`${opp} already sits above ${one(playoff)}% in the current playoff outlook.`:`${opp} sits around ${one(playoff)}% in the current playoff outlook.`);
  return [open,ctx,...stakes].filter(Boolean).join(' ');
}

function managementNarrativeCoda(t,r){
  const tx=consolidateTransactions(t)||[];if(!tx.length)return null;
  const won=Number(t.points)>Number(t.opponent_points),team=t.team_name;
  return deskChoice(t,r,[
    [won?`${team} won with the roster changes already in place. ${team} management gets a quiet Tuesday instead of an interrogation.`:`${team} lost with the recent changes in place. Every recent ${team} move gets a little louder after a loss.`],
    [won?`The new ${team} arrangement gets to breathe under a win. A civilized opening, if nothing else.`:`A ${team} loss makes every recent rearrangement look a little more important.`],
    [won?`${team.toUpperCase()} WON WITH THE NEW LOOK. ${team}’s front office can enjoy one quiet Tuesday.`:`${team.toUpperCase()} LOST WITH THE NEW LOOK. Every recent ${team} move just became easier to criticize.`],
    [won?`${team} won with the recent changes in place. Nobody needs a transaction autopsy this week.`:`${team} lost with the recent changes in place. ${team}’s new configuration now owes the roster a better Sunday.`]
  ]);
}

function strongTransactionPerformance(p){const pts=Number(p?.points),proj=Number(p?.projected),prior=Number(p?.prior_season_avg);return Number.isFinite(pts)&&(pts>=18||(Number.isFinite(proj)&&pts>=12&&pts-proj>=5)||(Number.isFinite(prior)&&prior>0&&pts>=12&&pts>=prior*1.35));}
function transactionDestination(t,p){return p?.current_fantasy_team_name&&String(p.current_fantasy_roster_id)!==String(t.roster_id)?` for ${p.current_fantasy_team_name}`:` after leaving ${t.team_name}`;}
function managementImpactStory(t,r){
  const facts=t.transaction_player_facts||{},clean={...t,transactions:consolidateTransactions(t)},moves=selectImportantMoves(clean,facts);if(!moves.length)return null;
  const m=moves[0],incoming=(m.add||[]).filter(p=>valid(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],outgoing=(m.drop||[]).filter(p=>valid(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],add=names(m.add||[]),drop=names(m.drop||[]),trade=String(m.move?.type||'').toLowerCase()==='trade',inStrong=strongTransactionPerformance(incoming),outStrong=strongTransactionPerformance(outgoing);
  if(trade&&incoming&&outgoing){
    if(inStrong&&outStrong)return deskChoice(t,r,[
      [`${incoming.name} was excellent in his first Sunday for ${t.team_name}; ${outgoing.name} answered with ${one(outgoing.points)} points${transactionDestination(t,outgoing)}. The trade already has two managers talking over each other.`],
      [`${incoming.name} looked excellent immediately, while ${outgoing.name} posted ${one(outgoing.points)} points${transactionDestination(t,outgoing)}. The exchange has drama already. How considerate.`],
      [`TRADE RECEIPT: ${incoming.name} hit immediately, and ${outgoing.name} answered with ${one(outgoing.points)}${transactionDestination(t,outgoing)}. Week 1 gave both sides ammunition.`],
      [`${incoming.name} gave ${t.team_name} a strong debut; ${outgoing.name} produced ${one(outgoing.points)}${transactionDestination(t,outgoing)}. Nobody gets a victory lap yet, but the trade is already interesting.`]
    ]);
    if(inStrong)return deskChoice(t,r,[
      [`${incoming.name} opened with the better Sunday for ${t.team_name}. ${outgoing.name} was quieter on the other side, so the new arrival gets the first smile.`],
      [`${incoming.name} made the new arrangement look handsome immediately. ${outgoing.name} did not answer loudly enough to spoil the table setting.`],
      [`${incoming.name} PAID OFF EARLY. ${outgoing.name} was quiet enough for ${t.team_name} to enjoy the weekend without checking the receipt twice.`],
      [`${incoming.name} gave ${t.team_name} the better opening Sunday. ${outgoing.name} did not make the departure sting yet.`]
    ]);
    if(outStrong)return deskChoice(t,r,[
      [`${outgoing.name} had a strong Sunday${transactionDestination(t,outgoing)}. If ${t.team_name}’s replacement stays quiet, that exit is going to get uncomfortable fast.`],
      [`${outgoing.name} left and promptly had a strong week${transactionDestination(t,outgoing)}. An inelegant postcard from the former guest.`],
      [`OF COURSE ${outgoing.name} HAD A STRONG WEEK${transactionDestination(t,outgoing).toUpperCase()}. ${t.team_name} now needs the incoming side to answer.`],
      [`${outgoing.name} produced strongly${transactionDestination(t,outgoing)} after the trade. ${t.team_name} will hear about that one if the replacement stays quiet.`]
    ]);
    return `${t.team_name} made a real trade, and Week 1 was mostly a shrug from both sides. Neither side gave ${t.team_name} enough on Sunday to turn the deal into a fresh argument yet.`;
  }
  if(incoming)return inStrong?deskChoice(t,r,[
    [`${incoming.name} was excellent in his first Sunday after the move. ${t.manager_name} got exactly the kind of debut that makes a recent transaction look smart.`],
    [`${incoming.name} arrived dressed for the occasion and immediately justified another week of attention.`],
    [`${incoming.name} HIT IMMEDIATELY. ${t.team_name} management gets to enjoy that one without a footnote.`],
    [`${incoming.name} delivered a strong first Sunday after arriving. ${t.team_name} will happily take another one.`]
  ]):deskChoice(t,r,[
    [`${incoming.name} was quiet in his first week with ${t.team_name}. ${t.manager_name} will want more before the move earns any celebration.`],
    [`${incoming.name} gave the move no reason for a victory lap yet. Perfectly civilized; not every transaction requires fireworks.`],
    [`${incoming.name} did not light up the scoreboard. Fine. ${t.team_name} can give the move another Sunday before anybody writes a victory speech or an obituary.`],
    [`${incoming.name} had a quiet first Sunday with ${t.team_name}. ${t.team_name} gets no parade and no panic — just another week for ${incoming.name} to show more.`]
  ]);
  if(outgoing)return outStrong?deskChoice(t,r,[
    [`${outgoing.name} had a strong week${transactionDestination(t,outgoing)}. If ${t.team_name}’s replacement stays quiet, that exit is going to get uncomfortable fast.`],
    [`${outgoing.name} left and promptly had a strong week${transactionDestination(t,outgoing)}. The exit has sent an inconvenient postcard.`],
    [`${outgoing.name} ANSWERED THE EXIT WITH A STRONG WEEK${transactionDestination(t,outgoing).toUpperCase()}. ${t.team_name} gets to stare at that until the replacement supplies a better headline.`],
    [`${outgoing.name} produced strongly${transactionDestination(t,outgoing)}. The replacement now has a real standard to answer.`]
  ]):`${outgoing.name} was quiet after leaving ${t.team_name}. For one week, at least, the departure did not come back swinging.`;
  return add||drop?`${t.team_name} changed the roster with ${add||drop}. Week 1 gave the move almost nothing worth arguing about yet.`:null;
}

function broadcastExpansionV26(t,kind,r){
  if(kind==='lede')return [seasonContextStoryV26(t,r),teamScoreConstructionStory(t,r),currentOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='players')return [supportingCastFootballStory(t,r)].filter(Boolean);
  if(kind==='management')return [lineupProcessStory(t,r),managementImpactStory(t,r),managementNarrativeCoda(t,r)].filter(Boolean);
  if(kind==='outlook')return [nextOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='hot-seat'||kind==='cool-throne')return [chairFootballStory(t,kind,r)].filter(Boolean);
  return [];
}

function nickExpansion(t,kind,r){
  return broadcastExpansionV26(t,kind,r);
}
function bartholomewExpansion(t,kind,r){
  if(kind==='lede')return [seasonContextStoryV26(t,r),currentOpponentFootballStory(t,r),teamScoreConstructionStory(t,r)].filter(Boolean);
  if(kind==='players')return [supportingCastFootballStory(t,r)].filter(Boolean);
  if(kind==='management')return [managementImpactStory(t,r),lineupProcessStory(t,r),managementNarrativeCoda(t,r)].filter(Boolean);
  if(kind==='outlook')return [nextOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='hot-seat'||kind==='cool-throne')return [chairFootballStory(t,kind,r)].filter(Boolean);
  return [];
}
function tillyExpansion(t,kind,r){
  if(kind==='lede')return [teamScoreConstructionStory(t,r),seasonContextStoryV26(t,r),currentOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='players')return [supportingCastFootballStory(t,r)].filter(Boolean);
  if(kind==='management')return [managementImpactStory(t,r),managementNarrativeCoda(t,r),lineupProcessStory(t,r)].filter(Boolean);
  if(kind==='outlook')return [nextOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='hot-seat'||kind==='cool-throne')return [chairFootballStory(t,kind,r)].filter(Boolean);
  return [];
}
function filchExpansion(t,kind,r){
  if(kind==='lede')return [currentOpponentFootballStory(t,r),teamScoreConstructionStory(t,r),seasonContextStoryV26(t,r)].filter(Boolean);
  if(kind==='players')return [supportingCastFootballStory(t,r)].filter(Boolean);
  if(kind==='management')return [lineupProcessStory(t,r),managementImpactStory(t,r),managementNarrativeCoda(t,r)].filter(Boolean);
  if(kind==='outlook')return [nextOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='hot-seat'||kind==='cool-throne')return [chairFootballStory(t,kind,r)].filter(Boolean);
  return [];
}
function reporterExpansionV26(t,kind,r){
  const fn=r?.id==='tess-delaney'?bartholomewExpansion:r?.id==='mack-hollis'?tillyExpansion:r?.id==='nora-voss'?filchExpansion:nickExpansion;
  return fn(t,kind,r);
}

function specificityPass(t,kind,value){
  let p=String(value??'');
  const team=t.team_name;
  const swaps=[
    ['The follow-up performance from this roster is what turns the note into a trend worth remembering.',(kind==='hot-seat'?'The '+team+' response':'The '+team+' follow-up performance')+' is what turns this weekly note into a trend worth remembering.'],
    ['The optimism is allowed; the next Sunday still has to earn it.',team+' can keep the optimism; the next Sunday still has to earn it.'],
    ['The Back Page wants another name earning ink before one superstar turns the entire lineup into a weekly dependency.','The Back Page wants another '+team+' name earning ink before one superstar turns this lineup into a weekly dependency.'],
    ['A favorable matchup wasted by this team becomes a future headline with much worse punctuation.','A favorable matchup wasted by '+team+' becomes a future headline with much worse punctuation.'],
    ['Do it again and the Back Page starts saving front pages.','If '+team+' gets another week like this, the Back Page starts saving front pages.'],
    ['The record says 1-0; the anxiety can wait.',team+' is 1-0; the anxiety can wait.'],
    ['The next assignment is to make the early division gain look less temporary.',team+' now has to make the early division gain look less temporary.'],
    ['At 1-0, that is a clipping worth keeping.','At 1-0, '+team+' has a clipping worth keeping.'],
    ['There is real ground to press now—do not turn a good headline into a one-week souvenir.',team+' has real ground to press now—do not turn a good headline into a one-week souvenir.'],
    ['There is no room for decorative losses now; wins are the only headline that helps.',team+' has no room for decorative losses now; wins are the only headline that helps.'],
    ['The win survived it; the same problem will be much louder if it happens twice.',team+' survived it once; the same problem will be much louder if it happens twice.'],
    ['The replacement plan belongs in the next filing.',team+' needs a real replacement plan before next week.'],
    ['The next game will tell us more about how bankable this role is.',team+' gets another look next game, when the role should tell us how bankable this production really is.'],
    ['The door is open without being held for them. A civilized winning streak would be lovely.','The door is open for '+team+' without being held. A civilized winning streak would be lovely.'],
    ['The back-page prescription is obvious—quit making the rivals do the saving.','The back-page prescription for '+team+' is obvious—quit making the rivals do the saving.'],
    ['That makes this week part of the deal’s ongoing return, not an isolated box score.','For '+team+', that makes this week part of the deal’s ongoing return rather than an isolated box score.'],
    ['That is how you get above the fold.','For '+team+', that is how a player gets above the fold.'],
    ['That is how a lineup starts sounding dangerous.','That is how the '+team+' lineup starts sounding dangerous.'],
    ['Print the 1-0 record large enough for the rival chat.','Print '+team+'’s 1-0 record large enough for the rival chat.'],
    ['His production is now evidence in a transaction that remains open for review.','That production now belongs in '+team+'’s evaluation of the move.'],
    ['Depending on rival charity twice in a row would be terribly unbecoming.',team+' cannot keep depending on rival charity; twice in a row would be terribly unbecoming.'],
    ['Call it a warning under a winning headline.','For '+team+', call it a warning under a winning headline.'],
    ['Call it one of the places the loss went missing.','For '+team+', call it one of the places the loss went missing.'],
    ['A two-week run can still change the whole conversation.','A two-week '+team+' run can still change the whole conversation.'],
    ['A little more ground next week and we may discuss the table with the good china.','A little more '+team+' ground next week and we may discuss the table with the good china.'],
    ['A 1-0 start looks rather nicer in ink.',team+'’s 1-0 start looks rather nicer in ink.'],
    ['The verdict was still a win, so the inquiry stays informal.',team+' still got the win, so the concern stays small.'],
    ['The notebook version is shorter: the next loss would make the chase considerably uglier.','The '+team+' notebook version is shorter: the next loss would make the chase considerably uglier.'],
    ['The loss made the miss part of it.',team+'’s loss made the miss part of the story.'],
    ['The loss gave the miss nowhere to hide.',team+'’s loss gave the miss nowhere to hide.'],
    ['The invitation is written in very small print. Winning remains the tasteful response.','The '+team+' invitation is written in very small print. Winning remains the tasteful response.'],
    ['The evidence shows an opening; next week determines whether it becomes position or merely circumstance.',team+' has an opening; next week determines whether it becomes position or merely circumstance.'],
    ['The evidence is thin enough that every dropped opportunity becomes material.',team+' has so little margin that every dropped opportunity matters.'],
    ['That is the kind of detail a loss refuses to accessorize away.','That is the kind of '+team+' detail a loss refuses to accessorize away.'],
    ['File the 0-1 record and start the homework.',team+' is 0-1; the homework starts there.'],
    ['After that, every expensive accessory has to reveal whether it can actually play.','After kickoff, every expensive '+team+' accessory has to reveal whether it can actually play.'],
    ['A losing lineup cannot pretend it did not matter.','A losing '+team+' lineup cannot pretend it did not matter.'],
    ['A few clean wins would make the paperwork friendlier.','A few clean '+team+' wins would make the paperwork friendlier.'],
    ['The record is young, but the next Sunday already carries a little more weight.',team+' has a young record, but its next Sunday already carries a little more weight.'],
    ['Much too early for a coronation; exactly early enough for consequence.',team+' is much too early for a coronation and exactly early enough for consequence.'],
    ['Keep that job description for another Sunday and the old baseline starts looking stale.',team+' gets a much different expectation if that job description survives another Sunday.'],
    ['The loss means those choices will be judged against a roster that already needed more help.',team+' lost, so those choices now sit beside a roster that already needed more help.'],
    ['The loss makes the quiet afternoon harder to shrug off.',team+' lost, making that quiet afternoon harder to shrug off.'],
    ['An inelegant little reminder that exits can still send postcards.',team+' just received an inelegant reminder that exits can still send postcards.'],
    ['A loss tends to make every rearranged chair look more important.',team+' has a loss making every rearranged chair look more important.'],
    ['That shortfall belongs in the explanation for the loss.',team+' has to include that shortfall in any explanation for the loss.'],
    ['In a loss, that kind of miss becomes part of the story.',team+' lost, so that kind of miss becomes part of the story.'],
    ['That is an opening-week snapshot of the trade, not a lifetime verdict, but it already gave both managers something concrete to argue about.',team+' got an opening-week snapshot of the trade, not a lifetime verdict, and both managers already have something concrete to argue about.'],
    ['Close wins leave nicer questions than close losses.',team+' gets to live with the nicer questions that follow a close win.'],
    ['That is how a new arrival earns another week in large type.',team+' just got the kind of new-arrival performance that earns another week in large type.'],
    ['The cleanest part of the argument is the scoreboard: 1-0.',team+' has the cleanest argument available: a 1-0 scoreboard.'],
    ['The win covered it; the same miss in a close loss would feel much louder.',team+' had a win to cover that miss; a close loss would make it much louder.'],
    ['The exchange already has a little drama, which is terribly considerate of them.',team+' already has a little drama in the exchange, which is terribly considerate of everyone involved.'],
    ['A win is a pleasant place to let the experiment breathe.',team+' has a win, a pleasant place to let the experiment breathe.'],
    ['The result was a loss, so the new configuration does not get a quiet opening week.',team+' lost, so the new configuration does not get a quiet opening week.'],
    ['The loss puts a little more pressure on those changes to produce something useful quickly.',team+' lost, putting a little more pressure on those changes to produce something useful quickly.'],
    ['A civilized manager calls that something to remember, not something to confess.',team+' can call that something to remember rather than something to confess.'],
    ['An inconvenient guest list, but at least the danger is not hiding.',team+' gets an inconvenient guest list, but at least the danger is not hiding.'],
    ['That is enough form to make next week interesting before the forecast enters the room.',team+' gets enough recent form on the other side to make next week interesting before the forecast enters the room.'],
    ['Keep the parade route folded, but nobody has to apologize for enjoying the scoreboard.',team+' can keep the parade route folded and still enjoy the scoreboard.'],
    ['That one will be louder if the same choice appears next Sunday.',team+' will hear that choice much louder if it appears again next Sunday.'],
    ['That is plenty of trouble for one headline.',team+' has plenty of trouble for one headline.'],
    ['Nothing is settled, and the next matchup still got more expensive.',team+' has settled nothing, and the next matchup still got more expensive.'],
    ['The problem was not the headliner; it was everything the lineup failed to build around him.',team+' did not lose because of the headliner; it lost because the rest of the lineup failed to build around him.'],
    ['Another week with that kind of involvement would make the change harder to dismiss.',team+' would have a much harder time dismissing another week with that kind of involvement.'],
    ['If the workload survives next week, the conversation changes quickly.',team+' gets a different conversation if that workload survives next week.'],
    ['Useful Sundays like this make the price easier to admire.',team+' can admire the price a little more after a Sunday like this.'],
    ['A little more ground next week and the table may deserve the good china.',team+' can make the table worthy of the good china with a little more ground next week.'],
    ['The team lost, so the angry font is justified.',team+' lost, so the angry font is justified.'],
    ['Put the favorite status on the scoreboard instead of the group chat.',team+' can put the favorite status on the scoreboard instead of the group chat.'],
    ['A favorable matchup is only useful once it becomes a win.',team+' only gets value from the favorable matchup once it becomes a win.'],
    ['The win buys patience; another quiet Sunday may not.',team+' bought patience with the win; another quiet Sunday may not.'],
    ['That was good work trapped in a bad result.',team+' got good work trapped inside a bad result.'],
    ['The role looked different enough to make the old expectation feel less comfortable.',team+' saw a role different enough to make the old expectation less comfortable.'],
    ['His production now belongs in the ongoing judgment of that move.',team+' now has this production in the ongoing judgment of that move.'],
    ['September tables are temporary, but banked wins are not, and the old desk has learned not to confuse those two things.',team+' gets the usual September warning: the table is temporary, but the banked result is not.'],
    ['It is far too early for coronations and exactly early enough for consequences; one can be tasteful without pretending the standings are imaginary.',team+' is nowhere near a coronation and already close enough to consequences that the standings cannot be treated as imaginary.'],
    ['The Back Page can scream about stars all night, but this is the line that still matters when everybody wakes up Monday.','The Back Page can scream about '+team+' stars all night, but this is the line that still matters when everybody wakes up Monday.'],
    ['One week never closes a case, but every result changes what the next one is allowed to mean.',team+' has only one result in the books, but it changes the weight of next week.'],
    ['Next week is a good time to lower the volume.','For '+team+', next week is a good time to lower the volume.'],
    ['That witness cannot be lost in the crowd.',team+' cannot afford to lose that contribution in the crowd.'],
    ['The next file already has a lead witness.',team+' already knows the first player it has to account for next week.'],
    ['The appointment has enough actual Week 1 form to be more interesting than whatever the forecast says over cocktails.',team+' gets an appointment with enough actual Week 1 form to be more interesting than whatever the forecast says over cocktails.'],
    ['The distinction matters because Filch prosecutes available choices, not impossible bench swaps.','For '+team+', that was a real lineup decision because the alternative was actually eligible, not an impossible hindsight swap.']
  ];
  swaps.push(...[
    ['One ugly Sunday is a stumble, not a fall-off trend; another few weeks would change the classification.','One ugly '+team+' Sunday is a stumble, not a fall-off trend; another few weeks would change the classification.'],
    ['The loss gives the miss nowhere to hide.',team+'’s loss gives the miss nowhere to hide.'],
    ['One result changes the volume, not the assignment, and supporters will judge the next week against where this roster believes it belongs.','One '+team+' result changes the volume, not the assignment, and supporters will judge next week against where this roster believes it belongs.'],
    ['A real eligible lineup alternative was left unused, so fans have a concrete decision to revisit.',team+' left a real eligible lineup alternative unused, so fans have a concrete decision to revisit.'],
    ['The opener beat last year’s baseline by a wide margin and the role gave it some legitimacy; another few Sundays have to make it sustained.','For '+team+', the opener beat last year’s baseline by a wide margin and the role gave it some legitimacy; another few Sundays have to make it sustained.'],
    ['That is a useful first sign of continuity, not a new ceiling.','For '+team+', that is a useful first sign of continuity, not a new ceiling.'],
    ['The tasteful fan response is apparently impossible, so expect every good decision to become genius and every bad one to become a referendum by Tuesday morning.',team+' fans are apparently incapable of the tasteful response, so expect every good decision to become genius and every bad one to become a Tuesday referendum.'],
    ['There was a real lineup choice available, which means this is criticism rather than hindsight cosplay.',team+' had a real lineup choice available, which makes this criticism rather than hindsight cosplay.'],
    ['Tasteful excess is still excess, but nobody is sending it back.','For '+team+', tasteful excess is still excess, but nobody is sending it back.'],
    ['The important part now is whether the stronger level survives long enough to become a new baseline.','For '+team+', the important part is whether the stronger level survives long enough to become a new baseline.'],
    ['Even the good china cannot disguise a week that missed the standard, and losing makes the review considerably less tasteful.','Even '+team+'’s good china cannot disguise a week that missed the standard, and losing makes the review considerably less tasteful.'],
    ['Call it a stumble for now; repetition is what would turn it into a trend.','For '+team+', call it a stumble for now; repetition is what would turn it into a trend.'],
    ['The points count; the path is still something a defense can attack.','The points count against '+team+'; the path is still something a defense can attack.'],
    ['The team won anyway; do not test that magic twice.',team+' won anyway; do not test that magic twice.'],
    ['One week cannot prove reliability, but it looks more like continuity than reinvention.','The opener looked much more like continuity than reinvention for '+team+'.'],
    ['That screenshot gets louder if the same choice appears next Sunday.',team+' will hear that screenshot much louder if the same choice appears next Sunday.'],
    ['The fan base has enough information to be loud and nowhere near enough information to be reasonable.',team+' fans have enough information to be loud and nowhere near enough information to be reasonable.'],
    ['There was an eligible better lineup available, so the screenshot folder is open.',team+' had an eligible better lineup available, so the screenshot folder is open.'],
    ['Conveniently, the roster has provided material for both.','Conveniently, '+team+' has provided material for both.'],
    ['Whether it changed the final result is the only mercy.','Whether it changed '+team+'’s final result is the only mercy.'],
    ['That makes the roster decision more important than the box score.','That makes '+team+'’s roster decision more important than the box score.'],
    ['Supporters are not reacting only to Sunday; they are reacting to what this roster was supposed to become.',team+' supporters are not reacting only to Sunday; they are reacting to what this roster was supposed to become.'],
    ['An eligible lineup alternative existed, so that decision belongs in the criticism.',team+' had an eligible lineup alternative, so that decision belongs in the criticism.'],
    ['That was good work trapped inside a bad result.',team+' got good work trapped inside a bad result.'],
    ['The only remaining mystery is whether the lineup behaves accordingly.','For '+team+', the only remaining mystery is whether the lineup behaves accordingly.'],
    ['One week is not sustained evidence, so the label stays “candidate pending more football” for now.','The breakout label can wait; '+team+' needs a few more Sundays at this level.'],
    ['Hope is charming; a bench plan is more useful.',team+' can hope for good health; a bench plan is more useful.'],
    ['The career did not disappear in one afternoon, but the next role now matters more.','For '+team+', the career did not disappear in one afternoon, but the next role now matters more.'],
    ['The transaction earned a headline without needing the same stat line printed twice.',team+' got a transaction headline without needing the same stat line printed twice.'],
    ['That turns the next matchup into a chance to bank margin before a stronger test.','That turns '+team+'’s next matchup into a chance to bank margin before a stronger test.'],
    ['Anyone engraving the trophy is excused from the table.','Anyone engraving a '+team+' trophy is excused from the table.'],
    ['The roster decision matters more than the small sample.',team+'’s roster decision matters more than the small sample.'],
    ['Even the good china cannot disguise a week that missed the standard, and winning grants only temporary diplomatic immunity.','Even '+team+'’s good china cannot disguise a week that missed the standard, and winning grants only temporary diplomatic immunity.'],
    ['One should generally collect the easier plate before the chef sends out something hostile.',team+' should generally collect the easier plate before the chef sends out something hostile.'],
    ['The team lost, so the angry font stays.',team+' lost, so the angry font stays.'],
    ['The desk recognizes all three as renewable resources.','The '+team+' desk recognizes all three as renewable resources.'],
  ]);
  for(const [from,to] of swaps)p=p.replaceAll(from,to);
  return p;
}

export function acquisitionCallback(t,p,r){
  const a=p?.acquisition||((t.trade_acquisitions||[]).find(x=>String(x.player_id)===String(p?.id)));if(!a)return null;
  const partner=(a.counterpart_names||[]).filter(Boolean).join(', '),sent=(a.outgoing_player_names||[]).filter(Boolean),when=a.season&&a.week?` in Week ${a.week} of ${a.season}`:'';
  const price=sent.length?` after sending out ${sent.slice(0,3).join(', ')}`:a.outgoing_pick_count?` for ${a.outgoing_pick_count} draft pick${a.outgoing_pick_count===1?'':'s'}`:'';
  return deskChoice(t,r,[
    [`${t.manager_name} traded for ${p.name}${when}${partner?' in a deal with '+partner:''}${price}. A week like this is part of the return ${t.team_name} paid for.`],
    [`${p.name} came to ${t.team_name} by trade${when}${price}. Useful Sundays like this make the price easier to admire.`],
    [`TRADE RECEIPT: ${p.name} arrived${when}${price}. A big ${p.name} Sunday puts the deal in the good-news column for another week.`],
    [`${p.name} was acquired by trade${when}${partner?' from '+partner:''}${price}. Every useful Sunday now becomes part of how ${t.team_name} judges that move.`]
  ]);
}

function valueSectionV26(t,r){
  const v=t.value_history_week;if(!valid(v?.delta))return ['n/a'];
  const d=Number(v.delta),amount=Math.abs(Math.round(d)).toLocaleString('en-US'),pct=valid(v.pct)?Math.abs(Number(v.pct)):null,move=d>0?'rose':d<0?'fell':'held steady',
    core=`${t.team_name} ${move}${d===0?'':' '+amount}${pct!=null&&d!==0?' ('+one(pct)+'%)':''} over the current Value History window.`;
  if(r.id==='walter-mercer')return [core+(d>0?' That gives the roster a little more flexibility without changing what Sunday still has to prove.':d<0?' One weekly slide is not a crisis, but repeated ones make future roster decisions harder.':' The market has not changed its mind yet.')];
  if(r.id==='tess-delaney')return [core+(d>0?' A nicer price tag is pleasant; matching it with wins would be prettier.':d<0?' A small stain, perhaps, but one worth removing before it reaches the tablecloth.':' At least the market has spared us unnecessary melodrama.')];
  if(r.id==='mack-hollis')return [core+(d>0?' GOOD NEWS, SMALL FONT: more roster value without needing a parade.':d<0?' BAD NEWS, NOT PANIC NEWS: value leaked this week.':' NO MARKET DRAMA. We can survive that.')];
  return [core+(d>0?' More flexibility helps when the next injury or trade forces a real decision.':d<0?' Fewer options follow if that slide keeps going.':' The roster’s market standing is unchanged.')];
}

function reporterSectionKicker(t,kind,r){
  if(r?.id==='mack-hollis')return null;
  const banks={
    'walter-mercer':{lede:[`${t.team_name} can keep the clipping. The parade permit stays in the drawer.`,`One result earns ${t.team_name} ink, not immunity from next week.`],players:[`Good Sundays earn ink for ${t.team_name}. Repeat Sundays earn trust.`,`The old notebook rule still applies to ${t.team_name}: production is interesting; repeatable production is useful.`],management:[`${t.team_name} can win Tuesday’s paperwork later. Sunday is where management gets graded.`,`The transaction log is cheap. ${t.team_name} still has to make the decisions look smart on Sunday.`],value:[`The market page can have its paragraph. ${t.team_name} still has to play football before anyone frames the spreadsheet.`,`Roster value is useful until somebody tries to hang a banner for it. ${t.team_name} remains several Sundays short of that ceremony.`],'hot-seat':[`The Hot Seat is not a bonfire yet. ${t.team_name} can solve this with better football before somebody brings gasoline.`,`The old desk has seen worse. That is not the same as wanting to see this again from ${t.team_name}.`],'cool-throne':[`Credit where it is due: ${t.team_name} gave the notebook something pleasant to write. I assume ${t.team_name} will find a way to complicate the paperwork by Tuesday.`,`A Cool Throne is still just one good clipping. ${t.team_name} is welcome to make a habit of inconveniencing my cynicism.`],sentiment:[`${t.team_name} fans have already turned one result into a five-week argument. Tradition survives.`,`Nobody overreacts quite like a fan base with fresh evidence, and ${t.team_name} remains wonderfully qualified.`],outlook:[`${t.team_name} gets another Sunday to make the notebook simpler. It rarely does.`,`The road ahead is not mysterious for ${t.team_name}; the difficult part is doing the obvious thing.`]},
    'tess-delaney':{lede:[`${t.team_name} may enjoy the good china tonight. Anyone engraving the trophy is excused from the table.`,`A little ${t.team_name} confidence is charming. Unsupervised confidence is how furniture gets broken.`],players:[`${t.team_name} has enough interesting players to make restraint difficult, which is usually when restraint becomes fashionable.`,`One elegant Sunday is a compliment for ${t.team_name}, not a marriage proposal.`],management:[`Roster surgery always looks glamorous until the stitches have to play for ${t.team_name}.`,`The ${t.team_name} front office may admire its work briefly; the roster remains expected to survive contact with Sunday.`],value:[`The market has rendered an opinion on ${t.team_name}. How nice for it. Sunday remains the less decorative judge.`,`A roster-value chart is merely gossip in evening wear, and ${t.team_name} should resist marrying it after one dance.`],'hot-seat':[`The Hot Seat clashes terribly with the décor, which is ${t.team_name}’s problem rather than mine.`,`${t.team_name} may call this constructive criticism if “unpleasantly accurate” feels too severe.`],'cool-throne':[`The Cool Throne suits ${t.team_name} nicely. Please do not mistake one elegant ${t.team_name} afternoon for hereditary nobility.`,`Credit has been served. ${t.team_name} may enjoy it before next week sends the bill.`],sentiment:[`${t.team_name} supporters have discovered emotions again. I was hoping for a quieter hobby.`,`The ${t.team_name} fan base has reached the dangerous stage where every opinion comes with decorative confidence.`],outlook:[`${t.team_name} has another appointment with consequence. Do dress appropriately.`,`The next ${t.team_name} game is terribly inconsiderate in its insistence on being played rather than discussed.`]},
    'nora-voss':{lede:[`${t.team_name} has one result, several useful receipts, and exactly zero permission to become smug.`,`The ${t.team_name} story is allowed to be funny and suspicious at the same time. Conveniently, the roster has provided material for both.`],players:[`One ${t.team_name} box score gets attention. A pattern gets belief.`,`The useful ${t.team_name} performances have earned follow-up questions, which is a much better problem than searching for alibis.`],management:[`A ${t.team_name} transaction is not acquitted merely by existing. Sunday gets the deciding vote.`,`The ${t.team_name} front office has supplied a decision. Now the roster gets to supply consequences.`],value:[`The market submitted its paperwork on ${t.team_name}. I have accepted it as supporting material and denied its request to become the entire story.`,`Roster value has entered the record. It may sit quietly while ${t.team_name} provides something more interesting on Sunday.`],'hot-seat':[`The ${t.team_name} Hot Seat has a name on it. This is not a conviction; it is an invitation for ${t.team_name} to stop making the desk’s job so easy.`,`${t.team_name} has supplied a perfectly reasonable suspect for this week’s frustration. A ${t.team_name} rebound would ruin the investigation, which I strongly encourage.`],'cool-throne':[`The positive finding is annoyingly clean. ${t.team_name} may enjoy the Cool Throne while I search for a reason to remain suspicious.`,`Credit survives cross-examination this week. I dislike how little paperwork ${t.team_name} has left me.`],sentiment:[`${t.team_name} supporters have reached a verdict already, naturally. Appeals reopen at kickoff.`,`The ${t.team_name} public has opinions, screenshots and almost no patience. The desk recognizes all three as renewable resources.`],outlook:[`${t.team_name} knows what the next game can change. The only remaining mystery is whether the lineup behaves accordingly.`,`The road ahead gives ${t.team_name} fewer excuses than questions, which is how I prefer the paperwork.`]}
  };
  const options=banks[r?.id]?.[kind];return options?.length?keyedChoice(`${t.roster_id}:${kind}:voice`,options):null;
}

function reporterStructureV26(sections,t,r){
  const byKind=new Map((sections||[]).map(s=>[s.kind,s])),variant=Math.floor(Math.max(0,(Number(t.roster_id)||1)-1)/4)%2;
  const orders={
    'walter-mercer':[['lede','players','management','hot-seat','value','sentiment','cool-throne','outlook'],['lede','players','value','management','cool-throne','sentiment','hot-seat','outlook']],
    'tess-delaney':[['lede','players','sentiment','cool-throne','value','management','hot-seat','outlook'],['lede','sentiment','players','value','management','cool-throne','hot-seat','outlook']],
    'mack-hollis':[['lede','hot-seat','players','cool-throne','management','sentiment','value','outlook'],['lede','players','hot-seat','management','cool-throne','sentiment','value','outlook']],
    'nora-voss':[['lede','management','players','value','hot-seat','sentiment','cool-throne','outlook'],['lede','management','value','players','sentiment','hot-seat','cool-throne','outlook']]
  };
  const order=(orders[r.id]||orders['walter-mercer'])[variant];
  return order.map(k=>byKind.get(k)).filter(Boolean);
}

function dedupeArticleSections(sections){
  const seen=new Set();
  return (sections||[]).map(s=>{
    const paragraphs=(s.paragraphs||[]).map(p=>{
      if(String(p||'').trim().toLowerCase()==='n/a')return'n/a';
      const parts=String(p||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean),keep=[];
      for(const sentence of parts){
        const key=sentence.toLowerCase().replace(/\s+/g,' ').trim();
        if(key&&seen.has(key))continue;
        if(key)seen.add(key);
        keep.push(sentence);
      }
      return keep.join(' ');
    }).filter(Boolean);
    return {...s,paragraphs:paragraphs.length?paragraphs:['n/a']};
  });
}
function teamIdentityV28(t){
  const full=String(t?.team_name||'This team').trim()||'This team',meta=t?.metadata||{};
  const words=full.split(/\s+/).filter(Boolean);
  const explicitCity=String(t?.team_city||meta.team_city||meta.city||'').trim();
  const explicitMascot=String(t?.team_mascot||meta.team_mascot||meta.mascot||'').trim();
  const mascot=explicitMascot||(words.length>1?words.at(-1):full);
  const city=explicitCity||(words.length>1?words.slice(0,-1).join(' '):full);
  return {full,city,mascot,refs:[full,mascot,city].filter((x,i,a)=>x&&a.indexOf(x)===i)};
}

function teamAliasPassV28(t,value,state){
  const id=teamIdentityV28(t),text=String(value??'');if(id.refs.length<2||!id.full)return text;
  const re=new RegExp(escapeRe(id.full)+"(’s|'s)?",'g');
  return text.replace(re,(whole,possessive)=>{
    state.count=(state.count||0)+1;
    let ref=id.full;
    if(state.count>1){
      const cycle=[id.mascot,id.city,id.mascot,id.full,id.city].filter(Boolean);
      ref=cycle[(state.count-2)%cycle.length]||id.full;
    }
    if(possessive)return /s$/i.test(ref)?ref+'’':ref+possessive;
    return ref;
  });
}

function storyAngleV28(t,r){
  const rows=list(t),top=rows[0],margin=Number(t.points)-Number(t.opponent_points),won=margin>0,
    projDelta=valid(t.projected)?Number(t.points)-Number(t.projected):0,
    oppEdge=valid(t.projected)&&valid(t.opponent_projected)?Number(t.projected)-Number(t.opponent_projected):0,
    top3=rows.slice(0,3).reduce((n,p)=>n+Number(p.points||0),0),share=Number(t.points)>0?top3/Number(t.points):0,
    miss=Number(t.best_lineup_miss?.gap)||0,tx=Number(t.current_week_trade_count||0),defTop=top&&defensivePlayer(top),
    tr=rows.map(p=>({p,tr:teamTrajectory(p)})).find(x=>['breakout','early-breakout'].includes(x.tr?.kind)),
    sameDiv=String(t.division||'')!==''&&String(t.division)===String(t.opponent_roster?.division||''),
    candidates=[];
  const add=(id,score)=>candidates.push({id,score});
  add(won?'win':'loss',30);
  if(Math.abs(margin)>=35)add(won?'rout-win':'rout-loss',120+Math.abs(margin));
  if(Math.abs(margin)<=7)add(won?'close-win':'close-loss',95-Math.abs(margin));
  if(won&&oppEdge<=-8)add('upset-win',118+Math.abs(oppEdge));
  if(!won&&oppEdge>=8)add('favorite-collapse',112+oppEdge);
  if(!won&&miss>=10)add('lineup-regret',108+miss);
  if(tx>=8)add('front-office-storm',95+tx*2);
  if(defTop&&Number(top.points)>=20)add('defense-led',104+Number(top.points));
  if(share>=.78)add('star-dependent',92+share*20);
  if(projDelta>=20)add('projection-smash',98+projDelta);
  if(projDelta<=-20)add('projection-crater',98+Math.abs(projDelta));
  if(tr)add('breakout-week',96+Number(tr.tr.strength||0)*20);
  if(sameDiv)add('division-fight',100);
  const bias={
    'walter-mercer':{'close-win':16,'close-loss':16,'defense-led':12,'division-fight':14},
    'tess-delaney':{'rout-win':15,'rout-loss':15,'upset-win':14,'star-dependent':12,'projection-smash':10},
    'mack-hollis':{'front-office-storm':24,'lineup-regret':22,'rout-loss':18,'favorite-collapse':18,'upset-win':14},
    'nora-voss':{'lineup-regret':24,'favorite-collapse':22,'projection-crater':18,'star-dependent':14,'front-office-storm':12}
  }[r?.id]||{};
  candidates.forEach(x=>x.score+=Number(bias[x.id]||0));
  return candidates.sort((a,b)=>b.score-a.score)[0]?.id||(won?'win':'loss');
}

function angleLeadV28(t,r,angle){
  const q=matchupMoodV35(t),full=teamIdentityV28(t).full,opp=q.opp,score=q.score,margin=q.margin,
    seed=String(t.roster_id)+":lead-v35:"+String(angle||"")+":"+String(r?.id||"");
  const banks={
    "upset-win":[
      full+" walked in as the underdog and pulled the rug out from under "+opp+", "+score+". "+opp+" had the comfortable pregame story; "+full+" left with the only story anyone is going to repeat.",
      opp+" entered with the projection edge and left looking stunned. "+full+" stole the afternoon "+score+", turning a matchup that was supposed to favor "+opp+" into the first embarrassing receipt of its season.",
      full+" was supposed to be the side chasing. Instead, "+opp+" spent Sunday trying to catch a game that kept moving away, and "+full+" walked out with an upset worth being obnoxious about.",
      opp+" had the better forecast; "+full+" had the better Sunday. The upset matters because it made the favorite look ordinary in a game it expected to control."
    ],
    "favorite-collapse":[
      full+" had the pregame advantage and handed it to "+opp+". The "+score+" loss is the kind favorites hate because the schedule offered a winnable Sunday and "+full+" returned it unopened.",
      opp+" was supposed to be the inconvenience. Instead, "+full+" turned itself into the punch line, losing "+score+" after entering with the projection edge.",
      full+" came in favored and left "+opp+" celebrating. That is the sort of Week 1 donation the favorite will hear about all week until it gives everyone a better result to discuss.",
      full+" owned the paper advantage and "+opp+" owned the scoreboard, "+score+". I care much more about the scoreboard than the paper advantage."
    ],
    "rout-win":[
      full+" made "+opp+" spend Sunday looking for an exit, "+score+". By the time the margin reached "+one(margin)+", the game was asking how much dignity "+opp+" could save.",
      full+" beat "+opp+" "+score+" and made the matchup feel over before the app stopped updating. A "+one(margin)+"-point win gives the winner swagger and the loser a very long week.",
      full+" turned "+opp+" into Week 1 target practice, "+score+". I will not call one rout a dynasty, but "+opp+" is welcome to avoid looking at the standings until Wednesday.",
      full+" controlled "+opp+" by "+one(margin)+" points. One roster dictated the afternoon and the other spent it reacting."
    ],
    "rout-loss":[
      opp+" handed "+full+" a "+one(margin)+"-point loss, "+score+", and there is not enough tasteful language in the notebook to hide it.",
      full+" lost "+score+", the kind of margin that makes one stop looking for a single culprit and start checking whether the whole room had a bad day.",
      opp+" beat "+full+" "+one(t.opponent_points)+"–"+one(t.points)+" and made the loser look like it had wandered into somebody else’s highlight reel.",
      full+" lost by "+one(margin)+" to "+opp+". I am not pinning that loss on one player; "+opp+" found too many ways to hurt "+full+" for one excuse to survive the afternoon."
    ],
    "close-win":[
      full+" escaped "+opp+" "+score+". With only "+one(margin)+" points between them, every quiet starter and every late swing suddenly has a face and a name.",
      full+" beat "+opp+" by "+one(margin)+" points, which is less a cushion than permission to exhale. "+opp+" was one good break from ruining the entire mood.",
      full+" survived "+opp+" "+score+". Barely. Tilly recommends enjoying the win before anyone starts replaying all the ways it nearly became a disaster.",
      full+" beat "+opp+" "+score+", and the "+one(margin)+"-point margin leaves no room for pretending the result was inevitable."
    ],
    "close-loss":[
      full+" lost "+score+", and "+one(margin)+" points is close enough to make every missed opportunity feel like a personal insult. "+opp+" gets the relief; "+full+" gets the replay loop.",
      opp+" beat "+full+" by "+one(margin)+" points. Bartholomew considers close losses especially vulgar because they provide just enough hope to make hindsight unbearable.",
      full+" lost "+score+". Tilly has already found six different moments worth blaming and plans to be unfair about all of them until next Sunday.",
      full+" came up "+one(margin)+" points short against "+opp+". The distance between victory and defeat is small enough that no lineup decision gets to hide."
    ],
    "win":[
      full+" beat "+opp+" "+score+" and spent more of the afternoon imposing than reacting. The winner looked more comfortable in the matchup than the opponent.",
      full+" handled "+opp+" "+score+". The game never needed a cinematic rescue; the winner simply found more answers and kept making "+opp+" live with them.",
      full+" beat "+opp+" "+score+". Tilly’s summary: the winner looked like it knew what it wanted, the loser looked like it kept learning what had already happened.",
      full+" beat "+opp+" "+score+". The margin was clear enough to establish control without being so large that the details stopped mattering."
    ],
    "loss":[
      full+" lost "+score+" to "+opp+". The frustration is that "+opp+" found enough answers to keep every good "+full+" moment from changing the direction of the afternoon.",
      opp+" beat "+full+" "+one(t.opponent_points)+"–"+one(t.points)+". Bartholomew can find attractive individual performances in the wreckage; the team result remains poorly dressed.",
      full+" lost to "+opp+" "+score+". Tilly is willing to praise the players who earned it and equally willing to remind everybody that "+opp+" is the team doing the celebrating.",
      full+" lost "+score+". Filch finds useful individual work inside the result, but "+opp+" controlled enough of the matchup to own the verdict."
    ]
  };
  const key=banks[angle]?angle:(q.won?(q.underdog?"upset-win":q.margin>=20?"rout-win":q.margin<=7?"close-win":"win"):(q.favorite?"favorite-collapse":q.margin>=20?"rout-loss":q.margin<=7?"close-loss":"loss"));
  return keyedChoice(seed,banks[key]);
}

function fourthWallV28(t,r,angle){
  const week=Number(t.week_classification?.week)||1,gate=(Number(t.roster_id||0)+week+voice(r))%3;if(gate!==0)return null;
  const mascot=teamIdentityV28(t).mascot;
  return deskChoice(t,r,[
    [
      `I am not buying the easy version of ${mascot}. Show me the same ${mascot} role next week and I will start believing it.`,
      `I have been fooled by prettier ${mascot} Sundays than this. The useful parts from ${mascot} still have to travel.`,
      `I will overreact when the ${mascot} evidence earns it; one week of ${mascot} evidence is all I have.`
    ],
    [
      `I would prefer ${mascot} to be elegant. ${mascot} competence will have to do.`,
      `I am willing to praise ${mascot}; I refuse to make ${mascot} tasteful if the lineup decisions are ugly.`,
      `I have seen enough fashionable nonsense to appreciate ${mascot} doing the practical ${mascot} thing.`
    ],
    [
      `I TRIED RESTRAINT WITH ${mascot}. THE ${mascot.toUpperCase()} SCOREBOARD MADE IT WEIRD.`,
      `I HAVE QUESTIONS FOR ${mascot}, AND NONE OF THE ${mascot.toUpperCase()} QUESTIONS ARE QUIET.`,
      `I AM NOT NEUTRAL ABOUT BAD ${mascot.toUpperCase()} LINEUP DECISIONS. ${mascot} CAN STOP MAKING THEM.`
    ],
    [
      `I tried the generous reading of ${mascot}. The ${mascot} evidence filed an objection.`,
      `I would like a cleaner explanation for ${mascot}. The obvious ${mascot} one keeps surviving cross-examination.`,
      `I am keeping the ${mascot} receipt because ${mascot} memory gets flexible after a win.`
    ]
  ]);
}

function gameShapeV28(t,r){
  const rows=list(t),top=rows[0],second=rows[1],third=rows[2];if(!top)return null;
  const topClause=statClause(top),oppRows=(t.opponent_roster?.starters||t.opponent_roster?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),
    opp=oppRows[0],oppClause=opp?statClause(opp):null,top3=rows.slice(0,3).reduce((n,p)=>n+Number(p.points||0),0),
    share=Number(t.points)>0?Math.round(top3/Number(t.points)*100):0,projDelta=valid(t.projected)?Number(t.points)-Number(t.projected):null,
    support=[second,third].filter(Boolean).map(p=>p.name).join(' and ');
  return deskChoice(t,r,[
    [
      `${top.name} ${topClause||'owned the best line on the roster'}, and ${support||'the rest of the lineup'} kept the day from becoming empty theater around him. The top three starters produced about ${share}% of the total${projDelta!=null?', while the lineup finished '+one(Math.abs(projDelta))+' points '+(projDelta>=0?'above':'below')+' projection':''}. ${opp&&oppClause?`${opp.name} gave ${t.opponent_name} a real answer — ${opp.name} ${oppClause} — so this was not a matchup in which the other side simply failed to show up.`:''}`.trim(),
      `${top.name} was the center of the football story — ${topClause||'the strongest verified workload on the team'} — but ${support||'the supporting cast'} determined whether that performance became leverage or decoration. Roughly ${share}% of the score came from the leading trio. ${opp?`${t.opponent_name} had its own headliner in ${opp.name}${oppClause?', who '+oppClause:''}; context matters more when both sides actually land punches.`:''}`.trim()
    ],
    [
      `${top.name} ${topClause||'produced the roster’s most attractive line'}, which is the sort of excess I am willing to defend in print. ${support?`${support} supplied enough competent company to keep the evening civilized.`:'The supporting cast was considerably less decorative.'} About ${share}% of the score belonged to the top three names${projDelta!=null?', and the team landed '+one(Math.abs(projDelta))+' points '+(projDelta>=0?'above':'below')+' its forecast':''}. ${opp&&oppClause?`${opp.name} made ${t.opponent_name} annoyingly relevant too: ${opp.name} ${oppClause}.`:''}`.trim(),
      `The useful extravagance came from ${top.name}: ${topClause||'the best verified line on the roster'}. ${support?`${support} kept him from dining alone at the top of the card.`:'The rest of the table setting was sparse.'} The leading trio owned roughly ${share}% of the scoring, a concentration that looks elegant until one chair disappears. ${opp&&oppClause?`${opp.name} gave ${t.opponent_name} a legitimate counterargument — ${opp.name} ${oppClause}.`:''}`.trim()
    ],
    [
      `${top.name.toUpperCase()} EARNED THE BIG TYPE: ${topClause||'the biggest verified line on the team'}. ${support?`${support} showed up behind him, which saved me from writing a one-man rescue headline.`:'The supporting cast mostly left him yelling into the void.'} The top three starters owned about ${share}% of the score${projDelta!=null?', with the full lineup finishing '+one(Math.abs(projDelta))+' points '+(projDelta>=0?'above':'below')+' projection':''}. ${opp&&oppClause?`${opp.name} kept ${t.opponent_name} in the argument: ${opp.name} ${oppClause}.`:''}`.trim(),
      `${top.name} did the loud work — ${topClause||'the roster’s best football line'} — and ${support||'the rest of the starters'} decided whether the headline got to celebrate or complain. ${share}% of the total came from the first three names. ${opp&&oppClause?`Across the aisle, ${opp.name} was not exactly quiet: ${opp.name} ${oppClause}.`:''}`.trim()
    ],
    [
      `Start with ${top.name}: ${topClause||'the strongest verified line on the roster'}. Then notice who had to corroborate him — ${support||'not nearly enough of the supporting cast'}. The first three scorers accounted for roughly ${share}% of the total${projDelta!=null?', and the lineup finished '+one(Math.abs(projDelta))+' points '+(projDelta>=0?'above':'below')+' its projection':''}. ${opp&&oppClause?`${opp.name} supplied the clearest opposing exhibit for ${t.opponent_name}; ${opp.name} ${oppClause}.`:''}`.trim(),
      `${top.name} left the cleanest fingerprints on the result: ${topClause||'the best verified workload and production on the roster'}. ${support?`${support} corroborated the useful parts of the story.`:'The file gets thinner behind him.'} A ${share}% share from the top three tells us how concentrated the afternoon became. ${opp&&oppClause?`${opp.name} gave ${t.opponent_name} a counterexample worth respecting — ${opp.name} ${oppClause}.`:''}`.trim()
    ]
  ]);
}

function playerContextV28(t,r){
  const rows=list(t),top=rows[0],bad=rows.filter(p=>delta(p)!=null&&String(p.id)!==String(top?.id)).slice().sort((a,b)=>delta(a)-delta(b))[0],
    trajectory=rows.map(p=>({p,tr:teamTrajectory(p)})).filter(x=>x.tr).sort((a,b)=>Number(b.tr.strength)-Number(a.tr.strength))[0],team=teamIdentityV28(t).mascot;
  const parts=[];
  if(top){
    const prior=Number(top.prior_season_avg),games=Number(top.prior_season_games)||0,opp=teamOpportunity(top),raw=String(top.real_stat_line||'').replaceAll(' • ',', ');
    const roleReason=opp?.text?`the role included ${opp.text}, enough involvement to make the spike more than a box-score accident`
      :defensivePlayer(top)&&raw?`the defensive tackle-and-pressure line (${raw}) gives the performance real football underneath the fantasy total`
      :'the current role did not look accidental';
    if(Number.isFinite(prior)&&games>=6)parts.push(`${top.name} averaged ${one(prior)} fantasy points across ${games} games last season; this week’s ${one(top.points)} matters more because ${roleReason}.`);
    else if(opp?.text)parts.push(`${top.name} turned ${opp.text} into ${one(top.points)} fantasy points. For ${team}, the workload is the part worth carrying into next week; the score can take care of itself.`);
    else if(defensivePlayer(top)&&raw)parts.push(`${top.name} produced ${one(top.points)} fantasy points from a defensive tackle-and-pressure line of ${raw}. For ${team}, that is actual IDP involvement rather than a fantasy total floating without context.`);
  }
  if(bad&&Number(delta(bad))<=-4){
    const usage=teamOpportunity(bad),won=Number(t.points)>Number(t.opponent_points);
    parts.push(`${bad.name} finished ${one(Math.abs(delta(bad)))} points below projection${usage?.text?', despite '+usage.text:''}. ${won?`The result was still a win for ${team}, buying ${bad.name} cover for one Sunday; another miss becomes a real roster problem.`:`The result was a loss for ${team}, so that empty space stays in the story instead of disappearing into the margins.`}`);
  }
  if(trajectory)parts.push(trajectory.tr.text);
  if(!parts.length)return null;
  const tail=deskChoice(t,r,[
    [`For ${team}, the useful player story is workload first, fantasy total second and repetition before certainty.`],
    [`The ${team} reaction can be fashionable later; for now, remember which roles actually looked durable.`],
    [`The next ${team} argument is already waiting: who keeps the job, who loses the excuse and who forces another headline.`],
    [`The ${team} file does not need a verdict yet; it needs another Sunday to see which roles survive.`]
  ]);
  return parts.join(' ')+' '+tail;
}

function playerCounterpointV28(t,r){
  const rows=list(t),top=rows[0],bad=rows.filter(p=>delta(p)!=null&&String(p.id)!==String(top?.id)).slice().sort((a,b)=>delta(a)-delta(b))[0],
    second=rows.find(p=>String(p.id)!==String(top?.id)&&(!bad||String(p.id)!==String(bad.id))),team=teamIdentityV28(t).mascot;
  if(!bad&&!second)return null;
  if(bad){
    const clause=statClause(bad),prior=Number(bad.prior_season_avg),priorGames=Number(bad.prior_season_games)||0;
    return deskChoice(t,r,[
      [`The uncomfortable ${team} line belongs to ${bad.name}, who ${clause||'never found enough production'} and finished at ${one(bad.points)} fantasy points. ${priorGames>=6?`He averaged ${one(prior)} last season, so one poor week earns patience rather than amnesia.`:'The next Sunday decides whether this was noise or the start of a real concern.'}`],
      [`Every elegant card needs one stain, and ${bad.name} supplied the stain on the ${team} card: ${clause||'a quiet afternoon'} for ${one(bad.points)} fantasy points. ${priorGames>=6?`Last year’s ${one(prior)}-point average is the reason I am granting one week of manners.`:'Another performance like it and manners become optional.'}`],
      [`THE SMALL PRINT HAS A NAME: ${bad.name}. ${bad.name} ${clause||'never found the useful part of the day'} and gave ${team} ${one(bad.points)} fantasy points. ${priorGames>=6?`The ${one(prior)}-point average from last year buys one mulligan, not a season pass.`:'Next week decides whether the angry font stays loaded.'}`],
      [`The least cooperative ${team} witness was ${bad.name}: ${clause||'the role produced too little'} and the fantasy return was ${one(bad.points)}. ${priorGames>=6?`A ${one(prior)}-point average last season argues for context, not acquittal.`:'The file needs a second exhibit before escalation.'}`]
    ]);
  }
  return `${second.name} gave ${team} useful support at ${one(second.points)} fantasy points. A roster this deep does not need every secondary player to become a headline; it needs enough of them to keep the stars from becoming a weekly rescue service.`;
}

function ledeConsequenceV28(t,r,angle){
  const team=teamIdentityV28(t).mascot,ctx=t.league_context||{},rank=Number(ctx.standings_rank),size=Number(ctx.league_size)||32,m=t.mida_outlook,
    playoff=valid(m?.playoff)?Number(m.playoff):null,streak=ctx.streak||{};
  return deskChoice(t,r,[
    [`That leaves ${team} at ${record(t)}${Number.isFinite(rank)?', No. '+rank+' of '+size:''}${Number(streak.length)>=2?' on a '+Number(streak.length)+'-game '+(streak.type==='W'?'winning':'losing')+' run':''}. ${playoff!=null?`The current playoff outlook sits around ${one(playoff)}%, useful context without pretending September has become a verdict.`:`The standings are young enough that ${team} still gets to define what this result means.`}`],
    [`The table now lists ${team} at ${record(t)}${Number.isFinite(rank)?', No. '+rank+' of '+size:''}. ${playoff!=null?`A ${one(playoff)}% playoff outlook gives the result an expectation level, not a coronation.`:'One result is too small for destiny and large enough for a columnist.'}`],
    [`PRINT THE RECORD: ${record(t)} for ${team}${Number.isFinite(rank)?', No. '+rank+' of '+size:''}. ${playoff!=null?`The playoff meter reads ${one(playoff)}%, which is enough to fuel exactly the wrong amount of confidence in the group chat.`:'The rest of the season remains wonderfully available for overreaction.'}`],
    [`The formal record now has ${team} at ${record(t)}${Number.isFinite(rank)?', No. '+rank+' of '+size:''}. ${playoff!=null?`The current playoff estimate is ${one(playoff)}%, a useful expectation to keep beside the evidence rather than on top of it.`:'The sample is still small; the next exhibit will carry more weight.'}`]
  ]);
}

function managementStoryV28(t,facts,r){
  const clean={...t,transactions:consolidateTransactions(t)},moves=selectImportantMoves(clean,facts),miss=t.best_lineup_miss,ps=[],manager=t.manager_name||'Management',team=teamIdentityV28(t).mascot;
  if(moves.length){
    const m=moves[0],trade=String(m.move?.type||'').toLowerCase()==='trade',incoming=(m.add||[]).slice().sort((a,b)=>Number(b.points||0)-Number(a.points||0))[0],
      outgoing=(m.drop||[]).slice().sort((a,b)=>Number(b.points||0)-Number(a.points||0))[0],add=names(m.add||[]),drop=names(m.drop||[]);
    const moveLead=trade?(add&&drop?`${manager} traded for ${add} and sent out ${drop}.`:add?`${manager} traded for ${add}.`:`${manager} sent out ${drop} in a trade.`):(add&&drop?`${manager} added ${add} and moved on from ${drop}.`:add?`${manager} added ${add}.`:`${manager} cut ${drop}.`);
    const impact=incoming&&valid(incoming.points)?`${incoming.name} answered immediately with ${one(incoming.points)} fantasy points${incoming.real_stat_line?', backed by '+String(incoming.real_stat_line).replaceAll(' • ',', '):''}.`:incoming?`${incoming.name} now has a Sunday attached to the transaction, which is more useful than transaction-day optimism.`:'';
    const counter=outgoing&&valid(outgoing.points)?`${outgoing.name} produced ${one(outgoing.points)} after leaving${outgoing.current_fantasy_team_name?' for '+outgoing.current_fantasy_team_name:''}, so the receipt remains inconveniently two-sided.`:'';
    ps.push(deskChoice(t,r,[
      [`${moveLead} ${impact} ${counter} For ${team}, the move now gets judged by the role it created rather than the dopamine of a transaction alert.`],
      [`${moveLead} ${impact} ${counter} There is finally actual football for ${team} to place beside the receipt, which is much less decorative and much more useful.`],
      [`${moveLead} ${impact} ${counter} For ${team}, transaction day was the trailer and Sunday was the first scene that counts.`],
      [`${moveLead} ${impact} ${counter} The timestamp proves ${manager} made the decision; the ${team} role begins telling us whether it was any good.`]
    ]));
  }
  if(miss?.reserve&&miss?.starter&&Number(miss.gap)>0){
    const slot=miss.slot||miss.starter.lineup_slot||'lineup';
    ps.push(deskChoice(t,r,[
      [`The harder ${team} management question is the lineup card: ${miss.reserve.name} could legally have replaced ${miss.starter.name} at ${slot} and improved the score by ${one(miss.gap)}. For ${manager}, that was a real option before kickoff, not hindsight theater.`],
      [`One ${team} seating-chart embarrassment survives review. ${miss.reserve.name} was eligible over ${miss.starter.name} at ${slot}, worth roughly ${one(miss.gap)} more points; ${manager} gets the rare hindsight complaint that arrived with credentials.`],
      [`LINEUP RECEIPT FOR ${team.toUpperCase()}: ${miss.reserve.name} could actually have taken ${miss.starter.name}’s ${slot} spot and added about ${one(miss.gap)} points. I checked ${manager}’s eligibility problem before loading the angry font.`],
      [`The ${team} lineup card contains an admissible second-guess: ${miss.reserve.name} over ${miss.starter.name} at ${slot} was legal and worth about ${one(miss.gap)} points. ${manager} cannot dismiss that as postgame imagination.`]
    ]));
  }
  if(!ps.length)ps.push(deskChoice(t,r,[
    [`There is no transaction scandal or legal lineup miss large enough on the ${team} ledger to steal this section. Sometimes ${manager}’s best contribution is giving the players no procedural excuse.`],
    [`The ${team} front office managed the rare trick of leaving me without a tasteful grievance. ${manager} should enjoy the silence before next Sunday invents one.`],
    [`NO ${team.toUpperCase()} MANAGEMENT SIREN THIS WEEK. The roster has enough football to argue about without manufacturing a ${manager} crime.`],
    [`No material ${team} transaction or eligible lineup mistake clears the evidence threshold here. ${manager} gets to leave the result with the players.`]
  ]));
  if(ps.length<2)ps.push(deskChoice(t,r,[
    [`For ${manager}, the management standard is simple this week: remember what Sunday exposed and do not force ${team} to learn the same lesson twice.`],
    [`${manager} gets one quiet management coda: the ${team} week supplied enough evidence for a correction without requiring a palace coup.`],
    [`${manager.toUpperCase()} GETS ONE NOTE IN THE MARGIN: keep the useful ${team} decision, fix the obvious one and do not make me recycle this headline.`],
    [`The ${team} paper trail gives ${manager} a follow-up assignment rather than a verdict; the next lineup will show whether the lesson stuck.`]
  ]));
  return ps;
}

function valueStoryV28(t,r){
  const v=t.value_history_week;if(!valid(v?.delta))return ['n/a'];
  const d=Number(v.delta),amount=Math.abs(Math.round(d)).toLocaleString('en-US'),won=Number(t.points)>Number(t.opponent_points),tx=Number(t.current_week_trade_count||0);
  return [deskChoice(t,r,[
    [`The roster moved ${d>=0?'+':'−'}${amount} in tracked value this week; ${won?'the win lets that market move sit quietly beside actual football':'the loss makes the market direction interesting only if it keeps repeating'}. ${tx?'With '+tx+' completed moves in the background, the number belongs in the management conversation rather than on a trophy.':''}`],
    [`The market marked this roster ${d>=0?'up':'down'} ${amount}; charming, but Sunday remains the less decorative judge, and ${won?'the result gave the price move some company':'the loss refused to let the balance sheet become the evening’s consolation prize'}.`],
    [`Value moved ${d>=0?'up':'down'} ${amount}; I will happily use that as fuel for the argument, then remember it still cannot set a lineup or win a Sunday.`],
    [`Tracked value moved ${d>=0?'up':'down'} ${amount}; useful context, but the roster still has to make that direction look believable on Sundays.`]
  ])];
}
function sentimentVoiceV28(t,r){
  const team=teamIdentityV28(t).mascot,manager=t.manager_name||'management',won=Number(t.points)>Number(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points));
  return deskChoice(t,r,[
    [
      `${team} fans earned ${won?'a Sunday worth replaying':'a loss that will linger'}, and a ${one(margin)}-point margin tells you how sharp the mood should be; I have covered enough call-in shows to know ${manager} will hear every version of the argument before breakfast.`,
      `The town feels ${won?'lighter':'irritated'} because ${team} gave it a ${won?'win':'loss'}; ${manager} gets six days to enjoy the applause or answer the complaints before another Sunday changes the temperature again.`
    ],
    [
      `${team} supporters have already turned emotion into opinion, as supporters do; ${won?'winning makes every decision look beautifully tailored':'losing makes every grievance arrive overdressed'}, and ${manager} gets to wear the reaction until kickoff.`,
      `Public opinion around ${team} is ${won?'briefly generous':'spectacularly ill-mannered'}; nobody schedules a fantasy Sunday hoping to feel neutral, and ${manager} gets the full mood swing that comes with the result.`
    ],
    [
      `${team} fans are ${won?'already talking like the season has discovered them':'already treating one bad Sunday like a personal insult'}; I am not going to calm them down, but the next game will do a much better job of deciding whether this feeling deserves to last.`,
      `${won?`${team} gave its supporters permission to be obnoxiously happy for a week`:`${team} gave its supporters enough frustration to make Monday louder than it needed to be`}; ${manager} can change the tone fastest by giving them something different to react to next Sunday.`
    ],
    [
      `${team} supporters are ${won?'enjoying this exactly as much as they should':'angry for reasons that do not require a courtroom metaphor'}; I care more about whether the football changes next week than whether anyone wins Monday’s argument.`,
      `The mood around ${team} is ${won?'confident':'restless'}; ${manager} has another Sunday to either reward that confidence or make the restlessness considerably louder.`
    ]
  ]);
}
function sentimentContextV28(t,r){
  const ctx=t.league_context||{},rank=Number(ctx.standings_rank),size=Number(ctx.league_size)||32,m=t.mida_outlook,rec=record(t),career=t.manager_career||{},titles=Number(career.championships)||0,
    playoff=valid(m?.playoff)?Number(m.playoff):null,won=Number(t.points)>Number(t.opponent_points),team=teamIdentityV28(t).mascot;
  const expectation=playoff==null?'no clean playoff estimate attached':playoff>=70?'a playoff expectation that has already become difficult to hide':playoff<20?'a playoff path narrow enough to make wasted weeks expensive':'a playoff case still sitting squarely in the argument',
    rankText=Number.isFinite(rank)?`rank ${rank} in a ${size}-team league`:'an unsettled place in the table';
  return deskChoice(t,r,[
    [`The public mood has context behind the yelling: the record for ${team} is ${rec}, ${rankText}, with ${expectation}. ${titles?`${t.manager_name} has ${titles} championship${titles===1?'':'s'} on the résumé, which buys patience without purchasing immunity.`:''} ${won?`The result gives ${team} something to enjoy without erasing the expectation.`:`For ${team}, next Sunday is already louder than it needed to be.`}`],
    [`The table shows ${rec} for ${team}, ${rankText}, and ${expectation}. ${titles?`${titles} championship${titles===1?'':'s'} make ${t.manager_name} fashionable enough to survive criticism; they do not make criticism impolite.`:''} ${won?`Permission to toast belongs to ${team}; engraving remains premature.`:`Every opinion around ${team} gets to arrive overdressed after a loss.`}`],
    [`PUBLIC MOOD: ${rec} is the record for ${team}, ${rankText}. ${playoff!=null?'The current playoff outlook is '+one(playoff)+'%. ':''}${titles?`${t.manager_name} has ${titles} title${titles===1?'':'s'} worth of benefit-of-the-doubt coupons, and supporters are already checking the expiration date. `:''}${won?`One week of dangerous confidence belongs to ${team}.`:`The ${team} complaint desk is open early.`}`],
    [`The public record for ${team} reads ${rec}, ${rankText}; the current expectation is ${expectation}. ${titles?`${titles} championship${titles===1?'':'s'} count as ${t.manager_name}’s prior good conduct, not as a sealed record. `:''}${won?`Optimism around ${team} survives cross-examination this week.`:`The loss gives the ${team} file fresh paperwork.`}`]
  ]);
}

function outlookStakesV28(t,r){
  const team=teamIdentityV28(t).mascot,m=t.mida_outlook,playoff=valid(m?.playoff)?Number(m.playoff):null,title=valid(m?.title)?Number(m.title):null,next=t.next_opponent_name||'the next opponent',gap=valid(t.next_projected)&&valid(t.next_opponent_projected)?Number(t.next_projected)-Number(t.next_opponent_projected):null,
    tillyClose=keyedChoice(String(t.roster_id)+':tilly-outlook-close-v36',[`${next} gets the next chance to decide whether ${team}'s Week 1 story travels.`,`The forecast can stay quiet; ${team} has another Sunday to make the argument itself.`,`${team} does not need another prediction before ${next}; it needs another result worth yelling about.`,`The next useful headline belongs to whatever ${team} actually does against ${next}.`]),
    filchClose=keyedChoice(String(t.roster_id)+':filch-outlook-close-v37',[`${next} gets the next chance to expose whatever ${team} failed to fix.`,`${team} has one job against ${next}: make its good football travel and stop giving the opponent the same weak spot.`,`${next} will have seen Week 1; ${team} now has to make that knowledge useless.`,`I want ${team} to make ${next} react first; another week of the same weakness will make the problem much harder to excuse.`]);
  return deskChoice(t,r,[
    [`The larger ${team} assignment is simple: ${playoff!=null?'a '+one(playoff)+'% playoff outlook':'an unsettled playoff path'} makes ${next} another chance to bank a result before the schedule starts charging interest; ${title!=null&&title>=5?`a ${one(title)}% title outlook raises the standard without changing the weekly job.`:''}`],
    [`For ${team}, ${playoff!=null?one(playoff)+'% playoff odds':'the still-unsettled playoff picture'} make ${next} more than a talking point; it is another game this roster is expected to handle seriously. ${gap!=null?`The ${one(Math.abs(gap))}-point projection gap sets the expectation; Sunday still decides whether it was deserved.`:''}`],
    [`The road ahead starts with ${next}; ${playoff!=null?'playoff outlook '+one(playoff)+'%. ':''}${gap!=null?`Projection gap ${one(Math.abs(gap))}. `:''}${tillyClose}`],
    [`${team} carries ${playoff!=null?'a '+one(playoff)+'% playoff estimate':'an unsettled playoff picture'} into ${next}; ${title!=null&&title>=5?`a ${one(title)}% title chance raises the expectations, but it does not win the matchup. `:''}${filchClose}`]
  ]);
}
function outlookStoryV28(t,r){
  const o=t.next_opponent_roster,opp=String(t.next_opponent_name||o?.team_name||'the next opponent'),rows=(o?.starters||o?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),
    star=rows[0],clause=star?statClause(star):null,gap=valid(t.next_projected)&&valid(t.next_opponent_projected)?Number(t.next_projected)-Number(t.next_opponent_projected):null,
    rec=t.next_opponent_context?.record,ps=[],a=t.next_week_availability||{},team=teamIdentityV28(t).mascot;
  if(opp){
    ps.push(deskChoice(t,r,[
      [`Next comes ${opp}${rec?' at '+(Number(rec.wins)||0)+'-'+(Number(rec.losses)||0):''}${star?`, with ${star.name} arriving off a week in which ${star.name} ${clause||'led the opposing lineup'}; that work was worth ${one(star.points)} fantasy points`:''}. ${gap==null?'The forecast is incomplete, so the assignment has to be read through roles and availability.':Math.abs(gap)<6?'Only '+one(Math.abs(gap))+' projected points separate the teams; one ordinary mistake can own a game that close.':gap>0?'The forecast gives '+team+' the projected edge, which turns this into the kind of game good teams are expected to bank.':opp+' owns the projected edge, so somebody from '+team+' needs to steal a piece of the afternoon.'}`],
      [`Next on the guest list: ${opp}${rec?', carrying a '+(Number(rec.wins)||0)+'-'+(Number(rec.losses)||0)+' record':''}. ${star?`${star.name} arrives off ${one(star.points)} fantasy points after ${star.name} ${clause||'led the opposing lineup'}; one should not confuse advance warning with permission to panic. `:''}${gap==null?'The forecast has declined to accessorize the matchup with certainty.':Math.abs(gap)<6?'The projection is nearly even, which is terribly rude to anyone hoping for a relaxing Sunday.':gap>0?'The prettier side of the forecast belongs to '+team+', along with the obligation to use it.':'The underdog chair belongs to '+team+', along with an opportunity to make the forecast look tacky.'}`],
      [`NEXT WEEK: ${opp}${rec?' ('+(Number(rec.wins)||0)+'-'+(Number(rec.losses)||0)+')':''}. ${star?`${star.name} is the first name on the warning label after ${one(star.points)} fantasy points; ${star.name} ${clause||'led the opposing lineup'}. `:''}${gap==null?'No clean projection gap yet; excellent, the chaos department remains funded.':Math.abs(gap)<6?'The teams are separated by just '+one(Math.abs(gap))+' projected points. Load the angry font and the cardiology waiver.':gap>0?'The forecast likes '+team+'. Fine. Put it on the scoreboard.':'The forecast likes '+opp+'. Even better — upsets make louder headlines.'}`],
      [`The next file is ${opp}${rec?', '+(Number(rec.wins)||0)+'-'+(Number(rec.losses)||0):''}. ${star?`${star.name} enters as the obvious person of interest after ${one(star.points)} fantasy points; ${star.name} ${clause||'led the opposing lineup'}. `:''}${gap==null?'No complete projection comparison has entered evidence.':Math.abs(gap)<6?'The projection gap is only '+one(Math.abs(gap))+' points, small enough that one lineup decision can become Exhibit A.':gap>0?'The paper forecast favors '+team+'; failure would create a very tidy management question.':'The paper forecast favors '+opp+', giving '+team+' a clean opportunity to contradict the file.'}`]
    ]));
  }
  const div=t.division_results||[];
  if(div.length){
    const winners=div.filter(x=>Number(x.points)>Number(x.opponent_points)).map(x=>x.team_name),losers=div.filter(x=>Number(x.points)<Number(x.opponent_points)).map(x=>x.team_name);
    if(winners.length||losers.length)ps.push(`Inside ${t.division_name||'the division'}, ${winners.length?naturalJoin(winners)+' won':''}${winners.length&&losers.length?', while ':''}${losers.length?naturalJoin(losers)+' lost':''}. ${Number(t.points)>Number(t.opponent_points)?`That leaves ${team} with either ground gained or pace maintained; next week decides whether the opening becomes useful.`:`That changes how much ground ${team} actually lost, but rival charity is not a repair plan.`}`);
  }
  const absences=[];
  if((a.bye_current_starters||[]).length)absences.push(`${names((a.bye_current_starters||[]).slice(0,3))} ${a.bye_current_starters.length===1?'is':'are'} on verified NFL byes`);
  if((a.injury_current_starters||[]).length){
    const x=a.injury_current_starters||[],n=names(x.slice(0,3));
    absences.push(x.length===1?`${n} carries an injury/status designation`:`${n} carry injury/status designations`);
  }
  if(absences.length)ps.push(`${naturalJoin(absences)}. For ${team}, that is not decorative depth-chart trivia; it changes which version of the lineup can actually show up next Sunday.`);
  ps.push(outlookStakesV28(t,r));
  return ps.filter(Boolean);
}

function contextualizeParagraphV28(t,value){
  return String(value??'');
}

function headingV28(t,r,kind,base,angle){
  const id=teamIdentityV28(t),top=list(t)[0],bad=list(t).filter(p=>delta(p)!=null).slice().sort((a,b)=>delta(a)-delta(b))[0],next=t.next_opponent_name||'Next Week',manager=t.manager_name||'Management';
  const banks={
    lede:[
      [`What Sunday Actually Said About ${id.mascot}`,`${id.city}, Keep the Clipping but Read the Fine Print`,`The Result Before the Excuses Arrive`],
      [`A Review of ${id.mascot}, With Standards`,`The Evening’s Unfashionable Truth`,`Sunday, Properly Accessorized`],
      [`STOP THE PRESSES: ${id.mascot} Edition`,`The Headline Before Everybody Calms Down`,`What Just Happened Here?`],
      [`What I Learned About ${id.mascot}`,`Scene Report: ${id.city}`,`What the Scoreboard Left Behind`]
    ],
    players:[
      [`Why ${top?.name||'the Headliner'} Mattered`,`The Names Doing the Real Work`,`Stars, Support and the Missing Piece`],
      [`The Leading Men, Plus One Complaint`,`Who Looked Expensive in the Best Way`,`The Cast List Gets Reviewed`],
      [`What ${top?.name||'the Top Performer'} Actually Gave Them`,`Heroes, Villains and People on Probation`,`Who Earned Tomorrow’s Photo`],
      [`Start With ${top?.name||'The Headliner'}`,`Who Actually Changed the Matchup`,`Names I’m Watching Before Tuesday`]
    ],
    management:[
      [`What ${manager} Actually Owns`,`The Decisions That Survive Monday Morning`,`Front Office Notes Worth Keeping`],
      [`Management, Kindly Defend the Seating Chart`,`The Receipt Under the Good China`,`Front Office Taste, Reviewed`],
      [`${manager.toUpperCase()}, REPORT TO THE COMPLAINT DESK`,`Transactions, Lineups and Other Ways to Get Yelled At`,`The Managerial Headline Nobody Escapes`],
      [`What ${manager} Has to Own`,`The Lineup Choice That Still Matters`,`Front Office Decisions That Travel`]
    ],
    value:[
      [`Market Page, in Its Proper Place`,`What the Number Changed — and Didn’t`,`The Price Tag in the Margin`],
      [`The Market, Since We Must`,`Roster Value in Evening Wear`,`A Number With Ambitions`],
      [`Value Watch: What Actually Moved`,`The Decimals Are Yelling Again`,`Market Gossip With Guardrails`],
      [`What the Market Moved`,`What the Number Is Really Saying`,`Value History Without the Drama`]
    ],
    sentiment:[
      [`How ${id.city} Is Taking This`,`The Town Has Opinions`,`What Monday Feels Like`],
      [`Public Opinion, Unfortunately Invited`,`The Mood Outside the Velvet Rope`,`Emotions, Tastefully Unsupervised`],
      [`THE CITY HAS LOST PERSPECTIVE`,`What the Fans Are Yelling Now`,`Public Nuisance Report`],
      [`What the Crowd Is Saying`,`The Mood Around ${id.city}`,`How ${id.mascot} Fans Are Taking It`]
    ],
    'hot-seat':[
      [`The Uncomfortable Name: ${bad?.name||'TBD'}`,`Where Patience Gets Tested`,`One More Week Before Concern Grows`],
      [`The Chair Nobody Wants`,`An Unflattering Appointment`,`The Least Elegant Line on the Card`],
      [`HOT SEAT: NO HIDING`,`Today’s Complaint Has a Name`,`The Player Who Has to Be Better`],
      [`The Week’s Most Concerning Player`,`Primary Suspect for the Bad Feeling`,`The Week’s Uncomfortable Question`]
    ],
    'cool-throne':[
      [`Credit Where It’s Due`,`The Good Note in the Margin`,`A Sunday Worth Repeating`],
      [`The Good China Goes Here`,`A Tasteful Excess of Credit`,`The Chair With Better Upholstery`],
      [`Cool Throne: Credit Earned`,`Somebody Earned the Nice Headline`,`The Back Page Says Something Kind`],
      [`Credit Where It Belongs`,`Who Made Sunday Better`,`The Players I’m Keeping Out of the Complaint`]
    ],
    outlook:[
      [`What ${next} Can Expose`,`The Road Gets Specific`,`Next Sunday Already Has Teeth`],
      [`Next Week’s Engagement: ${next}`,`The Next Appointment With Consequence`,`What Awaits Beyond the Velvet Rope`],
      [`NEXT HEADLINE: ${next}`,`Tomorrow’s Problem Has a Name`,`Who Are We Yelling About Next?`],
      [`Next Up: ${next}`,`Unfinished Business`,`What ${next} Is Going to Test`]
    ]
  };
  const set=banks[kind]?.[voice(r)];if(!set?.length)return base;
  return keyedChoice(`${t.roster_id}:${kind}:${angle}:${r?.id}`,set);
}

export function articleFrameV29(t,r){
  const rows=list(t),won=Number(t.points)>Number(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points)),
    top=rows[0]||null,second=rows[1]||null,third=rows[2]||null,top3=rows.slice(0,3).reduce((n,p)=>n+Number(p.points||0),0),
    share=Number(t.points)>0?top3/Number(t.points):0,angle=storyAngleV28(t,r),
    concerns=rows.filter(p=>delta(p)!=null&&Number(delta(p))<=-4).slice().sort((a,b)=>Number(delta(a))-Number(delta(b))),
    supports=rows.slice(1).filter(p=>{
      const pts=Number(p.points),d=delta(p),prior=Number(p.prior_season_avg);
      return Number.isFinite(pts)&&(pts>=12||(d!=null&&d>=2)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.1));
    }).slice(0,3),
    trajectories=rows.map(p=>({p,tr:teamTrajectory(p)})).filter(x=>x.tr),
    ctx=t.league_context||{},rank=Number(ctx.standings_rank),size=Number(ctx.league_size)||32,playoff=valid(t.mida_outlook?.playoff)?Number(t.mida_outlook.playoff):null;
  return {t,r,rows,won,lost:!won,margin,top,second,third,share,angle,concerns,supports,trajectories,rank,size,playoff};
}

function classificationSentenceV29(p,tr,r){
  if(!p||!tr)return null;
  const v=voice(r),key=`${p.id||p.name}:${tr.kind}:${r?.id||''}`;
  const choose=banks=>keyedChoice(key,banks[v]);
  if(tr.kind==='star')return choose([
    [
      `${p.name} has already been a star in this league. ${p.name} gave opponents another reminder of why part of the plan has to start with him.`,
      `${p.name} came into the week with his reputation already earned, and the performance gave nobody a reason to lower the standard.`,
      `${p.name} has been doing this too long for Sunday to feel like a discovery. It was another strong week from a player opponents already respect.`
    ],
    [
      `${p.name} already has star status, which makes Sunday less a revelation than another unpleasant appointment for the defense across from him.`,
      `${p.name} has already earned the expensive treatment from opponents. Another strong week merely explains why.`,
      `There was no need to introduce ${p.name} before kickoff. The accomplished player simply gave the league another reason to remember him.`
    ],
    [
      `${p.name} is already a star. Sunday was another reason the next opponent will start with him on the whiteboard.`,
      `${p.name} did star work again. Nobody needs to pretend this came out of nowhere.`,
      `${p.name} has the résumé already. Add another strong Sunday to it.`
    ],
    [
      `${p.name} already had the résumé. ${p.name} added another strong performance and another problem for the next opponent to solve.`,
      `${p.name} has established what he is in this league. This week strengthened the case that ${p.name}’s standard is still intact.`,
      `The prior work already made ${p.name} a star; Sunday simply added another useful line to the record.`
    ]
  ]);
  if(tr.kind==='breakout'||tr.kind==='early-breakout')return choose([
    [
      `${p.name} is making a case to be a breakout star in this league. The role is growing and the production is following it.`,
      `${p.name} is starting to look like one of this season’s breakout players. More opportunity keeps turning into more damage for the opponent.`,
      `${p.name} has gone from an interesting name to a player defenses may have to plan around. Another Sunday like this would make the breakout case much louder.`
    ],
    [
      `${p.name} is making a rather convincing case to become one of the league’s breakout names. The larger role has come with larger consequences for the defense.`,
      `${p.name} is beginning to outgrow last year’s expectations, and the extra work is producing exactly the sort of Sunday that makes opponents adjust.`,
      `The charming little ${p.name} surprise is becoming a genuine football problem. If ${p.name}’s role stays this large, the breakout conversation will take care of itself.`
    ],
    [
      `${p.name} is making a real breakout case. The role got bigger and so did the damage.`,
      `${p.name} looks like a player trying to become one of this season’s breakout stars. Give him another week like this and the league will notice.`,
      `${p.name} got more work and turned it into a bigger problem for the opponent. That is how a breakout starts looking real.`
    ],
    [
      `${p.name} is making a credible case to be one of this season’s breakout players. The expanded role and the production are moving in the same direction.`,
      `${p.name} is becoming harder to treat as a one-week curiosity. The next opponent has to account for the larger role now.`,
      `${p.name} has started turning increased opportunity into repeatable pressure on defenses. Another strong ${p.name} week would make the breakout case difficult to dismiss.`
    ]
  ]);
  if(tr.kind==='rookie')return choose([
    [
      `Rookie ${p.name} did enough Sunday to make more work next week feel earned rather than charitable.`,
      `${p.name} is still learning the league, but the first Sunday gave the staff a reason to keep him involved.`,
      `${p.name} made a useful first impression. The next step is turning one good rookie Sunday into another.`
    ],
    [
      `Rookie ${p.name} made a respectable first claim on a larger role, which is a much nicer way to spend a debut than merely looking promising in theory.`,
      `${p.name} has one good rookie Sunday in hand. That should buy more opportunity, not mythology.`,
      `${p.name} now has a real NFL performance behind the promise, and the next Sunday gets to tell us how quickly the story grows.`
    ],
    [
      `${p.name} gave us a rookie Sunday worth remembering. Now earn another one.`,
      `The rookie made noise: ${p.name} deserves another chance to matter next week.`,
      `${p.name} got his first real chance and did something with it. Keep the job moving forward.`
    ],
    [
      `Rookie ${p.name} gave the staff a reason to keep the role alive next week.`,
      `${p.name} has one useful rookie Sunday behind him now. Another would start to make the role look permanent.`,
      `${p.name} turned the first real opportunity into something worth following. The next opponent will have seen it too.`
    ]
  ]);
  if(tr.kind==='decline')return choose([
    [
      `${p.name} has been quiet for long enough that the drop can no longer be dismissed as a slow start.`,
      `${p.name} is showing enough decline over several weeks that the old standard cannot be assumed anymore.`,
      `The old version of ${p.name} has not shown up often enough lately. The next few Sundays need to push the story back the other way.`
    ],
    [
      `${p.name} has reached the uncomfortable veteran stage where repeated quiet Sundays deserve to be discussed plainly.`,
      `${p.name} is forcing the sort of veteran conversation nobody enjoys: the old standard is appearing less often.`,
      `${p.name} has accumulated enough ordinary Sundays to make “temporary” a less convincing adjective.`
    ],
    [
      `${p.name} has used up the slow-start excuse. The next Sunday needs to look different.`,
      `The old ${p.name} standard is not automatic anymore. Repeated lighter weeks made that obvious.`,
      `${p.name} is trending the wrong way, and another quiet week will make the concern much harder to wave off.`
    ],
    [
      `${p.name} has put enough quieter weeks together that the old baseline cannot simply be presumed.`,
      `${p.name} now has a multi-week decline to answer rather than one isolated bad Sunday.`,
      `The longer sample is beginning to move against ${p.name}. The cleanest rebuttal is a return to the old production.`
    ]
  ]);
  if(tr.kind==='reliable')return choose([
    [
      `${p.name} keeps making the weekly decision easy. The role looks familiar and the production keeps arriving with it.`,
      `${p.name} has become the kind of player a lineup can count on without needing a dramatic explanation every Tuesday.`,
      `${p.name} is giving the roster what it has learned to expect, and opponents keep having to deal with it.`
    ],
    [
      `${p.name} keeps delivering the less glamorous luxury of predictability, which managers appreciate more than columnists do.`,
      `${p.name} is performing the difficult trick of making useful work look ordinary.`,
      `${p.name} continues to be reliably good, a condition that is terribly inconvenient for the next opponent and wonderfully dull for management.`
    ],
    [
      `${p.name} did the boring valuable thing again. Keep it coming.`,
      `No reinvention needed from ${p.name}. The job looked familiar and the production followed.`,
      `${p.name} keeps showing up with the kind of week his team can plan around.`
    ],
    [
      `${p.name} remains one of the cleaner weekly assumptions on the roster: familiar role, useful result.`,
      `${p.name} keeps giving his team a dependable answer instead of a new question.`,
      `The role has stayed steady and so has ${p.name}. That kind of continuity matters once the schedule gets less forgiving.`
    ]
  ]);
  if(tr.kind==='stumble')return choose([
    [
      `${p.name} gets one bad week without turning it into a trend. Another one would change the tone quickly.`,
      `${p.name} has enough prior work to earn patience for one ugly Sunday; the next matchup decides how much patience remains.`,
      `${p.name} had a bad week. The longer résumé keeps it from becoming a larger conclusion yet.`
    ],
    [
      `${p.name} receives one week of restraint before the criticism gets sharper.`,
      `${p.name} has earned enough prior credit to make this an unpleasant footnote rather than a crisis.`,
      `${p.name} gets one ugly Sunday without a dramatic rewrite. A second would be much less fashionable.`
    ],
    [
      `${p.name} gets one mulligan, not immunity.`,
      `${p.name} gets one bad week. Do it again and the criticism gets much sharper.`,
      `${p.name} has enough history to survive this one. Next week is not free.`
    ],
    [
      `${p.name} has one poor Sunday to answer, not yet a pattern.`,
      `${p.name} still gets the benefit of the larger sample for now. Another poor result would change that quickly.`,
      `The longer résumé still protects ${p.name} from one ugly week. The next opponent will test how much protection remains.`
    ]
  ]);
  return null;
}
function teamDeepReadV34(t,r,f){
  const q=matchupMoodV35(t),team=q.team,opp=q.opp,v=voice(r),top=f?.top,
    bad=(f?.concerns||[]).find(p=>String(p?.id)!==String(top?.id))||null,next=t?.next_opponent_name||null;
  let aftershock;
  if(q.won&&q.underdog)aftershock=[
    team+' did more than steal a win from '+opp+'; it stole the version of Sunday '+opp+' thought it was entitled to have, and the favorite spent the afternoon improvising around a team it expected to control.',
    opp+' arrived with the nicer forecast and left with the uglier story; '+team+' pulled the rug out from under the favorite and earned a week of swagger before somebody proves it was a one-Sunday stunt.',
    team+' walked in as the side people were supposed to explain away and walked out having embarrassed the premise; '+opp+' can keep the projection, because the scoreboard belongs to '+team+'.',
    opp+' had the pregame edge on paper; '+team+' took the afternoon instead, and there is nothing subtle about making a favorite carry home a loss it expected to avoid.'
  ][v];
  else if(!q.won&&q.favorite)aftershock=[
    team+' had the matchup tilted in its favor and still let '+opp+' take it; that is the kind of loss contenders hate because it feels like donating a Sunday the schedule had already made winnable.',
    team+' entered with the nicer projection and left '+opp+' holding the celebration; I am calling that an expensive reminder that pregame status buys nothing once Sunday starts.',
    team+' was supposed to make '+opp+' chase; instead, '+opp+' made the favorite look like it had skipped the part where the game actually happens.',
    team+' entered with the advantage and failed to use it; '+opp+' took a win from the part of the schedule management expected to bank, and that hurts more than an ordinary loss.'
  ][v];
  else if(q.won&&q.margin>=20)aftershock=[
    team+' did not merely beat '+opp+'; it made the opponent spend most of the afternoon looking for a door back into a game that had already left the room, and a '+one(q.margin)+'-point margin gives the winner swagger without inventing suspense.',
    opp+' spent Sunday discovering new ways for the score to look worse; '+team+' kept widening the room between them until the matchup felt less like a contest and more like a public demonstration.',
    team+' beat '+opp+' badly enough that the fourth quarter was mostly about who deserved the first joke; one rout is not a championship claim, but it is proof that '+opp+' had an awful time.',
    team+' controlled '+opp+' by '+one(q.margin)+' points; one roster looked comfortable and the other looked trapped inside the wrong matchup.'
  ][v];
  else if(!q.won&&q.margin>=20)aftershock=[
    opp+' did not leave '+team+' much dignity to preserve; a '+one(q.margin)+'-point loss is too large to blame on one unlucky starter or one strange bounce.',
    team+' spent the afternoon watching '+opp+' make the score uglier; at '+one(q.margin)+' points, this is no longer tasteful disappointment and the whole roster has to wear it for a week.',
    opp+' handed '+team+' a '+one(q.margin)+'-point problem and then made everybody stare at it; I am not calling the season dead, but the loser does have to live with being the easiest punch line until next Sunday.',
    team+' lost to '+opp+' by '+one(q.margin)+'; there is no complicated theory here, because the opponent kept finding answers and '+team+' kept running out of them.'
  ][v];
  else if(q.margin<=7)aftershock=[
    team+' and '+opp+' spent the afternoon one mistake away from swapping emotions; '+(q.won?team:opp)+' gets the relief and '+(q.won?opp:team)+' gets to replay every choice that could have moved the margin.',
    'There was barely enough space between '+team+' and '+opp+' to fit a comfortable opinion; '+(q.won?team+' escaped with the win':team+' got stuck with the loss')+', and a game that close makes every wasted chance feel personal.',
    team+' and '+opp+' turned Week 1 into the kind of game nobody could look away from; '+(q.won?team+' survived it':team+' did not')+', and the margin will make the loser remember every missed chance.',
    'Only '+one(q.margin)+' points separated '+team+' and '+opp+'; '+(q.won?team:opp)+' gets the celebration, while '+(q.won?opp:team)+' gets a week of wondering which small moment should have been different.'
  ][v];
  else aftershock=[
    team+' '+(q.won?'beat':'lost to')+' '+opp+' without needing a melodramatic ending; the game settled into the winner’s preferred shape, and the loser spent too much of Sunday reacting.',
    team+' '+(q.won?'got the better of':'came up short against')+' '+opp+'; the margin was wide enough to make the winner feel in control without turning the afternoon into a rout.',
    (q.won?team:opp)+' kept '+(q.won?opp:team)+' at arm’s length for most of the day; there was no miracle finish to hide behind, just a steady accumulation of reasons the winner looked more comfortable.',
    team+' and '+opp+' gave the league a result that was clear without being absurd; '+(q.won?team:opp)+' controlled more of the important moments and made that control last.'
  ][v];

  let consequence;
  if(bad)consequence=[
    bad.name+' becomes even more important moving forward; '+team+' survived a quiet week from him against '+opp+', but another opponent may not leave enough margin for that luxury. Another week like this and '+team+' may not be so lucky.',
    'The all-important role of '+bad.name+' only gets more important from here; '+team+' got through '+opp+' without enough from him, but asking the rest of the lineup to keep covering the same hole is a terribly unfashionable long-term plan.',
    bad.name+' got away with a quiet Sunday because '+team+' survived it; do it again and the next opponent may turn that silence into the whole story. '+team+' needs him louder before the margin gets less forgiving.',
    bad.name+' was a place '+opp+' could ignore for too long; '+team+' got away with it this time, but the next opponent will attack the same quiet spot until '+bad.name+' gives it a reason to stop.'
  ][v];
  else if(next)consequence=[
    next+' is next; '+team+' should carry the confidence from this result without carrying the idea that Sunday will solve itself, because the best follow-up is making a new opponent feel the same pressure.',
    team+' gets '+next+' next; I want to see whether the swagger from '+opp+' travels, because confidence that only works in one room is just expensive décor.',
    next+' gets the next shot at '+team+'; make this week feel like the start of a personality, not the only good story anyone can tell by October.',
    team+' now turns to '+next+'; I want the same pressure it created against '+opp+' to show up again before anybody calls the first Sunday a habit.'
  ][v];
  else consequence=[
    team+' leaves Week 1 with a clear baseline; opponents know what made this roster dangerous and where it looked vulnerable, so the next Sunday starts with fewer secrets.',
    team+' has shown the league one version of itself; I care much more about whether the next opponent is forced into the same uncomfortable choices than whether anyone repeats the score.',
    team+' has one real Sunday behind it; good, now the next one gets to decide whether this was personality or coincidence.',
    team+' has shown what worked and what did not; the next matchup gets to decide which parts were real enough to travel.'
  ][v];
  return [aftershock,consequence];
}
function gameShapeV29(t,r,f=articleFrameV29(t,r)){
  const {won,top,second,third}=f;if(!top)return null;
  const q=matchupMoodV35(t),team=q.team,opp=q.opp,v=voice(r),topWork=top.name+' supplied '+one(top.points)+' fantasy points',key=String(t.roster_id)+':game-shape-v36:'+String(r?.id||'');
  if(!threeHighScorersV33(f)){
    return won?[
      topWork+'; more importantly, '+top.name+' was the player '+opp+' never managed to make irrelevant, and '+team+' kept returning to the part of the matchup that worked.',
      topWork+'; '+top.name+' gave '+team+' the cleanest leverage point against '+opp+', and I do not need to dress up the rest of the lineup to make that praise fit.',
      topWork+'; '+top.name+' was the name '+opp+' kept seeing whenever the game tilted toward '+team+', so somebody else can fight for equal billing next week.',
      topWork+'; '+top.name+' is the clearest reason '+team+' kept '+opp+' uncomfortable, and that is enough without turning the whole roster into a theory.'
    ][v]:[
      topWork+'; that performance deserved a better ending than '+team+' gave it, because '+opp+' found enough weak spots elsewhere to turn resistance into a loss.',
      topWork+'; I can admire '+top.name+' and still hate the result, because '+opp+' simply found more places to win the afternoon.',
      topWork+'; '+top.name+' did enough to stay out of the blame, while '+team+' still let '+opp+' leave celebrating.',
      topWork+'; '+top.name+' made '+opp+' work, but '+team+' still lost the larger matchup and somebody else has to answer for the missing help.'
    ][v];
  }
  const trio=[top,second,third],names=naturalJoin(trio.map(p=>p.name)),stats=trio.map(p=>p.name+' '+one(p.points)).join(', '),pct=Number(t.points)>0?Math.round(trio.reduce((n,p)=>n+Number(p.points||0),0)/Number(t.points)*100):0;
  const winBanks=[
    [
      stats+'; '+opp+' could not spend the afternoon erasing one star because '+team+' kept handing it another problem, and that trio supplied roughly '+pct+'% of the score.',
      names+' all cleared 18 points; '+team+' never had to ask one player to carry the whole afternoon, and '+opp+' never got the quiet stretch it needed.',
      stats+'; every time '+opp+' settled one part of the matchup, '+team+' had another scorer ready to keep the game tilted.',
      names+' gave '+team+' three 18-plus performances; '+opp+' spent too much of Sunday chasing the damage instead of dictating anything itself.'
    ],
    [
      stats+'; '+opp+' kept discovering that choosing which star to lean toward only opened another expensive part of the field.',
      names+' all topped 18; I would call that a rather tasteful way to make '+opp+' spend the afternoon rearranging itself.',
      stats+'; '+team+' made '+opp+' pay for every defensive preference it showed, which is much more fun than pretending one player did everything.',
      names+' gave '+team+' three separate big performances; '+opp+' never found a version of the matchup that made all of them ordinary at once.'
    ],
    [
      stats+'; '+opp+' had one fire after another and not nearly enough extinguishers.',
      names+' all went past 18; '+team+' kept making '+opp+' choose the next bad option.',
      stats+'; I am not overcomplicating this one, because '+opp+' got hit from three different directions and never got comfortable.',
      names+' all went big; every attempted adjustment by '+opp+' just moved the pain somewhere else.'
    ],
    [
      stats+'; '+opp+' kept trying to close one door and watching '+team+' come through another.',
      names+' all topped 18; I do not need a fancy phrase for that, only the fact that '+opp+' never found a quiet part of the afternoon.',
      stats+'; '+team+' kept making '+opp+' pay no matter which star drew the extra attention.',
      names+' delivered three big lines; '+opp+' spent the afternoon reacting and never got far enough ahead of the problem.'
    ]
  ];
  const lossBanks=[
    [
      stats+'; '+team+' still lost, which means too much good work died in the quieter parts of the lineup.',
      names+' all topped 18 and still took a loss; the rest of '+team+' owes those performances a better ending.',
      stats+'; '+opp+' survived all of that because '+team+' left too much empty space elsewhere.',
      names+' gave '+team+' enough star production to win; losing anyway makes the quiet spots much harder to excuse.'
    ],
    [
      stats+'; losing after that much high-end production is the sort of thing that should make the rest of '+team+' profoundly uncomfortable.',
      names+' all delivered and '+team+' still lost; I would like the supporting cast to explain itself somewhere less elegantly furnished.',
      stats+'; '+opp+' survived the stars because too many other '+team+' spots failed to add weight.',
      names+' gave '+team+' three premium performances; the final score makes the missing help considerably less charming.'
    ],
    [
      stats+'; '+team+' got three big performances and somehow still found a way to waste them.',
      names+' all showed up; the part of '+team+' asking them for more should look somewhere else first.',
      stats+'; this is not a star problem, it is a roster that failed to cash three excellent checks.',
      names+' all topped 18; if '+team+' wants a different ending, the quieter names need to stop hiding behind them.'
    ],
    [
      stats+'; '+team+' still lost, so the blame belongs much more naturally with the parts of the lineup that never joined them.',
      names+' all delivered enough to matter; '+opp+' won because too much of '+team+' stayed quiet around them.',
      stats+'; I would not ask those three for much more after a loss like this, because the missing help is elsewhere.',
      names+' gave '+team+' three strong answers; '+opp+' won because the rest of the lineup left too many questions unanswered.'
    ]
  ];
  return keyedChoice(key,won?winBanks[v]:lossBanks[v]);
}
function playerStoryV29(t,r,f=articleFrameV29(t,r)){
  const {top,supports,concerns,won}=f;if(!top)return ['n/a'];
  const topStatus=f.trajectories.find(x=>String(x.p.id)===String(top.id))?.tr||null,topClause=statClause(top),team=teamIdentityV28(t).mascot,ps=[],v=voice(r),
    topFootball=teamStatLine(top)||(topClause?`${top.name} ${topClause}.`:'');
  const openerBanks=[
    [
      `${top.name} gets the lead player note after ${one(top.points)} fantasy points. ${topFootball}`,
      `${top.name} was the first ${team} name worth circling after ${one(top.points)} fantasy points. ${topFootball}`,
      `${top.name} supplied the strongest individual ${team} performance at ${one(top.points)} fantasy points. ${topFootball}`
    ],
    [
      `${top.name} owned the best individual ${team} performance at ${one(top.points)} fantasy points. ${topFootball}`,
      `${top.name} gave Bartholomew the easiest name to praise after ${one(top.points)} fantasy points. ${topFootball}`,
      `${top.name} was the clearest successful piece of the ${team} week, worth ${one(top.points)} fantasy points. ${topFootball}`
    ],
    [
      `I keep coming back to ${top.name}, the best individual ${team} performer at ${one(top.points)} fantasy points. ${topFootball}`,
      `I saw ${top.name} drive the strongest ${team} player result with ${one(top.points)} fantasy points. ${topFootball}`,
      `I want the next opponent starting with ${top.name} after he gave ${team} its strongest individual line at ${one(top.points)} fantasy points. ${topFootball}`
    ],
    [
      `${top.name} was the first player who changed the shape of the ${team} matchup, finishing with ${one(top.points)} fantasy points. ${topFootball}`,
      `${top.name} gave ${team} one of its clearest advantages, producing ${one(top.points)} fantasy points. ${topFootball}`,
      `${top.name} is the first player I keep coming back to after ${one(top.points)} fantasy points. ${topFootball}`,
      `${top.name} gave ${team} its clearest individual advantage, scoring ${one(top.points)} fantasy points with enough real football underneath it to matter beyond the box score. ${topFootball}`,
      `I start with ${top.name}: ${one(top.points)} fantasy points, backed by a role the next opponent now has to respect. ${topFootball}`,
      `${one(top.points)} fantasy points made ${top.name} one of the easiest ${team} players to praise this week. ${topFootball}`
    ]
  ][v];
  const topStatusText=classificationSentenceV29(top,topStatus,r)||keyedChoice(`${t.roster_id}:top-status-fallback:${r?.id}`,[
    [
      `${top.name}’s ${String(top.position||'player')} role gives this ${resultShapeV33(f)} performance something worth carrying into next week.`,
      `${top.name} handled a ${playerContextLabelV33(top)} role that looked repeatable even after a ${resultShapeV33(f)} result.`,
      `For ${top.name}, the useful carryover from this ${resultShapeV33(f)} is the ${String(top.position||'player')} job itself rather than the fantasy total.`
    ],
    [
      `The football underneath ${top.name}’s fantasy total is what makes this ${resultShapeV33(f)} interesting beyond one Sunday.`,
      `${top.name} leaves this ${resultShapeV33(f)} with a ${playerContextLabelV33(top)} role that deserves another long look.`,
      `${top.name} had a ${String(top.position||'player')} workload sturdy enough to survive the scoreboard and matter again next week.`
    ],
    [
      `${top.name} mattered because the ${String(top.position||'player')} role changed the matchup, not merely because the fantasy total looked good.`,
      `${top.name} handled a ${playerContextLabelV33(top)} job that the next opponent will have to account for.`,
      `The sequel for ${top.name} is simple: make the same ${String(top.position||'player')} role hurt the next opponent too.`
    ],
    [
      `${top.name}’s ${String(top.position||'player')} role keeps the ${resultShapeV33(f)} performance relevant beyond the final fantasy total.`,
      `${top.name} handled a ${playerContextLabelV33(top)} role that the next opponent now has to plan around.`,
      `For ${top.name}, the next question is whether this ${String(top.position||'player')} workload changes another matchup after a ${resultShapeV33(f)}.`
    ]
  ][v]);
  ps.push(`${keyedChoice(`${t.roster_id}:top:${r?.id}`,openerBanks)} ${playerStatInsightV33(t,top,r)||''} ${topStatusText}`.replace(/\s+/g,' ').trim());

  const other=[f.second,f.third,...supports].filter((p,i,a)=>p&&String(p.id)!==String(top.id)&&a.findIndex(x=>x&&String(x.id)===String(p.id))===i).slice(0,2);
  if(other.length&&threeHighScorersV33(f)){
    const notes=other.map(p=>{
      const c=statClause(p),tr=f.trajectories.find(x=>String(x.p.id)===String(p.id))?.tr,status=tr&&tr.kind!=='star'?classificationSentenceV29(p,tr,r):null,insight=playerStatInsightV33(t,p,r);
      return `${p.name}${c?` ${c}`:` contributed ${one(p.points)} fantasy points`}. ${insight||''}${status?` ${status}`:''}`.replace(/\s+/g,' ').trim();
    });
    const close=[
      won?`${team} had real secondary production, enough to keep ${top.name} from becoming the entire explanation of the win.`:`Those performances make the ${team} loss more specific: useful work existed, so the quiet lineup spots deserve more of the blame.`,
      won?`${top.name} had proper company. The opponent had to account for more than one dangerous player all afternoon.`:`Good supporting work survived inside the ${team} loss, which makes the empty spots more difficult to excuse.`,
      won?keyedChoice(`${t.roster_id}:tilly-support-win`,[`${team} had three players deliver high-end performances, so ${top.name} never had to carry the whole result alone.`,`Three ${team} players went big, and the opponent had to keep changing where it spent its attention.`,`${top.name} had serious help from two other big performances, giving the opponent three different problems to solve.`]):`Good ${team} performances do not erase the loss; they make the quiet lineup spots easier to identify.`,
      won?`${team} got major performances from several places, enough to keep the opponent from loading up on one star.`:`The ${team} loss cannot be blamed equally across the roster; these players did enough to deserve better support.`
    ][v];
    ps.push(`${notes.join(' ')} ${close}`);
  }else if(other.length){
    const p=other.find(x=>{const d=delta(x),tr=f.trajectories.find(y=>String(y.p.id)===String(x.id))?.tr;return Number(x.points)>=15||(d!=null&&Math.abs(d)>=5)||(tr&&['breakout','early-breakout','decline','stumble','rookie'].includes(tr.kind));});
    if(p){
      const c=statClause(p),tr=f.trajectories.find(x=>String(x.p.id)===String(p.id))?.tr,status=tr?classificationSentenceV29(p,tr,r):null,insight=playerStatInsightV33(t,p,r);
      const lead=`${p.name}${c?` ${c}`:` produced ${one(p.points)} fantasy points`}.`;
      const judgment=[
        `${p.name} mattered on his own. The performance gave ${team} another real pressure point without pretending every lineup spot was equally strong.`,
        keyedChoice(`${t.roster_id}:secondary-bartholomew`,[
          `${p.name} gave ${team} a ${String(p.position||'player')} performance worth taking seriously on its own. The opponent had another problem to solve even if the rest of the roster was less elegant.`,
          `${p.name} made the ${String(p.position||'player')} spot matter without needing the rest of ${team} to be declared complete. The opponent still had to spend part of the afternoon dealing with him.`,
          `Whatever else ${team} lacked, ${p.name} made his ${String(p.position||'player')} role a real part of the matchup. That deserves credit without dressing up every quieter spot around him.`,
          `${p.name} was independently useful for ${team}. One strong ${String(p.position||'player')} line cannot beautify the entire roster, but it absolutely changed what the opponent had to handle.`,
          `${p.name} gave the opponent one more ${String(p.position||'player')} problem than it wanted. That performance stands on its own even if ${team} had other flaws to answer for.`,
          `There was nothing decorative about ${p.name}’s ${String(p.position||'player')} work. The opponent had to react to it, and that matters more than pretending the whole roster shared the same quality.`,
          `${p.name} earned separate credit because the ${String(p.position||'player')} role altered the matchup. ${team} can acknowledge that without laundering every quiet performance around him.`,
          `${p.name} made himself one of the real ${team} pressure points. The rest of the roster gets judged separately; the opponent still had to deal with what he created.`
        ]),
        `${p.name} made the ${String(p.position||'player')} spot matter in this ${resultShapeV33(f)}. The opponent had to deal with that performance whether the rest of ${team} helped enough or not.`,
        `${p.name} mattered independently in the ${team} ${resultShapeV33(f)}. One strong ${String(p.position||'player')} performance does not rescue every quiet spot around him.`
      ][v];
      ps.push([lead,insight,status,judgment].filter(Boolean).join(' '));
    }
  }

  const bad=concerns[0];
  if(bad&&String(bad.id)!==String(top.id)){
    const c=statClause(bad),d=Math.abs(Number(delta(bad))),tr=f.trajectories.find(x=>String(x.p.id)===String(bad.id))?.tr,status=classificationSentenceV29(bad,tr,r);
    ps.push([
      `${bad.name} is the player Nick circles in the margin after finishing ${one(d)} points below projection${c?`; ${bad.name} ${c}`:''}. ${won?`The ${team} win buys one week of patience; another ${bad.name} miss becomes harder to dismiss.`:`${bad.name} stays in the main ${team} story because the team lost.`}${status?` ${status}`:''}`,
      `${bad.name} supplied the least convincing line of the main ${team} cast, landing ${one(d)} below projection${c?`; ${bad.name} ${c}`:''}. ${won?`The ${team} win keeps criticism of ${bad.name} measured for a week.`:`The loss makes ${bad.name}’s poor Sunday impossible to hide behind better performances.`}${status?` ${status}`:''}`,
      `${bad.name} was the clearest problem: ${one(d)} below projection${c?`; ${bad.name} ${c}`:''}. ${won?`${bad.name}’s miss did not decide the ${team} win.`:`${bad.name}’s shortfall mattered directly in the ${team} loss.`}${status?` ${status}`:''}`,
      `${bad.name} is the player who has the most to answer for after finishing ${one(d)} points below projection${c?`; ${bad.name} ${c}`:''}. ${won?`${team} won despite the shortfall, which buys patience without erasing it.`:`The ${team} loss made ${bad.name}’s shortfall impossible to ignore.`}${status?` ${status}`:''}`
    ][v]+' '+(playerStatInsightV33(t,bad,r)||''));
  }

  const fillerBanks=[
    [
      `${top.name} is the clear ${team} headliner; the next useful development is another player making a similarly durable weekly claim.`,
      `The top performer for ${team} is ${top.name}. The next question is which supporting role becomes dependable enough to stop being a weekly footnote.`,
      `${top.name} owns the strongest ${team} line. A deeper list of serious contributors next week would be a healthy sign.`
    ],
    [
      `${top.name} owns the strongest ${team} paragraph. Bartholomew would prefer a fuller cast next week rather than another review built around one name.`,
      `${team} gave ${top.name} the leading role; the more interesting future version of this roster gives the columnist a harder choice.`,
      `${top.name} carried the strongest paragraph. Bartholomew would happily be inconvenienced by two or three equally persuasive performances next week.`
    ],
    [
      `${top.name.toUpperCase()} IS THE ${team.toUpperCase()} HEADLINER. SOMEBODY ELSE NEEDS TO MAKE NEXT WEEK’S PAGE CROWDED.`,
      `${top.name} was the clear best ${team} player. Another dependable scorer needs to make that decision less obvious next week.`,
      `${top.name.toUpperCase()} WON THE PHOTO. THE REST OF ${team.toUpperCase()} SHOULD FIGHT FOR THE FRAME NEXT TIME.`
    ],
    [
      `${top.name} gave ${team} the performance the opponent had to react to first. Another week like that would make the matchup problem feel less temporary.`,
      `${top.name} is the clearest ${team} player to build around from this week; the next useful development is a second player forcing equal attention.`,
      `${top.name} gave ${team} its strongest player performance; I want the next Sunday to give me more than one name that obvious.`
    ]
  ][v];
  while(ps.length<4)ps.push(teamPlayerExtraV33(t,r,f,ps.length));
  const editorial=playerEditorialReadV32(t,r,f);if(editorial)ps.push(editorial);
  return [...ps.slice(0,4),...teamDeepReadV34(t,r,f)].filter(Boolean);
}

function coolThroneV29(t,r,f=articleFrameV29(t,r)){
  const candidates=f.rows.filter(p=>{const pts=Number(p.points),d=delta(p),prior=Number(p.prior_season_avg);return Number.isFinite(pts)&&(pts>=15||(d!=null&&d>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));}).slice(0,2);
  if(!candidates.length)return ['n/a'];
  const names=candidates.map(p=>p.name),team=teamIdentityV28(t).mascot,v=voice(r),joined=naturalJoin(names),key=String(t.roster_id)+':cool-v36:'+String(r?.id||'');
  const banks=[
    [`${joined} gave ${team} the performances I would carry forward first; ${f.won?'they helped make the win sturdier':'the loss does not erase what they did well'}.`,`Credit starts with ${joined}; ${f.won?`${team} needed that football to keep control of the afternoon`:`${team} lost, but these players were not the reason it slipped away`}.`,`${joined} belongs on the good side of this week; ${f.won?'the win had real help behind it':'the scoreboard was ugly and these performances were not'}.`],
    [`The good china goes to ${joined}; ${f.won?'I can be generous after a win when the football actually earned it':'a loss can still contain performances worth admiring'}.`,`${joined} gave ${team} the sort of Sunday I am happy to praise; ${f.won?'winning makes the compliment prettier':'the final score does not cheapen the individual work'}.`,`I am saving the comfortable chairs for ${joined}; ${f.won?'they helped make the victory look deserved':'they gave the loss at least a few respectable pieces'}.`],
    [`${joined} earned the nice headline; ${f.won?'they helped build the win':'the loss does not get to steal their credit'}.`,`I am not yelling at ${joined} this week; ${f.won?'they gave '+team+' reasons to enjoy the scoreboard':'they did enough to survive the complaint list'}.`,`${joined} gets the praise; ${f.won?'the win needed that production':'the rest of '+team+' can answer for the ending'}.`],
    [`${joined} gave ${team} something worth keeping; ${f.won?'the opponent had to deal with them all afternoon':'the loss changes the team mood, not the quality of those performances'}.`,`I am giving ${joined} the easy praise this week; ${f.won?'they made the win harder to take away':'they did enough to deserve a better ending'}.`,`${joined} played well enough that I am leaving them out of the complaint; ${f.won?'keep it coming':'somebody else needs to make the next result match their work'}.`]
  ];
  return [keyedChoice(key,banks[v])];
}
function hotSeatV29(t,r,f=articleFrameV29(t,r)){
  const candidates=f.concerns.slice(0,2);if(!candidates.length)return ['n/a'];
  const names=candidates.map(p=>p.name),team=teamIdentityV28(t).mascot,won=f.won,v=voice(r),joined=naturalJoin(names),key=String(t.roster_id)+':hot-v36:'+String(r?.id||'');
  const banks=[
    [`${joined} is the name I am watching most closely; ${won?`${team} survived the quiet week, but another opponent may not leave enough room for it`:`the ${team} loss makes the missing production impossible to shrug off`}.`,`${joined} needs a better Sunday next time; ${won?'the win buys patience, not permission to repeat the miss':'the loss already showed how expensive another quiet week could be'}.`,`I am circling ${joined} for one simple reason; ${won?`${team} got away with the shortfall this time`:`${team} needed more and did not get it`}, so the next matchup cannot look the same.`],
    [`${joined} gets the least flattering chair this week; ${won?'the win keeps the criticism civilized, but it does not improve the performance':'losing removes the need for polite upholstery'}.`,`I would like considerably more from ${joined}; ${won?`${team} won in spite of the quiet line`:`the loss makes the quiet line much harder to dress up`}.`,`${joined} is the name I would rather not see in this section again; ${won?'one win buys a little grace':'the scoreboard has already spent most of it'}.`],
    [`${joined} needs a better week; ${won?'the team won, so this is a warning instead of a fire alarm':'the team lost, so the shortfall is already part of the problem'}.`,`I am watching ${joined}; ${won?'one win of cover is enough':'there is no cover after that loss'}.`,`${joined} gave ${team} the clearest reason to ask for more; do it again and the next opponent will be thrilled.`],
    [`${joined} needs to be louder next week; ${won?`${team} got away with the shortfall this time`:`the ${team} loss showed exactly how little room there was for it`}.`,`I am putting the hardest criticism on ${joined}; ${won?'the win keeps the damage contained, but another quiet Sunday will not be as easy to survive':'the loss already made the missing production matter'}.`,`${joined} is where I want the quickest improvement; ${won?'winning bought one week of patience':'losing spent it immediately'}.`]
  ];
  return [keyedChoice(key,banks[v])];
}
function ledeConsequenceV29(t,r,f=articleFrameV29(t,r)){
  const team=teamIdentityV28(t).mascot,rec=record(t),opp=String(t.opponent_name||"the opponent"),rank=Number.isFinite(f.rank)?f.rank:null,
    p=f.playoff,v=voice(r),won=f.won,key=String(t.roster_id)+":record-emotion-v35:"+String(r?.id||""),week=Number(t?.week_classification?.week)||1;
  if(week===1){
    const banks=[
      won?[
        "Week 1 leaves "+team+" at 1-0, and "+opp+" is the first team that has to explain why. One win does not make a contender, but it does let "+team+" spend the week with the first laugh.",
        "The opening-week record for "+team+" is 1-0. The standings are too young for prophecy and old enough for "+opp+" to wish this result belonged to somebody else.",
        "Week 1 leaves "+team+" at 1-0; I will not hang a banner for one Sunday, but the first week is a much better place to own a win than an explanation."
      ]:[
        "Week 1 leaves "+team+" at 0-1, which is not a crisis and is definitely not nothing. "+opp+" gets the first celebration; "+team+" gets six days to make sure the feeling does not become familiar.",
        "The opening-week record for "+team+" is 0-1. One loss cannot define a season, but it can absolutely ruin the first week of optimism.",
        "Week 1 puts "+team+" at 0-1; I have seen plenty of good seasons begin badly, and none improved by pretending the opener did not sting."
      ],
      won?[
        "The Week 1 record for "+team+" is 1-0, which looks lovely because opening weekend has not yet had time to stain it. "+opp+" gets the sour version of opening weekend; "+team+" gets to enjoy the furniture before somebody spills on it.",
        "The table says 1-0 for "+team+". Bartholomew considers that a perfectly acceptable opening accessory, particularly because "+opp+" is the one carrying the loss home.",
        "Opening weekend leaves "+team+" at 1-0. One should not order championship silverware, but one may absolutely make "+opp+" look at the clean record for a few days."
      ]:[
        "The Week 1 record for "+team+" is 0-1, which is a terrible color on everyone. "+opp+" got the better opening weekend, and "+team+" now has to make sure one ugly accessory does not become the season’s entire wardrobe.",
        "The table says 0-1 for "+team+"; I grant that September is forgiving, and I still refuse to make losing tasteful.",
        "Opening weekend leaves "+team+" at 0-1. The season is not in danger. The mood is, and "+opp+" is responsible."
      ],
      won?[
        "Week 1 leaves "+team+" at 1-0. Enjoy it. Mention it too often. Send "+opp+" screenshots. Week 1 is the only time irrational confidence is still tax-free.",
        "The first-week record is 1-0 for "+team+"; supporters get to be insufferably happy for a week, and "+opp+" gets to live with being the first reason why.",
        "One game, one win, 1-0 for "+team+"; I will not call it destiny, but I will absolutely make "+opp+" hear about the scoreboard for a week."
      ]:[
        "Week 1 leaves "+team+" at 0-1. Nobody is eliminated, nobody is doomed, and everybody is still allowed to be annoyed. "+opp+" gets the first laugh.",
        "0-1 for "+team+". The good news is there are plenty of games left. The bad news is "+opp+" already has one more win than "+team+" does.",
        "The first-week record is 0-1 for "+team+"; I have not hit the panic button, but I know exactly where it is."
      ],
      won?[
        "The historical Week 1 record places "+team+" at 1-0. The important contextual fact is simple: "+opp+" was the first opponent and "+team+" banked the result.",
        "Week 1 closes with "+team+" at 1-0; I like the win and I am not pretending it tells us the whole season.",
        "The only completed week in this report leaves "+team+" at 1-0; "+opp+" owns the corresponding loss, and nothing that happens later gets to rewrite this snapshot."
      ]:[
        "The Week 1 record places "+team+" at 0-1; I am not turning the "+opp+" loss into a season obituary, and nothing from a later week gets to rewrite what happened here.",
        "Week 1 closes with "+team+" at 0-1. "+opp+" earned the first result, and that is the only record context this archive is allowed to use.",
        "The report cutoff leaves "+team+" at 0-1; I am keeping it there, because future wins and future excuses belong to future articles."
      ]
    ][v];
    return keyedChoice(key,banks)+(rank?" Week 1 scoring places "+team+" "+(rank===1?"first":"No. "+rank)+" in the 32-team snapshot.":"");
  }
  const aspiration=p!=null?(p>=70?"a roster carrying serious playoff expectations":p<25?"a roster already short on margin for error":"a roster still fighting for a clean playoff position"):"a season still taking shape";
  return won?
    team+" moves to "+rec+(rank?", No. "+rank+" in the league":"")+". Against "+opp+", the win gives "+aspiration+" one more reason to talk with confidence instead of explaining itself.":
    team+" falls to "+rec+(rank?", No. "+rank+" in the league":"")+". "+opp+" gets the result, and "+aspiration+" now has one fewer comfortable Sunday available.";
}

function tradePlayerNameV32(t,facts,id){
  return String(facts?.[String(id)]?.name||t?.transaction_player_facts?.[String(id)]?.name||id);
}
function tradePickLabelV32(t,facts,p){
  const season=String(p?.season||"Future"),round=Number(p?.round)||"?";
  if(p?.drafted_player_id){
    const name=tradePlayerNameV32(t,facts,p.drafted_player_id),slot=Number(p?.pick_no);
    return season+" Round "+round+" pick"+(name?" (became "+name+(slot?" at "+season+" "+String(Math.floor((slot-1)/32)+1)+"."+String(((slot-1)%32)+1).padStart(2,"0"):"")+")":"");
  }
  return season+" Round "+round+" pick";
}
function tradeSideAssetNamesV32(t,facts,side){
  const players=(side?.player_ids||[]).map(id=>tradePlayerNameV32(t,facts,id)),picks=(side?.picks||[]).map(p=>tradePickLabelV32(t,facts,p));
  return [...players,...picks];
}
function tradeThenTotalV32(side){
  const picks=side?.picks||[];
  if(!side?.then_players_complete||!Number.isFinite(Number(side?.then_player_total)))return null;
  if(picks.length&&(!side?.then_picks_complete||!Number.isFinite(Number(side?.then_pick_total))))return null;
  return Number(side.then_player_total)+(picks.length?Number(side.then_pick_total):0);
}
function tradeCurrentTotalV32(side,facts){
  if(!side?.current_players_complete||!Number.isFinite(Number(side?.current_player_total)))return null;
  let total=Number(side.current_player_total);
  for(const p of side?.picks||[]){
    if(!p?.drafted_player_id)return null;
    const v=Number(facts?.[String(p.drafted_player_id)]?.value);
    if(!Number.isFinite(v))return null;
    total+=v;
  }
  return total;
}
function tradeHistoryCompleteV33(tr,facts){
  const sides=tr?.sides||[];
  if(sides.length<2)return false;
  return sides.every(side=>{
    const assetCount=(side?.player_ids||[]).length+(side?.picks||[]).length;
    if(!assetCount)return false;
    return Number.isFinite(tradeThenTotalV32(side))&&Number.isFinite(tradeCurrentTotalV32(side,facts));
  });
}
function tradeValueReadV32(teamName,otherName,thenOwn,thenOther,nowOwn,nowOther,scope='the league'){
  const fmt=n=>Math.round(Number(n)).toLocaleString("en-US"),parts=[];
  if(Number.isFinite(thenOwn)&&Number.isFinite(thenOther)){
    const edge=thenOwn-thenOther,who=edge>0?teamName:edge<0?otherName:"neither side";
    parts.push("At the recorded "+scope+" trade snapshot, "+teamName+" held "+fmt(thenOwn)+" of captured value against "+fmt(thenOther)+" for "+otherName+(edge===0?", essentially even.":", an early market lean toward "+who+" by "+fmt(Math.abs(edge))+"."));
  }
  if(Number.isFinite(nowOwn)&&Number.isFinite(nowOther)){
    const edge=nowOwn-nowOther,who=edge>0?teamName:edge<0?otherName:"neither side";
    parts.push("On the current "+scope+" ledger, resolved player and drafted-player value sits at "+fmt(nowOwn)+" to "+fmt(nowOther)+(edge===0?", still level.":", now leaning toward "+who+" by "+fmt(Math.abs(edge))+"."));
    if(Number.isFinite(thenOwn)&&Number.isFinite(thenOther)){
      const before=Math.sign(thenOwn-thenOther),after=Math.sign(edge);
      if(before&&after&&before!==after)parts.push("For "+teamName+" in "+scope+", that is a genuine flip from the original value read rather than the same argument with fresher numbers.");
      else if(before===after&&after)parts.push("For "+teamName+" in "+scope+", the direction of the original value edge has held; only the size of the argument has changed.");
    }
  }
  return parts;
}
function tradeCommentaryV32(t,r,facts={}){
  const moves=[...new Map((t.transactions||[]).filter(m=>String(m?.type||"").toLowerCase()==="trade").map(m=>[String(m?.id||""),m])).values()];
  if(!moves.length)return [];
  const history=t.trade_history||[],v=voice(r),paragraphs=[],scope=String(t.division_name||t.conference||'the league');
  for(const move of moves.slice(0,2)){
    const tr=history.find(x=>String(x?.id||"")===String(move?.id||""))||null;
    if(!tr)continue;
    const own=(tr.sides||[]).find(s=>String(s?.roster_id)===String(t.roster_id)),others=(tr.sides||[]).filter(s=>String(s?.roster_id)!==String(t.roster_id));
    if(!own||!others.length)continue;
    if(!tradeHistoryCompleteV33(tr,facts))continue;
    const other=others[0],otherName=String(tr.team_names?.[String(other.roster_id)]||"the other side"),
      ownAssets=tradeSideAssetNamesV32(t,facts,own),otherAssets=tradeSideAssetNamesV32(t,facts,other);
    const recordClose=[
      "For "+t.team_name+" in "+scope+", that is the actual trade record; a hot Sunday does not get to rewrite the receipt.",
      "In "+scope+", "+t.team_name+" gets the unfashionable luxury of the original receipt; Sunday theater may change the review, not the terms.",
      "IN "+scope.toUpperCase()+", "+t.team_name.toUpperCase()+" GETS THE REAL RECEIPT. FOR "+t.team_name.toUpperCase()+" IN "+scope.toUpperCase()+", ONE LOUD SUNDAY MAY CHANGE THE HEADLINE, NOT WHO ACTUALLY CHANGED HANDS.",
      "For "+t.team_name+" in "+scope+", those are the verified terms. For "+t.team_name+" in "+scope+", hindsight may change the finding, but it does not get to edit the evidence."
    ][v];
    paragraphs.push(t.team_name+" received "+(naturalJoin(ownAssets)||"no listed player asset")+"; "+otherName+" received "+(naturalJoin(otherAssets)||"no listed player asset")+". "+recordClose);
    const valueParts=tradeValueReadV32(t.team_name,otherName,tradeThenTotalV32(own),tradeThenTotalV32(other),tradeCurrentTotalV32(own,facts),tradeCurrentTotalV32(other,facts),scope);
    const unresolved=[...(own.picks||[]),...(other.picks||[])].filter(p=>!p?.drafted_player_id).length;
    const ids=[...new Set([...(own.player_ids||[]),...(other.player_ids||[])].map(String))],statPlayers=ids.map(id=>facts?.[id]||t.transaction_player_facts?.[id]).filter(p=>p&&valid(p.points));
    const weekStats=statPlayers.length?focusedPlayerStatsV32(statPlayers):"";
    const unresolvedNote=unresolved?[
      " "+t.team_name+" still has "+unresolved+" unresolved draft-pick outcome"+(unresolved===1?"":"s")+" in this "+scope+" receipt, so the hindsight verdict remains provisional.",
      " "+scope+" still owes "+t.team_name+" and "+otherName+" resolution on "+unresolved+" pick outcome"+(unresolved===1?"":"s")+"; the champagne can remain heroically corked.",
      " "+unresolved+" PICK OUTCOME"+(unresolved===1?" IS":"S ARE")+" STILL OPEN FOR "+t.team_name.toUpperCase()+" IN "+scope.toUpperCase()+", SO NOBODY GETS A WINNER BANNER YET.",
      " The "+scope+" record still has "+unresolved+" unresolved pick outcome"+(unresolved===1?"":"s")+" attached to "+t.team_name+", which keeps my hindsight finding provisional."
    ][v]:"";
    const close=[
      "For "+t.team_name+" in "+scope+", the deal gets judged in layers: price paid, value now, and football actually delivered. "+(valueParts.length?valueParts.join(" "):"The "+scope+" market layer is incomplete, so I am not pretending this receipt says more than it does.")+unresolvedNote+" "+(weekStats?"This week’s moved-player lines for "+t.team_name+": "+weekStats+" ":"")+"With this "+scope+" deal, I will call the direction when the evidence agrees; one data point does not get a parade.",
      "A "+scope+" trade involving "+t.team_name+" ages in public, which is cruel and therefore useful. "+(valueParts.length?valueParts.join(" "):"The "+scope+" valuation history is incomplete enough that even my best tailoring cannot make the conclusion respectable.")+unresolvedNote+" "+(weekStats?"The current moved-player lines around "+t.team_name+": "+weekStats+" ":"")+"When this "+scope+" evidence earns an insult, I will provide one; premature elegance is still premature.",
      "TRADE RECEIPT FOR "+t.team_name.toUpperCase()+" IN "+scope.toUpperCase()+", NOW WITH CONSEQUENCES. "+(valueParts.length?valueParts.join(" "):"THE "+scope.toUpperCase()+" VALUE HISTORY IS NOT COMPLETE ENOUGH FOR A WINNER BANNER, SO THE CONFETTI STAYS IN THE BAG.")+unresolvedNote+" "+(weekStats?"CURRENT MOVED-PLAYER LINES AROUND "+t.team_name.toUpperCase()+": "+weekStats+" ":"")+"FOR THIS "+scope.toUpperCase()+" DEAL, I WILL CALL A FLEECE WHEN THE RECEIPT EARNS IT; UNTIL THEN, SCREENSHOTS STAY HOLSTERED.",
      "For "+t.team_name+" in "+scope+", the useful judgment is the change between the original terms and what those assets are worth now. "+(valueParts.length?valueParts.join(" "):"This "+scope+" comparison is incomplete, so the record stays open rather than conveniently decisive.")+unresolvedNote+" "+(weekStats?"Current moved-player evidence tied to "+t.team_name+": "+weekStats+" ":"")+"On this "+scope+" transaction I will update the conclusion when the evidence changes; certainty is not a substitute for missing rows."
    ][v];
    paragraphs.push(close.replace(/\s+/g," ").trim());
  }
  return paragraphs;
}
function tradeCommentaryHeadingV32(r){
  return ["Trade Receipt: What the Deal Looks Like Now","Trade Receipt: How the Exchange Has Aged","Trade Receipt — No Hiding From the Screenshot","Trade Receipt: What the Complete Record Shows"][voice(r)];
}

function managementStoryV29(t,facts,r,f=articleFrameV29(t,r)){
  const clean={...t,transactions:consolidateTransactions(t)},moves=selectImportantMoves(clean,facts),miss=t.best_lineup_miss,ps=[],manager=t.manager_name||'Management',team=teamIdentityV28(t).mascot,v=voice(r);
  if(moves.length){
    const m=moves[0],trade=String(m.move?.type||'').toLowerCase()==='trade',
      tradeNameMap=new Map();
    if(trade){
      for(const a of (t.trade_acquisitions||[]).filter(a=>String(a.trade_id||'')===String(m.move?.id||''))){
        if(a.player_id&&a.player_name)tradeNameMap.set(String(a.player_id),String(a.player_name));
        const ids=a.outgoing_player_ids||[],ns=a.outgoing_player_names||[];
        ids.forEach((id,i)=>{if(id&&ns[i])tradeNameMap.set(String(id),String(ns[i]))});
      }
    }
    const canonical=p=>({...p,name:tradeNameMap.get(String(p?.id))||t.transaction_player_facts?.[String(p?.id)]?.name||p?.name}),
      adds=(m.add||[]).map(canonical),drops=(m.drop||[]).map(canonical),
      canonicalName=id=>tradeNameMap.get(String(id))||t.transaction_player_facts?.[String(id)]?.name||facts?.[String(id)]?.name||'',
      incoming=adds.slice().sort((a,b)=>Number(b.points||0)-Number(a.points||0))[0],
      outgoing=drops.slice().sort((a,b)=>Number(b.points||0)-Number(a.points||0))[0],
      add=naturalJoin((m.move?.adds||[]).map(canonicalName).filter(Boolean))||names(adds),
      drop=naturalJoin((m.move?.drops||[]).map(canonicalName).filter(Boolean))||names(drops),
      rawMoveLead=trade?(add&&drop?`${manager} traded for ${add} and sent out ${drop}.`:add?`${manager} traded for ${add}.`:`${manager} sent out ${drop} in a trade.`):(add&&drop?`${manager} added ${add} and moved on from ${drop}.`:add?`${manager} added ${add}.`:`${manager} cut ${drop}.`),
      canonicalLeadName=(text,id)=>{
        const full=canonicalName(id);if(!full)return text;
        const bits=full.split(/\s+/),first=bits[0],last=bits.at(-1);if(!first||!last||bits.length<2)return text;
        const fuzzy=new RegExp('\\b'+escapeRe(first)+'\\s+(?:[A-Z][A-Za-z\'’.-]*\\s+)?'+escapeRe(last)+'\\b','g');
        return String(text).replace(fuzzy,full);
      },
      moveLead=[...(m.move?.adds||[]),...(m.move?.drops||[])].reduce((text,id)=>canonicalLeadName(text,id),rawMoveLead);
    const inStrong=strongTransactionPerformance(incoming),outStrong=strongTransactionPerformance(outgoing);
    let impact='';
    if(incoming){
      if(inStrong)impact=`${incoming.name} immediately produced ${one(incoming.points)} fantasy points${incoming.real_stat_line?', backed by '+String(incoming.real_stat_line).replaceAll(' • ',', '):''}.`;
      else impact=[
        `${incoming.name} did not post a headline game, but the first Sunday gave ${team} usable work from the new piece.`,
        keyedChoice(`${t.roster_id}:bart-incoming-quiet`,[`${incoming.name} arrived without a star turn, which is fine; the move now has a real football role to evaluate.`,`${incoming.name} did not make a grand entrance, but Bartholomew now has an actual Sunday role to judge instead of transaction-day perfume.`,`${incoming.name} joined ${team} without producing a headline. That is less glamorous and more useful than pretending one week already decided the transaction.`]),
        `${incoming.name.toUpperCase()} DID NOT BLOW UP THE SCOREBOARD. THE MOVE CAN STILL BE RIGHT WITHOUT A PARADE.`,
        `${incoming.name} supplied enough first-week information to evaluate the role without pretending the transaction has already been decided.`
      ][v];
    }
    let counter='';
    if(outgoing){
      const dest=transactionDestination(t,outgoing);
      if(outStrong)counter=[
        `${outgoing.name} answered with ${one(outgoing.points)}${dest}. ${outgoing.name} remains part of the comparison, not a reason to rewrite the move after one Sunday.`,
        `${outgoing.name} put up ${one(outgoing.points)}${dest}, which gives the transaction a credible counterargument without deciding it.`,
        `${outgoing.name.toUpperCase()} PUT UP ${one(outgoing.points)}${dest.toUpperCase()}. YES, THE OTHER UNIFORM COUNTS.`,
        `${outgoing.name} produced ${one(outgoing.points)}${dest}; the outgoing asset remains relevant to the transaction record.`
      ][v];
      else counter=[
        `${outgoing.name} is now producing${dest}; Nick will track the departure in the correct uniform rather than quietly charging those points back to ${team}.`,
        `${outgoing.name} is now producing${dest}. ${outgoing.name} now belongs to a two-roster comparison, not one transaction-day opinion.`,
        `${outgoing.name.toUpperCase()} IS NOW PRODUCING${dest.toUpperCase()}. THOSE POINTS DO NOT BELONG TO ${team.toUpperCase()} ANYMORE.`,
        `${outgoing.name} is now producing${dest}; the departure remains part of the record without being credited to ${team}.`
      ][v];
    }
    const close=[
      keyedChoice(`${t.roster_id}:nick-move-close`,[`The ${team} move has a real football consequence now. The new role has to prove it was worth creating over the next few Sundays.`,`Sunday finally gave the ${team} transaction something more useful than a notification. Nick wants to see whether the roster spot created by the move keeps earning itself.`,`The ${team} transaction has left the transaction log and entered the football story. Over the next few weeks, ${team} has to show that the roster is actually better for it.`]),
      `The ${team} decision finally has Sunday evidence attached to it. Bartholomew will reserve judgment on ${team} until the new role has enough weeks to become persuasive.`,
      `TRANSACTION DAY WAS THE TRAILER FOR ${team.toUpperCase()}. SUNDAY WAS THE FIRST SCENE THAT COUNTS.`,
      `The timestamp proves the ${team} decision happened; the Sunday role now begins showing what actually changed.`
    ][v];
    ps.push(`${moveLead} ${impact} ${counter} ${close}`.replace(/\s+/g,' ').trim());
  }
  if(miss?.reserve&&miss?.starter&&Number(miss.gap)>0){
    const slot=miss.slot||miss.starter.lineup_slot||'lineup',gap=Number(miss.gap),wouldFlip=f.lost&&gap>f.margin;
    ps.push([
      `${miss.reserve.name} could have replaced ${miss.starter.name} at ${slot} and added about ${one(gap)} points; ${wouldFlip?'that swing was large enough to change the result, so the lineup choice belongs in the loss.':f.won?`${team} won anyway, but ${manager} may not get away with leaving those points unused next time.`:`Even the better choice would not have erased the ${team} loss, but it would have made the margin less wasteful.`}`,
      `${miss.reserve.name} was available over ${miss.starter.name} at ${slot}, worth roughly ${one(gap)} more points; ${wouldFlip?'that is the rare Monday complaint where the math actually reaches the final score.':f.won?`The ${team} win keeps ${manager}’s mistake from becoming the headline, but the free points were still sitting there.`:'The better lineup would not have saved the night, so the criticism should stay proportional.'}`,
      `${miss.reserve.name} over ${miss.starter.name} at ${slot} was worth about ${one(gap)} more points; ${wouldFlip?'that could have flipped the game, which is exactly why the choice matters.':f.won?`${team} won in spite of the lineup miss; ${manager} may not get that cover next time.`:'It would not have fixed the whole loss, so do not blame one button for the fire.'}`,
      `${miss.reserve.name} over ${miss.starter.name} at ${slot} would have added about ${one(gap)} points; ${wouldFlip?`that was enough to swing the final, so ${manager} left a real win on the bench.`:f.won?`${team} survived the choice, but another close game may not be so forgiving.`:`${team} still would have lost, but ${manager} made the margin harder than it needed to be.`}`
    ][v]);
  }
  const thread=articleThreadV30(t,r,f,'management');
  if(thread&&ps.length<2)ps.push(thread);
  if(!ps.length)ps.push([
    `${manager} gave ${team} no major transaction or lineup mistake to argue about this week; sometimes the best management story is simply not creating an extra problem.`,
    `I have no substantial ${team} front-office grievance for ${manager} this week; quiet competence is not glamorous, but it travels well.`,
    `${manager} gave ${team} no management disaster this week; the players produced enough drama on their own.`,
    `I do not have a major ${team} lineup or transaction complaint for ${manager}; keep it that boring and let the football be the loud part.`
  ][v]);
  if(ps.length<2)ps.push([
    `${manager} still has one obvious job: keep what worked for ${team}, fix what did not, and do not make one manageable issue show up again next week.`,
    `${team} now has a real Sunday to learn from; I want ${manager} fixing the obvious weakness before it becomes an expensive habit.`,
    `${manager} gets one more instruction: keep the useful ${team} decisions, fix the obvious miss, and make me find a different complaint next week.`,
    `${manager} gets another lineup next week; if Week 1 taught anything useful, the correction should be visible without anyone needing an explanation.`
  ][v]);
  return ps.slice(0,2);
}

function nextOpponentDepthV29(o,weeklyStar,r){
  const pool=(o?.players||o?.starters||[]).filter(p=>p?.name),season=pool.filter(p=>Number(p.season_games)>0&&Number.isFinite(Number(p.season_fantasy_points))).slice().sort((a,b)=>Number(b.season_fantasy_points)-Number(a.season_fantasy_points))[0],
    valued=pool.filter(p=>p.value!=null&&Number.isFinite(Number(p.value))).slice().sort((a,b)=>Number(b.value)-Number(a.value))[0],weeklyId=String(weeklyStar?.id||''),notes=[];
  if(season&&String(season.id)!==weeklyId)notes.push({kind:'season',p:season});
  if(valued&&String(valued.id)!==weeklyId&&!notes.some(x=>String(x.p.id)===String(valued.id)))notes.push({kind:'value',p:valued});
  if(!notes.length)return null;
  const seasonNote=notes.find(x=>x.kind==='season')?.p,valueNote=notes.find(x=>x.kind==='value')?.p;
  if(voice(r)===0)return [seasonNote?`${seasonNote.name} is the longer-view warning after leading this roster’s season scoring so far.`:null,valueNote?`${valueNote.name} remains its highest-valued player, another reason the advance report cannot stop at last week’s box score.`:null].filter(Boolean).join(' ');
  if(voice(r)===1)return [seasonNote?`The weekly headline should not obscure ${seasonNote.name}, who still owns the stronger season-long scoring résumé.`:null,valueNote?`${valueNote.name} remains the roster’s most valuable piece, an inconvenient detail for anyone hoping one scouting note would suffice.`:null].filter(Boolean).join(' ');
  if(voice(r)===2)return [seasonNote?`DO NOT READ ONE BOX SCORE AND FORGET ${seasonNote.name.toUpperCase()}: HE LEADS THIS ROSTER’S SEASON SCORING.`:null,valueNote?`${valueNote.name.toUpperCase()} STILL CARRIES THE HIGHEST ROSTER VALUE. THE WARNING LABEL HAS MORE THAN ONE NAME.`:null].filter(Boolean).join(' ');
  return [seasonNote?`${seasonNote.name} remains the roster’s season scoring leader, a separate concern from last week’s headline.`:null,valueNote?`${valueNote.name} still carries the roster’s highest current value, giving the opponent another centerpiece to account for.`:null].filter(Boolean).join(' ');
}

function nextOpponentLeadV29(t,r,f=articleFrameV29(t,r)){
  const o=t.next_opponent_roster,opp=String(t.next_opponent_name||o?.team_name||'the next opponent'),rows=(o?.starters||o?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),
    star=rows[0],clause=star?statClause(star):null,rec=t.next_opponent_context?.record,gap=valid(t.next_projected)&&valid(t.next_opponent_projected)?Number(t.next_projected)-Number(t.next_opponent_projected):null,
    recText=rec?`${Number(rec.wins)||0}-${Number(rec.losses)||0}`:null,starText=star?`${star.name} just produced ${one(star.points)} fantasy points${clause?`; ${star.name} ${clause}`:''}.`:'',depthText=nextOpponentDepthV29(o,star,r);
  if(voice(r)===0){
    const forecast=gap==null?keyedChoice(String(t.roster_id)+':nick-no-projection-v36',[
      `Against ${opp}, the next question is whether ${t.team_name} can force the matchup toward the same things that mattered in Week 1.`,
      `${opp} gets a full week to adjust; ${t.team_name} now has to prove its Week 1 strengths still work when the opponent is ready for them.`,
      `${t.team_name} already showed one version of itself. ${opp} is where that version either starts looking real or starts looking temporary.`,
      `${opp} changes the assignment, but not the standard: ${t.team_name} has to make its best players dictate another afternoon.`,
      `${opp} will not care what happened in Week 1; ${t.team_name} has to make that first result travel.`,
      `${t.team_name} gets a different opponent in ${opp} and the same burden: make the matchup bend before the other side does.`,
      `${opp} is the next chance for ${t.team_name} to turn a one-week performance into something the league has to account for.`,
      `The next useful answer comes against ${opp}: can ${t.team_name} make the opponent spend Sunday reacting instead of dictating?`
    ]):Math.abs(gap)<6?`Only ${one(Math.abs(gap))} projected points separate the teams.`:gap>0?`The projected edge belongs to ${t.team_name}.`:`The projected edge belongs to ${opp}.`,
      lossClose=gap>0?'After a loss, being favored turns this into a game '+t.team_name+' cannot afford to donate.':keyedChoice(String(t.roster_id)+':nick-loss-response-v36',[
        `The loss makes ${opp} a response game before it becomes anything else.`,
        `${t.team_name} gets one clean assignment against ${opp}: answer the loss with a better Sunday.`,
        `The next ${t.team_name} story starts with whether the lineup can make ${opp} absorb the response.`,
        `After the loss, ${opp} becomes the place where ${t.team_name} either steadies itself or compounds the damage.`,
        `${t.team_name} does not need mercy from the schedule; it needs a response against ${opp}.`,
        `The Week 1 loss puts the burden on ${t.team_name} to make ${opp} feel the correction.`,
        `${opp} is where ${t.team_name} gets to turn a bad result into a one-week problem instead of a theme.`,
        `The response belongs to ${t.team_name}; ${opp} is simply the next team standing in front of it.`
      ]);
    return `Next comes ${opp}${recText?` at ${recText}`:''}. ${starText} ${depthText||''} ${forecast} ${f.won?`Nick will be watching whether the habits that produced the ${t.team_name} win travel.`:lossClose}`.trim();
  }
  if(voice(r)===1){
    const forecast=gap==null?'The projection offers no clean edge yet.':Math.abs(gap)<6?`The projection is nearly even, which leaves very little room for a casual mistake.`:gap>0?`The forecast favors ${t.team_name}.`:`The forecast favors ${opp}.`;
    return `The next assignment is ${opp}${recText?`, currently ${recText}`:''}. ${starText} ${depthText||''} ${forecast} ${f.won?`Bartholomew wants to see whether the winning ${t.team_name} version survives a different matchup.`:`${t.team_name} carries too much expectation to let the next game become another explanatory column.`}`.trim();
  }
  if(voice(r)===2){
    const forecast=gap==null?'NO CLEAN PROJECTION YET. EXCELLENT.':Math.abs(gap)<6?`ONLY ${one(Math.abs(gap))} PROJECTED POINTS SEPARATE THEM.`:gap>0?`THE FORECAST LIKES ${t.team_name.toUpperCase()}.`:`THE FORECAST LIKES ${String(opp).toUpperCase()}.`;
    return `NEXT WEEK: ${opp.toUpperCase()}${recText?` (${recText})`:''}. ${starText} ${depthText||''} ${forecast} ${f.won?'PROVE THE WIN TRAVELS.':'THE RESPONSE GAME HAS ARRIVED.'}`.trim();
  }
  const forecast=gap==null?keyedChoice(String(t.roster_id)+':filch-no-projection-v36',[
    `${opp} is where ${t.team_name} has to show its Week 1 strengths can survive a prepared opponent.`,
    `${opp} now gets a week of tape on ${t.team_name}; the next question is whether that preparation changes who controls the game.`,
    `Against ${opp}, ${t.team_name} has to prove the Week 1 result came from something repeatable rather than something merely timely.`,
    `${opp} will test whether ${t.team_name} can create the same leverage points once the surprise is gone.`,
    `${t.team_name} gets one more chance against ${opp} to turn the first Sunday into a pattern opponents actually have to respect.`,
    `${opp} is the next examination of whether ${t.team_name} can make its preferred game survive contact with a different roster.`,
    `${opp} gets the next opportunity to attack whatever ${t.team_name} exposed in Week 1; the response matters more than the preview.`,
    `${t.team_name} meets ${opp} with one completed game behind it and one obvious task ahead: make its best football matter twice.`
  ]):Math.abs(gap)<6?`The projection gap is only ${one(Math.abs(gap))} points.`:gap>0?`The paper forecast favors ${t.team_name}.`:`The paper forecast favors ${opp}.`;
  return `The next file is ${opp}${recText?`, ${recText}`:''}. ${starText} ${depthText||''} ${forecast} ${f.won?`The ${t.team_name} assignment is to corroborate a favorable result.`:`The ${t.team_name} assignment is to answer an adverse result without creating a second one.`}`.trim();
}

function scheduleSignificanceV29(t,r,f=articleFrameV29(t,r)){
  const currentWeek=Number(t.week_classification?.week)||1,up=(t.upcoming_opponents||[]).filter(x=>Number(x.week)>currentWeek).slice().sort((a,b)=>Number(a.week)-Number(b.week)),next=up[0],later=up.slice(1,3),
    a=t.next_week_availability||{},strength=x=>{const rank=Number(x?.context?.standings_rank),p=Number(x?.mida?.playoff);if((Number.isFinite(rank)&&rank<=8)||(Number.isFinite(p)&&p>=65))return'strong';if((Number.isFinite(rank)&&rank>=24)||(Number.isFinite(p)&&p<20))return'soft';return'middle'},
    laterStrong=later.filter(x=>strength(x)==='strong'),laterSoft=later.filter(x=>strength(x)==='soft'),parts=[],team=teamIdentityV28(t).mascot,v=voice(r);
  if(next&&laterStrong.length>=2)parts.push([
    `After ${next.team_name}, ${naturalJoin(laterStrong.map(x=>x.team_name))} wait. ${f.won?`${team} can bank the next result before the schedule gets meaner.`:`The loss makes the next game more important because the schedule offers less room for repair once that gauntlet begins.`}`,
    `${next.team_name} is followed by ${naturalJoin(laterStrong.map(x=>x.team_name))}. That future difficulty makes the next result matter now because later correction gets harder.`,
    `READ THE SCHEDULE AFTER ${String(next.team_name).toUpperCase()}: ${naturalJoin(laterStrong.map(x=>x.team_name)).toUpperCase()} FOLLOW. ${f.won?'ANOTHER WIN BUYS CUSHION.':'THE CURRENT LOSS ALREADY SPENT SOME.'}`,
    `${naturalJoin(laterStrong.map(x=>x.team_name))} follow ${next.team_name}. The sequence leaves ${team} fewer cheap opportunities to correct whatever this week exposed.`
  ][v]);
  else if(next&&laterStrong.length===1)parts.push([
    `${laterStrong[0].team_name} waits shortly after ${next.team_name}. ${f.won?`${team} would rather carry another win into the harder test.`:`The current loss makes banking the friendlier game in front of that test more important.`}`,
    `${laterStrong[0].team_name} appears soon after ${next.team_name}. The sensible ${team} move is to take care of the friendlier assignment before the degree of difficulty rises.`,
    `AFTER ${String(next.team_name).toUpperCase()} COMES ${String(laterStrong[0].team_name).toUpperCase()}. ${f.won?'BANK THE CUSHION FIRST.':'DO NOT ASK THE HARDER GAME TO REPAIR AN AVOIDABLE LOSS.'}`,
    `${laterStrong[0].team_name} follows ${next.team_name}. The sequence gives ${team} a timing problem: accumulate margin before the stronger test instead of asking the stronger test to create it.`
  ][v]);
  else if(next&&strength(next)==='strong'&&laterSoft.length)parts.push([
    `The difficult part of this short stretch is ${next.team_name}, with softer ground behind it. ${f.won?'An upset would turn one win into real cushion.':'A loss would be understandable, but it would make the friendlier games behind it far less optional.'}`,
    `${next.team_name} is the immediate heavyweight before the road softens. Steal this one and the later games become opportunity; lose it and they become obligation.`,
    `${String(next.team_name).toUpperCase()} IS THE HEAVYWEIGHT BEFORE SOFTER GAMES ARRIVE. ${f.won?'STEAL IT AND BUILD CUSHION.':'MISS IT AND THE SOFTER GAMES BECOME MUST-HAVE MATERIAL.'}`,
    `The strongest immediate test before the road eases is ${next.team_name}. The later schedule gives ${team} recovery opportunities, not permission to waste them.`
  ][v]);
  const unavailable=[];
  if((a.bye_current_starters||[]).length)unavailable.push(`${names((a.bye_current_starters||[]).slice(0,3))} ${a.bye_current_starters.length===1?'is':'are'} on verified NFL byes`);
  if((a.injury_current_starters||[]).length){
    const x=a.injury_current_starters||[],n=names(x.slice(0,3));unavailable.push(x.length===1?`${n} carries an injury/status designation`:`${n} carry injury/status designations`);
  }
  if(unavailable.length){
    const who=naturalJoin(unavailable),availability=[
      `${who}. That makes ${team} depth a game-plan issue next week rather than a compliment to the bottom of the roster.`,
      `${who}. ${team} now has an availability problem to solve before kickoff, which matters more than how impressive the depth chart looked in August.`,
      `${who}. DEPTH IS ABOUT TO STOP BEING A ROSTER GRAPHIC AND START BEING A LINEUP DECISION FOR ${team.toUpperCase()}.`,
      `${who}. The availability file changes the usable ${team} lineup before the opponent does anything at all.`
    ][v];
    parts.push(availability);
  }
  return parts;
}

function divisionRoundupV29(t,r,f=articleFrameV29(t,r)){
  const rivals=(t.division_results||[]).filter(x=>x?.team_name);if(!rivals.length)return null;
  const outcomes=rivals.map(x=>{const result=Number(x.points)>Number(x.opponent_points)?'won':Number(x.points)<Number(x.opponent_points)?'lost':'tied';return `${x.team_name} ${result}`;}),winners=rivals.filter(x=>Number(x.points)>Number(x.opponent_points)).map(x=>x.team_name),losers=rivals.filter(x=>Number(x.points)<Number(x.opponent_points)).map(x=>x.team_name),team=teamIdentityV28(t).mascot,division=t.division_name||'the division',summary=naturalJoin(outcomes);
  if(voice(r)===0)return `Elsewhere in ${division}, ${summary}; ${f.won?(losers.length?`${team} gained at least a little room on ${naturalJoin(losers)} while still having to keep pace with ${naturalJoin(winners)}.`:`${team} won but received no free separation from the rest of the division.`):(winners.length?`the ${team} loss cost extra ground because ${naturalJoin(winners)} also won${losers.length?`, although ${naturalJoin(losers)} kept the damage from becoming universal`:''}.`:`${naturalJoin(losers)} lost too, limiting the damage without improving the ${team} result.`)}`;
  if(voice(r)===1)return `The divisional table was not idle: ${summary}; ${f.won?(losers.length?`${team} may enjoy gaining ground on ${naturalJoin(losers)}, though ${winners.length?naturalJoin(winners)+' declined to provide any additional courtesy':'the rest of the room offered unusual cooperation'}.`:`The ${team} win kept pace without receiving much decorative assistance.`):(winners.length?`${naturalJoin(winners)} made the ${team} defeat more expensive; ${losers.length?naturalJoin(losers)+' at least had the manners to lose too.':'nobody else volunteered relief.'}`:`${naturalJoin(losers)} supplied some relief, which is kinder than the ${team} performance deserved.`)}`;
  if(voice(r)===2)return `Division scoreboard: ${summary}; ${f.won?(losers.length?`${team} gained ground on ${naturalJoin(losers)}${winners.length?`, while ${naturalJoin(winners)} kept winning too`:''}.`:`The ${team} win kept the race moving without any free gifts.`):(winners.length?`${naturalJoin(winners)} made the ${team} loss hurt more${losers.length?`; ${naturalJoin(losers)} at least lost too`:''}.`:`${naturalJoin(losers)} lost too; take the small favor and fix the ${team} problem.`)}`;
  return `Around ${division}, ${summary}; ${f.won?(losers.length?`${team} gained ground on ${naturalJoin(losers)}${winners.length?`, while ${naturalJoin(winners)} kept pressure on the race`:''}.`:`${team} kept pace, but nobody handed it meaningful separation.`):(winners.length?`${naturalJoin(winners)} made the ${team} loss more expensive${losers.length?`; losses by ${naturalJoin(losers)} at least limited the damage`:''}.`:`${naturalJoin(losers)} lost too, which softens the divisional damage without improving the ${team} result.`)}`;
}
function outlookStoryV29(t,r,f=articleFrameV29(t,r)){
  const team=teamIdentityV28(t).mascot,next=t.next_opponent_name||'the next opponent',schedule=scheduleSignificanceV29(t,r,f),broader=outlookStakesV28(t,r),thread=articleThreadV30(t,r,f,'outlook'),division=divisionRoundupV29(t,r,f);
  const bridge=[
    f.won?`${team} approaches ${next} from the useful side of the standings; the next result decides whether Week 1 becomes cushion or merely a pleasant opening note.`:`${team} arrives at ${next} needing a response; another loss would make the schedule feel less forgiving in a hurry.`,
    f.won?`A winning week gives ${team} leverage entering ${next}; the follow-up matters because good teams turn favorable Sundays into breathing room.`:`The loss makes ${next} more consequential for ${team}; a contender is allowed an ugly Sunday, not an endless collection of them.`,
    f.won?`${team} carries a win into ${next}; now make the cushion useful.`:`${team} needs an answer against ${next}; the first loss already used the easy excuse.`,
    f.won?`${next} is next; ${team} already banked one result, and I want to see whether the same strengths make a new opponent uncomfortable.`:`${next} is next; one ${team} loss is manageable, but a second would make the same weak spots much harder to dismiss.`
  ][voice(r)];
  const context=[thread||bridge,division].filter(Boolean).join(' ');
  return [nextOpponentLeadV29(t,r,f),context,...(schedule.length?schedule:[broader])].filter(Boolean).slice(0,4);
}
function dedupeArticleSectionsV29(sections,t){
  const seen=new Set(),seenStatFacts=new Set(),players=articlePlayers(t||{}),firstCounts=new Map(),statClauses=[];
  for(const p of players){
    const first=String(p?.name||'').trim().split(/\s+/)[0];if(first)firstCounts.set(first,(firstCounts.get(first)||0)+1);
    const clause=statClause(p);if(clause)statClauses.push({p,clause:String(clause).replace(/\.$/,'').trim()});
  }
  const canonicalizePlayerNames=sentence=>{
    let x=String(sentence||'');
    players.forEach((p,index)=>{
      const full=String(p?.name||'').trim();if(!full)return;
      const first=full.split(/\s+/)[0],token=`[PLAYER:${String(p?.id||index)}]`;
      x=x.replace(new RegExp(escapeRe(full),'gi'),token);
      if(firstCounts.get(first)===1)x=x.replace(new RegExp('\\b'+escapeRe(first)+'\\b','gi'),token);
    });
    return x;
  };
  const statHeavy=sentence=>/\b(?:yards?|targets?|carries|touchdowns?|passes?|completed|caught|ran|tackles?|solo|assists?|sacks?|TFL|QB hits?|interceptions?|receptions?)\b/i.test(sentence)&&/\b\d+(?:\.\d+)?\b/.test(sentence);
  const statSignature=sentence=>{
    const raw=String(sentence||'');
    for(const row of statClauses){
      const clause=row.clause;if(!clause)continue;
      if(raw.toLowerCase().includes(clause.toLowerCase()))return `${String(row.p?.id||row.p?.name)}::${clause.toLowerCase().replace(/\s+/g,' ')}`;
    }
    return statHeavy(raw)?canonicalizePlayerNames(raw).toLowerCase().replace(/\s+/g,' ').trim():null;
  };
  const stripRepeatedStatClause=sentence=>{
    let out=String(sentence||'');
    for(const row of statClauses){
      const clause=row.clause,sig=`${String(row.p?.id||row.p?.name)}::${clause.toLowerCase().replace(/\s+/g,' ')}`;
      if(!seenStatFacts.has(sig)||!out.toLowerCase().includes(clause.toLowerCase()))continue;
      const full=String(row.p?.name||'').trim(),first=full.split(/\s+/)[0],namePattern=firstCounts.get(first)===1?`(?:${escapeRe(full)}|${escapeRe(first)})`:escapeRe(full);
      const whole=new RegExp(`(?:${namePattern}\\s+)?${escapeRe(clause)}[.!;:]?\\s*`,'i');
      out=out.replace(whole,'').replace(/^\s*[-—,:;]+\s*/,'').trim();
    }
    return out;
  };
  return (sections||[]).map(sec=>{
    const paragraphs=(sec.paragraphs||[]).map(p=>{
      if(String(p||'').trim().toLowerCase()==='n/a')return'n/a';
      const keep=[];
      for(const rawSentence of splitSentencesSafeV28(p)){
        let sentence=stripRepeatedStatClause(rawSentence);
        if(!sentence)continue;
        const key=sentence.toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/\s+/g,' ').trim();
        if(key.length>55&&seen.has(key))continue;
        if(key.length>55)seen.add(key);
        const sig=statSignature(sentence);
        if(sig){
          if(seenStatFacts.has(sig))continue;
          seenStatFacts.add(sig);
        }
        keep.push(sentence);
      }
      return keep.join(' ');
    }).filter(Boolean);
    return {...sec,paragraphs:paragraphs.length?paragraphs:['n/a']};
  });
}

function articleThreadV30(t,r,f,phase){
  const team=teamIdentityV28(t).mascot,manager=t.manager_name||'management',top=f.top?.name||'the leading scorer',
    share=Math.round((f.share||0)*100),angle=f.angle,key=`${t.roster_id}:${angle}:${phase}:${r?.id}`;
  const base={
    'rout-loss':{
      sentiment:[`A ${one(f.margin)}-point loss is too large for one scapegoat. ${team} supporters can be angry at individual misses, but Nick sees a margin this wide as evidence that the failure was distributed.`,`A ${one(f.margin)}-point loss is vulgar enough without pretending one unfortunate player caused all of it. Bartholomew finds the ${team} blame much more widely upholstered.`,`A ${one(f.margin)}-POINT LOSS NEEDS MORE THAN ONE VILLAIN. TILLY HAS PLENTY OF ANGRY INK AND NO REASON TO WASTE IT ON A SINGLE NAME.`,`A ${one(f.margin)}-point loss is too big to dump on one player; I see too many ${team} problems here for one scapegoat to make sense.`][voice(r)],
      outlook:`The next ${team} game is less about proving one player can rebound than proving the lineup can stop failing in clusters.`,
      management:`For ${manager}, the lesson is broader than one button: a loss this large usually needs more than one correction.`
    },
    'rout-win':{
      sentiment:`A ${one(f.margin)}-point win gives ${team} fans room to enjoy the week without pretending every piece will repeat at the same volume.`,
      outlook:`The next test for ${team} is whether the winning shape survives after the margin stops doing the storytelling.`,
      management:`For ${manager}, a rout is permission to preserve what worked rather than a reason to assume every decision was perfect.`
    },
    'close-loss':{
      sentiment:`A ${one(f.margin)}-point loss guarantees arguments because nearly every ordinary decision can be imagined as the missing difference.`,
      outlook:`The next ${team} game needs fewer small leaks; a margin this thin turns ordinary mistakes into the whole result.`,
      management:`For ${manager}, the close margin makes the legal lineup choices worth reviewing without turning hindsight into fiction.`
    },
    'close-win':{
      sentiment:`A ${one(f.margin)}-point win gives ${team} the pleasant version of the same lesson: tiny mistakes mattered, but the scoreboard forgave them.`,
      outlook:`The next ${team} matchup will test whether the close win was composure or simply a Sunday in which the final mistake belonged elsewhere.`,
      management:`For ${manager}, surviving a close one should sharpen the lineup review rather than cancel it.`
    },
    'favorite-collapse':{
      sentiment:`The frustration around ${team} is sharper because the roster entered with the friendlier forecast and still handed the result away.`,
      outlook:`The next ${team} assignment now carries a credibility tax: favorites are expected to bank manageable games, not explain them afterward.`,
      management:`For ${manager}, losing from the favored side puts roster and lineup choices under a brighter light than the same score would as an underdog.`
    },
    'upset-win':{
      sentiment:`The upset gives ${team} fans a reason to revise expectations upward without pretending one surprise result rewrote the season.`,
      outlook:`Now the ${team} lineup has to show the upset was a usable version of the roster rather than a one-week ambush.`,
      management:`For ${manager}, the reward for an upset is a better question next week: which choices helped create a version worth repeating?`
    },
    'lineup-regret':{
      sentiment:`The ${team} argument will keep circling the lineup card because the legal alternative was real, not invented after the final.`,
      outlook:`The cleanest way for ${team} to end the lineup argument is to make the obvious decision before kickoff next time.`,
      management:`For ${manager}, the better lineup was sitting there; next week the correction should happen before kickoff.`
    },
    'front-office-storm':{
      sentiment:`With ${Number(t.current_week_trade_count||0)} completed moves in the background, ${team} fans are judging the churn by what finally happened on Sunday.`,
      outlook:`The next ${team} game should clarify whether all that roster motion created a better team or merely a busier transaction log.`,
      management:`For ${manager}, activity is no longer the story. The new configuration has enough real football attached to it to be evaluated.`
    },
    'star-dependent':{
      sentiment:`When roughly ${share}% of the scoring comes from three players, ${team} fans know where the gratitude belongs and where the impatience should go.`,
      outlook:`The next ${team} game needs somebody outside this week’s three biggest scorers to force a different version of the article.`,
      management:`For ${manager}, the roster question is depth of production rather than star quality; ${top} already did enough to make that distinction clear.`
    },
    'defense-led':{
      sentiment:[`${top} gave ${team} its best defensive line; Nick starts with the tackles, pressure and fantasy impact instead of explaining why IDP exists.`,`${top} put the best defensive work on the ${team} page. Bartholomew will praise the player and spare everyone the sermon about league format.`,`${top} made the ${team} defense worth leading with. The stat line deserves the praise; the format does not need a sales pitch.`,`${top} gave ${team} its best defensive work; the tackles, pressure and fantasy impact are enough without a lecture about IDP scoring.`][voice(r)],
      outlook:`The next ${team} game asks whether the defensive carry can remain an advantage instead of becoming a weekly rescue plan.`,
      management:`For ${manager}, a defensive headliner is roster construction paying off; the rest of the lineup still has to meet that standard.`
    },
    'projection-smash':{
      sentiment:`Beating projection this badly changes the mood around ${team}, but fans will care more about which roles produced the surprise than the forecast itself.`,
      outlook:`The next ${team} game tests whether the unexpected production belongs to a new role or a one-week spike.`,
      management:`For ${manager}, the useful question is which source of overperformance can be intentionally preserved.`
    },
    'projection-crater':{
      sentiment:`The ${team} frustration is not that a projection was wrong; it is that too many expected points vanished from roles the roster had reason to trust.`,
      outlook:`The next ${team} matchup needs a normal version of the lineup before anyone asks for another ceiling game.`,
      management:`For ${manager}, the repair job starts with the expected roles that failed rather than chasing a miracle replacement.`
    },
    'breakout-week':{
      sentiment:`The most interesting ${team} optimism belongs to the emerging player whose role grew with the production; that is a better story than a random spike.`,
      outlook:`The next ${team} game gives the emerging player another chance to prove the larger role can keep changing matchups.`,
      management:`For ${manager}, the young player has earned another opportunity because Sunday made the larger role matter.`
    },
    'division-fight':{
      sentiment:`A divisional result makes the ${team} mood louder because the same Sunday moved a rival in the opposite direction.`,
      outlook:`The next ${team} game arrives with divisional ground already won or lost; there is less room to treat the standings as background decoration.`,
      management:`For ${manager}, division games turn ordinary lineup choices into decisions with standings consequences attached.`
    }
  }[angle];
  if(!base?.[phase])return null;
  const core=base[phase],v=voice(r);
  const tails=[
    '',
    ' I will care whether that same advantage still looks elegant against a prepared opponent.',
    ' I will care whether the next opponent gets embarrassed by the same thing.',
    ` I will care whether the next opponent finds a way to take that advantage away from ${team}.`
  ];
  return keyedChoice(key,[core,core+tails[v]]);
}

function sentimentStoryV30(t,r,f=articleFrameV29(t,r)){
  const team=teamIdentityV28(t),manager=t.manager_name||'management',rec=record(t),rank=Number.isFinite(f.rank)?`${f.rank} of ${f.size}`:'unsettled',p=f.playoff,titles=Number(t.manager_career?.championships)||0,thread=articleThreadV30(t,r,f,'sentiment'),margin=one(f.margin),v=voice(r);
  const primary=[
    f.won?`${team.city} gets the better Monday after a ${margin}-point ${team.mascot} win; fans can enjoy what happened while keeping one eye on the parts that looked harder to repeat.`:`${team.city} gets the irritated Monday after a ${margin}-point ${team.mascot} loss; the useful reaction is not to blame everybody equally, because some players still gave the roster enough to win.`,
    f.won?`${team.mascot} supporters are understandably pleased; I will permit the optimism without pretending one week settled the order of things.`:`${team.mascot} supporters have every right to be annoyed; I only ask that the criticism land on the players and decisions that actually made the loss worse.`,
    f.won?keyedChoice(`${t.roster_id}:tilly-sentiment-win-v36`,[`${team.city} has a win and the fan base is already acting like patience was invented for other people; ${manager} can enjoy it until next Sunday.`,`${team.mascot} won and half the fan base is already planning the parade route; ${manager} gets one week before I confiscate the confetti.`,`${team.mascot} fans are irresponsibly happy after the win; good, sports are supposed to feel better when your team wins.`]):keyedChoice(`${t.roster_id}:tilly-sentiment-loss-v36`,[`${team.city} woke up angry after the loss; ${manager} should fix the real problem before the fan base invents six fake ones.`,`${team.mascot} lost, so every quiet lineup spot suddenly has an audience; ${manager} needs to fix the ones that actually mattered.`,`${team.mascot} fans are furious and I am not going to lecture them about perspective; give them better football and the mood will fix itself.`]),
    f.won?`The ${team.mascot} crowd has every right to feel good this week; I want ${manager} to make that confidence survive another Sunday instead of explaining why it disappeared.`:keyedChoice(`${t.roster_id}:filch-sentiment-loss-v36`,[`The ${team.mascot} crowd is angry, and I do not blame it; ${manager} should fix the weak part of the lineup before asking anyone to be patient.`,`The loss gave ${team.mascot} supporters plenty to complain about; I want ${manager} solving the obvious football problem, not polishing the explanation.`,`The mood around ${team.mascot} is ugly because the result was ugly; the fastest way out is better football, not a better excuse.`])
  ][v];
  const context=[
    keyedChoice(`${t.roster_id}:sentiment-context-nick-v36`,[`The record is ${rec}, good for rank ${rank}${p!=null?`, with the playoff outlook around ${one(p)}%`:''}; ${titles?`${manager} has ${titles} championship${titles===1?'':'s'} on the résumé, enough to earn patience but not immunity.`:''}`,`${team.mascot} sits ${rec}, ranked ${rank}${p!=null?`, with a ${one(p)}% playoff outlook`:''}; ${titles?`${manager} has ${titles} title${titles===1?'':'s'} of earned goodwill, useful but finite.`:''}`,`The table gives ${team.mascot} a ${rec} record and rank ${rank}${p!=null?`; the playoff estimate is ${one(p)}%`:''}; ${titles?`${manager}’s ${titles} championship${titles===1?'':'s'} buy context, not immunity.`:''}`]),
    keyedChoice(`${t.roster_id}:sentiment-context-bart-v36`,[`${rec} and rank ${rank} are the unromantic facts${p!=null?`; the current playoff outlook is ${one(p)}%`:''}; ${titles?`${titles} championship${titles===1?'':'s'} give ${manager} a résumé, not a lifetime exemption from criticism.`:''}`,`Strip away the tailoring and ${team.mascot} is ${rec}, rank ${rank}${p!=null?`, with a ${one(p)}% playoff outlook`:''}; ${titles?`${manager} has ${titles} championship${titles===1?'':'s'} in the cabinet, and Sunday still gets its own judgment.`:''}`,`The plain numbers are ${rec}, rank ${rank}${p!=null?`, playoff outlook ${one(p)}%`:''}; ${titles?`I respect ${manager}’s ${titles} title${titles===1?'':'s'}, and I still expect the current roster to earn this week on its own.`:''}`]),
    keyedChoice(`${t.roster_id}:sentiment-context-tilly-v36`,[`Record: ${rec}; rank: ${String(rank).toUpperCase()}.${p!=null?` Playoff outlook: ${one(p)}%.`:''} ${titles?`${manager} has ${titles} title${titles===1?'':'s'} of goodwill; that coupon book is not infinite.`:''}`,`${team.mascot} sits ${rec}, rank ${String(rank).toUpperCase()}${p!=null?`, playoff outlook ${one(p)}%`:''}; ${titles?`${titles} title${titles===1?'':'s'} for ${manager} buy patience, not silence.`:''}`,`The boring part: ${rec}, rank ${String(rank).toUpperCase()}${p!=null?`, ${one(p)}% playoff outlook`:''}; ${titles?`yes, ${manager} has ${titles} title${titles===1?'':'s'}, and no, that does not delete Sunday.`:''}`]),
    keyedChoice(`${t.roster_id}:sentiment-context-filch-v36`,[`The numbers are ${rec}, rank ${rank}${p!=null?`, with a ${one(p)}% playoff estimate`:''}; ${titles?`${manager} has ${titles} championship${titles===1?'':'s'} behind him, but this week still has to stand on its own.`:''}`,`${team.mascot} is ${rec}, rank ${rank}${p!=null?`, with a ${one(p)}% playoff estimate`:''}; ${titles?`${manager}’s ${titles} championship${titles===1?'':'s'} buy patience, not an excuse for a bad Sunday.`:''}`,`${team.mascot} sits ${rec}, rank ${rank}${p!=null?`, and a ${one(p)}% playoff estimate`:''}; ${titles?`${manager} has ${titles} championship${titles===1?'':'s'} in the past, and I still care about what this roster does next.`:''}`])
  ][v];
  const badRecord=losingRecordAsideV33(t,r);
  return [primary,context,thread,badRecord].filter(Boolean);
}
function restoreSectionFullNamesV30(t,paragraphs){
  const players=[...new Map(articlePlayers(t).map(p=>[String(p?.name||'').trim(),p])).values()].filter(p=>p?.name),
    lastCounts=new Map(),firstCounts=new Map(),seen=new Set();
  for(const p of players){
    const bits=String(p.name).trim().split(/\s+/),first=bits[0],last=bits.at(-1);
    if(first)firstCounts.set(first,(firstCounts.get(first)||0)+1);
    if(last)lastCounts.set(last,(lastCounts.get(last)||0)+1);
  }
  return (paragraphs||[]).map(value=>{
    let text=String(value??'');
    for(const p of players){
      const full=String(p.name).trim();if(!full||seen.has(full))continue;
      const fullRe=new RegExp(escapeRe(full),'i');
      if(fullRe.test(text)){seen.add(full);continue}
      const bits=full.split(/\s+/),first=bits[0],last=bits.at(-1);
      const aliases=[];
      // Do not expand surname-only references: transaction-only players can share a surname
      // with a starter, which makes last-name restoration capable of corrupting a valid full name.
      if(first&&firstCounts.get(first)===1&&!/^(?:[A-Z]\.){1,3}$/.test(first))aliases.push(first);
      for(const alias of aliases){
        const re=new RegExp('\\b'+escapeRe(alias)+'\\b'),m=re.exec(text);
        if(!m)continue;
        if(alias===last){
          const before=text.slice(0,m.index).trimEnd(),prev=(before.match(/([A-Z][A-Za-z'’.-]*)$/)||[])[1]||'';
          if(prev)continue;
        }
        text=text.slice(0,m.index)+full+text.slice(m.index+m[0].length);seen.add(full);break
      }
    }
    return text;
  });
}

function repairPlayerNameCollisionsV31(t,value){
  let text=String(value??'');
  const canonical=[...articlePlayers(t),...(t.trade_acquisitions||[]).flatMap(a=>[
    a?.player_name?{name:a.player_name}:null,
    ...(a?.outgoing_player_names||[]).map(name=>({name}))
  ])].filter(p=>p?.name);
  const unique=[...new Set(canonical.map(p=>String(p.name).trim()).filter(Boolean))];
  const groups=new Map();
  for(const full of unique){
    const bits=full.split(/\s+/),first=bits[0],last=bits.at(-1);if(!first||!last||bits.length<2)continue;
    const a=groups.get(last)||[];a.push({full,first,last});groups.set(last,a);
  }
  for(const entries of groups.values()){
    if(entries.length<2)continue;
    for(const intended of entries){
      for(const other of entries){
        if(intended.full===other.full)continue;
        const re=new RegExp('\\b'+escapeRe(intended.first)+'\\s+'+escapeRe(other.full)+'\\b','g');
        text=text.replace(re,intended.full);
      }
    }
  }
  return text;
}

export function humanSectionsV25(args){
  const {team:t,facts={}}=args,creative=humanSectionsV21(args),factual=humanSectionsV23(args),
    factualByKind=new Map((factual||[]).map(s=>[s.kind,s])),frame=articleFrameV29(t,args.reporter),fw=fourthWallV28(t,args.reporter,frame.angle);
  const sections=(creative||[]).map(c=>{
    const f=factualByKind.get(c.kind)||{};let paragraphs;
    if(c.kind==='lede')paragraphs=[angleLeadV28(t,args.reporter,frame.angle),gameShapeV29(t,args.reporter,frame),ledeConsequenceV29(t,args.reporter,frame),fw].filter(Boolean);
    else if(c.kind==='players')paragraphs=playerStoryV29(t,args.reporter,frame);
    else if(c.kind==='management')paragraphs=managementStoryV29(t,facts,args.reporter,frame);
    else if(c.kind==='value')paragraphs=valueStoryV28(t,args.reporter);
    else if(c.kind==='sentiment')paragraphs=sentimentStoryV30(t,args.reporter,frame);
    else if(c.kind==='outlook')paragraphs=outlookStoryV29(t,args.reporter,frame);
    else if(c.kind==='hot-seat')paragraphs=hotSeatV29(t,args.reporter,frame);
    else if(c.kind==='cool-throne')paragraphs=coolThroneV29(t,args.reporter,frame);
    else paragraphs=['n/a'];
    paragraphs=(paragraphs||[]).map(p=>{
      const specific=specificityPass(t,c.kind,p),firstPerson=deMetaReporterFunctionsV32(specific,args.reporter),named=c.kind==='management'?firstPerson:naturalizePlayerReferences(t,firstPerson);
      return contextualizeParagraphV28(t,named);
    }).map(p=>String(p).replace(/Fix the production and the back page will happily find a new target\./gi,'Fix the production and the criticism can move to somebody else.'));
    paragraphs=(c.kind==='management'?paragraphs:restoreSectionFullNamesV30(t,paragraphs)).map(p=>repairPlayerNameCollisionsV31(t,p));
    return {...f,...c,heading:headingV28(t,args.reporter,c.kind,c.heading,frame.angle),paragraphs:paragraphs.length?paragraphs:['n/a']};
  });
  const state={count:0},aliased=sections.map(sec=>({...sec,paragraphs:(sec.paragraphs||[]).map(p=>deMetaReporterFunctionsV32(repairPlayerNameCollisionsV31(t,teamAliasPassV28(t,p,state)),args.reporter))}));
  const tradeParagraphs=tradeCommentaryV32(t,args.reporter,facts).map(p=>deMetaReporterFunctionsV32(repairPlayerNameCollisionsV31(t,teamAliasPassV28(t,deMetaReporterFunctionsV32(naturalizePlayerReferences(t,p),args.reporter),state)),args.reporter));
  if(tradeParagraphs.length){
    const managementIndex=aliased.findIndex(s=>s.kind==="management"),tradeSection={kind:"trade-commentary",heading:tradeCommentaryHeadingV32(args.reporter),paragraphs:tradeParagraphs};
    aliased.splice(managementIndex>=0?managementIndex:aliased.length,0,tradeSection);
  }
  const cased=aliased.map(sec=>({...sec,heading:articleGrammarV35(t,finalReporterCaseV33(t,args.reporter,sec.heading)),paragraphs:(sec.paragraphs||[]).map(p=>articleGrammarV35(t,finalReporterCaseV33(t,args.reporter,p)))}));
  return dedupeArticleSectionsV29(dedupeArticleSections(cased),t);
}

function uniqueGames(teams){
  const byId=new Map(teams.map(t=>[String(t.roster_id),t])),seen=new Set(),games=[];
  for(const t of teams){const o=byId.get(String(t.opponent_roster_id));if(!o)continue;const key=[String(t.roster_id),String(o.roster_id)].sort().join(':');if(seen.has(key))continue;seen.add(key);const winner=Number(t.points)>=Number(o.points)?t:o,loser=winner===t?o:t,margin=Math.abs(Number(t.points)-Number(o.points)),combined=Number(t.points)+Number(o.points),projGap=valid(t.projected)&&valid(o.projected)?Math.abs(Number(t.projected)-Number(o.projected)):null,upset=projGap!=null&&projGap>=8&&((Number(t.points)>Number(o.points)&&Number(t.projected)<Number(o.projected))||(Number(o.points)>Number(t.points)&&Number(o.projected)<Number(t.projected)));games.push({winner,loser,margin,combined,upset})}
  return games;
}

function gameImportance(g){
 const sameDivision=String(g.winner?.division||'')!==''&&String(g.winner?.division)===String(g.loser?.division),bubble=[g.winner,g.loser].reduce((n,t)=>n+(Math.abs(Number(t.league_context?.spots_from_playoff_line)||0)<=3?1:0),0),playoff=[g.winner,g.loser].reduce((n,t)=>n+(valid(t.mida_outlook?.playoff)?Math.max(0,50-Math.abs(Number(t.mida_outlook.playoff)-50)):0),0);
 return (g.upset?80:0)+(g.margin<=6?60:0)+Math.max(0,50-g.margin)+(sameDivision?70:0)+bubble*35+playoff+Math.min(40,g.combined/8);
}

function divisionPressure(t,result){
  const rivals=t.division_results||[],winners=rivals.filter(x=>Number(x.points)>Number(x.opponent_points)).map(x=>x.team_name),losers=rivals.filter(x=>Number(x.points)<Number(x.opponent_points)).map(x=>x.team_name),
    rivalSubject=xs=>naturalJoin(xs);
  if(result==='W'){
    if(losers.length&&winners.length)return 'In '+(t.division_name||'the division')+', '+t.team_name+' gained ground because '+rivalSubject(losers)+' lost, while '+rivalSubject(winners)+' also won and kept the top of the race from opening up.';
    if(losers.length)return 'In '+(t.division_name||'the division')+', '+t.team_name+' also got help when '+rivalSubject(losers)+' lost.';
    if(winners.length)return 'In '+(t.division_name||'the division')+', '+rivalSubject(winners)+' also won, so '+t.team_name+' kept pace rather than creating separation.';
  }else{
    if(winners.length&&losers.length)return 'In '+(t.division_name||'the division')+', '+rivalSubject(winners)+' won while '+rivalSubject(losers)+' lost, leaving '+t.team_name+' with mixed damage rather than a clean collapse.';
    if(winners.length)return 'In '+(t.division_name||'the division')+', '+rivalSubject(winners)+' won, which made this '+t.team_name+' loss cost a little more ground.';
    if(losers.length)return 'In '+(t.division_name||'the division')+', '+rivalSubject(losers)+' lost too, limiting the damage without making this result any prettier.';
  }
  return null;
}
function implicationStory(g,slot=0){
  const w=g.winner,l=g.loser,wr=w.league_context?.record||{},lr=l.league_context?.record||{},
    sameDivision=String(w.division||"")!==""&&String(w.division)===String(l.division),
    wrec=(Number(wr.wins)||0)+"-"+(Number(wr.losses)||0),lrec=(Number(lr.wins)||0)+"-"+(Number(lr.losses)||0),
    key=String(w.roster_id)+":"+String(l.roster_id)+":implication-v35:"+slot;
  return keyedChoice(key,[
    g.upset?
      w.team_name+" did not just add a win; it stole the comfortable Week 1 story "+l.team_name+" thought it was getting. The underdog leaves "+wrec+" with swagger, while the favorite leaves "+lrec+" having to explain how a projected edge became somebody else’s celebration.":
      w.team_name+" gets to carry the better mood into the next week at "+wrec+". "+l.team_name+" is "+lrec+", and the emotional difference is larger than one line in the standings: one locker room gets to build, the other has to answer for what just happened.",
    sameDivision?
      w.team_name+" took an early swing at a division rival and made "+l.team_name+" wear it. Division games have long memories; the winner gets the first bragging rights, and the loser knows the return meeting already carries a little extra spite.":
      w.team_name+" banked a game "+l.team_name+" can never get back. That sounds dramatic in Week 1 because early playoff arguments are eventually built out of ordinary Sundays that somebody once called too early to matter.",
    g.margin<=6?
      l.team_name+" will replay this one because "+one(g.margin)+" points is close enough to make almost every choice feel reversible. "+w.team_name+" gets the relief of not having to perform that autopsy.":
      l.team_name+" has to decide whether this was a bad matchup, a bad lineup or a bad warning. "+w.team_name+" has the much nicer assignment: figure out which parts of the win are worth making the next opponent fear.",
    w.team_name+" gets the first emotional dividend of the result: confidence without apology. "+l.team_name+" gets the opposite — a week in which every optimistic preseason sentence sounds slightly more expensive.",
    w.team_name+" owns the result and "+l.team_name+" owns the response. The standings only moved by one game; the pressure moved by much more."
  ]);
}

function matchupRead(g,slot=0){
  const w=g.winner,l=g.loser,star=list(w)[0],loserStar=list(l)[0],key=String(w.roster_id)+":"+String(l.roster_id)+":matchup-read-v35:"+slot;
  return keyedChoice(key,[
    w.team_name+" kept forcing "+l.team_name+" to react. "+(star?star.name+" was the most obvious pressure point, ":"")+"and the loser never found the adjustment that changed the emotional direction of the game.",
    l.team_name+" had chances to make this uncomfortable and kept watching "+w.team_name+" answer. "+(loserStar?loserStar.name+" gave the loser something to fight with, but ":"")+"the matchup kept bending back toward the winner.",
    w.team_name+" looked more certain about where it wanted the game to go. "+l.team_name+" looked like the side discovering the problem one possession too late.",
    w.team_name+" made its strengths feel like part of the matchup; "+l.team_name+" made too many of its strengths feel like isolated moments. That is how the scoreboard separates without one single play explaining everything.",
    l.team_name+" did not lose because one star failed or one bench player existed. It lost because "+w.team_name+" found the parts of the matchup it could keep winning and returned to them until the afternoon belonged to the winner."
  ]);
}

function gameStory(g,slot=0){
  const w=g.winner,l=g.loser,star=list(w)[0],loserStar=list(l)[0],winnerSupport=list(w)[1],
    loserMiss=list(l).filter(p=>delta(p)!=null).sort((a,b)=>delta(a)-delta(b))[0],
    score=one(w.points)+"–"+one(l.points),key=String(w.roster_id)+":"+String(l.roster_id)+":game-story-v35:"+slot;
  if(g.upset){
    const opens=[
      w.team_name+" walked in as the underdog and pulled the rug out from under "+l.team_name+", "+score+". "+l.team_name+" had the comfortable forecast; "+w.team_name+" left with the result and the right to be insufferable about it.",
      l.team_name+" entered expecting to control the afternoon and ended up looking shocked. "+w.team_name+" stole the game "+score+", turning the favorite’s Week 1 optimism into a receipt it will be hearing about all week.",
      w.team_name+" was supposed to be the team explaining how it could hang around. Instead, "+l.team_name+" spent Sunday explaining how the favorite let "+w.team_name+" walk out with a "+score+" win.",
      l.team_name+" had the better pregame story; "+w.team_name+" had the better team once the scoring started. The upset made the favorite look ordinary in a game it expected to control.",
      w.team_name+" took a game that belonged to "+l.team_name+" on paper and made paper look ridiculous, "+score+". That is the sort of opener that gives an underdog swagger and a favorite a very quiet ride home."
    ];
    const middle=[
      star?star.name+" became the player "+l.team_name+" could not make disappear, and every successful answer made the favorite look a little less like the team in control.":"",
      winnerSupport?winnerSupport.name+" gave "+w.team_name+" another place to hurt the favorite, which kept "+l.team_name+" from solving the game with one adjustment.":"",
      loserStar?loserStar.name+" gave "+l.team_name+" something to fight with, but the rest of the matchup kept slipping toward the underdog.":"",
      loserMiss&&loserMiss.name!==loserStar?.name?loserMiss.name+" is the name "+l.team_name+" will stare at longest because favorites do not have many quiet spots available when the upset starts forming.":""
    ].filter(Boolean).join(" ");
    return keyedChoice(key,opens)+" "+middle+" "+matchupRead(g,slot);
  }
  if(g.margin<=6){
    const opens=[
      w.team_name+" escaped "+l.team_name+" "+score+", a game close enough that every manager involved probably refreshed the app more often than was medically useful.",
      w.team_name+" beat "+l.team_name+" by "+one(g.margin)+" points, which means the winner gets relief and the loser gets a week of inventing alternate endings.",
      w.team_name+" survived "+l.team_name+" "+score+". Nothing about the margin allows either side to pretend the outcome was inevitable.",
      l.team_name+" came within "+one(g.margin)+" points of changing the entire mood of Week 1. "+w.team_name+" gets the win; the loser gets the torture of knowing exactly how reachable it was.",
      w.team_name+" got the final word over "+l.team_name+", "+score+", in the kind of matchup where one quiet starter can haunt a manager until Thursday."
    ];
    const middle=[
      star?star.name+" mattered because there was no room for empty production; his best moments landed in a game where every point had a pulse.":"",
      loserStar?loserStar.name+" kept "+l.team_name+" alive long enough to make the ending hurt more.":"",
      loserMiss&&loserMiss.name!==loserStar?.name?loserMiss.name+" had the kind of quiet performance that looks enormous when the final gap is this small.":""
    ].filter(Boolean).join(" ");
    return keyedChoice(key,opens)+" "+middle+" "+matchupRead(g,slot);
  }
  if(g.margin>=20){
    const opens=[
      w.team_name+" ran "+l.team_name+" out of answers, "+score+". The loser spent most of the afternoon watching the comeback path get steeper.",
      w.team_name+" beat "+l.team_name+" by "+one(g.margin)+" and made the second half feel like an extended reminder that the matchup had already chosen a side.",
      l.team_name+" got caught in "+w.team_name+"’s version of the afternoon and never found the exit. "+score+" is not subtle.",
      w.team_name+" turned "+l.team_name+" into the team everybody else was making jokes about by dinner, "+score+".",
      w.team_name+" controlled "+l.team_name+" by "+one(g.margin)+" points. The loser spent too long without a credible way to change the game."
    ];
    return keyedChoice(key,opens)+" "+(star?star.name+" was the clearest face of the punishment. ":"")+(loserStar?loserStar.name+" supplied resistance, not rescue. ":"")+matchupRead(g,slot);
  }
  const opens=[
    w.team_name+" handled "+l.team_name+" "+score+" and looked like the side with the clearer plan once the game settled in.",
    w.team_name+" beat "+l.team_name+" "+score+". The winner kept finding answers; the loser kept finding reasons the answer had arrived too late.",
    w.team_name+" spent more of Sunday dictating than reacting, and that was enough to beat "+l.team_name+" "+score+".",
    l.team_name+" never disappeared, but "+w.team_name+" kept it at arm’s length long enough to own a "+score+" win.",
    w.team_name+" beat "+l.team_name+" "+score+" without needing a miracle finish. Sometimes the statement is simply being the more comfortable team for more of the afternoon."
  ];
  return keyedChoice(key,opens)+" "+(star?star.name+" gave "+l.team_name+" the problem it never fully solved. ":"")+(loserStar?loserStar.name+" was the best counterpunch, but the scoreboard kept favoring the other side. ":"")+matchupRead(g,slot);
}

function leagueSynthesis(teams){
  const games=uniqueGames(teams).slice().sort((a,b)=>gameImportance(b)-gameImportance(a));
  if(!games.length)return null;
  const lead=games[0],second=games[1]||null;
  let text="Week 1 already split the league into two emotional categories: "+lead.winner.team_name+" gets to spend the week believing a little more, while "+lead.loser.team_name+" has to explain why the opener belonged to somebody else. That is what early results do before the standings have enough history to feel serious — they change how confidently everyone tells the story.";
  if(second)text+=" The same pressure lands on "+second.winner.team_name+" and "+second.loser.team_name+" in a different shape. "+second.winner.team_name+" banked a Sunday it never has to replay; "+second.loser.team_name+" gets the much less enjoyable task of proving the loss was an exception.";
  return text;
}

function availabilityStories(teams){
  const rows=[];
  for(const t of teams)for(const p of t.next_week_availability?.injury_current_starters||[])rows.push({t,p,value:(t.starter_details||[]).find(x=>String(x.id)===String(p.id))?.value||0});
  if(!rows.length)return [];
  const x=rows.sort((a,b)=>Number(b.value)-Number(a.value))[0],others=rows.filter(y=>String(y.t.roster_id)!==String(x.t.roster_id)).slice(0,2),op=x.t.next_opponent_name||'the next opponent';
  const first=`For ${x.t.team_name}, the availability story worth carrying into next week is ${x.p.name}, who is listed ${String(x.p.designation||'with an injury designation').toLowerCase()} after being in the current starting lineup. ${others.length?`Elsewhere, ${others.map(y=>y.p.name+' ('+y.t.team_name+', '+String(y.p.designation||'injury status')+')').join(' and ')} are also starter-level situations to watch. `:''}`;
  const second=`${x.t.team_name} does not need to turn ${x.p.name}’s designation into melodrama, but it does need a Plan B before ${op} arrives. The good china can stay in the cabinet; this is the unglamorous part of roster construction where expensive depth either earns its place or reveals itself as decoration.`;
  return[first,second];
}

function managementStory(t){
  const s=t.inquirer_article?.sections?.find(x=>x.kind==='management'),p=(s?.paragraphs||[]).find(x=>x&&x!=='n/a');return p||null;
}
function tillyManagementStory(t){
  const facts=t.transaction_player_facts||{},clean={...t,transactions:consolidateTransactions(t)},pick=selectImportantMoves(clean,facts)[0];if(!pick)return null;
  const add=names(pick.add),drop=names(pick.drop),isTrade=String(pick.move?.type||'').toLowerCase()==='trade',incoming=(pick.add||[]).slice().sort((a,b)=>Number(b.points||0)-Number(a.points||0))[0],outgoing=(pick.drop||[]).slice().sort((a,b)=>Number(b.points||0)-Number(a.points||0))[0],bits=[];
  if(isTrade&&add)bits.push(`TRADE FOLLOW-UP: ${t.team_name} brought in ${add}${drop?' and sent out '+drop:''}. ${t.manager_name} paid for a new answer and gets to live with the comparison every Sunday. Week 1 put that comparison on the front page.`);
  else if(add&&drop)bits.push(`${t.team_name} swapped ${drop} for ${add}. Clean transaction, loud consequences: the new name has to make the lineup better. That is front-page material until the move settles in.`);
  else if(add)bits.push(`${t.team_name} added ${add}. No parade for the waiver wire; the new arrival still has to earn a real Sunday role. A useful debut gets the move onto the front page.`);
  else if(drop)bits.push(`${t.team_name} moved on from ${drop}. The vacant roster spot now has to justify the cut, and Week 1 already gave the decision front-page consequences.`);
  if(incoming&&valid(incoming.points)){
    const ctx=playerContextParagraph(incoming);
    bits.push(`${incoming.name} immediately gave ${t.team_name} ${one(incoming.points)} fantasy points.${ctx?' '+ctx:''}`);
  }
  if(outgoing&&valid(outgoing.points)&&Number(outgoing.points)>=10)bits.push(`${outgoing.name} answered the exit with ${one(outgoing.points)}. That is not a verdict on the move, but it makes the comparison impossible to ignore.`);
  if(incoming&&outgoing&&valid(incoming.points)&&valid(outgoing.points)){
    const diff=Number(incoming.points)-Number(outgoing.points);
    bits.push(diff>0?`For one week, ${t.team_name} got ${one(diff)} more points from the incoming side of the move.`:diff<0?`For one week, the outgoing side beat the incoming return by ${one(Math.abs(diff))} points.`:`Week 1 left the two sides even on the scoreboard.`);
  }
  return bits.join(' ');
}
function playerTrend(teams){
  return teams.flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))).filter(x=>['hot','cold'].includes(x.p?.recent_form?.label)).sort((a,b)=>Math.abs(Number(b.p.recent_form?.delta)||0)-Math.abs(Number(a.p.recent_form?.delta)||0))[0]||null;
}
function movement(teams,dir){
  return teams.filter(t=>valid(t.value_history_week?.delta)&&Number(t.value_history_week.delta)!==0).sort((a,b)=>dir>0?Number(b.value_history_week.delta)-Number(a.value_history_week.delta):Number(a.value_history_week.delta)-Number(b.value_history_week.delta))[0]||null;
}
function nextGame(teams){
  const byId=new Map(teams.map(t=>[String(t.roster_id),t])),seen=new Set(),rows=[];
  for(const t of teams){const o=byId.get(String(t.next_opponent_roster_id));if(!o||!valid(t.next_projected)||!valid(o.next_projected))continue;const key=[String(t.roster_id),String(o.roster_id)].sort().join(':');if(seen.has(key))continue;seen.add(key);rows.push({a:t,b:o,gap:Math.abs(Number(t.next_projected)-Number(o.next_projected))})}
  return rows.sort((a,b)=>a.gap-b.gap)[0]||null;
}

function leagueTextureStory(teams){
  const usable=(teams||[]).filter(t=>valid(t.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),top=usable[0],low=usable[usable.length-1],
    all=(teams||[]).flatMap(t=>list(t).map(p=>({t,p,tr:playerTrajectory(p)}))),
    breakout=all.find(x=>x.tr?.kind==="early-breakout"||x.tr?.kind==="breakout"),
    reliable=all.find(x=>x.tr?.kind==="reliable"&&(!breakout||String(x.p.id)!==String(breakout.p.id))),
    stumble=all.find(x=>x.tr?.kind==="stumble"||x.tr?.kind==="decline"),ps=[];
  if(top)ps.push(top.team_name+" did not merely lead the league at "+one(top.points)+"; it made "+(top.opponent_name||"its opponent")+" spend Week 1 underneath the loudest score on the board. That is the kind of opener that turns the next matchup into a referendum on whether the explosion was identity or adrenaline.");
  if(breakout){
    const opp=breakout.t.opponent_name||"the opponent",stat=statSituation(breakout.p)||"";
    ps.push(breakout.p.name+" forced "+opp+" to account for a player it may not have entered Sunday fearing. "+stat+" "+breakout.t.team_name+" now gets the fun problem of asking whether that new pressure point can travel, while the next opponent has to prepare as if it can.");
  }
  if(reliable){
    const opp=reliable.t.opponent_name||"the opponent",stat=statSituation(reliable.p)||"";
    ps.push(reliable.p.name+" gave "+reliable.t.team_name+" the opposite kind of headache for "+opp+": the familiar one. "+stat+" There is something cruel about knowing an established threat is coming and still watching it become part of the game anyway.");
  }
  if(stumble){
    const opp=stumble.t.opponent_name||"the opponent";
    ps.push(stumble.p.name+" gave "+stumble.t.team_name+" the Week 1 performance it will want to erase first. "+opp+" got to play through a quieter version of a player the roster expected to matter more, and the next opponent will notice until "+stumble.p.name+" makes the weakness disappear.");
  }
  if(low&&top&&String(low.roster_id)!==String(top.roster_id))ps.push(low.team_name+" finished at the other end of the board with "+one(low.points)+". Week 1 is forgiving about records and merciless about jokes; "+(low.opponent_name||"the opponent")+" owns the punch line until "+low.team_name+" gives the league something else to remember.");
  return ps.join(" ");
}

function weeklyMatchupHeading(g,isTop=false){
  if(isTop)return `${g.winner.team_name} — Week ${g.winner?.week_classification?.week||1}’s High-Water Mark`;
  if(g.upset)return `${g.winner.team_name} vs. ${g.loser.team_name} — The Forecast Got Flipped`;
  if(g.margin<=6)return `${g.winner.team_name} vs. ${g.loser.team_name} — ${one(g.margin)} Points Decided It`;
  if(String(g.winner?.division||'')!==''&&String(g.winner?.division)===String(g.loser?.division))return `${g.winner.team_name} vs. ${g.loser.team_name} — Division Business`;
  return `${g.winner.team_name} vs. ${g.loser.team_name} — ${one(g.winner.points)}–${one(g.loser.points)}`;
}
function weeklyTopScorerStory(t,g){
  const rows=list(t),top=rows[0],second=rows[1],third=rows[2],trio=[top,second,third].filter(Boolean),parts=[],
    margin=Number(t.points)-Number(t.opponent_points),opp=t.opponent_name||g?.loser?.team_name||"the opponent";
  parts.push(t.team_name+" set the Week 1 scoring ceiling at "+one(t.points)+" and beat "+opp+" by "+one(margin)+". This was the league’s loudest scoreboard, and "+opp+" gets the unpleasant distinction of being the team standing underneath it.");
  if(top){
    parts.push(focusedPlayerStatsV32(trio));
    const threeHigh=trio.length===3&&trio.every(p=>Number(p.points)>=18),names=naturalJoin(trio.map(p=>p.name));
    if(threeHigh)parts.push(names+" all topped 18 fantasy points; "+opp+" spent the afternoon chasing whichever scorer was hurting it next and never found the quiet stretch it needed.");
    else parts.push(top.name+" was the true centerpiece of the explosion. "+(second?second.name+(third?" and "+third.name:"")+" supplied useful support, but ":"")+opp+" spent the afternoon dealing first with the damage "+top.name+" created. Calling every decent line a co-star would undersell the player who actually bent the matchup.");
  }
  parts.push(t.team_name+" gets the fun version of Week 1 now: everybody else has to decide whether that ceiling was an opening statement or the most expensive thing the league saw all month. "+opp+" gets to hope it was the latter.");
  return parts;
}

function weeklyPlayerStatsStory(g){
  const winnerRows=list(g.winner),loserRows=list(g.loser),top=winnerRows[0],support=winnerRows[1],counter=loserRows[0],parts=[];
  if(top){
    const real=statSituation(top);
    parts.push(top.name+" drove the winning side with "+one(top.points)+" fantasy points."+(real?" "+real:""));
  }
  if(support&&Number(support.points)>=18&&String(support.id)!==String(top?.id)){
    const real=statSituation(support);
    parts.push(support.name+" backed the winner with "+one(support.points)+" fantasy points, giving "+g.winner.team_name+" another player the defense could not ignore."+(real?" "+real:""));
  }
  if(counter){
    const real=statSituation(counter);
    parts.push(counter.name+" was "+g.loser.team_name+"’s strongest answer at "+one(counter.points)+" fantasy points."+(real?" "+real:""));
  }
  return parts.join(" ");
}

function weeklyStoryBlock(g,slot,isTop=false){
  const paragraphs=[];
  if(isTop)paragraphs.push(...weeklyTopScorerStory(g.winner,g),implicationStory(g,slot));
  else paragraphs.push(gameStory(g,slot),weeklyPlayerStatsStory(g),implicationStory(g,slot));
  return{heading:weeklyMatchupHeading(g,isTop),paragraphs:paragraphs.filter(Boolean)};
}

function flattenBlocks(blocks){return (blocks||[]).flatMap(b=>b?.paragraphs||[]).filter(Boolean)}

export function expandWeeklyRecapV25(o,teams,week){
  const games=uniqueGames(teams),topTeam=(teams||[]).filter(t=>valid(t.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0]||null,
    topGame=topTeam?games.find(g=>String(g.winner?.roster_id)===String(topTeam.roster_id)||String(g.loser?.roster_id)===String(topTeam.roster_id)):null,
    upset=games.find(g=>g.upset),close=games.slice().sort((a,b)=>a.margin-b.margin)[0],big=games.slice().sort((a,b)=>b.combined-a.combined)[0],
    divisionGame=games.filter(g=>String(g.winner?.division||'')!==''&&String(g.winner?.division)===String(g.loser?.division)).sort((a,b)=>gameImportance(b)-gameImportance(a))[0];
  const chosen=[],seen=new Set();
  for(const g of [topGame,upset,close,big,divisionGame,...games.slice().sort((a,b)=>gameImportance(b)-gameImportance(a))]){
    if(!g||chosen.length>=5)continue;
    const k=[g.winner.roster_id,g.loser.roster_id].sort().join(':');
    if(!seen.has(k)){seen.add(k);chosen.push(g)}
  }
  const upMove=movement(teams,1),downMove=movement(teams,-1),trend=playerTrend(teams),playerPulse=leaguePlayerPulse(teams),bartholomewBoard=bartholomewPlayerBoard(teams),availability=availabilityStories(teams),
    moves=teams.map(t=>({t,text:tillyManagementStory(t)})).filter(x=>x.text).sort((a,b)=>Number(b.t.current_week_trade_count||0)-Number(a.t.current_week_trade_count||0)||(b.t.transactions?.length||0)-(a.t.transactions?.length||0)).slice(0,2),
    next=nextGame(teams);
  const velvet=[
    upMove?`${upMove.team_name} gained ${Math.round(Number(upMove.value_history_week.delta)).toLocaleString('en-US')} in roster value this week. That is not a trophy, but it does make the front office portfolio look rather less like hotel-lobby art. The interesting part is whether the football keeps pace with the appraisal.`:null,
    downMove&&(!upMove||String(downMove.roster_id)!==String(upMove.roster_id))?`${downMove.team_name} moved the other way, down ${Math.abs(Math.round(Number(downMove.value_history_week.delta))).toLocaleString('en-US')} in roster value. One does not burn the chaise lounge over a weekly market move, but another slide would turn tasteful concern into an actual conversation.`:null,
    trend?`${trend.p.name} is the form worth setting the good china for: ${one(trend.p.recent_form.last3_avg)} per game over the last three after ${one(trend.p.recent_form.prior3_avg)} in the prior sample for ${trend.t.team_name}. ${trend.p.recent_form.label==='hot'?'The performance has earned attention; permanence still has to survive the next few Sundays.':'The decline has lasted long enough to be impolite, and the next matchup is an opportunity to restore some decorum.'}`:null,
    ...(bartholomewBoard.length?bartholomewBoard:playerPulse),...availability
  ].filter(Boolean);
  const original=o.sections||[],reporter=i=>original[i]?.reporter||null,tillyFallback=(original[2]?.paragraphs||[]).filter(p=>String(p||'').trim()&&String(p).trim()!=='n/a').slice(0,2);
  const matterBlocks=chosen.map((g,i)=>weeklyStoryBlock(g,i,!!topGame&&String(g.winner.roster_id)===String(topGame.winner.roster_id)&&String(g.loser.roster_id)===String(topGame.loser.roster_id)));
  const synthesis=leagueSynthesis(teams),texture=leagueTextureStory(teams);if(synthesis||texture)matterBlocks.push({heading:'The League-Wide Read',paragraphs:[synthesis,texture].filter(Boolean)});
  const nickRecapRead=topGame?topGame.winner.team_name+" made "+topGame.loser.team_name+" live inside a "+one(topGame.winner.points)+"–"+one(topGame.loser.points)+" result, and that is the game I keep coming back to. The winner looked like it knew where the pressure points were and kept pressing them; the loser spent too much of the afternoon trying to catch up to a problem it had already seen. Week 1 does not tell us who these teams are forever, but it absolutely tells us who owned Sunday.":(topTeam?topTeam.team_name+" owned the loudest Week 1 scoreboard. The useful question is not how impressive the total looks in isolation; it is which opponent had to live through it and whether that pressure shows up again.":"Week 1 produced enough noise that the first job is separating real matchup control from opening-week chaos.");
  matterBlocks.push({heading:'What I’m Buying After the Noise',paragraphs:[nickRecapRead]});
  const bartholomewRecapRead=upset?upset.loser.team_name+" arrived with the nicer forecast and left "+upset.winner.team_name+" holding the better evening; I adore that sort of result because entitlement looks dreadful under stadium lighting. The underdog gets swagger, the favorite gets a week of explaining why the expensive roster still got its pocket picked, and the good china belongs to the winner.":close?close.winner.team_name+" and "+close.loser.team_name+" gave the league the least elegant kind of entertainment; a game close enough that every bad lineup choice suddenly looks personally insulting. One side gets relief, the other gets hindsight with sharp elbows, and I will happily serve both with the good china.":"Week 1 already gave me enough to distinguish the teams that controlled a room from the ones that merely dressed for it; the good china can come out once somebody proves the performance travels.";
  velvet.push(bartholomewRecapRead);
  const tillyRecapRead=upset?upset.winner.team_name+" just made "+upset.loser.team_name+" look foolish, and I am not wasting that gift; the favorite had the projection, the underdog has the scoreboard, and that joke lasts until somebody changes the result. If management wants it to die, win next week.":"Week 1 already gave me winners with swagger and losers with excuses; both groups think next Sunday will prove them right, and one of them is about to become much less talkative.";
  const backPageParagraphs=moves.length?moves.map(x=>x.text):(tillyFallback.length?tillyFallback:['n/a']),
    backPageBlocks=moves.length?moves.map(x=>({heading:x.t.team_name+' — Transaction Follow-Up',paragraphs:[x.text]})):[],
    nextParagraphs=next?[`${next.a.team_name} and ${next.b.team_name} is the matchup to circle first. The current projection separates them by only ${one(next.gap)} points, which is close enough for one star performance, one bad lineup call or one quiet Sunday from a centerpiece to swing the whole thing.`,...(()=>{
      const a=list(next.a)[0],b=list(next.b)[0],arr=[];
      if(a||b){
        arr.push(`${a?a.name+' leads '+next.a.team_name:''}${a&&b?', while ':''}${b?b.name+' is the first name on '+next.b.team_name+'’s side of the marquee':''}. Neither team gets to win this matchup on reputation.`);
        arr.push((a?a.name+" comes in after "+one(a.points)+" fantasy points for "+next.a.team_name+". ":"")+(b?b.name+" answers with "+one(b.points)+" for "+next.b.team_name+". ":"")+"The useful tension is not whether either player has a repeatable floor; it is which team can force the other to spend the afternoon reacting first.")
      }
      const ar=next.a.league_context?.record||{},br=next.b.league_context?.record||{},ap=valid(next.a.mida_outlook?.playoff)?one(next.a.mida_outlook.playoff):null,bp=valid(next.b.mida_outlook?.playoff)?one(next.b.mida_outlook.playoff):null,sameDiv=String(next.a.division||'')!==''&&String(next.a.division)===String(next.b.division);
      arr.push(`The larger stakes are already visible. ${next.a.team_name} enters at ${Number(ar.wins)||0}-${Number(ar.losses)||0}; ${next.b.team_name} is ${Number(br.wins)||0}-${Number(br.losses)||0}. ${sameDiv?'They share '+(next.a.division_name||'a division')+', so the winner helps itself while putting a direct rival one result further behind.':'They do not share a division, but both are still spending from the same finite regular-season runway.'}`);
      if(ap||bp)arr.push(`${ap?next.a.team_name+' has around '+ap+'% chance of reaching the playoffs':''}${ap&&bp?', while ':''}${bp?next.b.team_name+' is around '+bp+'%':''}. The winner can approach the following weeks with one more result already banked; the loser has to find that missing win somewhere else on the schedule.`);
      arr.push(`My read is simple: this matchup can change the tone of the road ahead before it changes anything permanent in the standings. Bank it, and the next close game arrives with less pressure. Waste it, and the schedule gets less forgiving. Schedules are rude that way; they produce a receipt without asking whether management wants to see it.`);
      return arr
    })()]:['The next-week slate is not complete enough to identify a featured matchup without inventing certainty.'];
  const nextBlocks=next?[{heading:`${next.a.team_name} vs. ${next.b.team_name} — Week ${Number(week)+1} Spotlight`,paragraphs:[...nextParagraphs]}]:[];
  if(backPageParagraphs[0]==='n/a')backPageParagraphs.splice(0,1);
  backPageParagraphs.push(tillyRecapRead);
  if(backPageBlocks.length)backPageBlocks.push({heading:'AFTER THE RECEIPTS',paragraphs:[tillyRecapRead]});
  const filchRecapRead=chosen.length?chosen[0].loser.team_name+" is the team I least want to hear explaining this away; "+chosen[0].winner.team_name+" already showed where the matchup broke, and the next opponent is going straight back to that weak spot until somebody fixes it. I do not need a tidy postgame story; leave that weakness sitting there again and Sunday is going to write the joke for me.":"I leave Week 1 with one simple rule: the next opponent is going after whatever looked weakest; fix it before Sunday makes the joke louder.";
  nextParagraphs.push(filchRecapRead);
  if(nextBlocks.length)nextBlocks.push({heading:'What Still Needs Proving',paragraphs:[filchRecapRead]});
  const sections=[
    {reporter:reporter(0),heading:'What Actually Mattered This Week',blocks:matterBlocks,paragraphs:matterBlocks.length?flattenBlocks(matterBlocks):['The week did not produce enough verified matchup detail for a responsible lead story.']},
    {reporter:reporter(1),heading:'The Velvet Rope: Form, Fortune and the Week’s Unfashionable Truths',paragraphs:velvet.length?velvet:['n/a']},
    {reporter:reporter(2),heading:'The Back Page Has Receipts',blocks:backPageBlocks,paragraphs:backPageParagraphs},
    {reporter:reporter(3),heading:'Next Week, Before Everyone Gets Smarter in Hindsight',blocks:nextBlocks,paragraphs:nextParagraphs}
  ].map(sec=>{
    const proper=[...(teams||[]).flatMap(t=>[t.team_name,t.manager_name,...articlePlayers(t).map(p=>p.name)]),sec.reporter?.name].filter(Boolean);
    const teamNames=(teams||[]).flatMap(t=>[t?.team_name,teamIdentityV28(t)?.mascot]).filter(Boolean);
    const tidy=value=>{const deMeta=deMetaReporterFunctionsV32(value,sec.reporter),cased=sec.reporter?.id==='mack-hollis'?normalizeTillyCaseV33(deMeta,proper):deMeta;return grammarSafeTeamVerbsV35(teamNames,cased)};
    return {...sec,heading:tidy(sec.heading),paragraphs:(sec.paragraphs||[]).map(tidy),blocks:(sec.blocks||[]).map(b=>({...b,heading:tidy(b.heading),paragraphs:(b.paragraphs||[]).map(tidy)}))};
  });
  return {...o,inquirer_version:26,editorial_revision:6,sections};
}
