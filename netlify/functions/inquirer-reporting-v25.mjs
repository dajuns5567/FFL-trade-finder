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
    "walter-mercer":[[/\bNick’s\b/g,"my"],[/\bNick will\b/g,"I’ll"],[/\bNick wants\b/g,"I want"],[/\bNick sees\b/g,"I see"],[/\bNick circles\b/g,"I circle"],[/\bleaves Nick watching\b/g,"leaves me watching"],[/\bgets Nick’s\b/g,"gets my"]],
    "tess-delaney":[[/\bBartholomew’s\b/g,"my"],[/\bBartholomew will\b/g,"I’ll"],[/\bBartholomew would\b/g,"I would"],[/\bBartholomew wants\b/g,"I want"],[/\bBartholomew can\b/g,"I can"],[/\bBartholomew accepts\b/g,"I accept"],[/\bBartholomew respects\b/g,"I respect"],[/\bgave Bartholomew\b/g,"gave me"],[/\bleaves Bartholomew\b/g,"leaves me"]],
    "mack-hollis":[[/\bTilly’s\b/g,"my"],[/\bTilly starts\b/g,"I start"],[/\bTilly does\b/g,"I do"],[/\bTilly would\b/g,"I would"],[/\bTilly resents\b/g,"I resent"]],
    "nora-voss":[[/\bFilch’s\b/g,"my"],[/\bFilch would\b/g,"I would"],[/\bFilch recommends\b/g,"I recommend"],[/\bFilch enters\b/g,"I enter"],[/\bFilch treats\b/g,"I treat"],[/\bFilch does\b/g,"I do"],[/\bFilch starts\b/g,"I start"]]
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
function threeHighScorersV33(f){
  const trio=[f?.top,f?.second,f?.third].filter(Boolean);
  return trio.length===3&&trio.every(p=>Number(p?.points)>=18);
}
function playerContextLabelV33(p){
  const pos=String(p?.position||'player').toUpperCase(),age=Number(p?.age),years=Number(p?.years_exp);
  const stage=(Number.isFinite(years)&&years<=2)||(Number.isFinite(age)&&age<=24)?'young':(Number.isFinite(years)&&years>=7)||(Number.isFinite(age)&&age>=30)?'veteran':'prime-age';
  return stage+' '+pos;
}
function playerStatInsightV33(t,p,r){
  if(!p)return null;
  const d=delta(p),pts=Number(p.points),role=teamOpportunity(p),prior=Number(p.prior_season_avg),priorGames=Number(p.prior_season_games)||0,team=teamIdentityV28(t).mascot,v=voice(r),name=p.name,roleLabel=playerContextLabelV33(p),resultLabel=Number(t?.points)>Number(t?.opponent_points)?'winning':'losing',key=String(t.roster_id)+':'+String(p.id||name)+':stat-insight:'+String(r?.id||'');
  let banks;
  if(d!=null&&d>=6){
    banks=[
      [name+' beat projection by '+one(d)+'. '+(role?.text?'The useful part is '+role.text+'; that workload gives the spike somewhere real to live.':'Nick wants another week of role evidence before budgeting the spike again.')],
      [name+' finished '+one(d)+' above projection. '+(role?.text?'The line came with '+role.text+', which makes the excess easier to admire.':'Lovely result; Bartholomew is waiting for a sturdier role before ordering it by the case.')],
      [name+' beat projection by '+one(d)+'. '+(role?.text?'For this '+roleLabel+' in a '+resultLabel+' team week, the job underneath it was '+role.text+', so next week has something concrete to test.':'Enjoy the points; do not spend next week’s before the role earns them.')],
      [name+' exceeded projection by '+one(d)+'. '+(role?.text?'For a '+roleLabel+' inside a '+resultLabel+' team result, the opportunity included '+role.text+', making the role more probative than the surprise total.':'The spike is favorable evidence without enough workload yet to become a baseline.')]
    ][v];
  }else if(d!=null&&d<=-6){
    const miss=Math.abs(d);
    banks=[
      [name+' missed projection by '+one(miss)+'. '+(role?.text?'The role still included '+role.text+'; the job survived, the conversion did not.':'Both the opportunity and the output need a better answer next week.')],
      [name+' finished '+one(miss)+' below projection. '+(role?.text?'At least '+role.text+' showed up for this '+roleLabel+' in a '+resultLabel+' team week; the production was the guest who forgot the invitation.':'There is very little elegant about needing both more work and more production.')],
      [name+' came in '+one(miss)+' under projection. '+(role?.text?'The work was there — '+role.text+'. The points were apparently on personal leave.':'That is two problems wearing one stat line: not enough work and not enough production.')],
      [name+' missed projection by '+one(miss)+'. '+(role?.text?'The role still showed '+role.text+', which preserves the usage case and weakens the excuse for the output.':'The adverse result reaches both role and efficiency.')]
    ][v];
  }else if(Number.isFinite(prior)&&prior>0&&priorGames>=6&&Number.isFinite(pts)){
    const ratio=pts/prior;
    if(ratio>=1.25)banks=[
      [name+' ran well above last year’s '+one(prior)+'-point average. Nick wants the next workload before calling the jump permanent.'],
      [name+' made last year’s '+one(prior)+'-point average look modest for a day. Bartholomew will admire the upgrade and wait for a repeat.'],
      [name+' jumped well past last year’s '+one(prior)+'-point average. Nice headline. Keep the job and do it again.'],
      [name+' materially exceeded last year’s '+one(prior)+'-point average. The next role decides whether this becomes trend evidence.']
    ][v];
    else if(ratio<=.75)banks=[
      [name+' fell well short of last year’s '+one(prior)+'-point average. One week gets context; repetition gets concern.'],
      [name+' came in well below last year’s '+one(prior)+'-point average. Bartholomew grants one week of manners, not a season of immunity.'],
      [name+' finished far below last year’s '+one(prior)+'-point average. One bad Sunday is a note. Two starts looking like a headline.'],
      [name+' landed well below last year’s '+one(prior)+'-point baseline; '+name+'’s prior record argues for patience while the next week supplies the test.']
    ][v];
  }
  if(!banks){
    if(defensivePlayer(p)&&Number.isFinite(pts)&&pts>=14)banks=[
      [name+' gave '+team+' a legitimate defensive advantage. Nick cares about whether the tackle-and-pressure work repeats, not about congratulating the league format for noticing it.'],
      [name+' supplied defensive work worth building a paragraph around. Bartholomew will keep the football and discard the sermon about why IDP exists.'],
      [name+' gave '+team+' a defensive headline with actual football behind it. The next question is whether the same role keeps showing up.'],
      [name+' produced a defensible IDP result because the underlying defensive work was substantial. Another week of the same role would strengthen the finding.']
    ][v];
    else if(role?.text)banks=[
      [name+' had '+role.text+'. Nick would rather follow that workload than reprint the fantasy total without an opinion.'],
      [name+' had '+role.text+'. Bartholomew takes the role over a naked point total every time.'],
      [name+' had '+role.text+'. That is an actual role to follow next week, not just a number to reprint.'],
      [name+' had '+role.text+'. The opportunity is the repeatable part of the evidence.']
    ][v];
    else banks=[
      [name+' has a useful fantasy line, but Nick is waiting for clearer role evidence before treating it as dependable.'],
      [name+' has a useful line. Bartholomew is saving the larger compliment for a role that gives the number somewhere sturdy to live.'],
      [name+' gets credit for the number. The role still has to earn the sequel.'],
      [name+' supplies a favorable result without enough role evidence for a broader conclusion.']
    ][v];
  }
  return keyedChoice(key,banks);
}
function losingRecordAsideV33(t,r){
  const rec=t?.league_context?.record||{},w=Number(rec.wins)||0,l=Number(rec.losses)||0,ties=Number(rec.ties)||0,games=w+l+ties,rank=Number(t?.league_context?.standings_rank),size=Number(t?.league_context?.league_size)||32;
  if(!((l>=2&&l>w)||(games>=4&&Number.isFinite(rank)&&rank>Math.floor(size*.75))))return null;
  const team=teamIdentityV28(t).mascot,manager=t.manager_name||'management',v=voice(r),key=String(t.roster_id)+':bad-record:'+w+'-'+l+':'+String(r?.id||'');
  const banks=[
    ['At '+w+'-'+l+', the '+team+' operation has moved past the stage where “early” does much analytical work. '+manager+' needs wins before the explanations become their own losing streak.','Nick has covered enough '+w+'-'+l+' starts to know patience is useful right up until it becomes a hobby.'],
    ['The '+team+' record is '+w+'-'+l+', which is less a slow start than an increasingly committed aesthetic. '+manager+' may improve the décor by winning.','A '+w+'-'+l+' record is an awfully durable stain for '+team+'. Bartholomew recommends the radical cleansing agent known as victories.'],
    ['The '+team+' record is '+w+'-'+l+'. The good news is nobody can accuse this roster of peaking too early. '+manager+' should try the fashionable new trend called winning.','At '+w+'-'+l+', the '+team+' operation has made pessimism look less like a mood and more like responsible preparation.'],
    ['The '+team+' record is '+w+'-'+l+'. The standings have filed enough adverse exhibits that '+manager+' needs wins, not a more persuasive closing argument.','The '+team+' record sits at '+w+'-'+l+'; the file has stopped treating each loss as an isolated incident. '+manager+' can rebut the pattern only on the scoreboard.']
  ][v];
  return keyedChoice(key,banks);
}
function teamPlayerCodaV33(t,r,f){
  const top=f?.top,team=teamIdentityV28(t).mascot,v=voice(r),projDelta=valid(t.projected)?Number(t.points)-Number(t.projected):null,topShare=top&&Number(t.points)>0?Math.round(Number(top.points)/Number(t.points)*100):0;
  if(f?.lost)return [
    'The '+team+' loss needs a specific diagnosis, not a generic “more help” slogan. Nick is keeping the good individual lines separate from the lineup spots that actually failed.',
    'Bartholomew has no interest in blaming every '+team+' player equally just because the final was ugly. The useful criticism belongs where the production actually disappeared.',
    'The '+team+' loss is bad enough without lazy blame. Keep the useful player lines, circle the empty ones and stop pretending “team effort” explains anything.',
    'The '+team+' finding is adverse, but the player findings are not uniform. The useful analysis is to separate the affirmative roles from the actual failures.'
  ][v];
  if(topShare>=28)return [
    top.name+' supplied about '+topShare+'% of the '+team+' total. Nick sees a real centerpiece and a real concentration question; those are different claims.',
    top.name+' produced about '+topShare+'% of the '+team+' score. Bartholomew admires a centerpiece and distrusts furniture that collapses when it leaves the room.',
    top.name+' supplied about '+topShare+'% of the '+team+' score. Great star line. The rest of the roster can earn a broader compliment when it stops borrowing so much of the headline.',
    top.name+' accounted for about '+topShare+'% of the '+team+' total. The concentration is the relevant finding; a broader depth claim would outrun the evidence.'
  ][v];
  if(projDelta!=null&&Math.abs(projDelta)>=12)return [
    team+' finished '+one(Math.abs(projDelta))+' points '+(projDelta>0?'above':'below')+' projection. Nick cares about which player roles created that gap, not about celebrating or scolding the forecast itself.',
    team+' landed '+one(Math.abs(projDelta))+' points '+(projDelta>0?'above':'below')+' forecast. Bartholomew would rather identify the role that caused the surprise than pretend the projection deserves a personality.',
    team+' finished '+one(Math.abs(projDelta))+' points '+(projDelta>0?'above':'below')+' projection. Fine. The useful story is which roles moved the number and whether they can do it again.',
    team+' ended '+one(Math.abs(projDelta))+' points '+(projDelta>0?'above':'below')+' projection. The variance matters only to the extent that repeatable player roles explain it.'
  ][v];
  return [
    'Nick has enough '+team+' evidence for individual judgments without inventing a roster-wide moral from ordinary box-score contributions.',
    'Bartholomew is leaving the '+team+' supporting cast out of the grand theory until another performance actually earns grand language.',
    'The '+team+' page does not need filler. The players who changed the game get ink; everybody else can earn it next week.',
    'The '+team+' file supports specific player findings. It does not require a generic conclusion about balance, depth or collective effort.'
  ][v];
}
function resultShapeV33(f){
  const margin=Math.abs(Number(f?.margin)||0);
  if(margin<=7)return f?.won?'close win':'close loss';
  if(margin>=35)return f?.won?'rout win':'rout loss';
  return f?.won?'win':'loss';
}
function teamPlayerExtraV33(t,r,f,slot){
  const top=f?.top,team=teamIdentityV28(t).mascot,opp=t.opponent_name||'the opponent',next=t.next_opponent_name||'the next opponent',v=voice(r),kind=Math.abs(Number(slot)||0)%3,rec=record(t),shape=resultShapeV33(f),shapePhrase=/^(?:win|loss)$/.test(shape)?'a '+shape:'a '+shape+' result',roleLabel=playerContextLabelV33(top),key=String(t.roster_id)+':player-extra:'+kind+':'+String(r?.id||'');
  const banks=[
    [
      [top.name+' gets the useful follow-up: can the same role survive when '+team+' is not playing this exact opponent? After this '+shape+' review, Nick trusts repeatable '+roleLabel+' work more than a pretty total.',top.name+' already supplied the headline. Nick’s next note is whether the workload survives a different game script instead of asking the fantasy total to predict itself.','There is one '+team+' player result worth carrying forward in '+top.name+'. The next Sunday decides whether the role travels or the box score was simply well timed.','Nick is keeping '+top.name+' on the short list for next week because the role has something testable about it. That is more useful than handing every scorer a paragraph.'],
      ['Bartholomew’s useful question for '+top.name+' is whether the '+roleLabel+' role survives a less accommodating afternoon; one good total inside '+shapePhrase+' is lovely, but a repeatable job is much better furniture.',top.name+' already owns the flattering paragraph. In this '+shape+' review, Bartholomew wants to know whether the '+roleLabel+' workload travels when the matchup stops cooperating.',team+' can enjoy '+top.name+' without turning one Sunday into mythology. The tasteful next step is the same role under less convenient circumstances.','The number belongs to '+top.name+'. Bartholomew is more interested in whether the same job appears next week, when the décor will be different and excuses more expensive.'],
      [top.name+' gets the headline. After this '+shape+' review, Tilly is done giving ordinary '+roleLabel+' box-score neighbors honorary co-star billing.','The '+team+' player story centers on '+top.name+'; keep this '+roleLabel+' role after '+shapePhrase+' and the next headline writes itself without yelling at the font.',top.name+' earned the ink. Now do it when the matchup changes; that is how a good Sunday stops being a souvenir.','Tilly has one name circled for the useful reason: '+top.name+' gave next week a role worth checking, not just a score worth reposting.'],
      [top.name+' remains the player exhibit worth carrying forward. The next file should test the same role against a different game environment rather than extrapolate from the fantasy total alone.','The repeatability question for '+team+' centers on '+top.name+': whether the workload persists when opponent and script change. That is the next probative data point.','The next inquiry on '+top.name+' is role continuity. A second comparable workload would strengthen the finding more than another sentence about this week’s total.','Filch keeps '+top.name+' in the next-week file because this '+roleLabel+' role can be corroborated after '+shapePhrase+'; the rest of the roster does not receive equal evidentiary weight by association.']
    ],
    [
      ['The '+team+' record is '+rec+', which is the part no individual stat line gets to negotiate away. Nick will praise the useful players and still make the team answer for the standings.','A good player line can survive a bad '+team+' result; the record is still '+rec+'. Nick keeps those judgments separate because the scoreboard does not issue group pardons.',team+' leaves this week at '+rec+'. The individual praise matters, but Nick is not letting one good line do public-relations work for the whole roster.','Nick’s player notes are favorable where they earned it; the '+team+' record remains '+rec+'. Those facts are allowed to coexist without a motivational poster.'],
      ['The '+team+' record is '+rec+', and Bartholomew refuses to let one handsome player line redecorate the standings. Praise the player; leave the record where everyone can see it.','The '+team+' record reads '+rec+'. One elegant individual performance is not large enough to drape over that entire piece of furniture.','The '+team+' roster carries a '+rec+' record into the next column. Bartholomew can compliment the player page without pretending the standings suddenly acquired better taste.','At '+rec+', the '+team+' roster still has larger concerns than one player can solve alone. Bartholomew will keep the praise narrow and the team judgment appropriately impolite.'],
      ['The '+team+' record is '+rec+'. Good player line, same standings. Tilly can hold two thoughts at once, which apparently puts the newsroom ahead of half the group chat.','The '+team+' roster leaves the week '+rec+'. Credit the player who earned it; do not use him as a tarp for the rest of the roster.','The '+team+' record is '+rec+'. The player page has some good news. The standings did not get the memo.','The '+team+' record is '+rec+'. Tilly will praise the right name and keep the team-wide optimism locked until the wins show up.'],
      ['The team-level record remains '+rec+' for '+team+'. Individual affirmative evidence does not alter that standing, and the article should not use it as a substitute for a favorable result.','At '+rec+', the '+team+' roster has separate player and team findings. Filch keeps them separate because strong individual evidence cannot erase an adverse record.','The '+team+' record is '+rec+'. Player-level credit remains admissible, but it does not rebut the standings by itself.','Filch records '+team+' at '+rec+' and leaves the individual praise in its proper scope. The larger team finding requires wins.']
    ],
    [
      ['Next comes '+next+'. Nick wants the player role that actually worked to travel, because the schedule has no interest in honoring this week’s explanation.','Against '+next+', Nick is watching whether '+team+' can preserve the useful player role without recreating every other condition from this week.','The next '+team+' article starts with '+next+'. Nick would like the good player evidence to survive before the bad habits become the recurring part.','The useful player assignment against '+next+' is simple: keep the role that worked and make the opponent solve it instead of asking the columnist to explain its disappearance.'],
      [next+' is next, and Bartholomew would appreciate the useful '+team+' roles arriving intact rather than as charming anecdotes from last Sunday.','Next for '+team+' is '+next+'. The elegant outcome would be the same useful role with fewer of the week’s less attractive accessories.','Next is '+next+', where Bartholomew wants the useful '+team+' role to travel; nostalgia for one Sunday is terribly common and rarely useful.','The next opponent is '+next+'. Bartholomew will judge the useful '+team+' role by whether it survives a new guest list, not by how fondly everyone remembers this week.'],
      [next+' is next. Keep the useful '+team+' role, lose the excuses and give Tilly a reason to write a different joke.','Next for '+team+' is '+next+'. The player who earned ink this week can make it a trend; everybody else can stop volunteering for the wrong headline.',next+' is waiting. Tilly wants the good '+team+' role to travel and the bad one to miss the bus.','The next page says '+next+'. Repeat the useful role, fix the quiet one and spare Tilly another copy-and-paste complaint.'],
      [next+' is the next opponent. Filch’s player-level follow-up is whether the affirmative role persists under a new matchup while the adverse roles are corrected.','The next '+team+' exhibit comes against '+next+'. Role persistence will matter more than the memory of this fantasy total.','Against '+next+', the useful '+team+' question is whether the same player role can be corroborated while the weaker slots change.','Filch carries the player finding into the '+next+' matchup with one condition: the role must recur before the conclusion gains weight.']
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
    `Put veteran ${p.name} on fall-off watch. Several weeks of lighter production have turned one bad Sunday into a pattern worth respecting.`,
    `${p.name} has moved past “slow start.” At this stage of his career, a multi-week drop deserves a sharper eye on the role.`
  ])};
  if(!established&&games>=3&&young&&ratio>=1.28&&role?.strong)return {kind:'breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} has been too productive for too many weeks to call this a hot streak anymore. The role has grown with him.`,
    `${p.name} is starting to look like a different weekly problem than he was last season. The workload says the jump has real support.`,
    `The breakout case for ${p.name} has survived multiple Sundays: young player, larger role and better production.`
  ])};
  const earlyBreakoutFloor=pos==='QB'?18:pos==='RB'?14:pos==='WR'?14:pos==='TE'?11:defensivePlayer(p)?11:13;
  if(!established&&games===1&&young&&ratio>=1.4&&role?.strong&&points>=earlyBreakoutFloor)return {kind:'early-breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} belongs on early breakout watch after a first Sunday that was both loud and busy. One more week with the same role would make the story harder to shrug off.`,
    `${p.name} gave us a proper breakout teaser: young player, real involvement and a much bigger Sunday than fantasy managers were used to seeing.`,
    `${p.name} changed the conversation for one week. Keep the same workload next Sunday and “breakout watch” starts losing the word “watch.”`
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
    `${p.name} has climbed from ${one(prior)} per game last season to ${one(current)} this year. The role has grown with the production; breakout watch is no longer premature.`,
    `${p.name} is averaging ${one(current)} after sitting at ${one(prior)} last year. The old expectation is starting to look stale.`,
    `Last year’s ${one(prior)}-point average looks small next to ${p.name}’s ${one(current)} this season. This has lasted long enough to call it a real leap.`
  ])};
  if(!established&&games===1&&Number.isFinite(age)&&age<=26&&ratio>=1.4&&opp?.strong)return {kind:'early-breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} cleared last year’s ${one(prior)}-point average by a wide margin. One Sunday is not a trend, but it is enough to get attention.`,
    `${p.name} averaged ${one(prior)} last season and opened well above it. Give the new role another Sunday before calling it permanent.`,
    `${p.name} opened far above last year’s ${one(prior)}-point level. Put him on breakout watch, not in the victory parade.`
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
  const rows=(teams||[]).flatMap(t=>(t.starter_details||[]).map(p=>({t,p,tr:playerTrajectory(p)}))).filter(x=>x.tr);
  const pick=kind=>rows.filter(x=>x.tr.kind===kind).sort((a,b)=>Number(b.tr.strength)-Number(a.tr.strength))[0]||null,out=[],seen=new Set();
  for(const kind of ['breakout','early-breakout','reliable','decline','stumble']){
    const x=pick(kind);if(!x||seen.has(String(x.p.id)))continue;seen.add(String(x.p.id));
    const situ=statSituation(x.p),tag=kind==='decline'?'DECLINE WATCH':kind==='stumble'?'VETERAN CHECK-IN':kind==='reliable'?'RELIABLE':kind.includes('breakout')?'BREAKOUT WATCH':'PLAYER WATCH';
    out.push(`${tag}: ${x.tr.text}${situ?' '+situ:''}`);
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
    if(['breakout','early-breakout'].includes(x.tr?.kind))return 300+Number(x.tr.strength||0)*100;
    if(x.tr?.kind==='rookie'&&x.pts>=8)return 240+x.pts;
    if(x.young&&x.priorGames>=6&&x.ratio!=null&&x.ratio>=1.2&&x.role?.strong)return 180+x.ratio*10+x.pts/10;
    if(defensivePlayer(x.p)&&x.young&&x.priorGames>=6&&x.ratio!=null&&x.ratio>=1.35&&x.pts>=14)return 170+x.ratio*10+x.pts/10;
    if(x.young&&x.pts>=12&&x.role?.strong)return 120+x.pts;
    return -Infinity;
  };
  const reliableScore=x=>{
    if(x.tr?.kind==='star')return 360+Number(x.tr.strength||0)*50;
    if(x.tr?.kind==='reliable')return 300+Number(x.tr.strength||0)*100;
    if(x.established&&x.pts>=x.prior*.7)return 250+x.pts/10;
    if(x.priorGames>=6&&Number.isFinite(x.prior)&&x.prior>=6&&x.ratio!=null&&Math.abs(x.ratio-1)<=.3)return 180-Math.abs(x.ratio-1)*100+x.prior/10;
    return -Infinity;
  };
  const take=(defense,n,score,exclude=new Set())=>rows.filter(x=>defensivePlayer(x.p)===defense&&!exclude.has(String(x.p.id))&&Number.isFinite(score(x))).sort((a,b)=>score(b)-score(a)||b.pts-a.pts).slice(0,n);
  const bo=take(false,2,breakoutScore),bd=take(true,1,breakoutScore),used=new Set([...bo,...bd].map(x=>String(x.p.id))),
    ro=take(false,2,reliableScore,used),rd=take(true,1,reliableScore,used);
  const rolePhrase=x=>x.role?.text?` The role included ${x.role.text}, enough substance to keep the champagne corked but the name circled.`:'';
  const ps=[];
  if(bo.length||bd.length){
    const offense=bo.length?`On offense, ${naturalJoin(bo.map(x=>x.p.name))} ${bo.length===1?'gets':'get'} the breakout-watch invitations.`:'No offensive player clears the breakout bar this week.';
    const defense=bd.length?` On defense, ${bd[0].p.name} gets the watch list after a Sunday loud enough to demand another look.`:' No defensive player clears the breakout bar this week.';
    const detail=bo.map(x=>`${x.p.name}:${rolePhrase(x)}`).join(' ');
    ps.push(`${offense}${defense} ${detail} These are the names whose weekly reputations moved enough to earn another look.`);
  }
  if(ro.length||rd.length){
    const offense=ro.length?`${naturalJoin(ro.map(x=>x.p.name))} ${ro.length===1?'is the offensive reliability name':'are the two offensive reliability names'} Bartholomew trusts to keep doing familiar work.`:'No offensive player earns the reliability label this week.';
    const defense=rd.length?` On defense, ${rd[0].p.name} gets the same designation.`:' No defensive player clears the reliability bar this week.';
    ps.push(`Reliability is less glamorous and considerably more useful. ${offense}${defense} Dependability rarely gets champagne, which is probably why it survives the evening.`);
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
  return `${x.p.name} is worth a breakout watch for ${t.team_name}. At age ${x.age}, the scoring has climbed from ${one(x.baseline)} per game across the prior sample to ${one(x.current)} over the last three, and this week’s ${x.opp.text} gives the jump actual opportunity behind it. The next few Sundays still decide whether the new level holds.`;
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
  const trajectoryLabel=kind=>({rookie:'ROOKIE WATCH',breakout:'BREAKOUT CANDIDATE','early-breakout':'EARLY BREAKOUT WATCH',decline:'FALL-OFF WATCH',reliable:'RELIABLE',stumble:'SLOW-START WATCH',veteran:'VETERAN CHECK-IN'}[kind]||'PLAYER WATCH');
  for(const x of trajectoryRows){if(used.has(String(x.p.id)))continue;used.add(String(x.p.id));ps.push(trajectoryLabel(x.tr.kind)+': '+x.tr.text);if(used.size>=2)break}
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
    `Breakout watch belongs on ${p.name} now. ${tr.text}`,
    `${p.name} is the upside name worth circling. ${tr.text}`,
    `Keep ${p.name} on the breakout page for another week. ${tr.text}`
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
  if(tr.kind==='breakout'||tr.kind==='early-breakout')return `${p.name} is on breakout watch now. Give ${p.name} a few more Sundays like this and the old baseline will look badly out of date.`;
  if(tr.kind==='decline')return `Veteran ${p.name} is on fall-off watch after a multi-week slide. The old weekly floor is no longer automatic.`;
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
  const rows=list(t),top=rows[0],full=teamIdentityV28(t).full,opp=String(t.opponent_name||'the opponent'),
    score=one(t.points)+'–'+one(t.opponent_points),oppScore=one(t.opponent_points)+'–'+one(t.points),margin=Math.abs(Number(t.points)-Number(t.opponent_points)),
    miss=t.best_lineup_miss,tx=Number(t.current_week_trade_count||0),topName=top?.name||'the leading scorer',
    seed=String(t.roster_id)+':'+angle+':'+String(r?.id||'');
  const spines={
    'rout-win':[
      `${full} did not beat ${opp} so much as remove the suspense from ${score}. By the time the margin reached ${one(margin)}, the interesting question was no longer who would win but which part of the performance could survive contact with next Sunday.`,
      `${score} flatters ${opp}. ${full} spent the afternoon turning a matchup into administrative paperwork, and a ${one(margin)}-point margin leaves very little room for fake modesty.`,
      `There are wins, and then there are Sundays when the other side starts looking for the exits before the column is finished. ${full} gave ${opp} the latter, ${score}.`
    ],
    'rout-loss':[
      `${full} lost ${score}, a margin of ${one(margin)} that resists euphemism. This was not one unlucky lineup slot; it was the kind of Sunday that makes every department of the roster look complicit.`,
      `${opp} beat ${full} ${oppScore}, and at that margin isolated excuses stop mattering. The whole ${full} lineup has to own a piece of the afternoon.`,
      `${score} is the sort of final that makes analysis feel like an incident report. There are enough problems across ${full} that none deserves to hide behind the others.`
    ],
    'close-win':[
      `${full} escaped ${opp} ${score}, and the ${one(margin)}-point margin is exactly why the details matter. One lineup call, one target, one tackle or one ugly quarter could have turned a satisfying win into a week of recriminations.`,
      `A ${one(margin)}-point win is less a cushion than permission to exhale. ${full} beat ${opp} ${score}, which means every flaw gets discussed from the much friendlier side of the standings.`,
      `${full} beat ${opp} ${score}. Barely. That adverb is doing a lot of work, because the final margin was thin enough to make almost every decision in the lineup relevant.`
    ],
    'close-loss':[
      `${full} lost ${score}, and ${one(margin)} points is close enough to make the whole afternoon feel personally negotiable. Every quiet starter and every legal bench alternative suddenly has a lawyer.`,
      `${opp} beat ${full} ${oppScore}. A ${one(margin)}-point loss is cruel because it gives hindsight too many places to stand and shout.`,
      `${full} came away with a loss at ${score}, the kind that does not let anyone retreat into “we were never in it.” They were in it. That is what makes the autopsy irritating.`
    ],
    'upset-win':[
      `${full} was supposed to be the lesser side on paper and then treated the forecast like junk mail, beating ${opp} ${score}. The upset matters less as a surprise than as proof that this lineup has a version capable of bending the matchup in its own direction.`,
      `The projection liked ${opp}; Sunday liked ${full}. ${score} turned a pregame disadvantage into one of those wins that changes how seriously the next opponent has to read the roster.`,
      `${full} entered as the projected underdog and left with ${score}. Forecasts are useful until somebody starts taking them personally.`
    ],
    'favorite-collapse':[
      `${full} owned the nicer forecast and still lost to ${opp} ${score}. Those are the defeats that linger because the schedule offered a reasonable assignment and the lineup returned it unopened.`,
      `This was supposed to be one of the friendlier pieces of the schedule. Instead, ${full} turned a projected edge into a ${score} loss, which is how comfortable weeks become expensive ones.`,
      `${full} had the forecast, ${opp} had the result. ${score} makes every pregame assumption look decorative after the fact.`
    ],
    'lineup-regret':[
      `${full} lost ${score}, and the bench has earned a paragraph whether management likes it or not. ${miss?.reserve?.name||'A reserve option'} had a legal path into the lineup worth about ${one(miss?.gap||0)} additional points; that is not imaginary Monday-morning roster gymnastics.`,
      `The final was ${score}, but the sharper story is sitting on the bench. ${miss?.reserve?.name||'A reserve'} could legally have replaced ${miss?.starter?.name||'a starter'}, which turns regret into an actual management decision instead of talk-radio theater.`,
      `${full} can complain about plenty after ${score}. The complaint with documentation is the lineup one: ${miss?.reserve?.name||'the reserve option'} was eligible, available and materially better this week.`
    ],
    'front-office-storm':[
      `${full} made ${tx} completed roster moves this week, then asked Sunday to make sense of all that motion. The final was ${score}; the more interesting question is which of those decisions actually changed the football.`,
      `The transaction log for ${full} needs its own table of contents after ${tx} moves. Sunday finally supplied the part the front office cannot manufacture with activity: consequences.`,
      `${full} spent the week rearranging the roster at industrial scale — ${tx} completed moves — before landing at ${score}. Churn is easy to count; improvement is harder.`
    ],
    'defense-led':[
      `${full} found its loudest fantasy voice on defense, where ${topName} led the team in scoring on the way to ${score}. In an IDP league, that is not a novelty; it is a reminder that a matchup can turn on the side of the ball casual recaps usually bury.`,
      `${topName} put a defender at the center of the ${full} story, and ${score} followed. That is the kind of week that makes an IDP roster feel less like a specialty project and more like a weapon.`,
      `${full} came out of ${score} with a defensive player as its headline act. ${topName} made sure nobody could write this one as an offense-only story.`
    ],
    'star-dependent':[
      `${full} finished at ${one(t.points)}, but most of the oxygen belonged to ${topName} and the next few names on the card. The result against ${opp} was ${score}; the sustainability question is whether the rest of the roster can keep forcing itself into the article.`,
      `${score} came with a concentrated cast. ${full} leaned so heavily on its top scorers that a single ordinary Sunday from one of them would have changed the shape of the entire matchup.`,
      `${full} got what it needed at the top and not much permission to look away from the stars. ${score} worked this time; dependency is still dependency when it wins.`
    ],
    'projection-smash':[
      `${full} blew past its own projection by ${one(Number(t.points)-Number(t.projected))} points and still had to live with the actual result, ${score}. Forecasts do not award wins, but beating one this badly tells us the roster found production the model did not price in.`,
      `${score} arrived with ${full} running ${one(Number(t.points)-Number(t.projected))} points hotter than forecast. The useful story is not that the projection was wrong; it is where the unexpected production came from and whether that role can repeat.`,
      `${full} treated its projection as a floor rather than a forecast, clearing it by ${one(Number(t.points)-Number(t.projected))}. The scoreboard against ${opp} tells us whether that eruption became useful or merely spectacular.`
    ],
    'projection-crater':[
      `${full} finished ${one(Math.abs(Number(t.points)-Number(t.projected)))} points under projection, and ${score} shows what that missing production cost. A forecast can be wrong; a lineup this far below expectation still demands names.`,
      `${score} came with ${full} leaving ${one(Math.abs(Number(t.points)-Number(t.projected)))} projected points somewhere between lineup lock and the final whistle. That gap is too large to dismiss as background noise.`,
      `${full} missed its projection by ${one(Math.abs(Number(t.points)-Number(t.projected)))} and made the final against ${opp} much harder than the pregame numbers suggested it needed to be.`
    ],
    'breakout-week':[
      `${full} came out of ${score} with at least one player forcing a new conversation about his weekly role. For ${full}, that is more interesting than a random spike: young-player production matters when opportunity grows with it.`,
      `${score} gave ${full} a result; the player-development story may last longer. One of the roster’s younger pieces just made the old expectation look suspiciously small.`,
      `${full} has a breakout argument to carry into next week after ${score}. One Sunday does not close the case, but it can absolutely change who gets the first question at practice.`
    ],
    'division-fight':[
      `${full} and ${opp} put a divisional result directly into the standings with ${score}. Those games age differently; the same final can reappear months later disguised as a tiebreaker problem.`,
      `${score} did double work because ${full} and ${opp} share a division. Somebody gained ground and somebody personally handed it over.`,
      `${full} played ${opp} for more than one Sunday’s satisfaction. ${score} moved two teams inside the same race at once.`
    ],
    win:[
      `${full} beat ${opp} ${score}, which is enough to make the week pleasant and not nearly enough to make it simple. The useful work starts with understanding what was repeatable.`,
      `${score} goes in the win column for ${full}. Everything after that is the job: separate the parts worth trusting from the parts that happened to survive.`,
      `${full} has the only argument that never needs a footnote — it beat ${opp} ${score}. Now the roster gets six days to decide whether the performance was a beginning or merely a good Sunday.`
    ],
    loss:[
      `${full} lost to ${opp} ${score}. The standings will reduce that to one letter; a decent column has to explain which parts of the roster actually earned it.`,
      `${score} leaves ${full} with a loss and several different levels of concern. Not every bad line deserves panic, but not every bad line gets to hide behind “one week” either.`,
      `${full} takes the loss, ${score}, and the irritating part is that the box score contains both legitimate excuses and legitimate warnings.`
    ]
  };
  const spine=keyedChoice(seed+':spine',spines[angle]||spines[Number(t.points)>Number(t.opponent_points)?'win':'loss']);
  const voiceLine=deskChoice(t,r,[
    [
      `I have seen enough ${full} Sundays to know the scoreboard is usually the easy part; deciding what deserves to survive into next week is harder.`,
      `One week has fooled better teams than ${full}. I’m keeping what looked real for ${full} and ignoring the urge to declare a season.`,
      `I trust the thing everyone will forget about ${full} by Thursday: role, usage and whether the good part can happen again.`
    ],
    [
      `I was promised elegance from ${full} and received fantasy football instead, which is how one learns to admire useful chaos.`,
      `I prefer elegance; around ${full}, the answer keeps arriving as group chats, questionable decisions and 30-point inconveniences.`,
      `The cruel thing about being right about ${full} for one Sunday is that the next Sunday arrives with no respect for your theory.`
    ],
    [
      `I WOULD LIKE ONE CALM ${full.toUpperCase()} WEEK. THE LEAGUE HAS DECLINED THE ${full.toUpperCase()} REQUEST. FINE.`,
      `RESTRAINT WAS CONSIDERED FOR ${full.toUpperCase()} AND REJECTED. THE ${full.toUpperCase()} SCOREBOARD STARTED IT.`,
      `I chase whoever ruined the ${full} group-chat mood first. This week, the ${full} trail is not subtle.`
    ],
    [
      `The ${full} evidence is cleaner than my coffee and, regrettably, harder to ignore.`,
      `I would love to invent a ${full} conspiracy here; the facts have been inconsiderate enough to make the simpler explanation more interesting.`,
      `I keep ${full} receipts because managers develop selective memory by Tuesday. I can live with being unpopular about ${full}.`
    ]
  ]);
  return spine+' '+voiceLine;
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
    [`The roster moved ${d>=0?'+':'−'}${amount} in tracked value this week. ${won?'A win lets that market move sit quietly beside actual football.':'A loss makes the market direction more interesting only if it keeps repeating.'} ${tx?'With '+tx+' completed moves in the background, the number belongs in the management conversation rather than on a trophy.':''}`],
    [`The market marked this roster ${d>=0?'up':'down'} ${amount}. Charming, but Sunday remains the less decorative judge; ${won?'the result gave the price move some company.':'the loss refused to let the balance sheet become the evening’s consolation prize.'}`],
    [`VALUE WATCH: ${d>=0?'up':'down'} ${amount}. I will happily weaponize that number in the group chat and then remember it still cannot set a lineup.`],
    [`The market file moved ${d>=0?'up':'down'} ${amount}. Useful corroboration, not eyewitness testimony; the roster still has to prove the direction on Sundays.`]
  ])];
}

function sentimentVoiceV28(t,r){
  const team=teamIdentityV28(t).mascot,manager=t.manager_name||'management',won=Number(t.points)>Number(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points));
  return deskChoice(t,r,[
    [
      `${team} fans earned ${won?'a Sunday worth replaying':'a loss worth complaining about'}, and the ${one(margin)}-point margin decides how long the emotional hangover lasts. I have covered enough call-in shows to know ${manager} will be a genius or a criminal by breakfast, with almost no middle ground available.`,
      `The town is ${won?'lighter':'irritated'} because ${team} gave it a ${won?'win':'loss'}, not because anyone suddenly became rational. ${manager} gets six days before the next result rewrites half of Monday’s certainty.`
    ],
    [
      `${team} supporters have reached the dangerous stage where emotion has dressed itself as analysis. ${won?'Winning makes every opinion look tailored.':`Losing makes every ${team} grievance arrive in evening wear.`} ${manager} may enjoy or endure the performance review accordingly.`,
      `Public opinion around ${team} is ${won?'briefly generous':'spectacularly ill-mannered'}, which is exactly what one should expect from people who scheduled their mood around a fantasy matchup. ${manager} remains invited to improve the décor next Sunday.`
    ],
    [
      `${team} WON${won?'':'— actually, no, that would have been nicer'}. ${won?'The group chat has become a municipal celebration and nobody is behaving responsibly.':`The group chat has skipped directly to the complaint department, and ${manager} should avoid searching his own name.`}`,
      `${team} fans are ${won?'one headline away from planning a parade':'one bad screenshot away from a fake eviction notice for '+manager}. This is irresponsible ${team} civic behavior and therefore exactly the material the back page was built for.`
    ],
    [
      `The ${team} public has already filed a preliminary verdict: ${won?'optimism with suspiciously little cross-examination':'frustration with an impressive quantity of screenshots'}. ${manager} should remember appeals reopen at kickoff.`,
      `${team} supporters have opinions, timestamps and almost no interest in procedural restraint. ${won?'The evidence is favorable this week.':'The evidence is hostile this week.'} ${manager} still gets another hearing.`
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
  const team=teamIdentityV28(t).mascot,m=t.mida_outlook,playoff=valid(m?.playoff)?Number(m.playoff):null,title=valid(m?.title)?Number(m.title):null,next=t.next_opponent_name||'the next opponent',
    gap=valid(t.next_projected)&&valid(t.next_opponent_projected)?Number(t.next_projected)-Number(t.next_opponent_projected):null;
  return deskChoice(t,r,[
    [`The larger ${team} assignment is simple: ${playoff!=null?'a '+one(playoff)+'% playoff outlook':'an unsettled playoff path'} means the game with ${next} is another chance to bank a result before the schedule starts charging interest. ${title!=null&&title>=5?`A ${one(title)}% title outlook raises the standard without changing the weekly job.`:''}`],
    [`For ${team}, ${playoff!=null?one(playoff)+'% playoff odds':'the still-unsettled playoff picture'} make ${next} more than a talking point: it is another game this roster is expected to handle seriously. ${gap!=null?`The ${one(Math.abs(gap))}-point projection gap sets the expectation; Sunday still decides whether it was deserved.`:''}`],
    [`THE ROAD-AHEAD HEADLINE FOR ${team.toUpperCase()}: ${next}. ${playoff!=null?'Playoff outlook '+one(playoff)+'%. ':''}${gap!=null?`Projection gap ${one(Math.abs(gap))}. `:''}Everything else is pregame content until the lineup earns the next result.`],
    [`The ${team} file carries ${playoff!=null?'a '+one(playoff)+'% playoff estimate':'an unsettled playoff estimate'} into ${next}. ${title!=null&&title>=5?`A ${one(title)}% title chance is ambition, not exoneration. `:''}The next result gets admitted before any larger conclusion does.`]
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
      [`The First Finding on ${id.mascot}`,`Scene Report: ${id.city}`,`What the Scoreboard Cannot Explain Alone`]
    ],
    players:[
      [`Why ${top?.name||'the Headliner'} Mattered`,`The Names Doing the Real Work`,`Stars, Support and the Missing Piece`],
      [`The Leading Men, Plus One Complaint`,`Who Looked Expensive in the Best Way`,`The Cast List Gets Reviewed`],
      [`PUT ${String(top?.name||'THE STAR').toUpperCase()} IN BIG TYPE`,`Heroes, Villains and People on Probation`,`Who Earned Tomorrow’s Photo`],
      [`People of Interest: ${top?.name||'The Headliner'} First`,`Witnesses, Cooperative and Otherwise`,`Names Circled Before Tuesday`]
    ],
    management:[
      [`What ${manager} Actually Owns`,`The Decisions That Survive Monday Morning`,`Front Office Notes Worth Keeping`],
      [`Management, Kindly Defend the Seating Chart`,`The Receipt Under the Good China`,`Front Office Taste, Reviewed`],
      [`${manager.toUpperCase()}, REPORT TO THE COMPLAINT DESK`,`Transactions, Lineups and Other Ways to Get Yelled At`,`The Managerial Headline Nobody Escapes`],
      [`Follow ${manager}’s Paper Trail`,`The Lineup Card Under Oath`,`Front Office Evidence`]
    ],
    value:[
      [`Market Page, in Its Proper Place`,`What the Number Changed — and Didn’t`,`The Price Tag in the Margin`],
      [`The Market, Since We Must`,`Roster Value in Evening Wear`,`A Number With Ambitions`],
      [`VALUE WATCH, SMALL FONT`,`The Decimals Are Yelling Again`,`Market Gossip With Guardrails`],
      [`Market Exhibit`,`What the Ledger Corroborates`,`Value History, Admitted as Evidence`]
    ],
    sentiment:[
      [`How ${id.city} Is Taking This`,`The Town Has Opinions`,`What Monday Feels Like`],
      [`Public Opinion, Unfortunately Invited`,`The Mood Outside the Velvet Rope`,`Emotions, Tastefully Unsupervised`],
      [`THE CITY HAS LOST PERSPECTIVE`,`What the Fans Are Yelling Now`,`Public Nuisance Report`],
      [`Statement From the Public`,`The Crowd Testifies`,`Public Record: ${id.mascot}`]
    ],
    'hot-seat':[
      [`The Uncomfortable Name: ${bad?.name||'TBD'}`,`Where Patience Gets Tested`,`One More Week Before Concern Grows`],
      [`The Chair Nobody Wants`,`An Unflattering Appointment`,`The Least Elegant Line on the Card`],
      [`HOT SEAT: NO HIDING`,`Today’s Complaint Has a Name`,`The Angry Font Finds a Target`],
      [`The Name Circled in Red`,`Primary Suspect for the Bad Feeling`,`A Provisional Finding`]
    ],
    'cool-throne':[
      [`Credit Where It’s Due`,`The Good Note in the Margin`,`A Sunday Worth Repeating`],
      [`The Good China Goes Here`,`A Tasteful Excess of Credit`,`The Chair With Better Upholstery`],
      [`COOL THRONE: PRINT IT BIG`,`Somebody Earned the Nice Headline`,`The Back Page Says Something Kind`],
      [`Positive Finding`,`The Cooperative Witness`,`Credit Survives Review`]
    ],
    outlook:[
      [`What ${next} Can Expose`,`The Road Gets Specific`,`Next Sunday Already Has Teeth`],
      [`Next Week’s Engagement: ${next}`,`The Next Appointment With Consequence`,`What Awaits Beyond the Velvet Rope`],
      [`NEXT HEADLINE: ${next}`,`Tomorrow’s Problem Has a Name`,`Who Are We Yelling About Next?`],
      [`Next File: ${next}`,`Unfinished Business`,`The Questions ${next} Gets to Answer`]
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
      `${p.name} already owns a star-level standard; another substantial Sunday from this ${playerContextLabelV33(p)} reinforces what the league already knew rather than creating a new category.`,
      `${p.name} came into the week with star status already earned. The performance confirms the expectation instead of introducing it.`,
      `${p.name} does not need breakout language. This is an established player adding another useful week to an existing résumé.`
    ],
    [
      `${p.name} arrived with star status already settled; for this ${playerContextLabelV33(p)}, the interesting question is how long this level remains routine, not whether a breakout has begun.`,
      `${p.name} is an established star, which makes the strong week confirmation rather than revelation.`,
      `${p.name} needed no discovery narrative before kickoff and needs none now. The performance belongs to an already accomplished player.`
    ],
    [
      `${p.name.toUpperCase()} WAS ALREADY A STAR. THIS WEEK ADDED A LOUD LINE; IT DID NOT INVENT THE PLAYER.`,
      `ESTABLISHED STAR, NOT BREAKOUT: ${p.name.toUpperCase()}. THE HEADLINE IS THE PERFORMANCE, NOT A FAKE ORIGIN STORY.`,
      `${p.name.toUpperCase()} DOES NOT NEED A BREAKOUT LABEL. ${p.name.toUpperCase()} NEEDED ANOTHER BIG SUNDAY, AND HE GOT ONE.`
    ],
    [
      `${p.name} entered with star status already supported by prior work; Sunday corroborates the ${playerContextLabelV33(p)} standard, making this confirmation and not a breakout investigation.`,
      `${p.name} belongs in the established-star category. ${p.name}’s week changes the current evidence, not the career classification.`,
      `${p.name} already had the résumé. This performance strengthens an existing finding rather than creating a new one.`
    ]
  ]);
  if(tr.kind==='breakout'||tr.kind==='early-breakout')return choose([
    [
      `${p.name} has earned breakout-watch attention because the role and production are rising together.`,
      `${p.name} is the young player worth tracking: the opportunity expanded and the production followed it.`,
      `${p.name} has moved beyond a random spike. The role is changing enough to justify a provisional breakout label.`
    ],
    [
      `${p.name} is the emerging name worth circling. The appeal is not youth by itself; it is a larger job producing a larger result.`,
      `${p.name} has made the old expectation look dated enough to deserve breakout-watch attention, though one should resist declaring the case closed.`,
      `${p.name} is beginning to outgrow last year’s description. The expanding workload is the persuasive part.`
    ],
    [
      `BREAKOUT WATCH: ${p.name.toUpperCase()}. THE JOB GOT BIGGER AND THE PRODUCTION CAME WITH IT.`,
      `${p.name.toUpperCase()} GETS THE BREAKOUT HEADLINE FOR NOW. ANOTHER WEEK OF THIS ROLE MAKES IT HARDER TO TAKE BACK.`,
      `YOUNG PLAYER, BIGGER ROLE, LOUDER RESULT: ${p.name.toUpperCase()} HAS EARNED ANOTHER LOOK.`
    ],
    [
      `${p.name} qualifies as an emerging player because workload and production moved together. The finding remains provisional.`,
      `${p.name} has enough changed-role evidence to justify breakout watch without pretending one week closes the inquiry.`,
      `${p.name} is an emerging case rather than an established conclusion; the larger workload is the evidence worth preserving.`
    ]
  ]);
  if(tr.kind==='rookie')return choose([
    [
      `Rookie ${p.name} gave the staff enough useful work to keep the role in next week’s conversation.`,
      `${p.name} is still a rookie, but Sunday gave the staff a reason to keep the door open.`,
      `The rookie note on ${p.name} is simple: the first useful role has been earned; the second still has to be.`
    ],
    [
      `Rookie ${p.name} made a respectable first claim on future work without requiring anyone to confuse promise with permanence.`,
      `${p.name} has one good rookie Sunday in hand. That earns attention, not mythology.`,
      `The rookie case for ${p.name} now has a real performance attached to it, which is more useful than projection and hope.`
    ],
    [
      `ROOKIE WATCH: ${p.name.toUpperCase()} GAVE US SOMETHING WORTH PRINTING AGAIN NEXT WEEK.`,
      `${p.name.toUpperCase()} HAS ONE ROOKIE SUNDAY WORTH YELLING ABOUT. EARN ANOTHER.`,
      `THE ROOKIE PAGE HAS A NAME: ${p.name.toUpperCase()}. NOW KEEP THE JOB.`
    ],
    [
      `Rookie ${p.name} has one useful exhibit. Another Sunday will tell us whether it deserves additional weight.`,
      `${p.name} has supplied the first credible rookie data point; the role now requires corroboration.`,
      `The rookie file on ${p.name} is no longer empty, which is meaningful without being conclusive.`
    ]
  ]);
  if(tr.kind==='decline')return choose([
    [
      `${p.name} is on fall-off watch because the multi-week drop has outgrown the phrase “slow start.”`,
      `${p.name} has been quiet for long enough that age and shrinking production belong in the same paragraph.`,
      `${p.name} no longer gets the old weekly floor by reputation alone. The decline has lasted long enough to require evidence in the other direction.`
    ],
    [
      `${p.name} has reached the veteran stage where decline has to be discussed plainly.`,
      `${p.name} is forcing a veteran conversation nobody enjoys writing: the old standard is showing up less often.`,
      `${p.name} has accumulated enough ordinary Sundays to make “temporary” a less convincing adjective.`
    ],
    [
      `FALL-OFF WATCH: ${p.name.toUpperCase()}. AGE PLUS REPEATED LIGHTER PRODUCTION IS NOT BACKGROUND NOISE ANYMORE.`,
      `${p.name.toUpperCase()} HAS USED UP THE “SLOW START” EXCUSE. THE NEXT SUNDAY NEEDS TO LOOK DIFFERENT.`,
      `VETERAN WARNING LABEL: ${p.name.toUpperCase()}. THE OLD FLOOR IS NO LONGER AUTOMATIC.`
    ],
    [
      `${p.name} has accumulated enough decline markers that the prior weekly floor cannot be presumed.`,
      `${p.name} now has a multi-week adverse pattern rather than an isolated poor exhibit.`,
      `${p.name} has moved from anomaly to monitored decline; the burden has shifted toward showing the old level still exists.`
    ]
  ]);
  if(tr.kind==='reliable')return choose([
    [
      `${p.name} remains a reliability story: familiar role, familiar output and very little Tuesday drama.`,
      `${p.name} keeps making the weekly decision easy. That kind of predictability is valuable precisely because it is boring.`,
      `${p.name} is giving the roster what it has learned to expect, which is often more useful than one spectacular outlier.`
    ],
    [
      `${p.name} keeps delivering the less glamorous luxury of predictability.`,
      `${p.name} is performing the difficult trick of making useful work look ordinary.`,
      `${p.name} continues to be reliably good, a condition columnists appreciate less than managers do.`
    ],
    [
      `RELIABLE: ${p.name.toUpperCase()}. NOT EVERY USEFUL PLAYER NEEDS A TRANSFORMATION ARC.`,
      `${p.name.toUpperCase()} DID THE BORING VALUABLE THING AGAIN. KEEP IT.`,
      `NO DRAMA REQUIRED FROM ${p.name.toUpperCase()}. THE JOB LOOKS THE SAME AND THE OUTPUT FOLLOWED.`
    ],
    [
      `${p.name} continues to corroborate the same weekly expectation, which is valuable because the role remains stable.`,
      `${p.name} supplies a repeatable baseline rather than a new theory.`,
      `${p.name} remains one of the cleaner weekly assumptions in the file.`
    ]
  ]);
  if(tr.kind==='stumble')return choose([
    [
      `${p.name} gets one bad week labeled as a stumble, not a trend.`,
      `${p.name} has enough prior work to earn patience for one ugly Sunday; another would change the tone.`,
      `${p.name} had a bad week. The longer résumé keeps it from becoming a larger conclusion yet.`
    ],
    [
      `${p.name} receives one week of restraint before the criticism gets sharper.`,
      `${p.name} has earned enough prior credit to make this an unpleasant footnote rather than a career review.`,
      `${p.name} gets one ugly Sunday without a dramatic rewrite. A second would be less defensible.`
    ],
    [
      `${p.name.toUpperCase()} GETS A MULLIGAN, NOT IMMUNITY.`,
      `ONE BAD WEEK FOR ${p.name.toUpperCase()}. DO IT AGAIN AND THE FONT GETS BIGGER.`,
      `${p.name.toUpperCase()} HAS ENOUGH HISTORY TO SURVIVE THIS ONE. NEXT WEEK IS NOT FREE.`
    ],
    [
      `${p.name} has one poor exhibit; the next one determines whether the category changes.`,
      `${p.name} has an adverse week, not yet an adverse pattern.`,
      `${p.name} retains the benefit of the larger sample for now; another poor result would materially change the file.`
    ]
  ]);
  return null;
}

function gameShapeV29(t,r,f=articleFrameV29(t,r)){
  const {won,top,second,third,share,margin}=f;if(!top)return null;
  const topClause=statClause(top),oppRows=(t.opponent_roster?.starters||t.opponent_roster?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),
    opp=oppRows[0],oppClause=opp?statClause(opp):null,support=[second,third].filter(Boolean).map(p=>p.name),pct=Math.round(share*100),
    team=teamIdentityV28(t).mascot,topWork=`${top.name} supplied ${one(top.points)} fantasy points`,
    oppWork=opp&&oppClause?`${opp.name} ${oppClause}`:null;
  if(!threeHighScorersV33(f)){
    const topShare=Number(t.points)>0?Math.round(Number(top.points)/Number(t.points)*100):0,bad=f.concerns?.find(p=>String(p.id)!==String(top.id));
    return deskChoice(t,r,[
      [
        [`${topWork}. That was the clearest ${team} player advantage${topShare>=28?', worth about '+topShare+'% of the team total':''}. ${won?'Nick credits the role and leaves the generic depth speech unwritten.':bad?bad.name+' is a more useful place to look for missing production than the players who actually delivered.':'The loss still belongs to the roster, not to its best individual line.'}`],
        [`${topWork}. ${won?'That is enough to explain the strongest part of the '+team+' win without pretending every secondary scorer was equally important.':'The individual line survives the '+team+' loss; the quieter slots do not inherit its credit.'}`]
      ],
      [
        [`${topWork}. ${won?'Bartholomew gives '+top.name+'’s '+String(top.position||'player')+' centerpiece its due in this '+resultShapeV33(f)+' review and declines to manufacture an ensemble from ordinary supporting lines.':'Lovely individual work, vulgar '+team+' result. '+(bad?bad.name+' gives the article a much less flattering counterpoint.':'The rest of the card gets no borrowed elegance.')}`],
        [`${topWork}. ${won?'The '+team+' win needs no decorative claim that everyone contributed equally.':'One strong line is not absolution for a losing card, however nicely tailored.'}`]
      ],
      [
        [`${topWork}. ${won?'That is the '+team+' headline. Everybody else can earn bigger type with a bigger game.':'The '+team+' loss does not belong on '+top.name+' just because his name is easiest to print.'}`],
        [`${topWork}. ${won?'Good '+String(top.position||'player')+' line from '+top.name+', good '+team+' result, no fake “team effort” slogan required.':'Credit the player, keep the complaint aimed at the parts of '+team+' that actually failed.'}`]
      ],
      [
        [`${topWork}. ${won?'That is the primary affirmative '+team+' finding; no broader depth conclusion is required by the evidence.':'The best individual exhibit remains favorable inside an adverse '+team+' result.'}`],
        [`${topWork}. ${won?'The favorable result is real without converting ordinary secondary production into a roster thesis.':'The team finding is negative; the player finding does not have to be.'}`]
      ]
    ]);
  }
  if(voice(r)===0){
    if(won)return keyedChoice(`${t.roster_id}:nick-win-shape`,[`${topWork}. ${naturalJoin(support)||'The supporting lineup'} kept ${team} from asking one player to do everything. The leading three scorers supplied about ${pct}% of the total${pct>=75?', concentrated enough that Nick will watch how the workload spreads next week':''}. ${oppWork?`${oppWork}, so the win came against an opponent that produced a legitimate counterpunch.`:''}`.trim(),`${topWork}. Behind him, ${naturalJoin(support)||'the rest of the lineup'} gave ${team} enough real help to make the result look repeatable rather than accidental. About ${pct}% came from the first three scorers${pct>=75?', which still leaves Nick watching the lower half of the lineup':''}. ${oppWork?`${oppWork}; the opponent supplied an actual answer and ${team} survived it.`:''}`.trim(),`${team} did not win on one isolated eruption. ${topWork}, while ${naturalJoin(support)||'the supporting cast'} supplied the next layer. The first three scorers owned about ${pct}% of the total${pct>=75?', a useful warning against calling the lineup balanced just yet':''}.`]);
    return `${topWork}, but ${team} still lost by ${one(margin)}. The leading three scorers accounted for about ${pct}% of the total${pct>=70?', which puts the missing production outside that core at the center of the postgame story':''}. ${oppWork?`${oppWork}; ${t.opponent_name} found the stronger answer.`:''}`.trim();
  }
  if(voice(r)===1){
    if(won)return keyedChoice(`${t.roster_id}:bart-win-shape`,[`${topWork}, the strongest individual football of the afternoon. ${naturalJoin(support)||'The supporting cast'} kept the performance from becoming a one-man vanity project. Roughly ${pct}% of the scoring belonged to the first three scorers; even a winning lineup this concentrated gives Bartholomew a reason to inspect the quieter spots next week.`,`${topWork}. ${naturalJoin(support)||'The supporting cast'} provided enough company to keep ${team} from becoming a monologue. Those three names accounted for about ${pct}% of the scoring, an attractive arrangement until one remembers that Sunday eventually removes a chair.`,`The most tasteful line belonged to ${top.name}: ${topClause||'the best verified role on the roster'}. ${naturalJoin(support)||'The rest of the card'} made the ${team} win feel like an ensemble rather than an expensive solo, though ${pct}% of the score still lived near the top.`]);
    return keyedChoice(`${t.roster_id}:bart-loss-shape`,[`${topWork}, and the individual line remains excellent even though ${team} lost. About ${pct}% of the scoring came from the top three names; losing with that much useful work near the top makes the emptier lineup spots much harder to excuse.`,`${topWork}. One should admire the line without confusing it for absolution: ${team} still lost, and roughly ${pct}% of the scoring sat with three names. The empty chairs are therefore not difficult to locate.`,`${top.name} gave ${team} genuinely good football — ${topClause||'the strongest verified role on the roster'} — and received a loss for his trouble. With about ${pct}% of the scoring supplied by three players, Bartholomew has little reason to flatter the rest of the card.`]);
  }
  if(voice(r)===2){
    if(won)return `${top.name.toUpperCase()} GOT THE BIG TYPE: ${topClause||'the loudest work on the roster'}. ${naturalJoin(support)||'The rest of the lineup'} supplied enough backup to turn the star performance into an actual ${team} win instead of a very expensive consolation prize.`;
    return keyedChoice(`${t.roster_id}:tilly-loss-shape`,[`${top.name.toUpperCase()} DID HIS PART: ${topClause||'the strongest line on the roster'}. ${team} LOST ANYWAY. When roughly ${pct}% of the scoring comes from three players and the final still lands on the wrong side, Tilly starts looking below the stars for the missing pages.`,`DO NOT PUT THIS LOSS ON ${top.name.toUpperCase()}: ${topClause||'he supplied the best line on the team'}. ${team.toUpperCase()} STILL LOST, AND ABOUT ${pct}% OF THE SCORE CAME FROM THREE NAMES. THE REST OF THE PAGE NEEDS AN EXPLANATION.`,`${top.name.toUpperCase()} BROUGHT THE HEADLINE; ${team.toUpperCase()} BROUGHT THE LOSS. THREE PLAYERS OWNED ABOUT ${pct}% OF THE SCORE, SO TILLY DOES NOT NEED BINOCULARS TO FIND THE QUIET PARTS.`]);
  }
  if(won)return `${topWork}, the cleanest affirmative exhibit on the roster. ${naturalJoin(support)||'The supporting cast'} corroborated enough of it for ${team} to turn production into a win. The top three owned about ${pct}% of the total; the distribution gets another look next week, but the favorable verdict is real.`;
  return keyedChoice(`${t.roster_id}:filch-loss-shape`,[`${topWork}, the strongest affirmative exhibit on the roster, and ${team} still lost. With about ${pct}% of the total coming from the leading three scorers, the contradiction is useful: several players did their jobs, which narrows the search for where the loss was actually built.`,`${topWork}. That clears ${top.name} of being the primary problem, not ${team} of the loss. Roughly ${pct}% of the scoring came from three players, leaving a smaller and more useful set of places to investigate.`,`The cleanest ${team} evidence belongs to ${top.name}: ${topClause||'the strongest verified role on the roster'}. A loss still followed. When three players produce about ${pct}% of the total, Filch does not need to accuse everybody; the weak spots have already narrowed themselves.`]);
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
      `PUT ${top.name} IN BIG TYPE: ${one(top.points)} FANTASY POINTS. ${topFootball}`,
      `${top.name} GETS THE PHOTO: ${one(top.points)} FANTASY POINTS. ${topFootball}`,
      `THE ${team.toUpperCase()} HEADLINER IS ${top.name}: ${one(top.points)} FANTASY POINTS. ${topFootball}`
    ],
    [
      `${top.name} is the primary affirmative player finding after ${one(top.points)} fantasy points. ${topFootball}`,
      `${top.name} left the cleanest individual evidence in the ${team} article, producing ${one(top.points)} fantasy points. ${topFootball}`,
      `${top.name} is the first player Filch would keep in the weekly file: ${one(top.points)} fantasy points. ${topFootball}`,
      `The cleanest affirmative player exhibit is ${top.name}, whose ${one(top.points)} fantasy points came with enough football underneath them to survive review. ${topFootball}`,
      `Filch starts the player record with ${top.name}. The fantasy return was ${one(top.points)}, and the underlying role gives the number admissible weight. ${topFootball}`,
      `${one(top.points)} fantasy points put ${top.name} on the favorable side of the weekly file. ${topFootball}`
    ]
  ][v];
  const topStatusText=classificationSentenceV29(top,topStatus,r)||keyedChoice(`${t.roster_id}:top-status-fallback:${r?.id}`,[
    [
      `${top.name}’s ${String(top.position||'player')} workload gives this ${resultShapeV33(f)} performance enough substance to carry into next week.`,
      `Nick keeps ${top.name} in the next-week file because the ${playerContextLabelV33(top)} role survived a ${resultShapeV33(f)} result with something repeatable underneath it.`,
      `For ${top.name}, the useful carryover from this ${resultShapeV33(f)} is the ${String(top.position||'player')} job itself rather than the fantasy total.`
    ],
    [
      `The football under ${top.name}’s fantasy total is the part Bartholomew keeps from this ${resultShapeV33(f)}.`,
      `${top.name} leaves this ${resultShapeV33(f)} with a ${playerContextLabelV33(top)} role worth another inspection.`,
      `Bartholomew’s useful note on ${top.name} is the ${String(top.position||'player')} workload that survived the scoreboard.`
    ],
    [
      `${top.name} earned the headline with the ${String(top.position||'player')} role, not just the number from this ${resultShapeV33(f)}.`,
      `Tilly keeps ${top.name} on the page because this ${playerContextLabelV33(top)} job has something worth checking again.`,
      `The useful sequel for ${top.name} is the same ${String(top.position||'player')} role after this ${resultShapeV33(f)}.`
    ],
    [
      `${top.name}’s ${String(top.position||'player')} role keeps the ${resultShapeV33(f)} performance relevant after the fantasy total is filed away.`,
      `Filch carries ${top.name} forward because the ${playerContextLabelV33(top)} role remains a testable exhibit after this ${resultShapeV33(f)}.`,
      `The next ${top.name} finding depends on whether this ${String(top.position||'player')} workload recurs after a ${resultShapeV33(f)}.`
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
      won?`${top.name} had proper company. Bartholomew can praise the star without pretending the rest of ${team} vanished.`:`Good supporting work survived inside the ${team} loss, which makes the empty spots more difficult to excuse.`,
      won?keyedChoice(`${t.roster_id}:tilly-support-win`,[`THE ${team.toUpperCase()} SUPPORTING CAST EARNED INK TOO. ${top.name.toUpperCase()} DID NOT HAVE TO DO ALL THE YELLING.`,`THE ${team.toUpperCase()} WIN HAD MORE THAN ONE BYLINE. ${top.name.toUpperCase()} GOT HELP, WHICH IS HOW TEAMS AVOID TURNING EVERY SUNDAY INTO A RESCUE MISSION.`,`THE BIG TYPE BELONGED TO ${top.name.toUpperCase()}, BUT THE REST OF ${team.toUpperCase()} DID ENOUGH TO KEEP THIS FROM BECOMING A SOLO ACT.`]):`GOOD ${team.toUpperCase()} PERFORMANCES DO NOT ACQUIT THE LINEUP; THEY MAKE THE MISSING PRODUCTION EASIER TO FIND.`,
      won?`The ${team} file contains multiple affirmative performances, enough to support the favorable result.`:`The ${team} loss cannot be assigned equally across the roster; these performances narrow the adverse finding.`
    ][v];
    ps.push(`${notes.join(' ')} ${close}`);
  }else if(other.length){
    const p=other.find(x=>{const d=delta(x),tr=f.trajectories.find(y=>String(y.p.id)===String(x.id))?.tr;return Number(x.points)>=15||(d!=null&&Math.abs(d)>=5)||(tr&&['breakout','early-breakout','decline','stumble','rookie'].includes(tr.kind));});
    if(p){
      const c=statClause(p),tr=f.trajectories.find(x=>String(x.p.id)===String(p.id))?.tr,status=tr?classificationSentenceV29(p,tr,r):null,insight=playerStatInsightV33(t,p,r);
      const lead=`${p.name}${c?` ${c}`:` produced ${one(p.points)} fantasy points`}.`;
      const judgment=[
        `${p.name} earns a second paragraph because the line was individually relevant; Nick is not using it to declare the whole roster balanced.`,
        `${p.name} earns separate praise or criticism on the merits; in this ${resultShapeV33(f)} review, Bartholomew declines to turn one ${String(p.position||'player')} line into a sweeping depth theory.`,
        `${p.name} earned the extra ink in this ${resultShapeV33(f)} review; that ${String(p.position||'player')} line is the analysis, and nobody needs a fake “team effort” slogan stapled to it.`,
        `${p.name} is independently relevant to the ${team} ${resultShapeV33(f)} file; one ${String(p.position||'player')} performance does not establish a broader depth finding.`
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
      `THE NAME IN RED IS ${bad.name}: ${one(d)} BELOW PROJECTION${c?`; ${bad.name} ${c}`:''}. ${won?'THE SCOREBOARD HID THE DAMAGE THIS TIME.':'THE SCOREBOARD PUT A SPOTLIGHT ON IT.'}${status?` ${status}`:''}`,
      `${bad.name} is the adverse player finding, ${one(d)} points below projection${c?`; ${bad.name} ${c}`:''}. ${won?`${team} won despite the shortfall; that is mitigation rather than exoneration.`:`The ${team} loss gives ${bad.name}’s shortfall direct consequence.`}${status?` ${status}`:''}`
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
      `THE BIG TYPE BELONGS TO ${top.name.toUpperCase()}. ${team.toUpperCase()} NEEDS ANOTHER NAME FIGHTING FOR IT NEXT WEEK.`,
      `${top.name.toUpperCase()} WON THE PHOTO. THE REST OF ${team.toUpperCase()} SHOULD FIGHT FOR THE FRAME NEXT TIME.`
    ],
    [
      `${top.name} remains the primary affirmative finding for ${team}; another corroborating performance would make the roster case stronger.`,
      `${top.name} is the cleanest ${team} evidence. The next useful development is a second player forcing equal attention.`,
      `${top.name} carries the strongest player finding. Filch would prefer the next file to contain more than one obvious affirmative exhibit.`
    ]
  ][v];
  while(ps.length<4)ps.push(teamPlayerExtraV33(t,r,f,ps.length));
  const editorial=playerEditorialReadV32(t,r,f);if(editorial)ps.push(editorial);
  return ps.slice(0,4);
}

function coolThroneV29(t,r,f=articleFrameV29(t,r)){
  const candidates=f.rows.filter(p=>{
    const pts=Number(p.points),d=delta(p),prior=Number(p.prior_season_avg);
    return Number.isFinite(pts)&&(pts>=15||(d!=null&&d>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
  }).slice(0,2);
  if(!candidates.length)return ['n/a'];
  const names=candidates.map(p=>p.name),team=teamIdentityV28(t).mascot;
  if(voice(r)===0)return [keyedChoice(`${t.roster_id}:cool-nick`,[`${names[0]} gets Nick’s first Cool Throne mention${names[1]?`, with ${names[1]} earning space beside him`:''}. ${f.won?`${team} needed that good football to make the win sturdier.`:`The loss does not erase those performances; Nick keeps them out of the blame column.`}`,`Credit starts with ${names[0]}${names[1]?` and extends to ${names[1]}`:''}. ${f.won?`Those were the ${team} performances most worth preserving from the win.`:`They were the useful parts of an otherwise losing ${team} Sunday.`}`,`Nick’s positive margin note belongs to ${naturalJoin(names)}. ${f.won?`The ${team} win had more than one dependable piece.`:`The team lost; these players did not.`}`])];
  if(voice(r)===1)return [keyedChoice(`${t.roster_id}:cool-bart`,[`${names[0]} receives the best chair${names[1]?`; ${names[1]} may sit nearby without embarrassing the furniture`:''}. ${f.won?`Bartholomew can be generous after a ${team} win without becoming sentimental.`:`The ${team} loss still leaves room for properly dressed praise.`}`,`The good china goes first to ${names[0]}${names[1]?`, with ${names[1]} invited to the same table`:''}. ${f.won?`At least the ${team} victory produced more than one performance worth admiring.`:`A ${team} loss can be ugly without requiring every individual performance to be.`}`,`Bartholomew’s favorable review names ${naturalJoin(names)}. ${f.won?`Winning makes the compliments easier; the football makes them deserved.`:`The final score was vulgar. These performances were not.`}`])];
  if(voice(r)===2)return [keyedChoice(`${t.roster_id}:cool-tilly`,[`COOL THRONE: ${names.join(' AND ').toUpperCase()}. ${f.won?`${team.toUpperCase()} HAD MORE THAN ONE REASON TO ENJOY THE SCOREBOARD.`:`THE ${team.toUpperCase()} RESULT WAS UGLY; THESE PERFORMANCES WERE NOT.`}`,`GOOD NEWS, WHICH TILLY RESENTS HAVING TO TYPE: ${names.join(', ').toUpperCase()}. ${f.won?'THEY HELPED BUILD THE WIN.':'THEY ARE EXEMPT FROM THE MAIN COMPLAINT.'}`,`PUT ${names.join(' / ').toUpperCase()} ON THE NICE SIDE OF THE PAGE. ${f.won?`THE ${team.toUpperCase()} WIN HAD MULTIPLE CONTRIBUTORS.`:`THE LOSS DOES NOT GET TO STEAL THEIR CREDIT.`}`])];
  const finding=names.length===1?'That performance belongs':'Those performances belong';
  return [keyedChoice(`${t.roster_id}:cool-filch`,[`Positive finding: ${naturalJoin(names)} ${names.length===1?'earns':'earn'} Cool Throne recognition. ${f.won?'Their work supported the favorable result.':`${finding} on the favorable side of an otherwise adverse ${team} week.`}`,`Filch enters ${naturalJoin(names)} on the affirmative side of the weekly record. ${f.won?'The win corroborates the recognition.':'The loss changes the team finding, not these individual ones.'}`,`The favorable player exhibits are ${naturalJoin(names)}. ${f.won?'Multiple good performances support the result.':`For ${team}, they narrow the loss rather than disappear inside it.`}`])];
}

function hotSeatV29(t,r,f=articleFrameV29(t,r)){
  const candidates=f.concerns.slice(0,2);if(!candidates.length)return ['n/a'];
  const names=candidates.map(p=>p.name),team=teamIdentityV28(t).mascot,won=f.won;
  return [[
    keyedChoice(`${t.roster_id}:hot-nick`,[`${names[0]} gets Nick’s uncomfortable chair${names[1]?`, and ${names[1]} is close enough to feel the heat`:''}. ${won?`${team} won, so the concern gets another week before it grows teeth.`:`${team} lost, so those quiet spots already belong in the explanation.`}`,`Nick’s least comfortable note belongs to ${naturalJoin(names)}. ${won?'A win buys proportion, not amnesia.':`The ${team} loss gives the shortfall immediate consequence.`}`,`The names Nick circles in red are ${naturalJoin(names)}. ${won?'Nothing here needs a panic button yet; repetition would change that.':`The ${team} scoreboard removed the luxury of calling these misses harmless.`}`])
  ],[
    ([`${names[0]} takes the uncomfortable chair${names[1]?`, with ${names[1]} joining the less fashionable side of the room`:''}. ${won?'The win permits manners without requiring forgetfulness.':`The ${team} loss makes those performances impossible to hide behind better tailoring.`}`,`Bartholomew’s unflattering appointments go to ${naturalJoin(names)}. ${won?`A ${team} win keeps the review civilized for a week.`:'Losing removes several layers of polite upholstery.'}`,`No good seating is available for ${naturalJoin(names)} this week. ${won?`The ${team} win softens the criticism; it does not improve the individual lines.`:`The result was already bad enough without pretending these performances were decorative.`}`,`${naturalJoin(names)} receive the least flattering Bartholomew review this week. ${won?'A win keeps the prose polite; the individual work still deserves criticism.':`The ${team} loss supplies enough vulgarity without dressing these lines up.`}`,`The velvet rope closes early for ${naturalJoin(names)}. ${won?'Bartholomew can acknowledge the win and still object to these performances.':`The ${team} loss already has enough evidence; these names merely add emphasis.`}`][Math.abs(Number(t.roster_id)||0)%5])
  ],[
    keyedChoice(`${t.roster_id}:hot-tilly`,[`HOT SEAT — THE UNCOMFORTABLE CHAIR: ${names.join(' / ').toUpperCase()}. ${won?`THE ${team.toUpperCase()} WIN HID SOME SMOKE; IT DID NOT PUT OUT THE FIRE.`:`THE ${team.toUpperCase()} LOSS MADE THE SMOKE IMPOSSIBLE TO IGNORE.`}`,`ANGRY FONT FOR ${names.join(', ').toUpperCase()}. ${won?'THE TEAM WON, SO THIS IS A WARNING LABEL.':'THE TEAM LOST, SO THIS IS PART OF THE CRIME SCENE.'}`,`TODAY’S COMPLAINT DESK FEATURES ${names.join(' AND ').toUpperCase()}. ${won?'ONE WIN OF COVER. NO MORE.':'NO COVER AT ALL AFTER THAT LOSS.'}`])
  ],[
    keyedChoice(`${t.roster_id}:hot-filch`,[`${naturalJoin(names)} ${names.length===1?'occupies':'occupy'} the uncomfortable chair this week. ${won?`${team} won despite the shortfall; that is mitigation, not exoneration.`:`The ${team} loss gives the shortfall immediate consequence.`}`,`Filch marks ${naturalJoin(names)} as the adverse player findings. ${won?'The favorable team verdict limits the damage without erasing it.':'The losing result corroborates the concern.'}`,`The negative player evidence points first to ${naturalJoin(names)}. ${won?'The win prevents overcharging the case.':'The loss keeps those performances in the causal file.'}`])
  ]][voice(r)];
}

function ledeConsequenceV29(t,r,f=articleFrameV29(t,r)){
  const team=teamIdentityV28(t).mascot,rec=record(t),rank=Number.isFinite(f.rank)?`rank ${f.rank} of ${f.size}`:'an unsettled place in the table',p=f.playoff,high=p!=null&&p>=70,low=p!=null&&p<25;
  if(voice(r)===0){
    if(f.won)return keyedChoice(`${t.roster_id}:nick-win-record`,[`The record for ${team} is ${rec}, ${rank}. ${p!=null?`A ${one(p)}% playoff outlook gives the win context without making it proof of anything.`:'One win is useful evidence, not a season verdict.'}`,`${team} leaves the week ${rec}, ${rank}. ${p!=null?`The ${one(p)}% playoff outlook says the result helped the case without settling it.`:'The standings contain one favorable result and plenty of unanswered season.'}`,`Put ${rec} beside ${team} and ${rank} beside the record. ${p!=null?`At ${one(p)}% for the playoffs, Nick sees context rather than permission to declare anything finished.`:'The first win belongs in the notebook, not on a banner.'}`]);
    if(high)return `The record for ${team} is ${rec}, ${rank}. A ${one(p)}% playoff outlook still treats this roster like a contender; the loss does not remove that status, it simply burns some of the margin for error that status was supposed to provide.`;
    return `The record for ${team} is ${rec}, ${rank}. ${low?`With the playoff outlook around ${one(p)}%, wasting a week is expensive.`:'The loss narrows the room for another ordinary mistake.'}`;
  }
  if(voice(r)===1){
    if(f.won)return keyedChoice(`${t.roster_id}:bart-win-record`,[`${rec} is the early ${team} record, ${rank}. ${p!=null?`The ${one(p)}% playoff outlook says the win met an existing expectation instead of inventing one.`:'The result deserves credit without pretending one week settled anything.'}`,`The table gives ${team} ${rec}, ${rank}. ${p!=null?`At ${one(p)}% for the playoffs, the victory looks more like competent housekeeping than revelation.`:'A single win is attractive enough without pretending it is heirloom furniture.'}`,`${team} wears a ${rec} record, ${rank}. ${p!=null?`The ${one(p)}% playoff outlook was already inviting ambition; the win merely arrived dressed appropriately.`:'Bartholomew accepts the result and declines the coronation.'}`]);
    if(high)return `The record beside ${team} is ${rec}, ${rank}, and the ${one(p)}% playoff outlook still treats this roster like a contender. The loss does not remove that status; it makes wasting a favorable week look considerably more careless.`;
    return `The record beside ${team} is ${rec}, ${rank}. ${p!=null?`A ${one(p)}% playoff outlook makes the loss ${low?'expensive':'annoying'}, not transformative.`:'The table is young, but the loss is already real.'}`;
  }
  if(voice(r)===2){
    if(f.won)return `PRINT THE RECORD: ${rec} FOR ${team.toUpperCase()}, ${rank.toUpperCase()}. ${p!=null?`PLAYOFF OUTLOOK: ${one(p)}%. ENJOY THE ${team.toUpperCase()} WIN AND KEEP THE PARADE PERMIT IN THE DRAWER.`:'THE GROUP CHAT GETS ONE WEEK OF LEGAL OPTIMISM.'}`;
    if(high)return `THE PAPER STILL TREATS ${team.toUpperCase()} LIKE A CONTENDER — ${one(p)}% PLAYOFF OUTLOOK — AND THAT IS WHY THIS LOSS IS SO ANNOYING. GOOD ROSTERS ARE NOT SUPPOSED TO DONATE COMFORTABLE OPPORTUNITIES.`;
    return `${rec.toUpperCase()} FOR ${team.toUpperCase()}, ${rank.toUpperCase()}. ${p!=null?`THE ${one(p)}% PLAYOFF OUTLOOK LEAVES ${low?'VERY LITTLE':'SOME'} ROOM TO KEEP DOING THIS.`:'THE COMPLAINT DESK OPENS EARLY AFTER A LOSS.'}`;
  }
  if(f.won)return `The formal record for ${team} is ${rec}, ${rank}. ${p!=null?`A ${one(p)}% playoff estimate corroborates the expectation already attached to the roster; one win did not create it.`:'The win enters as one favorable exhibit.'}`;
  if(high)return `The formal record for ${team} is ${rec}, ${rank}. A ${one(p)}% playoff estimate remains favorable, so the loss is not disqualifying; it is an avoidable adverse exhibit inside a still-strong case.`;
  return `The formal record for ${team} is ${rec}, ${rank}. ${p!=null?`The ${one(p)}% playoff estimate gives the loss its proper weight without exaggerating it.`:'The loss is one adverse exhibit, and the next result determines whether it gains company.'}`;
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
      `${miss.reserve.name} could legally have replaced ${miss.starter.name} at ${slot} and added about ${one(gap)} points. ${wouldFlip?'That swing was large enough to change the result, which makes the decision part of the loss.':f.won?`${team} won anyway, but the legal alternative still belongs in ${manager}’s next-week preparation.`:`${manager} still owns the lineup mistake, but ${miss.reserve.name}’s extra points would not have erased the ${team} loss.`}`,
      `${miss.reserve.name} was a legal ${slot} alternative to ${miss.starter.name}, worth roughly ${one(gap)} more points. ${wouldFlip?'That is the rare Monday complaint with enough arithmetic to alter the final.':f.won?`The ${team} win keeps ${manager}’s error from becoming the headline; it does not make the decision disappear.`:'Even the better lineup would not have saved the night, which keeps the criticism proportional.'}`,
      `LINEUP RECEIPT: ${miss.reserve.name} OVER ${miss.starter.name} AT ${String(slot).toUpperCase()} WAS LEGAL AND WORTH ABOUT ${one(gap)}. ${wouldFlip?'THAT COULD HAVE FLIPPED THE GAME.':f.won?`THE ${team.toUpperCase()} WIN HID THE LINEUP MISS; ${manager.toUpperCase()} MAY NOT GET THAT COVER NEXT TIME.`:'IT WOULD NOT HAVE FIXED THE WHOLE LOSS, SO DO NOT BLAME ONE BUTTON FOR THE FIRE.'}`,
      `${miss.reserve.name} over ${miss.starter.name} at ${slot} was an admissible alternative worth about ${one(gap)} points. ${wouldFlip?'The counterfactual crosses the final margin, so the management decision belongs in the causal record.':f.won?`The favorable ${team} verdict does not erase ${manager}’s lineup discrepancy.`:`${manager}’s discrepancy is real but smaller than the ${team} losing margin, so it cannot carry the entire case.`}`
    ][v]);
  }
  const thread=articleThreadV30(t,r,f,'management');
  if(thread&&ps.length<2)ps.push(thread);
  if(!ps.length)ps.push([
    `${manager} did not create a material transaction or legal lineup controversy for ${team} this week. That is not praise so much as the absence of an avoidable second story.`,
    `${manager} left Bartholomew without a substantial ${team} front-office grievance. That is a quiet form of competence, which may be the nicest thing written here all week.`,
    `NO ${team.toUpperCase()} MANAGEMENT SIREN THIS WEEK. THE PLAYERS PRODUCED ENOUGH MATERIAL WITHOUT HELP FROM THE FRONT OFFICE.`,
    `No material ${team} transaction or eligible lineup mistake clears the threshold for a management charge this week.`
  ][v]);
  if(ps.length<2)ps.push([
    `${manager} still has a follow-up assignment: preserve what worked for ${team}, correct what did not, and avoid turning one manageable issue into a repeatable one.`,
    `${manager} gets a second note because ${team} now has a real Sunday to learn from. Fix the obvious weakness before it earns a larger column.`,
    `${manager.toUpperCase()} GETS ONE MORE LINE: KEEP THE USEFUL ${team.toUpperCase()} DECISIONS, FIX THE OBVIOUS ONE, AND DO NOT MAKE THIS PAPER RECYCLE THE COMPLAINT NEXT WEEK.`,
    `${manager} leaves the ${team} management section with a follow-up obligation rather than a verdict; the next lineup will show whether Week 1 changed any decisions.`
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
    const forecast=gap==null?'The projection is incomplete.':Math.abs(gap)<6?`Only ${one(Math.abs(gap))} projected points separate the teams.`:gap>0?`The projected edge belongs to ${t.team_name}.`:`The projected edge belongs to ${opp}.`;
    return `Next comes ${opp}${recText?` at ${recText}`:''}. ${starText} ${depthText||''} ${forecast} ${f.won?`Nick will be watching whether the habits that produced the ${t.team_name} win travel.`:gap>0?'After a loss, being favored turns this into a game '+t.team_name+' cannot afford to donate.':'After a loss, the assignment is to produce a response without asking the schedule for mercy.'}`.trim();
  }
  if(voice(r)===1){
    const forecast=gap==null?'The projection offers no clean edge yet.':Math.abs(gap)<6?`The projection is nearly even, which leaves very little room for a casual mistake.`:gap>0?`The forecast favors ${t.team_name}.`:`The forecast favors ${opp}.`;
    return `The next assignment is ${opp}${recText?`, currently ${recText}`:''}. ${starText} ${depthText||''} ${forecast} ${f.won?`Bartholomew wants to see whether the winning ${t.team_name} version survives a different matchup.`:`${t.team_name} carries too much expectation to let the next game become another explanatory column.`}`.trim();
  }
  if(voice(r)===2){
    const forecast=gap==null?'NO CLEAN PROJECTION YET. EXCELLENT.':Math.abs(gap)<6?`ONLY ${one(Math.abs(gap))} PROJECTED POINTS SEPARATE THEM.`:gap>0?`THE FORECAST LIKES ${t.team_name.toUpperCase()}.`:`THE FORECAST LIKES ${String(opp).toUpperCase()}.`;
    return `NEXT WEEK: ${opp.toUpperCase()}${recText?` (${recText})`:''}. ${starText} ${depthText||''} ${forecast} ${f.won?'PROVE THE WIN TRAVELS.':'THE RESPONSE GAME HAS ARRIVED.'}`.trim();
  }
  const forecast=gap==null?'No complete projection comparison has entered the file.':Math.abs(gap)<6?`The projection gap is only ${one(Math.abs(gap))} points.`:gap>0?`The paper forecast favors ${t.team_name}.`:`The paper forecast favors ${opp}.`;
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
  const outcomes=rivals.map(x=>{
    const result=Number(x.points)>Number(x.opponent_points)?'won':Number(x.points)<Number(x.opponent_points)?'lost':'tied';
    return `${x.team_name} ${result}`;
  }),winners=rivals.filter(x=>Number(x.points)>Number(x.opponent_points)).map(x=>x.team_name),losers=rivals.filter(x=>Number(x.points)<Number(x.opponent_points)).map(x=>x.team_name),
    team=teamIdentityV28(t).mascot,division=t.division_name||'the division',summary=naturalJoin(outcomes);
  if(voice(r)===0)return `Elsewhere in ${division}, ${summary}. ${f.won?(losers.length?`${team} gained at least a little room on ${naturalJoin(losers)} while still having to keep pace with ${naturalJoin(winners)}.`:`${team} won but received no free separation from the rest of the division.`):(winners.length?`The ${team} loss cost extra ground because ${naturalJoin(winners)} also won${losers.length?`, although ${naturalJoin(losers)} kept the damage from becoming universal`:''}.`:`${naturalJoin(losers)} lost too, limiting the damage without improving the ${team} result.`)}`;
  if(voice(r)===1)return `The divisional table was not idle: ${summary}. ${f.won?(losers.length?`${team} may enjoy gaining ground on ${naturalJoin(losers)}, though ${winners.length?naturalJoin(winners)+' declined to provide any additional courtesy':'the rest of the room offered unusual cooperation'}.`:`The ${team} win kept pace without receiving much decorative assistance.`):(winners.length?`${naturalJoin(winners)} made the ${team} defeat more expensive; ${losers.length?naturalJoin(losers)+' at least had the manners to lose too.':'nobody else volunteered relief.'}`:`${naturalJoin(losers)} supplied some relief, which is kinder than the ${team} performance deserved.`)}`;
  if(voice(r)===2)return `DIVISION SCOREBOARD: ${summary}. ${f.won?(losers.length?`${team.toUpperCase()} GAINED GROUND ON ${naturalJoin(losers)}${winners.length?`, WHILE ${naturalJoin(winners)} KEPT WINNING TOO`:''}.`:`THE ${team.toUpperCase()} WIN KEPT THE RACE MOVING WITHOUT ANY FREE GIFTS.`):(winners.length?`${naturalJoin(winners)} MADE THE ${team.toUpperCase()} LOSS HURT MORE${losers.length?`; ${naturalJoin(losers)} AT LEAST LOST TOO`:''}.`:`${naturalJoin(losers)} LOST TOO. THANK THEM FOR THE SMALL FAVOR AND FIX THE ${team.toUpperCase()} PROBLEM.`)}`;
  return `Division evidence: ${summary}. ${f.won?(losers.length?`The favorable ${team} result gained ground on ${naturalJoin(losers)}${winners.length?`, while ${naturalJoin(winners)} preserved pressure at the top`:''}.`:`The ${team} win preserved position without creating meaningful separation.`):(winners.length?`The adverse ${team} result became more costly when ${naturalJoin(winners)} also won${losers.length?`; losses by ${naturalJoin(losers)} partially limited the damage`:''}.`:`Losses by ${naturalJoin(losers)} limited the divisional damage but do not alter the ${team} finding.`)}`;
}

function outlookStoryV29(t,r,f=articleFrameV29(t,r)){
  const team=teamIdentityV28(t).mascot,next=t.next_opponent_name||'the next opponent',schedule=scheduleSignificanceV29(t,r,f),broader=outlookStakesV28(t,r),
    thread=articleThreadV30(t,r,f,'outlook'),division=divisionRoundupV29(t,r,f);
  const bridge=[
    f.won?`${team} approaches ${next} from the useful side of the standings; the next result decides whether Week 1 becomes cushion or merely a pleasant opening note.`:`${team} arrives at ${next} needing a response. Another ${team} loss would not resemble the first one; the schedule has already started moving.`,
    f.won?`A winning week gives ${team} leverage entering ${next}. The follow-up matters because good teams convert favorable weeks into margin for error.`:`The loss makes ${next} more consequential for ${team}; a contender is allowed an ugly Sunday, not an endless collection of them.`,
    f.won?`A WIN FOLLOWS ${team.toUpperCase()} INTO ${String(next).toUpperCase()}. NOW MAKE THE CUSHION USEFUL.`:`${team.toUpperCase()} NEEDS AN ANSWER AGAINST ${String(next).toUpperCase()}. THE FIRST LOSS ALREADY USED THE EASY EXCUSE.`,
    f.won?`The next exhibit is ${next}. One favorable ${team} result is already in hand; the follow-up determines whether the first week deserves more weight.`:`The next exhibit is ${next}. One adverse ${team} result is manageable; a second begins changing the pattern in the file.`
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
      sentiment:[`A ${one(f.margin)}-point loss is too large for one scapegoat. ${team} supporters can be angry at individual misses, but Nick sees a margin this wide as evidence that the failure was distributed.`,`A ${one(f.margin)}-point loss is vulgar enough without pretending one unfortunate player caused all of it. Bartholomew finds the ${team} blame much more widely upholstered.`,`A ${one(f.margin)}-POINT LOSS NEEDS MORE THAN ONE VILLAIN. TILLY HAS PLENTY OF ANGRY INK AND NO REASON TO WASTE IT ON A SINGLE NAME.`,`A ${one(f.margin)}-point loss does not support a single-cause theory. Filch treats the size of the ${team} margin as evidence that multiple failures belong in the file.`][voice(r)],
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
      management:`For ${manager}, this week already supplied a legal counterfactual that deserves an actual correction.`
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
      sentiment:[`${top} gave ${team} its best defensive line; Nick starts with the tackles, pressure and fantasy impact instead of explaining why IDP exists.`,`${top} put the best defensive work on the ${team} page. Bartholomew will praise the player and spare everyone the sermon about league format.`,`${top} made the ${team} defense worth leading with. The stat line earned the ink; the format does not need a sales pitch.`,`${top} is the strongest defensive exhibit in the ${team} file. The underlying work earns the finding without explanatory language about IDP itself.`][voice(r)],
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
      outlook:`The next ${team} game gives the breakout candidate a chance to keep the larger role before the label becomes permanent.`,
      management:`For ${manager}, the young player has earned another opportunity rather than a ceremonial label.`
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
    ' That is the part Bartholomew would keep after the adjectives are edited out.',
    ' THAT is the part Tilly would put above the fold.',
    ` That is the ${team} thread Filch would keep attached to the next exhibit.`
  ];
  return keyedChoice(key,[core,core+tails[v]]);
}

function sentimentStoryV30(t,r,f=articleFrameV29(t,r)){
  const team=teamIdentityV28(t),manager=t.manager_name||'management',rec=record(t),rank=Number.isFinite(f.rank)?`${f.rank} of ${f.size}`:'unsettled',
    p=f.playoff,titles=Number(t.manager_career?.championships)||0,thread=articleThreadV30(t,r,f,'sentiment'),margin=one(f.margin),v=voice(r);
  const primary=[
    f.won
      ? `${team.city} gets the better Monday after a ${margin}-point ${team.mascot} win. ${team.mascot} fans can celebrate what happened while keeping one eye on the parts that looked harder to repeat.`
      : `${team.city} gets the irritated Monday after a ${margin}-point ${team.mascot} loss. The useful ${team.mascot} reaction is not to blame everybody equally; some performances survived the result and some helped create it.`,
    f.won
      ? `${team.mascot} supporters are understandably pleased, and Bartholomew will permit the optimism without pretending one week settled the order of things.`
      : `${team.mascot} supporters have every right to be annoyed. Bartholomew’s only request for ${team.mascot} criticism is that it distinguish between the players who failed and the good performances trapped inside the loss.`,
    f.won
      ? keyedChoice(`${t.roster_id}:tilly-sentiment-win`,[`${team.city.toUpperCase()} HAS A WIN AND THE GROUP CHAT HAS LOST ITS MIND. ${manager} MAY ENJOY THE SCREENSHOTS UNTIL THE NEXT LINEUP LOCKS.`,`BREAKING: ${team.mascot.toUpperCase()} WON, AND HALF THE FAN BASE IS ALREADY SHOPPING FOR PARADE ROUTES. ${manager} GETS UNTIL NEXT SUNDAY BEFORE TILLY CONFISCATES THE CONFETTI.`,`THE ${team.mascot.toUpperCase()} GROUP CHAT IS CURRENTLY UNINSURABLE AFTER A WIN. ${manager} SHOULD SAVE THE GOOD SCREENSHOTS; SPORTS ARE RUDE ENOUGH TO REVERSE THEM QUICKLY.`])
      : keyedChoice(`${t.roster_id}:tilly-sentiment-loss`,[`${team.city.toUpperCase()} HAS A LOSS AND THE GROUP CHAT HAS OPENED TWELVE INVESTIGATIONS BEFORE BREAKFAST. ${manager} SHOULD READ THE USEFUL COMPLAINTS AND MUTE THE REST.`,`${team.mascot.toUpperCase()} LOST, SO THE FAN BASE HAS DECLARED A MUNICIPAL EMERGENCY. ${manager} SHOULD FIND THE REAL PROBLEM BEFORE THE CHAT INVENTS FOURTEEN FAKE ONES.`,`THE COMPLAINT DESK IN ${team.city.toUpperCase()} IS OVERSTAFFED AFTER THIS LOSS. ${manager} NEEDS TO FIX THE PARTS THAT ACTUALLY FAILED AND IGNORE THE FAN FICTION.`]),
    f.won
      ? `The public case for ${team.mascot} is favorable this week: a win, a pile of screenshots and very little procedural restraint. ${manager} gets another hearing next Sunday.`
      : keyedChoice(`${t.roster_id}:filch-sentiment-loss`,[`The public case against ${team.mascot} is loud this week, but the evidence is uneven. ${manager} should separate the actual roster problem from the emotional exhibits.`,`${team.mascot} supporters have filed a broad indictment after the loss. Filch recommends narrowing the charges before ${manager} starts answering for things the roster did not actually do.`,`The fan verdict is adverse for ${team.mascot}, as expected after a loss. ${manager} still has to distinguish admissible criticism from screenshots entered solely for emotional effect.`])
  ][v];
  const context=[
    keyedChoice(`${t.roster_id}:sentiment-context-nick`,[`The record is ${rec}, good for rank ${rank}${p!=null?`, with the playoff outlook around ${one(p)}%`:''}. ${titles?`${manager} has ${titles} championship${titles===1?'':'s'} on the résumé, enough to earn patience but not immunity.`:''}`,`${team.mascot} sits ${rec}, ranked ${rank}${p!=null?`, with a ${one(p)}% playoff outlook`:''}. ${titles?`${manager} has ${titles} title${titles===1?'':'s'} of earned goodwill, useful but finite.`:''}`,`The table gives ${team.mascot} a ${rec} record and rank ${rank}${p!=null?`; the playoff estimate is ${one(p)}%`:''}. ${titles?`${manager}’s ${titles} championship${titles===1?'':'s'} buy context, not immunity.`:''}`]),
    keyedChoice(`${t.roster_id}:sentiment-context-bart`,[`${rec} and rank ${rank} are the unromantic facts${p!=null?`; the current playoff outlook remains ${one(p)}%`:''}. ${titles?`${titles} championship${titles===1?'':'s'} give ${manager} a résumé, not diplomatic immunity.`:''}`,`Strip away the tailoring and ${team.mascot} is ${rec}, rank ${rank}${p!=null?`, with a ${one(p)}% playoff outlook`:''}. ${titles?`${manager} has ${titles} championship${titles===1?'':'s'} in the cabinet; none comes with a lifetime press exemption.`:''}`,`The brutally plain numbers are ${rec}, rank ${rank}${p!=null?`, playoff outlook ${one(p)}%`:''}. ${titles?`Bartholomew respects ${manager}’s ${titles} title${titles===1?'':'s'} and declines to confuse them with current absolution.`:''}`]),
    keyedChoice(`${t.roster_id}:sentiment-context-tilly`,[`RECORD: ${rec}. RANK: ${String(rank).toUpperCase()}.${p!=null?` PLAYOFF OUTLOOK: ${one(p)}%.`:''} ${titles?`${manager.toUpperCase()} HAS ${titles} TITLE${titles===1?'':'S'} OF PRIOR GOODWILL. THAT COUPON BOOK IS NOT INFINITE.`:''}`,`${team.mascot.toUpperCase()} RECEIPT: ${rec}, RANK ${String(rank).toUpperCase()}.${p!=null?` PLAYOFF METER: ${one(p)}%.`:''} ${titles?`${titles} TITLE${titles===1?'':'S'} FOR ${manager.toUpperCase()} BUY PATIENCE, NOT SILENCE.`:''}`,`THE BORING PART TILLY IS LEGALLY REQUIRED TO PRINT: ${rec}, RANK ${String(rank).toUpperCase()}${p!=null?`, ${one(p)}% PLAYOFF OUTLOOK`:''}. ${titles?`YES, ${manager.toUpperCase()} HAS ${titles} TITLE${titles===1?'':'S'}. NO, THAT DOES NOT DELETE SUNDAY.`:''}`]),
    keyedChoice(`${t.roster_id}:sentiment-context-filch`,[`The public record reads ${rec}, rank ${rank}${p!=null?`, with a ${one(p)}% playoff estimate`:''}. ${titles?`${manager} enters with ${titles} championship${titles===1?'':'s'} of prior good conduct; the current week is still admissible.`:''}`,`Filch enters ${rec} and rank ${rank} into the ${team.mascot} record${p!=null?`, alongside a ${one(p)}% playoff estimate`:''}. ${titles?`${manager}’s ${titles} championship${titles===1?'':'s'} count as history, not suppression of current evidence.`:''}`,`The ${team.mascot} public file shows ${rec}, rank ${rank}${p!=null?`, and a ${one(p)}% playoff estimate`:''}. ${titles?`${manager} has ${titles} championship${titles===1?'':'s'} in mitigation; the week remains admissible anyway.`:''}`])
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
      const specific=specificityPass(t,c.kind,p),named=c.kind==='management'?specific:naturalizePlayerReferences(t,specific);
      return contextualizeParagraphV28(t,named);
    }).map(p=>String(p).replace(/Fix the production and the back page will happily find a new target\./gi,'Fix the production and the angry headline can move to somebody else.'));
    paragraphs=(c.kind==='management'?paragraphs:restoreSectionFullNamesV30(t,paragraphs)).map(p=>repairPlayerNameCollisionsV31(t,p));
    return {...f,...c,heading:headingV28(t,args.reporter,c.kind,c.heading,frame.angle),paragraphs:paragraphs.length?paragraphs:['n/a']};
  });
  const state={count:0},aliased=sections.map(sec=>({...sec,paragraphs:(sec.paragraphs||[]).map(p=>deMetaReporterFunctionsV32(repairPlayerNameCollisionsV31(t,teamAliasPassV28(t,p,state)),args.reporter))}));
  const tradeParagraphs=tradeCommentaryV32(t,args.reporter,facts).map(p=>deMetaReporterFunctionsV32(repairPlayerNameCollisionsV31(t,teamAliasPassV28(t,naturalizePlayerReferences(t,p),state)),args.reporter));
  if(tradeParagraphs.length){
    const managementIndex=aliased.findIndex(s=>s.kind==="management"),tradeSection={kind:"trade-commentary",heading:tradeCommentaryHeadingV32(args.reporter),paragraphs:tradeParagraphs};
    aliased.splice(managementIndex>=0?managementIndex:aliased.length,0,tradeSection);
  }
  const cased=aliased.map(sec=>({...sec,heading:finalReporterCaseV33(t,args.reporter,sec.heading),paragraphs:(sec.paragraphs||[]).map(p=>finalReporterCaseV33(t,args.reporter,p))}));
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
  const w=g.winner,l=g.loser,sameDivision=String(w.division||'')!==''&&String(w.division)===String(l.division),wr=w.league_context?.record||{},lr=l.league_context?.record||{},wp=valid(w.mida_outlook?.playoff)?Number(w.mida_outlook.playoff):null,lp=valid(l.mida_outlook?.playoff)?Number(l.mida_outlook.playoff):null,wdiv=divisionPressure(w,'W'),ldiv=divisionPressure(l,'L');
  const playoffLine=wp!=null||lp!=null?((wp!=null?w.team_name+' is around '+one(wp)+'% to reach the playoffs':'' )+(wp!=null&&lp!=null?', while ':'')+(lp!=null?l.team_name+' is around '+one(lp)+'%':''))+'. ':'';
  if(sameDivision)return 'The standings consequence is immediate because these teams share '+(w.division_name||'a division')+'. '+w.team_name+' gets the win and hands the loss directly to '+l.team_name+', the sort of early result that matters again when tiebreaker conversations arrive months from now. '+playoffLine+w.team_name+' leaves at '+(Number(wr.wins)||0)+'-'+(Number(wr.losses)||0)+' with a little more control of its own road; '+l.team_name+' leaves at '+(Number(lr.wins)||0)+'-'+(Number(lr.losses)||0)+' knowing the return meeting just became more important.';
  if(slot===0)return playoffLine+w.team_name+' can treat this as the first piece of cushion rather than proof of anything grand. '+l.team_name+' has the opposite assignment: turn the loss into an isolated bruise before a second bad Sunday turns it into the beginning of a chase. '+[wdiv,ldiv].filter(Boolean).join(' ');
  if(slot===1)return w.team_name+' walks into next week '+(Number(wr.wins)||0)+'-'+(Number(wr.losses)||0)+', and that record gives it the luxury of building instead of repairing. '+l.team_name+' is '+(Number(lr.wins)||0)+'-'+(Number(lr.losses)||0)+', where another close loss would start making every future toss-up feel less optional.';
  if(slot===2)return 'For '+w.team_name+', the value of this result is the freedom it buys later: one banked win is one fewer rescue mission the schedule has to provide. For '+l.team_name+', the road narrows by exactly one opportunity, which is why the next favorable matchup matters more now than it did a week ago.';
  if(slot===3)return 'The winner gets to spend the next week talking about how to build on the result; the loser has to spend it explaining what must change. That difference sounds small in September and feels much larger when the middle of the season starts charging interest.';
  return w.team_name+' earned the pleasant version of the future: keep stacking ordinary wins and let somebody else chase. '+l.team_name+' now needs a response before this becomes the kind of early loss that shows up again when playoff math gets uncomfortable.';
}

function matchupRead(g,slot=0){
  const w=g.winner,l=g.loser,star=list(w)[0],support=list(w)[1],loserStar=list(l)[0];
  const reads=[
    `${w.team_name} found a shape it can try to repeat: ${star?star.name+' as the headliner':''}${star&&support?' with '+support.name+' giving the lineup another place to lean':''}. ${l.team_name} leaves with too much of its useful work concentrated in too few places.`,
    `${w.team_name} leaves with a clearer pecking order for tight matchups. ${l.team_name}, meanwhile, cannot keep asking ${loserStar?loserStar.name+' to carry the useful parts of the lineup alone':'the same weak spots to disappear again next week'}.`,
    `${w.team_name} showed a version of itself that can travel if the same roles hold. ${l.team_name} gets one week to make the losing version look temporary instead of familiar.`,
    `${w.team_name} can spend the week refining something that worked. ${l.team_name} has to fix the lineup spots and roster bets that failed before the same holes become a habit.`,
    `${w.team_name}’s best players defined the matchup without making the rest of the roster fragile. ${l.team_name} needs its quiet pieces to rebound before the schedule makes another bad Sunday more expensive.`
  ];
  return reads[slot%reads.length];
}

function gameStory(g,slot=0){
  const star=list(g.winner)[0],loserStar=list(g.loser)[0],winnerSupport=list(g.winner)[1],loserMiss=list(g.loser).filter(p=>delta(p)!=null).sort((a,b)=>delta(a)-delta(b))[0],starContext=star?playerContextParagraph(star):'',supportContext=winnerSupport?playerContextParagraph(winnerSupport):'',starTrajectory=star?playerTrajectory(star):null,loserContext=loserStar?playerContextParagraph(loserStar):'',loserMissContext=loserMiss&&loserMiss.name!==loserStar?.name?playerContextParagraph(loserMiss):'',projectionContext=g.upset?' '+g.winner.team_name+' entered as the projected underdog and won anyway.':'';
  const contextTail=(starContext?` ${starContext}`:'')+(supportContext?` ${supportContext}`:'')+(starTrajectory?` ${starTrajectory.text}`:'')+(loserContext?` On the other side, ${loserContext}`:'')+(loserMissContext?` ${loserMissContext}`:'')+projectionContext+' '+matchupRead(g,slot);
  if(g.upset){
    const open=[
      g.winner.team_name+' delivered the projection upset that deserves the lead, beating '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
      g.winner.team_name+' ignored the pregame forecast and took '+g.loser.team_name+' down '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
      'Another favorite learned the usual lesson when '+g.winner.team_name+' beat '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+': projections do not get lineup spots. ',
      g.winner.team_name+' turned a projected disadvantage into a '+one(g.winner.points)+'–'+one(g.loser.points)+' win over '+g.loser.team_name+'. ',
      'The quieter upset on the board belongs to '+g.winner.team_name+', '+one(g.winner.points)+'–'+one(g.loser.points)+' over '+g.loser.team_name+'. '
    ][slot%5];
    const supportLine=winnerSupport?[
      winnerSupport.name+' gave the result enough support to keep it from becoming a one-player heist. ',
      winnerSupport.name+' made sure the upset belonged to a lineup instead of one isolated eruption. ',
      winnerSupport.name+' supplied the kind of second performance favorites hate seeing in an upset. ',
      winnerSupport.name+' kept the winner from asking one star to do every bit of the stealing. ',
      winnerSupport.name+' gave the result another sturdy leg to stand on. '
    ][slot%5]:'';
    const close=[
      'That is the sort of Week 1 result that changes the tone before the standings have had time to settle.',
      'The favorite leaves with a bruise and a simple assignment: make the projection look wiser over the next month than it did on Sunday.',
      'The winner got big work from more than one place. That is a much sturdier way to steal a game than one lucky eruption.',
      'Now the winner gets to prove this was the beginning of an identity rather than one excellent afternoon.',
      'The loser gets a reminder, the winner gets a little belief, and the rest of the league gets one more reason to stop penciling in results before kickoff.'
    ][slot%5];
    return open+(star?star.name+' led the winning side with '+one(star.points)+' points. ':'')+supportLine+(loserStar?loserStar.name+' kept '+g.loser.team_name+' in the fight. ':'')+(loserMiss&&loserMiss.name!==loserStar?.name?loserMiss.name+' is the quiet line the losing side will remember. ':'')+close+contextTail;
  }
  if(g.margin<=6){
    const open=[
      g.winner.team_name+' escaped '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+' in one of the games everybody kept checking. ',
      'The week’s best argument against multitasking was '+g.winner.team_name+' over '+g.loser.team_name+', '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
      g.winner.team_name+' survived the kind of game that turns every lineup decision into a replay, edging '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
      'There was almost nothing between '+g.winner.team_name+' and '+g.loser.team_name+' before '+g.winner.team_name+' came out '+one(g.margin)+' points ahead. ',
      g.winner.team_name+' got the final word in a '+one(g.winner.points)+'–'+one(g.loser.points)+' grinder with '+g.loser.team_name+'. '
    ][slot%5];
    return open+(star?star.name+' mattered more because there was almost no room to waste his '+one(star.points)+' points. ':'')+(winnerSupport?winnerSupport.name+' supplied the kind of secondary performance close games punish teams for missing. ':'')+(loserStar?loserStar.name+' kept '+g.loser.team_name+' alive. ':'')+(loserMiss&&loserMiss.name!==loserStar?.name?loserMiss.name+' had the kind of quiet line that looks enormous in a game this close. ':'')+'Nobody gets to call a game this close destiny; both teams leave knowing exactly which handful of plays and lineup spots decided it.'+contextTail;
  }
  const opens=[
    g.winner.team_name+' handled '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
    g.winner.team_name+' spent Sunday making '+g.loser.team_name+' chase a game that never really came back, '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
    'One of the week’s clearest statements came from '+g.winner.team_name+', which beat '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
    g.winner.team_name+' never needed a dramatic ending against '+g.loser.team_name+', closing out a '+one(g.winner.points)+'–'+one(g.loser.points)+' win. ',
    'The comfortable result worth keeping is '+g.winner.team_name+' over '+g.loser.team_name+', '+one(g.winner.points)+'–'+one(g.loser.points)+'. '
  ];
  return opens[slot%5]+(star?star.name+' set the tone with '+one(star.points)+'. ':'')+(winnerSupport?winnerSupport.name+' made sure the winning side had more than one place to look for production. ':'')+(loserStar?loserStar.name+' was the best reply for '+g.loser.team_name+', but the scoreboard kept moving away. ':'')+'A comfortable early win is not a season verdict. '+g.winner.team_name+' just raised the standard for what next Sunday should look like.'+contextTail;
}

function leagueSynthesis(teams){
  const usable=(teams||[]).map(t=>{const rows=list(t);if(rows.length<3||!valid(t.points)||Number(t.points)<=0)return null;return{t,rows,topShare:Number(rows[0].points)/Number(t.points),threeShare:rows.slice(0,3).reduce((n,p)=>n+Number(p.points||0),0)/Number(t.points)}}).filter(Boolean);
  if(!usable.length)return null;
  const balanced=usable.slice().sort((a,b)=>a.threeShare-b.threeShare)[0],starHeavy=usable.slice().sort((a,b)=>b.topShare-a.topShare)[0],bn=balanced?.rows?.slice(0,3).map(p=>p.name).join(', ');
  if(!balanced)return null;
  let text=`${balanced.t.team_name} got meaningful production from ${bn||'several places'} without asking one player to drag the whole lineup behind him. That balance becomes more valuable once the schedule starts testing depth instead of opening-week adrenaline.`;
  if(starHeavy&&String(starHeavy.t.roster_id)!==String(balanced.t.roster_id))text+=` ${starHeavy.t.team_name} lived much closer to the other extreme, leaning hardest on ${starHeavy.rows[0].name}. A centerpiece is fine; the rest of the lineup still has to become dependable enough to survive one quiet game from its star.`;
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
    breakout=all.find(x=>x.tr?.kind==='early-breakout'||x.tr?.kind==='breakout'),
    reliable=all.find(x=>x.tr?.kind==='reliable'&&(!breakout||String(x.p.id)!==String(breakout.p.id))),
    stumble=all.find(x=>x.tr?.kind==='stumble'||x.tr?.kind==='decline');
  const ps=[];
  if(top)ps.push(`${top.team_name} set the scoring pace at ${one(top.points)}, and the shape of the win was almost as encouraging as the total. The lineup had several places to turn, which matters more than asking one superstar to repeat a ceiling every week.`);
  if(breakout)ps.push(`${breakout.p.name} gave ${breakout.t.team_name} one of the more interesting young-player performances of the opener. ${statSituation(breakout.p)||''} Last season’s baseline was ${one(breakout.p.prior_season_avg)} across ${breakout.p.prior_season_games} games, so the Week 1 jump deserves attention without pretending the story is finished.`);
  if(reliable)ps.push(`${reliable.p.name} looked much more familiar than surprising for ${reliable.t.team_name}: ${one(reliable.p.points)} points against a 2025 average of ${one(reliable.p.prior_season_avg)}. Not every useful player needs a breakout label; some just keep making the lineup easier to trust.`);
  if(stumble)ps.push(`${stumble.p.name} opened well below the level ${stumble.t.team_name} saw last season. One bad Sunday does not erase the old floor, but it gives next week a little more weight.`);
  if(low&&top&&String(low.roster_id)!==String(top.roster_id))ps.push(`${low.team_name} sat at the other end of the weekly scoring table with ${one(low.points)}. September gives teams room to recover, but it does not give the points back.`);
  return ps.join(' ');
}
function weeklyMatchupHeading(g,isTop=false){
  if(isTop)return `${g.winner.team_name} — Week ${g.winner?.week_classification?.week||1}’s High-Water Mark`;
  if(g.upset)return `${g.winner.team_name} vs. ${g.loser.team_name} — The Forecast Got Flipped`;
  if(g.margin<=6)return `${g.winner.team_name} vs. ${g.loser.team_name} — ${one(g.margin)} Points Decided It`;
  if(String(g.winner?.division||'')!==''&&String(g.winner?.division)===String(g.loser?.division))return `${g.winner.team_name} vs. ${g.loser.team_name} — Division Business`;
  return `${g.winner.team_name} vs. ${g.loser.team_name} — ${one(g.winner.points)}–${one(g.loser.points)}`;
}
function weeklyTopScorerStory(t,g){
  const rows=list(t),top=rows[0],second=rows[1],third=rows[2],trio=[top,second,third].filter(Boolean),parts=[];
  parts.push(`${t.team_name} set the league’s weekly scoring ceiling at ${one(t.points)}, a ${one(Number(t.points)-Number(t.opponent_points))}-point win over ${t.opponent_name}. Nobody in the league put more points on the board. Anyone objecting can take the argument to the scoreboard.`);
  if(top){
    parts.push(focusedPlayerStatsV32(trio));
    const supportStar=trio.slice(1).find(p=>establishedStarV29(p)),twoWay=trio.some(defensivePlayer)&&trio.some(p=>!defensivePlayer(p)),names=naturalJoin(trio.map(p=>p.name));
    if(supportStar)parts.push(`${supportStar.name} being a supporting luxury instead of the emergency generator is the real flex here. ${names} give ${t.team_name} several independent ways to build a ceiling, so an opponent cannot simply wait for one star to cool off. That is lineup leverage, not a prettier way to recite three scores — and, yes, it is obnoxious.`);
    else if(twoWay)parts.push(`${names} did their damage from both offensive and IDP spots. That matters because ${t.team_name} did not need one side of the lineup to bail out the other; the ceiling came from different roster lanes at once. Multiple failure points for the opponent is a much healthier problem than one weekly rescue act.`);
    else parts.push(`${names} gave ${t.team_name} more than a pile of points: they gave the lineup separate ways to reach the same winning total. If one of those roles has an ordinary Sunday next week, the others can still carry useful weight. That is the difference between star power and simple dependency.`);
  }
  return parts;
}
function weeklyStoryBlock(g,slot,isTop=false){
  const paragraphs=[];
  if(isTop)paragraphs.push(...weeklyTopScorerStory(g.winner,g),implicationStory(g,slot));
  else paragraphs.push(gameStory(g,slot),implicationStory(g,slot));
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
  const nickRecapRead=(topTeam?topTeam.team_name:'The week’s best roster')+" gave me the cleanest argument for depth over dependency. The part I trust is not the loudest score; it is how many different lineup spots could have been ordinary without turning the result into a rescue operation. That matters once opponents stop cooperating. I have watched enough September coronations become October yard sales to know the distinction. Keep the balance, and this looks repeatable. Lose it, and somebody will discover how expensive star insurance gets.";
  matterBlocks.push({heading:'What I’m Buying After the Noise',paragraphs:[nickRecapRead]});
  const bartholomewRecapRead="The league is already trying to confuse glamour with structure, which is adorable. A beautiful ceiling means considerably more when the roster underneath it has several credible ways to survive an ugly afternoon. I am interested in the teams whose supporting cast can turn a star’s merely human game into a nuisance instead of a funeral. The rest may continue polishing the centerpiece while pretending the table is not wobbling. Taste matters; load-bearing depth matters rather more.";
  velvet.push(bartholomewRecapRead);
  const tillyRecapRead="I LOVE A LOUD MOVE. I LOVE A LOUDER WIN. I LOVE THEM LESS WHEN EVERYBODY DECIDES THE STORY IS FINISHED BEFORE THE NEXT KICKOFF. The managers worth trusting are the ones whose moves created another usable path instead of another excuse. If the new piece helped, good — now make it matter again. If the old piece went off elsewhere, congratulations on your new group-chat migraine. Transactions are decisions with sequels, and this league has never met a sequel it could discuss calmly.";
  const backPageParagraphs=moves.length?moves.map(x=>x.text):(tillyFallback.length?tillyFallback:['n/a']),
    backPageBlocks=moves.length?moves.map(x=>({heading:x.t.team_name+' — Transaction Follow-Up',paragraphs:[x.text]})):[],
    nextParagraphs=next?[`${next.a.team_name} and ${next.b.team_name} is the matchup to circle first. The current projection separates them by only ${one(next.gap)} points, which is close enough for one star performance, one bad lineup call or one quiet Sunday from a centerpiece to swing the whole thing.`,...(()=>{
      const a=list(next.a)[0],b=list(next.b)[0],arr=[];
      if(a||b){
        arr.push(`${a?a.name+' leads '+next.a.team_name:''}${a&&b?', while ':''}${b?b.name+' is the first name on '+next.b.team_name+'’s side of the marquee':''}. Neither team gets to win this matchup on reputation.`);
        const ac=a?playerContextParagraph(a):'',bc=b?playerContextParagraph(b):'',at=a?playerTrajectory(a):null,bt=b?playerTrajectory(b):null;
        if(ac||bc||at||bt)arr.push([ac,at?.text,bc,bt?.text].filter(Boolean).join(' '))
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
  const filchRecapRead="I am less interested in who looks inevitable than in which assumptions are about to become expensive. A soft matchup can hide a shallow bench, a narrow win can disguise a lineup mistake, and one heroic player can make a bad roster decision look temporarily innocent. The schedule will sort some of that out without asking permission. My working rule is simple: trust the role that repeats, distrust the excuse that gets prettier, and keep the receipt when a manager insists there was never a problem.";
  nextParagraphs.push(filchRecapRead);
  if(nextBlocks.length)nextBlocks.push({heading:'What Still Needs Proving',paragraphs:[filchRecapRead]});
  const sections=[
    {reporter:reporter(0),heading:'What Actually Mattered This Week',blocks:matterBlocks,paragraphs:matterBlocks.length?flattenBlocks(matterBlocks):['The week did not produce enough verified matchup detail for a responsible lead story.']},
    {reporter:reporter(1),heading:'The Velvet Rope: Form, Fortune and the Week’s Unfashionable Truths',paragraphs:velvet.length?velvet:['n/a']},
    {reporter:reporter(2),heading:'The Back Page Has Receipts',blocks:backPageBlocks,paragraphs:backPageParagraphs},
    {reporter:reporter(3),heading:'Next Week, Before Everyone Gets Smarter in Hindsight',blocks:nextBlocks,paragraphs:nextParagraphs}
  ].map(sec=>{
    const proper=[...(teams||[]).flatMap(t=>[t.team_name,t.manager_name,...articlePlayers(t).map(p=>p.name)]),sec.reporter?.name].filter(Boolean);
    const tidy=value=>{const deMeta=deMetaReporterFunctionsV32(value,sec.reporter);return sec.reporter?.id==='mack-hollis'?normalizeTillyCaseV33(deMeta,proper):deMeta};
    return {...sec,heading:tidy(sec.heading),paragraphs:(sec.paragraphs||[]).map(tidy),blocks:(sec.blocks||[]).map(b=>({...b,heading:tidy(b.heading),paragraphs:(b.paragraphs||[]).map(tidy)}))};
  });
  return {...o,inquirer_version:26,editorial_revision:5,sections};
}
