from pathlib import Path

p=Path('netlify/functions/inquirer-week2-editorial-r15.mjs')
self_path=Path('scripts/week2-editorial-r18-jefferson-fix.py')
s=p.read_text()
old="""   .replace(/The concern around ([^.!?]+) is specific:/gi,'The problem with $1 is plain:');"""
new="""   .replace(/The concern around ([^.!?]+) is specific:/gi,'The problem with $1 is plain:')
   .replace(/Strong production;\\s*now the role has to sustain it\\.?/gi,'Good Sunday. I am withholding the parade permit until it happens twice.')
   .replace(/The next game should tell us which Week 2 traits are structural and which were matchup noise\\.?/gi,'Week 3 can settle the argument. If the same weakness returns, management gets to own it.')
   .replace(/Supporters have a measurable lineup decision to question[^.!?]*\\.?/gi,'Supporters already saw the lineup mistake. Repeat it and the boos will explain the rest.')
   .replace(/The useful standard for ([^.!?]+) is simple:\\s*repeat the strengths and materially reduce the Week 2 failure points\\.?/gi,'For $1, keep what worked and stop repeating the stupid parts. Nobody gets bonus points for making that complicated.');"""
if s.count(old)!=1:
    raise SystemExit(f'Jefferson cleanup anchor expected once, found {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s)
self_path.unlink(missing_ok=True)
