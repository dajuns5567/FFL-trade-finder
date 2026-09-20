import {humanSectionsV23,divisionCopy} from './inquirer-editorial-v23.mjs';

const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const one=x=>Number(x).toFixed(1);
const names=xs=>xs.map(x=>x.name).join(', ');
const record=t=>{const r=t.league_context?.record||{};return `${r.wins||0}-${r.losses||0}${r.ties?'-'+r.ties:''}`};
const list=t=>(t.starter_details||[]).filter(p=>valid(p.points)).slice().sort((a,b)=>b.points-a.points);
const delta=p=>valid(p?.projected)?Number(p.points)-Number(p.projected):null;
const group=p=>/^(DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT)$/.test(p.position)?'defense':p.position==='QB'?'quarterback':p.position==='RB'?'backfield':p.position==='TE'?'tight end':'receiving corps';
const variant=(t,items)=>items[(Number(t.roster_id)||0)%items.length];

function divisionPosition(t){
  const own=t.league_context?.record;if(!own||!(t.division_results||[]).length)return '';
  const pct=r=>(Number(r.wins||0)+Number(r.ties||0)/2)/Math.max(1,Number(r.wins||0)+Number(r.losses||0)+Number(r.ties||0));
  const score=pct(own),rivals=t.division_results.filter(r=>r.record),best=Math.max(score,...rivals.map(r=>pct(r.record))),tied=rivals.filter(r=>pct(r.record)===score);
  return score===best?(tied.length?'level with '+tied.map(r=>r.team_name).join(', ')+' for the best record in '+t.division_name:'alone with the best record in '+t.division_name):'behind '+rivals.filter(r=>pct(r.record)===best).map(r=>r.team_name).join(', ')+' in '+t.division_name;
}

export function playerImpact(t,p){
  if(!p)return 'n/a';
  const margin=Number(t.points)-Number(t.opponent_points),surplus=delta(p),role=group(p),st=p.real_stats||{};
  let detail=p.real_stat_line?` (${p.real_stat_line.replaceAll(' • ',', ')})`:'';
  let text=`${p.name} gave ${t.team_name} ${one(p.points)} fantasy points${detail}. `;
  if(role==='defense'&&(Number(st.sack||st.idp_sack)>0||Number(st.ff||st.idp_ff)>0))text+=`${p.name} supplied the impact plays from the defensive side of the roster, where sacks and forced fumbles can turn a solid tackle total into a matchup-changing return. `;
  else if(role==='backfield'&&Number(st.rush_att)>=15)text+=`The ${st.rush_att} carries gave ${t.team_name} volume to lean on in the backfield; this was a workload with substance behind it. `;
  else if((role==='receiving corps'||role==='tight end')&&Number(st.rec_tgt)>=8)text+=`${st.rec_tgt} targets kept ${p.name} involved in the passing game, a stronger foundation for this lineup spot than relying on a single long touchdown. `;
  else if(role==='quarterback')text+=`${t.team_name} needed production from its quarterback slot, and ${p.name} set the scoring pace for the rest of the lineup. `;
  else text+=`${p.name} was the leading scorer from the ${role} for ${t.team_name}, giving that part of the lineup a player to build around. `;
  if(surplus!=null&&surplus>0)text+=margin>0&&surplus>margin?`The ${one(surplus)} points above projection exceeded the ${one(margin)}-point winning margin over ${t.opponent_name}; that outperformance was large enough to cover the final gap.`:margin>0?`${p.name} beat projection by ${one(surplus)}, helping ${t.team_name} create the cushion it needed against ${t.opponent_name}.`:`Even ${one(surplus)} points above projection from ${p.name} could not cover the shortfall elsewhere against ${t.opponent_name}.`;
  else if(margin>0)text+=`${t.team_name} did not need ${p.name} to beat the forecast to close out ${t.opponent_name}; the support around this lineup spot mattered too.`;
  else text+=`With ${t.team_name} losing by ${one(Math.abs(margin))}, the rest of the lineup needed to supply more than ${p.name} could cover alone.`;
  return text;
}

export function opponentPreview(t){
  const o=t.next_opponent_roster;if(!o)return null;
  const scored=(o.players||[]).filter(p=>p.season_games>0&&valid(p.season_fantasy_points)).sort((a,b)=>b.season_fantasy_points-a.season_fantasy_points).slice(0,2);
  const valued=(o.players||[]).filter(p=>valid(p.value)).sort((a,b)=>b.value-a.value).slice(0,2);
  if(!scored.length&&!valued.length)return null;
  let text=`The players ${t.team_name} must account for on ${o.team_name} start with `;
  if(scored.length)text+=scored.map(p=>`${p.name} (${one(p.season_fantasy_points)} season points in ${p.season_games} recorded game${p.season_games===1?'':'s'})`).join(' and ')+'. ';
  else text+=names(valued)+'. ';
  if(valued.length)text+=`${names(valued)} ${valued.length===1?'is':'are'} the opponent’s highest-value roster ${valued.length===1?'asset':'assets'}, at ${valued.map(p=>Math.round(p.value).toLocaleString('en-US')).join(' and ')}. `;
  const own=list(t)[0],same=scored.length&&valued.length&&String(scored[0].id)===String(valued[0].id);
  if(same)text+=`${scored[0].name} brings both the roster value and the production: ${t.team_name} cannot build its hopes around that lineup spot going quiet.`;
  else if(scored.length&&valued.length)text+=`${scored[0].name} has delivered the most scoring so far, while ${valued[0].name} remains the larger value investment. ${t.team_name} faces more than one route to a big opposing score.`;
  if(own)text+=` Another strong return from ${own.name} would help ${t.team_name} answer that threat without needing every supporting starter to have a career day.`;
  return text;
}

function outlook(t,week){
  const ps=[],m=t.mida_outlook,op=t.next_opponent_name,has=valid(t.next_projected)&&valid(t.next_opponent_projected),gap=has?Number(t.next_projected)-Number(t.next_opponent_projected):null;
  if(op&&has)ps.push(variant(t,[`${op} is next for ${t.team_name}, with the projection at ${one(t.next_projected)} to ${one(t.next_opponent_projected)}.`,`${t.team_name} turns from ${t.opponent_name} to ${op}, carrying a ${one(t.next_projected)}–${one(t.next_opponent_projected)} forecast into the matchup.`,`${t.team_name} meets ${op} next; the projected totals are ${one(t.next_projected)} and ${one(t.next_opponent_projected)}.`,`${op} will test ${t.team_name} next week, with ${t.team_name} projected for ${one(t.next_projected)} against ${one(t.next_opponent_projected)}.`])+' '+(gap>10?`${t.manager_name} has a favorable assignment on paper. Banking this win would spare ${t.team_name} from having to recover the result against a stronger projected opponent later.`:gap< -10?`${t.team_name} needs an upset to take this one. Finding ${one(-gap)} points beyond the expected balance of the matchup puts real weight on the strongest starters and any useful lineup upgrades.`:`Only ${one(Math.abs(gap))} points separate the forecasts, leaving ${t.manager_name} little margin for a preventable lineup mistake.`));
  const scout=opponentPreview(t);if(scout)ps.push(scout);
  if(m&&valid(m.playoff)){
    const r=t.league_context?.record||{},w=Number(r.wins)||0,l=Number(r.losses)||0;
    let stakes=m.playoff>=75?(l>w?`${t.team_name} still has a strong route into the postseason, but the ${record(t)} start is asking that roster to do its catching up sooner rather than later.`:`For ${t.team_name}, the assignment is to turn a strong postseason outlook into wins in hand. ${op||'The next opponent'} is another step toward earning the position the roster promises.`):m.playoff>=40?`${t.team_name} is in contention without much room to coast. ${gap!=null&&gap<0?'Beating '+op+' would steal a valuable result from a difficult matchup.':'Taking care of '+(op||'this matchup')+' would build breathing room before the schedule gets tighter.'}`:`The playoff path is narrow enough that ${t.team_name} needs to make its opportunities count. ${gap!=null&&gap>=0?'A favorable matchup with '+op+' is exactly the opening it cannot afford to waste casually.':'An upset of '+(op||'the next opponent')+' would put a useful win behind an otherwise difficult forecast.'}`;
    ps.push(`${t.team_name} has around ${one(m.playoff)}% chance of reaching the playoffs${valid(m.title)?' and '+one(m.title)+'% of winning the championship':''}. ${stakes} `+(Number(week)<13?`A win would move ${t.team_name} to ${w+1}-${l}; a loss would leave it ${w}-${l+1}${Number(week)<4?', still early enough for a response but with another opportunity gone':'.'}.`:''));
  }
  const division=divisionCopy(t);if(division)ps.push(division);
  return ps.length?ps:['n/a'];
}

export function humanSectionsV24(args){
  const {team:t}=args,rows=list(t),top=rows[0],second=rows[1],margin=Number(t.points)-Number(t.opponent_points),position=divisionPosition(t);
  const repeatedFillers=[
    'That is the player side of the deal; any draft-pick compensation has to be weighed before calling the whole trade a win or loss.',
    'That is useful depth to relinquish, even though a bench score is not automatically a missed starting score.',
    'Another loss would leave this team relying more heavily on help from those rivals.',
    'The outgoing players were more productive this week, which puts more pressure on the long-term case for the move.',
    'The win takes some heat out of that choice, but it does not make the points disappear.',
    'Next week is a chance to improve that position before the division has time to separate.',
    'The addition reached the starting lineup, so there was an immediate role behind the move.'
  ];
  const clean=paragraph=>repeatedFillers.reduce((text,line)=>text.replaceAll(line,''),paragraph).replace(/\s+/g,' ').trim();
  return humanSectionsV23(args).map(s=>{
    if(s.kind==='lede'){
      const trio=rows.slice(0,3),points=trio.reduce((n,p)=>n+Number(p.points),0);
      return {...s,paragraphs:[`${t.team_name} ${margin>0?'put away':margin<0?'fell to':'finished level with'} ${t.opponent_name}, ${one(t.points)}–${one(t.opponent_points)}, to move to ${record(t)}${position?' and sit '+position:''}. ${top?`${top.name} led the way, ${margin>0?'setting the tone for a win that strengthened the team’s position':'providing the brightest scoring return in a result that left work to do'}.`:''}`,trio.length?`${names(trio)} combined for ${one(points)} points${margin>0?', giving '+t.team_name+' enough firepower to finish the job':', but '+t.opponent_name+' still had the stronger total'}. ${margin>20?`${t.manager_name} could absorb a quieter return elsewhere because the leaders built a ${one(margin)}-point cushion.`:margin>0?`In a game decided by ${one(margin)}, that production left little room for wasted lineup spots.`:margin<0?`The ${one(-margin)}-point deficit leaves ${t.manager_name} looking for support beyond those names.`:'Neither lineup found the extra points needed to settle it.'}`:'n/a']};
    }
    if(s.kind==='players'){
      if(!top)return {...s,paragraphs:['n/a']};
      const support=rows.slice(1,4),under=rows.filter(p=>delta(p)!=null&&delta(p)<0).sort((a,b)=>delta(a)-delta(b))[0],ps=[playerImpact(t,top)];
      if(support.length)ps.push(`${names(support)} all chipped in with ${one(support.reduce((n,p)=>n+Number(p.points),0))} combined points${margin>0?' to secure the win':' to keep '+t.team_name+' in pursuit'}${margin>0&&position?', leaving the team '+position:''}. ${second?`${second.name} was the next strongest scoring option behind ${top.name}; ${margin>0?'that second source of points kept the result from resting on one player':'the team needed that help to extend farther down the lineup'}.`:''}`);
      if(under)ps.push(`${under.name} left ${t.team_name} short of its expected return from the ${group(under)}: ${one(under.points)} points against ${one(under.projected)} projected. ${margin>0?`${top.name} and the other leading scorers covered the damage this time, but ${t.next_opponent_name||'the next opponent'} will give ${t.manager_name} another reason to look closely at that slot.`:`The ${one(-delta(under))}-point shortfall ${-delta(under)>Math.abs(margin)?'was larger than the final margin':'accounted for part of the gap'}, making ${under.name}’s rebound an important piece of the next matchup.`}`);
      return {...s,paragraphs:ps};
    }
    if(s.kind==='outlook')return {...s,paragraphs:outlook(t,args.week)};
    if((s.kind==='hot-seat'||s.kind==='cool-throne')&&s.paragraphs[0]!=='n/a'){
      const projected=rows.filter(p=>delta(p)!=null).sort((a,b)=>delta(a)-delta(b)),p=s.kind==='hot-seat'?projected[0]:projected.at(-1);
      if(!p)return s;
      const change=delta(p),others=rows.filter(x=>x.id!==p.id&&group(x)===group(p)),help=others.reduce((n,x)=>n+Number(x.points),0);
      const lead=s.kind==='cool-throne'?`${p.name} earned the Cool Throne by finding ${one(change)} points above projection for ${t.team_name}. ${margin>0&&change>margin?`That bonus was bigger than the margin over ${t.opponent_name}, making this the clearest individual swing in the win.`:margin>0?`That return gave ${t.team_name} room to absorb weaker scores on its way past ${t.opponent_name}.`:`Without that lift, the gap to ${t.opponent_name} would have been wider still.`}`:`${p.name} takes the Hot Seat after falling ${one(-change)} points short of projection. ${margin>0?`${t.team_name} survived the shortfall against ${t.opponent_name}, but it would be a costly habit to carry into the meeting with ${t.next_opponent_name||'the next opponent'}.`:`The missing production at ${group(p)} left ${t.team_name} asking other positions to make up ground against ${t.opponent_name}.`}`;
      const support=others.length?`${names(others)} supplied another ${one(help)} points from the ${group(p)}. ${help<Number(p.points)?`${p.name} carried more than those teammates combined, showing just how much of this position group’s scoring rested on one player.`:`That shared workload on the scoresheet matters: ${t.team_name} had more than one contributor at the position.`}`:null;
      return {...s,paragraphs:[lead,...s.paragraphs.slice(1),...(support?[support]:[])]};
    }
    if(s.kind==='sentiment'){
      const m=t.mida_outlook,miss=t.best_lineup_miss;
      const ps=[`${t.team_name} supporters ${margin>20?'have a win worth enjoying':margin>0?'can finally exhale after holding off '+t.opponent_name:margin< -20?'have reason to demand a sharper response from '+t.manager_name:'will be replaying the narrow result against '+t.opponent_name}. ${top?`${top.name} gave them ${one(top.points)} points to cheer, while the ${one(t.points)}–${one(t.opponent_points)} result leaves the team at ${record(t)}.`:''}`];
      if(valid(m?.playoff))ps.push(`${t.team_name} has around ${one(m.playoff)}% chance of reaching the playoffs. ${m.playoff>=70?(margin>0?`That puts expectations on ${t.manager_name} to make wins like this routine, starting with ${t.next_opponent_name||'next week'}.`:`A roster with that outlook will not get much sympathy for falling to ${t.opponent_name}; supporters will want ${t.next_opponent_name||'the next game'} to bring an answer.`):(margin>0?`Beating ${t.opponent_name} gives the crowd something tangible to put beside those odds, even with plenty still to prove.`:`The loss to ${t.opponent_name} makes the route feel steeper; the response from ${top?.name||'the leading players'} and the supporting lineup will do more for belief than another confident prediction.`)}`);
      if(valid(miss?.gap)&&Number(miss.gap)>=5&&miss.reserve?.name&&miss.starter?.name)ps.push(`${t.manager_name} will also hear about ${miss.reserve.name}: the eligible alternative to ${miss.starter.name} offered ${one(miss.gap)} more points. ${margin>0?'The win takes some heat out of that choice, but it does not make the points disappear.':'That gives the frustration a specific lineup decision to focus on.'}`);
      else if(position)ps.push(`${t.team_name} is ${position}. ${margin>0?`The result against ${t.opponent_name} gives its supporters a place in that race to defend next week.`:`That division position adds weight to the meeting with ${t.next_opponent_name||'the next opponent'}.`}`);
      return {...s,paragraphs:ps};
    }
    return s;
  }).map(s=>({...s,paragraphs:s.paragraphs.map(clean)}));
}

export function expandWeeklyRecap(o,teams,week){
  const sorted=teams.slice().sort((a,b)=>Number(b.points)-Number(a.points)),byId=new Map(teams.map(t=>[String(t.roster_id),t])),seen=new Set(),games=[];
  for(const t of sorted){const other=byId.get(String(t.opponent_roster_id));if(!other)continue;const key=[String(t.roster_id),String(other.roster_id)].sort().join(':');if(seen.has(key))continue;seen.add(key);games.push([t,other])}
  const sections=o.sections.map(s=>({...s,paragraphs:[s.paragraphs[0]]}));
  games.forEach(([t,other],i)=>{
    const margin=Number(t.points)-Number(other.points),p=list(t)[0],q=list(other)[0],n=t.next_opponent_name;
    let text=`${t.team_name} ${margin===0?'tied':'beat'} ${other.team_name} ${one(t.points)}–${one(other.points)}. `;
    if(p)text+=`${p.name} set the pace with ${one(p.points)} fantasy points, ${margin<=7?'an especially important return in a matchup with so little separation':'giving '+t.team_name+' the leading performance it needed to build around'}. `;
    if(q)text+=`${other.team_name} got ${one(q.points)} from ${q.name}, but ${margin>20?'the gap elsewhere was too wide for one player to bridge':margin>0?'could not quite match the production around the winning lineup':'neither side supplied a decisive extra contribution'}. `;
    if(n)text+=`${t.team_name} now turns to ${n}${valid(t.next_projected)&&valid(t.next_opponent_projected)?', where the forecast '+(t.next_projected>=t.next_opponent_projected?'favors another win':'calls for a tougher assignment'):''}; ${other.team_name} gets ${other.next_opponent_name||'a new opponent'} with a chance to repair what this result exposed.`;
    sections[i%4].paragraphs.push(text);
  });
  const divisions=new Map();for(const t of teams){if(!t.division_name)continue;const pool=divisions.get(t.division_name)||[];pool.push(t);divisions.set(t.division_name,pool)}
  [...divisions.entries()].forEach(([division,pool],i)=>{
    const ordered=pool.slice().sort((a,b)=>Number(a.league_context?.standings_rank||999)-Number(b.league_context?.standings_rank||999)),leader=ordered[0],chaser=ordered[1],star=list(leader)[0];
    sections[i%4].paragraphs.push(`${division} has its own argument taking shape: ${ordered.map(t=>t.team_name+' at '+record(t)).join(', ')}. ${leader.team_name} sits highest in the overall standings among those rivals${star?', with '+star.name+' supplying '+one(star.points)+' this week':''}. ${chaser?`${chaser.team_name} is the next division team in the table, making its meeting with ${chaser.next_opponent_name||'the next opponent'} part of the pressure on ${leader.team_name}.`:''} The record sets the immediate stakes, but the scoring underneath it will decide which of these teams can keep the pace when the matchups get less forgiving.`);
  });
  return {...o,inquirer_version:24,sections};
}
