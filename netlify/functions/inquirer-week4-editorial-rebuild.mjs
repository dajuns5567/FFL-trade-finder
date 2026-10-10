import week3Preload2026 from './inquirer-week3-2026-preload.mjs';
import {restoreReporterNarratives} from './inquirer-forward-restore-voice.mjs';
// Week 4 editorial replacement. Facts are taken only from the frozen, verified edition.
// Do not rewrite awards, matchup scores, rosters, picks or publication metadata.
const valid=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const n=v=>Number(v).toFixed(1);
const record=t=>{const r=t?.league_context?.record||{};return valid(r.wins)&&valid(r.losses)?r.wins+'-'+r.losses:'record unavailable'};
const rank=t=>valid(t?.league_context?.standings_rank)?'#'+t.league_context.standings_rank:'unranked';
const name=t=>String(t?.team_name||'The team');
const margin=t=>valid(t?.points)&&valid(t?.opponent_points)?Math.abs(Number(t.points)-Number(t.opponent_points)):null;
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const choose=(rows,key)=>rows[hash(key)%rows.length];
const topPlayers=t=>(t?.starter_details||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
const short=p=>p?.name||'an unnamed starter';
const point=p=>valid(p?.points)?n(p.points)+' points':'an unavailable score';
const clean=arr=>arr.filter(Boolean).map(x=>String(x).trim()).filter(Boolean);
const win=t=>t.won===true||valid(t.points)&&valid(t.opponent_points)&&Number(t.points)>Number(t.opponent_points);
const REPORTER_HEADS={
 'walter-mercer':[
  'A long season has no use for imaginary wins. This is the one the roster actually earned.',
  'The standings have seen prettier football. They only count the points that arrived.',
  'The first job of a good Sunday is to survive the box score. This one did.',
  'There is a reason the old coaches talk about the full lineup and not just the star.',
  'The score is permanent now; the lessons should be a little more useful than the celebration.',
  'I have seen enough October Sundays to know one box score never tells the whole story.'
 ],
 'tess-delaney':[
  'The scoreboard declined to consider anyone’s self-image. A refreshing change.',
  'A lovely roster on paper still has to produce an unsentimental total on Sunday.',
  'Nobody is owed a gracious verdict merely for arriving with better preseason expectations.',
  'There is real elegance in a useful second scorer. There is very little in an empty lineup slot.',
  'Confidence looks marvelous until the opponent begins adding up points.',
  'A manager may prefer a more flattering narrative. The final score has no such obligation.'
 ],
 'mack-hollis':[
  'THIS is the number. The excuses can line up outside.',
  'A fantasy team is not a movie trailer. Show the points or spare everybody the speech.',
  'If this was supposed to be easy, somebody forgot to tell the other roster.',
  'The highlights were loud. The silent starters were louder.',
  'Put the result on the front page. Put the weak lineup slots on the next page.',
  'The best part of this matchup? The scoreboard did not wait for a press conference.'
 ],
 'nora-voss':[
  'Rivals noticed exactly where the points came from, and where they did not.',
  'Management can call the lineup balanced. Opponents will read the actual totals.',
  'The division is not going to reward a manager for having excellent intentions.',
  'There is no shortage of confident rosters. There is a shortage of repeatable production.',
  'Every contender has a weak spot. The bad ones keep making it easy to find.',
  'The opponent has already seen which positions can be pressured next Sunday.'
 ]
};
const REPORTER_OUTLOOK={
 'walter-mercer':['Keep the good habits. Find more points from the quiet slots. That is how a season gets built.','The next game will reward the team that fixes its lineup without forgetting what worked.','A record moves one Sunday at a time; the useful adjustments are usually smaller than the speeches.'],
 'tess-delaney':['A winning résumé must be renewed every Sunday. The schedule has dreadful manners that way.','The roster may celebrate, but the next opponent is under no obligation to be accommodating.','Making the next lineup a little less theatrical would be an excellent start.'],
 'mack-hollis':['Next Sunday is not going to read this article. It is going to demand another score.','Fix the ugly part, keep the fireworks, and do not give rivals the same joke twice.','Another game, another chance to make the loudest claim with points instead of words.'],
 'nora-voss':['Rivals have a week to prepare for the same weaknesses. Make them find new ones.','The next opponent will have noticed the quiet positions. Management should notice them first.','A win protects the record. It does not protect the same lineup flaw forever.']
};
function teamStory(t,week){
 const a=t.inquirer_article;if(!a)return;
 const voice=String(a?.reporter?.id||'walter-mercer');
 const players=topPlayers(t),star=players[0],support=players[1],third=players[2],weak=players.at(-1),bench=t.best_bench,miss=t.best_lineup_miss||null,old=t?.league_context||{},foe=t.opponent_name||'the opponent',next=t.next_opponent_name||null,won=win(t),gap=margin(t),team=name(t),id=t.roster_id,seed=week+'|'+id;
 const fact=valid(t.points)&&valid(t.opponent_points)?team+' '+(won?'beat ':'lost to ')+foe+' '+n(t.points)+'–'+n(t.opponent_points)+'.':team+' completed Week '+week+' without a verified matchup score.';
 const head=choose(REPORTER_HEADS[voice]||REPORTER_HEADS['walter-mercer'],seed+'lede');
 const starLine=star?short(star)+' led the starters with '+point(star)+'. '+(support?short(support)+' added '+point(support)+', which matters because the top score alone did not play every lineup position.':'That put a lot of the afternoon on one player’s shoulders.'):'The starters did not provide a complete player-by-player scoring breakdown.';
 const context=valid(old.standings_rank)?'At '+record(t)+' and '+rank(t)+' overall, '+team+' has to live with both its full-season work and this single result.':'The weekly result is verified; a reliable overall rank was not supplied with this edition.';
 const lede=clean([
  fact+' '+head,
  starLine,
  gap!==null?(gap<=6?'Only '+n(gap)+' points separated the rosters. Every ordinary starter suddenly mattered, including the ones who will never make a highlight reel.':gap>=28?'The '+n(gap)+'-point margin left no late suspense. '+(won?'The challenge now is to find out which advantages can be repeated.':'There is too much ground to recover by changing one marginal lineup call.'):'A margin of '+n(gap)+' left room for individual decisions to matter without pretending the whole afternoon turned on one play.'):null,
  context,
  choose([
    'A single Sunday cannot rewrite the season; it can reveal which part of the roster has actually carried its weight.',
    'The standings record the outcome. The film, insofar as fantasy has film, is the production scattered across the lineup.',
    'The useful story sits between the final margin and the names who did or did not supply the points behind it.',
    'The next opponent will care less about the headline than about which lineup slots delivered the score.'
  ],seed+'lede-last')
 ]);
 const playerRows=clean([
  star?short(star)+' deserves the first sentence: '+point(star)+' from '+String(star.position||'a starting spot')+'. The result was built from actual points, not an imagined projection.':null,
  support?short(support)+' finished at '+point(support)+'. '+choose(['That second score gave the roster another place to lean when the matchup tightened.','It is the supporting production that separates a functional roster from a weekly rescue mission.','That performance made the headline less dependent on one player having a perfect afternoon.'],seed+'second'):null,
  third?short(third)+' contributed '+point(third)+'. '+choose(['A third useful score changes the shape of a lineup, even if the top two get the applause.','Those points are not decorative; they count exactly as much as the star points in the final result.','That is the type of middle-of-the-lineup production managers need to find every Sunday.'],seed+'third'):null,
  weak&&star&&weak!==star?short(weak)+' closed the starter list at '+point(weak)+'. '+(won?'The win covered that weakness this week; a closer opponent might not.':'A loss invites scrutiny of the quiet spots, but it does not turn every low score into a coaching mistake.'):null,
  star&&valid(star.season_avg)?short(star)+' entered this report with a '+n(star.season_avg)+' current-season fantasy average. Week '+week+' produced '+n(star.points)+', so the single-game headline has a season baseline.':null,
  support&&valid(support.prior_season_avg)&&valid(support.season_avg)?short(support)+' averaged '+n(support.prior_season_avg)+' last season and is at '+n(support.season_avg)+' this season. That is a more useful comparison than treating one week as a career verdict.':null,
  players.length>3?'Beyond the leaders, '+short(players[3])+' supplied '+point(players[3])+'. The points after the headline names still determine whether a good top end becomes a winning total.':null
 ]);
 const management=clean([
  miss?.reserve&&miss?.starter&&valid(miss.reserve.points)&&valid(miss.starter.points)?'The bench question is concrete: '+short(miss.reserve)+' scored '+point(miss.reserve)+' while '+short(miss.starter)+' started with '+point(miss.starter)+'. That is a decision worth revisiting, not evidence that the result was predetermined.':bench&&valid(bench.points)?'The best available bench total belonged to '+short(bench)+' at '+point(bench)+'. There is no responsible way to judge a start/sit decision without the eligible lineup slots, so the raw number is context, not a conviction.':null,
  gap!==null&&gap<=8?'With a margin this narrow, ordinary lineup gains would have mattered. That is where a manager can make the next week better without chasing a miracle.':'The margin was large enough that one swap would not necessarily explain the result. The more important issue is how many useful scores the lineup delivered.',
  choose(['Roster management is about turning available depth into points, not announcing victory over a projection after the fact.','When the matchup is over, the lineup receipts are better than the excuses.','One good managerial decision is repeatable; one lucky score is not an entire strategy.','The most useful adjustment is usually the one supported by actual opportunity and production.'],seed+'management')
 ]);
 const heat=weak?'The uncomfortable number belongs to '+short(weak)+': '+point(weak)+' in the starting lineup. '+(won?'The victory gives that spot a reprieve, not immunity.':'The loss makes the quiet line harder to ignore, especially if the same role is needed next week.'):'There is no verified individual starter to single out for the Hot Seat.';
 const praise=star?short(star)+' earned the Cool Throne discussion with '+point(star)+'. '+(won?'That performance helped turn the week into a win.':'Even in a defeat, useful production deserves to be acknowledged.'):'No individually verified performance is available for the Cool Throne.';
 const value=t.value_history_week,delta=valid(value?.delta)?Number(value.delta):null;
 const market=delta!==null?'The tracked roster value '+(delta>=0?'rose':'fell')+' by '+Math.abs(Math.round(delta)).toLocaleString('en-US')+' points over the recorded window. That market movement and the Week '+week+' game score measure different things.':'No verified weekly roster-value delta accompanies this edition. A missing value is not a zero-point move.';
 const sentiment=a.fan_sentiment,emotion=valid(sentiment?.score)?'Fan sentiment registers '+Number(sentiment.score)+' on the saved scale, a response to both results and the standings.':'There is no verified fan-sentiment score to quote for the current edition.';
 const outlook=clean([
   next?'Week '+(week+1)+' brings '+next+'. The matchup changes, but the useful question stays specific: which of this week’s productive starting spots can deliver again?':'The next opponent is not verified in the edition; no schedule matchup will be invented.',
   star?short(star)+' just set the most visible individual benchmark for '+team+'. Another opponent can change coverage and opportunity, but '+point(star)+' is the performance rivals have to respect.':null,
   weak&&star&&weak!==star?'The quieter '+short(weak)+' line matters next week too. A manager cannot guarantee points, but can reconsider the role and alternatives before repeating the same decision.':null,
   'The team enters its next game at '+record(t)+'. '+(won?'A win supplies breathing room, not permission to ignore the soft positions.':'A loss raises the urgency, not the need to invent a dramatic explanation.'),
   choose(REPORTER_OUTLOOK[voice]||REPORTER_OUTLOOK['walter-mercer'],seed+'outlook')
 ]);
 const rewritten={lede,players:playerRows,management,'hot-seat':[heat],'cool-throne':[praise],value:[market],sentiment:[emotion,won?'The result bought the manager a better week with the crowd. Whether that carries over depends on the next game.':'The fan base has a reason to ask questions, though a single loss is not a season sentence.'],outlook};
 for(const sec of a.sections||[])if(Object.prototype.hasOwnProperty.call(rewritten,sec.kind))sec.paragraphs=rewritten[sec.kind];
 a.paragraphs=(a.sections||[]).flatMap(sec=>[...(sec.paragraphs||[]),...(sec.blocks||[]).flatMap(b=>b.paragraphs||[])]).filter(Boolean);
 a.editorial_rebuilt_for_week=week;
}
function leagueStory(edition){
 const teams=edition.teams||[],week=Number(edition.week),overview=edition.league_overview;if(!overview)return;
 const by=new Map(teams.map(t=>[String(t.roster_id),t])),games=[],used=new Set();
 for(const t of teams){
  const o=by.get(String(t.opponent_roster_id||''));if(!o||!valid(t.points)||!valid(o.points))continue;
  const key=[String(t.roster_id),String(o.roster_id)].sort().join('|');if(used.has(key))continue;used.add(key);
  const winner=Number(t.points)>=Number(o.points)?t:o,loser=winner===t?o:t;
  games.push({winner,loser,gap:Math.abs(Number(t.points)-Number(o.points)),total:Number(t.points)+Number(o.points)});
 }
 const sort=(rows,fn)=>rows.slice().sort(fn);
 const leaders=sort(teams,(a,b)=>(Number(a?.league_context?.standings_rank)||999)-(Number(b?.league_context?.standings_rank)||999)).slice(0,5);
 const scoring=sort(teams,(a,b)=>Number(b.points)-Number(a.points)),high=scoring[0],low=scoring.at(-1);
 const close=sort(games,(a,b)=>a.gap-b.gap)[0],wide=sort(games,(a,b)=>b.gap-a.gap)[0];
 const strong=sort(games,(a,b)=>b.total-a.total)[0];
 const performers=sort(teams.flatMap(t=>topPlayers(t).slice(0,2).map(p=>({team:t,player:p}))), (a,b)=>Number(b.player.points)-Number(a.player.points));
 const hero=performers[0],second=performers.find(x=>String(x.team.roster_id)!==String(hero?.team?.roster_id));
 const swing=sort(games,(a,b)=>Math.abs(Number(a.winner.league_context?.standings_rank||99)-Number(b.winner.league_context?.standings_rank||99)))[0];
 const reporter=overview.sections?.[0]?.reporter||null,sections=overview.sections||[];
 // The Weekly Recap is one league-wide editorial issue, not five separate game reports.
 const blocks=[
  {kind:'lead',heading:'The Story That Defined Week '+week,paragraphs:clean([
   strong?'Across '+games.length+' completed matchups, '+name(strong.winner)+' and '+name(strong.loser)+' produced the busiest scoreboard: '+n(strong.winner.points)+'–'+n(strong.loser.points)+'. The '+n(strong.total)+' combined points illustrate how little protection even a productive lineup enjoys when the other side catches fire.':null,
   high?name(high)+' led every roster this week with '+n(high.points)+' points. That performance sets the immediate standard, but its '+record(high)+' record gives the larger season context.':null,
   close?'At the opposite end of the drama, '+name(close.winner)+' escaped '+name(close.loser)+' by '+n(close.gap)+' points. One Sunday managed to produce both overwhelming production and a finish with almost no margin for error.':null
  ])},
  {kind:'standings',heading:'The Standings Have Started Talking',paragraphs:clean([
   leaders.length?'The first five places belong to '+leaders.map(t=>name(t)+' ('+record(t)+', '+rank(t)+')').join('; ')+'. These are earned standings, not forecasts.':null,
   wide?name(wide.winner)+' beat '+name(wide.loser)+' by '+n(wide.gap)+' points. The margin will not earn an extra win, but it makes the pressure on '+name(wide.loser)+' impossible to disguise.':null,
   swing?'Results such as '+name(swing.winner)+' over '+name(swing.loser)+' help explain the pressure building around the league table. A win changes the record immediately; the judgment of whether it is sustainable takes longer.':null
  ])},
  {kind:'players',heading:'The Names Behind the Noise',paragraphs:clean([
   hero?short(hero.player)+' delivered '+point(hero.player)+' for '+name(hero.team)+', the highest starter score among the rosters in this edition. A performance that large deserves an individual headline even when the standings remain the final measure.':null,
   second?short(second.player)+' put up '+point(second.player)+' for '+name(second.team)+'. The league had more than one player capable of deciding a matchup; their surrounding lineups determined what those efforts were worth.':null,
   low?name(low)+' finished at '+n(low.points)+' points as a team. That contrast explains why spotlighting stars is not the same thing as declaring a roster healthy.':null
  ])},
  {kind:'decisions',heading:'The Decisions and the Damage',paragraphs:clean([
   close?'The '+n(close.gap)+'-point finish between '+name(close.winner)+' and '+name(close.loser)+' demands the closest review of roster choices. In that kind of matchup a small compatible replacement could have changed the standings.':null,
   wide?'No single hypothetical lineup tweak should be invented to explain '+name(wide.loser)+' losing to '+name(wide.winner)+' by '+n(wide.gap)+'. That deficit belongs to the actual combined production.':null,
   'Managers can reconsider their choices, but the completed scores are fixed. The analysis must distinguish a documented lineup alternative from hindsight dressed up as certainty.'
  ])},
  {kind:'league',heading:'What the League Learned',paragraphs:clean([
   high&&low?'The range ran from '+n(high.points)+' for '+name(high)+' to '+n(low.points)+' for '+name(low)+'. The same fantasy week offered entirely different realities to its managers.':null,
   strong?'The '+name(strong.winner)+'–'+name(strong.loser)+' shootout was a reminder that scoring well is not sufficient when the opposing lineup scores even better.':null,
   leaders[0]?'At the top, '+name(leaders[0])+' holds '+rank(leaders[0])+' at '+record(leaders[0])+'. That is where expectations and scrutiny will collect next.':null
  ])},
  {kind:'outlook',heading:'The Next Edition Is Not Written Yet',paragraphs:clean([
   leaders[0]?.next_opponent_name?name(leaders[0])+' next faces '+leaders[0].next_opponent_name+'. First place carries an obvious target into that assignment.':null,
   low?.next_opponent_name?name(low)+' turns to '+low.next_opponent_name+' after this week’s '+n(low.points)+'-point showing. Improvement must arrive in the actual lineup, not in a revised explanation of the loss.':null,
   'Week '+(week+1)+' remains unplayed in this edition. No predicted upset or projected score counts as a result until Sleeper has finalized it.'
  ])}
 ];
 // A weekly editorial angle is chosen by the state of the league and the issue
 // number. Unlike the old game-by-game recap, the categories remain stable while
 // the reporting emphasis and prose change across consecutive editions.
 const angle=week%4;
 if(angle===1){
  blocks[0].paragraphs=clean([
   close?name(close.winner)+' had the least room to celebrate, beating '+name(close.loser)+' by '+n(close.gap)+'. The week’s defining pressure came from a result in which almost every usable point mattered.':null,
   strong?'There was another kind of pressure in '+name(strong.winner)+' against '+name(strong.loser)+': '+n(strong.total)+' combined fantasy points, and still only one victory to distribute.':null,
   high?'At '+n(high.points)+', '+name(high)+' set the weekly high-water mark. Its record of '+record(high)+' makes this a chapter in a season rather than an isolated highlight.':null
  ]);
  blocks[1].paragraphs=clean([
   leaders[0]?name(leaders[0])+' leads the standings at '+record(leaders[0])+', with the next challengers '+leaders.slice(1,3).map(t=>name(t)+' ('+record(t)+')').join(' and ')+'. The order is based on completed games, not optimism.':null,
   wide?'The '+n(wide.gap)+'-point loss suffered by '+name(wide.loser)+' against '+name(wide.winner)+' will not count twice, but the imbalance gives that manager a sharper question than a narrow defeat does.':null,
   low?name(low)+' recorded '+n(low.points)+' points. The distance from the league’s leaders is now visible in both immediate production and the wider competitive conversation.':null
  ]);
  blocks[2].paragraphs=clean([
   hero?short(hero.player)+' gave '+name(hero.team)+' '+point(hero.player)+'. That is the week’s individual reference point, independent of whether the full lineup earned the same praise.':null,
   second?short(second.player)+' contributed '+point(second.player)+' for '+name(second.team)+'. The second-best league-wide performance shows why a spotlight cannot be confined to one victorious lineup.':null,
   strong?'A combined '+n(strong.total)+' in the highest-scoring matchup shows how several productive players can contribute to a single result, while the losing manager still gets no standings credit.':null
  ]);
  blocks[3].paragraphs=clean([
   close?'A manager on the losing side of '+name(close.winner)+' versus '+name(close.loser)+' must confront a '+n(close.gap)+'-point difference. That invites lineup review, not an invented bench replacement.':null,
   wide?'For '+name(wide.loser)+', the '+n(wide.gap)+'-point deficit was much larger than a normal borderline starter decision. The whole lineup’s return is the right object of scrutiny.':null,
   'The decisions to study are the ones managers actually made before kickoff. A completed box score cannot prove that an ineligible or unverified substitute would have rescued the week.'
  ]);
  blocks[4].paragraphs=clean([
   high&&low?'This league ranged from '+name(high)+' at '+n(high.points)+' to '+name(low)+' at '+n(low.points)+'. Those extremes made the same week feel like two different competitions.':null,
   leaders[0]?'For '+name(leaders[0])+', being '+rank(leaders[0])+' brings a different burden: repeated production must defend an already valuable place in the table.':null,
   close?'The '+n(close.gap)+'-point finish remains the reminder that a tiny margin can carry the same standings weight as the largest blowout.':null
  ]);
  blocks[5].paragraphs=clean([
   leaders[0]?.next_opponent_name?name(leaders[0])+' prepares for '+leaders[0].next_opponent_name+' next. The club’s '+record(leaders[0])+' record attracts attention, but it does not score next week’s lineup.':null,
   low?.next_opponent_name?name(low)+' has '+low.next_opponent_name+' ahead after a '+n(low.points)+'-point outing. The response will have to appear in actual starters rather than explanations.':null,
   'The next edition will treat Week '+(week+1)+' as finished only when Sleeper has the completed scores. Nothing projected has been promoted into a result.'
  ]);
 }else if(angle===2){
  blocks[0].paragraphs=clean([
   wide?name(wide.winner)+' supplied the most decisive result, a '+n(wide.gap)+'-point win over '+name(wide.loser)+'. That gap changed the tone of the week more than any postgame interpretation could.':null,
   close?'Elsewhere, '+name(close.winner)+' and '+name(close.loser)+' finished '+n(close.gap)+' apart. The two scoreboards demand very different conversations about the same completed slate.':null,
   high?'The scoring ceiling belonged to '+name(high)+' with '+n(high.points)+' points; a large total carries weight only when connected to a record and a real opponent.':null
  ]);
  blocks[1].paragraphs=clean([
   leaders.length?'Five teams occupy the front of the current table: '+leaders.map(t=>name(t)+' at '+record(t)).join('; ')+'. Ranking is a record of what happened, not an award for what might happen.':null,
   leaders[0]?'The next test for '+name(leaders[0])+' begins from '+rank(leaders[0])+'. Holding that position will require another completed result, not an argument about roster potential.':null,
   low?name(low)+' is left with '+n(low.points)+' from this slate, showing why the standings discussion cannot be separated from actual lineup output.':null
  ]);
  blocks[2].paragraphs=clean([
   hero?short(hero.player)+' finished with '+point(hero.player)+' for '+name(hero.team)+'. The top individual performance merits attention without becoming a substitute for team analysis.':null,
   second?short(second.player)+' answered with '+point(second.player)+' for '+name(second.team)+'. The difference between star production and a successful roster was what happened in the other starting places.':null,
   high?name(high)+' finished on '+n(high.points)+' points as a group. That total, unlike any single player line, determines the team’s place in the weekly scoring order.':null
  ]);
  blocks[3].paragraphs=clean([
   wide?'A loss by '+n(wide.gap)+' for '+name(wide.loser)+' against '+name(wide.winner)+' is a roster-wide problem. Claiming one unverified alternative would have reversed it would misuse the box score.':null,
   close?'The '+name(close.winner)+'–'+name(close.loser)+' decision was different: '+n(close.gap)+' separated the teams, so every legitimate choice deserves inspection.':null,
   'The evidence stops at completed starters and documented eligible options. This recap does not award imaginary points to a manager’s hindsight.'
  ]);
  blocks[4].paragraphs=clean([
   strong?'The highest combined score of '+n(strong.total)+' came in '+name(strong.winner)+' against '+name(strong.loser)+'. Production can be extraordinary and still produce a losing record entry for one side.':null,
   high&&low?'The gap between the best and lowest team scores, '+n(Math.abs(Number(high.points)-Number(low.points)))+', captures how uneven the week felt across the league.':null,
   leaders[0]?'At '+record(leaders[0])+', '+name(leaders[0])+' remains the standings reference point. Individual headlines come and go more quickly than accumulated wins.':null
  ]);
  blocks[5].paragraphs=clean([
   leaders[0]?.next_opponent_name?name(leaders[0])+' now has '+leaders[0].next_opponent_name+' on the calendar. That is a confirmed opponent, not an automatic extension of its '+record(leaders[0])+' record.':null,
   low?.next_opponent_name?name(low)+' turns toward '+low.next_opponent_name+' after scoring '+n(low.points)+' this week. The next result depends on a new roster performance, not a rewritten explanation.':null,
   'Any upcoming forecast remains conditional. Week '+(week+1)+' cannot enter the published record until the league’s matchup results are finalized.'
  ]);
 }else if(angle===3){
  blocks[0].paragraphs=clean([
   strong?'The most explosive pairing was '+name(strong.winner)+' against '+name(strong.loser)+', with '+n(strong.total)+' points between them. '+name(strong.winner)+' earned the result, but '+name(strong.loser)+' contributed to the week’s defining spectacle.':null,
   high?name(high)+' topped the league scoring list at '+n(high.points)+'. The question is whether that one-week output says more about lineup balance or a few exceptional stars.':null,
   close?'A '+n(close.gap)+'-point escape by '+name(close.winner)+' over '+name(close.loser)+' supplied the counterpoint: not every consequential game needs a spectacular total.':null
  ]);
  blocks[1].paragraphs=clean([
   leaders[0]?'The standings start with '+name(leaders[0])+' at '+record(leaders[0])+' and '+rank(leaders[0])+'. The teams immediately behind it—'+leaders.slice(1,3).map(t=>name(t)+' at '+record(t)).join('; ')+'—have their own results to defend.':null,
   wide?name(wide.winner)+' made a '+n(wide.gap)+'-point statement against '+name(wide.loser)+'. It does not change the number of wins awarded, but it colors the race around them.':null,
   low?'A '+n(low.points)+'-point finish from '+name(low)+' shows where one roster’s immediate pressure begins, regardless of how promising it looked beforehand.':null
  ]);
  blocks[2].paragraphs=clean([
   hero?short(hero.player)+' posted '+point(hero.player)+' for '+name(hero.team)+', giving the edition its leading player line. That deserves its own account instead of getting lost in five separate game summaries.':null,
   second?short(second.player)+' contributed '+point(second.player)+' for '+name(second.team)+'. Two standouts can define the headlines, but neither alone explains the complete standings.':null,
   strong?'The '+n(strong.total)+'-point shootout shows that even a stellar starter can end up on the losing side when the opposing lineup produces more points.':null
  ]);
  blocks[3].paragraphs=clean([
   close?'In the '+name(close.winner)+'–'+name(close.loser)+' finish, '+n(close.gap)+' points separated the outcomes. A manager can learn from that narrow result without pretending an unchecked substitute had scored.':null,
   wide?name(wide.loser)+' was beaten by '+n(wide.gap)+' against '+name(wide.winner)+'. Calling that a single start/sit error would ignore how the rest of the roster performed.':null,
   'The meaningful managerial conversation begins with documented choices and ends before speculation is treated as fact.'
  ]);
  blocks[4].paragraphs=clean([
   high&&low?name(high)+' and '+name(low)+' occupied opposite ends of the scoring table at '+n(high.points)+' and '+n(low.points)+'. That contrast defines the uneven competitive landscape of Week '+week+'.':null,
   leaders[0]?'The leading record belongs to '+name(leaders[0])+' ('+record(leaders[0])+'). Sustaining it requires more than one memorable Sunday from the same set of players.':null,
   close?'A narrow '+n(close.gap)+'-point decision can move a team as surely as a blowout, which is why margins and standings consequences are not the same statistic.':null
  ]);
  blocks[5].paragraphs=clean([
   leaders[0]?.next_opponent_name?name(leaders[0])+' meets '+leaders[0].next_opponent_name+' next. The present '+rank(leaders[0])+' position adds pressure, but it cannot decide a game in advance.':null,
   low?.next_opponent_name?name(low)+' will face '+low.next_opponent_name+' after '+n(low.points)+' points this week; lineup production has to change for the next result to improve.':null,
   'The publication boundary stays firm: upcoming Week '+(week+1)+' results remain unknown until Sleeper completes the slate.'
  ]);
 }
 if(sections[0]){sections[0].heading='Week '+week+': The League-Wide Reckoning';sections[0].blocks=blocks;sections[0].paragraphs=blocks.flatMap(x=>x.paragraphs||[])}
 if(sections[1]){sections[1].heading='The Week '+week+' Contender Line';sections[1].paragraphs=clean([
  leaders.length?'The current leaders are '+leaders.slice(0,3).map(t=>name(t)+' at '+record(t)).join(', ')+'. A place near the top matters because the wins are already banked.':null,
  'Being a contender at this stage is not a personality type. It is the combination of wins, lineup production and depth that survives different opponents.',
  high?name(high)+' just set the weekly scoring bar. Whether that performance signals a durable advantage depends on what the roster does behind its top individual players.':null
 ])}
 if(sections[2]){sections[2].heading='The Back Page: The Results Nobody Can Explain Away';sections[2].paragraphs=clean([
  close?'A '+n(close.gap)+'-point finish between '+name(close.winner)+' and '+name(close.loser)+' is a reason to inspect every roster choice. One usable replacement could have changed the standings.':null,
  wide?name(wide.winner)+' handed '+name(wide.loser)+' a '+n(wide.gap)+'-point loss. The scoreboard was unusually clear about which roster had a better afternoon.':null,
  'Managers can argue all week about what should have happened. The completed Week '+week+' matchups have already awarded the wins.'
 ])}
 if(sections[3]){sections[3].heading='Week '+(week+1)+': What Needs to Change';sections[3].paragraphs=clean([
  leaders[0]?.next_opponent_name?name(leaders[0])+' takes its '+record(leaders[0])+' record into a meeting with '+leaders[0].next_opponent_name+'. The team at the top has the most visible target.':null,
  low?.next_opponent_name?name(low)+' faces '+low.next_opponent_name+' next. The response to this week’s '+n(low.points)+' points has to come from a better lineup, not a better press release.':null,
  'Nothing from the upcoming slate is counted as complete. Week '+(week+1)+' will get its own results before the newspaper moves forward.'
 ])}
 if(week%2===1){
  if(sections[1])sections[1].paragraphs=clean([
   leaders[0]?name(leaders[0])+' sits '+rank(leaders[0])+' with '+record(leaders[0])+'. The next challenge is sustaining useful scores across the entire starting lineup.':null,
   high?'The most productive roster this week was '+name(high)+' at '+n(high.points)+'. A contender earns that label across opponents, not from one large total.':null
  ]);
  if(sections[2])sections[2].paragraphs=clean([
   close?'The tightest result went to '+name(close.winner)+' against '+name(close.loser)+'. At '+n(close.gap)+' points apart, the matchup calls for attention to every eligible position.':null,
   wide?'Elsewhere, '+name(wide.winner)+' outdistanced '+name(wide.loser)+' by '+n(wide.gap)+'. That margin cannot be blamed on a single ordinary bench choice.':null,
   'Those games shaped the Week '+week+' table. Future forecasts do not change a result already posted.'
  ]);
  if(sections[3])sections[3].paragraphs=clean([
   leaders[0]?.next_opponent_name?'Next is '+name(leaders[0])+' against '+leaders[0].next_opponent_name+'. A strong current record brings the attention, not an advance victory.':null,
   low?.next_opponent_name?name(low)+' must prepare for '+low.next_opponent_name+' after scoring '+n(low.points)+' this week. Better starters, not a new press release, are the practical answer.':null,
   'Week '+(week+1)+' has not been scored. These are upcoming appointments, not completed outcomes.'
  ]);
 }
 const star=topPlayers(high)[0],young=teams.flatMap(t=>topPlayers(t).filter(p=>valid(p.age)&&Number(p.age)<=26&&valid(p.season_avg)).map(p=>({t,p}))).sort((a,b)=>Number(b.p.season_avg)-Number(a.p.season_avg))[0],flags=new Map();
 for(const t of teams){const key=String(t.division_name||'').trim();if(!key)continue;const previous=flags.get(key),rk=Number(t?.league_context?.standings_rank)||999;if(!previous||rk<(Number(previous?.league_context?.standings_rank)||999))flags.set(key,t)}
 const hot=[
  high?{kind:'championship',title:'Title Favorite: '+name(leaders[0]||high),take:name(leaders[0]||high)+' has the strongest present standings position at '+record(leaders[0]||high)+' and '+rank(leaders[0]||high)+'. That is a current-week call, not an award given in advance.'}:null,
  young?{kind:'breakout',title:'Breakout Player: '+short(young.p),take:short(young.p)+' is averaging '+n(young.p.season_avg)+' this season at age '+young.p.age+'. '+name(young.t)+' has a young player whose production is worth tracking beyond Week '+week+'.'}:{kind:'breakout',title:'Breakout Watch: No Verified Qualifier',take:'The available age and current-season production data do not support a specific breakout selection for Week '+week+'. No player will be invented to fill the category.'},
  star?{kind:'player',title:'Player of the Year Watch: '+short(star),take:short(star)+' just produced '+point(star)+' for '+name(high)+'. The season-long discussion stays open, but that performance belongs in it.'}:null,
  low?{kind:'fraud',title:'Fraud Alert: '+name(low),take:name(low)+' scored '+n(low.points)+' in Week '+week+' and sits '+record(low)+'. One low total is not a lifetime label; repeating it would make the warning louder.'}:null,
  flags.size?{kind:'division',title:'Division Flags',take:[...flags.entries()].map(([d,t])=>d+': '+name(t)+' ('+record(t)+')').join('; ')+'. These are present standings leaders, not projected champions.'}:null
 ];
 const pairs=teams.filter(t=>t.next_opponent_roster_id&&by.has(String(t.next_opponent_roster_id))),match=pairs.map(t=>({a:t,b:by.get(String(t.next_opponent_roster_id))})).find(x=>Number(x.a.next_projection_coverage)>0&&Number(x.b.next_projection_coverage)>0&&valid(x.a.next_projected)&&valid(x.b.next_projected)&&Number(x.a.next_projected)!==Number(x.b.next_projected));
 if(match){const under=Number(match.a.next_projected)<Number(match.b.next_projected)?match.a:match.b,other=under===match.a?match.b:match.a;hot.push({kind:'upset',title:'Upset Special: '+name(under)+' over '+name(other),take:name(under)+' enters Week '+(week+1)+' as the verified projected underdog, '+n(under.next_projected)+' to '+n(other.next_projected)+'. That is a forecast, not a result; one efficient Sunday can turn the matchup around.'})}
 else{const pair=pairs.find(x=>valid(x?.league_context?.standings_rank));if(pair){const fav=by.get(String(pair.next_opponent_roster_id));if(fav){hot.push({kind:'upset',title:'Upset Watch: '+name(pair)+' vs. '+name(fav),take:name(pair)+' faces '+name(fav)+' in Week '+(week+1)+'. A verified projection is unavailable, so this is a matchup to watch rather than a fabricated projected upset.'})}}}
 if(week<17&&!hot.some(x=>x?.kind==='upset'))hot.push({kind:'upset',title:'Upset Special: Awaiting a Verified Matchup',take:'A confirmed next-week pairing is not available in this edition. The newspaper will not invent an opponent, projection or upset pick.'});
 if(week%2===1)for(const h of hot){
  if(!h)continue;
  if(h.kind==='championship'){
   h.title='The Title Conversation: '+name(leaders[0]||high);
   h.take=name(leaders[0]||high)+' currently owns '+record(leaders[0]||high)+' and a '+rank(leaders[0]||high)+' position. That places the club near the front of the argument; it does not settle any playoff game.';
  }else if(h.kind==='breakout'){
   h.title=young?'Emerging Name: '+short(young.p):'Emerging Names: No Confirmed Candidate';
   h.take=young?short(young.p)+' has established a '+n(young.p.season_avg)+' current-season average at '+young.p.age+' years old. The growing record is more persuasive than a single weekly spike.':'Without a verified age and current-season average, the report will not nominate an invented breakout player.';
  }else if(h.kind==='player'){
   h.title=star?'Individual Award Watch: '+short(star):'Individual Award Watch';
   h.take=star?name(high)+' benefited from '+point(star)+' by '+short(star)+'. One productive Sunday is a reason to watch that player, not a completed season award.':'The published statistics do not support a named individual selection.';
  }else if(h.kind==='fraud'){
   h.title='Under the Microscope: '+name(low);
   h.take=name(low)+' managed '+n(low.points)+' in its completed Week '+week+' lineup. It is a warning sign because that production gives rivals a clear point of pressure.';
  }else if(h.kind==='division'){
   h.title='Division Leaders at the Moment';
   h.take=[...flags.entries()].map(([d,t])=>name(t)+' holds the current '+d+' position at '+record(t)).join('; ')+'. Those standings are already earned and can still change.';
  }else if(h.kind==='upset'){
   h.title=h.title.replace('Upset Special:','Next Week’s Upset Call:').replace('Upset Watch:','Next Week’s Matchup Watch:');
   h.take='The Week '+(week+1)+' fixture deserves an underdog conversation only where the opponent and scoring basis are verified. '+h.take;
  }
 }
 if(week%2===0)for(const h of hot){
  if(!h)continue;
  if(h.kind==='championship'){
   h.title='Championship Race: '+name(leaders[0]||high);
   h.take='In Week '+week+', '+name(leaders[0]||high)+' holds '+record(leaders[0]||high)+' and '+rank(leaders[0]||high)+' overall. The position is real; any championship conclusion would still be premature.';
  }else if(h.kind==='breakout'){
   h.title=young?'A Young Name to Follow: '+short(young.p):'Breakout Player: Undetermined';
   h.take=young?'For '+name(young.t)+', '+short(young.p)+' has a '+n(young.p.season_avg)+'-point season average while still '+young.p.age+'. That development is worth watching across future starts.':'The published player history cannot substantiate a candidate for this category yet.';
  }else if(h.kind==='player'){
   h.title=star?'Player Honor Discussion: '+short(star):'Player Honor Discussion';
   h.take=star?short(star)+' recorded '+point(star)+' for '+name(high)+' this week. A meaningful performance enters the conversation without deciding the year-end honor.':'The current snapshot cannot justify naming a player here.';
  }else if(h.kind==='fraud'){
   h.title='Alarm Bell: '+name(low);
   h.take='The '+n(low.points)+'-point score from '+name(low)+' creates genuine pressure. A manager can answer it with a better next lineup, not an excuse for the completed matchup.';
  }else if(h.kind==='division'){
   h.title='Who Controls the Divisions Today';
   h.take=[...flags.entries()].map(([d,t])=>d+' currently goes through '+name(t)+' ('+record(t)+')').join('; ')+'. Those positions may turn on the next result.';
  }else if(h.kind==='upset'){
   h.title=h.title.replace('Upset Special:','Upcoming Upset Watch:').replace('Upset Watch:','Next Slate to Watch:');
   h.take='Week '+(week+1)+' is still ahead. '+h.take;
  }
 }
 overview.hot_takes=hot.filter(Boolean).map((h,i)=>({...h,reporter:sections[i%4]?.reporter||reporter}));
 overview.editorial_rebuilt_for_week=week;
}
// One editorial construction path for the current frozen Week 4 edition and future completed weeks.
export function rebuildForwardInquirerEditorial(original,{previousEdition=null}={}){
 const week=Number(original?.week);
 if(!Number.isInteger(week)||week<3||week>17||!Array.isArray(original?.teams))return original;
 const out=structuredClone(original);
 for(const team of out.teams)teamStory(team,week);
 leagueStory(out);
 const prior=previousEdition||(Number(original?.season)===2026&&week===4?week3Preload2026():null);
 const preVoice=process.env.INQUIRER_DEBUG_RECAP==='1'?(out.league_overview?.sections?.[0]?.blocks||[]).map(b=>({kind:b.kind,count:b.paragraphs?.length,first:b.paragraphs?.[0]?.slice(0,100)})):null;
 const restored=restoreReporterNarratives(out,original,{previousEdition:prior});
 if(process.env.INQUIRER_DEBUG_RECAP==='1')console.log('RECAP_STAGE_COUNTS',JSON.stringify({week,preVoice,afterVoice:(restored.league_overview?.sections?.[0]?.blocks||[]).map(b=>({kind:b.kind,count:b.paragraphs?.length})),sourceTeams:original.teams?.length,example:original.teams?.[0]&&{id:original.teams[0].roster_id,points:original.teams[0].points,opponent_roster_id:original.teams[0].opponent_roster_id}}));
 return restored;
}
export function rebuildWeek4Editorial(original){
 if(Number(original?.season)!==2026||Number(original?.week)!==4)return original;
 return rebuildForwardInquirerEditorial(original);
}
