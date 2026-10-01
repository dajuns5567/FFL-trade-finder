import fs from 'node:fs';

const path='netlify/functions/inquirer-week2-editorial-r21.mjs';
const before=fs.readFileSync(path,'utf8');
const from=`function ensureVoice(t,sec){
 const ps=[...(sec?.paragraphs||[])].filter(Boolean),kind=String(sec?.kind||'');
 if(!ps.length)return ps;
 const targets=ps.length>=4?[0,Math.floor(ps.length/2)]:[0];
 let slot=0;
 for(const idx of targets){
  if(!VOICE_MARK.test(ps[idx]))ps[idx]=\`${'${ps[idx]}'} ${'${reporterVoiceLine(t,kind,slot++)}' }\`.trim();
 }
 return ps;
}`;
const to=`function ensureVoice(t,sec){
 const ps=[...(sec?.paragraphs||[])].filter(Boolean),kind=String(sec?.kind||'');
 if(!ps.length)return ps;
 const targets=[];
 for(let i=0;i<ps.length;i+=3)targets.push(i);
 let slot=0;
 for(const idx of targets){
  if(!VOICE_MARK.test(ps[idx]))ps[idx]=\`${'${ps[idx]}'} ${'${reporterVoiceLine(t,kind,slot++)}' }\`.trim();
 }
 return ps;
}`;
if(!before.includes(from))throw new Error('Expected ensureVoice implementation not found');
fs.writeFileSync(path,before.replace(from,to));
console.log('R21 voice distribution patch applied');
