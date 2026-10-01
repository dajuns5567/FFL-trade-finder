from pathlib import Path

league=Path('netlify/functions/league-hub.mjs')
s=league.read_text()
old="import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r21.mjs';"
new="import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r22.mjs';"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('R22 league-hub import anchor missing')
league.write_text(s)

audit=Path('scripts/inquirer-v25-generated-audit.mjs')
s=audit.read_text()
old="assert.ok(Number(d.editorial_revision)===14||(Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20')||(Number(d.editorial_revision)===21&&d.voice_revision==='week2-r21'),'Generated Week 2 edition must be the raw revision 14 preload or an explicit served Week 2 rewrite layer');"
new="assert.ok(Number(d.editorial_revision)===14||(Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20')||(Number(d.editorial_revision)===21&&d.voice_revision==='week2-r21')||(Number(d.editorial_revision)===22&&d.voice_revision==='week2-r22'),'Generated Week 2 edition must be the raw revision 14 preload or an explicit served Week 2 rewrite layer');"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('R22 generated-audit revision whitelist anchor missing')
old="const servedR20=reportWeek===2&&((Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20')||(Number(d.editorial_revision)===21&&d.voice_revision==='week2-r21'));"
new="const servedR20=reportWeek===2&&((Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20')||(Number(d.editorial_revision)===21&&d.voice_revision==='week2-r21')||(Number(d.editorial_revision)===22&&d.voice_revision==='week2-r22'));"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('R22 generated-audit served-layer anchor missing')
old="assert.ok(sentenceParts(p).length<=3,'R20 Weekly Recap paragraph bundles too many ideas: '+p);"
new="assert.ok(sentenceParts(p).length<=(Number(d.editorial_revision)>=22?4:3),'Served Week 2 Weekly Recap paragraph bundles too many ideas: '+p);"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('R22 generated-audit recap sentence-cap anchor missing')
audit.write_text(s)
