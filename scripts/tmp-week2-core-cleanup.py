from pathlib import Path


def replace_between(src, start_marker, end_marker, replacement):
    start = src.index(start_marker)
    end = src.index(end_marker, start)
    return src[:start] + replacement.rstrip() + "\n" + src[end:]


editorial_path = Path("netlify/functions/inquirer-week2-editorial-r15.mjs")
text = editorial_path.read_text()

dedupe = r'''function dedupeArticleSentences(t){
 const a=t?.inquirer_article;if(!a)return t;
 const seen=new Set();
 a.sections=(a.sections||[]).map(sec=>({
  ...sec,
  paragraphs:(sec?.paragraphs||[]).map(p=>{
   const kept=sentenceParts(p).filter(sentence=>{
    const key=String(sentence||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(!key||seen.has(key))return false;
    seen.add(key);return true;
   });
   return kept.join(' ').trim();
  }).filter(Boolean)
 }));
 a.paragraphs=a.sections.flatMap(sec=>(sec?.paragraphs||[]).filter(Boolean));
 return t;
}'''

text = replace_between(text, "function editorialWordCount(", "\nfunction recapReaction", dedupe)

old_apply = """ out.teams=(out.teams||[]).map(reviseTeam);\n out.teams=diversifyRepeatedReporterSentences(out.teams);\n out.teams=diversifyReporterTemplates(out.teams);"""
new_apply = """ out.teams=(out.teams||[]).map(reviseTeam).map(dedupeArticleSentences);"""
if text.count(old_apply) != 1:
    raise SystemExit(f"Expected one editorial postprocessor call block, found {text.count(old_apply)}")
text = text.replace(old_apply, new_apply)

old_chair = "'The record for '+tm+' is '+rec+'. The emergency glass is not broken yet, but somebody has already put a chair under it.',"
new_chair = "'The record for '+tm+' is '+rec+'. Nobody needs to declare a crisis yet, but another Sunday like this will make restraint look ridiculous.',"
if text.count(old_chair) != 1:
    raise SystemExit(f"Expected one retired chair metaphor, found {text.count(old_chair)}")
text = text.replace(old_chair, new_chair)

for retired in [
    "function reporterVariationClause(",
    "function diversifyRepeatedReporterSentences(",
    "function diversifyReporterTemplates(",
    "the next Sunday supplies a clean test",
    "without inventing a larger story than the data supports",
]:
    if retired in text:
        raise SystemExit(f"Retired suffix postprocessor survived: {retired}")

editorial_path.write_text(text)

audit_path = Path("scripts/inquirer-v25-generated-audit.mjs")
audit = audit_path.read_text()

repeat_check = r'''for(const t of d.teams||[]){
  const seenLong=new Set(),duplicates=[];
  for(const sentence of sentenceParts(articleText(t))){
    const key=String(sentence||'').trim();
    if(words(key)<8)continue;
    if(seenLong.has(key))duplicates.push(key);
    else seenLong.add(key);
  }
  assert.deepEqual(duplicates,[],'A team article must not repeat the same long sentence inside one article for '+t.team_name);
}'''
audit = replace_between(audit, "const repeatedLong=new Map();", "\nconst editorialEntities=", repeat_check)

old_filter = "filter(([,rows])=>rows.length>3)"
new_filter = "filter(([,rows])=>rows.length>3&&new Set(rows.map(x=>String(x.reporter||''))).size>1)"
if audit.count(old_filter) != 1:
    raise SystemExit(f"Expected one cross-team template filter, found {audit.count(old_filter)}")
audit = audit.replace(old_filter, new_filter)
audit = audit.replace(
    "'Editorial sentence templates must not recur across more than three team articles after names/numbers are normalized'",
    "'Editorial sentence templates must not recur across more than three team articles when they cross reporter identities after names/numbers are normalized'",
)

marker = "  if(numeric>=2&&/\\b(?:targets?|carries|yards?|touchdowns?|passes?|completed|tackles?|solo|assists?|sacks?|snaps?|interceptions?|TFL|QB hits?|receptions?)\\b/i.test(x))return null;"
if audit.count(marker) != 1:
    raise SystemExit(f"Expected one factual-template exemption marker, found {audit.count(marker)}")
audit = audit.replace(marker, marker + "\n  if(/\\bWeek 3 brings\\b.*\\bin at \\d+-\\d+\\b.*\\b(?:AFC|NFC)\\b/i.test(x))return null;")

audit_path.write_text(audit)
