'use strict';

const one=v=>Number(v||0).toFixed(1);

function headlineVariant(t){
  const n=Number(t?.roster_id);
  if(Number.isFinite(n)&&n>0)return Math.floor((n-1)/4)%8;
  let h=2166136261;
  for(const ch of String(t?.roster_id||t?.team_name||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return (h>>>0)%8;
}

function nextRound(week,conference=''){
  const w=Number(week),conf=/^(AFC|NFC)$/i.test(String(conference||''))?String(conference).toUpperCase():'';
  if(w<14)return null;
  if(w===14)return conf?conf+' Wildcard Round':'NFC/AFC Wildcard Round';
  if(w===15)return conf?conf+' Divisional Round':'NFC/AFC Divisional Round';
  if(w===16)return conf?conf+' Championship':'NFC/AFC Championship';
  if(w===17)return'Super Bowl';
  return null;
}

function playerProse(p){
  if(!p)return'No single player fact is sturdy enough to build a sentence around.';
  const fp=Number.isFinite(Number(p.points))?one(p.points)+' fantasy points':'an unavailable fantasy total';
  const real=String(p.real_stat_line||'').trim();
  if(real)return `${p.name} supplied ${fp}, and the real NFL line underneath it was ${real.replaceAll(' • ',', ')}.`;
  return `${p.name} supplied ${fp}, but Sleeper did not return a usable real-life stat line, so this column will not invent one.`;
}

function trendProse(p){
  const f=p?.recent_form;
  if(!f||f.games<3||!['hot','cold'].includes(f.label))return'';
  if(f.label==='hot')return `${p.name} is carrying an actual multi-game signal too, averaging ${one(f.last3_avg)} fantasy points over the last three after ${one(f.prior3_avg)} across the prior three. That does not guarantee another eruption, but it is enough to call the form genuinely warm.`;
  return `${p.name} has also cooled over a real sample, averaging ${one(f.last3_avg)} fantasy points over the last three after ${one(f.prior3_avg)} across the prior three. That is long enough to call it a problem worth monitoring instead of a one-week annoyance.`;
}

function gameFacts(t){
  const rows=(t.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const ctx=t.league_context||{},opp=t.opponent_context||{},rec=ctx.record||{},st=ctx.streak||{};
  const rank=Number(ctx.standings_rank),size=Number(ctx.league_size)||32;
  const record=String(rec.wins||0)+'-'+String(rec.losses||0)+(Number(rec.ties)?'-'+String(rec.ties):'');
  const score=one(t.points)+'–'+one(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points));
  const proj=Number(t.projected),projDelta=Number(t.points)-proj,bench=t.best_bench,worst=t.worst_starter;
  const benchGap=Number(bench?.points)-Number(worst?.points);
  return {
    rows,top:rows[0]||null,second:rows[1]||null,third:rows[2]||null,low:rows[rows.length-1]||null,
    ctx,opp,rec,st,rank,size,record,score,margin,
    proj:Number.isFinite(proj)?proj:null,projDelta:Number.isFinite(projDelta)?projDelta:null,
    bench,worst,benchGap:Number.isFinite(benchGap)?benchGap:null
  };
}

export function narrativeHeadline(t,w,r){
  const g=gameFacts(t),v=headlineVariant(t),star=g.top?.name||t.team_name,opp=t.opponent_name||'the opposition';
  const win={
    'walter-mercer':[
      `${t.team_name} Opens the Ledger With a Win Worth Keeping`,
      `${star} Sets the Tone as ${t.team_name} Gets Its Sunday Right`,
      `A Good Sunday, Which Is Exactly When ${t.team_name} Should Get Nervous`,
      `${t.team_name} Finds the Boring Kind of Competence That Travels`,
      `No Apology Needed: ${t.team_name} Earns the Ink`,
      `${t.team_name} Leaves ${opp} With the Bill`,
      `The First Clipping Belongs to ${t.team_name}`,
      `${t.team_name} Wins, and the Press Box Has Fewer Complaints Than Usual`
    ],
    'tess-delaney':[
      `The Result and the Process Finally Agree for ${t.team_name}`,
      `${star} Gave ${t.team_name} More Than a Pretty Box Score`,
      `What Actually Worked in ${t.team_name}'s Win`,
      `${t.team_name} Found a Repeatable Way to Win — Maybe`,
      `The Numbers Behind a Sunday ${t.team_name} Can Use`,
      `${t.team_name} Won Without Needing the Spreadsheet to Lie`,
      `A Win With Structure: ${t.team_name} Passed the First Test`,
      `${t.team_name} Has Evidence, Not Proof, and That Is Progress`
    ],
    'mack-hollis':[
      `${t.team_name} Just Kicked the Door Off Its Hinges`,
      `${star} Put ${t.team_name} on the Front Page`,
      `Hide the Good China: ${t.team_name} Won and We Are Behaving Poorly`,
      `The Back Page Belongs to ${t.team_name} Tonight`,
      `${t.team_name} Won, So Naturally We Are Planning Something Irresponsible`,
      `Please Check on ${opp}: ${t.team_name} Had a Day`,
      `${t.team_name} Has Given This Newspaper Dangerous Confidence`,
      `Print It Large: ${t.team_name} Came to Make a Mess`
    ],
    'nora-voss':[
      `Case File Closed for the Week: ${t.team_name} Has the Receipts`,
      `${star} Is Exhibit A in ${t.team_name}'s Winning Argument`,
      `The Lineup Card Survives Cross-Examination for ${t.team_name}`,
      `${t.team_name} Produced Evidence the Skeptics Will Hate`,
      `No Alibi Required: ${t.team_name} Built a Real Win`,
      `${t.team_name} Leaves Very Little for the Inquiry Desk to Prosecute`,
      `The Paper Trail Favors ${t.team_name} This Week`,
      `${t.team_name} Wins, and the Evidence Is Annoyingly Coherent`
    ]
  };
  const loss={
    'walter-mercer':[
      `${t.team_name} Has a Week It Will Want Back`,
      `${star} Could Not Save ${t.team_name} From the Rest of the Story`,
      `The First Bad Clipping Is Already in ${t.team_name}'s File`,
      `${t.team_name} Loses, and There Is Plenty to Put in the Notebook`,
      `A Sunday to File, Not Frame, for ${t.team_name}`,
      `${opp} Sends ${t.team_name} Home With Homework`,
      `${t.team_name} Finds Several Ways to Make One Loss Annoying`,
      `The Press Box Has Questions After ${t.team_name}'s Loss`
    ],
    'tess-delaney':[
      `The Numbers Explain More Than the Final Score for ${t.team_name}`,
      `${star} Was Not Enough to Fix ${t.team_name}'s Week`,
      `Where ${t.team_name}'s Process Broke Down`,
      `${t.team_name} Lost, and the Bad Math Was Not Subtle`,
      `The Box Score Has a Warning Label for ${t.team_name}`,
      `${t.team_name} Found the Wrong Side of Its Own Trend Line`,
      `A Loss With Clues: What ${t.team_name} Needs to Fix`,
      `${t.team_name} Gave the Spreadsheet Something to Complain About`
    ],
    'mack-hollis':[
      `Someone Hide the Front Page From ${t.team_name}`,
      `${star} Deserved Better Than This ${t.team_name} Ending`,
      `${t.team_name} Has Forced Us to Use the Angry Font`,
      `The Back Page Is Filing a Complaint Against ${t.team_name}`,
      `${t.team_name} Lost, and Yes, We Have Begun Naming Names`,
      `${opp} Ruined the Evening and ${t.team_name} Helped`,
      `Red Ink Everywhere After ${t.team_name}'s Sunday`,
      `${t.team_name} Gave This Newspaper a Very Expensive Headache`
    ],
    'nora-voss':[
      `The Evidence Board Is Not Kind to ${t.team_name}`,
      `${star} Cannot Be the Entire Defense for ${t.team_name}`,
      `The Lineup Card Has Questions to Answer After ${t.team_name}'s Loss`,
      `${t.team_name} Leaves a Paper Trail Nobody Should Enjoy Reading`,
      `The Inquiry Begins With What ${t.team_name} Left on the Table`,
      `${opp} Wins the Argument, and ${t.team_name} Supplies the Exhibits`,
      `${t.team_name} Loses, So the File Stays Open`,
      `There Are Fingerprints All Over ${t.team_name}'s Bad Sunday`
    ]
  };
  const pool=(t.won?win:loss)[r.id]||(t.won?win['walter-mercer']:loss['walter-mercer']);
  return pool[v%pool.length];
}

function seasonNarrative(t,w){
  const c=t.league_context||{},st=c.streak||{},rank=Number(c.standings_rank),size=Number(c.league_size)||32,rec=c.record||{};
  const record=String(rec.wins||0)+'-'+String(rec.losses||0)+(Number(rec.ties)?'-'+String(rec.ties):'');
  if(Number(w)===1)return `One result is not a trend, and the opening table is mostly a collection of very small sample sizes. ${t.team_name} leaves Week 1 at ${record}${rank?' and sits '+rank+'th of '+size:''}. That is useful context, not permission to start engraving trophies or tombstones.`;
  const streak=Number(st.length)>=2?` The ${st.type==='W'?'winning':'losing'} streak has reached ${st.length}.`:'';
  const recent=Number(c.recent_avg_points),prior=Number(c.prior_five_avg_points);
  const form=Number.isFinite(recent)&&Number.isFinite(prior)&&Math.abs(recent-prior)>=8?` The last-five scoring pace is ${one(recent)}, ${one(Math.abs(recent-prior))} ${recent>prior?'higher':'lower'} than the five before it.`:'';
  const playoff=Number(w)>=14?` This is ${t.week_classification?.round||'the playoffs'}, so there is no harmless version of a bad lineup decision now.`:Number(c.games_until_playoffs)<=6?` Week 14 starts the playoffs, which makes the current seed line more than decorative.`:'';
  return `${t.team_name} is ${record}${rank?', '+rank+'th of '+size:''}.${streak}${form}${playoff}`;
}

function transactionNarrative(t,facts){
  const tx=t.transactions||[];
  if(!tx.length)return `Management left the transaction wire alone this week. That can be discipline or complacency; the difference usually becomes obvious one injury later.`;
  const named=[];
  for(const move of tx){
    for(const id of move.adds||[])if(facts[String(id)])named.push({verb:'added',p:facts[String(id)]});
    for(const id of move.drops||[])if(facts[String(id)])named.push({verb:'moved on from',p:facts[String(id)]});
    if(named.length>=2)break;
  }
  let s=`GM ${t.manager_name} logged ${tx.length} roster move${tx.length===1?'':'s'}, which at least establishes that the front office was awake.`;
  if(named[0])s+=` The most visible piece was that management ${named[0].verb} ${named[0].p.name}. ${playerProse(named[0].p)}`;
  if(named[1])s+=` Another move involved ${named[1].p.name}. ${playerProse(named[1].p)}`;
  return s;
}

function valueNarrative(t){
  const v=t.value_history_week;
  if(!v||!Number.isFinite(Number(v.delta)))return `The Value Watch is deliberately quiet this week. There is not yet a valid pair of team-value observations to support a real movement claim, so the market section will wait rather than decorate an empty sample with fake precision.`;
  const d=Number(v.delta),period=v.period==='7D'?'seven days':'the available tracking window';
  return `The market has moved this roster ${d>=0?'up':'down'} by ${Math.abs(d).toLocaleString()} value points over ${period}, from ${Number(v.baseline_value||0).toLocaleString()} to ${Number(v.value||0).toLocaleString()}. That is not a win or a loss, but it is useful evidence about how the league’s valuation picture is changing around the results.`;
}

function sentimentNarrative(s){
  const delta=s.change==null?'':` Compared with last week, the mood is ${s.change>=0?'warmer':'colder'} without pretending one Sunday erased everything that came before.`;
  return `${s.scene} That reaction is being carried by the manager’s recent results, roster-value direction, transaction history and longer résumé rather than this week alone.${delta}`;
}

function personnelNarrative(t,w){
  const a=t.next_week_availability||{};
  if(a.fantasy_season_complete||Number(w)>=17)return `There is no Week 18 fantasy matchup to preview. The Super Bowl closes the Fleeced! in-season calendar, so the roster-pressure file ends here.`;
  const byes=a.bye_current_starters||[],inj=a.injury_current_starters||[];
  if(!a.schedule_verified&&!inj.length)return `The next-week availability file is too thin to support a confident roster warning. The NFL schedule was not verified and Sleeper has no current-starter injury designation worth publishing, so there is nothing responsible to dramatize yet.`;
  let s=a.schedule_verified?(byes.length?`${byes.length} current starter${byes.length===1?' is':'s are'} on a verified NFL bye next week.`:`There are no verified current-starter byes next week.`):`Bye claims are being withheld because the schedule lookup was not verified.`;
  if(inj.length)s+=` Sleeper also has ${inj.length} current starter${inj.length===1?'':'s'} carrying an injury or status designation, which makes depth a real roster question before lineups lock.`;
  else s+=` Sleeper does not currently show a publishable injury designation on a starter.`;
  return s;
}

function nextOpponentNarrative(t,w){
  const n=t.next_opponent_context,name=t.next_opponent_name||'the next opponent';
  if(!t.next_opponent_roster_id)return Number(w)>=17?`There is no next fantasy opponent after the Super Bowl.`:`Sleeper has not supplied the next opponent yet, so no matchup will be invented.`;
  const rec=n?.record?`${n.record.wins||0}-${n.record.losses||0}${Number(n.record.ties)?'-'+n.record.ties:''}`:'record unavailable';
  const nr=nextRound(Number(w)+1,t.conference),round=nr?` in the ${nr}`:'';
  return `${name} is next${round}, carrying a ${rec} record${n?.standings_rank?', currently '+n.standings_rank+'th in the league':''}. The job this week is not to chase the last box score; it is to decide which parts of this performance deserve to travel.`;
}

function buildSections(t,w,r,facts,sentiment){
  const g=gameFacts(t),star=playerProse(g.top),second=playerProse(g.second),low=playerProse(g.low),bench=playerProse(g.bench);
  const season=seasonNarrative(t,w),tx=transactionNarrative(t,facts),value=valueNarrative(t),fans=sentimentNarrative(sentiment),personnel=personnelNarrative(t,w),next=nextOpponentNarrative(t,w),trend=trendProse(g.top);
  const won=!!t.won,margin=g.margin.toFixed(1),opp=t.opponent_name||'the opponent';
  const proj=g.projDelta==null?'':` Against the pregame projection, the lineup finished ${Math.abs(g.projDelta).toFixed(1)} points ${g.projDelta>=0?'above':'below'} expectation.`;

  if(r.id==='walter-mercer')return[
    {heading:'From the Press Box',kind:'lede',paragraphs:[
      `${t.team_name} ${won?'won':'lost'} ${g.score}, and the useful part is not that the scoreboard looked good or bad for five minutes after the final. It is that Week ${w} gave us the first clean entry in the season notebook: a ${margin}-point ${won?'win':'loss'} against ${opp}.${proj} The temptation is to call it a statement. Beat writers with functioning memories should know better.`,
      `${season} The point of keeping a notebook is to stop one loud Sunday from rewriting the season in our heads. This result matters because it happened; what it means depends on whether the same strengths and mistakes survive the next few pages.`
    ]},
    {heading:'Who Earned the Ink',kind:'players',paragraphs:[
      `${star} That was the performance that gave this game its shape, not just because of the fantasy total but because the real NFL production underneath it was visible. ${trend||'There is not enough multi-game evidence yet to turn that performance into a trend, which is probably healthy for everybody involved.'}`,
      `${second} The lineup also had a less glamorous end of the page. ${low} A good roster can survive one soft starter line; what it cannot do forever is ask the same stars to cover every quiet position.`
    ]},
    {heading:'The Manager’s Chair',kind:'management',paragraphs:[
      `${tx} Transaction volume is not intelligence by itself, but it does tell us where management believed the roster needed attention. The next useful question is whether those moves addressed the positions that actually decided this matchup.`,
      g.bench&&g.worst&&g.benchGap>=5?`${bench} That matters because ${g.worst.name} was in the starting lineup instead. ${low} Hindsight is cheap, so one missed decision is not a conviction, but repeated versions of the same mistake eventually become process.`:`There is no single bench decision large enough to explain the result by itself. That is worth saying because managers deserve blame for process, not for failing to predict every bounce of a football.`
    ]},
    {heading:'The Mood Around Town',kind:'sentiment',paragraphs:[
      `${fans} The useful thing about a fan base is that it remembers. One bad week does not erase a championship résumé, and one good week does not grant lifetime immunity to a manager who has spent a month lighting matches near the depth chart.`,
      `${value} Put together, public mood and market movement tell two different stories: one is emotional memory, the other is changing roster perception. Neither belongs in the standings, but both belong in a real beat column.`
    ]},
    {heading:'What Comes Next',kind:'outlook',paragraphs:[
      `${personnel} Availability is where roster construction stops being theoretical. A manager who built depth gets to use it; a manager who did not gets to discover that fact in public.`,
      `${next} Keep the clipping if this was a win. Keep the receipts if it was a loss. Either way, the season is asking for another page before anyone gets to declare the story finished.`
    ]}
  ];

  if(r.id==='tess-delaney')return[
    {heading:'What the Result Actually Says',kind:'lede',paragraphs:[
      `${t.team_name} ${won?'won':'lost'} ${g.score}. Fine. The more useful question is whether the path to that score looks repeatable. The margin was ${margin} points, and${g.projDelta==null?' there is no trustworthy projection comparison to lean on.':` the lineup finished ${Math.abs(g.projDelta).toFixed(1)} points ${g.projDelta>=0?'above':'below'} projection.`} That gives us a result and a process, which are related but not interchangeable.`,
      `${season} The sample is still allowed to be small. My only request is that we stop treating “small” as a synonym for “meaningless.” Even in Week ${w}, usage, lineup concentration and decision quality can tell us what deserves another look.`
    ]},
    {heading:'Where the Production Came From',kind:'players',paragraphs:[
      `${star} That is the player-level result I care about most because the fantasy number has a real football stat line sitting underneath it. ${trend||'For now, it is a strong data