import fs from 'node:fs';

function patch(path, pairs){
  let s=fs.readFileSync(path,'utf8');
  for(const [from,to] of pairs){
    if(!s.includes(from))throw new Error(`Missing integration anchor in ${path}: ${from}`);
    s=s.replace(from,to);
  }
  fs.writeFileSync(path,s);
}

patch('netlify/functions/league-hub.mjs',[
  ["import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r22.mjs';","import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r27.mjs';"]
]);

patch('scripts/inquirer-v25-generated-audit.mjs',[
  ["||(Number(d.editorial_revision)===22&&d.voice_revision==='week2-r22')","||(Number(d.editorial_revision)===22&&d.voice_revision==='week2-r22')||(Number(d.editorial_revision)===27&&d.voice_revision==='week2-r27')"],
  ["||(Number(d.editorial_revision)===22&&d.voice_revision==='week2-r22'))","||(Number(d.editorial_revision)===22&&d.voice_revision==='week2-r22')||(Number(d.editorial_revision)===27&&d.voice_revision==='week2-r27'))"]
]);

console.log('Patched League Hub and generated audit for Week 2 R27.');
