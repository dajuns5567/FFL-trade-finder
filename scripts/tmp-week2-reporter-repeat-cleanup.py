from pathlib import Path

p=Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
s=p.read_text()

# 1) Value-mover reactions: replace one fixed punchline per reporter with rotating, reporter-specific reactions.
bv=s.index('function buildValue(t,id){')
riser=s.index(' if(riser&&Number.isFinite(Number(riser.delta))){',bv)
faller=s.index(' if(faller&&Number.isFinite(Number(faller.delta))){',riser)
new_riser=r''' if(riser&&Number.isFinite(Number(riser.delta))){
  const n=String(riser.player_name||'A player'),dv=Math.round(Number(riser.delta)),pv=Number(riser.pct),move=n+' '+({
   'walter-mercer':'gained','tess-delaney':'climbed','mack-hollis':'jumped','nora-voss':'rose'
  }[id]||'gained')+' '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. ';
  const reactions={
   'walter-mercer':[
    'One Sunday bought some optimism; I would like a second receipt before calling it durable.',
    'The number has my attention; the football still owes me confirmation.',
    'Useful rise. I am old enough to distrust anything that improves this quickly.',
    'That is progress. Keep producing and I may run out of objections, which would be inconvenient.'
   ],
   'tess-delaney':[
    'The market is smitten; it should bring evidence with the flowers.',
    'Dynasty pricing caught feelings. Adorable. Now earn the infatuation.',
    'The valuation crowd is flirting with optimism; I expect substance before commitment.',
    'A prettier price is lovely, but beauty without production is how people end up regretting Sundays.'
   ],
   'mack-hollis':[
    'That move has teeth. Keep scoring or the market can spit it back out.',
    'Real jump. Make it look smart next Sunday.',
    'The number moved fast. Good—now make the football keep up.',
    'That is actual value gained, not free applause. Earn the next bump.'
   ],
   'nora-voss':[
    'That increase changes the roster’s options, which is the useful part.',
    'The gain matters because it changes what the team can realistically buy or hold.',
    'A larger value creates flexibility; whether it lasts depends on role and production.',
    'The move is material enough to affect roster decisions, not just aesthetics.'
   ]
  };
  rows.push(move+pick(reactions[id]||reactions['walter-mercer'],seed+'|riser|'+n));
 }
'''
s=s[:riser]+new_riser+s[faller:]
# recompute faller after first replacement
faller=s.index(' if(faller&&Number.isFinite(Number(faller.delta))){',bv)
ret=s.index(' return uniq(rows).slice(0,3);',faller)
new_faller=r''' if(faller&&Number.isFinite(Number(faller.delta))){
  const n=String(faller.player_name||'A player'),dv=Math.abs(Math.round(Number(faller.delta))),pv=Number(faller.pct),move=n+' '+({
   'walter-mercer':'lost','tess-delaney':'fell','mack-hollis':'dropped','nora-voss':'declined'
  }[id]||'lost')+' '+dv+' in value'+(Number.isFinite(pv)?' ('+Math.abs(pv).toFixed(1)+'%)':'')+'. ';
  const reactions={
   'walter-mercer':[
    'Not a funeral, but enough of a loss to cancel the cheerful music.',
    'That is not fatal. It is, however, the opposite of a compliment.',
    'The market has registered a complaint. I would prefer the player answer it with points.',
    'A drop like that gets my attention faster than a motivational speech ever could.'
   ],
   'tess-delaney':[
    'The market has become judgmental; for once, I sympathize with its standards.',
    'The valuation crowd has turned cold. Cruel, perhaps, but not mysterious.',
    'That price decline is ugly enough to deserve a response in actual football.',
    'The market has withdrawn its affection with impressive speed. Earn it back.'
   ],
   'mack-hollis':[
    'That is the market saying “show me something better,” and it is not whispering.',
    'The price got punched. Score more and punch back.',
    'That drop is real. The fastest rebuttal is points, not excuses.',
    'The market took a bite out of the value. Sunday gets the chance to bite back.'
   ],
   'nora-voss':[
    'The loss is large enough to ask whether role, production or expectation changed.',
    'That decline is material; the useful question is what underlying evidence moved with it.',
    'A value loss of that size belongs in the roster decision, not in the background.',
    'The market moved down enough that role and production both deserve another look.'
   ]
  };
  rows.push(move+pick(reactions[id]||reactions['walter-mercer'],seed+'|faller|'+n));
 }
'''
s=s[:faller]+new_faller+s[ret:]

# 2) Division tails: rotate the actual commentary instead of giving every assignment the same closing sentence.
div=s.index('function divisionOutlookLine(t,id){')
tails=s.index(' const tails={',div)
retline=s.index(" return voiceShade(t,'division|'+id",tails)
new_tails=r''' const tails={
  'walter-mercer':[
   'The standings are dramatic enough without my help; I would settle for them becoming less annoying.',
   'Division math this early is mostly an invitation to overreact. I accept cautiously.',
   'September standings are young, but they are old enough to make a bad Sunday expensive.',
   'I do not trust an early table completely, but I trust it enough to dislike wasted opportunities.'
  ],
  'tess-delaney':[
   'The stakes are indecently visible already, which is exactly how I prefer my division races.',
   'The division has developed tension before October. Delicious. Somebody please make it worse.',
   'There is already enough pressure here to ruin a perfectly pleasant Sunday, which makes it worth watching.',
   'The race is crowded, petty and prematurely important. At last, September has some taste.'
  ],
  'mack-hollis':[
   'That is enough division fuel for several irresponsible predictions and at least one loud argument.',
   'The standings have given everybody a reason to yell early. Excellent use of September.',
   'One bad result can turn this race stupid in a hurry, and I mean that as a compliment.',
   'The division is close enough that nobody gets to waste a Sunday quietly.'
  ],
  'nora-voss':[
   'Those are the division facts; the useful question is which team changes them next.',
   'The table is early, but the leverage attached to the next result is already measurable.',
   'The standings do not settle anything yet; they do make the cost of another mistake easier to see.',
   'The division position is real enough to matter without pretending September has finished the argument.'
  ]
 };
 const tail=pick(tails[id]||tails['walter-mercer'],seed+'|tail');
'''
s=s[:tails]+new_tails+s[retline:]
s=s.replace("[standing,opponent,tails[id]||tails['walter-mercer']]","[standing,opponent,tail]",1)

# 3) Fan management reaction: keep the factual first sentence, rotate the reporter reaction.
sent=s.index('function sentimentLines(t,id){')
mg=s.index(' if(m&&m.reserve&&m.starter&&Number(m.gap)>0){',sent)
mg_else=s.index(' }else{',mg)
new_mg=r''' if(m&&m.reserve&&m.starter&&Number(m.gap)>0){
  const r=String(m.reserve.name),st=String(m.starter.name),gap=one(m.gap),lead={
   'walter-mercer':'Fans are staring at '+r+' beating '+st+' by '+gap+' from the bench.',
   'tess-delaney':'Benched '+r+' outscored started '+st+' by '+gap+' points.',
   'mack-hollis':r+' beat '+st+' by '+gap+' from the bench.',
   'nora-voss':'The fan criticism starts with '+r+' over '+st+' by '+gap+' points.'
  },tails={
   'walter-mercer':[
    'Winning can postpone that argument; it does not erase it.',
    'A win buys management patience, not amnesia.',
    'Fans can enjoy the result and still remember the points left sitting down.',
    'That decision gets one quieter Monday, not a pardon.'
   ],
   'tess-delaney':[
    'Supporters will bring that up with unnecessary passion and complete justification.',
    'That is the sort of choice fans can turn into a grievance with excellent posture.',
    'A bench gap like that deserves dramatic indignation, and I fully endorse it.',
    'Supporters have found a specific decision to resent. How efficient.'
   ],
   'mack-hollis':[
    'If fans want to yell about that, hand them a microphone and get out of the way.',
    'That is not nitpicking; that is a scoreboard-backed reason to holler.',
    'Fans saw the points too. Good luck convincing them not to bring it up.',
    'That choice deserves boos with the player names included.'
   ],
   'nora-voss':[
    'That complaint is grounded in a real lineup decision, not generalized anger.',
    'The criticism is specific because the missed points are specific.',
    'Supporters have a measurable lineup decision to question, which is fair.',
    'The frustration has evidence attached to it; management owns that part.'
   ]
  };
  lines.push((lead[id]||lead['walter-mercer'])+' '+pick(tails[id]||tails['walter-mercer'],seed+'|management-fan'));
'''
s=s[:mg]+new_mg+s[mg_else:]

# 4) Two near-universal player/praise lines become player-specific rather than repeated verbatim.
s=s.replace("name+' played '+now+'% of the snaps in Week 2 compared with '+before+'% last season. The role increase supports the idea that the production has structural backing.'",
            "name+' played '+now+'% of the snaps in Week 2 compared with '+before+'% last season. For '+name+', the role increase supports the idea that the production has structural backing.'")
s=s.replace("name+' played '+now+'% of snaps in Week 2 after '+before+'% last season. The reduced role is a real counterweight to the fantasy result.'",
            "name+' played '+now+'% of snaps in Week 2 after '+before+'% last season. For '+name+', the reduced role is a real counterweight to the fantasy result.'")
s=s.replace("'Credit to '+name+' for '+score+'. Sometimes the correct analysis is simply “well done,” irritating though that may be.'",
            "'Credit to '+name+' for '+score+'. For '+name+', sometimes the correct analysis is simply “well done,” irritating though that may be.'")

p.write_text(s)

# 5) Regression: no long sentence may be reused across seven or eight different team reports.
sp=Path('scripts/inquirer-week2-voice-r15-smoke.mjs')
t=sp.read_text()
marker="for(const id of ['walter-mercer','tess-delaney','mack-hollis','nora-voss'])assert((reporterCounts.get(id)||0)>0,'Reporter missing from revised Week 2: '+id);"
assert t.count(marker)==1
check=r'''

const leagueSentenceUse=new Map();
for(const team of revisedTeams){
 const reporter=String(team?.inquirer_article?.reporter?.id||'');
 for(const sentence of sentenceParts(articleText(team))){
  if(wordCount(sentence)<8)continue;
  const k=sentence.replace(/\s+/g,' ').trim().toLowerCase();
  const rows=leagueSentenceUse.get(k)||[];
  rows.push({team:String(team?.team_name||''),reporter,sentence});
  leagueSentenceUse.set(k,rows);
 }
}
const nearUniversalReporterBoilerplate=[...leagueSentenceUse.values()].filter(rows=>new Set(rows.map(x=>x.team)).size>6);
assert.deepEqual(nearUniversalReporterBoilerplate,[],'A long reporter sentence must not be reused across seven or eight different Week 2 team reports');
'''
t=t.replace(marker,marker+check)
sp.write_text(t)
