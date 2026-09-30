from pathlib import Path
import re

p=Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
self_path=Path('scripts/week2-editorial-r18-recap-density-fix.py')
s=p.read_text()
pat=re.compile(r"function sharpenRecapParagraph\(id,p,index\)\{.*?\n\}",re.S)
matches=list(pat.finditer(s))
if len(matches)!=1:
    raise SystemExit(f'sharpenRecapParagraph expected once, found {len(matches)}')
new=r'''function sharpenRecapParagraph(id,p,index){
 let x=cleanRecapR18(p);
 if(!x)return'';
 const guaranteed={
  'walter-mercer':{
   1:'Fantasy football has a wonderful talent for turning one quiet Sunday decision into a loud Monday.',
   4:'The projection can keep its brochure. Sunday has never read one.'
  },
  'tess-delaney':{
   1:'The league has produced enough drama for orchestra seats, and September is still young.',
   4:'Week 2 arrived wearing jewelry and throwing tomatoes. Subtlety never had a chance.'
  },
  'mack-hollis':{
   1:'The standings have entered under a spotlight, and subtlety has been escorted from the theater.',
   4:'Week 3 is already reaching for the dimmer switch. Naturally, everybody thinks the spotlight belongs to them.'
  },
  'nora-voss':{
   1:'The scoreboard has declined another committee meeting.',
   4:'A mistake this obvious should be paying rent by Monday.'
  }
 };
 const fixed=(guaranteed[id]||{})[index];
 const joke=fixed||((index===1||index===4)?recapJokeR18(id,x,index):'');
 if(joke&&!x.includes(joke))x=(x+' '+joke).trim();
 return x;
}'''
s=s[:matches[0].start()]+new+s[matches[0].end():]
p.write_text(s)
self_path.unlink(missing_ok=True)
