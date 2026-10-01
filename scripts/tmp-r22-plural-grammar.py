from pathlib import Path
p=Path('netlify/functions/inquirer-week2-editorial-r22.mjs')
s=p.read_text()
anchor="function finalArticleCleanup(t,sections){"
helper=r'''function normalizePluralTeamGrammar(t,text){
 const full=teamName(t),bits=String(full||'').trim().split(/\s+/).filter(Boolean),mascot=bits.at(-1)||'';
 if(!/s$/i.test(mascot))return String(text||'');
 let out=String(text||'');
 for(const subject of [full,mascot].filter(Boolean)){
  const e=esc(subject);
  out=out.replace(new RegExp('(^|[^A-Za-z])('+e+')\\s+has\\b','gi'),'$1$2 have');
  out=out.replace(new RegExp('(^|[^A-Za-z])('+e+')\\s+is\\b','gi'),'$1$2 are');
  out=out.replace(new RegExp('(^|[^A-Za-z])('+e+')\\s+gets\\b','gi'),'$1$2 get');
  out=out.replace(new RegExp('(^|[^A-Za-z])('+e+')\\s+holds\\b','gi'),'$1$2 hold');
  out=out.replace(new RegExp('(^|[^A-Za-z])('+e+')\\s+brings\\b','gi'),'$1$2 bring');
  out=out.replace(new RegExp('(^|[^A-Za-z])('+e+')\\s+turns\\b','gi'),'$1$2 turn');
 }
 return out;
}

'''
if helper not in s:
    if anchor not in s: raise SystemExit('final cleanup anchor missing')
    s=s.replace(anchor,helper+anchor,1)
old="  ps=ps.flatMap(p=>split(p,82)).filter(Boolean);\n  return{...sec,paragraphs:ps};"
new="  ps=ps.flatMap(p=>split(p,82)).filter(Boolean).map(p=>normalizePluralTeamGrammar(t,p));\n  return{...sec,paragraphs:ps};"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('paragraph normalization anchor missing')
p.write_text(s)
