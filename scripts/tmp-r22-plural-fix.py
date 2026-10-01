from pathlib import Path

p=Path('netlify/functions/inquirer-week2-editorial-r22.mjs')
s=p.read_text()
old="function cleanParagraph(t,p){\n return sentences(p).map(s=>cleanSentence(t,s)).filter(Boolean).join(' ').trim();\n}"
new="""function fixTeamSubjectVerb(t,text){
 const n=teamName(t),last=String(n||'').trim().split(/\\s+/).at(-1)||'';
 if(!/s$/i.test(last))return String(text||'');
 let out=String(text||'');
 for(const [from,to] of [['has','have'],['is','are'],['gets','get'],['holds','hold'],['brings','bring'],['turns','turn']]){
  out=out.replace(new RegExp(`(${esc(n)}\\\\s+)${from}\\\\b`,'gi'),`$1${to}`);
 }
 return out;
}

function cleanParagraph(t,p){
 const cleaned=sentences(p).map(s=>cleanSentence(t,s)).filter(Boolean).join(' ').trim();
 return fixTeamSubjectVerb(t,cleaned);
}"""
if new not in s:
    if old not in s:
        raise SystemExit('R22 cleanParagraph grammar anchor missing')
    s=s.replace(old,new,1)
p.write_text(s)
print('R22 plural team grammar patch applied')
