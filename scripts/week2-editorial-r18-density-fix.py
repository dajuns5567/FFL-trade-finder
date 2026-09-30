from pathlib import Path

p=Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
self_path=Path('scripts/week2-editorial-r18-density-fix.py')
s=p.read_text()
old_slots=""" const jokeSlots=(kind==='players'&&(index===1||index===5||index===9))||
  (kind==='management'&&index===0)||(kind==='sentiment'&&index===1)||(kind==='outlook'&&index===1);"""
new_slots=""" const jokeSlots=id==='walter-mercer'
  ?((kind==='players'&&(index===1||index===3))||(kind==='management'&&index===0)||(kind==='sentiment'&&index===1)||(kind==='outlook'&&index===1))
  :((kind==='players'&&index===1)||(kind==='management'&&index===0)||(kind==='sentiment'&&index===1)||(kind==='outlook'&&index===1));"""
if s.count(old_slots)!=1:
    raise SystemExit(f'joke-slot anchor expected once, found {s.count(old_slots)}')
s=s.replace(old_slots,new_slots,1)
old_joke=""" const joke=teamJokeR18(t,id,kind,x,index);
 if(joke&&!x.includes(joke))x=(x+' '+joke).trim();"""
new_joke=""" const tm=String(t?.team_name||'This team');
 const guaranteed={
  'walter-mercer':{
   'players:1':tm+' can keep the good number. The '+tm+' complaint desk is closed for this player, which may be the nicest thing I say all week.',
   'players:3':'A useful Sunday from '+tm+' buys applause and one quiet Monday. I am not promising '+tm+' gets Tuesday too.',
   'management:0':'Leaving useful points on the bench is how '+tm+' turns a lineup decision into a Monday regret with its own mailing address.',
   'sentiment:1':tm+' supporters have already paid in blood pressure; asking them for quiet patience feels greedy.',
   'outlook:1':tm+' can let the projection keep its brochure; the actual Sunday still has to be survived.'
  },
  'mack-hollis':{
   'players:1':'That '+tm+' stat line arrived with a spotlight and absolutely no interest in subtlety. I respect '+tm+' for committing to the theater.',
   'management:0':tm+' made one lineup decision feel expensive enough to deserve its own orchestra.',
   'sentiment:1':'The '+tm+' crowd has chosen emotional excess. Finally, some sensible decision-making around '+tm+'.',
   'outlook:1':'The '+tm+' projection has arrived in formalwear. Football around '+tm+' is already reaching for the dimmer switch.'
  },
  'nora-voss':{
   'players:1':'The '+tm+' scoreboard already finished this argument. '+tm+' management can stop requesting another committee meeting.',
   'management:0':tm+' made the lineup mistake obvious enough to require a diagram only if management plans to frame it.',
   'sentiment:1':tm+' supporters have located the problem. The '+tm+' scoreboard even highlighted it for management.',
   'outlook:1':'The projection is confident enough to become embarrassing if '+tm+' trips over its own lineup again.'
  }
 };
 const jokeKey=kind+':'+index;
 const reporterGuaranteed=(guaranteed[id]||{})[jokeKey];
 const joke=reporterGuaranteed||teamJokeR18(t,id,kind,x,index);
 if(joke&&!x.includes(joke))x=(x+' '+joke).trim();"""
if s.count(old_joke)!=1:
    raise SystemExit(f'guaranteed-joke anchor expected once, found {s.count(old_joke)}')
s=s.replace(old_joke,new_joke,1)
p.write_text(s)
self_path.unlink(missing_ok=True)
