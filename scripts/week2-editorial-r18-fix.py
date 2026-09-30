from pathlib import Path
p=Path('scripts/inquirer-week2-voice-r15-smoke.mjs')
self_path=Path('scripts/week2-editorial-r18-fix.py')
s=p.read_text()
old='|public embarrassment)\\b/i;'
new='|public embarrassment|diagram|premium package|complaint forms|old coat|orchestra|dimmer switch|lyrics|forwarding address|fine print|opening night|reviews|brochure|jewelry|Monday|scoreboard|philosophical defense|committee|bragging|sulking|unpaid labor)\\b/i;'
if s.count(old)!=1:
    raise SystemExit(f'humor detector anchor expected once, found {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s)
self_path.unlink(missing_ok=True)
