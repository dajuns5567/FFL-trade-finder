from pathlib import Path
import re

gen_path=Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
test_path=Path('scripts/inquirer-week2-voice-r15-smoke.mjs')
workflow_path=Path('.github/workflows/week2-editorial-r18-one-shot.yml')
self_path=Path('scripts/week2-editorial-r18-patch.py')

src=gen_path.read_text()

def one_replace(text, old, new, label):
    n=text.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    return text.replace(old,new,1)

src=one_replace(src,'export const WEEK2_EDITORIAL_REVISION=17;','export const WEEK2_EDITORIAL_REVISION=18;','revision')
src=src.replace("'week2-r17'","'week2-r18'")

team_block=r'''function teamJokeR18(t,id,kind,p,index){
 const tm=String(t?.team_name||'This team'),seed=key(t)+'|r18-joke|'+id+'|'+kind+'|'+index+'|'+String(p||'').slice(0,90);
 const text=String(p||'');
 let context='general';
 if(/\b(?:bench|lineup|start(?:er)?|management)\b/i.test(text))context='management';
 else if(/\b(?:value|market|valuation)\b/i.test(text))context='value';
 else if(/\b(?:Week 3|next opponent|projected|projection|forecast)\b/i.test(text))context='outlook';
 else if(/\b(?:fans?|supporters?|crowd)\b/i.test(text))context='fans';
 else if(/\b(?:points?|scored|averaged|snap|receptions?|carries|sacks?)\b/i.test(text))context='player';
 const banks={
  'walter-mercer':{
   player:[
    tm+' can keep the good number. I have spent too many Sundays watching bad ones breed in pairs.',
    'A useful Sunday buys applause. It does not buy a pension, and I have the complaint forms ready for next week.',
    'If '+tm+' wants me cheerful, producing more of this is a remarkably efficient bribe.'
   ],
   management:[
    'Leaving useful points on the bench is a fine hobby for anyone trying to make Monday morning unbearable.',
    'Management is welcome to prove me wrong. I have kept the chair warm for decades.',
    'I have seen cheaper ways to create regret than a bad lineup decision, but apparently '+tm+' prefers the premium package.'
   ],
   value:[
    'The market can move all it wants; I have watched enough Sundays to know a price tag cannot tackle anybody.',
    'A value bump is pleasant. So is finding five dollars in an old coat, and neither one wins the next matchup.'
   ],
   outlook:[
    'I am willing to be surprised by '+tm+'. I am less willing to schedule my week around the possibility.',
    'The next opponent has my permission to make this interesting. '+tm+' has my permission to make it less aggravating.'
   ],
   fans:[
    'The fans paid with three hours of their Sunday. Complaining is included in the ticket price.',
    'Supporters are entitled to be loud. Quiet patience has produced enough disappointing sequels already.'
   ],
   general:[
    tm+' keeps giving me new reasons to inspect the blood-pressure aisle at the pharmacy.',
    'I would enjoy a calm week from '+tm+', mostly because I have forgotten what one looks like.'
   ]
  },
  'mack-hollis':{
   player:[
    'The scoreboard has no manners, which is precisely why I adore it.',
    'That stat line arrived dressed for attention. I respect the commitment to spectacle.',
    tm+' paid for talent and, for one Sunday, received the deluxe package.'
   ],
   management:[
    'A bench mistake this visible deserves entrance music and a spotlight.',
    'If management insists on drama, the league should at least charge admission.',
    tm+' has discovered the glamorous art of making one lineup decision feel unnecessarily expensive.'
   ],
   value:[
    'The market is flirting again. I recommend enjoying the attention without naming the children.',
    'A value swing adds jewelry to the conversation. Sunday still decides whether it is tasteful.'
   ],
   outlook:[
    tm+' has the confidence of a tuxedo at a tailgate. The next Sunday decides whether that is charming or ridiculous.',
    'The projection has arrived in formalwear. I will wait to see whether the football remembers its shoes.'
   ],
   fans:[
    'Fans came for football and accidentally received theater. At least the concessions were optional.',
    'The crowd has chosen emotional excess. Finally, some sensible decision-making around here.'
   ],
   general:[
    tm+' keeps turning ordinary fantasy football into dinner theater, and I refuse to complain about the entertainment value.',
    'Subtlety has left the building. Good. It was taking up a perfectly useful seat.'
   ]
  },
  'nora-voss':{
   player:[
    'The scoreboard has already completed the argument. Management can stop submitting amendments.',
    'That number is useful enough to spare us another motivational speech, which is a public service.',
    'The player did the job. Management may celebrate quietly and resist the urge to turn one Sunday into a documentary.'
   ],
   management:[
    'Management had several options and somehow selected the one that makes Monday require a diagram.',
    'That bench gap is large enough to stop being a footnote and start charging rent.',
    'If '+tm+' wants fewer questions, the cheapest solution is to stop creating such obvious ones.'
   ],
   value:[
    'The market moved. Fine. The scoreboard still gets the final vote.',
    'A value change is useful information and a terrible substitute for winning, which should save us a meeting.'
   ],
   outlook:[
    'The projection is hanging over Sunday like a very expensive dare.',
    'The roster can keep experimenting. Rivals are under no obligation to stop laughing while it does.'
   ],
   fans:[
    'Fans have already located the obvious mistake. Management does not need a committee to find it again.',
    'Supporters are being asked for patience. They have countered with pointing at the scoreboard.'
   ],
   general:[
    tm+' has enough moving parts to keep management busy and enough witnesses to make excuses inconvenient.',
    'The next bad decision will arrive with precedent, which is an awkward accessory for management.'
   ]
  }
 };
 const rows=banks[id];
 if(!rows)return'';
 return pick(rows[context]||rows.general,seed);
}

function cleanTeamR18(t,id,p){
 const tm=String(t?.team_name||'This team');
 let x=String(p||'').trim();
 if(!x)return'';
 x=x
  .replace(/I would like a second receipt before calling it durable\./gi,'I would like to see it again before calling it durable.')
  .replace(/points worth of evidence that at least one part of Sunday worked exactly as intended\./gi,'points and gave supporters one part of Sunday worth enjoying.')
  .replace(/The emotional verdict is appropriately excessive:/gi,'The emotional response is appropriately excessive:')
  .replace(/The Week 3 benchmark starts with/gi,'The Week 3 assignment starts with')
  .replace(/That is not genius; it is reading the last box score\./gi,'Reading the last box score should be the minimum qualification for this job.')
  .replace(/That is not nitpicking; that is a scoreboard-backed reason to holler/gi,'That is a scoreboard-backed reason to holler')
  .replace(/That is not the whole loss, but/gi,'It did not cause the whole loss, but')
  .replace(/\breceipts?\b/gi,'repeat performance')
  .replace(/\bevidence\b/gi,'result')
  .replace(/\bverdict\b/gi,'reaction');
 if(id==='nora-voss'){
  x=x
   .replace(/There is enough information on ([^.!?]+) to move beyond first impressions\./gi,'$1 has used up the “too early to tell” coupon.')
   .replace(/Strong result, good contribution, still only one completed Sunday\./gi,'Good Sunday. I am withholding the parade permit until it happens twice.')
   .replace(/The production actually changed the matchup\./gi,'The points were useful enough that even management could not misplace them.')
   .replace(/That is enough movement to track without pretending it settles the roster’s quality\./gi,'The market moved. Fine. The scoreboard still gets the final vote.')
   .replace(/That part is not debatable\./gi,'Anyone arguing otherwise can spend Monday alone.')
   .replace(/That is the standard the actual result will be measured against\./gi,'That projection is hanging over Sunday like a very expensive dare.')
   .replace(/The designation matters because it may force ([^.!?]+)\./gi,'The designation may force $1.')
   .replace(/That sequence matters, but only after the current weaknesses get a response\./gi,'Handle the current weakness first; the rest of the schedule can wait.')
   .replace(/The prior baseline was already strong, so this is confirmation rather than discovery\./gi,'Nobody discovered fire here; the player did the job the track record already advertised.')
   .replace(/The next lineup should reflect that information instead of treating it as trivia\./gi,'Put the better scorer in the lineup and save trivia night for Thursday.')
   .replace(/The decline is obvious and does not need embellishment\./gi,'The decline is obvious. I will save the embellishment for something less depressing.')
   .replace(/Fans have enough information to be precise now\./gi,'Fans already know exactly which mistake they are booing.')
   .replace(/Management already knows what Week 2 exposed; now the lineup has to change accordingly\./gi,'Management saw the same Sunday everybody else did. The lineup should act like it.')
   .replace(/The concern around ([^.!?]+) is specific:/gi,'The problem with $1 is plain:');
 }
 return x;
}

function sharpenTeamParagraph(t,id,kind,p,index){
 let x=cleanTeamR18(t,id,p);
 if(!x)return'';
 if(id==='tess-delaney')return x;
 const jokeSlots=(kind==='players'&&(index===1||index===5||index===9))||
  (kind==='management'&&index===0)||(kind==='sentiment'&&index===1)||(kind==='outlook'&&index===1);
 if(!jokeSlots)return x;
 const joke=teamJokeR18(t,id,kind,x,index);
 if(joke&&!x.includes(joke))x=(x+' '+joke).trim();
 return x;
}'''

pat=re.compile(r"function sharpenTeamParagraph\(t,id,kind,p,index\)\{.*?\n\}\n\nfunction sharpenRecapParagraph",re.S)
m=pat.search(src)
if not m:
    raise SystemExit('team sharpener block not found')
src=src[:m.start()]+team_block+'\n\nfunction sharpenRecapParagraph'+src[m.end():]

recap_helpers=r'''function recapJokeR18(id,p,index){
 const text=String(p||''),seed='recap-r18|'+id+'|'+index+'|'+text.slice(0,100);
 let context='general';
 if(/\b(?:bench|lineup|start-sit|manager|management)\b/i.test(text))context='management';
 else if(/\b(?:value|market|roster-value)\b/i.test(text))context='value';
 else if(/\b(?:trade|received|pick)\b/i.test(text))context='trade';
 else if(/\b(?:projected|projection|Week 3)\b/i.test(text))context='outlook';
 else if(/\b(?:2-0|0-2|standings|record)\b/i.test(text))context='standings';
 const banks={
  'walter-mercer':{
   management:['A manager can survive one bad lineup call. Repeating it is how you get your own chair at the complaint desk.','Bench points have a wonderful talent for becoming twice as large on Monday morning.'],
   value:['The market may be excited. I have met excited markets before; none of them could set a lineup.','A value swing is interesting right up until kickoff makes it irrelevant.'],
   trade:['Every trade looks clever when the paperwork is fresh. Sunday eventually reads the fine print.','A manager who wins the trade and loses the week still has an inconvenient scoreboard to explain.'],
   outlook:['Projections are useful until football begins behaving like football again.','I have no objection to a favorite. I object when the favorite starts believing the brochure.'],
   standings:['September standings are young enough to be reckless and old enough to start arguments. Perfect.','Two wins buy confidence. Two losses buy unsolicited advice from everybody with a pulse.'],
   general:['I have watched enough fantasy football to know dignity is usually the first roster casualty.','The league remains undefeated at turning a normal Sunday into a week-long grievance.']
  },
  'tess-delaney':{
   management:['A bench mistake this visible deserves tomatoes, preferably thrown with accuracy.','Management has produced drama without even charging us for orchestra seats.'],
   value:['The market is flirting shamelessly again. I approve of the energy and distrust the commitment.','Value moved, everyone gasped, and Sunday remained wonderfully unimpressed.'],
   trade:['A trade should improve the roster or at least improve the gossip. Anything less is poor hospitality.','The deal has entered its glamorous phase: everybody is certain they won and nobody has played the next game yet.'],
   outlook:['A projection this confident is practically begging football to spill a drink on it.','Week 3 has arrived wearing expectations like jewelry. I hope somebody loses an earring.'],
   standings:['The unbeaten teams may strut. The winless teams may sulk. The rest are pretending 1-1 is mysterious.','September has given everyone just enough information to become irresponsibly confident. Delicious.'],
   general:['The league keeps offering beauty and stupidity on the same plate. I continue to order seconds.','Subtlety had its chance. The standings chose theater.']
  },
  'mack-hollis':{
   management:['One lineup mistake can be forgiven. Two starts looking like a touring production.','Management wanted suspense and accidentally cast itself as the villain.'],
   value:['The market has put on a tuxedo for numbers that still have to survive Sunday.','A roster-value swing is financial theater with shoulder pads waiting backstage.'],
   trade:['Every trade is a love story until one side checks the box score.','The deal has all the confidence of opening night and none of the reviews yet.'],
   outlook:['The projection has entered with a spotlight. Football is already reaching for the dimmer switch.','Week 3 has the manners of an encore: everybody expects more and somebody will forget the lyrics.'],
   standings:['The standings are young, loud and overdressed. I could not be happier.','A 2-0 team walks differently in September. An 0-2 team checks the exits.'],
   general:['This league has once again mistaken restraint for a character flaw. Splendid.','Fantasy football remains theater for people who insist they are simply “checking scores.”']
  },
  'nora-voss':{
   management:['Management had all week to avoid that lineup mistake. Monday has now been assigned to explaining it.','A bench gap that large should come with rent and a forwarding address.'],
   value:['The market moved. Nobody on the roster learned to tackle because of it.','Value is useful context. The scoreboard remains aggressively uninterested.'],
   trade:['The trade can keep its victory lap until the players provide transportation.','Managers love declaring a trade won early. Sunday enjoys collecting those declarations.'],
   outlook:['The projection is confident enough to become embarrassing if the favorite trips.','Week 3 has been given expectations. Management has been given nowhere convenient to hide them.'],
   standings:['Two weeks is plenty of time for confidence to become annoying. The league is right on schedule.','The standings are early. The bragging is not.'],
   general:['Several managers have requested patience. The scoreboard has declined to participate.','The league keeps generating obvious problems and then acting surprised when fans notice them.']
  }
 };
 const rows=(banks[id]||{})[context]||(banks[id]||{}).general||[];
 return rows.length?pick(rows,seed):'';
}

function cleanRecapR18(p){
 let x=String(p||'').trim();
 if(!x)return'';
 return x
  .replace(/Rivals may file complaints with the usual department: nowhere\./gi,'Rivals may complain all week. Nobody has to listen.')
  .replace(/The record file now contains/gi,'The standings now contain')
  .replace(/every bench mistake becomes a crime scene/gi,'every bench mistake becomes a public embarrassment')
  .replace(/That matters because it was not random league-wide noise; it was one bad decision with a price everybody could see\./gi,'Everybody saw the bad decision and its price. Pittsburgh can skip the philosophical defense.')
  .replace(/That tells us how little a league-wide average can explain when individual lineups are moving in opposite directions\./gi,'League-wide averages can sit this one out; those lineups were headed in opposite directions.')
  .replace(/That is not a subtle difference; that is two completely different Sundays wearing the same league logo\./gi,'Those were two completely different Sundays wearing the same league logo.')
  .replace(/That is not a answer; it is the next ugly answer most likely to become uncomfortable if the favorite fails\./gi,'That 90.8-point projection is begging the favorite to make things awkward.')
  .replace(/the obvious conclusion is not that the league has settled\. It is that the next set of results now has expectations to justify or embarrass\./gi,'The league has plenty left unsettled, and the next results now have expectations to justify or embarrass.')
  .replace(/The response was big enough to change what Week 3 can reasonably expect\./gi,'A jump that large earns Miami a much louder Week 3.')
  .replace(/That is the real Week 2 shape:/gi,'Week 2 left us with this:')
  .replace(/\brecord file\b/gi,'standings')
  .replace(/\bfile complaints\b/gi,'complain')
  .replace(/\bcrime scene\b/gi,'public embarrassment')
  .replace(/\bevidence\b/gi,'football')
  .replace(/\bverdict\b/gi,'reaction')
  .replace(/\bexhibits?\b/gi,'examples')
  .replace(/\bcase files?\b/gi,'problems')
  .replace(/\bfolders?\b/gi,'problems')
  .replace(/\breceipts?\b/gi,'memory');
}

function dedupeRecapSentencesR18(sections){
 const seen=new Set();
 return (sections||[]).map(s=>{
  const paragraphs=(s?.paragraphs||[]).map(p=>{
   const kept=[];
   for(const sentence of sentenceParts(p)){
    const k=sentence.replace(/\s+/g,' ').trim().toLowerCase();
    if(k.split(/\s+/).length>=8){
     if(seen.has(k))continue;
     seen.add(k);
    }
    kept.push(sentence);
   }
   return kept.join(' ').trim();
  }).filter(Boolean);
  return{...s,paragraphs};
 });
}'''

recap_pat=re.compile(r"function sharpenRecapParagraph\(id,p,index\)\{.*?\n\}\n\nfunction reviseTeam\(t\)\{",re.S)
rm=recap_pat.search(src)
if not rm:
    raise SystemExit('recap sharpener block not found')
new_recap_func=r'''function sharpenRecapParagraph(id,p,index){
 let x=cleanRecapR18(p);
 if(!x)return'';
 if(index===1||index===4){
  const joke=recapJokeR18(id,x,index);
  if(joke&&!x.includes(joke))x=(x+' '+joke).trim();
 }
 return x;
}'''
src=src[:rm.start()]+recap_helpers+'\n\n'+new_recap_func+'\n\nfunction reviseTeam(t){'+src[rm.end():]

hook=""" o.sections=(o.sections||[]).map((s,i)=>{
  const id=String(s?.reporter?.id||''),seed='recap|'+id+'|'+i;
  const chosen=chooseRecap(s.paragraphs,id);
  const core=id==='walter-mercer'?[...chosen.slice(0,5),...categoryLines]:chosen;
  const depth=recapDepthLine(id,teams),expansion=recapDeskExpansion(id,teams),
   developedDepth=[depth,expansion].filter(Boolean).join(' ');
  const paragraphs=uniq([...core,developedDepth,recapReaction(id,seed,0),recapReaction(id,seed,1)]).map((p,j)=>sharpenRecapParagraph(id,p,j)).filter(Boolean).slice(0,10);
  return{...s,paragraphs};
 });"""
if hook not in src:
    raise SystemExit('overview section hook not found')
src=src.replace(hook,hook+'\n o.sections=dedupeRecapSentencesR18(o.sections);',1)

gen_path.write_text(src)

test=test_path.read_text()
test=test.replace('Number(WEEK2_EDITORIAL_REVISION),17','Number(WEEK2_EDITORIAL_REVISION),18')
test=test.replace('Number(revised?.editorial_revision),17','Number(revised?.editorial_revision),18')
test=test.replace("revised?.voice_revision,'week2-r17'","revised?.voice_revision,'week2-r18'")
test=test.replace('Number(t?.inquirer_article?.editorial_revision),17','Number(t?.inquirer_article?.editorial_revision),18')
test=test.replace("t?.inquirer_article?.voice_revision,'week2-r17'","t?.inquirer_article?.voice_revision,'week2-r18'")
test=test.replace('Number(overview.editorial_revision),17','Number(overview.editorial_revision),18')
test=test.replace("overview.voice_revision,'week2-r17'","overview.voice_revision,'week2-r18'")

test=test.replace(
 "const EDITORIAL_META_RE=/\\b(?:headline|story|paragraph|editor|narrative|graphic|typeface|print|column|publication|writing|write|written)\\b/i;",
 "const EDITORIAL_META_RE=/\\b(?:headline|story|paragraph|editor|narrative|graphic|typeface|print|column|publication|writing|write|written|evidence|verdict|receipt|record file|crime scene|file complaints)\\b/i;\nconst SELF_EXPLAIN_RE=/\\b(?:strong result, good contribution, still only one completed Sunday|the production actually changed the matchup|there is enough information .* move beyond first impressions|that is enough movement to track|the standard the actual result will be measured against)\\b/i;\nconst CONTRAST_CRUTCH_RE=/\\b(?:that|this|it)\\s+(?:is|was)\\s+not\\b[^.!?]{0,90}(?:;|,)\\s*(?:it|that)\\s+(?:is|was)\\b/i;\nconst HUMOR_R18_RE=/\\b(?:joke|laugh|laughing|mock|ridicul|tomatoes|champagne|soup with a fork|parking ticket|warning label|blood-pressure|pharmacy|entrance music|spotlight|theater|tuxedo|tailgate|parade permit|documentary|charging rent|rent|dare|admission|bribe|complaint desk|grievance|obituary|hostage negotiation|shoulder pads|arithmetic|neighbors|fishing|swagger|heckling|villain|brochure|jewelry|drama|public embarrassment)\\b/i;"
)

anchor=" const id=String(t?.inquirer_article?.reporter?.id||'');\n reporterCounts.set(id,(reporterCounts.get(id)||0)+1);"
extra=""" const id=String(t?.inquirer_article?.reporter?.id||'');
 if(id==='nora-voss')assert(!SELF_EXPLAIN_RE.test(text),'Jefferson still contains self-explanatory analysis prose for '+t.team_name);
 const contrastCount=sentences.filter(s=>CONTRAST_CRUTCH_RE.test(s)).length;
 assert(contrastCount<=2,'The not-X/it-is-Y contrast crutch is still overused for '+t.team_name+': '+contrastCount);
 if(id!=='tess-delaney')assert(sentences.filter(s=>HUMOR_R18_RE.test(s)).length>=4,'Non-Tilly reporter still lacks enough real joke/punchline sentences for '+t.team_name);
 reporterCounts.set(id,(reporterCounts.get(id)||0)+1);"""
if anchor not in test:
    raise SystemExit('team test anchor not found')
test=test.replace(anchor,extra,1)

old_recap_assert="assert(!/\\b(?:headline|back page|copy desk|newsroom|publication|typeface|evidence|verdict|exhibits?|case files?|folders?|receipts?|screenshots?|group chats?|rival chats?|rival threads?|memes?|apps?)\\b/i.test(overviewText),'Weekly recap still leans on newsroom/file/tech crutches');"
new_recap_assert="assert(!/\\b(?:headline|back page|copy desk|newsroom|publication|typeface|evidence|verdict|exhibits?|case files?|folders?|receipts?|record file|crime scene|file complaints|screenshots?|group chats?|rival chats?|rival threads?|memes?|apps?)\\b/i.test(overviewText),'Weekly recap still leans on newsroom/file/tech crutches');\nconst overviewSentences=sentenceParts(overviewText).filter(s=>wordCount(s)>=8);\nconst overviewSeen=new Set(),overviewDupes=[];\nfor(const s of overviewSentences){const k=s.replace(/\\s+/g,' ').trim().toLowerCase();if(overviewSeen.has(k))overviewDupes.push(s);else overviewSeen.add(k);}\nassert.deepEqual(overviewDupes,[],'Weekly recap still repeats exact commentary sentences');\nassert(sentenceParts(overviewText).filter(s=>HUMOR_R18_RE.test(s)).length>=8,'Weekly recap still lacks enough real jokes/sarcastic punchlines');"
if old_recap_assert not in test:
    raise SystemExit('recap meta assertion not found')
test=test.replace(old_recap_assert,new_recap_assert,1)

loop_anchor=" assert(VOICE_RE.test(copy),'Weekly recap reporter section lacks explicit voice: '+id);\n assert(sections.flatMap(s=>s?.paragraphs||[]).length<=10,'Weekly recap reporter section is overstuffed: '+id);"
loop_new=" assert(VOICE_RE.test(copy),'Weekly recap reporter section lacks explicit voice: '+id);\n assert(sentenceParts(copy).filter(s=>HUMOR_R18_RE.test(s)).length>=2,'Weekly recap reporter section lacks real joke/punchline density: '+id);\n assert(sections.flatMap(s=>s?.paragraphs||[]).length<=10,'Weekly recap reporter section is overstuffed: '+id);"
if loop_anchor not in test:
    raise SystemExit('recap reporter loop anchor not found')
test=test.replace(loop_anchor,loop_new,1)

test_path.write_text(test)

workflow_path.unlink(missing_ok=True)
self_path.unlink(missing_ok=True)
