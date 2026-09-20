import {humanSectionsV22} from './inquirer-context-v22.mjs';

const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const one=x=>Number(x).toFixed(1);
const amount=x=>Math.round(Number(x)).toLocaleString('en-US');
const names=xs=>xs.map(x=>x.name).join(', ');
const voice=r=>({'walter-mercer':0,'tess-delaney':1,'mack-hollis':2,'nora-voss':3}[r?.id]??0);
const say=(r,options)=>options[voice(r)];
const record=r=>`${Number(r?.wins)||0}-${Number(r?.losses)||0}${Number(r?.ties)?'-'+r.ties:''}`;

export function selectImportantMoves(t,facts){
  const seen=new Set(),starters=new Set((t.starter_details||[]).map(p=>String(p.id)));
  return (t.transactions||[]).filter(m=>!m.status||m.status==='complete').map(m=>{
    const key=m.id||JSON.stringify([m.adds,m.drops,m.created]);if(seen.has(key))return null;seen.add(key);
    const add=(m.adds||[]).map(id=>facts[String(id)]).filter(Boolean),drop=(m.drops||[]).map(id=>facts[String(id)]).filter(Boolean),assets=[...add,...drop];
    if(!assets.length||assets.length!==(m.adds||[]).length+(m.drops||[]).length)return null;
    const priced=assets.every(p=>valid(p.value)),scored=assets.every(p=>valid(p.points));
    const incoming=priced?add.reduce((n,p)=>n+Number(p.value),0):null,outgoing=priced?drop.reduce((n,p)=>n+Number(p.value),0):null;
    const produced=scored?add.reduce((n,p)=>n+Number(p.points),0):null,departed=scored?drop.reduce((n,p)=>n+Number(p.points),0):null;
    const largest=Math.max(0,...assets.filter(p=>valid(p.value)).map(p=>Number(p.value))),lineup=add.some(p=>starters.has(String(p.id))),production=Math.max(0,...assets.filter(p=>valid(p.points)).map(p=>Number(p.points)));
    // Select for material roster value, production, or an actual starting addition, not activity count.
    if(largest<2500&&production<10&&!lineup)return null;
    const importance=largest+(priced?Math.abs(incoming-outgoing):0)+production*100+(lineup?1500:0);
    return {move:m,add,drop,priced,scored,incoming,outgoing,produced,departed,importance,lineup};
  }).filter(Boolean).sort((a,b)=>b.importance-a.importance||String(a.move.id).localeCompare(String(b.move.id))).filter((m,i,all)=>i===0||m.importance>=all[0].importance*.4).slice(0,2);
}

function transactionCopy(t,m,r){
  const {add,drop,priced,incoming,outgoing,scored,produced,departed}=m,trade=m.move.type==='trade';
  const action=add.length&&drop.length?(trade?'bringing in ':'adding ')+names(add)+' '+(trade?'while sending away ':'and cutting ')+names(drop):add.length?'bringing in '+names(add):(trade?'sending away ':'cutting ')+names(drop);
  let text=say(r,[`The move I keep coming back to is ${t.manager_name} ${action}. `,`${t.manager_name} gave us something substantial to discuss by ${action}. `,`The back page has a question for ${t.manager_name} about ${action}. `,`The consequential decision from ${t.manager_name} was ${action}. `]);
  if(priced){const delta=incoming-outgoing,near=Math.abs(delta)<=Math.max(incoming,outgoing)*.05;
    text+=`At current player values, ${add.length?names(add)+(add.length===1?' is worth ':' are worth ')+amount(incoming):'nothing came in'}${drop.length?', against '+amount(outgoing)+' for '+names(drop):', with no player value sent out'}. `;
    if(trade)text+='That is the player side of the deal; any draft-pick compensation has to be weighed before calling the whole trade a win or loss. ';
    else if(near)text+='The value difference is small enough that fit and immediate production deserve more attention than the price gap. ';
    else if(delta>0)text+=say(r,['That is useful value to collect without paying the same back. ','An improvement to the balance sheet, provided the new arrival has a job to do. ','That is a roster gain worth discussing, not just another button press. ','The incoming value supports the decision. ']);
    else text+=say(r,['That is a meaningful amount of value to give up; the replacement needs to justify the sacrifice. ','The departure is the expensive part of this arrangement. A roster spot alone does not make the bill disappear. ','There is real value walking out the door. Management needs more than a fondness for the add button to explain it. ','The value surrendered makes the replacement plan central to judging the decision. ']);
  }
  if(scored){
    if(add.length&&drop.length)text+=`${names(add)} ${add.length===1?'scored':'combined for'} ${one(produced)} points this week, while ${names(drop)} produced ${one(departed)}. `+(Math.abs(produced-departed)<3?'Neither side established much of an immediate production advantage.':produced>departed?'The incoming players won this week’s production comparison.':'The outgoing players were more productive this week, which puts more pressure on the long-term case for the move.');
    else if(add.length)text+=`${names(add)} supplied ${one(produced)} points this week. `+(m.lineup?'The addition reached the starting lineup, so there was an immediate role behind the move.':produced>=10?'There is useful production here, even if turning it into a better starting lineup is a separate decision.':'This is still a depth bet; the first scoring return does not justify a victory lap.');
    else text+=`${names(drop)} produced ${one(departed)} points this week. `+(departed>=10?'That is useful depth to relinquish, even though a bench score is not automatically a missed starting score.':'The short-term scoring cost was modest; the longer-term replacement still matters.');
  }
  return text.trim();
}

export function divisionCopy(t){
  const rivals=t.division_results||[];if(!rivals.length)return null;
  const results=rivals.map(x=>`${x.team_name} ${x.points>x.opponent_points?'beat':x.points<x.opponent_points?'lost to':'tied'} ${x.opponent_name} ${one(x.points)}–${one(x.opponent_points)} (${record(x.record)})`).join('; ');
  const winners=rivals.filter(x=>x.points>x.opponent_points).map(x=>x.team_name),losers=rivals.filter(x=>x.points<x.opponent_points).map(x=>x.team_name),clauses=[];
  if(Number(t.points)>Number(t.opponent_points)){if(losers.length)clauses.push(`${t.team_name} gained a game on ${losers.join(', ')}`);if(winners.length)clauses.push(`${t.team_name} kept pace with ${winners.join(', ')}`)}
  else if(Number(t.points)<Number(t.opponent_points)){if(winners.length)clauses.push(`${t.team_name} lost a game of ground to ${winners.join(', ')}`);if(losers.length)clauses.push(`${t.team_name} got some relief from the losses by ${losers.join(', ')}`)}
  else clauses.push(`${t.team_name}’s tie leaves the division picture unsettled`);
  return `Around ${t.division_name||'the division'}, ${results}. ${clauses.length?clauses.join('; '):'The tied results elsewhere left the race open'}. `+(t.next_divisional?'The next opponent is a division rival, so that matchup directly affects both teams’ position in the race.':winners.length&&Number(t.points)<Number(t.opponent_points)?'Another loss would leave this team relying more heavily on help from those rivals.':'Next week is a chance to improve that position before the division has time to separate.');
}

export function outlookCopy(t,week,r){
  const ps=[],m=t.mida_outlook,op=t.next_opponent_name,projected=valid(t.next_projected)&&valid(t.next_opponent_projected),gap=projected?Number(t.next_projected)-Number(t.next_opponent_projected):null;
  const rec=t.league_context?.record||{},losses=Number(rec.losses)||0,wins=Number(rec.wins)||0,remaining=Math.max(0,13-Number(week));
  if(op&&projected)ps.push(`${t.team_name} faces ${op} projected to score ${one(t.next_projected)} against ${one(t.next_opponent_projected)}, ${gap>0?'favored by '+one(gap):gap<0?'an underdog by '+one(-gap):'an even matchup'}. `+(gap>=10?'This is one of the games the forecast expects this roster to bank. Dropping it would mean finding an extra win somewhere less comfortable.':gap<=-10?'Winning would steal a game the forecast is not handing this team. Losing would fit the matchup expectation, but it would still use up a week on the schedule.':'With so little projected separation, a sound lineup decision can matter more than either team’s reputation.'));
  if(m&&valid(m.playoff)){
    let stakes=m.playoff>=75?(losses>wins?'The model still likes this roster despite its losing record; the immediate task is to stop making that confidence depend on a turnaround.':'This is about protecting a strong playoff path, not treating September confidence as a clinched berth.'):m.playoff>=40?(gap!=null&&gap<0?'A win over this opponent would be a valuable result for a team whose playoff position is promising but far from secure.':'For a team in the middle of the playoff picture, this is a chance to build a cushion rather than spend the rest of the season chasing one.'):gap!=null&&gap>=0?'A modest playoff chance makes a favorable matchup particularly important: wasting this opening would increase the burden on the tougher games ahead.':'The playoff path already requires this roster to exceed expectations; an upset here would be a useful first installment.';
    const consequence=Number(week)<4?`A loss would make the record ${wins}-${losses+1}; with ${remaining} regular-season games left before this matchup, that would add pressure without making this a must-win.`:remaining<=3?`Only ${remaining} regular-season game${remaining===1?' remains':'s remain'}, so there is little room left to recover from a dropped opportunity.`:`A win moves the record to ${wins+1}-${losses}; a loss leaves it ${wins}-${losses+1}, with one fewer chance to improve it.`;
    ps.push(`MIDA gives ${t.team_name} a ${one(m.playoff)}% playoff chance${valid(m.title)?' and '+one(m.title)+'% championship chance':''} (as of ${m.source_date}). ${stakes} ${consequence}`);
    if(valid(m.title)&&m.title>=5)ps.push(say(r,[`At ${one(m.title)}% to win the championship, ${t.team_name} has reason to think beyond scraping into the bracket. A cleaner route through the regular season is worth pursuing; the next game is part of earning it.`,`A ${one(m.title)}% title chance gives ${t.team_name} a credible invitation to the serious table. That makes taking care of this next assignment more persuasive than talking about January.`,`The ${one(m.title)}% championship chance is enough to give ${t.team_name} ambition, not enough to print tickets. Start by taking care of ${op||'the next opponent'}.`,`The title estimate of ${one(m.title)}% makes ${t.team_name} more than a playoff-entry case. The next result should be judged against that higher expectation.`]));
  }
  const division=divisionCopy(t);if(division)ps.push(division);
  return ps.length?ps:['n/a'];
}

export function sentimentCopy(t,r){
  if(!valid(t.points)||!valid(t.opponent_points))return ['n/a'];
  const margin=Number(t.points)-Number(t.opponent_points),projection=valid(t.projected)?Number(t.points)-Number(t.projected):null,m=t.mida_outlook,st=t.league_context?.streak,top=(t.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0];
  let mood=margin===0?'mixed feelings after a tied matchup':margin>0?(margin<=7?'relief after a close escape':projection!=null&&projection< -10?'satisfaction with the win, tempered by the scoring shortfall':'confidence after a convincing result'):(margin>=-7?'frustration at a game that stayed within reach':projection!=null&&projection>=10?'anger at the result despite a strong scoring effort':'impatience after a heavy defeat');
  const first=say(r,[`${t.team_name} supporters have earned some ${mood}. `,`The mood around ${t.team_name} is ${mood}. `,`${t.team_name} gave the group chat ${mood}. `,`The public reaction to ${t.team_name} starts with ${mood}. `])+`The ${one(t.points)}–${one(t.opponent_points)} ${margin>0?'win over':margin<0?'loss to':'tie with'} ${t.opponent_name} sets the mood going into next week.`;
  const ps=[first];
  if(m&&valid(m.playoff))ps.push(m.playoff>=75?(margin>0?`MIDA’s ${one(m.playoff)}% playoff chance means ${t.team_name} is expected to deliver results like this. Supporters can enjoy the win while still asking whether ${top?.name||'the leading players'} can keep the production coming.`:`With MIDA still putting ${t.team_name} at ${one(m.playoff)}% to reach the playoffs, the frustration is about falling short of a strong expectation. That is a demand for a response from ${t.manager_name}, not evidence that the season is finished.`):m.playoff<40?(margin>0?`For a team with a ${one(m.playoff)}% MIDA playoff chance, this win gives ${t.team_name} supporters something more substantial than optimism. It earns hope; it does not erase the longer odds.`:`MIDA’s ${one(m.playoff)}% playoff chance had already set a difficult backdrop for ${t.team_name}. Another poor result makes visible progress from individual players and smarter roster decisions more important to retaining belief.`):`At ${one(m.playoff)}% to make the playoffs in MIDA, ${t.team_name} lives in the part of the standings where every ${margin>0?'win buys breathing room':'loss sharpens the anxiety'}. The next response matters more than any sweeping verdict on ${t.manager_name}.`);
  if(st&&Number(st.length)>=2)ps.push(`${t.team_name} has now ${st.type==='W'?'won':'lost'} ${st.length} straight. `+(st.type==='W'?'Repeated results are giving the confidence a foundation beyond one exciting afternoon.':'That repetition is why criticism of management is becoming harder to dismiss as a reaction to one bad matchup.'));
  else if(top&&valid(top.points))ps.push(`${top.name} supplied ${one(top.points)} of ${one(t.points)} points for ${t.team_name}. `+(Number(top.points)>Number(t.points)*.3?'Supporters have an obvious player to applaud, and an equally obvious question about how much help the rest of the lineup can provide.':margin>0?'That performance gives supporters someone to celebrate while waiting to see whether this team can stack another win behind it.':'The crowd can recognize that contribution while still expecting more from the rest of the lineup.'));
  return ps;
}

export function humanSectionsV23(args){
  const {team,reporter,facts={},week}=args;
  return humanSectionsV22(args).map(s=>{
    if(s.kind==='management'){const selected=selectImportantMoves(team,facts);return {...s,paragraphs:selected.length?selected.map(m=>transactionCopy(team,m,reporter)):['n/a'],selected_transaction_ids:selected.map(m=>m.move.id||null)}}
    if(s.kind==='outlook')return {...s,paragraphs:outlookCopy(team,week,reporter)};
    if(s.kind==='sentiment')return {...s,paragraphs:sentimentCopy(team,reporter)};
    return s;
  });
}
