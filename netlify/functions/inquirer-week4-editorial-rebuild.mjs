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
 for(const t of teams){const o=by.get(String(t.opponent_roster_id||''));if(!o||!valid(t.points)||!valid(o.points))continue;const key=[String(t.roster_id),String(o.roster_id)].sort().join('|');if(used.has(key))continue;used.add(key);const winner=Number(t.points)>=Number(o.points)?t:o,loser=winner===t?o:t;games.push({winner,loser,gap:Math.abs(Number(t.points)-Number(o.points)),total:Number(t.points)+Number(o.points)})}
 const sort=(rows,fn)=>rows.slice().sort(fn);
 const orders=[
  {title:'The Week’s Loudest Game',games:sort(games,(a,b)=>b.total-a.total)},
  {title:'The Closest Finish',games:sort(games,(a,b)=>a.gap-b.gap)},
  {title:'The Biggest Margin',games:sort(games,(a,b)=>b.gap-a.gap)},
  {title:'Another Scoring Headline',games:sort(games,(a,b)=>b.total-a.total)},
  {title:'The Other Game That Deserves a Look',games:sort(games,(a,b)=>a.gap-b.gap)}
 ],chosen=[],selected=new Set();
 for(const row of orders){const game=row.games.find(g=>!selected.has(g));if(game){chosen.push({...game,storyTitle:row.title});selected.add(game)}}
 const reporter=overview.sections?.[0]?.reporter||null,blocks=[];
 for(const [i,g] of chosen.entries()){
  const w=g.winner,l=g.loser,leader=topPlayers(w)[0],runner=topPlayers(l)[0],
   support=topPlayers(w)[1],losingSupport=topPlayers(l)[1],difference=n(g.gap);
  let paragraphs=[];
  if(i===0)paragraphs=clean([
   name(w)+' survived the week’s highest combined-score game, '+n(w.points)+' to '+n(l.points)+'. Together these rosters put up '+n(g.total)+' fantasy points, enough to make ordinary depth feel unusually important.',
   leader?short(leader)+' accounted for '+point(leader)+' on the winning side'+(runner?', while '+short(runner)+' answered with '+point(runner)+' for '+name(l):'')+'. The top names gave the matchup its pace.':null,
   support?name(w)+' also got '+point(support)+' from '+short(support)+'. A high-scoring win is easier to understand when the second-best starter is carrying actual weight.':null,
   'The table now has '+name(w)+' at '+record(w)+' and '+name(l)+' at '+record(l)+'. The losing score was substantial, but there are no extra standings points for keeping up in a shootout.'
  ]);
  else if(i===1)paragraphs=clean([
   'Only '+difference+' points separated '+name(w)+' and '+name(l)+'. The winner posted '+n(w.points)+'; the loser reached '+n(l.points)+'. No manager in that matchup gets to call the margin comfortable.',
   runner?name(l)+' had '+short(runner)+' contributing '+point(runner)+'. A strong individual performance could not completely cover the remaining difference.':null,
   leader?short(leader)+' gave '+name(w)+' '+point(leader)+'. In a finish decided by '+difference+', the points behind that starter were every bit as consequential.':null,
   'This is the kind of result that puts roster choices under scrutiny. '+name(w)+' banked the win; '+name(l)+' carries the narrower, more irritating question into the next slate.'
  ]);
  else if(i===2)paragraphs=clean([
   name(w)+' put '+difference+' points between itself and '+name(l)+'. At '+n(w.points)+'–'+n(l.points)+', the widest gap of the week did not require a dramatic late twist.',
   leader?'The largest winning-side contribution came from '+short(leader)+' with '+point(leader)+'. '+name(w)+' did not have to ask a quiet opponent to keep it close.':null,
   runner?short(runner)+' led the defeated roster at '+point(runner)+'. The gap beyond that individual score is what '+name(l)+' has to address.':null,
   'After the result, '+name(w)+' stands '+record(w)+' and '+rank(w)+' overall. '+name(l)+' is '+record(l)+' and '+rank(l)+'. Large margins do not count twice, but they reveal different problems from close losses.'
  ]);
  else if(i===3)paragraphs=clean([
   'A separate scoring headline belongs to '+name(w)+', which beat '+name(l)+' by '+difference+'. '+n(w.points)+' points made this a good week for the winner’s total, not merely a story about an opponent falling short.',
   support?short(support)+' provided '+point(support)+' alongside '+(leader?short(leader)+' at '+point(leader):'the rest of the starters')+'. That second source of points is what gives the winning lineup more than one route to a result.':null,
   losingSupport?name(l)+' received '+point(losingSupport)+' from '+short(losingSupport)+'. There were usable totals on both sides, but not enough of them in the same lineup.':null,
   name(w)+' now takes '+record(w)+' into its next appearance. Nobody gets to carry this exact box score forward; the useful achievement was producing across multiple starting spots.'
  ]);
  else paragraphs=clean([
   name(w)+' took another completed Week '+week+' decision over '+name(l)+', '+n(w.points)+'–'+n(l.points)+'. Its '+difference+'-point margin helps explain the result without turning every matchup into the same story.',
   leader?short(leader)+' was the high scorer for '+name(w)+' with '+point(leader)+'. The other starters supplied the difference between a personal highlight and a team result.':null,
   'For '+name(l)+', the season record becomes '+record(l)+' and the overall position is '+rank(l)+'. One matchup is not a final judgment, but the standings do not wait for a better explanation.',
   w.next_opponent_name?name(w)+' turns next to '+w.next_opponent_name+'. The latest result is useful preparation, but that opponent has its own lineup and its own reasons to disrupt the form.':null
  ]);
  // Alternate editorial framing by issue, not merely a different transition on a copied sentence.
  if(week%2===1){
   if(i===0)paragraphs=clean([
    'No scoreboard was busier than the '+name(w)+'–'+name(l)+' contest. Their combined '+n(g.total)+' points produced a '+n(w.points)+'–'+n(l.points)+' victory for '+name(w)+'.',
    leader?short(leader)+' added '+point(leader)+' to the winner’s cause'+(support?', while '+short(support)+' followed with '+point(support):'')+'. This was not merely an opponent failing to score.':null,
    runner?short(runner)+' offered '+name(l)+' '+point(runner)+'. That individual effort deserves mention because the club lost despite meaningful production.':null,
    'The headline is the win. The consequence is '+record(w)+' for '+name(w)+' and '+record(l)+' for '+name(l)+', records that will remain when the week’s highlights are forgotten.'
   ]);
   else if(i===1)paragraphs=clean([
    name(l)+' came within '+n(g.gap)+' of '+name(w)+', '+n(l.points)+' to '+n(w.points)+'. That is narrow enough for a manager to remember each overlooked lineup decision.',
    runner?'On the losing side, '+short(runner)+' delivered '+point(runner)+'. It is hard to call an entire roster lifeless with that kind of contribution.':null,
    leader?name(w)+' leaned most on '+short(leader)+' for '+point(leader)+'. Its smaller contributions mattered precisely because the difference was so small.':null,
    'After such a tight finish, '+name(l)+' must prepare for another opponent without pretending the points on this scoreboard can be recovered.'
   ]);
   else if(i===2)paragraphs=clean([
    'The hard fall of the week belonged to '+name(l)+'. '+name(w)+' won '+n(w.points)+'–'+n(l.points)+', a '+n(g.gap)+'-point gap that no late narrative can make close.',
    leader?short(leader)+' supplied '+point(leader)+' for '+name(w)+'. That was one of several reasons the contest escaped the losing roster’s control.':null,
    runner?'Even '+short(runner)+' at '+point(runner)+' could not protect '+name(l)+' from its own final total. The numbers elsewhere deserve scrutiny.':null,
    name(w)+' sits at '+record(w)+' with the result banked; '+name(l)+' has '+record(l)+'. The loser needs improvement across starting roles, not just another memorable top scorer.'
   ]);
   else if(i===3)paragraphs=clean([
    'Another outcome worth preserving: '+name(w)+' beat '+name(l)+' by '+n(g.gap)+' points, recording '+n(w.points)+' against '+n(l.points)+'.',
    support?short(support)+' earned '+point(support)+', helping '+name(w)+' avoid depending entirely on '+(leader?short(leader):'a single starting player')+'.':null,
    losingSupport?name(l)+' found '+point(losingSupport)+' from '+short(losingSupport)+'. The trouble was that the rest of its totals did not finish the job.':null,
    'The week rewards '+name(w)+' with a result, and the calendar immediately demands preparation for the next opponent.'
   ]);
   else paragraphs=clean([
    'In a game that will matter to the middle of the table, '+name(w)+' collected '+n(w.points)+' and held '+name(l)+' to '+n(l.points)+'. The margin was '+n(g.gap)+'.',
    runner?name(l)+' could at least point to '+short(runner)+' with '+point(runner)+'. One outstanding starter cannot erase every gap elsewhere.':null,
    leader?short(leader)+' produced '+point(leader)+' for the victorious roster. That was part of a total sufficient for the standings, whatever comes next.':null,
    w.next_opponent_name?'The next date on '+name(w)+'’s schedule is '+w.next_opponent_name+'. A manager cannot carry a past victory into a new matchup as if it were a projected score.':'The future schedule requires a new lineup; the completed result requires none.'
   ]);
  }
  blocks.push({heading:g.storyTitle+': '+name(w)+' vs. '+name(l),paragraphs});
 }
 const leaders=sort(teams,(a,b)=>(Number(a?.league_context?.standings_rank)||999)-(Number(b?.league_context?.standings_rank)||999)).slice(0,5);
 const scoring=sort(teams,(a,b)=>Number(b.points)-Number(a.points)),high=scoring[0],low=scoring.at(-1),close=sort(games,(a,b)=>a.gap-b.gap)[0],wide=sort(games,(a,b)=>b.gap-a.gap)[0];
 const sections=overview.sections||[];
 if(sections[0]){sections[0].heading='What Actually Mattered This Week';sections[0].blocks=[...blocks,{heading:'What '+week+' Weeks Have Changed',paragraphs:clean([
  leaders.length?'The top of the current table reads '+leaders.map(t=>name(t)+' ('+record(t)+', '+rank(t)+')').join('; ')+'. Those positions are earned by the completed games, not by draft-day optimism.':null,
  high?name(high)+' supplied the highest team score this week at '+n(high.points)+'. '+(low?name(low)+' finished at '+n(low.points)+', a reminder that the league does not experience every Sunday equally.':''):null,
  close?'The closest verified matchup ended '+name(close.winner)+' over '+name(close.loser)+' by '+n(close.gap)+'. That one stays with the losing manager longer than the lopsided results.':null,
  wide?'The widest margin was '+n(wide.gap)+' in '+name(wide.winner)+' over '+name(wide.loser)+'. Nobody needs to manufacture suspense where the score supplied none.':null
 ])}];sections[0].paragraphs=sections[0].blocks.flatMap(b=>b.paragraphs||[])}
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
  if(sections[0]?.blocks?.length){
   const summary=sections[0].blocks.at(-1);
   summary.paragraphs=clean([
    'A full slate of completed games put '+name(high)+' atop this week’s team-scoring column at '+n(high.points)+', with '+name(low)+' at '+n(low.points)+' on the other end.',
    close?'Few results were finer than '+name(close.winner)+' over '+name(close.loser)+', a difference of '+n(close.gap)+'. The managers have an actual score to study rather than another forecast.':null,
    wide?name(wide.loser)+' absorbed a '+n(wide.gap)+'-point defeat against '+name(wide.winner)+'. That result gives the losing roster a very different problem from a last-point decision.':null,
    leaders[0]?'The best overall standing currently belongs to '+name(leaders[0])+' at '+record(leaders[0])+'. Weekly points can change dramatically; the record is accumulated more slowly.':null
   ]);
   sections[0].paragraphs=sections[0].blocks.flatMap(b=>b.paragraphs||[]);
  }
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
 return restoreReporterNarratives(out,original,{previousEdition:prior});
}
export function rebuildWeek4Editorial(original){
 if(Number(original?.season)!==2026||Number(original?.week)!==4)return original;
 return rebuildForwardInquirerEditorial(original);
}
