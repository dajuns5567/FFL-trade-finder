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
function teamStory(t,week){
 const a=t.inquirer_article;if(!a)return;
 const players=topPlayers(t),star=players[0],support=players[1],third=players[2],weak=players.at(-1),bench=t.best_bench,miss=t.best_lineup_miss||null,old=t?.league_context||{},foe=t.opponent_name||'the opponent',next=t.next_opponent_name||null,won=win(t),gap=margin(t),team=name(t),id=t.roster_id,seed=week+'|'+id;
 const fact=valid(t.points)&&valid(t.opponent_points)?team+' '+(won?'beat ':'lost to ')+foe+' '+n(t.points)+'–'+n(t.opponent_points)+'.':team+' completed Week '+week+' without a verified matchup score.';
 const head=choose([
  won?'A win is a fact. The interesting part is who earned it.':'The loss is settled. The explanation still has work to do.',
  won?'This one belongs in the standings, not just the group chat.':'The score is already unkind enough without dressing it up.',
  won?'The result held. That does not make every lineup decision right.':'There is a difference between being unlucky and being outscored.',
  won?'Good teams bank these Sundays and study the uncomfortable details.':'The opponent got the points. The manager gets the questions.'
 ],seed+'lede');
 const starLine=star?short(star)+' led the starters with '+point(star)+'. '+(support?short(support)+' added '+point(support)+', which matters because the top score alone did not play every lineup position.':'That put a lot of the afternoon on one player's shoulders.'):'The starters did not provide a complete player-by-player scoring breakdown.';
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
   choose(['Bank what worked, improve what did not, and make the next opponent beat a better version of this lineup.','The next score will not care how good the postgame explanation sounded.','There is still time to move the standings; it starts with a lineup that earns its points.','The next useful answer comes from the field, not the Monday argument.'],seed+'outlook')
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
 const candidates=[...sort(games,(a,b)=>b.total-a.total),...sort(games,(a,b)=>a.gap-b.gap),...sort(games,(a,b)=>b.gap-a.gap)],chosen=[];for(const g of candidates){if(chosen.length>=5)break;if(!chosen.some(x=>x===g))chosen.push(g)}
 const reporter=overview.sections?.[0]?.reporter||null,blocks=[];
 for(const [i,g] of chosen.entries()){
  const w=g.winner,l=g.loser,stars=topPlayers(w),leader=stars[0],losers=topPlayers(l),other=losers[0],close=g.gap<=8,wide=g.gap>=30;
  blocks.push({heading:(i===0?'Week '+week+'’s Loudest Game: ':'')+name(w)+' vs. '+name(l),paragraphs:clean([
    name(w)+' beat '+name(l)+' '+n(w.points)+'–'+n(l.points)+'. '+(close?'The narrow margin turned every secondary score into a significant one.':wide?'This was a decisive final score, not a coin flip dressed up as a storyline.':'The difference was large enough to see but close enough to expose individual lineup decisions.'),
    leader?short(leader)+' led '+name(w)+' at '+point(leader)+(other?', while '+short(other)+' put up '+point(other)+' for '+name(l):'')+'. The best individual scores did not change who finished ahead.':null,
    'The winner moves to '+record(w)+' ('+rank(w)+' overall); '+name(l)+' sits '+record(l)+' ('+rank(l)+'). A weekly score matters more when it is read alongside the standings rather than in isolation.',
    choose([name(w)+' found a winning combination of stars and supporting points. '+name(l)+' has to make up the difference with actual lineup production, not a more convincing explanation.',name(l)+' can point to individual performances, but '+name(w)+' collected the result. That is the uncomfortable arithmetic every manager signs up for.',name(w)+' will enjoy this one. '+name(l)+' gets the week to decide which weakness is truly fixable before the next opponent arrives.'],'recap|'+week+'|'+i)
  ])})
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
 const star=topPlayers(high)[0],young=teams.flatMap(t=>topPlayers(t).filter(p=>valid(p.age)&&Number(p.age)<=26&&valid(p.season_avg)).map(p=>({t,p}))).sort((a,b)=>Number(b.p.season_avg)-Number(a.p.season_avg))[0],flags=new Map();
 for(const t of teams){const key=String(t.division_name||'').trim();if(!key)continue;const previous=flags.get(key),rk=Number(t?.league_context?.standings_rank)||999;if(!previous||rk<(Number(previous?.league_context?.standings_rank)||999))flags.set(key,t)}
 const hot=[
  high?{kind:'championship',title:'Title Favorite: '+name(leaders[0]||high),take:name(leaders[0]||high)+' has the strongest present standings position at '+record(leaders[0]||high)+' and '+rank(leaders[0]||high)+'. That is a current-week call, not an award given in advance.'}:null,
  young?{kind:'breakout',title:'Breakout Player: '+short(young.p),take:short(young.p)+' is averaging '+n(young.p.season_avg)+' this season at age '+young.p.age+'. '+name(young.t)+' has a young player whose production is worth tracking beyond Week '+week+'.'}:null,
  star?{kind:'player',title:'Player of the Year Watch: '+short(star),take:short(star)+' just produced '+point(star)+' for '+name(high)+'. The season-long discussion stays open, but that performance belongs in it.'}:null,
  low?{kind:'fraud',title:'Fraud Alert: '+name(low),take:name(low)+' scored '+n(low.points)+' in Week '+week+' and sits '+record(low)+'. One low total is not a lifetime label; repeating it would make the warning louder.'}:null,
  flags.size?{kind:'division',title:'Division Flags',take:[...flags.entries()].map(([d,t])=>d+': '+name(t)+' ('+record(t)+')').join('; ')+'. These are present standings leaders, not projected champions.'}:null
 ];
 const pairs=teams.filter(t=>t.next_opponent_roster_id&&by.has(String(t.next_opponent_roster_id))),match=pairs.map(t=>({a:t,b:by.get(String(t.next_opponent_roster_id))})).find(x=>valid(x.a.next_projected)&&valid(x.b.next_projected)&&Number(x.a.next_projected)!==Number(x.b.next_projected));
 if(match){const under=Number(match.a.next_projected)<Number(match.b.next_projected)?match.a:match.b,other=under===match.a?match.b:match.a;hot.push({kind:'upset',title:'Upset Special: '+name(under)+' over '+name(other),take:name(under)+' enters Week '+(week+1)+' as the verified projected underdog, '+n(under.next_projected)+' to '+n(other.next_projected)+'. That is a forecast, not a result; one efficient Sunday can turn the matchup around.'})}
 else{const pair=pairs.find(x=>valid(x?.league_context?.standings_rank));if(pair){const fav=by.get(String(pair.next_opponent_roster_id));if(fav){hot.push({kind:'upset',title:'Upset Watch: '+name(pair)+' vs. '+name(fav),take:name(pair)+' faces '+name(fav)+' in Week '+(week+1)+'. A verified projection is unavailable, so this is a matchup to watch rather than a fabricated projected upset.'})}}}
 overview.hot_takes=hot.filter(Boolean).map((h,i)=>({...h,reporter:sections[i%4]?.reporter||reporter}));
 overview.editorial_rebuilt_for_week=week;
}
export function rebuildWeek4Editorial(original){
 if(Number(original?.season)!==2026||Number(original?.week)!==4)return original;
 const out=structuredClone(original);
 for(const team of out.teams||[])teamStory(team,4);
 leagueStory(out);
 return out;
}
