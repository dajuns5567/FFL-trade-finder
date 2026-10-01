from pathlib import Path
p=Path('netlify/functions/inquirer-week2-editorial-r22.mjs')
s=p.read_text()
anchor="  /^The prior baseline for\\s+([A-Z][A-Za-z'.-]+(?:\\s+[A-Z][A-Za-z'.-]+){0,3})\\s+is\\s+\\d/i,"
extra="  /^A\\s+\\d+(?:\\.\\d+)?\\s+prior average .*? for\\s+([A-Z][A-Za-z'.-]+(?:\\s+[A-Z][A-Za-z'.-]+){0,3})\\b/i,\n  /^([A-Z][A-Za-z'.-]+(?:\\s+[A-Z][A-Za-z'.-]+){0,3})\\s+answered with\\s+-?\\d/i,"
if extra not in s:
    if anchor not in s:
        raise SystemExit('player discovery anchor missing')
    s=s.replace(anchor,anchor+'\n'+extra,1)
p.write_text(s)
