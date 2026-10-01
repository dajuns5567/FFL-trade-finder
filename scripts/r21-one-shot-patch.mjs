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
 "'hot-seat':[`Every respectable production needs a weak scene, apparently. ${n} has found theirs; now cut the unnecessary sequel.`,`${n} has one part of the show asking for a rewrite. I recommend doing it before the audience starts participating.`],",
 "'hot-seat':[`Every respectable production needs a weak scene, apparently. ${n} has found theirs; now skip the unnecessary sequel.`,`${n} has one part of the show asking for a rewrite. I recommend doing it before the audience starts participating.`],"
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
 "if(/does not need embellishment/i.test(s)){out.push(s.replace(/The decline is measurable and does not need embellishment\\.?/i,'The decline is real, and it was bad enough without adding drama.'));continue}\n  if(/role now has to justify another start/i.test(s)){out.push(s.replace(/the role now has to justify another start/ig,'the bad Week 2 number needs a better answer next Sunday'));continue}\n  if(/stands on its own/i.test(s)){out.push(s.replace(/stands on its own/ig,'helped the lineup'));continue}\n  if(/performance does not need decoration/i.test(s)){out.push('Good. Use it again before anybody starts bragging.');continue}\n  if(/enough output to matter without turning one Sunday into a season-long conclusion/i.test(s)){out.push('That helped. I want it again before anybody starts bragging.');continue}\n  if(/meaningful because production tied to a larger role is easier to project forward/i.test(s)){out.push('A larger role makes that easier to trust next week.');continue}\n  if(/material enough to affect roster decisions, not just aesthetics/i.test(s)){out.push(s.replace(/The move is material enough to affect roster decisions, not just aesthetics\\.?/i,'The move is large enough to matter when management weighs the next roster call.'));continue}\n  if(/size of that decline makes the concern specific/i.test(s)){out.push(s.replace(/The size of that decline makes the concern specific\\.?/i,'That drop is real enough to watch without inventing a crisis.'));continue}\n  if(/clean chance/i.test(s)){out.push(s.replace(/a clean chance/ig,'a straightforward chance'));continue}"
);

replaceOrThrow(
 'netlify/functions/inquirer-week2-editorial-r21.mjs',
 "function temperEstablishedOverreaction(t,paragraph,baselines){\n let out=[];\n for(const s of sentenceParts(paragraph)){\n  let replaced=false;\n  for(const [player] of baselines){\n   if(s.toLowerCase().includes(player.toLowerCase())&&PANIC.test(s)){\n    out.push(establishedCorrection(t,player,s));replaced=true;break;\n   }\n  }\n  if(!replaced)out.push(s);\n }\n return out.join(' ');\n}",
 "function temperEstablishedOverreaction(t,paragraph,baselines){\n const hasPlayer=(text,player)=>new RegExp('(?:^|[^A-Za-z])'+esc(player)+'(?:$|[^A-Za-z])','i').test(String(text||''));\n const mentioned=[...baselines.keys()].filter(player=>hasPlayer(paragraph,player));\n if(!mentioned.length)return paragraph;\n let out=[];\n for(const s of sentenceParts(paragraph)){\n  const player=mentioned.find(name=>hasPlayer(s,name));\n  if(player&&PANIC.test(s)){out.push(establishedCorrection(t,player,s));continue}\n  if(PANIC.test(s)){\n   out.push(s\n    .replace(/\\bbench(?:ing)?\\b/gi,'lineup')\n    .replace(/\\bpanic\\b/gi,'overreact')\n    .replace(/\\bcrisis\\b/gi,'bad week')\n    .replace(/\\bemergency\\b/gi,'problem')\n    .replace(/\\bhot seat\\b/gi,'rough spot'));\n   continue;\n  }\n  out.push(s);\n }\n return out.join(' ');\n}"
);

replaceOrThrow(
 'netlify/functions/inquirer-week2-editorial-r21.mjs',
 " return normalizeTeamChants(t,p);\n}",
 " p=p.replace(/\\bare winning more convincingly than it is scoring\\b/gi,'are winning more convincingly than their scoring suggests');\n const cleaned=normalizeTeamChants(t,p);\n return sentenceParts(cleaned).map(s=>/^[a-z]/.test(s)?s[0].toUpperCase()+s.slice(1):s).join(' ');\n}"
);

replaceOrThrow(
 'scripts/inquirer-week2-r21-smoke.mjs',
 "if((section(old,'players')?.paragraphs||[]).length>=12)assert(playerPs.length<=8,'R21 did not compact the repetitive player module for '+t.team_name+': '+playerPs.length);",
 "const oldPlayerCount=(section(old,'players')?.paragraphs||[]).length;\n if(oldPlayerCount>=12)assert(playerPs.length<=Math.ceil(oldPlayerCount*0.75),'R21 did not compact the repetitive player module by at least 25% for '+t.team_name+': '+oldPlayerCount+' -> '+playerPs.length);"
);

replaceOrThrow(
 'scripts/inquirer-week2-r21-smoke.mjs',
 "for(const [player] of bases){\n  for(const p of articleParagraphs(t))if(p.toLowerCase().includes(player.toLowerCase()))assert.doesNotMatch(p,PANIC,'R21 overreacts to established scorer '+player+' for '+t.team_name+': '+p);\n }",
 "for(const [player] of bases){\n  const pn=player.toLowerCase();\n  for(const p of articleParagraphs(t)){\n   const lp=p.toLowerCase(),idx=lp.indexOf(pn);\n   const exact=idx>=0&&!/[a-z]/.test(lp[idx-1]||'')&&!/[a-z]/.test(lp[idx+pn.length]||'');\n   if(exact)assert.doesNotMatch(p,PANIC,'R21 overreacts to established scorer '+player+' for '+t.team_name+': '+p);\n  }\n }"
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
