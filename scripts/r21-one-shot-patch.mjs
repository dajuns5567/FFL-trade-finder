import fs from 'node:fs';

function replaceOrThrow(path,from,to){
 const before=fs.readFileSync(path,'utf8');
 if(!before.includes(from))throw new Error(`Missing expected text in ${path}: ${from}`);
 const after=before.replace(from,to);
 fs.writeFileSync(path,after);
}

replaceOrThrow(
 'netlify/functions/inquirer-week2-editorial-r21.mjs',
 "'hot-seat':[`I do not need ${n} to panic. I need the weak spot to stop volunteering for another mention next week.`,`${n} has one obvious problem to clean up. I would appreciate management fixing it before I have to learn a second adjective for ugly.`],",
 "'hot-seat':[`I do not need ${n} to turn one bad Sunday into a melodrama. I need the weak spot to stop volunteering for another mention next week.`,`${n} has one obvious problem to clean up. I would appreciate management fixing it before I have to learn a second adjective for ugly.`],"
);

replaceOrThrow(
 'netlify/functions/inquirer-week2-editorial-r21.mjs',
 "value:[`${n} moved in the market. Fine. The useful question is whether the lineup decisions deserve the same confidence.`,`${n} has a valuation change and a football game. I care more about the part management can actually control on Sunday.`],",
 "value:[`${n} moved in the market. Fine. I care more about whether the lineup decisions deserve the same confidence.`,`${n} has a valuation change and a football game. I care more about the part management can actually control on Sunday.`],"
);

replaceOrThrow(
 'netlify/functions/inquirer-week2-editorial-r21.mjs',
 "function normalizeTeamChants(t,text){\n const n=teamName(t),re=new RegExp('\\\\b'+esc(n)+'\\\\b','g');let seen=0;\n return String(text||'').replace(re,m=>{seen++;return seen<=2?m:(seen===3?'the roster':'the team')});\n}",
 "function normalizeTeamChants(t,text){\n const n=teamName(t),e=esc(n);\n return String(text||'')\n  .replace(new RegExp('(?:The\\\\s+)?'+e+'\\\\s+scoreboard','g'),'The scoreboard')\n  .replace(new RegExp(e+'\\\\s+management','g'),'management')\n  .replace(new RegExp(e+'\\\\s+supporters','g'),'supporters')\n  .replace(new RegExp(e+'\\\\s+fans','g'),'fans');\n}"
);

replaceOrThrow(
 'netlify/functions/inquirer-week2-editorial-r21.mjs',
 "if(/does not need embellishment/i.test(s)){out.push(s.replace(/The decline is measurable and does not need embellishment\\.?/i,'The decline is real, and it was bad enough without adding drama.'));continue}\n  if(/clean chance/i.test(s)){out.push(s.replace(/a clean chance/ig,'a straightforward chance'));continue}",
 "if(/does not need embellishment/i.test(s)){out.push(s.replace(/The decline is measurable and does not need embellishment\\.?/i,'The decline is real, and it was bad enough without adding drama.'));continue}\n  if(/role now has to justify another start/i.test(s)){out.push(s.replace(/the role now has to justify another start/ig,'the bad Week 2 number needs a better answer next Sunday'));continue}\n  if(/clean chance/i.test(s)){out.push(s.replace(/a clean chance/ig,'a straightforward chance'));continue}"
);

replaceOrThrow(
 'netlify/functions/inquirer-week2-editorial-r21.mjs',
 "function temperEstablishedOverreaction(t,paragraph,baselines){\n let out=[];\n for(const s of sentenceParts(paragraph)){\n  let replaced=false;\n  for(const [player] of baselines){\n   if(s.toLowerCase().includes(player.toLowerCase())&&PANIC.test(s)){\n    out.push(establishedCorrection(t,player,s));replaced=true;break;\n   }\n  }\n  if(!replaced)out.push(s);\n }\n return out.join(' ');\n}",
 "function temperEstablishedOverreaction(t,paragraph,baselines){\n const mentioned=[...baselines.keys()].filter(player=>String(paragraph||'').toLowerCase().includes(player.toLowerCase()));\n if(!mentioned.length)return paragraph;\n let out=[];\n for(const s of sentenceParts(paragraph)){\n  const player=mentioned.find(name=>s.toLowerCase().includes(name.toLowerCase()));\n  if(player&&PANIC.test(s)){out.push(establishedCorrection(t,player,s));continue}\n  if(PANIC.test(s)){\n   out.push(s\n    .replace(/\\bbench(?:ing)?\\b/gi,'lineup')\n    .replace(/\\bpanic\\b/gi,'overreact')\n    .replace(/\\bcrisis\\b/gi,'bad week')\n    .replace(/\\bemergency\\b/gi,'problem')\n    .replace(/\\bhot seat\\b/gi,'rough spot'));\n   continue;\n  }\n  out.push(s);\n }\n return out.join(' ');\n}"
);

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

console.log('R21 content/runtime/audit patch applied');
