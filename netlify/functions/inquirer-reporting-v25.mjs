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
  const s=p?.real_stats||{},pos=String(p?.position||'').toUpperCase(),line=String(p?.real_stat_line||'').replaceAll(' • ',', ');
  if(pos==='RB'){
    const carries=Number(s.rush_att),targets=Number(s.rec_tgt??s.targets);
    if(Number.isFinite(carries)||Number.isFinite(targets)){
      const work=(Number.isFinite(carries)?carries+' carries':'')+(Number.isFinite(carries)&&Number.isFinite(targets)?' and ':'')+(Number.isFinite(targets)?targets+' targets':'');
      const read=(carries||0)>=14||(targets||0)>=5
        ?p.name+' was not living on one lucky touch; '+work+' gave the fantasy line a real Sunday workload underneath it.'
        :p.name+' got there on a lighter '+work+' workload, so efficiency did more of the work than volume.';
      return `${line?line+'. ':''}${read}`;
    }
  }
  if(pos==='WR'||pos==='TE'){
    const targets=Number(s.rec_tgt??s.targets);
    if(Number.isFinite(targets)){
      const read=targets>=8
        ?`${targets} targets made ${p.name} a central part of the passing game, not a box-score tourist.`
        :targets>=5
          ?`${p.name} drew ${targets} targets, enough involvement to make the production feel connected to a real role.`
          :`${p.name} saw only ${targets} targets, so the fantasy total came from a narrow opportunity base.`;
      return `${line?line+'. ':''}${read}`;
    }
  }
  if(pos==='QB'){
    const att=Number(s.pass_att),rush=Number(s.rush_att),work=(Number.isFinite(att)?att+' pass attempts':'')+(Number.isFinite(att)&&Number.isFinite(rush)&&rush>0?' and ':'')+(Number.isFinite(rush)&&rush>0?rush+' carries':'');
    if(work){
      const read=(att||0)>=30||(rush||0)>=6
        ?`${p.name} had the ball often enough — ${work} — that the fantasy result came from a full offensive workload.`
        :`${p.name} worked from ${work}; this was more an efficiency story than an overwhelming-volume one.`;
      return `${line?line+'. ':''}${read}`;
    }
  }
  const solo=Number(s.tkl_solo),ast=Number(s.tkl_ast),sacks=Number(s.sack),pd=Number(s.pass_def),ints=Number(s.int),snaps=Number(s.def_snp??s.def_snaps??s.defensive_snaps);
  const tackles=(Number.isFinite(solo)?solo:0)+(Number.isFinite(ast)?ast:0);
  if(tackles||sacks||pd||ints||Number.isFinite(snaps)){
    let read='';
    if(Number.isFinite(snaps)&&snaps>=40)read=`${p.name} was on the field for ${snaps} defensive snaps, so the role was full enough to matter even before the splash plays are counted.`;
    else if(Number.isFinite(snaps))read=`${p.name} played ${snaps} defensive snaps, a smaller workload that puts more pressure on each impact play.`;
    if(tackles>=8)read+=(read?' ':'')+`The ${tackles}-tackle volume gave the IDP score a sturdy floor.`;
    else if(sacks>=1||ints>=1||pd>=2)read+=(read?' ':'')+`The impact plays made the fantasy week; another useful tackle line would make the production less dependent on one eruption.`;
    else if(!read)read=`${p.name}’s defensive production came without enough snap detail to call the role settled.`;
    return `${line?line+'. ':''}${read}`.trim();
  }
  return line?`${line}. The football line gives ${p.name} context beyond the fantasy total, even though the available usage detail is limited.`:null;
}

function playerTrajectory(p){
  const prior=Number(p?.prior_season_avg),priorGames=Number(p?.prior_season_games)||0,current=Number(p?.season_avg),games=Number(p?.season_games)||0,age=Number(p?.age),opp=opportunity(p),pos=String(p?.position||'').toUpperCase(),key=p?.id||p?.name;
  if(!Number.isFinite(prior)||prior<=0||priorGames<6||!Number.isFinite(current)||games<1)return null;
  const ratio=current/prior,oldThreshold=pos==='QB'?34:pos==='RB'?28:(pos==='WR'||pos==='TE')?30:29;
  if(games>=3&&Number.isFinite(age)&&age<=26&&ratio>=1.28&&opp?.strong)return {kind:'breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} is moving into legitimate breakout territory: ${one(current)} per game this season after ${one(prior)} across ${priorGames} games last year, with this week’s ${opp.text} giving the jump real opportunity. The new level has lasted long enough to demand attention; the next test is whether defenses can knock it back down.`,
    `${p.name} has built more than a hot box score. The season average is ${one(current)} after ${one(prior)} across ${priorGames} games last year, and ${opp.text} keeps the role attached to the production. That is a breakout case with evidence behind it, not a wish dressed as analysis.`,
    `The breakout file on ${p.name} is getting thick: ${one(current)} per game this season versus ${one(prior)} across ${priorGames} games last year, plus ${opp.text} this week. The important change is not the label; it is that the role now supports the fantasy jump.`,
    `${p.name} is forcing the conversation upward. A ${one(current)} season average after ${one(prior)} across ${priorGames} games last year would already be notable; pairing it with ${opp.text} makes the improvement much harder to dismiss as scoring luck.`
  ])};
  if(games===1&&Number.isFinite(age)&&age<=26&&ratio>=1.4&&opp?.strong)return {kind:'early-breakout',strength:ratio-1,text:keyedChoice(key,[
    `${p.name} is an early breakout watch, not a declared breakout. Week 1 landed well above last year’s ${one(prior)}-point average across ${priorGames} games, and ${opp.text} gives the spike a real workload underneath it. One more ${p.name} week with this kind of work would turn an interesting opener into a real role change.`,
    `Put ${p.name} on the breakout watch list, but keep the permanent marker capped. The opener cleared last year’s ${one(prior)}-point average across ${priorGames} games, while ${opp.text} shows there was actual opportunity behind it. Another Sunday with the same ${p.name} workload would make the breakout case considerably harder to dismiss.`,
    `${p.name} gave us the kind of opener that earns a breakout question. Last year’s baseline was ${one(prior)} across ${priorGames} games; this week came with ${opp.text} and a much louder fantasy result. The old baseline still matters, but ${p.name} has given this team a legitimate reason to wonder whether something changed.`,
    `${p.name} has an early breakout case because the fantasy spike came with ${opp.text}, not because Week 1 is magical. He averaged ${one(prior)} across ${priorGames} games last year. If ${p.name} keeps this opportunity another Sunday, the opener starts looking less like a spike and more like a new job description.`
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
    `${p.name} opened well below last year’s ${one(prior)}-point average across ${priorGames} games. Treat it as a Week 1 stumble, not proof of decline; the next useful signal is whether the role and opportunity rebound.`,
    `${p.name} started the year far under the ${one(prior)}-point average he carried across ${priorGames} games last season. One bad opener does not make a decline trend, but it does put the next workload under a brighter light.`,
    `The opener was a sharp drop from ${p.name}’s ${one(prior)}-point average across ${priorGames} games last year. That is enough to ask what happened to the role, nowhere near enough to call the player finished.`,
    `${p.name} gave us a bad first data point against a ${one(prior)}-point average over ${priorGames} games last season. One ugly opener does not erase ${p.name}’s established baseline; the role next Sunday will say much more than the Week 1 total did.`
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
    out.push(`${tag}: ${x.tr.text}${situ?' '+situ:''} For ${x.t.team_name}, the point is not the label; it is whether this player’s role changes what the roster can reasonably expect next week.`);
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
  if(kind==='players'&&top)return [(rows[1]?rows[1].name+' matters here because good teams stop asking the same star to rescue them every week. ':'')+'For '+t.team_name+', the names below '+top.name+' decide whether this lineup travels when the schedule gets less friendly.','What I want to see next is whether '+t.team_name+' can make an ordinary Sunday feel safe behind '+top.name+'. For '+t.team_name+', dependable depth is what keeps every week from becoming an emergency.'];
  if(kind==='management')return [memory||'Management gets judged on what remains useful after the transaction notification disappears. A move that fixes a weekly problem will age better than one that merely created activity.'];
  if(kind==='sentiment')return [t.team_name+' fans can enjoy the result without pretending September has issued a final ruling. The optimism is allowed; the next Sunday still has to earn it.'];
  if(kind==='outlook')return [(Number.isFinite(rank)?t.team_name+' sits around No. '+rank+' in the league table. ':'')+'The cleanest road for '+t.team_name+' is boring in the best way: bank the winnable games now so November does not require miracles.'];
  if(kind==='hot-seat'||kind==='cool-throne')return ['The chair lasts a week for '+t.team_name+'. Reputation takes longer. The follow-up performance from this roster is what turns the note into a trend worth remembering.'];
  return [];
}
function bartholomewExpansion(t,kind){
  const rows=list(t),top=rows[0],second=rows[1],memory=managerMemory(t),m=t.mida_outlook;
  if(kind==='lede')return ['A single Sunday is not a coronation, naturally, but '+t.team_name+' has at least supplied a scene worth lingering over. '+(top?top.name+' gave the afternoon its leading man'+(second?', while '+second.name+' kept the production from becoming an embarrassing one-person recital.':'.'): 'The ensemble now owes us a sequel.')];
  if(kind==='players'&&top)return [top.name+' supplied the star turn; the season becomes genuinely interesting when the rest of the cast makes that level of performance feel less exceptional and more like the house style.','Behind '+top.name+', '+t.team_name+' now has a choice: turn the supporting cast into recurring characters or leave them as beautifully dressed extras. For '+t.team_name+', the former makes the roster dangerous; the latter gives this columnist a recurring complaint.'];
  if(kind==='management')return [memory||'Roster construction is fashion only until kickoff. After that, every expensive accessory has to reveal whether it can actually play.'];
  if(kind==='sentiment')return ['Supporters are entitled to a little theater. '+t.team_name+' now has to make sure the applause is attached to something sturdier than one flattering scoreline.'];
  if(kind==='outlook')return [(valid(m?.playoff)?'With a postseason path around '+one(m.playoff)+'%, ':'')+'the next engagement is less about forecasting destiny than accumulating the kind of wins that make the autumn schedule feel civilized instead of desperate.'];
  if(kind==='hot-seat')return ['The uncomfortable chair is not a banishment for '+t.team_name+'; it is a request for a better performance, preferably before this columnist is forced to become repetitive and therefore common.'];
  if(kind==='cool-throne')return ['The comfortable chair at '+t.team_name+' is deserved for the week. Permanence, like good tailoring, requires repetition.'];
  return [];
}
function tillyExpansion(t,kind){
  const rows=list(t),top=rows[0],second=rows[1],memory=managerMemory(t),rank=Number(t.league_context?.standings_rank);
  if(kind==='lede')return [(Number(t.points)>Number(t.opponent_points)?'WIN FILED. NOW MAKE IT A STREAK. ':'LOSS FILED. NOW GIVE US A RESPONSE. ')+(top?top.name+' gets the big type, because somebody has to own the first sentence.':'The next edition needs a hero.')];
  if(kind==='players'&&top)return [top.name+' gets the banner. '+(second?second.name+' gets the next column. ':'The supporting cast gets a challenge.')+'If '+t.team_name+' wants to become a weekly problem for the league, the names below '+top.name+(second?' and '+second.name:'')+' have to keep showing up too.',t.team_name+' cannot ask '+top.name+' to carry every edition. The Back Page wants another name earning ink before one superstar turns the entire lineup into a weekly dependency.'];
  if(kind==='management')return [memory||'The back page does not award trophies for transaction volume. Make the roster better, make the move matter, and then we will print the victory lap.'];
  if(kind==='sentiment')return ['The '+t.team_name+' group chat is allowed to overreact. That is what group chats are for. The standings get the final edit, so '+t.team_name+' still has to give them something fun to print.'];
  if(kind==='outlook')return [(Number.isFinite(rank)?'CURRENT TABLE: No. '+rank+'. ':'')+'Every '+t.team_name+' win banked now is one fewer November emergency. A favorable matchup wasted by this team becomes a future headline with much worse punctuation.'];
  if(kind==='hot-seat')return ['One bad week gets angry font. Two starts a storyline. Three gets a nickname nobody wants.'];
  if(kind==='cool-throne')return [top?top.name+' earned the picture above the fold for '+t.team_name+'. Do it again and the Back Page starts saving front pages.':'The week produced a Cool Throne without enough player detail for a larger claim.'];
  return [];
}
function filchExpansion(t,kind){
  const rows=list(t),top=rows[0],memory=managerMemory(t),ctx=t.league_context||{},op=t.next_opponent_context||{},sameDivision=!!t.next_divisional;
  if(kind==='lede')return ['The '+t.team_name+' score closes the first file and opens the more important one: what from this week is likely to survive contact with '+String(t.next_opponent_name||'the next opponent')+'? '+(top?top.name+' is the strongest answer on the page.':'The lineup still owes the inquiry a clear answer.')];
  if(kind==='players'&&top)return ['The production around '+top.name+' matters because '+t.team_name+' cannot hide roster dependence for long. If the same supporting names keep appearing for '+t.team_name+', that is depth; if they vanish, this week becomes an outlier with excellent publicity.','The next '+t.team_name+' file will compare the same names again. Repeated support turns '+top.name+'’s strong performance into roster structure; disappearing support turns it into evidence that he is doing too much of the work.'];
  if(kind==='management')return [memory||'A front office move stays in the file after the ticker forgets it. Role, opportunity and what management gave up will decide whether the transaction reads better a month from now.'];
  if(kind==='sentiment')return ['Public opinion enters the '+t.team_name+' record because it remembers what came before. One win can improve the mood; only repeated competent Sundays can rewrite '+t.team_name+'’s reputation.'];
  if(kind==='outlook')return [(sameDivision?'The next '+t.team_name+' matchup is divisional, so the result shifts both sides of the race at once. ':'The next '+t.team_name+' matchup still spends one of a finite number of regular-season chances. ')+(op?.record?' '+String(t.next_opponent_name||'The opponent')+' arrives with its own '+String(op.record.wins||0)+'-'+String(op.record.losses||0)+' pressure, which makes '+t.team_name+'’s road ahead a two-team problem rather than a projection exercise.':'The schedule will reveal quickly whether this week solved anything durable.')];
  if(kind==='hot-seat'||kind==='cool-throne')return ['The '+t.team_name+' file remains open after one appearance in this chair. Repetition is what converts this weekly note into something '+t.manager_name+' actually has to answer.'];
  return [];
}
function seasonContextStoryV26(t,r){
  const ctx=t.league_context||{},rank=Number(ctx.standings_rank),size=Number(ctx.league_size)||32,st=ctx.streak||{},recent=Number(ctx.recent_avg_points),prior=Number(ctx.prior_five_avg_points),week=Number(t.week_classification?.week)||1;
  const streak=Number(st.length)>=2?`${Number(st.length)}-game ${st.type==='W'?'winning':st.type==='L'?'losing':'result'} streak`:'no multi-game streak yet';
  const form=Number.isFinite(recent)&&Number.isFinite(prior)&&Math.abs(recent-prior)>=4?` Recent scoring sits at ${one(recent)} per game versus ${one(prior)} in the preceding stretch, so the direction of travel is starting to show.`:'';
  return deskChoice(t,r,[
    [`${t.team_name} leaves Week ${week} at ${record(t)}${Number.isFinite(rank)?', No. '+rank+' of '+size:''}, with ${streak}. September tables are temporary, but banked wins are not, and the old desk has learned not to confuse those two things.${form}`],
    [`The table now seats ${t.team_name} at ${record(t)}${Number.isFinite(rank)?', No. '+rank+' of '+size:''}, carrying ${streak}. It is far too early for coronations and exactly early enough for consequences; one can be tasteful without pretending the standings are imaginary.${form}`],
    [`THE RECEIPT THAT LASTS: ${t.team_name} is ${record(t)}${Number.isFinite(rank)?', sitting No. '+rank+' of '+size:''}, with ${streak}. The Back Page can scream about stars all night, but this is the line that still matters when everybody wakes up Monday.${form}`],
    [`The season file now reads ${t.team_name}: ${record(t)}${Number.isFinite(rank)?', standing No. '+rank+' of '+size:''}, ${streak}. One week never closes a case, but every result changes what the next one is allowed to mean.${form}`]
  ]);
}

function currentOpponentFootballStory(t,r){
  const o=t.opponent_roster,rows=(o?.starters||o?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const star=rows[0],second=rows[1];if(!star)return null;
  const starLine=statSituation(star),won=Number(t.points)>Number(t.opponent_points);
  const open=deskChoice(t,r,[
    [`${t.opponent_name} did not arrive empty-handed. ${star.name} gave them ${one(star.points)} fantasy points${second?' and '+second.name+' added '+one(second.points):''}. ${won?t.team_name+' absorbed that and still controlled the final score; that is a better description of the win than pretending the other side simply failed.':t.team_name+' never found enough counterweight, which is why the opponent’s best player became part of the final margin.'}`],
    [`${t.opponent_name} brought its own leading man in ${star.name}, who produced ${one(star.points)} fantasy points${second?', with '+second.name+' supplying '+one(second.points)+' beside him':''}. ${won?'The pleasing part for '+t.team_name+' is that the evening survived somebody else getting a star turn.':'The unpleasant part for '+t.team_name+' is that the rival marquee performance never received a convincing answer.'}`],
    [`${t.opponent_name.toUpperCase()} HAD A PUNCH TOO: ${star.name}, ${one(star.points)} fantasy points${second?', plus '+one(second.points)+' from '+second.name:''}. ${won?t.team_name+' took it and kept scoring.':'That punch landed because '+t.team_name+' did not build enough offense around its own headliners.'}`],
    [`The opposing file starts with ${star.name}: ${one(star.points)} fantasy points for ${t.opponent_name}${second?', followed by '+one(second.points)+' from '+second.name:''}. ${won?t.team_name+' won despite the opponent producing a real centerpiece, which strengthens the result.':t.team_name+' lost while the opponent’s best evidence remained unanswered, a detail worth carrying into the rematch file.'}`]
  ]);
  return [open,starLine].filter(Boolean).join(' ');
}

function teamScoreConstructionStory(t,r){
  const rows=list(t);if(!rows.length||!valid(t.points))return null;
  const top=rows[0],top3=rows.slice(0,3),top3pts=top3.reduce((n,p)=>n+Number(p.points||0),0),share=Number(t.points)>0?top3pts/Number(t.points):0,margin=Number(t.points)-Number(t.opponent_points),projDelta=valid(t.projected)?Number(t.points)-Number(t.projected):null;
  const shape=share>=.58
    ?`The top three starters supplied about ${Math.round(share*100)}% of the team total, so this was a top-heavy construction even if the final number looked comfortable.`
    :`The top three starters accounted for about ${Math.round(share*100)}% of the total, leaving enough production elsewhere that the lineup was not living entirely off one corner of the roster.`;
  const expectation=projDelta==null?'':Math.abs(projDelta)<6
    ?`The finish landed close to the pregame projection, which makes the result feel more like the roster doing its normal job than a one-week eruption.`
    :projDelta>0
      ?`${t.team_name} beat its projection by ${one(Math.abs(projDelta))}, and the important question is how much of that came from roles that can repeat rather than touchdowns that happened to fall perfectly.`
      :`${t.team_name} finished ${one(Math.abs(projDelta))} below projection, so the final score left real expected production on the table.`;
  return [shape,expectation].filter(Boolean).join(' ');
}

function supportingCastFootballStory(t,r){
  const rows=list(t),second=rows[1],third=rows[2];if(!second)return null;
  const pieces=[];
  for(const p of [second,third].filter(Boolean)){
    const ctx=statSituation(p),prior=Number(p.prior_season_avg),priorGames=Number(p.prior_season_games)||0;
    const baseline=Number.isFinite(prior)&&prior>0&&priorGames>=6
      ?(Number(p.points)>=prior*1.25?`That cleared last year’s ${one(prior)}-point average by enough to matter.`:Number(p.points)<=prior*.7?`That sat well below last year’s ${one(prior)}-point average, so the role matters as much as the disappointing total.`:`That lived near the ${one(prior)}-point average established across ${priorGames} games last season.`)
      :'';
    pieces.push(`${p.name} gave ${t.team_name} ${one(p.points)} fantasy points. ${ctx||''} ${baseline}`.trim());
  }
  const close=deskChoice(t,r,[
    [`That supporting work matters for ${t.team_name} because ${rows[0]?.name||'the leading scorer'} cannot be the emergency plan every Sunday.`],
    [`For ${t.team_name}, that is the difference between a star turn surrounded by furniture and an ensemble that can survive a less glamorous afternoon.`],
    [`That is the part of the ${t.team_name} box score worth keeping in big type: more than one player gave the lineup somewhere to go.`],
    [`The file looks healthier when ${t.team_name} can point to multiple usable roles instead of one witness carrying the entire case.`]
  ]);
  return pieces.join(' ')+(pieces.length?' ':'')+close;
}

function lineupProcessStory(t,r){
  const miss=t.best_lineup_miss,w=t.worst_starter,b=t.best_bench;
  if(miss?.reserve&&miss?.starter&&Number.isFinite(Number(miss.gap))&&Number(miss.gap)>0){
    return deskChoice(t,r,[
      [`${miss.reserve.name} was legally eligible for ${miss.starter.name}’s ${miss.slot||miss.starter.lineup_slot||'lineup'} spot and outscored him by ${one(miss.gap)}. That does not make the original call indefensible, but it does put a concrete lineup decision — not vague hindsight — into ${t.manager_name}’s Week 1 review.`],
      [`There was one selection worth revisiting over a civilized drink: ${miss.reserve.name} could actually have replaced ${miss.starter.name} at ${miss.slot||miss.starter.lineup_slot||'the same lineup spot'} and scored ${one(miss.gap)} more. ${t.manager_name} need not confess to a crime; the next similar decision simply arrives with precedent.`],
      [`LINEUP RECEIPT: ${miss.reserve.name} had a legal path into ${miss.starter.name}’s ${miss.slot||miss.starter.lineup_slot||'spot'} and left ${one(miss.gap)} more points on the bench. That is a real ${t.team_name} decision to argue about, not fantasy-manager fan fiction.`],
      [`The lineup file contains an actual alternative: ${miss.reserve.name} was eligible for ${miss.starter.name}’s ${miss.slot||miss.starter.lineup_slot||'spot'} and produced ${one(miss.gap)} more points. The distinction matters because Filch prosecutes available choices, not impossible bench swaps.`]
    ]);
  }
  if(w&&b)return deskChoice(t,r,[
    [`${w.name} was the quietest starter while ${b.name} led the bench, but there was no verified legal swap large enough to rewrite the result. For ${t.team_name}, that makes this more a production problem than a lineup-management scandal.`],
    [`${b.name} had the bench headline and ${w.name} had the softest starting return, yet the eligible-lineup check did not produce a clean rescue. Sometimes the ugly chair really was the best chair available.`],
    [`The bench had ${b.name}; the starting lineup had a quieter ${w.name}. No verified eligible swap turned that into an obvious managerial own-goal, so the Back Page is blaming the football before blaming the button-clicking.`],
    [`${b.name} led the bench while ${w.name} supplied the weakest starting total, but the eligibility file does not support an easy “start the other guy” indictment. The roster still owns the weak point even when management does not own a clean alternative.`]
  ]);
  return null;
}

function chairFootballStory(t,kind,r){
  const rows=list(t).filter(p=>delta(p)!=null);if(!rows.length)return null;
  const p=kind==='hot-seat'?rows.slice().sort((a,b)=>delta(a)-delta(b))[0]:rows.slice().sort((a,b)=>delta(b)-delta(a))[0];
  if(!p)return null;
  const ctx=statSituation(p),prior=Number(p.prior_season_avg),priorGames=Number(p.prior_season_games)||0;
  const hist=Number.isFinite(prior)&&prior>0&&priorGames>=6
    ?(Number(p.points)<prior*.6?`Last season’s ${one(prior)}-point average across ${priorGames} games makes this look like a bad Sunday against an established floor, not proof that the floor disappeared.`:Number(p.points)>prior*1.3?`Last season’s ${one(prior)}-point average gives this spike context: ${p.name} beat an established baseline by a meaningful amount.`:`The result stayed in the neighborhood of last season’s ${one(prior)}-point average.`)
    :'';
  return [ctx,hist].filter(Boolean).join(' ')||null;
}

function nextOpponentFootballStory(t,r){
  const o=t.next_opponent_roster,rows=(o?.starters||o?.players||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),star=rows[0],second=rows[1];
  if(!o||!star)return null;
  const ctx=statSituation(star),opp=t.next_opponent_name||o.team_name,rec=t.next_opponent_context?.record,playoff=t.next_opponent_mida?.playoff;
  const open=deskChoice(t,r,[
    [`The next opponent is not anonymous: ${opp} just got ${one(star.points)} fantasy points from ${star.name}${second?' and '+one(second.points)+' from '+second.name:''}. That is the personnel problem ${t.team_name} is walking toward, not merely a projection number.`],
    [`${opp} arrives with ${star.name} fresh off ${one(star.points)} fantasy points${second?', while '+second.name+' added '+one(second.points):''}. The appointment has enough actual Week 1 form to be more interesting than whatever the forecast says over cocktails.`],
    [`NEXT WEEK HAS NAMES: ${star.name} just scored ${one(star.points)} for ${opp}${second?', with '+one(second.points)+' from '+second.name:''}. ${t.team_name} does not get to prepare for a logo; it gets that lineup.`],
    [`The next file already has a lead witness. ${star.name} produced ${one(star.points)} fantasy points for ${opp}${second?', and '+second.name+' followed with '+one(second.points):''}. ${t.team_name} gets a specific football problem rather than a generic next-week placeholder.`]
  ]);
  const stakes=(t.next_divisional?`${opp} shares ${t.division_name||'the division'} with ${t.team_name}, so the result moves both sides of the standings ledger at once. `:'')+(rec?`${opp} enters at ${Number(rec.wins)||0}-${Number(rec.losses)||0}. `:'')+(valid(playoff)?`Its current playoff path sits around ${one(playoff)}%, which gives the matchup consequences on both sides of the table.`:'');
  return [open,ctx,stakes].filter(Boolean).join(' ');
}

function broadcastExpansionV26(t,kind,r){
  if(kind==='lede')return [seasonContextStoryV26(t,r),teamScoreConstructionStory(t,r),currentOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='players')return [supportingCastFootballStory(t,r)].filter(Boolean);
  if(kind==='management')return [lineupProcessStory(t,r)].filter(Boolean);
  if(kind==='outlook')return [nextOpponentFootballStory(t,r)].filter(Boolean);
  if(kind==='hot-seat'||kind==='cool-throne')return [chairFootballStory(t,kind,r)].filter(Boolean);
  return [];
}

function reporterExpansionV26(t,kind,r){
  return broadcastExpansionV26(t,kind,r);
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
    [`${second.name} joined ${top.name} among the names worth printing. Two headline performances made the lineup considerably harder to flatten.`,`${top.name} got the biggest type, but ${second.name} earned ink too. That is how a lineup starts sounding dangerous.`],
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
    ['A few clean wins would make the paperwork friendlier.','A few clean '+team+' wins would make the paperwork friendlier.']
  ];
  for(const [from,to] of swaps)p=p.replaceAll(from,to);
  return p;
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
  if(isTrade&&add)bits.push(`TRADE FOLLOW-UP: ${t.team_name} brought in ${add}${drop?' and sent out '+drop:''}. That is a roster bet with a price attached, so the back page gets to keep grading the football consequences long after the transaction alert disappears.`);
  else if(add&&drop)bits.push(choose(t,[`BACK PAGE SWAP: ${t.team_name} brought in ${add} and moved on from ${drop}. Now the new piece has to make the Sunday lineup better; winning the transaction feed is not a standings category.`,`THE BACK PAGE CHANGED THE NAMEPLATE: ${add} in, ${drop} out for ${t.team_name}. The only interesting verdict is whether that exchange fixes something once the lineup locks.`]));
  else if(add)bits.push(choose(t,[`BACK PAGE ARRIVAL: ${t.team_name} added ${add}. The interesting part starts now: role, usage and whether this player fixes something the roster actually needed.`,`NEW NAME, SAME DEMAND: ${add} is on ${t.team_name} now. Give the back page a football reason to care—real snaps, real usage and a role that survives past the transaction alert.`]));
  else if(drop)bits.push(choose(t,[`BACK PAGE CUT WATCH: ${t.team_name} moved on from ${drop}. The question is whether ${t.team_name} makes the vacated role more useful by Sunday, not whether the move looked tidy on Tuesday.`,`THE BACK PAGE NOTICED THE EXIT: ${drop} is gone from ${t.team_name}. If the roster is better for it, the replacement should make that obvious before this becomes a recurring question.`]));
  if(incoming&&valid(incoming.points))bits.push(`${incoming.name} immediately gave ${t.team_name} ${one(incoming.points)} fantasy points${incoming.real_stat_line?' from '+incoming.real_stat_line.replaceAll(' • ',', '):''}. ${playerContextParagraph(incoming)||'That first return is worth noting without pretending the sample is finished.'}`);
  if(outgoing&&valid(outgoing.points)&&Number(outgoing.points)>=10)bits.push(`${outgoing.name} answered the exit with ${one(outgoing.points)} points. That does not make the move wrong by itself, but it guarantees ${t.manager_name} gets a follow-up question if the replacement does not produce.`);
  bits.push(choose(t,[`For ${t.team_name}, this move should be judged across the next several matchups: does the role improve, does the roster gain another way to win, and does the cost keep looking reasonable once the first-week noise is gone?`,`The verdict can wait. What matters for ${t.team_name} is whether this decision keeps helping after the novelty wears off—better usage, better lineup options, or one fewer weak spot to explain.`]));
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
  const synthesis=leagueSynthesis(teams);if(synthesis)matterBlocks.push({heading:'The League-Wide Read',paragraphs:[synthesis]});
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
      arr.push(`This is the sort of matchup that can change the tone of the road ahead before it changes anything permanent in the standings. Bank it, and the next close game arrives with less pressure. Waste it, and the schedule gets a little less forgiving.`);
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
