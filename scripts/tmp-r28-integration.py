from pathlib import Path

def replace(path, old, new, *, required=True):
    p=Path(path); s=p.read_text()
    if required and old not in s:
        raise SystemExit(f'missing expected text in {path}: {old[:100]!r}')
    p.write_text(s.replace(old,new))

# Serve R28 from League Hub.
replace('netlify/functions/league-hub.mjs',
        "import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r27.mjs';",
        "import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r28.mjs';")

# Upgrade the all-32 semantic smoke to R28 and add the new natural-language contracts.
p=Path('scripts/inquirer-week2-r23-smoke.mjs'); s=p.read_text()
s=s.replace("../netlify/functions/inquirer-week2-editorial-r27.mjs","../netlify/functions/inquirer-week2-editorial-r28.mjs")
s=s.replace('WEEK2_EDITORIAL_REVISION),27','WEEK2_EDITORIAL_REVISION),28')
s=s.replace('editorial_revision),27','editorial_revision),28')
s=s.replace("'week2-r27'","'week2-r28'")
s=s.replace('R27','R28')
s=s.replace('revision:27','revision:28')
needle="const BAD_GRAMMAR=/\\b(?:The record for .+ are\\b|My Week 3 request for .+ are simple\\b|For [A-Z][^.]+, good\\b)/i;"
if needle not in s: raise SystemExit('missing BAD_GRAMMAR anchor')
insert="const BAD_R28=/\\b(?:real[- ]football line|fantasy[- ]football line|useful player line on the page|got useful production here|produced something worth enjoying here|Fine, this one gets its own argument|Give me a minute\\. I have tomatoes and applause; choose correctly|Keep what worked; no committee meeting required|Use the obvious answer and spare me the theory|I can live with this; alert the historians|This scene gets its own note|smart move is to use what worked instead of inventing a theory around it)\\b/i;\nconst BAD_GRAMMAR=/\\b(?:The record for .+ are\\b|My Week 3 request for .+ are simple\\b|For [A-Z][^.]+, good\\b|My standard for .+ are getting simpler\\b|The next opponent for .+ are\\b|[A-Z][A-Za-z0-9' -]+ either handles\\b|Football around .+ are already\\b)/i;"
s=s.replace(needle,insert)
anchor="assert(!BAD_TEMPLATE.test(text),`Repeated decorative template survived in ${full}: ${sentences(text).find(s=>BAD_TEMPLATE.test(s))||''}`);"
if anchor not in s: raise SystemExit('missing BAD_TEMPLATE assertion anchor')
s=s.replace(anchor,anchor+"\n const badR28Match=text.match(BAD_R28)?.[0]||''; assert(!badR28Match,`R28 canned/stat-meta language survived in ${full}: ${badR28Match}`);")
anchor2="const rid=String(a?.reporter?.id||'');reporterCounts.set(rid,(reporterCounts.get(rid)||0)+1);"
if anchor2 not in s: raise SystemExit('missing reporter counter anchor')
extra="""
 const managementCopy=sections.filter(sec=>/management|decision|fix it/i.test(String(sec?.heading||''))).flatMap(sec=>sec?.paragraphs||[]).join(' ');
 if(/did not leave an obvious higher-scoring bench answer in a compatible spot/i.test(text)){
  assert.doesNotMatch(managementCopy,/prefer blaming the person who chose the lineup|cute bad decision|management had seven days to avoid looking silly/i,`Manager blamed despite no actionable bench alternative for ${full}`);
 }
"""
s=s.replace(anchor2,extra+"\n "+anchor2)
p.write_text(s)

# Permanent CI should syntax-check, test, and materialize the same R28 layer users see.
p=Path('.github/workflows/inquirer-editorial-r5-smoke.yml'); s=p.read_text()
s=s.replace("          node --check netlify/functions/inquirer-week2-editorial-r27.mjs\n","          node --check netlify/functions/inquirer-week2-editorial-r27.mjs\n          node --check netlify/functions/inquirer-week2-editorial-r28.mjs\n")
s=s.replace('Week 2 R27 natural-language and semantic repetition regression','Week 2 R28 natural-language and semantic repetition regression')
s=s.replace("import {applyWeek2EditorialR16} from './netlify/functions/inquirer-week2-editorial-r27.mjs';","import {applyWeek2EditorialR16} from './netlify/functions/inquirer-week2-editorial-r28.mjs';")
s=s.replace("Number(week2?.editorial_revision)!==27||week2?.voice_revision!=='week2-r27'","Number(week2?.editorial_revision)!==28||week2?.voice_revision!=='week2-r28'")
s=s.replace('Week 2 revision 27 did not materialize from the locked preload','Week 2 revision 28 did not materialize from the locked preload')
p.write_text(s)

# Generated-edition audit recognizes R28 as the current explicit Week 2 rewrite layer.
p=Path('scripts/inquirer-v25-generated-audit.mjs'); s=p.read_text()
old="(Number(d.editorial_revision)===27&&d.voice_revision==='week2-r27')"
new=old+"||(Number(d.editorial_revision)===28&&d.voice_revision==='week2-r28')"
if s.count(old)<2: raise SystemExit('expected two R27 whitelist anchors in generated audit')
s=s.replace(old,new)
p.write_text(s)

print('R28 integration patch applied')
