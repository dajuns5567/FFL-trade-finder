import {humanSectionsV23,selectImportantMoves,divisionCopy} from './inquirer-editorial-v23.mjs';

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
  const snaps=Number(s.def_snp??s.def_snaps??s.defensive_snaps);
  if(Number.isFinite(snaps))return {strong:snaps>=30,text:`${snaps} defensive snaps`};
  return null;
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
    if(parts.length){
      parts.push((carries||0)>=14||(targets||0)>=5?`${n} had enough work to make the production look tied to a real weekly role.`:`${n} did more with a lighter workload, so efficiency carried more of the afternoon.`);
      return parts.join(' ');
    }
  }
  if(pos==='WR'||pos==='TE'){
    const targets=Number(s.rec_tgt??s.targets),rec=Number(s.rec),yd=Number(s.rec_yd),td=Number(s.rec_td);
    if(Number.isFinite(targets)){
      const line=`${n} caught ${Number.isFinite(rec)?rec:0} of ${targets} targets for ${Number.isFinite(yd)?yd:0} yards${Number.isFinite(td)&&td>0?', scoring '+td+' '+plural(td,'touchdown'):''}.`;
      const tail=targets>=8?` ${n} commanded enough targets to sit at the center of the passing game.`:targets>=5?` ${n} had a meaningful share of the passing game.`:` ${n} made the most of a smaller target share.`;
      return line+tail;
    }
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
  if(bits.length||Number.isFinite(snaps)){
    let text=bits.length?`${n} finished with ${bits.join(', ')}.`:'';
    if(Number.isFinite(snaps))text+=` He played ${snaps} defensive snaps${snaps>=40?', a substantial role for the week':', so every splash play mattered a little more'}.`;
    return text.trim();
  }
  const line=String(p?.real_stat_line||'').replaceAll(' • ',', ');
  return line?`${n} finished with ${line}.`:null;
}
function scopedFootballRead(t,p,angle='matchup'){
  const raw=statSituation(p);if(!raw)return null;
  return String(raw).trim();
}

function playerTrajectory(p){
  const prior=Number(p?.prior_season_avg),priorGames=Number(p?.prior_season_games)||0,current=Number(p?.season_avg),games=Number(p?.season_games)||0,age=Number(p?.age),opp=opportunity(p),pos=String(p?.position||'').toUpperCase(),key=p?.id||p?.name;
  if(!Number.isFinite(prior)||prior<=0||priorGames<6||!Number.isFinite(current)||games<1)return null;
  const ratio=current/prior,oldThreshold=pos==='QB'?34:pos==='RB'?28:(pos==='WR'||pos==='TE')?30:29;
  if(games>=3&&Number.isFinite(age)&&age<=26&&ratio>=1.28&&opp?.strong)return {kind:'breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} has climbed to ${one(current)} per game after averaging ${one(prior)} across ${priorGames} games last season. This week’s ${opp.text} gave the surge enough football underneath it to look like more than a scoring fluke.`,
    `${p.name} is averaging ${one(current)} after sitting at ${one(prior)} across ${priorGames} games last year, and ${opp.text} kept the bigger production tied to a bigger role. That is how a hot start begins to look like an actual leap.`,
    `${p.name} is making last year’s ${one(prior)}-point average look small next to this season’s ${one(current)}, and ${opp.text} gave the jump real substance. The role changed enough to make the scoring change believable.`,
    `${p.name} has moved from ${one(prior)} per game last season to ${one(current)} this year, with ${opp.text} adding a real workload to the jump. That is more than a lucky touchdown streak.`
  ])};
  if(games===1&&Number.isFinite(age)&&age<=26&&ratio>=1.4&&opp?.strong)return {kind:'early-breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} opened far above last year’s ${one(prior)}-point average across ${priorGames} games, and ${opp.text} gave the production a real role behind it. Another week with that kind of involvement would make the change harder to dismiss.`,
    `${p.name} cleared last year’s ${one(prior)}-point average by a wide margin, and ${opp.text} made the opener look earned rather than accidental. If the workload survives next week, the conversation changes quickly.`,
    `${p.name} entered from a ${one(prior)}-point baseline across ${priorGames} games last year and opened this season much louder, with ${opp.text}. The role looked different enough to make the old expectation feel less comfortable.`,
    `${p.name} averaged ${one(prior)} across ${priorGames} games last year, then opened with a bigger score and ${opp.text}. Keep that job description for another Sunday and the old baseline starts looking stale.`
  ])};
  if(games>=3&&Number.isFinite(age)&&age>=oldThreshold&&ratio<=.68)return {kind:'decline',strength:1-ratio,text:keyedChoice(key,[
    `${p.name} has earned a real decline watch: ${one(current)} per game this season versus ${one(prior)} across ${priorGames} games last year. At age ${age}, wondering whether the old weekly floor is gone is fair; declaring him finished still outruns the evidence.`,
    `The uncomfortable veteran question belongs to ${p.name}. His current average is ${one(current)} after ${one(prior)} across ${priorGames} games last season. At age ${age}, the drop is large enough to investigate, not large enough to write the retirement column.`,
    `${p.name} is giving us a decline story worth monitoring. The production has fallen from ${one(prior)} across ${priorGames} games last year to ${one(current)} this season. Age ${age} makes the question louder, but role and usage still get the final say.`,
    `This is where “washed” becomes a question, not a verdict: ${p.name} sits at ${one(current)} per game after a ${one(prior)} average across ${priorGames} games last year. At age ${age}, the next few workloads matter more than the insult.`
  ])};
  if(games>=3&&Math.abs(ratio-1)<=.15&&prior>=8)return {kind:'reliable',strength:1-Math.abs(ratio-1),text:keyedChoice(key,[
    `${p.name} keeps doing the boring valuable thing: ${one(current)} per game this season after ${one(prior)} across ${priorGames} games last year. That is reliability, not a breakout, and contenders need plenty of it.`,
    `${p.name} is almost aggressively familiar: ${one(current)} per game now, ${one(prior)} across ${priorGames} games last year. The lack of drama is the point. A lineup spot you do not have to solve every Tuesday has real value.`,
    `The weekly floor around ${p.name} still looks intact. He is at ${one(current)} per game this season after ${one(prior)} across ${priorGames} games last year, which makes him less of a headline than a piece the roster can plan around.`,
    `${p.name} is supplying continuity rather than novelty: ${one(current)} per game this season compared with ${one(prior)} across ${priorGames} games last year. Reliable production rarely wins the group chat, but it keeps the lineup from needing rescue missions.`
  ])};
  if(games===1&&Math.abs(Number(p.points)-prior)<=Math.max(2,prior*.22)&&prior>=8)return {kind:'reliable',strength:1-Math.abs(Number(p.points)-prior)/prior,text:keyedChoice(key,[
    `${p.name} opened near the level already established last season, when he averaged ${one(prior)} across ${priorGames} games. Week 1 cannot prove ${p.name} reliable, but this looks more like continuation than reinvention.`,
    `${p.name} gave his team a familiar opening line. Last season’s baseline was ${one(prior)} over ${priorGames} games, and the opener landed in the same neighborhood. That is not exciting ${p.name} evidence; it is useful evidence.`,
    `There was nothing exotic about ${p.name}’s opener, which is a compliment. He averaged ${one(prior)} across ${priorGames} games last season and began this year near that level. The roster can treat ${p.name}’s opener as an early sign of continuity, not a guarantee.`,
    `${p.name} looked a lot like the player last season already taught us to expect: ${one(prior)} per game across ${priorGames} appearances, with Week 1 landing close to that baseline. Reliability for ${p.name} takes repetition, but this is a reasonable first brick.`
  ])};
  if(games===1&&Number(p.points)<=prior*.5)return {kind:'stumble',strength:1-Number(p.points)/prior,text:keyedChoice(key,[
    `${p.name} opened well below last year’s ${one(prior)}-point average across ${priorGames} games. One bad Sunday is not a decline by itself, but the role needs to look healthier next week.`,
    `${p.name} started the year far under the ${one(prior)}-point average he carried across ${priorGames} games last season. One bad opener does not make a decline trend, but it does put the next workload under a brighter light.`,
    `${p.name} opened a long way below the ${one(prior)}-point average he carried across ${priorGames} games last season. The production disappeared for a week; the career did not.`,
    `${p.name} opened far below the ${one(prior)}-point average he established across ${priorGames} games last season. One ugly ${p.name} Sunday does not erase that floor; next week’s role will show whether this was merely a stumble or the first sign of something worth worrying about.`
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
    out.push(`${tag}: ${x.tr.text}${situ?' '+situ:''} For ${x.t.team_name}, the player’s role now matters as much as the headline because that is what can carry this story into next week.`);
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
      [`The front-office file shows ${t.manager_name} bringing in ${add} and moving ${drop} out.`,`${t.manager_name} left a clean paper trail: ${add} arrived, ${drop} departed.`]
    ]));
    else if(add)bits.push(trade?deskChoice(moveTeam,reporter,[
      [`${t.manager_name} acquired ${add} by trade, so this is part of a roster bet rather than waiver-wire housekeeping.`,`${add} came to ${t.manager_name} through a trade, which gives every useful Sunday a little more context.`],
      [`${t.manager_name} traded for ${add}; one does not send assets across the table merely to decorate the bench.`,`${add} arrived by trade, and the price of admission means the role deserves to be watched.`],
      [`TRADE ARRIVAL: ${t.manager_name} brought in ${add}. This one came with a receipt, not a waiver claim.`,`${add} landed via trade, which makes the next few weeks part performance review, part trade follow-up.`],
      [`The transaction file is specific: ${t.manager_name} acquired ${add} in a trade.`,`${add} is a trade acquisition for ${t.manager_name}; subsequent production belongs in that deal’s evidence file.`]
    ]):deskChoice(moveTeam,reporter,[
      [`${t.manager_name} added ${add}, a move worth tracking beyond the transaction crawl.`,`${add} is the addition from ${t.manager_name} that earned space in the notebook.`],
      [`${t.manager_name} added ${add}; at least one waiver move came dressed for the column.`,`${add} joined ${t.manager_name}’s roster and, unlike most wire activity, deserves another look.`],
      [`${t.manager_name} went shopping and came home with ${add}. This one makes the back page.`,`ADD ALERT: ${t.manager_name} landed ${add}, a move loud enough to escape the ticker.`],
      [`The transaction file highlights ${t.manager_name} adding ${add}.`,`${t.manager_name}’s notable incoming evidence is ${add}.`]
    ]));
    else bits.push(deskChoice(moveTeam,reporter,[
      [`${t.manager_name} cut ${drop}; the replacement plan now matters.`,`${drop} is gone from ${t.manager_name}’s roster, which makes the next move worth watching.`],
      [`${t.manager_name} showed ${drop} the door. ${t.team_name} now has to prove that roster spot has a better use.`,`${drop} was removed from ${t.manager_name}’s guest list; an empty chair is not a strategy.`],
      [`CUT: ${t.manager_name} moved on from ${drop}. ${t.team_name} now has to show the replacement can give the lineup something the old spot did not.`,`${drop} is off the ${t.team_name} roster. Fine. The next move should make the reason obvious on Sundays.`],
      [`The file records ${t.manager_name} cutting ${drop}. The follow-up is what replaces that piece.`,`${drop} appears in the outgoing column for ${t.manager_name}; the inquiry now shifts to the replacement.`]
    ]));
    const incoming=m.add.filter(p=>valid(p.value)).sort((a,b)=>b.value-a.value)[0],outgoing=m.drop.filter(p=>valid(p.value)).sort((a,b)=>b.value-a.value)[0];
    if(incoming&&m.lineup)bits.push(deskChoice(moveTeam,reporter,[
      [`${incoming.name} went straight into the lineup, so the move already had a job attached to it.`,`${incoming.name} immediately drew a starting assignment; this was not a stash.`],
      [`${incoming.name} went directly into the lineup, an admirably decisive use of the new arrival.`,`The new arrival, ${incoming.name}, skipped the waiting room and started immediately.`],
      [`${incoming.name} HIT THE LINEUP IMMEDIATELY. That is a move with intent.`,`${incoming.name} was not brought in to collect dust; the starter card had his name on it right away.`],
      [`${incoming.name} appears on the starting card immediately after arrival. Intent is established.`,`The paperwork shows ${incoming.name} went straight from acquisition to starting lineup.`]
    ]));
    else if(incoming)bits.push(deskChoice(moveTeam,reporter,[
      [`${incoming.name} is the biggest incoming market piece at ${Math.round(incoming.value).toLocaleString('en-US')}; the next question is whether a role follows.`,`${incoming.name}, valued at ${Math.round(incoming.value).toLocaleString('en-US')}, is the addition with enough market weight to keep watching.`],
      [`${incoming.name} carries ${Math.round(incoming.value).toLocaleString('en-US')} of current value, expensive enough to merit more than decorative depth.`,`At ${Math.round(incoming.value).toLocaleString('en-US')} in current value, ${incoming.name} is not merely a charming bench accessory.`],
      [`${incoming.name} brings ${Math.round(incoming.value).toLocaleString('en-US')} of value with him. The roster now has to turn that market weight into an actual Sunday role.`,`The biggest incoming chip is ${incoming.name} at ${Math.round(incoming.value).toLocaleString('en-US')}; the back page awaits the role.`],
      [`${incoming.name} is the most substantial incoming asset at ${Math.round(incoming.value).toLocaleString('en-US')} in current value. A real Sunday role would make that market price feel less theoretical.`,`The incoming file is led by ${incoming.name}, currently worth ${Math.round(incoming.value).toLocaleString('en-US')}; the useful part now is whether the role matches the price.`]
    ]));
    if(outgoing&&(!incoming||Number(outgoing.value)>Number(incoming.value)*1.15))bits.push(deskChoice(moveTeam,reporter,[
      [`${outgoing.name} is the meaningful cost; that departure has to be replaced somewhere.`,`${outgoing.name} carries enough value out the door that the rest of the plan cannot be ignored.`],
      [`${outgoing.name} is the expensive goodbye. ${t.team_name} now has to make the vacancy more useful than the player it surrendered.`,`${outgoing.name} leaves the larger bill behind, which makes the replacement more than a matter of taste.`],
      [`${outgoing.name} IS THE COST. If ${t.team_name} improves from here, management will have a football answer instead of a transaction explanation.`,`Moving ${outgoing.name} out created a hole with his name on it. The replacement has to make ${t.team_name} stop missing him.`],
      [`${outgoing.name} is the material outgoing evidence. The replacement plan belongs in the next filing.`,`The cost side centers on ${outgoing.name}, a departure too substantial to wave away.`]
    ]));
    const addStar=m.add.filter(p=>valid(p.points)).sort((a,b)=>b.points-a.points)[0],dropStar=m.drop.filter(p=>valid(p.points)).sort((a,b)=>b.points-a.points)[0];
    if(addStar&&Number(addStar.points)>=10)bits.push(deskChoice(moveTeam,reporter,[
      [`${addStar.name} answered immediately with ${one(addStar.points)} points, useful first-week evidence for the move.`,`${one(addStar.points)} points from ${addStar.name} gave the transaction an immediate football reason to matter.`],
      [`${addStar.name} introduced himself with ${one(addStar.points)} points. A tasteful first return.`,`${one(addStar.points)} points from ${addStar.name} is the sort of debut that makes a transaction look well dressed.`],
      [`${addStar.name} PAID OUT IMMEDIATELY: ${one(addStar.points)} points.`,`${one(addStar.points)} points from ${addStar.name} gave management exactly the kind of instant headline it wanted.`],
      [`${addStar.name} produced ${one(addStar.points)} points immediately after the move. The first exhibit favors management.`,`The initial return is ${one(addStar.points)} points from ${addStar.name}; that belongs in the favorable evidence file.`]
    ]));
    else if(dropStar&&Number(dropStar.points)>=10)bits.push(deskChoice(moveTeam,reporter,[
      [`${dropStar.name} answered the cut with ${one(dropStar.points)} points, enough to keep the decision in next week’s notebook.`,`${one(dropStar.points)} points from departed ${dropStar.name} ensures this cut gets a follow-up.`],
      [`${dropStar.name} answered the move with ${one(dropStar.points)} points. That is enough to make ${t.manager_name} revisit the decision without pretending one Sunday settles it.`,`The departed ${dropStar.name} posted ${one(dropStar.points)} points, which is how an exit earns a second column.`],
      [`OF COURSE ${dropStar.name} SCORED ${one(dropStar.points)} AFTER THE CUT. See you next week.`,`${dropStar.name} left and immediately hung ${one(dropStar.points)} points on the board. For ${t.team_name}, that turns the cut into a decision worth tracking instead of a transaction-line footnote.`],
      [`${dropStar.name} produced ${one(dropStar.points)} points after the cut. That decision remains under review.`,`The outgoing ${dropStar.name} answered with ${one(dropStar.points)} points; the file stays open.`]
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
    [`${t.team_name} beat ${t.opponent_name} ${one(t.points)}–${one(t.opponent_points)}, with ${top.name} supplying ${one(top.points)} points at the center of it. The cleanest part of the argument is the scoreboard: ${record(t)}.`,`${t.team_name} closed the file on ${t.opponent_name}, ${one(t.points)}–${one(t.opponent_points)}. ${top.name} left ${one(top.points)} points of fingerprints all over the win.`]
  ]));
  else ps.push(deskChoice(t,r,[
    [`${t.team_name} fell ${one(t.points)}–${one(t.opponent_points)} to ${t.opponent_name}, and ${top.name}’s ${one(top.points)} points deserved better company. The record is ${record(t)}; the notebook has questions.`,`${top.name} gave ${t.team_name} ${one(top.points)} points, but ${t.opponent_name} still walked out with a ${one(t.opponent_points)}–${one(t.points)} win. File the ${record(t)} record and start the homework.`],
    [`${top.name} brought ${one(top.points)} points to the table; ${t.team_name} still lost ${one(t.points)}–${one(t.opponent_points)} to ${t.opponent_name}. An unpleasant result, elegantly documented.`,`${t.team_name} lost ${one(t.points)}–${one(t.opponent_points)}, a dreadful frame for ${top.name}’s ${one(top.points)}-point afternoon. The ${record(t)} record is not improved by good typography.`],
    [`${top.name} showed up with ${one(top.points)} points. The rest of the headline is uglier: ${t.opponent_name} beat ${t.team_name} ${one(t.opponent_points)}–${one(t.points)}.`,`${t.team_name} takes the loss, ${one(t.points)}–${one(t.opponent_points)}, while ${top.name} gets the only flattering type at ${one(top.points)} points.`],
    [`${t.team_name} lost ${one(t.points)}–${one(t.opponent_points)} to ${t.opponent_name}, even with ${one(top.points)} from ${top.name}. The problem was not the headliner; it was everything the lineup failed to build around him.`,`${top.name} left ${one(top.points)} points in the record, but ${t.team_name} still lost to ${t.opponent_name}, ${one(t.points)}–${one(t.opponent_points)}. The file now says ${record(t)}.`]
  ]));
  if(margin>0&&bad&&String(bad.id)!==String(top.id))ps.push(deskChoice(t,r,[
    [`${top.name} and the other leaders made ${bad.name}’s ${one(bad.points)}-point off day easy to forgive once. Next week offers a cleaner line in the notebook.`,`${bad.name} managed only ${one(bad.points)}, but the stars covered the bill. ${t.team_name} would rather see the supporting cast pay its share next week.`],
    [`${bad.name}’s ${one(bad.points)}-point afternoon was the ugly accessory nobody noticed because ${top.name} and company dressed the win so well. A repeat would be less charming.`,`The victory was generous enough to hide ${bad.name} at ${one(bad.points)}. Good teams accept the gift and ask for better tailoring next Sunday.`],
    [`${bad.name} gave ${t.team_name} only ${one(bad.points)}, and the superstars made sure it stayed a footnote. Consider next week the comeback headline audition.`,`${bad.name} disappeared into a ${one(bad.points)}-point afternoon. The win survived it; the back page will notice faster if it happens twice.`],
    [`${bad.name} managed only ${one(bad.points)}, and the win kept it from becoming the story. Another week like that would be harder for ${t.team_name} to hide.`,`The evidence includes a quiet ${one(bad.points)} from ${bad.name}; the result kept it from becoming an indictment. For now.`]
  ]));
  else if(second)ps.push(deskChoice(t,r,[
    [`${top.name} had company from ${second.name}, which made the top of the lineup feel like a story rather than a solo act.`,`${second.name} was the next name that mattered behind ${top.name}. That is useful support behind the headline.`],
    [`${second.name} supplied the supporting performance behind ${top.name}; even a star appreciates competent company.`,`${top.name} owned the marquee, with ${second.name} doing enough nearby to keep the production from becoming a one-person salon.`],
    [`${second.name} joined ${top.name} among the names worth printing. Two headline performances made the lineup considerably harder to flatten.`,`${top.name} got the biggest type, but ${second.name} earned ink too. That is how a lineup starts sounding dangerous.`],
    [`${second.name} gave ${top.name} meaningful company, which kept ${t.team_name} from leaning on a single scorer all afternoon.`,`${top.name} led the testimony, with ${second.name} supplying corroboration that actually mattered.`]
  ]));
  return ps;
}

function playerSection(t,r){
  const rows=list(t),top=rows[0],ps=[];if(!top)return ['n/a'];
  const topThree=rows.slice(0,3),bad=rows.filter(p=>delta(p)!=null&&delta(p)<-4).sort((a,b)=>delta(a)-delta(b))[0],support=names(topThree.slice(1));
  ps.push(deskChoice(t,r,[
    [`${top.name} led ${t.team_name} with ${one(top.points)} fantasy points. ${support?support+' supplied the best support behind him.':''}`,`${one(top.points)} made ${top.name} the first name in the notebook. ${support?'The next useful names were '+support+'.':''}`],
    [`${top.name} gets the good china after ${one(top.points)} fantasy points. ${support?support+' made respectable company.':''}`,`${one(top.points)} from ${top.name} was the elegant part of the card. ${support?'Behind that, '+support+' kept the table from looking bare.':''}`],
    [`PUT ${top.name.toUpperCase()} IN THE BIG TYPE: ${one(top.points)} fantasy points. ${support?support+' earned space below the fold.':''}`,`${top.name} owned the player page with ${one(top.points)} fantasy points. ${support?'The supporting headline goes to '+support+'.':''}`],
    [`${top.name} gave ${t.team_name} ${one(top.points)} fantasy points, the best line on the roster. ${support?support+' supplied enough behind him to keep the afternoon from becoming a solo act.':''}`,`${top.name} was the clear centerpiece at ${one(top.points)} fantasy points. ${support?support+' mattered around him too.':''}`]
  ]));
  if(bad&&String(bad.id)!==String(top.id))ps.push(deskChoice(t,r,[
    [`${bad.name} finished at ${one(bad.points)} against a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The win kept that miss in the margins; another week may not.':'In a loss, that quiet slot earns a longer look.'}`,`${bad.name} never found the expected afternoon, ${one(bad.points)} against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'The stars covered for it this time.':'The loss gave the miss nowhere to hide.'}`],
    [`${bad.name} supplied only ${one(bad.points)} against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'The victory makes that forgivable, not fashionable.':'That is the kind of detail a loss refuses to accessorize away.'}`,`${one(bad.points)} from ${bad.name}, against ${one(bad.projected)} projected, was the part of the card we would politely send back. ${Number(t.points)>Number(t.opponent_points)?'Winning bought grace.':'Losing did not.'}`],
    [`${bad.name} landed at ${one(bad.points)} after a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The rest of the lineup kept it out of the headline.':'The final score dragged it straight onto the back page.'}`,`${bad.name} missed the expected mark, ${one(bad.points)} against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'Call it a warning under a winning headline.':'Call it one of the places the loss went missing.'}`],
    [`${bad.name} gave ${t.team_name} only ${one(bad.points)} against a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The win covered it; the same miss in a close loss would feel much louder.':'That shortfall belongs in the explanation for the loss.'}`,`${bad.name} finished ${one(Number(bad.projected)-Number(bad.points))} points under projection. ${Number(t.points)>Number(t.opponent_points)?'This time, the rest of the lineup made it survivable.':'This time, it mattered.'}`]
  ]));
  const topContext=playerContextParagraph(top);if(topContext)ps.push(topContext);
  if(bad&&String(bad.id)!==String(top.id)){const badContext=playerContextParagraph(bad);if(badContext)ps.push(badContext)}
  const trajectoryRows=rows.map(p=>({p,tr:playerTrajectory(p)})).filter(x=>x.tr).sort((a,b)=>{const priority={breakout:5,'early-breakout':4,decline:4,reliable:3,stumble:2};return (priority[b.tr.kind]||0)-(priority[a.tr.kind]||0)||Number(b.tr.strength)-Number(a.tr.strength)}),used=new Set();
  for(const x of trajectoryRows){if(used.has(String(x.p.id)))continue;used.add(String(x.p.id));ps.push(x.tr.text);if(used.size>=2)break}
  return ps;
}
function hotCool(t,kind,r){
  const rows=list(t).filter(p=>delta(p)!=null);if(!rows.length)return ['n/a'];
  if(kind==='hot-seat'){
    const p=rows.slice().sort((a,b)=>delta(a)-delta(b))[0],d=delta(p);if(d>=-2)return ['n/a'];
    return [deskChoice(t,r,[
      [`${p.name} gets the Hot Seat after ${one(p.points)} points left ${t.team_name} wanting more. ${Number(t.points)>Number(t.opponent_points)?'The win buys patience; another quiet Sunday may not.':'The loss makes the quiet afternoon harder to shrug off.'}`],
      [`${p.name} occupies the uncomfortable chair after ${one(p.points)} points. ${Number(t.points)>Number(t.opponent_points)?'Winning makes it forgivable, briefly.':'Losing makes it memorable.'}`],
      [`HOT SEAT: ${p.name}, ${one(p.points)} points and a Sunday worth deleting from the camera roll. ${Number(t.points)>Number(t.opponent_points)?'The team won anyway. Do not test that magic twice.':'The team lost, so the angry font is justified.'}`],
      [`${p.name} gets the uncomfortable mention after ${one(p.points)} points. ${Number(t.points)>Number(t.opponent_points)?'${t.team_name} survived it once.':'In a loss, that kind of miss becomes part of the story.'}`]
    ])];
  }
  const p=rows.slice().sort((a,b)=>delta(b)-delta(a))[0],d=delta(p);if(d<=2)return ['n/a'];
  return [deskChoice(t,r,[
    [`${p.name} gets the Cool Throne after ${one(p.points)} gave ${t.team_name} a performance worth keeping. ${Number(t.points)>Number(t.opponent_points)?'It belonged in the win.':'The loss could not bury it.'}`],
    [`${p.name} takes the Cool Throne with ${one(p.points)} points and, for once, tasteful excess.`],
    [`COOL THRONE: ${p.name}, ${one(p.points)} points, no further lobbying required.`],
    [`${p.name} earns the comfortable chair after ${one(p.points)} points. ${Number(t.points)>Number(t.opponent_points)?'That was winning work.':'That was good work trapped in a bad result.'}`]
  ])];
}
function sentiment(t,r){
  const margin=Number(t.points)-Number(t.opponent_points),top=list(t)[0],m=t.mida_outlook,ps=[];
  ps.push(margin>0?deskChoice(t,r,[
    [`${t.team_name} fans can live with a ${one(margin)}-point win over ${t.opponent_name}. ${margin>20?'Enjoy the clipping before inventing a problem.':'Close wins leave nicer questions than close losses.'}`],
    [`${t.team_name} supporters may enjoy the ${one(margin)}-point win with only the minimum theatrical restraint. ${top?top.name+' gave them a centerpiece worth admiring.':''}`],
    [`${t.team_name} won by ${one(margin)}, so the group chat has become unbearable in the correct direction. ${top?top.name+' supplied the easiest name to shout.':''}`],
    [`${t.team_name} supporters get to enjoy a ${one(margin)}-point win over ${t.opponent_name}. ${top?top.name+' did enough to keep the argument pleasant.':''}`]
  ]):deskChoice(t,r,[
    [`${t.team_name} fans will replay the ${one(Math.abs(margin))}-point loss all week. ${top?top.name+' at least gave them something worth keeping.':''}`],
    [`The mood around ${t.team_name} is exactly as elegant as a ${one(Math.abs(margin))}-point loss deserves. ${top?top.name+' provided one respectable detail.':''}`],
    [`${t.team_name} lost by ${one(Math.abs(margin))}, so the group chat has moved directly to capital letters. ${top?top.name+' is spared the angry font.':''}`],
    [`${t.team_name} supporters have a ${one(Math.abs(margin))}-point loss to chew on all week. ${top?top.name+' is not where the blame starts.':''}`]
  ]));
  if(m&&valid(m.playoff)){
    const p=Number(m.playoff);
    if(p>=70)ps.push(deskChoice(t,r,[
      [`${t.team_name} is already around ${one(p)}% to make the playoffs, high enough that merely looking interesting is not the standard.`],
      [`A ${one(p)}% playoff outlook puts ${t.team_name} at the serious table. The china may stay out if the wins follow.`],
      [`${one(p)}% playoff odds are too loud for timid expectations. ${t.team_name} is supposed to matter.`],
      [`At roughly ${one(p)}% to reach the playoffs, ${t.team_name} has earned expectation along with attention.`]
    ]));
    else if(p<20)ps.push(deskChoice(t,r,[
      [`At roughly ${one(p)}% to make the playoffs, ${t.team_name} does not have many comfortable losses left.`],
      [`${one(p)}% playoff odds leave ${t.team_name} with a very small invitation and very little room to waste it.`],
      [`${one(p)}% playoff odds mean the font stays small until ${t.team_name} starts stacking wins.`],
      [`${t.team_name} sits around ${one(p)}% to reach the playoffs. The easiest way to improve that number is also the least mysterious: win.`]
    ]));
  }
  return ps;
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
      [`${t.team_name} is around ${one(p)}% to reach the playoffs${Number.isFinite(title)?' and '+one(title)+'% to win the championship':''}. That is expectation territory now.`],
      [`A ${one(p)}% playoff outlook gives ${t.team_name} a seat at the serious table${Number.isFinite(title)?', with '+one(title)+'% title odds beside it':''}.`],
      [`${one(p)}% playoff odds are too loud for ${t.team_name} to settle for interesting losses.`],
      [`${t.team_name} sits around ${one(p)}% to make the playoffs. A roster with that much early-season promise should be collecting wins.`]
    ]));
    else if(p<20)ps.push(deskChoice(t,r,[
      [`${t.team_name} is around ${one(p)}% to reach the playoffs. The runway is already short enough that winnable weeks matter.`],
      [`At roughly ${one(p)}% playoff odds, ${t.team_name} has very little room for decorative losses.`],
      [`${one(p)}% playoff odds keep the font small for ${t.team_name} until the wins get louder.`],
      [`${t.team_name} sits around ${one(p)}% to make the playoffs. The next useful result needs to be a win.`]
    ]));
  }
  const div=divisionStory(t,r);if(div)ps.push(div);
  return ps.length?ps:['n/a'];
}

function seasonContextStoryV26(t,r){
  const ctx=t.league_context||{},rank=Number(ctx.standings_rank),size=Number(ctx.league_size)||32,st=ctx.streak||{},week=Number(t.week_classification?.week)||1,
    recent=Number(ctx.recent_avg_points),prior=Number(ctx.prior_five_avg_points);
  const rankText=Number.isFinite(rank)?` No. ${rank} of ${size}.`:'';
  const streakText=Number(st.length)>=2?` ${t.team_name} also carries a ${Number(st.length)}-game ${st.type==='W'?'winning':st.type==='L'?'losing':'result'} streak.`:'';
  const form=(week>=3&&Number.isFinite(recent)&&Number.isFinite(prior)&&prior>0&&Math.abs(recent-prior)>=4)?` Recent scoring sits at ${one(recent)} per game versus ${one(prior)} in the preceding stretch.`:'';
  return deskChoice(t,r,[
    [`${t.team_name} is ${record(t)} after Week ${week}.${rankText}${streakText}${form} The record is young, but the next Sunday already carries a little more weight.`],
    [`${t.team_name} leaves Week ${week} at ${record(t)}.${rankText}${streakText}${form} Much too early for a coronation; exactly early enough for consequence.`],
    [`${t.team_name.toUpperCase()} IS ${record(t)}.${rankText}${streakText}${form} Keep the parade route folded, but nobody has to apologize for enjoying the scoreboard.`],
    [`${t.team_name} is ${record(t)} through Week ${week}.${rankText}${streakText}${form} Nothing is settled, and the next matchup still got more expensive.`]
  ]);
}

function currentOpponentFootballStory(t,r){
  const o=t.opponent_roster,rows=(o?.starters||o?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const star=rows[0],second=rows[1];if(!star)return null;
  const starLine=scopedFootballRead(t,star,'opponent'),won=Number(t.points)>Number(t.opponent_points),support=second?` ${second.name} added ${one(second.points)}.`:'';
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
  const top3=rows.slice(0,3),top3pts=top3.reduce((n,p)=>n+Number(p.points||0),0),share=Number(t.points)>0?top3pts/Number(t.points):0,projDelta=valid(t.projected)?Number(t.points)-Number(t.projected):null;
  const shape=share>=.58
    ?`${t.team_name} got about ${Math.round(share*100)}% of its scoring from the top three starters. The stars did the heavy lifting.`
    :`${t.team_name} got about ${Math.round(share*100)}% of its scoring from the top three starters, leaving enough elsewhere to keep the lineup from becoming a three-man act.`;
  const expectation=projDelta==null?'':Math.abs(projDelta)<6
    ?`${t.team_name} landed close to its pregame projection, more normal operation than eruption.`
    :projDelta>0
      ?`${t.team_name} beat its projection by ${one(Math.abs(projDelta))}, with enough extra scoring to change the shape of the matchup.`
      :`${t.team_name} finished ${one(Math.abs(projDelta))} below projection, leaving expected production on the table.`;
  return [shape,expectation].filter(Boolean).join(' ');
}

function supportingCastFootballStory(t,r){
  const rows=list(t),second=rows[1],third=rows[2];if(!second)return null;
  const pieces=[];
  for(const p of [second,third].filter(Boolean)){
    const ctx=scopedFootballRead(t,p,'supporting-cast'),prior=Number(p.prior_season_avg),priorGames=Number(p.prior_season_games)||0;
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
  const miss=t.best_lineup_miss,w=t.worst_starter,b=t.best_bench;
  if(miss?.reserve&&miss?.starter&&Number.isFinite(Number(miss.gap))&&Number(miss.gap)>0){
    const slot=miss.slot||miss.starter.lineup_slot||'lineup';
    return deskChoice(t,r,[
      [`${miss.reserve.name} could have replaced ${miss.starter.name} at ${slot} and scored ${one(miss.gap)} more. ${t.manager_name} survived that call this week; the next close matchup may be less forgiving.`],
      [`${miss.reserve.name} was available for ${miss.starter.name}’s ${slot} spot and outscored him by ${one(miss.gap)}. A civilized manager calls that something to remember, not something to confess.`],
      [`LINEUP RECEIPT: ${miss.reserve.name} could have been in ${miss.starter.name}’s ${slot} spot and left ${one(miss.gap)} extra points on the bench. That one will be louder if the same choice appears next Sunday.`],
      [`${miss.reserve.name} had a path into ${miss.starter.name}’s ${slot} spot and scored ${one(miss.gap)} more. ${t.team_name} had a better lineup available; whether it mattered to the result is the only mercy.`]
    ]);
  }
  if(w&&b)return deskChoice(t,r,[
    [`${w.name} was the quietest starter and ${b.name} led the bench, but there was no clean eligible swap large enough to rewrite the result. ${t.team_name} needed better production more than a different click.`],
    [`${b.name} owned the bench headline while ${w.name} had the softest starting return. There was no obvious legal swap large enough to change the story.`],
    [`${b.name} led the bench and ${w.name} gave the starting lineup very little. No obvious eligible swap fixes that after the fact; sometimes the roster simply needed more from the people already in the game.`],
    [`${b.name} outscored the bench while ${w.name} struggled in the lineup, but there was no straightforward eligible replacement that rewrites Sunday.`]
  ]);
  return null;
}

function chairFootballStory(t,kind,r){
  const rows=list(t).filter(p=>delta(p)!=null);if(!rows.length)return null;
  const p=kind==='hot-seat'?rows.slice().sort((a,b)=>delta(a)-delta(b))[0]:rows.slice().sort((a,b)=>delta(b)-delta(a))[0];
  if(!p)return null;
  const ctx=scopedFootballRead(t,p,kind),prior=Number(p.prior_season_avg),priorGames=Number(p.prior_season_games)||0;
  let hist='';
  if(Number.isFinite(prior)&&prior>0&&priorGames>=6){
    if(Number(p.points)<prior*.6)hist=keyedChoice((p.id||p.name)+'low',[`${p.name} averaged ${one(prior)} across ${priorGames} games last season, which makes this look more like a bad Sunday than a vanished floor.`,`Last year, ${p.name} usually gave this roster ${one(prior)} per game. Week 1 came in well below that.`,`${p.name} opened a long way beneath his ${one(prior)}-point 2025 average; one game is not enough to erase the older standard.`]);
    else if(Number(p.points)>prior*1.3)hist=keyedChoice((p.id||p.name)+'high',[`${p.name} opened well above the ${one(prior)}-point average he carried last season.`,`That was a bigger ${p.name} afternoon than the ${one(prior)} per game he averaged in 2025.`,`${p.name} cleared his established ${one(prior)}-point baseline by enough to make the opener stand out.`]);
    else hist=keyedChoice((p.id||p.name)+'same',[`${p.name} landed close to the ${one(prior)}-point level he established last season.`,`This looked familiar from ${p.name}, who averaged ${one(prior)} across ${priorGames} games in 2025.`,`${p.name} opened near his established 2025 scoring level.`]);
  }
  return [ctx,hist].filter(Boolean).join(' ')||null;
}

function nextOpponentFootballStory(t,r){
  const o=t.next_opponent_roster,rows=(o?.starters||o?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),star=rows[0],second=rows[1];
  if(!o||!star)return null;
  const ctx=scopedFootballRead(t,star,'next-opponent'),opp=t.next_opponent_name||o.team_name,rec=t.next_opponent_context?.record,playoff=Number(t.next_opponent_mida?.playoff),support=second?` ${second.name} added ${one(second.points)}.`:'';
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
  const count=tx.length,won=Number(t.points)>Number(t.opponent_points);
  return deskChoice(t,r,[
    [`${t.manager_name} made ${count} notable roster move${count===1?'':'s'} around this matchup. ${won?'${t.team_name} won, so the changes get to settle in under a good result.':'The loss means those choices will be judged against a roster that already needed more help.'}`],
    [`${count===1?'One roster change':'Those '+count+' roster changes'} gave ${t.manager_name} something new to live with. ${won?'A win is a pleasant place to let the experiment breathe.':'A loss tends to make every rearranged chair look more important.'}`],
    [`${t.manager_name.toUpperCase()} MOVED THE ROSTER ${count===1?'ONCE':count+' TIMES'}. ${won?'${t.team_name} got the win, which is the nicest possible first headline.':'The result was a loss, so the new configuration does not get a quiet opening week.'}`],
    [`${t.manager_name} changed the roster ${count===1?'once':count+' times'} around Week 1. ${won?'${t.team_name} won with the new arrangement in place.':'The loss puts a little more pressure on those changes to produce something useful quickly.'}`]
  ]);
}

function managementImpactStory(t,r){
  const facts=t.transaction_player_facts||{},clean={...t,transactions:consolidateTransactions(t)},moves=selectImportantMoves(clean,facts);if(!moves.length)return null;
  const m=moves[0],incoming=(m.add||[]).filter(p=>valid(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],outgoing=(m.drop||[]).filter(p=>valid(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],
    add=names(m.add||[]),drop=names(m.drop||[]),trade=String(m.move?.type||'').toLowerCase()==='trade';
  if(trade&&incoming&&outgoing)return deskChoice(t,r,[
    [`${incoming.name} gave ${t.team_name} ${one(incoming.points)} points after the move, while ${outgoing.name} scored ${one(outgoing.points)} on the other side. That is an opening-week snapshot of the trade, not a lifetime verdict, but it already gave both managers something concrete to argue about.`],
    [`${incoming.name} opened the new arrangement with ${one(incoming.points)} points; ${outgoing.name} answered with ${one(outgoing.points)}. The exchange already has a little drama, which is terribly considerate of them.`],
    [`TRADE SCOREBOARD: ${incoming.name} ${one(incoming.points)}, ${outgoing.name} ${one(outgoing.points)}. ${t.team_name} did not make the move for polite conversation, and Week 1 immediately gave it something to print.`],
    [`${incoming.name} produced ${one(incoming.points)} for ${t.team_name}; ${outgoing.name} returned ${one(outgoing.points)} elsewhere. The comparison is already useful because both players had real Sunday roles, not because one week settles the deal.`]
  ]);
  if(incoming)return deskChoice(t,r,[
    [`${incoming.name} immediately gave ${t.team_name} ${one(incoming.points)} points. The move already affected the lineup instead of sitting harmlessly on the transaction log.`],
    [`${incoming.name} arrived and produced ${one(incoming.points)} right away. At least the new guest understood the dress code.`],
    [`${incoming.name} showed up with ${one(incoming.points)} points. That is how a new arrival earns another week in large type.`],
    [`${incoming.name} produced ${one(incoming.points)} immediately after arriving. ${t.team_name} got an actual football return from the move in Week 1.`]
  ]);
  if(outgoing)return deskChoice(t,r,[
    [`${outgoing.name} scored ${one(outgoing.points)} after leaving ${t.team_name}. One Sunday does not make the decision wrong, but it keeps the departure from disappearing quietly.`],
    [`${outgoing.name} left and promptly scored ${one(outgoing.points)}. An inelegant little reminder that exits can still send postcards.`],
    [`${outgoing.name} ANSWERED THE EXIT WITH ${one(outgoing.points)}. ${t.team_name} gets to live with that headline until the replacement gives it a better one.`],
    [`${outgoing.name} produced ${one(outgoing.points)} after the move. That makes the replacement plan more interesting than the transaction itself.`]
  ]);
  return add||drop?deskChoice(t,r,[
    [`${t.team_name} changed the roster with ${add||drop}. The football consequence has not arrived yet, so the move remains background until a role appears.`],
    [`${add||drop} changed the guest list for ${t.team_name}. The next meaningful development will happen in a lineup, not on the transaction page.`],
    [`${t.team_name} changed the names on the roster with ${add||drop}. Fine. Now make it matter on Sunday.`],
    [`${t.team_name} made the move involving ${add||drop}; the roster will make the argument from here.`]
  ]):null;
}

function broadcastExpansionV26(t,kind,r){
  if(kind==='lede')return [seasonContextStoryV26(t,r),teamScoreConstructionStory(t,r),currentOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='players')return [supportingCastFootballStory(t,r)].filter(Boolean);
  if(kind==='management')return [lineupProcessStory(t,r),managementImpactStory(t,r),managementNarrativeCoda(t,r)].filter(Boolean);
  if(kind==='outlook')return [nextOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='hot-seat'||kind==='cool-throne')return [chairFootballStory(t,kind,r)].filter(Boolean);
  return [];
}

function reporterExpansionV26(t,kind,r){return broadcastExpansionV26(t,kind,r)}

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
    ['The win survived it; the back page will notice faster if it happens twice.',team+' survived it once; the back page will notice faster if the same problem happens twice.'],
    ['The replacement plan belongs in the next filing.',team+' owes the next filing a real replacement plan.'],
    ['The next game will tell us more about how bankable this role is.',team+' gets another look next game, when the role should tell us how bankable this production really is.'],
    ['The door is open without being held for them. A civilized winning streak would be lovely.','The door is open for '+team+' without being held. A civilized winning streak would be lovely.'],
    ['The back-page prescription is obvious—quit making the rivals do the saving.','The back-page prescription for '+team+' is obvious—quit making the rivals do the saving.'],
    ['That makes this week part of the deal’s ongoing return, not an isolated box score.','For '+team+', that makes this week part of the deal’s ongoing return rather than an isolated box score.'],
    ['That is how you get above the fold.','For '+team+', that is how a player gets above the fold.'],
    ['That is how a lineup starts sounding dangerous.','That is how the '+team+' lineup starts sounding dangerous.'],
    ['Print the 1-0 record large enough for the rival chat.','Print '+team+'’s 1-0 record large enough for the rival chat.'],
    ['His production is now evidence in a transaction that remains open for review.','That production is now evidence in a '+team+' transaction that remains open for review.'],
    ['Depending on rival charity twice in a row would be terribly unbecoming.',team+' depending on rival charity twice in a row would be terribly unbecoming.'],
    ['Call it a warning under a winning headline.','For '+team+', call it a warning under a winning headline.'],
    ['Call it one of the places the loss went missing.','For '+team+', call it one of the places the loss went missing.'],
    ['A two-week run can still change the whole conversation.','A two-week '+team+' run can still change the whole conversation.'],
    ['A little more ground next week and we may discuss the table with the good china.','A little more '+team+' ground next week and we may discuss the table with the good china.'],
    ['A 1-0 start looks rather nicer in ink.',team+'’s 1-0 start looks rather nicer in ink.'],
    ['The verdict was still a win, so the inquiry stays informal.',team+' still got the win, so the inquiry stays informal.'],
    ['The notebook version is shorter: the next loss would make the chase considerably uglier.','The '+team+' notebook version is shorter: the next loss would make the chase considerably uglier.'],
    ['The loss made the miss part of it.',team+'’s loss made the miss part of the story.'],
    ['The loss gave the miss nowhere to hide.',team+'’s loss gave the miss nowhere to hide.'],
    ['The invitation is written in very small print. Winning remains the tasteful response.','The '+team+' invitation is written in very small print. Winning remains the tasteful response.'],
    ['The evidence shows an opening; next week determines whether it becomes position or merely circumstance.',team+' has an opening; next week determines whether it becomes position or merely circumstance.'],
    ['The evidence is thin enough that every dropped opportunity becomes material.',team+' has thin enough evidence that every dropped opportunity becomes material.'],
    ['That is the kind of detail a loss refuses to accessorize away.','That is the kind of '+team+' detail a loss refuses to accessorize away.'],
    ['File the 0-1 record and start the homework.','File '+team+' at 0-1 and start the homework.'],
    ['After that, every expensive accessory has to reveal whether it can actually play.','After kickoff, every expensive '+team+' accessory has to reveal whether it can actually play.'],
    ['A losing lineup cannot pretend it did not matter.','A losing '+team+' lineup cannot pretend it did not matter.'],
    ['A few clean wins would make the paperwork friendlier.','A few clean '+team+' wins would make the paperwork friendlier.'],
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
    ['One week never closes a case, but every result changes what the next one is allowed to mean.','One '+team+' week never closes a case, but this result changes what the next one is allowed to mean.'],
    ['Next week is a good time to lower the volume.','For '+team+', next week is a good time to lower the volume.'],
    ['That witness cannot be lost in the crowd.',team+' cannot afford to lose that witness in the crowd.'],
    ['The next file already has a lead witness.',team+' already has a lead witness clipped to the next file.'],
    ['The appointment has enough actual Week 1 form to be more interesting than whatever the forecast says over cocktails.',team+' gets an appointment with enough actual Week 1 form to be more interesting than whatever the forecast says over cocktails.'],
    ['The distinction matters because Filch prosecutes available choices, not impossible bench swaps.','For '+team+', the distinction matters because Filch prosecutes available choices, not impossible bench swaps.']
  ];
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
    [`${p.name} was acquired by trade${when}${partner?' from '+partner:''}${price}. His production now belongs in the ongoing judgment of that move.`]
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
  return (sections||[]).map(s=>({
    ...s,
    paragraphs:(s.paragraphs||[]).map(p=>{
      const parts=String(p||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean),keep=[];
      for(const sentence of parts){
        const key=sentence.toLowerCase().replace(/\s+/g,' ').trim();
        if(key&&seen.has(key))continue;
        if(key)seen.add(key);
        keep.push(sentence);
      }
      return keep.join(' ');
    }).filter(Boolean)
  }));
}

export function humanSectionsV25(args){
  const {team:t,facts={}}=args,base=humanSectionsV23({...args,team:{...t,transactions:[]}}),mgmt=management(t,facts,args.reporter);
  const rewritten=base.map(s=>{
    let paragraphs;
    if(s.kind==='lede')paragraphs=naturalLede(t,args.reporter);
    else if(s.kind==='players')paragraphs=playerSection(t,args.reporter);
    else if(s.kind==='management')paragraphs=mgmt;
    else if(s.kind==='value')paragraphs=valueSectionV26(t,args.reporter);
    else if(s.kind==='outlook')paragraphs=outlook(t,args.week,args.reporter);
    else if(s.kind==='sentiment')paragraphs=sentiment(t,args.reporter);
    else if(s.kind==='hot-seat')paragraphs=hotCool(t,'hot-seat',args.reporter);
    else if(s.kind==='cool-throne')paragraphs=hotCool(t,'cool-throne',args.reporter);
    else paragraphs=[...(s.paragraphs||[])];
    if(paragraphs.length&&paragraphs[0]!=='n/a'){
      if(s.kind==='players'){const traded=list(t).find(p=>p.acquisition);const callback=traded?acquisitionCallback(t,traded,args.reporter):null;if(callback)paragraphs.push(callback)}
      paragraphs.push(...reporterExpansionV26(t,s.kind,args.reporter));
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
  if(slot===1)return w.team_name+' walks into next week '+(Number(wr.wins)||0)+'-'+(Number(wr.losses)||0)+', and that record gives it the luxury of building instead of repairing. '+l.team_name+' is '+(Number(lr.wins)||0)+'-'+(Number(lr.losses)||0)+', where another close loss would start making every future toss-up feel less optional. '+playoffLine+[wdiv,ldiv].filter(Boolean).join(' ');
  if(slot===2)return 'For '+w.team_name+', the value of this result is the freedom it buys later: one banked win is one fewer rescue mission the schedule has to provide. For '+l.team_name+', the road narrows by exactly one opportunity, which is why the next favorable matchup matters more now than it did a week ago. '+playoffLine+[wdiv,ldiv].filter(Boolean).join(' ');
  if(slot===3)return playoffLine+'The winner gets to spend the next week talking about how to build on the result; the loser has to spend it explaining what must change. That difference sounds small in September and feels much larger when the middle of the season starts charging interest. '+[wdiv,ldiv].filter(Boolean).join(' ');
  return w.team_name+' earned the pleasant version of the future: keep stacking ordinary wins and let somebody else chase. '+l.team_name+' now needs a response before this becomes the kind of early loss that shows up again when playoff math gets uncomfortable. '+playoffLine+[wdiv,ldiv].filter(Boolean).join(' ');
}

function matchupRead(g,slot=0){
  const w=g.winner,l=g.loser,star=list(w)[0],support=list(w)[1],loserStar=list(l)[0];
  const reads=[
    `The larger football read is that ${w.team_name} found a shape it can try to repeat: ${star?star.name+' as the headliner':''}${star&&support?' with '+support.name+' keeping the offense from becoming predictable':''}. ${l.team_name} now has to decide whether the loss exposed a real roster weakness or merely an afternoon it can correct.`,
    `${w.team_name} leaves with more than a result; it leaves with a clearer idea of who can be trusted when a matchup tightens. ${l.team_name}, meanwhile, has to make sure ${loserStar?loserStar.name+' is not left carrying the useful parts of the lineup alone':'the same weak spots do not survive into next week'}.`,
    `The score matters, but the football underneath it matters longer. ${w.team_name} showed a version of itself that can travel if the same roles hold. ${l.team_name} has a week to prove the losing version was temporary rather than an early identity problem.`,
    `The result matters because it changes the questions each team gets to ask next. ${w.team_name} can spend the week refining something that worked; ${l.team_name} has to spend it identifying which lineup spots, roles or roster bets cannot be allowed to fail the same way again.`,
    `There is enough here for both teams to carry forward. ${w.team_name} gets evidence that its best players can define a matchup without the whole roster becoming fragile. ${l.team_name} gets a sharper picture of which pieces must rebound before the schedule makes the lesson more expensive.`
  ];
  return reads[slot%reads.length];
}

function gameStory(g,slot=0){
  const star=list(g.winner)[0],loserStar=list(g.loser)[0],winnerSupport=list(g.winner)[1],loserMiss=list(g.loser).filter(p=>delta(p)!=null).sort((a,b)=>delta(a)-delta(b))[0],starContext=star?playerContextParagraph(star):'',starTrajectory=star?playerTrajectory(star):null,loserContext=loserStar?playerContextParagraph(loserStar):'',projectionContext=g.upset&&valid(g.winner.projected)&&valid(g.loser.projected)?` ${g.winner.team_name} entered projected at ${one(g.winner.projected)} against ${one(g.loser.projected)} for ${g.loser.team_name}, so this was a real reversal of the pregame expectation rather than an upset invented after the score.`:'';
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
      'The upset matters because it was earned from more than one place, which gives the winner something more useful than a lucky headline.',
      'Now the winner gets to prove this was the beginning of an identity rather than one excellent afternoon.',
      'The loser gets a reminder, the winner gets a little belief, and the rest of the league gets one more reason to stop penciling in results before kickoff.'
    ][slot%5];
    return open+(star?star.name+' led the winning side with '+one(star.points)+' points. ':'')+supportLine+(loserStar?loserStar.name+' answered with '+one(loserStar.points)+' for '+g.loser.team_name+'. ':'')+(loserMiss&&loserMiss.name!==loserStar?.name?loserMiss.name+' is the name that will bother the losing side after finishing at '+one(loserMiss.points)+'. ':'')+close+contextTail;
  }
  if(g.margin<=6){
    const open=[
      g.winner.team_name+' escaped '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+' in one of the games everybody kept checking. ',
      'The week’s best argument against multitasking was '+g.winner.team_name+' over '+g.loser.team_name+', '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
      g.winner.team_name+' survived the kind of game that turns every lineup decision into a replay, edging '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
      'There was almost nothing between '+g.winner.team_name+' and '+g.loser.team_name+' before '+g.winner.team_name+' came out '+one(g.margin)+' points ahead. ',
      g.winner.team_name+' got the final word in a '+one(g.winner.points)+'–'+one(g.loser.points)+' grinder with '+g.loser.team_name+'. '
    ][slot%5];
    return open+(star?star.name+' mattered more because there was almost no room to waste his '+one(star.points)+' points. ':'')+(winnerSupport?winnerSupport.name+' supplied the kind of secondary performance close games punish teams for missing. ':'')+(loserStar?loserStar.name+' kept '+g.loser.team_name+' alive with '+one(loserStar.points)+'. ':'')+(loserMiss&&loserMiss.name!==loserStar?.name?loserMiss.name+' finished at '+one(loserMiss.points)+', and a line that quiet looks enormous when the margin is this small. ':'')+'Nobody gets to call a game this close destiny; both teams leave knowing exactly which handful of plays and lineup spots decided it.'+contextTail;
  }
  const opens=[
    g.winner.team_name+' handled '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
    g.winner.team_name+' spent Sunday making '+g.loser.team_name+' chase a game that never really came back, '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
    'One of the week’s clearest statements came from '+g.winner.team_name+', which beat '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
    g.winner.team_name+' never needed a dramatic ending against '+g.loser.team_name+', closing out a '+one(g.winner.points)+'–'+one(g.loser.points)+' win. ',
    'The comfortable result worth keeping is '+g.winner.team_name+' over '+g.loser.team_name+', '+one(g.winner.points)+'–'+one(g.loser.points)+'. '
  ];
  return opens[slot%5]+(star?star.name+' set the tone with '+one(star.points)+'. ':'')+(winnerSupport?winnerSupport.name+' made sure the winning side had more than one place to look for production. ':'')+(loserStar?loserStar.name+' was the best reply for '+g.loser.team_name+' at '+one(loserStar.points)+', but the scoreboard kept moving away. ':'')+'A comfortable early win is not a season verdict. It is permission for '+g.winner.team_name+' to expect the same standard next week.'+contextTail;
}

function leagueSynthesis(teams){
  const usable=(teams||[]).map(t=>{const rows=list(t);if(rows.length<3||!valid(t.points)||Number(t.points)<=0)return null;return{t,rows,topShare:Number(rows[0].points)/Number(t.points),threeShare:rows.slice(0,3).reduce((n,p)=>n+Number(p.points||0),0)/Number(t.points)}}).filter(Boolean);
  if(!usable.length)return null;
  const balanced=usable.slice().sort((a,b)=>a.threeShare-b.threeShare)[0],starHeavy=usable.slice().sort((a,b)=>b.topShare-a.topShare)[0],bn=balanced?.rows?.slice(0,3).map(p=>p.name).join(', ');
  if(!balanced)return null;
  let text=`The broader roster lesson this week belongs to ${balanced.t.team_name}. ${bn||'Its leading group'} mattered without forcing one player to carry every important sentence, which gives the lineup more ways to survive when a star has an ordinary afternoon. That is the kind of shape worth watching as the schedule starts testing depth instead of opening-week adrenaline.`;
  if(starHeavy&&String(starHeavy.t.roster_id)!==String(balanced.t.roster_id))text+=` ${starHeavy.t.team_name} lived much closer to the other extreme, leaning hardest on ${starHeavy.rows[0].name}. There is nothing wrong with a centerpiece; the next question is whether the rest of that lineup can become dependable enough that one quiet game does not rewrite the whole matchup.`;
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
  if(isTrade&&add)bits.push(`TRADE FOLLOW-UP: ${t.team_name} brought in ${add}${drop?' and sent out '+drop:''}. ${t.manager_name} paid for a new answer and gets to live with the comparison every Sunday.`);
  else if(add&&drop)bits.push(`${t.team_name} swapped ${drop} for ${add}. Clean transaction, loud consequences: the new name has to make the lineup better.`);
  else if(add)bits.push(`${t.team_name} added ${add}. No parade for the waiver wire; the interesting part is whether the new arrival earns a real Sunday role.`);
  else if(drop)bits.push(`${t.team_name} moved on from ${drop}. The vacant roster spot now has to justify the cut.`);
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
  parts.push(`${t.team_name} set the league’s weekly scoring ceiling at ${one(t.points)}, a ${one(Number(t.points)-Number(t.opponent_points))}-point win over ${t.opponent_name}. That deserves its own headline before we start admiring the close games: nobody in the league put more points on the board.`);
  if(top){
    const ctx=statSituation(top);
    parts.push(`${top.name} led the avalanche with ${one(top.points)} fantasy points${second?', '+second.name+' followed with '+one(second.points):''}${third?', and '+third.name+' added '+one(third.points):''}. ${ctx||''} ${second&&second.real_stat_line?second.name+' backed it with '+String(second.real_stat_line).replaceAll(' • ',', ')+'.':''} The important part for ${t.team_name} is that the score was built from several real football performances rather than one impossible fantasy outlier.`.trim());
  }
  return parts;
}
function weeklyStoryBlock(g,slot,isTop=false){
  const paragraphs=[];
  if(isTop)paragraphs.push(...weeklyTopScorerStory(g.winner,g));
  paragraphs.push(gameStory(g,slot),implicationStory(g,slot));
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
