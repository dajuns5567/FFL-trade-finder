import fs from 'node:fs';

const path='netlify/functions/inquirer-week2-editorial-r21.mjs';
let text=fs.readFileSync(path,'utf8');

const fromEnsure=`function ensureVoice(t,sec){
 const ps=[...(sec?.paragraphs||[])].filter(Boolean),kind=String(sec?.kind||'');
 if(!ps.length)return ps;
 const targets=ps.length>=4?[0,Math.floor(ps.length/2)]:[0];
 let slot=0;
 for(const idx of targets){
  if(!VOICE_MARK.test(ps[idx]))ps[idx]=\`${'${ps[idx]}'} ${'${reporterVoiceLine(t,kind,slot++)}' }\`.trim();
 }
 return ps;
}`;
const toEnsure=`function ensureVoice(t,sec){
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
if(!text.includes(fromEnsure))throw new Error('Expected ensureVoice implementation not found');
text=text.replace(fromEnsure,toEnsure);

const fromFinal=` sections=dedupeArticleFacts(t,sections);
 sections=sections.map(sec=>({...sec,paragraphs:(sec.paragraphs||[]).flatMap(p=>splitLongParagraph(p,82)).filter(Boolean)}));
 a.sections=sections;`;
const toFinal=` sections=dedupeArticleFacts(t,sections);
 sections=sections.map(sec=>({...sec,paragraphs:(sec.paragraphs||[]).flatMap(p=>splitLongParagraph(p,82)).filter(Boolean)}));
 sections=sections.map(sec=>{
  const kind=String(sec?.kind||'');
  if(['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'].includes(kind)){
   const voiced=ensureVoice(t,sec);
   return{...sec,paragraphs:voiced.flatMap(p=>splitLongParagraph(p,82)).filter(Boolean)};
  }
  return sec;
 });
 a.sections=sections;`;
if(!text.includes(fromFinal))throw new Error('Expected final paragraph split block not found');
text=text.replace(fromFinal,toFinal);

fs.writeFileSync(path,text);
console.log('R21 final voice distribution + re-split patch applied');
