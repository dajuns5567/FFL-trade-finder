import {applyWeek2EditorialR16 as applyR74} from './inquirer-week2-editorial-r74.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';
const pct=v=>finite(v)?`${Math.round(n(v)*100)}%`:'n/a';
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');
const rec=r=>`${Number(r?.wins)||0}-${Number(r?.losses)||0}${Number(r?.ties)?`-${Number(r.ties)}`:''}`;
const sec=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const starters=t=>[...(t?.starter_details||[])].filter(p=>p?.name&&finite(p?.points)).sort((a,b)=>n(b.points)-n(a.points));
const game=(t,w)=>(t?.league_context?.recent_games||[]).find(g=>Number(g?.week)===Number(w));
const rank=(v,teams)=>{const rows=(teams||[]).map(t=>n(t.points)).filter(Number.isFinite).sort((a,b)=>b-a);const x=n(v);if(!Number.isFinite(x))return null;const i=rows.findIndex(y=>y<=x+1e-9);return i<0?rows.length:i+1;};
const voice=t=>String(t?.inquirer_article?.reporter?.name||'Nick Swindell');
const materialHistory=p=>n(p?.prior_season_games)>=6&&n(p?.prior_season_avg)>0&&Math.abs(n(p.points)-n(p.prior_season_avg))>=Math.max(4,Math.abs(n(p.prior_season_avg))*.30);
const roleShift=p=>finite(p?.current_snap_pct)&&finite(p?.prior_season_snap_pct)&&Math.abs(n(p.current_snap_pct)-n(p.prior_season_snap_pct))>=.15;

const voiceLine=(name,slot,rows)=>{
  const list=rows[name]||rows['Nick Swindell'];
  return list[Math.abs(Number(slot)||0)%list.length];
};

function rebuildLede(t,all){
  const full=String(t.team_name||''),s=short(full),opp=String(t.opponent_name||''),r=t?.league_context?.record,w1=game(t,1),rk=rank(t.points,all),won=n(t.points)>n(t.opponent_points),name=voice(t);
  const p1=`${full} ${won?'beat':'lost to'} ${opp} ${one(t.points)}–${one(t.opponent_points)} and finished Week 2 at ${rec(r)}.`;
  const p2=finite(w1?.points)
    ? `${s} scored ${one(t.points)}, ${rk} of ${all.length} this week, after ${one(w1.points)} in Week 1. The change was ${n(t.points)>=n(w1.points)?'+':''}${one(n(t.points)-n(w1.points))} points, which is useful context without pretending two games have settled the season.`
    : `${s} scored ${one(t.points)}, ${rk} of ${all.length} this week. That is enough context to judge Sunday without inventing a two-week trend that is not available.`;
  let football;
  if(won&&rk<=8)football=`the ${s} won and backed the result with top-quarter scoring`;
  else if(won&&rk>24)football=`the ${s} won despite bottom-quarter scoring, so relief is more appropriate than swagger`;
  else if(!won&&rk<=8)football=`the ${s} lost despite a top-quarter score, so the offense is not the obvious place to start the blame`;
  else if(!won&&rk>24)football=`the ${s} lost with bottom-quarter scoring, which makes the weak production impossible to hide behind the final margin`;
  else football=`the ${s} landed in the league's middle scoring band, so the result matters more than any sweeping identity statement`;
  const p3=voiceLine(name,n(t.roster_id),{
    'Nick Swindell':[
      `My Week 2 takeaway is simple: ${football}.`,
      `I am not interested in decorating this one. ${football}.`,
      `The useful football answer is that ${football}.`,
      `What matters before Week 3 is that ${football}.`
    ],
    'Tilly Fleecer':[
      `That is the part worth yelling about: ${football}.`,
      `No fake drama needed here; ${football}.`,
      `The scoreboard already brought enough personality. ${football}.`,
      `If you want the loud version, here it is: ${football}.`
    ],
    'Bartholomew Roycington III':[
      `Even I can admire a result when ${football}.`,
      `The civilized reading is that ${football}.`,
      `There is no need for ceremony when ${football}.`,
      `The respectable conclusion is that ${football}.`
    ],
    'Jefferson Filch':[
      `The evidence supports one practical conclusion: ${football}.`,
      `I can narrow the Week 3 question to this: ${football}.`,
      `The finding worth carrying forward is that ${football}.`,
      `The useful part of the file is that ${football}.`
    ]
  });
  return [p1,p2,p3];
}

function statUsage(p){
  const pos=String(p?.position||'').toUpperCase(),rs=p?.real_stats||{},parts=[];
  if(pos==='QB'){
    if(finite(rs.pass_att))parts.push(`${n(rs.pass_att)} attempts`);
    if(finite(rs.pass_yd))parts.push(`${n(rs.pass_yd)} passing yards`);
    if(finite(rs.pass_td))parts.push(`${n(rs.pass_td)} passing TD${n(rs.pass_td)===1?'':'s'}`);
    if(finite(rs.rush_yd)&&Math.abs(n(rs.rush_yd))>=15)parts.push(`${n(rs.rush_yd)} rushing yards`);
  }else if(pos==='RB'){
    if(finite(rs.rush_att))parts.push(`${n(rs.rush_att)} carries`);
    if(finite(rs.rush_yd))parts.push(`${n(rs.rush_yd)} rushing yards`);
    if(finite(rs.rec_tgt))parts.push(`${n(rs.rec_tgt)} targets`);
  }else if(pos==='WR'||pos==='TE'){
    if(finite(rs.rec_tgt))parts.push(`${n(rs.rec_tgt)} targets`);
    if(finite(rs.rec))parts.push(`${n(rs.rec)} catches`);
    if(finite(rs.rec_yd))parts.push(`${n(rs.rec_yd)} receiving yards`);
  }else{
    if(finite(p?.current_snap_pct))parts.push(`${pct(p.current_snap_pct)} snap share`);
    if(finite(rs.idp_tkl_solo))parts.push(`${n(rs.idp_tkl_solo)} solo tackles`);
    if(finite(rs.idp_tkl_ast))parts.push(`${n(rs.idp_tkl_ast)} assists`);
    if(finite(rs.idp_sack))parts.push(`${n(rs.idp_sack)} sacks`);
  }
  return parts.join(', ');
}

function analysisFor(t,p,i){
  const s=short(t.team_name),name=voice(t),last=String(p.name).split(/\s+/).at(-1),usage=statUsage(p),proj=finite(p?.projected)?n(p.points)-n(p.projected):null,parts=[];
  if(usage)parts.push(`${last}'s Week 2 role showed up as ${usage}.`);
  if(proj!=null&&Math.abs(proj)>=5)parts.push(`The fantasy result finished ${one(Math.abs(proj))} points ${proj>0?'above':'below'} projection.`);
  if(materialHistory(p))parts.push(`His 2025 average was ${one(p.prior_season_avg)}, so this performance moved far enough from the established baseline to deserve attention.`);
  if(roleShift(p))parts.push(`Snap share moved from ${pct(p.prior_season_snap_pct)} last season to ${pct(p.current_snap_pct)} in Week 2, which makes the role change more interesting than the box score alone.`);
  if(!parts.length)parts.push(`${last} gave ${s} a usable Week 2 result without forcing a larger conclusion from one Sunday.`);
  const close=voiceLine(name,i+n(t.roster_id),{
    'Nick Swindell':[
      `That is enough information to evaluate the performance without inventing a controversy.`,
      `I want the same role to answer the question again in Week 3.`,
      `The next game should tell us whether the useful part is repeatable.`
    ],
    'Tilly Fleecer':[
      `That is real football information, which is much nicer than manufacturing a subplot.`,
      `Keep the role; spare us the fake crisis.`,
      `Do it again next week and then we can make more noise.`
    ],
    'Bartholomew Roycington III':[
      `Competence is allowed to be interesting when it is tied to an actual role.`,
      `That is substance enough for one week; mythology can wait.`,
      `The role, rather than the costume around it, is what deserves another look.`
    ],
    'Jefferson Filch':[
      `That gives the next evaluation something concrete to test.`,
      `I would rather follow that role than invent a second case from the same result.`,
      `The useful follow-up is whether the same role survives Week 3.`
    ]
  });
  return `${parts.join(' ')} ${close}`;
}

function rebuildPlayers(t){
  const top=starters(t).slice(0,3),s=short(t.team_name),out=[];
  top.forEach((p,i)=>{
    const line=String(p.real_stat_line||'').trim();
    const stat=i===0
      ? `${p.name} led ${s} with ${one(p.points)} fantasy points${line?`: ${line}`:'.'}`
      : i===1
        ? `${p.name} followed with ${one(p.points)}${line?`: ${line}`:'.'}`
        : `${p.name} added ${one(p.points)}${line?`: ${line}`:'.'}`;
    out.push(stat);
    out.push(analysisFor(t,p,i));
  });
  return out;
}

function lineupMiss(t){
  const m=t?.best_lineup_miss;
  if(!m||!finite(m?.gap)||n(m.gap)<5||!m?.starter?.name||!m?.reserve?.name)return null;
  return m;
}

function rebuildManagement(t){
  const m=lineupMiss(t),s=short(t.team_name),name=voice(t),slot=n(t.roster_id);
  if(m){
    const p1=`${m.reserve.name} outscored ${m.starter.name} by ${one(m.gap)} from a compatible bench spot. That is the Week 2 lineup decision worth reviewing; the rest of the roster does not need to be dragged into the same charge.`;
    const p2=voiceLine(name,slot,{
      'Nick Swindell':[`I would fix that exact choice before turning one miss into a larger management theory.`,`One bad decision is correctable; repeating it in Week 3 would make the criticism stronger.`],
      'Tilly Fleecer':[`That is one clean “whoops,” not permission to blame management for every bad score on the roster.`,`Fix that one and move on. A sequel would be much harder to defend.`],
      'Bartholomew Roycington III':[`Correct the specific mistake and spare us a grand indictment of the entire front office.`,`One tuition payment is sufficient; Week 3 should not charge the same lesson twice.`],
      'Jefferson Filch':[`The evidence supports one management correction, not a blanket accusation.`,`I would track whether the exact decision changes in Week 3 before expanding the case.`]
    });
    return [p1,p2];
  }
  const p1=`There was no compatible bench swap large enough to make Week 2 an obvious management failure for ${s}. The players own most of what happened on Sunday.`;
  const p2=voiceLine(name,slot,{
    'Nick Swindell':[`I would keep the criticism on player performance unless Week 3 presents a real lineup alternative.`,`There is no value in blaming the manager for a mistake the roster did not actually offer a way to avoid.`],
    'Tilly Fleecer':[`No lineup scandal this week. I checked, and I am almost disappointed.`,`Save the boos for a decision that actually had a better option sitting there.`],
    'Bartholomew Roycington III':[`We shall resist inventing a managerial felony merely because the result was unpleasant.`,`Criticism should at least have the courtesy to attach itself to a real alternative.`],
    'Jefferson Filch':[`The file does not contain a clear management error here, so I am not going to manufacture one.`,`If Week 3 produces a compatible alternative, then the management question can become specific.`]
  });
  return [p1,p2];
}

function rebuildHotSeat(t){
  const p=t?.worst_starter;if(!p?.name)return [];
  const usage=statUsage(p),history=materialHistory(p)?` His 2025 average was ${one(p.prior_season_avg)}, so the drop is large enough to monitor.`:'';
  const p1=`${p.name} gets the harder player-level review after ${one(p.points)} points.${usage?` The Week 2 role included ${usage}.`:''}${history}`;
  const p2=`That is criticism of ${p.name}'s production, not automatic evidence that management used the player incorrectly.`;
  return [p1,p2];
}

function rebuildCool(t){
  const picks=starters(t).filter(p=>n(p.points)>=12).slice(0,2);
  if(!picks.length)return [`Nobody on ${short(t.team_name)} needs ceremonial praise after this result. Week 3 can reopen nominations.`];
  return picks.map((p,i)=>i===0
    ? `${p.name} earned the first positive note with ${one(p.points)} points${p.real_stat_line?`: ${p.real_stat_line}`:'.'}`
    : `${p.name} gave the lineup a second performance worth keeping with ${one(p.points)} points${p.real_stat_line?`: ${p.real_stat_line}`:'.'}`);
}

function rebuildValue(t){
  const v=t?.value_history_week||{},m=t?.value_history_player_movers||{},out=[];
  if(finite(v?.value)&&finite(v?.delta))out.push(`${short(t.team_name)} roster value is ${one(v.value)} after a ${n(v.delta)>=0?'+':''}${one(v.delta)} weekly change. That market move belongs in the roster discussion, but it is not a substitute for Sunday production.`);
  if((m.risers||[])[0]){const x=m.risers[0];out.push(`${x.player_name} was the biggest riser at +${one(x.delta)} (${one(x.pct)}%). That changes roster optionality more than it changes the Week 2 football evaluation.`);}
  if((m.fallers||[])[0]&&out.length<3){const x=m.fallers[0];out.push(`${x.player_name} was the largest faller at ${one(x.delta)} (${one(x.pct)}%). Treat the move as market information, not a verdict on one game.`);}
  return out;
}

function rebuildSentiment(t){
  const fan=t?.inquirer_article?.fan_sentiment||{},score=finite(fan?.score)?n(fan.score):0,s=short(t.team_name),name=voice(t),won=n(t.points)>n(t.opponent_points),slot=n(t.roster_id),out=[];
  out.push(score>=30
    ? `${s} fan sentiment sits at +${one(score)}. The optimism is understandable, but Week 2 did not erase every weak spot.`
    : score<=-30
      ? `${s} fan sentiment sits at ${one(score)}. The frustration is understandable, but the reaction should stay tied to the football that actually failed.`
      : `${s} fan sentiment sits near the middle at ${score>=0?'+':''}${one(score)}. Two weeks have given supporters reasons for both confidence and complaint.`);
  out.push(voiceLine(name,slot,{
    'Nick Swindell':[`I expect the crowd to care more about whether Week 3 improves the football than whether Week 2 gets a better explanation.`,`The fan argument should be about the direction of the team, not a replay of the Management section.`],
    'Tilly Fleecer':[`Fans are allowed to be unreasonable in interesting ways; they do not need the same bench mistake repeated back to them again.`,`The crowd can bring the volume. The article does not need to repeat Management to justify it.`],
    'Bartholomew Roycington III':[`Supporters may indulge their mood; the prose need not prosecute the same lineup decision twice.`,`The crowd can have its feelings without forcing us to restate the management case.`],
    'Jefferson Filch':[`I would separate the emotional reaction from the lineup evidence; they are related, not identical.`,`The fan response is its own data point. Repeating the management fact would not make it more useful.`]
  }));
  return out;
}

function rebuildOutlook(t){
  const ups=[...(t?.upcoming_opponents||[])].sort((a,b)=>n(a.week)-n(b.week)),next=ups.find(x=>Number(x.week)===3)||ups[0],later=ups.filter(x=>n(x.week)>3).slice(0,2),name=voice(t),s=short(t.team_name),out=[];
  if(next){const r=next?.context?.record;out.push(`Week 3 brings ${next.team_name}${r?` (${rec(r)})`:''}. ${s} needs the useful Week 2 roles to hold up against a different opponent before any trend gets trusted.`);}
  if(later.length){const fmt=x=>`${x.team_name}${x?.context?.record?` (${rec(x.context.record)})`:''}`;const rates=later.map(x=>{const r=x?.context?.record,g=n(r?.wins)+n(r?.losses)+n(r?.ties);return g?n(r?.wins)/g:null;}).filter(Number.isFinite);let label='';if(rates.length===2){const hi=Math.max(...rates),lo=Math.min(...rates);label=hi>=.5&&lo<.5?'The road is mixed by the current standings.':hi>=.5?'The following stretch is the harder part of the schedule by current records.':'The following stretch is friendlier by current records.';}out.push(`${name==='Tilly Fleecer'?'After Week 3':name==='Jefferson Filch'?'Beyond Week 3':name==='Bartholomew Roycington III'?'Once Week 3 is settled':'After Week 3'}, ${later.map(fmt).join(' and ')} follow. ${label}`.trim());}
  out.push(voiceLine(name,n(t.roster_id),{
    'Nick Swindell':[`I want Week 3 to answer the football question before the schedule turns into an excuse.`,`The next game is a better test than another paragraph of prediction.`],
    'Tilly Fleecer':[`Handle Week 3 first. We can make the jokes louder after the result earns them.`,`Week 3 gets first crack at proving whether this was progress or just one noisy Sunday.`],
    'Bartholomew Roycington III':[`Week 3 deserves our attention before we start reserving future applause.`,`One opponent at a time; the calendar will remain available for later overreaction.`],
    'Jefferson Filch':[`Week 3 is the next piece of evidence. I would rather test the claim than repeat it.`,`The next result should answer more than another projection paragraph can.`]
  }));
  return out;
}

function rebuildTeam(t,all){
  const a=t?.inquirer_article;if(!a)return t;
  const map={lede:()=>rebuildLede(t,all),players:()=>rebuildPlayers(t),management:()=>rebuildManagement(t),'hot-seat':()=>rebuildHotSeat(t),'cool-throne':()=>rebuildCool(t),value:()=>rebuildValue(t),sentiment:()=>rebuildSentiment(t),outlook:()=>rebuildOutlook(t)};
  for(const s of a.sections||[]){const fn=map[String(s?.kind||'')];if(fn)s.paragraphs=fn().filter(Boolean);}
  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r75';
  return t;
}

function recapSections(out){
  const teams=out?.teams||[],sorted=[...teams].sort((a,b)=>n(b.points)-n(a.points)),high=sorted[0],low=sorted.at(-1);
  const closest=[...teams].sort((a,b)=>Math.abs(n(a.points)-n(a.opponent_points))-Math.abs(n(b.points)-n(b.opponent_points)))[0];
  const jumps=teams.map(t=>({t,d:finite(game(t,1)?.points)?n(t.points)-n(game(t,1).points):null})).filter(x=>x.d!=null).sort((a,b)=>b.d-a.d);
  const two=teams.map(t=>({t,avg:n(t?.league_context?.recent_avg_points),r:t?.league_context?.record})).filter(x=>finite(x.avg));
  const unbeaten=two.filter(x=>n(x.r?.losses)===0).sort((a,b)=>b.avg-a.avg),winless=two.filter(x=>n(x.r?.wins)===0).sort((a,b)=>b.avg-a.avg);
  const combos=teams.map(t=>({t,total:n(t.points)+n(t.opponent_points)})).sort((a,b)=>b.total-a.total),margins=teams.map(t=>({t,g:Math.abs(n(t.points)-n(t.opponent_points))})).sort((a,b)=>b.g-a.g);
  const make=(id,name,heading,paras)=>({heading,reporter:{id,name},paragraphs:paras});
  return [
    make('walter-mercer','Nick Swindell','What Actually Mattered This Week',[
      `${high.team_name} set the Week 2 scoring ceiling at ${one(high.points)}, while ${low.team_name} finished at ${one(low.points)}. I care about that gap because it separates teams creating real weekly scoring strength from teams merely hoping the matchup stays survivable.`,
      `${closest.team_name} and ${closest.opponent_name} finished ${one(Math.abs(n(closest.points)-n(closest.opponent_points)))} points apart, the closest result of the week. In a game that tight, one compatible lineup choice can matter; in a blowout, pretending one bench swap explains everything is just lazy.`,
      jumps[0]?`${jumps[0].t.team_name} made the biggest Week 1-to-Week 2 scoring jump at ${jumps[0].d>=0?'+':''}${one(jumps[0].d)}. I want Week 3 to tell us whether that change came from repeatable roles or one convenient Sunday.`:`Week 3 matters because two games have finally given us enough information to ask better questions without pretending we have final answers.`
    ]),
    make('mack-hollis','Bartholomew Roycington III','The Week 2 Contender Line',[
      unbeaten[0]?`${unbeaten[0].t.team_name} owns the strongest two-week scoring average among the unbeaten teams at ${one(unbeaten[0].avg)}. I can admire a clean record when the points underneath it have the decency to provide supporting evidence.`:`Two weeks is too early for a coronation, which is fortunate because nobody has earned one yet.`,
      winless[0]?`${winless[0].t.team_name} has the strongest two-week scoring average among the winless teams at ${one(winless[0].avg)}. The record is ugly, but the scoring says we may postpone the funeral.`:`The bottom of the standings is not one species; some teams are losing with enough scoring to remain interesting.`,
      `The contender line after two weeks is not simply 2-0 versus 0-2. I want records supported by scoring, lineup decisions that survive inspection, and player roles sturdy enough to travel into Week 3.`
    ]),
    make('tess-delaney','Tilly Fleecer','The Matchups That Defined Week 2',[
      `${combos[0].t.team_name} and ${combos[0].t.opponent_name} combined for ${one(combos[0].total)} points, the highest-scoring matchup of Week 2. That game gets applause because both lineups earned the noise; nobody had to invent a subplot to make it interesting.`,
      `${combos.at(-1).t.team_name} and ${combos.at(-1).t.opponent_name} combined for only ${one(combos.at(-1).total)}. Please do not hand out fake hero labels just because somebody technically led a miserable box score.`,
      `${margins[0].t.team_name} and ${margins[0].t.opponent_name} produced the week's largest margin at ${one(margins[0].g)} points. When the gap is that big, the losing side needs a roster-wide answer, not one cute bench anecdote dressed up as the whole explanation.`
    ]),
    make('nora-voss','Jefferson Filch','What Week 2 Changed About Week 3',[
      unbeaten.at(-1)?`${unbeaten.at(-1).t.team_name} has the weakest two-week scoring average among the unbeaten teams at ${one(unbeaten.at(-1).avg)}. I would keep the clean record and still investigate whether the scoring can survive a better opponent.`:`A clean record can still carry questions when the scoring underneath it is thin.`,
      winless[0]?`${winless[0].t.team_name} is the best-scoring winless team through two weeks at ${one(winless[0].avg)} per game. I care about that because it tells us the standings and the lineup quality are not saying exactly the same thing.`:`The winless group is not one category; some lineups are producing far better than their records suggest.`,
      `Week 3 should separate early noise from repeatable football. I would rather test the roles, lineup corrections and scoring trends we can actually see than write a verdict from two September Sundays.`
    ])
  ];
}

function rebuildHotTakes(out){
  const teams=out?.teams||[],two=[...teams].filter(t=>finite(t?.league_context?.recent_avg_points)).sort((a,b)=>n(b.league_context.recent_avg_points)-n(a.league_context.recent_avg_points)),best=two[0];
  const danger=[...teams].filter(t=>n(t?.league_context?.record?.losses)===0).sort((a,b)=>n(a.points)-n(b.points))[0];
  const potw=teams.flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))).filter(x=>finite(x.p.points)).sort((a,b)=>n(b.p.points)-n(a.p.points))[0];
  const miss=teams.map(t=>({t,m:lineupMiss(t)})).filter(x=>x.m).sort((a,b)=>n(b.m.gap)-n(a.m.gap))[0];
  const breakout=teams.flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))).filter(x=>finite(x.p.week1_points)&&n(x.p.week1_points)>=10&&n(x.p.points)>=15).sort((a,b)=>(n(b.p.week1_points)+n(b.p.points))-(n(a.p.week1_points)+n(a.p.points)))[0];
  const takes=[];
  if(best)takes.push({title:`Week 2 early contender: ${best.team_name}`,take:`${best.team_name} has the league's strongest two-week scoring average at ${one(best.league_context.recent_avg_points)}. That makes the start credible; it does not make September a championship ceremony.`});
  if(danger)takes.push({title:`Week 2 warning light: ${danger.team_name}`,take:`${danger.team_name} is unbeaten but scored only ${one(danger.points)} in Week 2. Keep the record, keep the win, and still ask whether the scoring can hold up against a better Sunday.`});
  if(potw)takes.push({title:`Week 2 Player of the Week: ${potw.p.name}`,take:`${potw.p.name} led the individual Week 2 board with ${one(potw.p.points)} fantasy points for ${potw.t.team_name}${potw.p.real_stat_line?`: ${potw.p.real_stat_line}`:''}.`});
  if(breakout)takes.push({title:`Breakout watch: ${breakout.p.name}`,take:`${breakout.p.name} followed ${one(breakout.p.week1_points)} in Week 1 with ${one(breakout.p.points)} in Week 2. Two games are not a season, but the role has earned another week of attention.`});
  if(miss)takes.push({title:`Week 3 management pressure: ${miss.t.team_name}`,take:`${miss.m.reserve.name} outscored ${miss.m.starter.name} by ${one(miss.m.gap)} from a compatible bench spot. The question for Week 3 is whether management corrects that exact choice, not whether hindsight can find every unused point.`});
  const divisions=new Map();for(const t of teams){const d=t?.division_context?.division_name;if(d&&!divisions.has(d))divisions.set(d,t.division_context);}const lines=[];for(const [d,c] of divisions){const leaders=(c?.leaders||[]).map(x=>`${x.team_name} (${rec(x.record)})`).join(' and ');if(leaders)lines.push(`${d}: ${leaders}`);}if(lines.length)takes.push({title:'Week 2 division board',take:`The division board after two weeks:\n\n${lines.join('\n')}`});
  return takes;
}

function rebuildOverview(out){
  const ov=out?.league_overview;if(!ov)return;
  ov.sections=recapSections(out);
  ov.hot_takes=rebuildHotTakes(out);
  ov.structure_revision='week2-r75';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR74(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  const all=out.teams||[];
  out.teams=all.map(t=>rebuildTeam(t,all));
  rebuildOverview(out);
  out.structure_revision='week2-r75';
  return out;
}

export const applyWeek2EditorialR75=applyWeek2EditorialR16;
export const applyWeek2EditorialR74=applyWeek2EditorialR16;
export const applyWeek2EditorialR73=applyWeek2EditorialR16;
export const applyWeek2EditorialR72=applyWeek2EditorialR16;
export const applyWeek2EditorialR71=applyWeek2EditorialR16;
export const applyWeek2EditorialR70=applyWeek2EditorialR16;
export const applyWeek2EditorialR69=applyWeek2EditorialR16;
export const applyWeek2EditorialR68=applyWeek2EditorialR16;
export const applyWeek2EditorialR67=applyWeek2EditorialR16;
export const applyWeek2EditorialR66=applyWeek2EditorialR16;
export const applyWeek2EditorialR65=applyWeek2EditorialR16;
export const applyWeek2EditorialR64=applyWeek2EditorialR16;
export const applyWeek2EditorialR63=applyWeek2EditorialR16;
export const applyWeek2EditorialR62=applyWeek2EditorialR16;
export const applyWeek2EditorialR61=applyWeek2EditorialR16;
export const applyWeek2EditorialR60=applyWeek2EditorialR16;
export const applyWeek2EditorialR59=applyWeek2EditorialR16;
export const applyWeek2EditorialR58=applyWeek2EditorialR16;
export const applyWeek2EditorialR57=applyWeek2EditorialR16;
export const applyWeek2EditorialR56=applyWeek2EditorialR16;
export const applyWeek2EditorialR55=applyWeek2EditorialR16;
export const applyWeek2EditorialR54=applyWeek2EditorialR16;
export const applyWeek2EditorialR53=applyWeek2EditorialR16;
export const applyWeek2EditorialR52=applyWeek2EditorialR16;
export const applyWeek2EditorialR51=applyWeek2EditorialR16;
export const applyWeek2EditorialR50=applyWeek2EditorialR16;
export const applyWeek2EditorialR49=applyWeek2EditorialR16;
export const applyWeek2EditorialR48=applyWeek2EditorialR16;
export const applyWeek2EditorialR47=applyWeek2EditorialR16;
export const applyWeek2EditorialR46=applyWeek2EditorialR16;
export const applyWeek2EditorialR45=applyWeek2EditorialR16;
export const applyWeek2EditorialR44=applyWeek2EditorialR16;
export const applyWeek2EditorialR43=applyWeek2EditorialR16;
export const applyWeek2EditorialR42=applyWeek2EditorialR16;
export const applyWeek2EditorialR41=applyWeek2EditorialR16;
export const applyWeek2EditorialR40=applyWeek2EditorialR16;
export const applyWeek2EditorialR39=applyWeek2EditorialR16;
export const applyWeek2EditorialR38=applyWeek2EditorialR16;
export const applyWeek2EditorialR37=applyWeek2EditorialR16;
export const applyWeek2EditorialR36=applyWeek2EditorialR16;
export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
