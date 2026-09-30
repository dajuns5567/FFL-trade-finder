from pathlib import Path

p=Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
self_path=Path('scripts/week2-editorial-r18-density-fix.py')
s=p.read_text()
old=""" const jokeSlots=(kind==='players'&&(index===1||index===5||index===9))||
  (kind==='management'&&index===0)||(kind==='sentiment'&&index===1)||(kind==='outlook'&&index===1);"""
new=""" const jokeSlots=(kind==='players'&&(index===1||index===5||index===9))||
  (id==='walter-mercer'&&kind==='players'&&index===3)||
  (kind==='management'&&index===0)||(kind==='sentiment'&&index===1)||(kind==='outlook'&&index===1);"""
if s.count(old)!=1:
    raise SystemExit(f'Nick joke-slot anchor expected once, found {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s)
self_path.unlink(missing_ok=True)
