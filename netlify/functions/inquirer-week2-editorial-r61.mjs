import {applyWeek2EditorialR16 as applyR60} from './inquirer-week2-editorial-r60.mjs';

const num=v=>Number(v);
const finite=v=>Number.isFinite(num(v));
const one=v=>finite(v)?num(v).toFixed(1).replace(/\.0$/,''):'n/a';
const pct=v=>finite(v)?`${(num(v)*100).toFixed(0)}%`:'n/a';
const shortTeam=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');
const recordText=r=>`${Number(r?.wins)||0}-${Number(r?.losses)||0}${Number(r?.ties)?`-${Number(r.ties)}`:''}`;
const sentenceTrim=s=>String(s||'').replace(/\s+/g,' ').trim();

function reporterKey(article){return String(article?.reporter?.name||'Nick Swindell');}
function section(article,kind){return (article?.sections||[]).find(s=>String(s?.kind||'')===kind);}
function weekGame(team,week){return (team?.league_context?.recent_games||[]).find(g=>Number(g?.week)===Number(week));}
function starterPool(team){return [...(team?.starter_details||[])].filter(p=>p?.name&&finite(p?.points)).sort((a,b)=>num(b.points)-num(a.points));}
function meaningfulHistory(p){
  const prior=num(p?.prior_season_avg),games=num(p?.prior_season_games)||0,pts=num(p?.points);
  return games>=6&&prior>0&&finite(pts)&&Math.abs(pts-prior)>=Math.max(4,prior*.3);
}
function roleShift(p){
  const cur=num(p?.current_snap_pct),prior=num(p?.prior_season_snap_pct);
  return finite(cur)&&finite(prior)&&Math.abs(cur-prior)>=.15;
}
function projectionDelta(p){
  const pts=num(p?.points),proj=num(p?.projected);
  return finite(pts)&&finite(proj)?pts-proj:null;
}

function ledeParagraphs(team,rankW2,rankW1){
  const article=team.inquirer_article,voice=reporterKey(article),full=team.team_name,short=shortTeam(full),opp=team.opponent_name;
  const w1=weekGame(team,1),rec=recordText(team?.league_context?.record),won=num(team.points)>num(team.opponent_points);
  const result=`${full} ${won?'beat':'lost to'} ${opp} ${one(team.points)}–${one(team.opponent_points)} and left Week 2 at ${rec}.`;
  const context=finite(w1?.points)
    ? `${short} scored ${one(team.points)} in Week 2, ${rankW2} of 32, after ${one(w1.points)} in Week 1, ${rankW1} of 32. Two games do not settle the season, but they do give the next decision a real baseline.`
    : `${short} scored ${one(team.points)} in Week 2, ${rankW2} of 32. That is enough context to judge the result without inventing a larger trend.`;
  const delta=finite(w1?.points)?num(team.points)-num(w1.points):0;
  const angles={
    'Nick Swindell': won
      ? `${Math.abs(delta)>=20?`The ${delta>0?'jump':'drop'} from Week 1 matters, but the win matters more.`:'The score stayed close enough to the opener to make the pattern worth watching.'} Keep the useful parts; make Week 3 prove they travel.`
      : `${Math.abs(delta)>=20?`The ${delta>0?'scoring improvement':'scoring drop'} is real, and so is the loss.`:'The loss did not need extra drama.'} Week 3 gets the assignment: fix what actually cost points.`,
    'Tilly Fleecer': won
      ? `${short} got the win without needing a press release about it. ${delta>=20?'The scoring leap was loud enough on its own.':'The better story is that the lineup produced when it had to.'}`
      : `${short} lost, and the scoreboard already did the insulting. ${delta>0?'At least the offense moved forward; now try pairing that with a win.':'The lineup needs a better answer before the joke writes itself again.'}`,
    'Bartholomew Roycington III': won
      ? `${short} may enjoy the victory without pretending September has issued a lifetime achievement award. ${delta>=20?'The scoring rise was substantial; the restraint should be temporary.':'The result was useful because it looked repeatable rather than theatrical.'}`
      : `${short} may keep the poetry and fix the football. ${delta>0?'More scoring with the same losing result is progress wearing an irritating hat.':'A quieter scoreboard and a loss is not a mystery worth romanticizing.'}`,
    'Jefferson Filch': won
      ? `${short} banked the win; now the interesting part is what survives inspection. ${delta>=20?'The Week 1-to-Week 2 swing is large enough to track, not large enough to worship.':'The evidence so far points to a usable floor, which is more valuable than a slogan.'}`
      : `${short} has a loss and a short list of reasons, which is better than pretending the whole roster failed at once. ${delta>0?'The scoring improved; the decision-making still owes an explanation.':'Week 3 should tell us whether the weak spots were temporary or merely exposed early.'}`
  };
  return [result,context,angles[voice]||angles['Nick Swindell']];
}

function playerAnalysis(team,p,index){
  const voice=reporterKey(team.inquirer_article),name=String(p.name),last=name.split(/\s+/).at(-1),pts=num(p.points),proj=projectionDelta(p),prior=num(p?.prior_season_avg);
  const established=(num(p?.prior_season_games)||0)>=8&&prior>=10;
  const bad=established&&pts<prior*.75;
  const history=meaningfulHistory(p);
  const role=roleShift(p);
  const pieces=[];
  if(proj!=null&&Math.abs(proj)>=4)pieces.push(`${last} finished ${one(Math.abs(proj))} points ${proj>0?'above':'below'} projection.`);
  if(history)pieces.push(`Last season’s average was ${one(prior)}, so this was ${pts>prior?'a real spike':'a real drop'} rather than ordinary variance.`);
  if(role)pieces.push(`Snap share moved from ${pct(p.prior_season_snap_pct)} last season to ${pct(p.current_snap_pct)} in Week 2, which gives the result a role-change explanation.`);
  if(bad)pieces.push(`The production deserves criticism; it does not create a management mistake by itself.`);
  if(!pieces.length){
    const variants={
      'Nick Swindell':[
        `${last} gave the lineup what the role asked for. Week 3 is about doing it again.`,
        `${last} did not force a new conclusion. The next game gets to confirm whether this was useful or merely ordinary.`,
        `${last} belongs in the follow-up notes, not the panic column.`
      ],
      'Tilly Fleecer':[
        `${last} did the job without making us invent a side quest. Lovely.`,
        `${last} gave the lineup a usable answer. Keep it; spare us the fake controversy.`,
        `${last} was neither miracle nor disaster, which is refreshing after the rest of this league.`
      ],
      'Bartholomew Roycington III':[
        `${last} supplied competent football, a genre too often treated as beneath us. It is not.`,
        `${last} gave the lineup substance without demanding a dramatic reading of the box score.`,
        `${last} left us with a useful result and, blessedly, no need for mythology.`
      ],
      'Jefferson Filch':[
        `${last} gave us a clean data point and no obvious reason to invent a second case.`,
        `${last} held the role well enough that the next question belongs to Week 3, not a fabricated controversy.`,
        `${last} added something useful to the file: production without a management alibi attached.`
      ]
    };
    pieces.push((variants[voice]||variants['Nick Swindell'])[index%3]);
  }
  return pieces.join(' ');
}

function playerParagraphs(team){
  const top=starterPool(team).slice(0,3),opp=team.opponent_name,short=shortTeam(team.team_name);
  const out=[];
  for(let i=0;i<top.length;i++){
    const p=top[i],line=String(p.real_stat_line||'').trim();
    out.push(`${p.name} scored ${one(p.points)} fantasy points against ${opp}${line?`: ${line}`:'.'}`);
    out.push(playerAnalysis(team,p,i));
  }
  while(out.length<6){
    const p=top[out.length%Math.max(1,top.length)]||{name:short,points:team.points};
    out.push(`${p.name} remains part of the Week 3 evaluation after the ${opp} result.`);
  }
  return out.slice(0,6);
}

function valueParagraphs(team){
  const v=team?.value_history_week||{},m=team?.value_history_player_movers||{},voice=reporterKey(team.inquirer_article),short=shortTeam(team.team_name);
  const delta=num(v.delta),dir=delta>0?'rose':delta<0?'fell':'held steady',riser=(m.risers||[])[0],faller=(m.fallers||[])[0];
  const intro={
    'Nick Swindell':`${short} roster value ${dir} ${one(Math.abs(delta))} this week to ${one(v.value)}. The number is worth noting; Sunday still decides whether it was useful.`,
    'Tilly Fleecer':`${short} roster value ${dir} ${one(Math.abs(delta))} this week to ${one(v.value)}. Fine. Now make the football justify the price tag.`,
    'Bartholomew Roycington III':`${short} roster value ${dir} ${one(Math.abs(delta))} to ${one(v.value)}. Markets may swoon; lineups still have to perform in public.`,
    'Jefferson Filch':`${short} roster value ${dir} ${one(Math.abs(delta))} this week to ${one(v.value)}. I will record the movement and reserve the celebration until it survives Sunday.`
  };
  const out=[intro[voice]||intro['Nick Swindell']];
  if(riser)out.push(`${riser.player_name} was the biggest riser at +${one(riser.delta)} (${one(riser.pct)}%). That move matters because it changes the roster’s optionality, not because green numbers are inherently persuasive.`);
  if(faller)out.push(`${faller.player_name} was the largest decline at ${one(faller.delta)} (${one(faller.pct)}%). The drop is a signal to watch, not a sentence on the player.`);
  return out;
}

function sentimentParagraphs(team){
  const voice=reporterKey(team.inquirer_article),short=shortTeam(team.team_name),won=num(team.points)>num(team.opponent_points),rec=recordText(team?.league_context?.record);
  const miss=team?.best_lineup_miss,gap=num(miss?.gap),hasMiss=finite(gap)&&gap>=4&&miss?.starter?.name&&miss?.reserve?.name;
  const next=team.next_opponent_name;
  const first={
    'Nick Swindell': won?`${short} fans can enjoy ${rec} without pretending every question disappeared. Winning buys patience; it does not buy silence.`:`${short} fans have a legitimate complaint after this loss, but frustration is more useful when it points at a fixable problem.`,
    'Tilly Fleecer': won?`${short} supporters are allowed to be loud after a win. They are also allowed to notice the parts that would have been unbearable in a loss.`:`${short} fans are annoyed, correctly. A bad Sunday is much easier to forgive when management does not try to sell it as character building.`,
    'Bartholomew Roycington III': won?`${short} supporters may savor the victory; moderation is available in theory and will be ignored in practice.`:`${short} supporters are not staging a tragedy, merely demanding that the next Sunday look less foolish. Reasonable, by our standards.`,
    'Jefferson Filch': won?`${short} supporters have the pleasant problem of arguing about flaws after a win. That is healthier than inventing confidence after a loss.`:`${short} supporters saw the same weak spots everyone else did. Complaints become pressure only if Week 3 repeats them.`
  };
  const second=hasMiss
    ? `${miss.reserve.name} outscored ${miss.starter.name} by ${one(gap)} on the bench, so the fan argument has an actual number behind it instead of pure volume.`
    : `The fan reaction should stay tied to what happened on the field; there is no need to manufacture a lineup scandal where the evidence does not support one.`;
  const third=`Next comes ${next}. Supporters will care less about the explanation if the same problem shows up again.`;
  return [first[voice]||first['Nick Swindell'],second,third];
}

function coolParagraphs(team){
  const eligible=starterPool(team).filter(p=>{
    const pts=num(p.points),proj=num(p.projected),prior=num(p.prior_season_avg);
    return pts>=15||(finite(proj)&&pts-proj>=4)||(prior>0&&pts>=prior*1.2);
  }).slice(0,2);
  const picks=eligible.length?eligible:starterPool(team).slice(0,2);
  const names=picks.map(p=>p.name);
  if(!names.length)return ['Nobody earned a special mention this week.','Week 3 can reopen nominations.'];
  const joined=names.length>1?`${names[0]} and ${names[1]}`:names[0],voice=reporterKey(team.inquirer_article);
  const first={
    'Nick Swindell':`${joined} earned the praise this week. That is enough; the next game can decide whether it becomes a trend.`,
    'Tilly Fleecer':`${joined} get the good ink this week. Enjoy it before somebody on this roster does something ridiculous again.`,
    'Bartholomew Roycington III':`${joined} deserve the civilized portion of our attention. Excellence is welcome, even when it ruins a perfectly good complaint.`,
    'Jefferson Filch':`${joined} survived inspection and earned the positive note. I am filing it without deleting the follow-up questions.`
  };
  return [first[voice]||first['Nick Swindell'],`The useful part is that ${shortTeam(team.team_name)} received real production from more than one place instead of asking one player to rescue the entire afternoon.`];
}

function managementParagraphs(team){
  const miss=team?.best_lineup_miss,gap=num(miss?.gap),short=shortTeam(team.team_name),voice=reporterKey(team.inquirer_article);
  const hasMiss=finite(gap)&&gap>=4&&miss?.starter?.name&&miss?.reserve?.name;
  if(!hasMiss){
    const calm={
      'Nick Swindell':`${short} did not leave an obvious game-changing lineup mistake on the board in Week 2. That matters; criticism should have an address.`,
      'Tilly Fleecer':`${short} did not hand us a clean lineup disaster this week. I checked. Annoying, but fair.`,
      'Bartholomew Roycington III':`${short} escaped Week 2 without an obvious managerial felony. We shall resist inventing one for entertainment.`,
      'Jefferson Filch':`${short} does not have a clear lineup error large enough to prosecute from Week 2. The evidence can stay boring when it is boring.`
    };
    return [calm[voice]||calm['Nick Swindell'],`Week 3 management should focus on role changes and availability instead of fixing a mistake that did not actually happen.`];
  }
  const s=miss.starter.name,b=miss.reserve.name;
  const first=`${b} outscored ${s} by ${one(gap)} points from the bench. That is the actionable Week 2 lineup decision; it does not need three different paragraphs pretending to discover it.`;
  const second={
    'Nick Swindell':`${short} can call it one bad decision. Repeating it in Week 3 would make it a pattern.`,
    'Tilly Fleecer':`${short} gets one free “whoops.” A sequel costs extra.`,
    'Bartholomew Roycington III':`${short} may classify this as a lesson provided the tuition is not charged twice.`,
    'Jefferson Filch':`${short} management has one clean correction to make. If the same choice returns next week, the excuse gets much thinner.`
  };
  return [first,second[voice]||second['Nick Swindell']];
}

function hotSeatParagraphs(team){
  const p=team?.worst_starter;if(!p?.name)return ['No single starter deserves a fabricated crisis after Week 2.','The next game gets to create its own problem if necessary.'];
  const prior=num(p.prior_season_avg),pts=num(p.points),est=(num(p.prior_season_games)||0)>=8&&prior>=10;
  const first=`${p.name} finished Week 2 at ${one(pts)} points${finite(p.projected)?`, ${one(Math.abs(pts-num(p.projected)))} ${pts>=num(p.projected)?'above':'below'} projection`:''}. The production is the issue; the player does not need a new identity after one Sunday.`;
  const second=est?`${p.name} averaged ${one(prior)} last season. If the role remains intact, Week 3 should test whether this was a bad game rather than invite a management panic.`:`Week 3 should answer whether the weak result was temporary or whether the role itself needs another look.`;
  return [first,second];
}

function outlookParagraphs(team){
  const short=shortTeam(team.team_name),next=team.next_opponent_name,nrec=recordText(team?.next_opponent_context?.record),edge=num(team.next_projected)-num(team.next_opponent_projected),voice=reporterKey(team.inquirer_article);
  const out=[`${short} gets ${next} (${nrec}) in Week 3. The current projection is ${one(team.next_projected)}–${one(team.next_opponent_projected)}${finite(edge)?`, a ${one(Math.abs(edge))}-point ${edge>=0?'edge':'deficit'} for ${short}`:''}; that is an expectation, not a result.`];
  const dc=team?.division_context||{},leaders=(dc.leaders||[]).filter(x=>x?.team_name),selfLead=leaders.some(x=>String(x.roster_id)===String(team.roster_id)),others=leaders.filter(x=>String(x.roster_id)!==String(team.roster_id));
  if(selfLead&&others.length)out.push(`${short} shares the ${dc.division_name} lead with ${others.map(x=>x.team_name).join(' and ')}. Week 3 can separate that tie without pretending September standings are permanent.`);
  else if(dc.division_name)out.push(`${short} is currently ${Number(dc.division_rank)||'outside the lead'} in the ${dc.division_name}. That makes the next result useful division information, not merely another projection check.`);
  const old=section(team.inquirer_article,'outlook')?.paragraphs||[];
  const road=old.find(p=>/\b(?:friendlier|mixed|softer|manageable|forgiving|favorable|gauntlet|hard stretch|rougher|difficulty)\b/i.test(String(p))&&/\bWeek 3\b/i.test(String(p)));
  if(road)out.push(sentenceTrim(road));
  else {
    const later=(team.upcoming_opponents||[]).slice().sort((a,b)=>num(a.week)-num(b.week)).slice(1,3);
    if(later.length===2)out.push(`After Week 3, ${later[0].team_name} and ${later[1].team_name} are next. The schedule can be judged when those games arrive; no invented difficulty label is needed.`);
  }
  const close={
    'Nick Swindell':`The assignment is simple: carry the useful Week 2 decisions forward and make ${next} prove the rest.`,
    'Tilly Fleecer':`Beat ${next} before writing the speech. Fantasy football has enough unpaid motivational speakers.`,
    'Bartholomew Roycington III':`Handle ${next} first; the future may wait politely in the hallway.`,
    'Jefferson Filch':`The Week 3 file is open: keep what worked, correct the actual mistake, and make ${next} produce new evidence.`
  };
  out.push(close[voice]||close['Nick Swindell']);
  return out;
}

function cleanTeam(team,ranks){
  const article=team?.inquirer_article;if(!article)return team;
  const rankW2=ranks.w2.get(String(team.roster_id)),rankW1=ranks.w1.get(String(team.roster_id));
  const rewrites={
    'lede':()=>ledeParagraphs(team,rankW2,rankW1),
    'players':()=>playerParagraphs(team),
    'value':()=>valueParagraphs(team),
    'sentiment':()=>sentimentParagraphs(team),
    'cool-throne':()=>coolParagraphs(team),
    'management':()=>managementParagraphs(team),
    'hot-seat':()=>hotSeatParagraphs(team),
    'outlook':()=>outlookParagraphs(team)
  };
  for(const s of article.sections||[]){
    const fn=rewrites[String(s?.kind||'')];if(fn)s.paragraphs=fn().map(sentenceTrim).filter(Boolean);
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r61';
  return team;
}

function rankMaps(teams){
  const w2=[...teams].sort((a,b)=>num(b.points)-num(a.points));
  const w1=[...teams].filter(t=>weekGame(t,1)&&finite(weekGame(t,1).points)).sort((a,b)=>num(weekGame(b,1).points)-num(weekGame(a,1).points));
  return {
    w2:new Map(w2.map((t,i)=>[String(t.roster_id),i+1])),
    w1:new Map(w1.map((t,i)=>[String(t.roster_id),i+1]))
  };
}

function matchupRows(teams){
  const seen=new Set(),rows=[];
  for(const t of teams){
    const key=[String(t.roster_id),String(t.opponent_roster_id)].sort().join(':');if(seen.has(key))continue;seen.add(key);
    const a=t,b=teams.find(x=>String(x.roster_id)===String(t.opponent_roster_id));
    if(!b)continue;
    const winner=num(a.points)>=num(b.points)?a:b,loser=winner===a?b:a,total=num(a.points)+num(b.points),margin=Math.abs(num(a.points)-num(b.points));
    rows.push({a,b,winner,loser,total,margin});
  }
  return rows;
}

function weekSwing(t){const w1=weekGame(t,1);return finite(w1?.points)?num(t.points)-num(w1.points):null;}
function avg2(t){const w1=weekGame(t,1);return finite(w1?.points)?(num(w1.points)+num(t.points))/2:num(t.points);}

function rebuildRecap(out){
  const ov=out?.league_overview;if(!ov)return;
  const teams=out.teams||[],matchups=matchupRows(teams),sortedScore=[...teams].sort((a,b)=>num(b.points)-num(a.points));
  const high=sortedScore[0],low=sortedScore.at(-1),closest=[...matchups].sort((a,b)=>a.margin-b.margin)[0],loud=[...matchups].sort((a,b)=>b.total-a.total)[0],blow=[...matchups].sort((a,b)=>b.margin-a.margin)[0],quiet=[...matchups].sort((a,b)=>a.total-b.total)[0];
  const swings=teams.map(t=>({t,s:weekSwing(t)})).filter(x=>x.s!=null).sort((a,b)=>b.s-a.s),jump=swings[0],fall=swings.at(-1);
  const undefeated=teams.filter(t=>Number(t?.league_context?.record?.wins)===2).sort((a,b)=>avg2(b)-avg2(a));
  const winless=teams.filter(t=>Number(t?.league_context?.record?.losses)===2).sort((a,b)=>avg2(b)-avg2(a));
  const gaps=teams.map(t=>({t,g:Math.abs(num(t.next_projected)-num(t.next_opponent_projected))})).filter(x=>finite(x.g)).sort((a,b)=>b.g-a.g),gap=gaps[0];
  const reporters=new Map((ov.sections||[]).map(s=>[String(s?.reporter?.id||''),s.reporter]));
  const sections=[
    {
      reporter:reporters.get('walter-mercer'),
      heading:'What Actually Mattered This Week',
      paragraphs:[
        `${high.team_name} set the Week 2 scoring ceiling at ${one(high.points)}; ${low.team_name} set the floor at ${one(low.points)}. That range is the league in one sentence: some rosters had answers everywhere, and some spent Sunday looking for one.`,
        `${closest.winner.team_name} beat ${closest.loser.team_name} ${one(closest.winner.points)}–${one(closest.loser.points)}, the closest game of the week at ${one(closest.margin)} points. That is where lineup decisions deserve attention, because a small miss can actually change the result instead of merely decorating the regret.`,
        `${jump.t.team_name} made the biggest Week 1-to-Week 2 jump at +${one(jump.s)} points. The important part is not the novelty; it is whether Week 3 confirms that the roster found something repeatable.`
      ]
    },
    {
      reporter:reporters.get('tess-delaney'),
      heading:'Two Weeks In, the Records Need Context',
      paragraphs:[
        `${undefeated[0].team_name} has the strongest two-week scoring average among the 2-0 teams at ${one(avg2(undefeated[0]))}. The clean record has real scoring underneath it, which is the rare September luxury of looking good without asking us to suspend disbelief.`,
        `${undefeated.at(-1).team_name} is also 2-0, but its two-week average is ${one(avg2(undefeated.at(-1)))}. Same record, very different comfort level; apparently perfection has tiers now.`,
        `${winless[0].team_name} owns the strongest two-week average among the 0-2 teams at ${one(avg2(winless[0]))}. The standings are ugly, but the scoring says the roster is not playing like the league’s worst team; tragedy will have to wait for better evidence.`
      ]
    },
    {
      reporter:reporters.get('mack-hollis'),
      heading:'The Games That Deserve the Replay',
      paragraphs:[
        `${loud.winner.team_name} beat ${loud.loser.team_name} ${one(loud.winner.points)}–${one(loud.loser.points)} in the week’s highest-scoring matchup at ${one(loud.total)} combined points. Nobody in that game needs a fake subplot; the scoreboard already brought enough fireworks.`,
        `${blow.winner.team_name} put ${one(blow.margin)} points between itself and ${blow.loser.team_name}, the biggest margin of Week 2. That is not “one play away.” That is “please stop checking the calculator; it is working.”`,
        `${quiet.a.team_name} and ${quiet.b.team_name} combined for ${one(quiet.total)} points, the lowest-scoring matchup of the week. Somebody won because the rules required it, not because the box score demanded a parade.`
      ]
    },
    {
      reporter:reporters.get('nora-voss'),
      heading:'What Week 2 Put on the Week 3 File',
      paragraphs:[
        `${gap.t.team_name} enters the largest Week 3 projection gap, ${one(gap.t.next_projected)}–${one(gap.t.next_opponent_projected)} against ${gap.t.next_opponent_name}. That is useful expectation-setting and nothing more; projections do not get to collect the win early.`,
        `${fall.t.team_name} had the largest scoring drop from Week 1 at ${one(Math.abs(fall.s))} points. One fall can be noise. A second one would give Week 3 a much less charitable explanation.`,
        `${winless[0].team_name} is 0-2 despite the best scoring average among the winless teams, while ${undefeated.at(-1).team_name} is 2-0 with the weakest average among the unbeaten group. Week 3 gets a clean assignment: tell us which records are describing the roster and which are merely reporting what happened twice.`
      ]
    }
  ];
  ov.sections=sections;
  ov.deck='Week 2 changed the league in specific ways: one scoring ceiling, one scoring floor, a few records that deserve context, and a Week 3 slate ready to test the conclusions.';
  ov.structure_revision='week2-r61';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR60(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  const ranks=rankMaps(out.teams||[]);
  out.teams=(out.teams||[]).map(t=>cleanTeam(t,ranks));
  rebuildRecap(out);
  out.structure_revision='week2-r61';
  if(out.league_overview)out.league_overview.structure_revision='week2-r61';
  return out;
}

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
