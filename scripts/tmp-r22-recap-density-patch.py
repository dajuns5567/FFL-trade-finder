from pathlib import Path
p=Path('netlify/functions/inquirer-week2-editorial-r22.mjs')
s=p.read_text()
old="if(!STYLE_MARK.test(p)){const line=list[index%list.length];p=`${p} ${line}`.trim()}"
new="if(!STYLE_MARK.test(p)){const raw=list[index%list.length],parts=sentences(raw);const line=parts.find(x=>STYLE_MARK.test(x))||parts[0]||raw;p=`${p} ${line}`.trim()}"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('recap voice injection anchor missing')
p.write_text(s)
