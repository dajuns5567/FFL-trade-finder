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

export function breakoutWatch(t){
  const candidates=(t.starter_details||[]).map(p=>{
    const age=Number(p.age),f=p.recent_form||{},baseline=Number(f.prior3_avg),current=Number(f.last3_avg),opp=opportunity(p);
    if(!Number.isFinite(age)||age>26||!Number.isFinite(baseline)||baseline<=0||!Number.isFinite(current)||!opp?.strong)return null;
    const lift=current-baseline;
    if(lift<3||current<baseline*1.2)return null;
    return {p,age,baseline,current,lift,opp,score:lift+Math.max(0,26-age)*.5};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
  const x=candidates[0];if(!x)return null;
  const established=Number(x.p.recent_form?.games)>=8;
  return `${x.p.name} is ${established?'moving beyond a one-week curiosity':'worth an early breakout watch'} for ${t.team_name}. At age ${x.age}, the scoring has climbed from ${one(x.baseline)} per game across the prior sample to ${one(x.current)} over the last three, and this week’s ${x.opp.text} gives the jump actual opportunity behind it. ${established?'That is enough evidence to treat the improvement as a developing trend, not a finished verdict.':'The sample is still too short to call the new level permanent, but there is now something more substantial than one loud box score.'}`;
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
  return selected.map(m=>{
    const add=names(m.add),drop=names(m.drop),trade=String(m.move?.type||'').toLowerCase()==='trade',bits=[];
    if(add&&drop)bits.push(deskChoice(t,reporter,[
      [`${t.manager_name} brought in ${add} and moved on from ${drop}.`,`${t.manager_name} changed the room by adding ${add} and sending out ${drop}.`],
      [`${t.manager_name} welcomed ${add} and showed ${drop} the less glamorous side of the velvet rope.`,`${t.manager_name} rearranged the guest list: ${add} in, ${drop} out.`],
      [`${t.manager_name} MADE A MOVE: ${add} in, ${drop} out.`,`${t.manager_name} hit the transaction wire with ${add} arriving and ${drop} leaving.`],
      [`The front-office file shows ${t.manager_name} bringing in ${add} and moving ${drop} out.`,`${t.manager_name} left a clean paper trail: ${add} arrived, ${drop} departed.`]
    ]));
    else if(add)bits.push(trade?deskChoice(t,reporter,[
      [`${t.manager_name} acquired ${add} by trade, so this is part of a roster bet rather than waiver-wire housekeeping.`,`${add} came to ${t.manager_name} through a trade, which gives every useful Sunday a little more context.`],
      [`${t.manager_name} traded for ${add}; one does not send assets across the table merely to decorate the bench.`,`${add} arrived by trade, and the price of admission means the role deserves to be watched.`],
      [`TRADE ARRIVAL: ${t.manager_name} brought in ${add}. This one came with a receipt, not a waiver claim.`,`${add} landed via trade, which makes the next few weeks part performance review, part trade follow-up.`],
      [`The transaction file is specific: ${t.manager_name} acquired ${add} in a trade.`,`${add} is a trade acquisition for ${t.manager_name}; subsequent production belongs in that deal’s evidence file.`]
    ]):deskChoice(t,reporter,[
      [`${t.manager_name} added ${add}, a move worth tracking beyond the transaction crawl.`,`${add} is the addition from ${t.manager_name} that earned space in the notebook.`],
      [`${t.manager_name} added ${add}; at least one waiver move came dressed for the column.`,`${add} joined ${t.manager_name}’s roster and, unlike most wire activity, deserves another look.`],
      [`${t.manager_name} went shopping and came home with ${add}. This one makes the back page.`,`ADD ALERT: ${t.manager_name} landed ${add}, a move loud enough to escape the ticker.`],
      [`The transaction file highlights ${t.manager_name} adding ${add}.`,`${t.manager_name}’s notable incoming evidence is ${add}.`]
    ]));
    else bits.push(deskChoice(t,reporter,[
      [`${t.manager_name} cut ${drop}; the replacement plan now matters.`,`${drop} is gone from ${t.manager_name}’s roster, which makes the next move worth watching.`],
      [`${t.manager_name} showed ${drop} the door. The roster spot had better have plans.`,`${drop} was removed from ${t.manager_name}’s guest list; an empty chair is not a strategy.`],
      [`CUT: ${t.manager_name} moved on from ${drop}. The back page would like to see what comes next.`,`${t.manager_name} dropped ${drop}, so somebody else now has to justify the empty space.`],
      [`The file records ${t.manager_name} cutting ${drop}. The follow-up is what replaces that piece.`,`${drop} appears in the outgoing column for ${t.manager_name}; the inquiry now shifts to the replacement.`]
    ]));
    const incoming=m.add.filter(p=>valid(p.value)).sort((a,b)=>b.value-a.value)[0],outgoing=m.drop.filter(p=>valid(p.value)).sort((a,b)=>b.value-a.value)[0];
    if(incoming&&m.lineup)bits.push(deskChoice(t,reporter,[
      [`${incoming.name} went straight into the lineup, so the move already had a job attached to it.`,`${incoming.name} immediately drew a starting assignment; this was not a stash.`],
      [`${incoming.name} went directly into the lineup, an admirably decisive use of the new arrival.`,`The new arrival, ${incoming.name}, skipped the waiting room and started immediately.`],
      [`${incoming.name} HIT THE LINEUP IMMEDIATELY. That is a move with intent.`,`${incoming.name} was not brought in to collect dust; the starter card had his name on it right away.`],
      [`${incoming.name} appears on the starting card immediately after arrival. Intent is established.`,`The paperwork shows ${incoming.name} went straight from acquisition to starting lineup.`]
    ]));
    else if(incoming)bits.push(deskChoice(t,reporter,[
      [`${incoming.name} is the biggest incoming market piece at ${Math.round(incoming.value).toLocaleString('en-US')}; the next question is whether a role follows.`,`${incoming.name}, valued at ${Math.round(incoming.value).toLocaleString('en-US')}, is the addition with enough market weight to keep watching.`],
      [`${incoming.name} carries ${Math.round(incoming.value).toLocaleString('en-US')} of current value, expensive enough to merit more than decorative depth.`,`At ${Math.round(incoming.value).toLocaleString('en-US')} in current value, ${incoming.name} is not merely a charming bench accessory.`],
      [`${incoming.name} brings ${Math.round(incoming.value).toLocaleString('en-US')} of value with him. Now give the man a reason to be here.`,`The biggest incoming chip is ${incoming.name} at ${Math.round(incoming.value).toLocaleString('en-US')}; the back page awaits the role.`],
      [`${incoming.name} is the most substantial incoming asset at ${Math.round(incoming.value).toLocaleString('en-US')} in current value. Usage is the next piece of evidence.`,`The incoming file is led by ${incoming.name}, currently worth ${Math.round(incoming.value).toLocaleString('en-US')}; role evidence comes next.`]
    ]));
    if(outgoing&&(!incoming||Number(outgoing.value)>Number(incoming.value)*1.15))bits.push(deskChoice(t,reporter,[
      [`${outgoing.name} is the meaningful cost; that departure has to be replaced somewhere.`,`${outgoing.name} carries enough value out the door that the rest of the plan cannot be ignored.`],
      [`${outgoing.name} is the expensive goodbye. The empty space now has expectations.`,`${outgoing.name} leaves the larger bill behind, which makes the replacement more than a matter of taste.`],
      [`${outgoing.name} IS THE COST. Somebody on this roster now has to make that departure look smart.`,`The loud part of the outgoing side is ${outgoing.name}; replacing that value is the next headline.`],
      [`${outgoing.name} is the material outgoing evidence. The replacement plan belongs in the next filing.`,`The cost side centers on ${outgoing.name}, a departure too substantial to wave away.`]
    ]));
    const addStar=m.add.filter(p=>valid(p.points)).sort((a,b)=>b.points-a.points)[0],dropStar=m.drop.filter(p=>valid(p.points)).sort((a,b)=>b.points-a.points)[0];
    if(addStar&&Number(addStar.points)>=10)bits.push(deskChoice(t,reporter,[
      [`${addStar.name} answered immediately with ${one(addStar.points)} points, useful first-week evidence for the move.`,`${one(addStar.points)} points from ${addStar.name} gave the transaction an immediate football reason to matter.`],
      [`${addStar.name} introduced himself with ${one(addStar.points)} points. A tasteful first return.`,`${one(addStar.points)} points from ${addStar.name} is the sort of debut that makes a transaction look well dressed.`],
      [`${addStar.name} PAID OUT IMMEDIATELY: ${one(addStar.points)} points.`,`${one(addStar.points)} points from ${addStar.name} gave management exactly the kind of instant headline it wanted.`],
      [`${addStar.name} produced ${one(addStar.points)} points immediately after the move. The first exhibit favors management.`,`The initial return is ${one(addStar.points)} points from ${addStar.name}; that belongs in the favorable evidence file.`]
    ]));
    else if(dropStar&&Number(dropStar.points)>=10)bits.push(deskChoice(t,reporter,[
      [`${dropStar.name} answered the cut with ${one(dropStar.points)} points, enough to keep the decision in next week’s notebook.`,`${one(dropStar.points)} points from departed ${dropStar.name} ensures this cut gets a follow-up.`],
      [`${dropStar.name} responded to the goodbye with ${one(dropStar.points)} points. Awkward; deliciously so.`,`The departed ${dropStar.name} posted ${one(dropStar.points)} points, which is how an exit earns a second column.`],
      [`OF COURSE ${dropStar.name} SCORED ${one(dropStar.points)} AFTER THE CUT. See you next week.`,`${dropStar.name} left and immediately hung ${one(dropStar.points)} points on the board. The back page has not forgotten.`],
      [`${dropStar.name} produced ${one(dropStar.points)} points after the cut. That decision remains under review.`,`The outgoing ${dropStar.name} answered with ${one(dropStar.points)} points; the file stays open.`]
    ]));
    return bits.join(' ');
  });
}

function opponentPreview(t,r){
  const o=t.next_opponent_roster;if(!o)return null;
  const scored=(o.players||[]).filter(p=>Number(p.season_games)>0&&valid(p.season_fantasy_points)).sort((a,b)=>Number(b.season_fantasy_points)-Number(a.season_fantasy_points)).slice(0,2);
  const valued=(o.players||[]).filter(p=>valid(p.value)).sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,2),namesSeen=new Set(),parts=[];
  for(const p of [...scored,...valued])if(!namesSeen.has(String(p.id))){namesSeen.add(String(p.id));parts.push(p)}
  if(!parts.length)return null;
  const stars=parts.slice(0,3).map(p=>p.name),lead=scored[0],market=valued[0];
  const intro=deskChoice(t,r,[
    [`${t.next_opponent_name||o.team_name} puts ${stars.join(', ')} at the front of next week’s scouting report.`,`${stars.join(', ')} are the first names ${t.team_name} will circle for ${t.next_opponent_name||o.team_name}.`],
    [`${t.next_opponent_name||o.team_name} arrives with ${stars.join(', ')}, a guest list impolite enough to ruin the evening.`,`The next appointment is ${t.next_opponent_name||o.team_name}, and ${stars.join(', ')} are bringing too much luggage.`],
    [`Circle ${stars.join(', ')} in thick ink: ${t.next_opponent_name||o.team_name} is bringing them next week.`,`${t.next_opponent_name||o.team_name} is next, and the back page already has ${stars.join(', ')} circled.`],
    [`The next file opens on ${t.next_opponent_name||o.team_name}; ${stars.join(', ')} are already clipped to the evidence board.`,`${stars.join(', ')} headline the ${t.next_opponent_name||o.team_name} file, and none will be hard to locate in the paperwork.`]
  ]);
  let tail='';
  if(lead&&market&&String(lead.id)!==String(market.id))tail=deskChoice(t,r,[
    [`${lead.name} has supplied the scoring; ${market.name} is still the roster’s biggest market piece. That is two different problems to prepare for.`,`Production points first to ${lead.name}, while roster value points to ${market.name}. ${t.team_name} has more than one fire to watch.`],
    [`${lead.name} owns the scoring headline, while ${market.name} carries the larger market price. Very tasteful, very inconvenient.`,`${lead.name} has done the scoreboard damage; ${market.name} remains the expensive centerpiece. One threat would have been enough.`],
    [`${lead.name} has been the points problem and ${market.name} the market heavyweight. Pick your poison; preferably neither.`,`${lead.name} leads the scoring, ${market.name} leads the price tag, and ${t.team_name} gets both on the same bill.`],
    [`The paper trail separates the threats: ${lead.name} leads the scoring, ${market.name} the market value. The defense rests only when both do.`,`${lead.name} has the production file; ${market.name} has the valuation file. Both stay open through kickoff.`]
  ]);
  else if(lead)tail=deskChoice(t,r,[
    [`${lead.name} has been the scoring headliner, so the assignment is not especially mysterious.`,`${lead.name} is the recent scoring threat ${t.team_name} cannot let own the afternoon.`],
    [`${lead.name} has supplied the points, an inelegant but convincing demand for attention.`,`The scoring trail keeps leading back to ${lead.name}. Even I can respect evidence that obvious.`],
    [`${lead.name} has been the loudest scorer. Stop that name and make somebody else earn the headline.`,`The scoreboard keeps shouting ${lead.name}. Next week is a good time to lower the volume.`],
    [`${lead.name} keeps appearing at the top of the scoring file. That witness cannot be lost in the crowd.`,`The production evidence points first to ${lead.name}; any plan that skips that page is incomplete.`]
  ]);
  return [intro,tail].filter(Boolean).join(' ');
}

function divisionStory(t,r){
  let d=divisionCopy(t);if(!d)return null;
  const lost='Another loss would leave this team relying more heavily on help from those rivals.';
  const gained='Next week is a chance to improve that position before the division has time to separate.';
  if(d.includes(lost))d=d.replace(lost,deskChoice(t,r,[
    [`The response is simple: stop giving those rivals more help next week.`,`The notebook version is shorter: the next loss would make the chase considerably uglier.`],
    [`Depending on rival charity twice in a row would be terribly unbecoming.`,`Another week of asking the neighbors for help would ruin the arrangement.`],
    [`Next week: win your own game and stop outsourcing the rescue mission.`,`The back-page prescription is obvious—quit making the rivals do the saving.`],
    [`The case improves fastest if ${t.team_name} stops requiring favorable exhibits from elsewhere.`,`Rival losses helped limit the damage; relying on that evidence again would weaken the case.`]
  ]));
  if(d.includes(gained))d=d.replace(gained,deskChoice(t,r,[
    [`There is room to build on that ground next week before anyone gets comfortable.`,`The next assignment is to make the early division gain look less temporary.`],
    [`A little more ground next week and we may discuss the table with the good china.`,`The division picture is flattering for now; repeating the result would make it fashionable.`],
    [`The division opened a door. Kick it wider next week.`,`There is real ground to press now—do not turn a good headline into a one-week souvenir.`],
    [`The evidence shows an opening; next week determines whether it becomes position or merely circumstance.`,`The division file moved in ${t.team_name}’s favor. One more clean result would make that meaningful.`]
  ]));
  return d;
}

function outlook(t,week,r){
  const ps=[],m=t.mida_outlook,op=t.next_opponent_name,gap=valid(t.next_projected)&&valid(t.next_opponent_projected)?Number(t.next_projected)-Number(t.next_opponent_projected):null;
  if(op&&gap!=null){
    const copy=Math.abs(gap)<6?deskChoice(t,r,[
      [`${t.team_name} and ${op} are separated by only ${one(Math.abs(gap))} projected points. One ordinary mistake can own a game that close.`,`Only ${one(Math.abs(gap))} projected points separate ${t.team_name} and ${op}; this is a week for clean decisions and loud stars.`],
      [`${t.team_name} and ${op} sit just ${one(Math.abs(gap))} projected points apart. A small margin for a large amount of future complaining.`,`Only ${one(Math.abs(gap))} projected points separate ${t.team_name} from ${op}. I have selected the appropriate dramatic sigh.`],
      [`${one(Math.abs(gap))} projected points separate ${t.team_name} and ${op}: one lineup call, one monster quarter, one group-chat disaster.`,`${t.team_name} gets ${op} with the forecast almost level. Perfect conditions for someone to become a hero or a screenshot.`],
      [`The ${t.team_name}-${op} file opens with only ${one(Math.abs(gap))} projected points between them. Small gaps leave excellent fingerprints.`,`${t.team_name} and ${op} are nearly even on paper. The inquiry will focus on whichever decision breaks the tie.`]
    ]):gap>0?deskChoice(t,r,[
      [`The projection leans toward ${t.team_name} against ${op}. Good teams make those afternoons look ordinary.`,`${op} is the sort of favorable assignment ${t.team_name} should bank without turning Sunday into a crisis.`],
      [`The numbers hand ${t.team_name} the nicer side of the table against ${op}. Manners require taking advantage.`,`${op} is an inviting appointment on paper. It would be gauche to waste it.`],
      [`The forecast likes ${t.team_name} against ${op}. The back page prefers confirmation to excuses.`,`${op} is a game ${t.team_name} should expect to own. Save the drama for another week.`],
      [`The evidence gives ${t.team_name} the edge over ${op}; management should avoid manufacturing a problem.`,`${op} enters the file as the favorable matchup. Failing to close it would create a thicker folder.`]
    ]):deskChoice(t,r,[
      [`${t.team_name} gets the harder projection against ${op}; one headliner probably has to steal the afternoon.`,`${op} asks ${t.team_name} to beat the forecast, so the stars cannot leave the furniture to the supporting cast.`],
      [`The forecast favors ${op}. How vulgar. ${t.team_name} will need a star turn to improve the décor.`,`${op} is the difficult engagement. ${t.team_name} needs its best players to be unmistakable.`],
      [`${op} owns the projected edge. Fine—give the back page an upset worth wasting ink on.`,`${t.team_name} is chasing the projection against ${op}; this is when a centerpiece earns 48-point type.`],
      [`The file favors ${op}; ${t.team_name} needs evidence strong enough to overturn it Sunday.`,`${op} holds the projected advantage. The clean rebuttal is a big afternoon from ${t.team_name}’s best players.`]
    ]);
    ps.push(copy);
  }
  const scout=opponentPreview(t,r);if(scout)ps.push(scout);
  if(m&&valid(m.playoff)){
    const title=valid(m.title)?` and around ${one(m.title)}% chance of winning the championship`:'';
    const stakes=Number(m.playoff)>=70?deskChoice(t,r,[
      [`At ${record(t)}, the expectation is to turn that promise into real wins.`,`A strong postseason path buys expectation, not permission to coast.`],
      [`That is an invitation to the serious table, not a decorative place card.`,`The outlook is too strong to treat merely interesting football as enough.`],
      [`Those odds come with a job: keep winning before the league gets bored with the hype.`,`The bracket is already flirting with ${t.team_name}. Make it less subtle.`],
      [`The evidence supports expectations now. Every wasted favorable week becomes an item in the file.`,`A strong outlook raises the standard of proof; ${t.team_name} should start supplying wins.`]
    ]):Number(m.playoff)>=40?deskChoice(t,r,[
      [`The season still has room to swing; ordinary wins matter more than dramatic explanations.`,`A two-week run can still change the whole conversation.`],
      [`The door is open without being held for them. A civilized winning streak would be lovely.`,`There is enough hope to dress up, not enough to order champagne.`],
      [`The path is open, but nobody is reserving a parade route. Stack wins and make the argument louder.`,`The back page accepts victories as evidence; there is still time to provide them.`],
      [`The case remains live and undecided. A few clean wins would make the paperwork friendlier.`,`There is enough in the file to keep believing, not enough to close the inquiry.`]
    ]):deskChoice(t,r,[
      [`The path is narrow enough that every winnable week feels expensive to waste.`,`Hope now needs results more than speeches.`],
      [`The invitation is written in very small print. Winning remains the tasteful response.`,`The route is narrow, and even optimism should check the dress code.`],
      [`The math is rude. The satisfying answer is to start stealing games.`,`There is no room for decorative losses now; wins are the only headline that helps.`],
      [`The evidence is thin enough that every dropped opportunity becomes material.`,`The file needs wins soon, not theories about why they are coming.`]
    ]);
    ps.push(`${t.team_name} has around ${one(m.playoff)}% chance of reaching the playoffs${title}. ${stakes}`);
  }
  const div=divisionStory(t,r);if(div)ps.push(div);
  return ps.length?ps:['n/a'];
}

function acquisitionCallback(t,p,r){
  const a=p?.acquisition||((t.trade_acquisitions||[]).find(x=>String(x.player_id)===String(p?.id)));if(!a)return null;
  const partner=(a.counterpart_names||[]).filter(Boolean).join(', '),sent=(a.outgoing_player_names||[]).filter(Boolean),when=a.season&&a.week?` in Week ${a.week} of ${a.season}`:'';
  const price=sent.length?` after sending out ${sent.slice(0,3).join(', ')}`:a.outgoing_pick_count?` in a deal that sent out ${a.outgoing_pick_count} draft pick${a.outgoing_pick_count===1?'':'s'}`:'';
  return deskChoice(t,r,[
    [`${p.name} did not simply appear on this roster; ${t.manager_name} acquired him by trade${when}${partner?' with '+partner:''}${price}. That makes this week part of the deal’s ongoing return, not an isolated box score.`],
    [`${p.name} is still carrying the little price tag that comes with a trade acquisition${when}. ${t.manager_name} brought him in${partner?' from a deal involving '+partner:''}${price}, so useful weeks like this are exactly what the move was supposed to buy.`],
    [`REMEMBER THE RECEIPT: ${p.name} arrived by trade${when}${price}. Every big Sunday for ${t.team_name} keeps that deal in the good-news column; every disappearing act by ${p.name} drags it back onto the back page.`],
    [`The acquisition file matters here: ${p.name} came to ${t.manager_name} by trade${when}${partner?' in a deal with '+partner:''}${price}. His production is now evidence in a transaction that remains open for review.`]
  ]);
}


function managerMemory(t){
  const c=t.manager_career||{},titles=Number(c.championships)||0,wins=Number(c.wins)||0,losses=Number(c.losses)||0;
  if(titles>0)return t.manager_name+' has '+titles+' championship'+(titles===1?'':'s')+' on the résumé, so one odd Sunday does not erase the larger record. For '+t.team_name+', that history also raises the standard when the same mistake starts repeating.';
  if(wins+losses>=12)return t.manager_name+' carries a '+wins+'-'+losses+' career record into the week. '+t.team_name+' should be judged against that longer pattern, not one lucky or miserable afternoon.';
  return null;
}
function recentDirection(t){
  const games=(t.league_context?.recent_games||[]).slice(-4);if(games.length<2)return null;
  const wins=games.filter(g=>g.result==='W').length,losses=games.filter(g=>g.result==='L').length;
  if(wins>=3)return t.team_name+' has won '+wins+' of its last '+games.length+', enough for the mood around the club to feel earned rather than borrowed.';
  if(losses>=3)return t.team_name+' has lost '+losses+' of its last '+games.length+', so this week lands inside a larger problem instead of arriving as an isolated annoyance.';
  return 'The recent run is mixed enough that '+t.team_name+' is still writing its identity one Sunday at a time.';
}
function valueSectionV26(t,r){
  const v=t.value_history_week;if(!valid(v?.delta))return ['n/a'];
  const d=Number(v.delta),dir=d>0?'up':d<0?'down':'flat',amount=Math.abs(Math.round(d)).toLocaleString('en-US'),pct=valid(v.pct)?Math.abs(Number(v.pct)):null;
  const core=t.team_name+' moved '+dir+(d===0?'':' '+amount)+(pct!=null&&d!==0?' ('+one(pct)+'%)':'')+' over the current Value History window.';
  if(r.id==='walter-mercer')return[
    core+' Keep it in the margin of the notebook, not the headline. Market movement matters most when the football starts making the same argument.',
    d>0?'The encouraging part is that the roster is gaining room to maneuver while the season is still young. The front office should resist spending that flexibility just because it exists.':d<0?'The slide is worth watching because repeated value loss can turn a bad month into a harder rebuild. One week is not a fire sale; several can become one.':'No movement is its own message: the market has not changed its mind about this roster yet.'
  ];
  if(r.id==='tess-delaney')return[
    core+' The market has adjusted the guest list, but nobody should confuse a better price tag with a trophy or a worse one with a funeral.',
    d>0?'There is something pleasant about gaining value while still having games left to justify the optimism. The elegant outcome is for Sunday production to catch the same train.':d<0?'A falling roster value is the sort of stain that looks tiny under restaurant lighting and enormous the next morning. Stop it early and nobody needs to redecorate.':'The market remains stubbornly unimpressed, which is at least preferable to melodrama without cause.'
  ];
  if(r.id==='mack-hollis')return[
    core+' That gets a sidebar, not the banner. The back page still belongs to wins, losses and the players actually deciding them.',
    d>0?'GOOD NEWS WITH A LOWERCASE FONT: the roster is becoming more valuable without requiring a press conference. Keep stacking pieces that matter.':d<0?'BAD NEWS, NOT PANIC NEWS: value is leaking. Fix the roster before this becomes the kind of trend that earns an ugly nickname.':'NO MARKET DRAMA THIS WEEK. The newspaper will survive.'
  ];
  return[
    core+' The number goes into the file beside the roster decisions that produced it; it does not replace the game result.',
    d>0?'A rising value gives management more optionality, and that matters when the next trade or injury forces a choice. The inquiry is whether the gain came from pieces this team actually intends to build around.':d<0?'A declining value narrows future options if it persists. The next few decisions matter more than any explanation offered after the fact.':'The market has left the file unchanged. That is neither acquittal nor indictment.'
  ];
}
function nickExpansion(t,kind){
  const rows=list(t),top=rows[0],recent=recentDirection(t),memory=managerMemory(t),rank=Number(t.league_context?.standings_rank);
  if(kind==='lede')return [recent||((top?top.name:'The lineup')+' gave the old desk enough to work with, but one result still has to survive the next Sunday before it earns a place in the season story.')];
  if(kind==='players'&&top)return [(rows[1]?rows[1].name+' matters here because good teams stop asking the same star to rescue them every week. ':'')+'For '+t.team_name+', the names below '+top.name+' decide whether this lineup travels when the schedule gets less friendly.','What I want to see next is whether '+t.team_name+' can make an ordinary Sunday feel safe behind '+top.name+'. Stars win weeks; dependable depth keeps this club from treating every week like an emergency.'];
  if(kind==='management')return [memory||'Management gets judged on what remains useful after the transaction notification disappears. A move that fixes a weekly problem will age better than one that merely created activity.'];
  if(kind==='sentiment')return ['Fans can enjoy the result without pretending September has issued a final ruling. '+t.team_name+' can have its optimism, but the next Sunday still has to earn it.'];
  if(kind==='outlook')return [(Number.isFinite(rank)?t.team_name+' sits around No. '+rank+' in the league table. ':'')+'The cleanest road for '+t.team_name+' is boring in the best way: bank the winnable games now so November does not require miracles.'];
  if(kind==='hot-seat'||kind==='cool-throne')return ['The chair lasts a week. Reputation takes longer. The follow-up performance is what turns this into a trend worth remembering.'];
  return [];
}
function bartholomewExpansion(t,kind){
  const rows=list(t),top=rows[0],second=rows[1],memory=managerMemory(t),m=t.mida_outlook;
  if(kind==='lede')return ['A single Sunday is not a coronation, naturally, but '+t.team_name+' has at least supplied a scene worth lingering over. '+(top?top.name+' gave the afternoon its leading man'+(second?', while '+second.name+' kept the production from becoming an embarrassing one-person recital.':'.'): 'The ensemble now owes us a sequel.')];
  if(kind==='players'&&top)return [top.name+' supplied the star turn; the season becomes genuinely interesting when the rest of the cast makes that level of performance feel less exceptional and more like the house style.','Behind '+top.name+', '+t.team_name+' now has a choice: turn the supporting cast into recurring characters or leave them as beautifully dressed extras. The former makes the roster dangerous; the latter gives this columnist a recurring complaint.'];
  if(kind==='management')return [memory||'Roster construction is fashion only until kickoff. After that, every expensive accessory has to reveal whether it can actually play.'];
  if(kind==='sentiment')return ['Supporters are entitled to a little theater. '+t.team_name+' now has to make sure the applause is attached to something sturdier than one flattering scoreline.'];
  if(kind==='outlook')return [(valid(m?.playoff)?'With a postseason path around '+one(m.playoff)+'%, ':'')+'the next engagement is less about forecasting destiny than accumulating the kind of wins that make the autumn schedule feel civilized instead of desperate.'];
  if(kind==='hot-seat')return ['The uncomfortable chair is not a banishment for '+t.team_name+'; it is a request for a better performance, preferably before this columnist is forced to become repetitive and therefore common.'];
  if(kind==='cool-throne')return ['The comfortable chair is deserved for the week. Permanence, like good tailoring, requires repetition.'];
  return [];
}
function tillyExpansion(t,kind){
  const rows=list(t),top=rows[0],second=rows[1],memory=managerMemory(t),rank=Number(t.league_context?.standings_rank);
  if(kind==='lede')return [(Number(t.points)>Number(t.opponent_points)?'WIN FILED. NOW MAKE IT A STREAK. ':'LOSS FILED. NOW GIVE US A RESPONSE. ')+(top?top.name+' gets the big type, because somebody has to own the first sentence.':'The next edition needs a hero.')];
  if(kind==='players'&&top)return [top.name+' gets the banner. '+(second?second.name+' gets the next column. ':'The supporting cast gets a challenge.')+'If '+t.team_name+' wants to become a weekly problem for the league, the names below '+top.name+(second?' and '+second.name:'')+' have to keep showing up too.','The back page can survive one superstar carrying the edition. '+t.team_name+' cannot live that way forever; somebody else needs to keep earning ink before '+top.name+' gets tired of doing all the work.'];
  if(kind==='management')return [memory||'The back page does not award trophies for transaction volume. Make the roster better, make the move matter, and then we will print the victory lap.'];
  if(kind==='sentiment')return ['The '+t.team_name+' group chat is allowed to overreact. That is what group chats are for. The standings get the final edit, so this club still has to give them something fun to print.'];
  if(kind==='outlook')return [(Number.isFinite(rank)?'CURRENT TABLE: No. '+rank+'. ':'')+'Every win banked now is one fewer November emergency. Every wasted favorite spot becomes a future headline with much worse punctuation.'];
  if(kind==='hot-seat')return ['One bad week gets angry font. Two starts a storyline. Three gets a nickname nobody wants.'];
  if(kind==='cool-throne')return ['One huge week gets the picture above the fold. Do it again and we start saving front pages.'];
  return [];
}
function filchExpansion(t,kind){
  const rows=list(t),top=rows[0],memory=managerMemory(t),ctx=t.league_context||{},op=t.next_opponent_context||{},sameDivision=!!t.next_divisional;
  if(kind==='lede')return ['The '+t.team_name+' score closes the first file and opens the more important one: what from this week is likely to survive contact with '+String(t.next_opponent_name||'the next opponent')+'? '+(top?top.name+' is the strongest answer on the page.':'The lineup still owes the inquiry a clear answer.')];
  if(kind==='players'&&top)return ['The production around '+top.name+' matters because '+t.team_name+' cannot hide roster dependence for long. If the same supporting names keep appearing, that is depth; if they vanish, this week becomes an outlier with excellent publicity.','The next '+t.team_name+' file will compare the same names again. Repeated support turns '+top.name+'’s strong performance into roster structure; disappearing support turns it into evidence that he is doing too much of the work.'];
  if(kind==='management')return [memory||'A front office move stays in the file after the ticker forgets it. Role, opportunity and what management gave up will decide whether the transaction reads better a month from now.'];
  if(kind==='sentiment')return ['Public opinion enters the '+t.team_name+' record because it remembers what came before. One win can improve the mood; only repeated competent Sundays can rewrite this club’s reputation.'];
  if(kind==='outlook')return [(sameDivision?'The next matchup is divisional, so the result shifts both sides of the race at once. ':'The next matchup still spends one of a finite number of regular-season chances. ')+(op?.record?' '+String(t.next_opponent_name||'The opponent')+' arrives with its own '+String(op.record.wins||0)+'-'+String(op.record.losses||0)+' pressure, which makes '+t.team_name+'’s road ahead a two-team problem rather than a projection exercise.':'The schedule will reveal quickly whether this week solved anything durable.')];
  if(kind==='hot-seat'||kind==='cool-throne')return ['The '+t.team_name+' file remains open after one appearance in this chair. Repetition is what converts this weekly note into something '+t.manager_name+' actually has to answer.'];
  return [];
}
function reporterExpansionV26(t,kind,r){
  if(r.id==='tess-delaney')return bartholomewExpansion(t,kind);
  if(r.id==='mack-hollis')return tillyExpansion(t,kind);
  if(r.id==='nora-voss')return filchExpansion(t,kind);
  return nickExpansion(t,kind);
}
function reporterStructureV26(sections,t,r){
  const byKind=new Map((sections||[]).map(s=>[s.kind,s])),variant=Math.floor(Math.max(0,(Number(t.roster_id)||1)-1)/4)%2;
  const orders={
    'walter-mercer':[
      ['lede','players','management','hot-seat','value','sentiment','cool-throne','outlook'],
      ['lede','players','value','management','cool-throne','sentiment','hot-seat','outlook']
    ],
    'tess-delaney':[
      ['lede','players','sentiment','cool-throne','value','management','hot-seat','outlook'],
      ['lede','sentiment','players','value','management','cool-throne','hot-seat','outlook']
    ],
    'mack-hollis':[
      ['lede','hot-seat','players','cool-throne','management','sentiment','value','outlook'],
      ['lede','players','hot-seat','management','cool-throne','sentiment','value','outlook']
    ],
    'nora-voss':[
      ['lede','management','players','value','hot-seat','sentiment','cool-throne','outlook'],
      ['lede','management','value','players','sentiment','hot-seat','cool-throne','outlook']
    ]
  };
  const order=(orders[r.id]||orders['walter-mercer'])[variant];
  return order.map(k=>byKind.get(k)).filter(Boolean);
}

function naturalLede(t,r){
  const rows=list(t),top=rows[0],second=rows[1],margin=Number(t.points)-Number(t.opponent_points),bad=rows.filter(p=>delta(p)!=null&&delta(p)<=-5).sort((a,b)=>delta(a)-delta(b))[0],ps=[];
  if(!top)return [`${t.team_name} finished the week without enough verified player detail for a responsible star turn.`];
  if(margin>0)ps.push(deskChoice(t,r,[
    [`${t.team_name} beat ${t.opponent_name} ${one(t.points)}–${one(t.opponent_points)} and moved to ${record(t)}. ${top.name} did the loud work with ${one(top.points)} points, ${Math.abs(margin)>=20?'setting the tone for a Sunday fans can actually enjoy':'giving the win the headliner it needed'}.`,`${top.name} put ${one(top.points)} on the board and ${t.team_name} handled ${t.opponent_name} ${one(t.points)}–${one(t.opponent_points)}. At ${record(t)}, that is a clipping worth keeping.`],
    [`${t.team_name} left ${t.opponent_name} with the bill, ${one(t.points)}–${one(t.opponent_points)}, and ${top.name} supplied ${one(top.points)} reasons not to argue. A ${record(t)} start looks rather nicer in ink.`,`${top.name} gave ${t.team_name} the star turn, ${one(top.points)} points in a ${one(t.points)}–${one(t.opponent_points)} win over ${t.opponent_name}. For one week, the good china survives.`],
    [`${t.team_name} is on the front page after a ${one(t.points)}–${one(t.opponent_points)} win over ${t.opponent_name}. ${top.name} kicked the door open with ${one(top.points)} points.`,`${top.name} supplied ${one(top.points)} points and ${t.team_name} supplied the result: ${one(t.points)}–${one(t.opponent_points)} over ${t.opponent_name}. Print the ${record(t)} record large enough for the rival chat.`],
    [`The evidence reads ${t.team_name} ${one(t.points)}, ${t.opponent_name} ${one(t.opponent_points)}. ${top.name} is Exhibit A with ${one(top.points)} points, and the record now reads ${record(t)}.`,`${t.team_name} closed the file on ${t.opponent_name}, ${one(t.points)}–${one(t.opponent_points)}. ${top.name} left ${one(top.points)} points of fingerprints all over the win.`]
  ]));
  else ps.push(deskChoice(t,r,[
    [`${t.team_name} fell ${one(t.points)}–${one(t.opponent_points)} to ${t.opponent_name}, and ${top.name}’s ${one(top.points)} points deserved better company. The record is ${record(t)}; the notebook has questions.`,`${top.name} gave ${t.team_name} ${one(top.points)} points, but ${t.opponent_name} still walked out with a ${one(t.opponent_points)}–${one(t.points)} win. File the ${record(t)} record and start the homework.`],
    [`${top.name} brought ${one(top.points)} points to the table; ${t.team_name} still lost ${one(t.points)}–${one(t.opponent_points)} to ${t.opponent_name}. An unpleasant result, elegantly documented.`,`${t.team_name} lost ${one(t.points)}–${one(t.opponent_points)}, a dreadful frame for ${top.name}’s ${one(top.points)}-point afternoon. The ${record(t)} record is not improved by good typography.`],
    [`${top.name} showed up with ${one(top.points)} points. The rest of the headline is uglier: ${t.opponent_name} beat ${t.team_name} ${one(t.opponent_points)}–${one(t.points)}.`,`${t.team_name} takes the loss, ${one(t.points)}–${one(t.opponent_points)}, while ${top.name} gets the only flattering type at ${one(top.points)} points.`],
    [`The case against ${t.team_name} starts with a ${one(t.points)}–${one(t.opponent_points)} loss to ${t.opponent_name}. ${top.name} supplied ${one(top.points)} points of mitigating evidence.`,`${top.name} left ${one(top.points)} points in the record, but ${t.team_name} still lost to ${t.opponent_name}, ${one(t.points)}–${one(t.opponent_points)}. The file now says ${record(t)}.`]
  ]));
  if(margin>0&&bad&&String(bad.id)!==String(top.id))ps.push(deskChoice(t,r,[
    [`${top.name} and the other leaders made ${bad.name}’s ${one(bad.points)}-point off day easy to forgive once. Next week offers a cleaner line in the notebook.`,`${bad.name} managed only ${one(bad.points)}, but the stars covered the bill. ${t.team_name} would rather see the supporting cast pay its share next week.`],
    [`${bad.name}’s ${one(bad.points)}-point afternoon was the ugly accessory nobody noticed because ${top.name} and company dressed the win so well. A repeat would be less charming.`,`The victory was generous enough to hide ${bad.name} at ${one(bad.points)}. Good teams accept the gift and ask for better tailoring next Sunday.`],
    [`${bad.name} gave ${t.team_name} only ${one(bad.points)}, and the superstars made sure it stayed a footnote. Consider next week the comeback headline audition.`,`${bad.name} disappeared into a ${one(bad.points)}-point afternoon. The win survived it; the back page will notice faster if it happens twice.`],
    [`${bad.name}’s ${one(bad.points)} points go into the file as the miss the winning lineup managed to conceal. The follow-up question comes next week.`,`The evidence includes a quiet ${one(bad.points)} from ${bad.name}; the result kept it from becoming an indictment. For now.`]
  ]));
  else if(second)ps.push(deskChoice(t,r,[
    [`${top.name} had company from ${second.name}, which made the top of the lineup feel like a story rather than a solo act.`,`${second.name} was the next name that mattered behind ${top.name}. That is useful support behind the headline.`],
    [`${second.name} supplied the supporting performance behind ${top.name}; even a star appreciates competent company.`,`${top.name} owned the marquee, with ${second.name} doing enough nearby to keep the production from becoming a one-person salon.`],
    [`${second.name} joined ${top.name} among the names worth printing. Two headline performances are more fun than one and require no further explanation.`,`${top.name} got the biggest type, but ${second.name} earned ink too. That is how a lineup starts sounding dangerous.`],
    [`${second.name} appears on the same evidence board as ${top.name}; the case did not rest on one witness alone.`,`${top.name} led the testimony, with ${second.name} supplying corroboration that actually mattered.`]
  ]));
  return ps;
}

function playerSection(t,r){
  const rows=list(t),top=rows[0],ps=[];if(!top)return ['n/a'];
  const topThree=rows.slice(0,3),bad=rows.filter(p=>delta(p)!=null&&delta(p)<-4).sort((a,b)=>delta(a)-delta(b))[0],support=names(topThree.slice(1));
  ps.push(deskChoice(t,r,[
    [`${top.name} led ${t.team_name} with ${one(top.points)} fantasy points${top.real_stat_line?' ('+top.real_stat_line.replaceAll(' • ',', ')+')':''}. ${support?support+' supplied the best support behind him.':''}`,`${one(top.points)} fantasy points made ${top.name} the first name in the notebook${top.real_stat_line?', with '+top.real_stat_line.replaceAll(' • ',', ')+' underneath it':''}. ${support?'The next useful names were '+support+'.':''}`],
    [`${top.name} gets the good china after ${one(top.points)} fantasy points${top.real_stat_line?' ('+top.real_stat_line.replaceAll(' • ',', ')+')':''}. ${support?support+' made respectable company.':''}`,`${one(top.points)} fantasy points from ${top.name} was the elegant part of the card${top.real_stat_line?' — '+top.real_stat_line.replaceAll(' • ',', '):''}. ${support?'Behind that, '+support+' kept the table from looking bare.':''}`],
    [`PUT ${top.name.toUpperCase()} IN THE BIG TYPE: ${one(top.points)} fantasy points${top.real_stat_line?' ('+top.real_stat_line.replaceAll(' • ',', ')+')':''}. ${support?support+' earned space below the fold.':''}`,`${top.name} owned the player page with ${one(top.points)} fantasy points${top.real_stat_line?' — '+top.real_stat_line.replaceAll(' • ',', '):''}. ${support?'The supporting headline goes to '+support+'.':''}`],
    [`The player file starts with ${top.name}: ${one(top.points)} fantasy points${top.real_stat_line?' ('+top.real_stat_line.replaceAll(' • ',', ')+')':''}. ${support?support+' provided corroborating production.':''}`,`${top.name} is the clearest exhibit at ${one(top.points)} fantasy points${top.real_stat_line?' — '+top.real_stat_line.replaceAll(' • ',', '):''}. ${support?support+' belong in the supporting evidence.':''}`]
  ]));
  if(bad&&String(bad.id)!==String(top.id))ps.push(deskChoice(t,r,[
    [`${bad.name} finished at ${one(bad.points)} against a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The win kept that miss in the margins; another week may not.':'In a loss, that quiet slot earns a longer look.'}`,`${bad.name} never found the expected afternoon, ${one(bad.points)} against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'The stars covered for it this time.':'The loss gave the miss nowhere to hide.'}`],
    [`${bad.name} supplied only ${one(bad.points)} against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'The victory makes that forgivable, not fashionable.':'That is the kind of detail a loss refuses to accessorize away.'}`,`${one(bad.points)} from ${bad.name}, against ${one(bad.projected)} projected, was the part of the card we would politely send back. ${Number(t.points)>Number(t.opponent_points)?'Winning bought grace.':'Losing did not.'}`],
    [`${bad.name} landed at ${one(bad.points)} after a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The rest of the lineup kept it out of the headline.':'The final score dragged it straight onto the back page.'}`,`${bad.name} missed the expected mark, ${one(bad.points)} against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'Call it a warning under a winning headline.':'Call it one of the places the loss went missing.'}`],
    [`The weak exhibit is ${bad.name}: ${one(bad.points)} after a ${one(bad.projected)} projection. ${Number(t.points)>Number(t.opponent_points)?'The verdict was still a win, so the inquiry stays informal.':'The loss upgrades the follow-up question.'}`,`${bad.name} left a ${one(bad.points)}-point line against ${one(bad.projected)} projected. ${Number(t.points)>Number(t.opponent_points)?'The record marks it as a survivable miss.':'The record marks it as relevant evidence.'}`]
  ]));
  const breakout=breakoutWatch(t);if(breakout)ps.push(breakout);
  return ps;
}

function hotCool(t,kind,r){
  const rows=list(t).filter(p=>delta(p)!=null);if(!rows.length)return ['n/a'];
  if(kind==='hot-seat'){
    const p=rows.slice().sort((a,b)=>delta(a)-delta(b))[0],d=delta(p);if(d>=-2)return ['n/a'];
    return [deskChoice(t,r,[
      [`${p.name} gets the Hot Seat after ${one(p.points)} points left ${t.team_name} wanting more. ${Number(t.points)>Number(t.opponent_points)?'The win buys patience; it does not erase the off day.':'The loss makes the quiet afternoon harder to shrug off.'}`,`${p.name} gets the week’s side-eye at ${one(p.points)} points. ${Number(t.points)>Number(t.opponent_points)?'A winning lineup can carry that once.':'A losing lineup cannot pretend it did not matter.'}`],
      [`${p.name} occupies the Hot Seat after a ${one(p.points)}-point contribution that did nothing for the décor. ${Number(t.points)>Number(t.opponent_points)?'Winning makes it forgivable, briefly.':'Losing makes it memorable.'}`,`${one(p.points)} points puts ${p.name} in the uncomfortable chair. ${Number(t.points)>Number(t.opponent_points)?'The result spared the blushes.':'The result removed that courtesy.'}`],
      [`HOT SEAT: ${p.name}, after ${one(p.points)} points and a Sunday worth deleting from the camera roll. ${Number(t.points)>Number(t.opponent_points)?'The team won anyway. Do not test that magic twice.':'The team lost, so the back page is not offering amnesty.'}`,`${p.name} gets the angry-font treatment at ${one(p.points)} points. ${Number(t.points)>Number(t.opponent_points)?'The win saved the headline.':'The loss made the miss part of it.'}`],
      [`The Hot Seat file belongs to ${p.name}: ${one(p.points)} points and an obvious follow-up. ${Number(t.points)>Number(t.opponent_points)?'The win keeps this at inquiry level.':'The loss makes the evidence consequential.'}`,`${p.name} is the name under review after ${one(p.points)} points. ${Number(t.points)>Number(t.opponent_points)?'No charges; the team survived.':'The final score keeps the case open.'}`]
    ])];
  }
  const p=rows.slice().sort((a,b)=>delta(b)-delta(a))[0],d=delta(p);if(d<=2)return ['n/a'];
  return [deskChoice(t,r,[
    [`${p.name} gets the Cool Throne after ${one(p.points)} points gave ${t.team_name} a performance worth keeping. ${Number(t.points)>Number(t.opponent_points)?'It belongs in the winning clipping.':'Even the loss could not bury it.'}`,`${one(p.points)} points earns ${p.name} the Cool Throne. ${Number(t.points)>Number(t.opponent_points)?'That was winning work.':'That was good work trapped in a bad result.'}`],
    [`${p.name} takes the Cool Throne with ${one(p.points)} points and, for once, tasteful excess. ${Number(t.points)>Number(t.opponent_points)?'The victory suits it.':'The loss does not.'}`,`${p.name} gets the comfortable chair after ${one(p.points)} points. ${Number(t.points)>Number(t.opponent_points)?'A lovely contribution to a winning afternoon.':'A lovely contribution wasted on the wrong ending.'}`],
    [`COOL THRONE: ${p.name}, ${one(p.points)} points, no further lobbying required. ${Number(t.points)>Number(t.opponent_points)?'Put it in the victory edition.':'Save the clipping anyway.'}`,`${p.name} owns the Cool Throne after a ${one(p.points)}-point headline. ${Number(t.points)>Number(t.opponent_points)?'That is how you get above the fold.':'That is how you keep your name out of the losing pile.'}`],
    [`The Cool Throne file closes quickly: ${p.name}, ${one(p.points)} points, useful evidence. ${Number(t.points)>Number(t.opponent_points)?'The win confirms it.':'The loss does not impeach the performance.'}`,`${p.name} earns the favorable finding after ${one(p.points)} points. ${Number(t.points)>Number(t.opponent_points)?'The result supports the case.':'The result was the problem, not this witness.'}`]
  ])];
}

function sentiment(t,r){
  const margin=Number(t.points)-Number(t.opponent_points),top=list(t)[0],m=t.mida_outlook,ps=[];
  if(margin>0)ps.push(deskChoice(t,r,[
    [`${t.team_name} fans can live with a ${one(margin)}-point win over ${t.opponent_name}. ${margin>20?'This is the rare week to enjoy the clipping before inventing a problem.':'Close wins leave questions, but they are nicer questions at '+record(t)+'.'}`,`A ${one(margin)}-point win gives ${t.team_name} supporters permission to be pleased for one news cycle. The record says ${record(t)}; the anxiety can wait.`],
    [`${t.team_name} supporters may enjoy the ${one(margin)}-point win over ${t.opponent_name} with only the minimum theatrical restraint. ${top?top.name+' gave them a centerpiece worth admiring.':''}`,`The mood around ${t.team_name} is appropriately pleased after beating ${t.opponent_name} by ${one(margin)}. At ${record(t)}, even I will allow a modest toast.`],
    [`${t.team_name} won by ${one(margin)}, which means the group chat has already become unbearable in the correct direction. ${top?top.name+' supplied the easiest name to shout.':''}`,`A ${one(margin)}-point win over ${t.opponent_name} has ${t.team_name} fans typing faster than judgment permits. The ${record(t)} record will be screenshotted accordingly.`],
    [`Public sentiment improves on the simple evidence of a ${one(margin)}-point win over ${t.opponent_name}. ${top?top.name+' supplied a useful exhibit.':''}`,`${t.team_name} supporters have a favorable finding after the ${one(margin)}-point win. The file says ${record(t)}, and nobody is appealing tonight.`]
  ]));
  else ps.push(deskChoice(t,r,[
    [`${t.team_name} fans will replay the ${one(Math.abs(margin))}-point loss to ${t.opponent_name} all week. ${top?top.name+' at least gave them something worth keeping.':''}`,`A ${one(Math.abs(margin))}-point loss leaves ${t.team_name} supporters with the familiar hobby of rewriting Sunday by Tuesday. ${top?top.name+' is the part they should not throw out.':''}`],
    [`The mood around ${t.team_name} is exactly as elegant as a ${one(Math.abs(margin))}-point loss to ${t.opponent_name} deserves. ${top?top.name+' provided one respectable detail.':''}`,`${t.team_name} supporters have been handed a ${one(Math.abs(margin))}-point loss and no tasteful way to display it. ${top?top.name+' deserved a better frame.':''}`],
    [`${t.team_name} lost by ${one(Math.abs(margin))}, so the group chat is now a crime scene with reaction GIFs. ${top?top.name+' is spared the angry font.':''}`,`A ${one(Math.abs(margin))}-point loss to ${t.opponent_name} has ${t.team_name} fans reaching for capital letters. ${top?top.name+' gets the lone friendly headline.':''}`],
    [`The public file opens with a ${one(Math.abs(margin))}-point loss to ${t.opponent_name}. ${top?top.name+' belongs in the mitigating-evidence folder.':''}`,`${t.team_name} supporters have entered the ${one(Math.abs(margin))}-point loss into evidence. ${top?top.name+' is not the name under suspicion.':''}`]
  ]));
  if(m&&valid(m.playoff))ps.push(deskChoice(t,r,[
    [Number(m.playoff)>=70?`Postseason chances around ${one(m.playoff)}% move the bar from hope to expectation.`:Number(m.playoff)>=40?`Postseason chances around ${one(m.playoff)}% leave plenty to argue about and plenty left to earn.`:`Postseason chances around ${one(m.playoff)}% mean hope now needs wins more than slogans.`,Number(m.playoff)>=70?`Around ${one(m.playoff)}% to make the playoffs is enough for supporters to expect more than an interesting season.`:Number(m.playoff)>=40?`Around ${one(m.playoff)}% to make the playoffs keeps this season squarely in the argument.`:`Around ${one(m.playoff)}% to make the playoffs makes every useful result feel a little more expensive.`],
    [Number(m.playoff)>=70?`Postseason chances around ${one(m.playoff)}% are enough to reserve a seat at the serious table, if not the champagne.`:Number(m.playoff)>=40?`Postseason chances around ${one(m.playoff)}% are neither tragedy nor triumph; how terribly suspenseful.`:`Postseason chances around ${one(m.playoff)}% call for fewer speeches and more victories, a vulgar but effective solution.`,Number(m.playoff)>=70?`Around ${one(m.playoff)}% playoff chances make modest expectations feel underdressed.`:Number(m.playoff)>=40?`Around ${one(m.playoff)}% playoff chances leave the door open just enough to be dramatic.`:`Around ${one(m.playoff)}% playoff chances are a small invitation. Winning is how one RSVPs.`],
    [Number(m.playoff)>=70?`Postseason chances around ${one(m.playoff)}% are officially too high for timid headlines.`:Number(m.playoff)>=40?`Postseason chances around ${one(m.playoff)}% leave enough runway for a hot streak and enough danger for a meltdown headline.`:`Postseason chances around ${one(m.playoff)}% mean stop selling hope and start stacking wins.`,Number(m.playoff)>=70?`Around ${one(m.playoff)}% playoff chances mean the back page expects receipts, not potential.`:Number(m.playoff)>=40?`Around ${one(m.playoff)}% playoff chances keep both parade and panic on hold.`:`Around ${one(m.playoff)}% playoff chances need a few loud wins before the font gets bigger.`],
    [Number(m.playoff)>=70?`Postseason chances around ${one(m.playoff)}% raise the burden of proof: this roster is supposed to matter.`:Number(m.playoff)>=40?`Postseason chances around ${one(m.playoff)}% keep the case unresolved and worth watching.`:`Postseason chances around ${one(m.playoff)}% leave little room for evidence-free optimism.`,Number(m.playoff)>=70?`Around ${one(m.playoff)}% playoff chances make expectation part of the record.`:Number(m.playoff)>=40?`Around ${one(m.playoff)}% playoff chances keep the inquiry open in both directions.`:`Around ${one(m.playoff)}% playoff chances put wins at the top of the evidence request.`]
  ]));
  return ps;
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
    return {...s,paragraphs};
  });
  return reporterStructureV26(rewritten,t,args.reporter);
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
  const rivals=t.division_results||[],winners=rivals.filter(x=>Number(x.points)>Number(x.opponent_points)).map(x=>x.team_name),losers=rivals.filter(x=>Number(x.points)<Number(x.opponent_points)).map(x=>x.team_name);
  if(result==='W'){
    if(losers.length&&winners.length)return 'In '+(t.division_name||'the division')+', '+t.team_name+' gained ground on '+losers.join(', ')+' but got no breathing room from '+winners.join(', ')+'.';
    if(losers.length)return 'In '+(t.division_name||'the division')+', '+t.team_name+' also got help from '+losers.join(', ')+' losing elsewhere.';
    if(winners.length)return 'In '+(t.division_name||'the division')+', '+winners.join(', ')+' won too, so '+t.team_name+' kept pace rather than creating separation.';
  }else{
    if(winners.length&&losers.length)return 'In '+(t.division_name||'the division')+', '+winners.join(', ')+' won while '+losers.join(', ')+' lost, so the damage was mixed rather than clean.';
    if(winners.length)return 'In '+(t.division_name||'the division')+', '+winners.join(', ')+' won elsewhere, which makes this loss cost '+t.team_name+' a little more ground.';
    if(losers.length)return 'In '+(t.division_name||'the division')+', '+losers.join(', ')+' also lost, limiting the damage without making this result any prettier.';
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

function gameStory(g,slot=0){
  const star=list(g.winner)[0],loserStar=list(g.loser)[0],winnerSupport=list(g.winner)[1],loserMiss=list(g.loser).filter(p=>delta(p)!=null).sort((a,b)=>delta(a)-delta(b))[0];
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
    return open+(star?star.name+' led the winning side with '+one(star.points)+' points. ':'')+supportLine+(loserStar?loserStar.name+' answered with '+one(loserStar.points)+' for '+g.loser.team_name+'. ':'')+(loserMiss&&loserMiss.name!==loserStar?.name?loserMiss.name+' is the name that will bother the losing side after finishing at '+one(loserMiss.points)+'. ':'')+close;
  }
  if(g.margin<=6){
    const open=[
      g.winner.team_name+' escaped '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+' in one of the games everybody kept checking. ',
      'The week’s best argument against multitasking was '+g.winner.team_name+' over '+g.loser.team_name+', '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
      g.winner.team_name+' survived the kind of game that turns every lineup decision into a replay, edging '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
      'There was almost nothing between '+g.winner.team_name+' and '+g.loser.team_name+' before '+g.winner.team_name+' came out '+one(g.margin)+' points ahead. ',
      g.winner.team_name+' got the final word in a '+one(g.winner.points)+'–'+one(g.loser.points)+' grinder with '+g.loser.team_name+'. '
    ][slot%5];
    return open+(star?star.name+' mattered more because there was almost no room to waste his '+one(star.points)+' points. ':'')+(winnerSupport?winnerSupport.name+' supplied the kind of secondary performance close games punish teams for missing. ':'')+(loserStar?loserStar.name+' kept '+g.loser.team_name+' alive with '+one(loserStar.points)+'. ':'')+(loserMiss&&loserMiss.name!==loserStar?.name?loserMiss.name+' finished at '+one(loserMiss.points)+', and a line that quiet looks enormous when the margin is this small. ':'')+'Nobody gets to call a game this close destiny; both teams leave knowing exactly which handful of plays and lineup spots decided it.';
  }
  const opens=[
    g.winner.team_name+' handled '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
    g.winner.team_name+' spent Sunday making '+g.loser.team_name+' chase a game that never really came back, '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
    'One of the week’s clearest statements came from '+g.winner.team_name+', which beat '+g.loser.team_name+' '+one(g.winner.points)+'–'+one(g.loser.points)+'. ',
    g.winner.team_name+' never needed a dramatic ending against '+g.loser.team_name+', closing out a '+one(g.winner.points)+'–'+one(g.loser.points)+' win. ',
    'The comfortable result worth keeping is '+g.winner.team_name+' over '+g.loser.team_name+', '+one(g.winner.points)+'–'+one(g.loser.points)+'. '
  ];
  return opens[slot%5]+(star?star.name+' set the tone with '+one(star.points)+'. ':'')+(winnerSupport?winnerSupport.name+' made sure the winning side had more than one place to look for production. ':'')+(loserStar?loserStar.name+' was the best reply for '+g.loser.team_name+' at '+one(loserStar.points)+', but the scoreboard kept moving away. ':'')+'A comfortable early win is not a season verdict. It is permission for '+g.winner.team_name+' to expect the same standard next week.';
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
  const core=managementStory(t);if(!core)return null;
  const trade=(t.trade_acquisitions||[])[0],lead=trade?`TRADE RECEIPT: ${t.team_name} has ${trade.player_name} on the roster because management went out and dealt for him. `:`FRONT-OFFICE RECEIPT: ${t.team_name} made a move loud enough to escape the transaction crawl. `;
  return lead+core+` The back page is keeping the receipt; if the move changes a matchup a month from now, we will remember who pressed the button.`;
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

export function expandWeeklyRecapV25(o,teams,week){
  const games=uniqueGames(teams),upset=games.find(g=>g.upset),close=games.slice().sort((a,b)=>a.margin-b.margin)[0],big=games.slice().sort((a,b)=>b.combined-a.combined)[0],divisionGame=games.filter(g=>String(g.winner?.division||'')!==''&&String(g.winner?.division)===String(g.loser?.division)).sort((a,b)=>gameImportance(b)-gameImportance(a))[0];
  const chosen=[],seen=new Set();for(const g of [upset,close,big,divisionGame,...games.slice().sort((a,b)=>gameImportance(b)-gameImportance(a))])if(g&&chosen.length<5){const k=[g.winner.roster_id,g.loser.roster_id].sort().join(':');if(!seen.has(k)){seen.add(k);chosen.push(g)}}
  const upMove=movement(teams,1),downMove=movement(teams,-1),trend=playerTrend(teams),availability=availabilityStories(teams),moves=teams.map(t=>({t,text:tillyManagementStory(t)})).filter(x=>x.text).sort((a,b)=>Number(b.t.current_week_trade_count||0)-Number(a.t.current_week_trade_count||0)||(b.t.transactions?.length||0)-(a.t.transactions?.length||0)).slice(0,2),next=nextGame(teams);
  const velvet=[
    upMove?`${upMove.team_name} gained ${Math.round(Number(upMove.value_history_week.delta)).toLocaleString('en-US')} in roster value this week. That is not a trophy, but it does make the front office portfolio look rather less like hotel-lobby art. The interesting part is whether the football keeps pace with the appraisal.`:null,
    downMove&&(!upMove||String(downMove.roster_id)!==String(upMove.roster_id))?`${downMove.team_name} moved the other way, down ${Math.abs(Math.round(Number(downMove.value_history_week.delta))).toLocaleString('en-US')} in roster value. One does not burn the chaise lounge over a weekly market move, but another slide would turn tasteful concern into an actual conversation.`:null,
    trend?`${trend.p.name} is the form worth setting the good china for: ${one(trend.p.recent_form.last3_avg)} per game over the last three after ${one(trend.p.recent_form.prior3_avg)} in the prior sample for ${trend.t.team_name}. ${trend.p.recent_form.label==='hot'?'The performance has earned attention; permanence still has to survive the next few Sundays.':'The decline has lasted long enough to be impolite, and the next matchup is an opportunity to restore some decorum.'}`:null,
    ...availability
  ].filter(Boolean);
  const original=o.sections||[],reporter=i=>original[i]?.reporter||null,tillyFallback=(original[2]?.paragraphs||[]).filter(p=>String(p||'').trim()&&String(p).trim()!=='n/a').slice(0,2);
  const sections=[
    {reporter:reporter(0),heading:'What Actually Mattered This Week',paragraphs:chosen.length?chosen.flatMap((g,i)=>[gameStory(g,i),implicationStory(g,i)]):['The week did not produce enough verified matchup detail for a responsible lead story.']},
    {reporter:reporter(1),heading:'The Velvet Rope: Form, Fortune and the Week’s Unfashionable Truths',paragraphs:velvet.length?velvet:['n/a']},
    {reporter:reporter(2),heading:'The Back Page Has Receipts',paragraphs:moves.length?moves.map(x=>x.text):(tillyFallback.length?tillyFallback:['n/a'])},
    {reporter:reporter(3),heading:'Next Week, Before Everyone Gets Smarter in Hindsight',paragraphs:next?[`${next.a.team_name} and ${next.b.team_name} is the matchup to circle first. The current projection separates them by only ${one(next.gap)} points, which is close enough for one star performance, one bad lineup call or one quiet Sunday from a centerpiece to swing the whole thing.`,...(()=>{const a=list(next.a)[0],b=list(next.b)[0],arr=[];if(a||b)arr.push(`${a?a.name+' leads '+next.a.team_name:''}${a&&b?', while ':''}${b?b.name+' is the first name on '+next.b.team_name+'’s side of the marquee':''}. The fun part is that neither team gets to win the matchup on reputation.`);const ar=next.a.league_context?.record||{},br=next.b.league_context?.record||{},ap=valid(next.a.mida_outlook?.playoff)?one(next.a.mida_outlook.playoff):null,bp=valid(next.b.mida_outlook?.playoff)?one(next.b.mida_outlook.playoff):null,sameDiv=String(next.a.division||'')!==''&&String(next.a.division)===String(next.b.division);arr.push(`The larger stakes are already visible. ${next.a.team_name} enters at ${Number(ar.wins)||0}-${Number(ar.losses)||0}; ${next.b.team_name} is ${Number(br.wins)||0}-${Number(br.losses)||0}. ${sameDiv?'They share '+(next.a.division_name||'a division')+', so the winner gets the useful combination of helping itself while putting a direct rival one result further behind.':'They do not share a division, but both are still spending from the same finite regular-season runway.'}`);if(ap||bp)arr.push(`${ap?next.a.team_name+' has around '+ap+'% chance of reaching the playoffs':''}${ap&&bp?', while ':''}${bp?next.b.team_name+' is around '+bp+'%':''}. Filch’s file is less interested in declaring a favorite than in what comes after: the winner can approach the following weeks with a little more room to absorb a stumble, while the loser has to start finding that result somewhere else on the schedule.`);const ad=next.a.next_opponent_mida,bd=next.b.next_opponent_mida;if(ad||bd)arr.push(`This is the sort of matchup that can change the tone of the road ahead before it changes anything permanent in the standings. Bank it, and the next decision can be made from strength. Waste it, and every later close game starts arriving with more paperwork attached.`);return arr})()]:['The next-week slate is not complete enough to crown a matchup of the week without inventing certainty.']}
  ];
  return {...o,inquirer_version:26,editorial_revision:2,sections};
}
