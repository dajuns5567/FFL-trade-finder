'use strict';

const one=v=>Number(v||0).toFixed(1);
const ordinal=n=>{const x=Math.abs(Number(n)||0),m100=x%100,m10=x%10;return String(x)+(m100>=11&&m100<=13?'th':m10===1?'st':m10===2?'nd':m10===3?'rd':'th')};

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
  const g=gameFacts(t),v=headlineVariant(t),team=String(t.team_name||'Team').trim(),star=String(g.top?.name||team).trim(),opp=String(t.opponent_name||'the opposition').trim(),poss=name=>/s$/i.test(String(name).trim())?String(name).trim()+'’':String(name).trim()+'’s';
  const win={
    'walter-mercer':[
      `Week ${w} Belongs to ${team}: A Win Worth Keeping`,
      `${star} Sets the Tone in ${poss(team)} Sunday Win`,
      `A Good Sunday for ${team}, Which Is Exactly When We Get Nervous`,
      `The Boring Kind of Competence Arrives for ${team}`,
      `No Apology Needed: ${team} Earned the Ink`,
      `The Bill Goes to ${opp}; the Win Goes to ${team}`,
      `The First Clipping Belongs to ${team}`,
      `A Win for ${team}, and Fewer Press-Box Complaints Than Usual`
    ],
    'tess-delaney':[
      `The Result and the Process Finally Agree for ${team}`,
      `${star} Gave ${team} More Than a Pretty Box Score`,
      `What Actually Worked in ${poss(team)} Win`,
      `A Repeatable Way to Win for ${team} — Maybe`,
      `The Numbers Behind a Sunday ${team} Can Use`,
      `${team} Won Without Needing the Spreadsheet to Lie`,
      `A Win With Structure: First-Test Approval for ${team}`,
      `Evidence, Not Proof: Progress for ${team}`
    ],
    'mack-hollis':[
      `${team} Just Kicked the Door Off Its Hinges`,
      `${star} Put ${team} on the Front Page`,
      `Hide the Good China: ${team} Won and We Are Behaving Poorly`,
      `The Back Page Belongs to ${team} Tonight`,
      `A Win for ${team}, So Naturally We Are Planning Something Irresponsible`,
      `Please Check on ${opp}: ${team} Had a Day`,
      `Dangerous Confidence Has Arrived at the ${team} Desk`,
      `Print It Large: ${team} Came to Make a Mess`
    ],
    'nora-voss':[
      `Case File Closed for the Week: Receipts in Hand for ${team}`,
      `${star} Is Exhibit A in ${poss(team)} Winning Argument`,
      `The Lineup Card Survives Cross-Examination for ${team}`,
      `Evidence the Skeptics Will Hate: A Win for ${team}`,
      `No Alibi Required: A Real Win for ${team}`,
      `Very Little to Prosecute After ${poss(team)} Win`,
      `The Paper Trail Favors ${team} This Week`,
      `A Win for ${team}, and the Evidence Is Annoyingly Coherent`
    ]
  };
  const loss={
    'walter-mercer':[
      `A Week ${team} Will Want Back`,
      `${star} Could Not Save the Rest of ${poss(team)} Story`,
      `The First Bad Clipping Is Already in ${poss(team)} File`,
      `A Loss for ${team}, and Plenty for the Notebook`,
      `A Sunday to File, Not Frame, for ${team}`,
      `Homework for ${team} After the Loss to ${opp}`,
      `One Loss, Several Annoyances for ${team}`,
      `The Press Box Has Questions After ${poss(team)} Loss`
    ],
    'tess-delaney':[
      `The Numbers Explain More Than the Final Score for ${team}`,
      `${star} Was Not Enough to Fix ${poss(team)} Week`,
      `Where the Process Broke Down for ${team}`,
      `Bad Math, Bad Result for ${team}`,
      `A Warning Label on ${poss(team)} Box Score`,
      `The Wrong Side of the Trend Line for ${team}`,
      `A Loss With Clues: What Needs Fixing for ${team}`,
      `${team} Gave the Spreadsheet Something to Complain About`
    ],
    'mack-hollis':[
      `Someone Hide the Front Page From ${team}`,
      `${star} Deserved Better Than This ${team} Ending`,
      `The Angry Font Is Out for ${team}`,
      `The Back Page Files a Complaint Against ${team}`,
      `A Loss for ${team}, and Yes, We Have Begun Naming Names`,
      `${opp} Ruined the Evening and ${team} Helped`,
      `Red Ink Everywhere After ${poss(team)} Sunday`,
      `A Very Expensive Headache Courtesy of ${team}`
    ],
    'nora-voss':[
      `The Evidence Board Is Not Kind to ${team}`,
      `${star} Cannot Be the Entire Defense for ${team}`,
      `The Lineup Card Has Questions After ${poss(team)} Loss`,
      `A Paper Trail Nobody at ${team} Should Enjoy Reading`,
      `The Inquiry Begins With What ${team} Left on the Table`,
      `The Argument Goes to ${opp}; the Exhibits Belong to ${team}`,
      `A Loss for ${team}, So the File Stays Open`,
      `Fingerprints All Over ${poss(team)} Bad Sunday`
    ]
  };
  const pool=(t.won?win:loss)[r.id]||(t.won?win['walter-mercer']:loss['walter-mercer']);
  return pool[v%pool.length].replace(/\s+/g,' ').trim();
}
function seasonNarrative(t,w){
  const c=t.league_context||{},st=c.streak||{},rank=Number(c.standings_rank),size=Number(c.league_size)||32,rec=c.record||{};
  const record=String(rec.wins||0)+'-'+String(rec.losses||0)+(Number(rec.ties)?'-'+String(rec.ties):'');
  if(Number(w)===1)return `${t.team_name} has exactly one completed result in the book, so the opening table is still mostly a collection of tiny samples. The club leaves Week 1 at ${record}${rank?' and sits '+ordinal(rank)+' of '+size:''}. That is useful context, not permission to start engraving trophies or tombstones.`;
  const streak=Number(st.length)>=2?` The ${st.type==='W'?'winning':'losing'} streak has reached ${st.length}.`:'';
  const recent=Number(c.recent_avg_points),prior=Number(c.prior_five_avg_points);
  const form=Number.isFinite(recent)&&Number.isFinite(prior)&&Math.abs(recent-prior)>=8?` The last-five scoring pace is ${one(recent)}, ${one(Math.abs(recent-prior))} ${recent>prior?'higher':'lower'} than the five before it.`:'';
  const playoff=Number(w)>=14?` This is ${t.week_classification?.round||'the playoffs'}, so there is no harmless version of a bad lineup decision now.`:Number(c.games_until_playoffs)<=6?` Week 14 starts the playoffs, which makes the current seed line more than decorative.`:'';
  return `${t.team_name} is ${record}${rank?', '+ordinal(rank)+' of '+size:''}.${streak}${form}${playoff}`;
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
  if(!v||!Number.isFinite(Number(v.delta)))return `${t.team_name}'s Value Watch is deliberately quiet this week. There is not yet a valid pair of team-value observations to support a real movement claim, so the market section will wait rather than decorate an empty sample with fake precision.`;
  const d=Number(v.delta),period=v.period==='7D'?'seven days':'the available tracking window';
  return `${t.team_name}'s market value moved ${d>=0?'up':'down'} by ${Math.abs(d).toLocaleString()} points over ${period}, from ${Number(v.baseline_value||0).toLocaleString()} to ${Number(v.value||0).toLocaleString()}. That is not a win or a loss, but it is useful evidence about how the league’s valuation picture is changing around the results.`;
}

function sentimentNarrative(t,s){
  const delta=s.change==null?'':` Compared with last week, the mood is ${s.change>=0?'warmer':'colder'} without pretending one Sunday erased everything that came before.`;
  return `${t.team_name}'s fan base currently lands in “${s.title}” territory. ${s.scene} That reaction is being carried by the manager’s recent results, roster-value direction, transaction history and longer résumé rather than this week alone.${delta}`;
}

function personnelNarrative(t,w){
  const a=t.next_week_availability||{};
  if(a.fantasy_season_complete||Number(w)>=17)return `There is no Week 18 fantasy matchup to preview. The Super Bowl closes the Fleeced! in-season calendar, so the roster-pressure file ends here.`;
  const byes=a.bye_current_starters||[],inj=a.injury_current_starters||[];
  if(!a.schedule_verified&&!inj.length)return `${t.team_name}'s next-week availability file is too thin to support a confident roster warning. The NFL schedule was not verified and Sleeper has no current-starter injury designation worth publishing, so there is nothing responsible to dramatize yet.`;
  let s=a.schedule_verified?(byes.length?`${t.team_name} has ${byes.length} current starter${byes.length===1?'':'s'} on a verified NFL bye next week.`:`${t.team_name} has no verified current-starter byes next week.`):`${t.team_name}'s bye claims are being withheld because the schedule lookup was not verified.`;
  if(inj.length)s+=` Sleeper also has ${inj.length} current starter${inj.length===1?'':'s'} carrying an injury or status designation, which makes depth a real roster question before lineups lock.`;
  else s+=` Sleeper does not currently show a publishable injury designation on a starter.`;
  return s;
}

function nextOpponentNarrative(t,w){
  const n=t.next_opponent_context,name=t.next_opponent_name||'the next opponent';
  if(!t.next_opponent_roster_id)return Number(w)>=17?`There is no next fantasy opponent after the Super Bowl.`:`Sleeper has not supplied the next opponent yet, so no matchup will be invented.`;
  const rec=n?.record?`${n.record.wins||0}-${n.record.losses||0}${Number(n.record.ties)?'-'+n.record.ties:''}`:'record unavailable';
  const nr=nextRound(Number(w)+1,t.conference),round=nr?` in the ${nr}`:'';
  return `${name} is next${round}, carrying a ${rec} record${n?.standings_rank?', currently '+ordinal(n.standings_rank)+' in the league':''}. The job this week is not to chase the last box score; it is to decide which parts of this performance deserve to travel.`;
}

function buildSections(t,w,r,facts,sentiment){
  const g=gameFacts(t),star=playerProse(g.top),second=playerProse(g.second),low=playerProse(g.low),bench=playerProse(g.bench);
  const season=seasonNarrative(t,w),tx=transactionNarrative(t,facts),value=valueNarrative(t),fans=sentimentNarrative(t,sentiment),personnel=personnelNarrative(t,w),next=nextOpponentNarrative(t,w),trend=trendProse(g.top);
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
    {heading:'Value Watch',kind:'value',paragraphs:[
      `${value} This is a market story, not a standings story, and the difference matters. Value movement belongs in the notebook because it can show perception changing before the record catches up.`,
      `The useful comparison is never “value equals truth.” It is whether the market’s direction agrees with what we are seeing in usage, production and roster construction. When those disagree, that tension is part of the story rather than something to smooth over.`
    ]},
    {heading:'The Mood Around Town',kind:'sentiment',paragraphs:[
      `${fans} The useful thing about a fan base is that it remembers. One bad week does not erase a championship résumé, and one good week does not grant lifetime immunity to a manager who has spent a month lighting matches near the depth chart.`,
      `That memory is why the crowd can be happy after an imperfect win or merely irritated after one ugly loss by a proven manager. The temperature changes, but reputation should move more slowly than a scoreboard.`
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
      `${star} That is the player-level result I care about most because the fantasy number has a real football stat line sitting underneath it. ${trend||'For now, it is a strong data point rather than a trend; the spreadsheet is capable of waiting even if the group chat is not.'}`,
      `${second} At the other end, ${low} The shape of the lineup matters more than a highlight reel. Sustainable teams usually win because the middle of the roster is useful, not because one superstar is asked to perform weekly emergency surgery.`
    ]},
    {heading:'Process Review',kind:'management',paragraphs:[
      `${tx} I am less interested in whether a move looked clever on Tuesday than whether it attacked an actual weakness. Waiver activity is only strategy when it changes the set of decisions available on Sunday.`,
      g.bench&&g.worst&&g.benchGap>=5?`${bench} It is fair to compare that with the starter who occupied the weaker slot: ${low} The gap is notable, but hindsight does not automatically make the original choice irrational. If the same selection pattern repeats with the same evidence, then we have a process problem.`:`The bench did not contain a single obvious answer that would have rewritten the matchup. That is inconvenient for anyone looking for one manager decision to blame, but it is better analysis than manufacturing a culprit.`
    ]},
    {heading:'Value Watch',kind:'value',paragraphs:[
      `${value} Market value is not truth, but it is a useful second opinion. When results, player usage and roster value all move in the same direction, the signal gets harder to dismiss.`,
      `I care less about a single value change than about whether the move is consistent with usage and production. If the market runs ahead of the football evidence, that is hype; if the football evidence runs ahead of the market, that is where an interesting buying argument starts.`
    ]},
    {heading:'Market, Memory and the Crowd',kind:'sentiment',paragraphs:[
      `${fans} That is why this section carries forward from week to week. Reputation should behave like a moving average, not a panic button; good managers earn a buffer, and prolonged bad process eventually burns through it.`,
      `Fan confidence is a slower variable than Sunday scoring. A good manager earns room for a bad week, while a long run of bad choices eventually makes even a lucky win feel temporary.`
    ]},
    {heading:'Next Week’s Test',kind:'outlook',paragraphs:[
      `${personnel} Bye weeks and injury designations are constraints, not excuses. They change the available decision tree, which is exactly why depth should be evaluated before kickoff instead of after a zero appears in the lineup.`,
      `${next} If this week exposed a repeatable strength, use it again. If it exposed a dependency, fix it before the next opponent notices. The numbers are not asking for panic; they are asking management to read them correctly.`
    ]}
  ];

  if(r.id==='mack-hollis')return[
    {heading:'The Back Page Has Feelings',kind:'lede',paragraphs:[
      `${t.team_name} ${won?'won':'lost'} ${g.score}, which means the newsroom is currently operating at the emotionally responsible level of ${won?'“somebody find a parade permit”':'“who authorized this nonsense?”'} The margin was ${margin} points. That is the boring fact. The fun part is deciding which parts of the performance deserve enormous type and which parts should be hidden behind a classified ad.`,
      `${season} I am aware that grown adults are supposed to respect sample size. I also work for a fictional tabloid inside a fantasy league, so everybody should lower their expectations accordingly. We will celebrate or complain loudly; we will simply do it with the box score attached.`
    ]},
    {heading:'Who Gets the Giant Photo',kind:'players',paragraphs:[
      `${star} That is front-page material because the fantasy points came with a real NFL performance rather than a decorative number floating in space. ${trend||'It is too early to call it a heater, but nobody said we had to whisper while waiting for more evidence.'}`,
      `${second} Not everybody gets confetti. ${low} That is not a public execution; it is just the part of the story where the band gets quieter and the coaching staff suddenly develops an interest in “cleaning things up.”`
    ]},
    {heading:'Management, Please Report to the Principal’s Office',kind:'management',paragraphs:[
      `${tx} I support aggressive management right up until the exact moment it becomes random button pressing, so the standard here is simple: did the moves make the roster better at the places that mattered?`,
      g.bench&&g.worst&&g.benchGap>=5?`${bench} Meanwhile, the starting lineup carried ${g.worst.name} instead. ${low} That is the kind of hindsight gap that gets a caller on sports radio to say “I knew it all week” despite there being no witnesses.`:`There was no bench-versus-starter catastrophe large enough to put on a sandwich board outside the front office. Management may enjoy this temporary amnesty. It expires at the next lineup lock.`
    ]},
    {heading:'Value Watch, Presented With Unnecessary Drama',kind:'value',paragraphs:[
      `${value} If the market eventually agrees with the crowd, terrific. If it does not, we get several more weeks of arguments, which is excellent for circulation and terrible for everyone's blood pressure.`,
      `A value chart is basically sports radio with decimals: useful, emotional and occasionally convinced it has solved the future. We will use it as evidence and still reserve the right to laugh at it when the actual football refuses to cooperate.`
    ]},
    {heading:'What the Fans Are Yelling',kind:'sentiment',paragraphs:[
      `${fans} The important word there is “running.” Fans are allowed to be ridiculous; the newspaper is supposed to remember whether the manager has actually earned love, suspicion or a ceremonial banishment from city brunch.`,
      `The crowd is not required to be fair every Sunday. This newspaper is required to remember why it was cheering or booing before Sunday arrived, which is how a reputation survives one weird box score.`
    ]},
    {heading:'Tomorrow’s Problem',kind:'outlook',paragraphs:[
      `${personnel} This is where jokes about depth charts stop being jokes. If a starter is unavailable, somebody else has to become a real person in the lineup, preferably before Sunday afternoon.`,
      `${next} ${won?'Enjoy the screenshot tonight and send one tasteful message to a rival.':'Complain tonight, make it funny tomorrow, and do not let the same mistake become next week’s headline.'} The back page gets another edition either way, and we have plenty of ink left.`
    ]}
  ];

  return[
    {heading:'The Week’s Evidence',kind:'lede',paragraphs:[
      `${t.team_name} ${won?'won':'lost'} ${g.score}, and the file begins with the ${margin}-point margin rather than a theory about character. ${g.projDelta==null?'There is no reliable projection comparison in evidence.':`The lineup finished ${Math.abs(g.projDelta).toFixed(1)} points ${g.projDelta>=0?'above':'below'} projection.`} The result is real. Motive, intent and sweeping conclusions remain under investigation.`,
      `${season} This desk distrusts single-game certainty on principle, which is useful because fantasy managers produce it in industrial quantities. We can still identify what changed the game without pretending one week resolved the entire case.`
    ]},
    {heading:'Witnesses for the Record',kind:'players',paragraphs:[
      `${star} That is our primary witness because the fantasy return is supported by a specific NFL stat line. ${trend||'There is not enough multi-game testimony yet to call it a trend, so the witness is excused until the sample gets larger.'}`,
      `${second} The weaker testimony came from the other end of the lineup: ${low} One soft line is not fraud. Repeated soft lines in the same roster slot eventually become an organizational document.`
    ]},
    {heading:'Front Office Paper Trail',kind:'management',paragraphs:[
      `${tx} Transactions are useful because they show what management believed before the result arrived. That makes them better evidence than a Monday explanation delivered after everyone has seen the score.`,
      g.bench&&g.worst&&g.benchGap>=5?`${bench} The lineup card instead carried ${g.worst.name}. ${low} I am not indicting anyone over one hindsight gap, but the discrepancy is now in the file and will be compared with the next decision of the same kind.`:`There is no obvious bench mistake large enough to support a clean negligence theory this week. That may disappoint the prosecution, but accuracy outranks entertainment even in this building.`
    ]},
    {heading:'Value History Exhibit',kind:'value',paragraphs:[
      `${value} That market movement belongs in a separate folder from wins and losses. It can corroborate a roster trend or contradict the mood, but it does not get to masquerade as a result.`,
      `The question for the file is whether value movement supports the football evidence or merely reflects a market theory that has not reached the field yet. Either answer is useful, provided nobody confuses it with a verdict.`
    ]},
    {heading:'Public Sentiment File',kind:'sentiment',paragraphs:[
      `${fans} The crowd is emotional evidence, not objective evidence, but it is still part of the story. A manager’s reputation is built from a chain of weeks, trades and roster decisions, which is why one verdict does not overturn the whole record.`,
      `Public opinion belongs in the file because it has memory. The same loss means something different for a manager with years of winning than it does for one whose last month already had the crowd measuring the city limits.`
    ]},
    {heading:'Open Questions for Next Week',kind:'outlook',paragraphs:[
      `${personnel} Roster pressure is where prior decisions become visible. Depth that looked excessive in August becomes useful the moment a bye or injury designation removes a starter from the board.`,
      `${next} The file remains open. The cleanest way for management to answer this week’s questions is not with a quote, a trade announcement or a motivational slogan. It is with a lineup next week that makes the evidence less interesting.`
    ]}
  ];
}

export function buildNarrativeArticle({team,week,reporter,facts,sentiment,teamClassification,aside}){
  const sections=buildSections(team,week,reporter,facts,sentiment);
  const paragraphs=sections.flatMap(s=>s.paragraphs||[]);
  return{
    schema_version:7,
    inquirer_version:17,
    season:Number(teamClassification?.season||2026),
    week:Number(week),
    week_classification:teamClassification,
    fan_sentiment:sentiment,
    roster_id:String(team.roster_id),
    reporter:{id:reporter.id,name:reporter.name,title:reporter.title,desk:reporter.desk,voice:reporter.voice,signature:reporter.signature},
    headline:narrativeHeadline(team,week,reporter),
    byline:'By '+reporter.name+', '+reporter.title,
    deck:reporter.desk+' • '+reporter.signature+' • '+teamClassification.label,
    sections,
    paragraphs,
    aside,
    generated_from:'Sleeper completed matchup, season-to-date matchup history, opponent context, standings, projections, lineup decisions, transactions, roster/player metadata, weekly real-life stats, canonical team Value History, verified NFL schedule, and Sleeper injury designations',
    real_stats_source:'Sleeper weekly stats',
    facts:{
      team_points:Number(team.points),
      opponent_points:Number(team.opponent_points),
      projected:Number(team.projected),
      league_context:team.league_context||null,
      opponent_context:team.opponent_context||null,
      next_opponent_context:team.next_opponent_context||null,
      value_history_week:team.value_history_week||null,
      next_week_availability:team.next_week_availability||null,
      fan_sentiment:sentiment,
      manager_career:team.manager_career||null,
      conference:team.conference||null,
      division_name:team.division_name||null,
      starter_details:team.starter_details||[],
      best_bench:team.best_bench||null,
      worst_starter:team.worst_starter||null
    }
  };
}
