import fs from 'node:fs';

function replaceOrThrow(path,from,to){
 const before=fs.readFileSync(path,'utf8');
 if(!before.includes(from))throw new Error(`Missing expected text in ${path}: ${from}`);
 const after=before.replace(from,to);
 fs.writeFileSync(path,after);
}

replaceOrThrow(
 'netlify/functions/league-hub.mjs',
 "import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r20.mjs';",
 "import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r21.mjs';"
);

replaceOrThrow(
 'scripts/inquirer-v25-generated-audit.mjs',
 "assert.ok(Number(d.editorial_revision)===14||(Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20'),'Generated Week 2 edition must be the raw revision 14 preload or the explicit served revision 20 rewrite layer');",
 "assert.ok(Number(d.editorial_revision)===14||(Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20')||(Number(d.editorial_revision)===21&&d.voice_revision==='week2-r21'),'Generated Week 2 edition must be the raw revision 14 preload or an explicit served Week 2 rewrite layer');"
);

replaceOrThrow(
 'scripts/inquirer-v25-generated-audit.mjs',
 "const servedR20=reportWeek===2&&Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20';",
 "const servedR20=reportWeek===2&&((Number(d.editorial_revision)===20&&d.voice_revision==='week2-r20')||(Number(d.editorial_revision)===21&&d.voice_revision==='week2-r21'));"
);

console.log('R21 runtime/audit patch applied');
