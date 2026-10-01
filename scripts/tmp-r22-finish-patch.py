from pathlib import Path

p = Path('netlify/functions/inquirer-week2-editorial-r22.mjs')
s = p.read_text()

anchor = "if(/That difference is large enough to track directly into Week 3/i.test(x))return'One lousy Sunday below the established baseline is worth watching. If the role stays intact, the usage matters more than the gap itself.';"
extra = "if(/excessive enough to be enjoyable and useful enough to avoid becoming nonsense/i.test(x))return'The expanded role is the part worth watching; management now has a reason to keep the opportunity intact.';"
if extra not in s:
    if anchor not in s:
        raise SystemExit('weightless-humor patch anchor missing')
    s = s.replace(anchor, anchor + '\n ' + extra, 1)

gap = "if(/ugly little gap and I dislike it/i.test(x))return'The established role is still intact, so criticize the bad score without inventing a new problem unless the usage changes.';"
if gap not in s:
    s = s.replace(extra, extra + '\n ' + gap, 1)

replacements = {
    "`The result is real. I still want ${n} management to explain the avoidable parts before the record starts hiding them.`": "`The result is real. I want ${n} management to explain the avoidable parts before the record starts hiding them.`",
    "`Take the result. Keep the excuses in storage; ${n} has enough football on tape to know what needs fixing.`": "`Take the result. I refuse to let the record hide the avoidable football; ${n} has enough tape to know what needs fixing.`",
    "`${n} has a result and a process to judge separately. Keep the parts that worked and fix the avoidable mistake.`": "`${n} has a result and a process to judge separately. I want the avoidable mistake fixed before the next Sunday.`",
    "`The record is one fact. ${n} management still has to explain the decisions that created the performance.`": "`The record is one fact. I refuse to let it excuse ${n} management’s avoidable decisions.`",
    "The numbers describe the week. The decision-making tells me who actually learned anything.": "I want the numbers tied to a football consequence: the decision-making tells me who actually learned anything.",
    "A record can hide a weak Sunday for a while. The scoring profile eventually collects the debt.": "I refuse to let a pretty record hide a weak Sunday; the scoring profile eventually collects the debt.",
    "A pretty record is welcome; competent football remains considerably more attractive.": "I am happy to admire a pretty record, but competent football remains considerably more attractive.",
    "The week produced drama for free. Any manager adding avoidable nonsense should at least bring champagne.": "I am already getting drama for free. Any manager adding avoidable nonsense should at least bring champagne.",
    "The scoreboard closed the scene; the process still has lines to learn.": "The scoreboard closed the scene. I want the process to learn its lines before the next act.",
    "The result changes the expectation: repeat the good process and remove the avoidable mistake.": "I want the result to change the expectation: repeat the good process and remove the avoidable mistake.",
    "Scoring context matters because wins and losses can hide how well the lineup actually performed.": "I refuse to grade the lineup by the record alone; scoring context shows how well it actually performed.",
    "The useful takeaway is the decision management can repeat or correct next week.": "I want one useful takeaway: identify the decision management should repeat or correct next week. If the same mistake returns, I am calling it a choice.",
}
for old, new in replacements.items():
    s = s.replace(old, new)

s = s.replace(
    "|management owns|bad luck|explain that|fix it)\\b/i;",
    "|management owns|bad luck|I would|I dislike|I adore|I expect|delicious|lovely|disgust|laugh)\\b/i;",
)
s = s.replace(
    "|prevent(?:ed|ing)? .* solo effort)\\b/i;",
    "|prevent(?:ed|ing)? .* solo effort|keep(?:ing)? (?:the |this )?(?:roster|team) afloat|hold(?:ing)? (?:the |this )?(?:roster|team) together|can(?:not|'t) do it alone|needs? (?:somebody|someone) else to help|rest of the roster .* help|one player .* everything)\\b/i;",
)

old_named = "function namedPlayer(sentence,players){return players.find(p=>exactName(sentence,p))||null}\n\nfunction factKey"
new_named = "function namedPlayer(sentence,players){return players.find(p=>exactName(sentence,p))||null}\nfunction canonicalPlayer(player,players){\n const p=String(player||'').trim();if(!p)return'';if(/\\s/.test(p))return p.toLowerCase();\n const full=players.find(x=>/\\s/.test(x)&&String(x).split(/\\s+/)[0].toLowerCase()===p.toLowerCase());\n return String(full||p).toLowerCase();\n}\n\nfunction factKey"
if old_named in s:
    s = s.replace(old_named, new_named, 1)
elif 'function canonicalPlayer(player,players)' not in s:
    raise SystemExit('canonical player patch anchor missing')

start = s.index('function factKey(')
end = s.index('function dedupePlayerFacts(', start)
funcs = r'''function factKey(sentence,players){
 const s=String(sentence||''),p=namedPlayer(s,players);
 if(p){
  const k=canonicalPlayer(p,players),escaped=esc(p);
  if(/averaged\s+\d+(?:\.\d+)?\s+fantasy points|prior baseline|prior average/i.test(s))return`baseline|${k}`;
  if(/snap share|played\s+\d+(?:\.\d+)?%|available snaps/i.test(s))return`usage|${k}`;
  if(/Breakout Watch|Hot Seat|Cool Throne|Established Star|Steady Veteran|Young Breakout|Proven Star|Week 2 tag|entered Week 2 (?:on|tagged)/i.test(s))return`tag|${k}`;
  if(/real-football line|\bscored\s+-?\d+(?:\.\d+)?\s+fantasy points|\bgave\s+(?:\w+\s+)?-?\d+(?:\.\d+)?\s+points|\bposted\s+-?\d+(?:\.\d+)?\b|\bdelivered\s+-?\d+(?:\.\d+)?\b|Week 2 landed at\s+-?\d|\b-?\d+(?:\.\d+)?\s+(?:fantasy\s+)?points?\s+from\b|^-?\d+(?:\.\d+)?\s+from\b/i.test(s)||new RegExp('^'+escaped+'\\s+at\\s+-?\\d+(?:\\.\\d+)?\\b','i').test(s))return`score|${k}`;
 }
 let m=s.match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+(?:outscored|beat)\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+by\s+(\d+(?:\.\d+)?)/i);
 if(m)return`bench|${m[1].toLowerCase()}|${m[2].toLowerCase()}|${m[3]}`;
 return'';
}

function conclusionKey(sentence,players){
 if(/\d/.test(sentence))return'';
 const p=namedPlayer(sentence,players);if(!p)return'';
 const s=String(sentence||''),k=canonicalPlayer(p,players);
 if(/keep .*?(?:involved|plan)|use .*?(?:again|what worked)|obvious answer|smart move is to use/i.test(s))return`use|${k}`;
 if(/bad week|ugly|dreadful|rough|problem|concern|not enough/i.test(s))return`concern|${k}`;
 if(/role|usage|snap|opportunity/i.test(s))return`role|${k}`;
 if(/trust|baseline|expectation/i.test(s))return`trust|${k}`;
 if(/management|lineup (?:call|choice|decision|mistake)/i.test(s))return`management|${k}`;
 return'';
}

'''
s = s[:start] + funcs + s[end:]

cleanup_anchor = "x=x.replace(/found a player willing to carry a scene/gi,'found a player who owned the scene');"
cleanup_extra = "x=x.replace(/; Week 2 landed at\\s+-?\\d+(?:\\.\\d+)?\\.?$/i,'.');\n x=x.replace(/; Week 2 produced\\s+-?\\d+(?:\\.\\d+)?\\.?$/i,'.');"
if cleanup_extra not in s:
    if cleanup_anchor not in s:
        raise SystemExit('baseline dedupe anchor missing')
    s = s.replace(cleanup_anchor, cleanup_anchor + '\n ' + cleanup_extra, 1)

old_return = "const list=banks[id]?.[kind]||banks[id]?.players||banks['walter-mercer'].players;\n return choose(list,`${n}|${kind}|${slot}`);"
new_return = "const list=banks[id]?.[kind]||banks[id]?.players||banks['walter-mercer'].players;\n const offset=hash(`${n}|${kind}`)%list.length;\n const line=list[(offset+slot)%list.length];\n if(STYLE_MARK.test(line))return line;\n const lead={'walter-mercer':'I want this clear:','tess-delaney':'I am enjoying the drama, but the football still has to make sense:','mack-hollis':'The audience is allowed to boo when the football deserves it:','nora-voss':'I refuse the easy explanation:'}[id]||'I want this clear:';\n return `${lead} ${line}`;"
old_patched = "const list=banks[id]?.[kind]||banks[id]?.players||banks['walter-mercer'].players;\n const line=choose(list,`${n}|${kind}|${slot}`);\n if(STYLE_MARK.test(line))return line;\n const lead={'walter-mercer':'I want this clear:','tess-delaney':'I am enjoying the drama, but the football still has to make sense:','mack-hollis':'The audience is allowed to boo when the football deserves it:','nora-voss':'I refuse the easy explanation:'}[id]||'I want this clear:';\n return `${lead} ${line}`;"
if old_return in s:
    s = s.replace(old_return, new_return, 1)
elif old_patched in s:
    s = s.replace(old_patched, new_return, 1)
elif new_return not in s:
    raise SystemExit('meaningfulLine return anchor missing')

start = s.index('function ensureMeaningfulVoice(')
end = s.index('function finalArticleCleanup(', start)
voice_fn = r'''function ensureMeaningfulVoice(t,sec){
 const kind=String(sec?.kind||''),ps=[...(sec?.paragraphs||[])].filter(Boolean);
 if(!ps.length)return ps;
 let dry=0,slot=0,anyVoice=false;
 for(let i=0;i<ps.length;i++){
  if(STYLE_MARK.test(ps[i])){dry=0;anyVoice=true;continue}
  dry+=1;
  if(dry>=4){
   const line=meaningfulLine(t,kind,slot++);
   ps[i]=`${line} ${ps[i]}`.trim();
   dry=0;anyVoice=true;
  }
 }
 if(!anyVoice){
  const line=meaningfulLine(t,kind,slot++);
  ps[0]=`${line} ${ps[0]}`.trim();
 }
 return ps;
}

'''
s = s[:start] + voice_fn + s[end:]

p.write_text(s)
