import {humanSectionsV23,selectImportantMoves,divisionCopy} from './inquirer-editorial-v23.mjs';
// Team prose is calibrated against the approved Weekly Recap style control.

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
  const solo=Number(s.tkl_solo),ast=Number(s.tkl_ast),sacks=Number(s.sack),tfl=Number(s.tkl_loss??s.tfl),qb=Number(s.qb_hit),pd=Number(s.pass_def),ints=Number(s.int),ff=Number(s.ff),snaps=Number(s.def_snp??s.def_snaps??s.defensive_snaps),bits=[];
  if(Number.isFinite(solo))bits.push(`${solo} solo ${plural(solo,'tackle')}`);
  if(Number.isFinite(ast)&&ast>0)bits.push(`${ast} assisted ${plural(ast,'tackle')}`);
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
  const s=p?.real_stats||{},solo=Number(s.tkl_solo),ast=Number(s.tkl_ast),sacks=Number(s.sack),tfl=Number(s.tkl_loss??s.tfl),pd=Number(s.pass_def),ints=Number(s.int),ff=Number(s.ff),snaps=Number(s.def_snp??s.def_snaps??s.defensive_snaps),points=Number(p?.points),parts=[];
  const tackles=(Number.isFinite(solo)?solo:0)+(Number.isFinite(ast)?ast:0);
  if(tackles>0)parts.push(`${tackles} total ${tackles===1?'tackle':'tackles'}`);
  if(Number.isFinite(sacks)&&sacks>0)parts.push(`${sacks} ${sacks===1?'sack':'sacks'}`);
  if(Number.isFinite(tfl)&&tfl>0)parts.push(`${tfl} ${tfl===1?'tackle for loss':'tackles for loss'}`);
  if(Number.isFinite(pd)&&pd>0)parts.push(`${pd} ${pd===1?'pass breakup':'pass breakups'}`);
  if(Number.isFinite(ints)&&ints>0)parts.push(`${ints} ${ints===1?'interception':'interceptions'}`);
  if(Number.isFinite(ff)&&ff>0)parts.push(`${ff} forced ${ff===1?'fumble':'fumbles'}`);
  if(parts.length)return {strong:tackles>=6||Number(sacks)>=1.5||Number(ints)>=1||Number(ff)>=1,text:parts.slice(0,3).join(', '),limited_snap:false};
  if(Number.isFinite(snaps)&&snaps<=25&&Number.isFinite(points)&&points>=12)return {strong:false,text:`${snaps} defensive snaps`,limited_snap:true,snaps};
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
  const solo=Number(s.tkl_solo),ast=Number(s.tkl_ast),sacks=Number(s.sack),tfl=Number(s.tkl_loss??s.tfl),qb=Number(s.qb_hit),pd=Number(s.pass_def),ints=Number(s.int),ff=Number(s.ff),bits=[];
  if(Number.isFinite(solo))bits.push(`${solo} solo ${count(solo,'tackle')}`);if(Number.isFinite(ast)&&ast>0)bits.push(`${ast} assisted ${count(ast,'tackle')}`);if(Number.isFinite(sacks)&&sacks>0)bits.push(`${sacks} ${count(sacks,'sack')}`);if(Number.isFinite(tfl)&&tfl>0)bits.push(`${tfl} ${count(tfl,'tackle for loss','tackles for loss')}`);if(Number.isFinite(qb)&&qb>0)bits.push(`${qb} QB ${count(qb,'hit')}`);if(Number.isFinite(pd)&&pd>0)bits.push(`${pd} ${count(pd,'pass breakup')}`);if(Number.isFinite(ints)&&ints>0)bits.push(`${ints} ${count(ints,'interception')}`);if(Number.isFinite(ff)&&ff>0)bits.push(`${ff} forced ${count(ff,'fumble')}`);
  const role=teamDefenseUsage(p);
  if(bits.length){let text=`${n} finished with ${bits.join(', ')}.`;if(role?.limited_snap)text+=` He did it on only ${role.snaps} defensive snaps, one of the rare cases where the snap count actually makes the performance more interesting.`;return text;}
  if(role?.limited_snap)return `${n} produced ${one(p.points)} fantasy points on only ${role.snaps} defensive snaps, unusually efficient work in a genuinely limited role.`;
  const line=String(p?.real_stat_line||'').split(/\s*•\s*|\s*,\s*/).map(x=>x.trim()).filter(x=>x&&!/\b(?:def(?:ensive)?\s+)?snaps?\b/i.test(x)).join(', ');return line?`${n} finished with ${line}.`:null;
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

function teamTrajectory(p){
  const prior=Number(p?.prior_season_avg),priorGames=Number(p?.prior_season_games)||0,current=Number(p?.season_avg),games=Number(p?.season_games)||0,age=Number(p?.age),years=Number(p?.years_exp),pos=String(p?.position||'').toUpperCase(),key=p?.id||p?.name,role=teamOpportunity(p),points=Number(p?.points);
  const rookie=Number.isFinite(years)&&years===0,young=(Number.isFinite(age)&&age<=26)||(Number.isFinite(years)&&years<=3),oldThreshold=pos==='QB'?34:pos==='RB'?28:(pos==='WR'||pos==='TE')?30:29,veteran=(Number.isFinite(years)&&years>=7)||(Number.isFinite(age)&&age>=oldThreshold);
  if(rookie)return {kind:'rookie',strength:1,text:keyedChoice(key,[`${p.name} is a rookie, so Week 1 is a first data point rather than a finished scouting report. ${role?.strong?'The role was substantial enough to make the debut worth remembering.':'For '+p.name+', the next useful question is whether the role grows.'}`,`Rookie ${p.name} has officially given fantasy managers something to overreact to. ${role?.strong?'At least the opportunity gives the optimism a football reason.':'The playing-time story still needs another chapter.'}`,`${p.name} is a rookie. An opening-week role can change expectations faster than an opening-week score, and ${role?.strong?'this '+p.name+' role had enough substance to watch closely.':p.name+' still needs the next week to add substance.'}`])};
  if(!Number.isFinite(prior)||prior<=0||priorGames<6||!Number.isFinite(current)||games<1)return null;
  const ratio=current/prior;
  if(games>=3&&young&&ratio>=1.28&&role?.strong)return {kind:'breakout',strength:ratio-1,text:keyedChoice(key,[`${p.name} has earned the breakout-candidate label. The scoring has stayed well above last season’s baseline for multiple weeks, and the role is large enough that the jump no longer looks like touchdown roulette.`,`${p.name} is a legitimate breakout candidate now: young, several weeks into a higher scoring level, and carrying enough weekly involvement to make the change believable.`,`The breakout conversation is no longer premature for ${p.name}. A sustained young-player spike plus a real role is exactly the combination that turns a hot streak into a player-development story.`])};
  if(games===1&&young&&ratio>=1.4&&role?.strong)return {kind:'early-breakout',strength:ratio-1,text:keyedChoice(key,[`${p.name} belongs on early breakout watch, not in the breakout-candidate victory parade yet. The opener beat last year’s baseline by a wide margin and the role gave it some legitimacy; another few Sundays have to make it sustained.`,`${p.name} is young enough and opened loudly enough to start a breakout watch. One week is not sustained evidence, so the label stays “candidate pending more football” for now.`,`${p.name} gave us the first ingredient of a breakout case: a young player beating the old baseline with a meaningful role. The missing ingredient is repetition.`])};
  if(games>=3&&veteran&&ratio<=.68)return {kind:'decline',strength:1-ratio,text:keyedChoice(key,[`${p.name} is a veteran and now a legitimate fall-off candidate. The production has stayed well below last season’s level for multiple weeks; age makes the trend worth taking seriously without declaring the career over.`,`Put veteran ${p.name} on fall-off watch. A sustained drop from last year’s baseline is more than one bad Sunday, and this is the stage of a career where role erosion deserves attention.`,`${p.name} has crossed from “slow start” into fall-off-candidate territory: veteran age, a multi-week decline, and a scoring level well below the old baseline. The next question is whether the role is shrinking with it.`])};
  if(games>=3&&Math.abs(ratio-1)<=.15&&prior>=8)return {kind:'reliable',strength:1-Math.abs(ratio-1),text:keyedChoice(key,[`${veteran?'Veteran ':''}${p.name} is doing the boring valuable thing: producing near the established baseline over a real sample. That is reliability, not a breakout.`,`${p.name} has settled back into familiar territory over multiple weeks. Reliable production rarely wins the group chat, but it keeps ${p.name} from becoming a Tuesday problem.`])};
  if(games===1&&Math.abs(points-prior)<=Math.max(2,prior*.22)&&prior>=8)return {kind:'reliable',strength:1-Math.abs(points-prior)/prior,text:keyedChoice(key,[`${veteran?'Veteran ':''}${p.name} opened near last season’s established level. Same neighborhood, same job description.`,`${p.name} started the year in familiar territory relative to last season. Nothing about ${p.name}’s opener required a new scouting report.`])};
  if(games===1&&points<=prior*.5)return {kind:'stumble',strength:1-points/prior,text:keyedChoice(key,[`${veteran?'Veteran ':''}${p.name} opened far below last season’s normal level. One ugly Sunday is a stumble, not a fall-off trend; another few weeks would change the classification.`,`${p.name} started well below the old baseline. The career did not disappear in one afternoon, but the next role now matters more.`])};
  if(veteran)return {kind:'veteran',strength:.25,text:`Veteran ${p.name} entered the season with an established baseline. Week 1 landed against that old standard, not a blank slate.`};
  return null;
}

function playerTrajectory(p){
  const prior=Number(p?.prior_season_avg),priorGames=Number(p?.prior_season_games)||0,current=Number(p?.season_avg),games=Number(p?.season_games)||0,age=Number(p?.age),opp=opportunity(p),pos=String(p?.position||'').toUpperCase(),key=p?.id||p?.name;
  if(!Number.isFinite(prior)||prior<=0||priorGames<6||!Number.isFinite(current)||games<1)return null;
  const ratio=current/prior,oldThreshold=pos==='QB'?34:pos==='RB'?28:(pos==='WR'||pos==='TE')?30:29;
  if(games>=3&&Number.isFinite(age)&&age<=26&&ratio>=1.28&&opp?.strong)return {kind:'breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} has climbed from ${one(prior)} per game last season to ${one(current)} this year. The role has grown with the production; breakout watch is no longer premature.`,
    `${p.name} is averaging ${one(current)} after sitting at ${one(prior)} last year. The old baseline is starting to look stale.`,
    `Last year’s ${one(prior)}-point average looks small next to ${p.name}’s ${one(current)} this season. This has lasted long enough to call it a real leap.`,
    `${p.name} has moved from ${one(prior)} per game last season to ${one(current)} this year. The hot start has outlived the fluke stage.`
  ])};
  if(games===1&&Number.isFinite(age)&&age<=26&&ratio>=1.4&&opp?.strong)return {kind:'early-breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} opened far above last year’s ${one(prior)}-point average. Put him on breakout watch, not in the victory parade.`,
    `${p.name} cleared last year’s ${one(prior)}-point average by a wide margin. One Sunday is not a trend, but it is enough to get attention.`,
    `${p.name} entered from a ${one(prior)}-point baseline last year and opened this season much louder. The old expectation already looks a little uncomfortable.`,
    `${p.name} averaged ${one(prior)} last season and opened well above it. Give the new job description another Sunday before calling it permanent.`
  ])};
  if(games>=3&&Number.isFinite(age)&&age>=oldThreshold&&ratio<=.68)return {kind:'decline',strength:1-ratio,text:keyedChoice(key,[
    `${p.name} has earned a real decline watch: ${one(current)} per game this season versus ${one(prior)} last year. At age ${age}, the old weekly floor no longer gets the benefit of the doubt.`,
    `The uncomfortable veteran question belongs to ${p.name}: ${one(current)} now after ${one(prior)} last season. At age ${age}, the drop deserves attention.`,
    `${p.name} is giving us a decline story worth monitoring. Production has fallen from ${one(prior)} last year to ${one(current)} this season, and age ${age} makes the slide harder to shrug off.`,
    `${p.name} sits at ${one(current)} per game after a ${one(prior)} average last year. At age ${age}, “slow start” is beginning to run out of room.`
  ])};
  if(games>=3&&Math.abs(ratio-1)<=.15&&prior>=8)return {kind:'reliable',strength:1-Math.abs(ratio-1),text:keyedChoice(key,[
    `${p.name} keeps doing the boring valuable thing: ${one(current)} per game this season after ${one(prior)} last year.`,
    `${p.name} is almost aggressively familiar: ${one(current)} per game now, ${one(prior)} last year. A lineup spot that refuses to become a Tuesday problem has value.`,
    `${p.name} is at ${one(current)} per game after ${one(prior)} last season. The weekly floor still looks intact.`,
    `${p.name} is supplying continuity: ${one(current)} per game this season compared with ${one(prior)} last year. Reliable players rarely win the group chat, but they keep lineups out of rescue mode.`
  ])};
  if(games===1&&Math.abs(Number(p.points)-prior)<=Math.max(2,prior*.22)&&prior>=8)return {kind:'reliable',strength:1-Math.abs(Number(p.points)-prior)/prior,text:keyedChoice(key,[
    `${p.name} opened near last season’s ${one(prior)}-point level. Familiar is a compliment here.`,
    `${p.name} gave his team a familiar opening line after a ${one(prior)}-point baseline last year.`,
    `There was nothing exotic about ${p.name}’s opener. Last season’s ${one(prior)}-point baseline still looks like home.`,
    `${p.name} looked a lot like the player last season already taught us to expect, right around a ${one(prior)}-point baseline.`
  ])};
  if(games===1&&Number(p.points)<=prior*.5)return {kind:'stumble',strength:1-Number(p.points)/prior,text:keyedChoice(key,[
    `${p.name} opened well below last year’s ${one(prior)}-point average. One bad Sunday is a stumble, not a decline.`,
    `${p.name} started the year far under the ${one(prior)}-point average he carried last season. The next workload gets a brighter light.`,
    `${p.name} opened a long way below last year’s ${one(prior)}-point average. The production disappeared for a week; the career did not.`,
    `${p.name} opened far below the ${one(prior)}-point average he established last season. Another quiet Sunday would make the concern harder to dismiss.`
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

export function breakoutWatch(t){
  const direct=(t.starter_details||[]).map(p=>({p,tr:playerTrajectory(p)})).filter(x=>['breakout','early-breakout'].includes(x.tr?.kind)).sort((a,b)=>Number(b.tr.strength)-Number(a.tr.strength))[0];
  if(direct)return direct.tr.text;
  const candidates=(t.starter_details||[]).map(p=>{const age=Number(p.age),f=p.recent_form||{},baseline=Number(f.prior3_avg),current=Number(f.last3_avg),opp=opportunity(p);if(!Number.isFinite(age)||age>26||!Number.isFinite(baseline)||baseline<=0||!Number.isFinite(current)||!opp?.strong)return null;const lift=current-baseline;if(lift<3||current<baseline*1.2)return null;return {p,age,baseline,current,lift,opp,score:lift+Math.max(0,26-age)*.5}}).filter(Boolean).sort((a,b)=>b.score-a.score);
  const x=candidates[0];if(!x)return null;
  return `${x.p.name} is worth a breakout watch for ${t.team_name}. At age ${x.age}, the scoring has climbed from ${one(x.baseline)} per game across the prior sample to ${one(x.current)} over the last three, and this week’s ${x.opp.text} gives the jump actual opportunity behind it. The evidence is meaningful now, but the next few Sundays still decide whether the new level holds.`;
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
    else if(ps[0].includes(topScore))ps[0]=ps[0].replace(topScore,topScore+' fantasy points');
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
    [`At ${position}, ${t.team_name} has ${expectation}. ${t.team_name} supporters can enjoy this result without lowering the standard for the next one.`],
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
    [`${next.team_name} is the hard part of this short stretch; softer ground follows. An upset would be a bonus win, while a loss would make those later opportunities less optional.`],
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
  if((a.injury_current_starters||[]).length){const names=(a.injury_current_starters||[]).slice(0,3).map(x=>x.name).join(', ');parts.push(deskChoice(t,r,[
    [`Availability matters before kickoff: ${names} currently carry injury/status designations. ${t.team_name} needs a plan that does not depend on optimistic refresh-button behavior.`],
    [`${names} enter the week with injury/status flags. Hope is charming; a bench plan is more useful.`],
    [`INJURY WATCH: ${names}. ${t.team_name} should prepare an actual contingency before Sunday turns the inactive list into breaking news.`],
    [`${names} currently carry injury/status designations, so ${t.team_name} has a real depth question to solve before the matchup decides it for them.`]
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
  const starLine=teamFootballRead(t,star,r,'opponent'),won=Number(t.points)>Number(t.opponent_points),support=second?` ${second.name} added ${one(second.points)}.`:'';
  const open=deskChoice(t,r,[
    [`${t.opponent_name} had a real answer in ${star.name}, who scored ${one(star.points)} fantasy points.${support} ${won?t.team_name+' survived the opponent’s best punch anyway.':t.team_name+' never found enough production elsewhere to answer it.'}`],
    [`${star.name} gave ${t.opponent_name} ${one(star.points)} fantasy points.${support} ${won?'That makes the '+t.team_name+' win look better, not luckier.':'That was enough elegance on the other side of the table to make '+t.team_name+' pay.'}`],
    [`${star.name.toUpperCase()} KEPT ${t.opponent_name.toUpperCase()} IN IT with ${one(star.points)}.${support} ${won?t.team_name+' took the hit and kept scoring.':t.team_name+' never produced the counterpunch it needed.'}`],
    [`${star.name} was ${t.opponent_name}’s biggest problem for ${t.team_name}, scoring ${one(star.points)} fantasy points.${support} ${won?'Winning through that gives '+t.team_name+' a little more substance.':t.team_name+' could not make the rest of the matchup compensate.'}`]
  ]);
  return [open,starLine].filter(Boolean).join(' ');
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
  const rows=list(t),bad=rows.filter(p=>delta(p)!=null&&delta(p)<-4).sort((a,b)=>delta(a)-delta(b))[0],supportRows=rows.slice(1).filter(p=>!bad||String(p.id)!==String(bad.id)).slice(0,2);if(!supportRows.length)return null;
  const pieces=[];
  for(const p of supportRows){
    const ctx=teamFootballRead(t,p,r,'supporting-cast'),prior=Number(p.prior_season_avg),priorGames=Number(p.prior_season_games)||0;
    let baseline='';
    if(Number.isFinite(prior)&&prior>0&&priorGames>=6){
      baseline=Number(p.points)>=prior*1.25
        ?keyedChoice(p.id||p.name,[`${p.name} beat last season’s ${one(prior)}-point average by a healthy margin.`,`That was a louder ${p.name} Sunday than the ${one(prior)} he averaged last season.`,`${p.name} opened above his ${one(prior)}-point 2025 baseline.`])
        :Number(p.points)<=prior*.7
          ?keyedChoice(p.id||p.name,[`${p.name} finished well below last season’s ${one(prior)}-point average.`,`The ${one(prior)}-point average ${p.name} carried last year makes this opener unusually quiet.`,`${p.name} started well under the level he usually gave this roster last season.`])
          :keyedChoice(p.id||p.name,[`${p.name} opened near last season’s ${one(prior)}-point average.`,`This looked familiar from ${p.name}, who averaged ${one(prior)} across ${priorGames} games last year.`,`${p.name} gave ${t.team_name} something close to his established 2025 level.`]);
    }
    pieces.push([`${p.name} gave ${t.team_name} ${one(p.points)} fantasy points.`,ctx,baseline].filter(Boolean).join(' '));
  }
  const close=deskChoice(t,r,[
    [`${rows[0]?.name||'The leading scorer'} owned the headline, but ${t.team_name} had enough help behind it to avoid a one-man rescue job.`],
    [`${t.team_name} looked better for having more than one useful place to turn. Even a star appreciates competent company.`],
    [`That is secondary scoring ${t.team_name} can print in smaller type and still be very happy to have.`],
    [`${t.team_name} did not ask one player to carry every useful possession of the afternoon. That balance mattered.`]
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
    [won?`${team} gets to let the new arrangement breathe under a win. A civilized opening, if nothing else.`:`${team} has a loss making every recent rearrangement look a little more important.`],
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
export function humanSectionsV25(args){
  const {team:t,facts={}}=args,base=humanSectionsV23({...args,team:{...t,transactions:[]}}),mgmt=management(t,facts,args.reporter);
  const rewritten=base.map(s=>{
    let paragraphs;
    if(s.kind==='lede')paragraphs=naturalLede(t,args.reporter);
    else if(s.kind==='players')paragraphs=playerSection(t,args.reporter);
    else if(s.kind==='management'){
      const moveParagraphs=mgmt.filter(p=>p&&p!=='n/a'),expansion=reporterExpansionV26(t,s.kind,args.reporter);
      paragraphs=[];
      if(moveParagraphs.length){
        paragraphs.push(moveParagraphs.join(' '));
        if(expansion.length)paragraphs.push(expansion.join(' '));
      }else if(expansion.length){
        paragraphs.push(expansion[0]);
        paragraphs.push(expansion.length>1
          ? expansion.slice(1).join(' ')
          : deskChoice(t,args.reporter,[
              [t.team_name+' has one real management decision to revisit here. The useful response is to correct it without inventing a larger roster crisis.'],
              [t.team_name+' has one management blemish worth remembering. No need for a palace coup; a better Sunday decision will do.'],
              ['MANAGEMENT NOTE: '+t.team_name+' has one real decision to fix. Correct it, print the lesson, move on.'],
              [t.team_name+' has a concrete management choice to review. The next lineup gets a chance to show the lesson actually stuck.']
            ]));
      }else paragraphs=['n/a'];
    }
    else if(s.kind==='value')paragraphs=valueSectionV26(t,args.reporter);
    else if(s.kind==='outlook')paragraphs=outlook(t,args.week,args.reporter);
    else if(s.kind==='sentiment')paragraphs=sentiment(t,args.reporter);
    else if(s.kind==='hot-seat')paragraphs=hotCool(t,'hot-seat',args.reporter);
    else if(s.kind==='cool-throne')paragraphs=hotCool(t,'cool-throne',args.reporter);
    else paragraphs=[...(s.paragraphs||[])];
    if(paragraphs.length&&paragraphs[0]!=='n/a'){
      if(s.kind==='players'){const traded=list(t).find(p=>p.acquisition);const callback=traded?acquisitionCallback(t,traded,args.reporter):null;if(callback)paragraphs.push(callback)}
      if(s.kind!=='management')paragraphs.push(...reporterExpansionV26(t,s.kind,args.reporter));
    }
    paragraphs=paragraphs.map(p=>specificityPass(t,s.kind,p));
    return {...s,paragraphs};
  });
  return dedupeArticleSections(reporterStructureV26(rewritten,t,args.reporter));
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
    rivalSubject=xs=>xs.length?(xs[0]+(xs.length>1?' and '+String(xs.length-1)+' other division rival'+(xs.length>2?'s':''):'')):'';
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
  if(slot===1)return w.team_name+' walks into next week '+(Number(wr.wins)||0)+'-'+(Number(wr.losses)||0)+', and that record gives it the luxury of building instead of repairing. '+l.team_name+' is '+(Number(lr.wins)||0)+'-'+(Number(lr.losses)||0)+', where another close loss would start making every future toss-up feel less optional. '+[wdiv,ldiv].filter(Boolean).join(' ');
  if(slot===2)return 'For '+w.team_name+', the value of this result is the freedom it buys later: one banked win is one fewer rescue mission the schedule has to provide. For '+l.team_name+', the road narrows by exactly one opportunity, which is why the next favorable matchup matters more now than it did a week ago. '+[wdiv,ldiv].filter(Boolean).join(' ');
  if(slot===3)return 'The winner gets to spend the next week talking about how to build on the result; the loser has to spend it explaining what must change. That difference sounds small in September and feels much larger when the middle of the season starts charging interest. '+[wdiv,ldiv].filter(Boolean).join(' ');
  return w.team_name+' earned the pleasant version of the future: keep stacking ordinary wins and let somebody else chase. '+l.team_name+' now needs a response before this becomes the kind of early loss that shows up again when playoff math gets uncomfortable. '+[wdiv,ldiv].filter(Boolean).join(' ');
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
  const star=list(g.winner)[0],loserStar=list(g.loser)[0],winnerSupport=list(g.winner)[1],loserMiss=list(g.loser).filter(p=>delta(p)!=null).sort((a,b)=>delta(a)-delta(b))[0],starContext=star?playerContextParagraph(star):'',starTrajectory=star?playerTrajectory(star):null,loserContext=loserStar?playerContextParagraph(loserStar):'',projectionContext=g.upset?' '+g.winner.team_name+' entered as the projected underdog and won anyway.':'';
  const contextTail=(starContext?` ${starContext}`:'')+(starTrajectory?` ${starTrajectory.text}`:'')+(loserContext&&g.margin<=6?` On the other side, ${loserContext}`:'')+projectionContext+' '+matchupRead(g,slot);
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
  const rows=list(t),top=rows[0],second=rows[1],third=rows[2],parts=[];
  parts.push(`${t.team_name} set the league’s weekly scoring ceiling at ${one(t.points)}, a ${one(Number(t.points)-Number(t.opponent_points))}-point win over ${t.opponent_name}. Nobody in the league put more points on the board. Anyone objecting can take the argument to the scoreboard.`);
  if(top){
    const ctx=statSituation(top);
    parts.push(`${top.name} led the avalanche with ${one(top.points)} fantasy points${second?', with '+second.name+' right behind him':''}${third?', and '+third.name+' giving the lineup a third headliner':''}. ${ctx||''} ${second&&second.real_stat_line?second.name+' backed it with '+String(second.real_stat_line).replaceAll(' • ',', ')+'.':''} ${t.team_name} had three headliners instead of one miracle carrying the entire total.`.trim());
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
  const upMove=movement(teams,1),downMove=movement(teams,-1),trend=playerTrend(teams),playerPulse=leaguePlayerPulse(teams),availability=availabilityStories(teams),
    moves=teams.map(t=>({t,text:tillyManagementStory(t)})).filter(x=>x.text).sort((a,b)=>Number(b.t.current_week_trade_count||0)-Number(a.t.current_week_trade_count||0)||(b.t.transactions?.length||0)-(a.t.transactions?.length||0)).slice(0,2),
    next=nextGame(teams);
  const velvet=[
    upMove?`${upMove.team_name} gained ${Math.round(Number(upMove.value_history_week.delta)).toLocaleString('en-US')} in roster value this week. That is not a trophy, but it does make the front office portfolio look rather less like hotel-lobby art. The interesting part is whether the football keeps pace with the appraisal.`:null,
    downMove&&(!upMove||String(downMove.roster_id)!==String(upMove.roster_id))?`${downMove.team_name} moved the other way, down ${Math.abs(Math.round(Number(downMove.value_history_week.delta))).toLocaleString('en-US')} in roster value. One does not burn the chaise lounge over a weekly market move, but another slide would turn tasteful concern into an actual conversation.`:null,
    trend?`${trend.p.name} is the form worth setting the good china for: ${one(trend.p.recent_form.last3_avg)} per game over the last three after ${one(trend.p.recent_form.prior3_avg)} in the prior sample for ${trend.t.team_name}. ${trend.p.recent_form.label==='hot'?'The performance has earned attention; permanence still has to survive the next few Sundays.':'The decline has lasted long enough to be impolite, and the next matchup is an opportunity to restore some decorum.'}`:null,
    ...playerPulse,...availability
  ].filter(Boolean);
  const original=o.sections||[],reporter=i=>original[i]?.reporter||null,tillyFallback=(original[2]?.paragraphs||[]).filter(p=>String(p||'').trim()&&String(p).trim()!=='n/a').slice(0,2);
  const matterBlocks=chosen.map((g,i)=>weeklyStoryBlock(g,i,!!topGame&&String(g.winner.roster_id)===String(topGame.winner.roster_id)&&String(g.loser.roster_id)===String(topGame.loser.roster_id)));
  const synthesis=leagueSynthesis(teams),texture=leagueTextureStory(teams);if(synthesis||texture)matterBlocks.push({heading:'The League-Wide Read',paragraphs:[synthesis,texture].filter(Boolean)});
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
      arr.push(`Filch’s evidence file is simple: this matchup can change the tone of the road ahead before it changes anything permanent in the standings. Bank it, and the next close game arrives with less pressure. Waste it, and the schedule gets a little less forgiving — and the docket gets heavier.`);
      return arr
    })()]:['The next-week slate is not complete enough to identify a featured matchup without inventing certainty.'];
  const nextBlocks=next?[{heading:`${next.a.team_name} vs. ${next.b.team_name} — Week ${Number(week)+1} Spotlight`,paragraphs:nextParagraphs}]:[];
  const sections=[
    {reporter:reporter(0),heading:'What Actually Mattered This Week',blocks:matterBlocks,paragraphs:matterBlocks.length?flattenBlocks(matterBlocks):['The week did not produce enough verified matchup detail for a responsible lead story.']},
    {reporter:reporter(1),heading:'The Velvet Rope: Form, Fortune and the Week’s Unfashionable Truths',paragraphs:velvet.length?velvet:['n/a']},
    {reporter:reporter(2),heading:'The Back Page Has Receipts',blocks:backPageBlocks,paragraphs:backPageParagraphs},
    {reporter:reporter(3),heading:'Next Week, Before Everyone Gets Smarter in Hindsight',blocks:nextBlocks,paragraphs:nextParagraphs}
  ];
  return {...o,inquirer_version:26,editorial_revision:3,sections};
}
