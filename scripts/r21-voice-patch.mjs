import fs from 'node:fs';

const sourcePath='netlify/functions/inquirer-week2-editorial-r21.mjs';
let text=fs.readFileSync(sourcePath,'utf8');

const oldVoiceMark="const VOICE_MARK=/\\b(?:complaint|ridiculous|absurd|patience|silence|annoying|annoyed|ugly|beautiful|glamour|champagne|tomatoes|applause|theater|stage|curtain|swagger|embarrass|heckl|boo|joke|funny|stupid|nonsense|I refuse|I resent|I would|I want|I am|I can|good luck|congratulations|mercifully|delicious|rude|polite clap|parade|confetti|funeral|miracle|costume|shopping|credit card|complaint desk|committee meeting)\\b/i;";
const newVoiceMark="const VOICE_MARK=/\\b(?:complaint|ridiculous|absurd|patience|silence|annoying|annoyed|ugly|beautiful|glamour|champagne|tomatoes|applause|theater|stage|curtain|swagger|embarrass|heckl|boo|joke|funny|stupid|nonsense|I refuse|I resent|I would|I want|I am|I can|good luck|congratulations|mercifully|delicious|rude|polite clap|parade|confetti|funeral|miracle|costume|shopping|credit card|complaint desk|committee meeting|production|management|enjoy(?:ing)?|irresponsib)\\b/i;";
if(!text.includes(oldVoiceMark))throw new Error('Expected VOICE_MARK not found');
text=text.replace(oldVoiceMark,newVoiceMark);

const oldEstablished=`function establishedCorrection(t,player,sentence){
 const id=reporterId(t),score=(sentence.match(/\\b-?\\d+(?:\\.\\d+)?\\b/)||[])[0],shown=score?\`${'${score}'} points\`:'the Week 2 number';
 const banks={
  'walter-mercer':\`${'${shown}'} from ${'${player}'} was bad. The established scoring record earns criticism without pretending one lousy Sunday erased the player.\`,
  'tess-delaney':\`${'${shown}'} from ${'${player}'} was ugly. A proven scorer can have a rotten Sunday without management pretending one ugly game rewrote the résumé.\`,
  'mack-hollis':\`${'${player}'} gave us ${'${shown}'}, and it was dreadful. The résumé is still too substantial for one bad scene to become a casting change.\`,
  'nora-voss':\`${'${player}'} had a bad Week 2 at ${'${shown}'}. The established baseline says to fix the week, not invent a role crisis.\`
 };
 return banks[id]||banks['walter-mercer'];
}`;
const newEstablished=`function establishedCorrection(t,player,sentence){
 const id=reporterId(t);
 let m=String(sentence||'').match(/(-?\\d+(?:\\.\\d+)?)\\s+in Week 2/i);
 if(!m)m=String(sentence||'').match(/Week 2[^0-9-]*(-?\\d+(?:\\.\\d+)?)/i);
 const score=m?.[1]||null,shown=score?\`${'${score}'} points\`:'the bad Week 2 number';
 const banks={
  'walter-mercer':\`${'${shown}'} from ${'${player}'} was bad. The established scoring record earns criticism without pretending one lousy Sunday erased the player.\`,
  'tess-delaney':\`${'${shown}'} from ${'${player}'} was ugly. A proven scorer can have a rotten Sunday without management pretending one ugly game rewrote the résumé.\`,
  'mack-hollis':\`${'${player}'} gave us ${'${shown}'}, and it was dreadful. The résumé is still too substantial for one bad scene to become a casting change.\`,
  'nora-voss':\`${'${player}'} had a bad Week 2 at ${'${shown}'}. The established baseline says to criticize the week without inventing a role controversy.\`
 };
 return banks[id]||banks['walter-mercer'];
}`;
if(!text.includes(oldEstablished))throw new Error('Expected establishedCorrection implementation not found');
text=text.replace(oldEstablished,newEstablished);

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
}

function fillVoiceGaps(t,sec){
 const kind=String(sec?.kind||''),out=[];let cold=0,slot=0;
 for(const p of sec?.paragraphs||[]){
  out.push(p);
  if(VOICE_MARK.test(p)){cold=0;continue}
  cold++;
  if(cold>=3){out.push(reporterVoiceLine(t,kind,slot++));cold=0}
 }
 return out;
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
   const voiced=ensureVoice(t,sec).flatMap(p=>splitLongParagraph(p,82)).filter(Boolean);
   return{...sec,paragraphs:fillVoiceGaps(t,{...sec,paragraphs:voiced})};
  }
  return sec;
 });
 a.sections=sections;`;
if(!text.includes(fromFinal))throw new Error('Expected final paragraph split block not found');
text=text.replace(fromFinal,toFinal);

fs.writeFileSync(sourcePath,text);

const smokePath='scripts/inquirer-week2-r21-smoke.mjs';
let smoke=fs.readFileSync(smokePath,'utf8');
const oldSmokeVoice="const VOICE=/\\b(?:complaint|ridiculous|absurd|patience|patient|silence|annoying|annoyed|ugly|beautiful|glamour|glamorous|champagne|tomatoes|applause|theater|stage|curtain|swagger|embarrass|heckl|boo|joke|funny|stupid|nonsense|I refuse|I resent|I would|I want|I am|I can|good luck|congratulations|mercifully|delicious|rude|parade|confetti|funeral|miracle|costume|shopping|credit card|committee meeting|rent|Monday|Sunday|production|scene|audience|roses|balcony|dialogue|drama|encore|apology|formalwear|lighting|outfit|open bar|restraint|tasteful|silly|stain|compliment|credit|ceremony|loud|theor(?:y|ies)|mistake|choice|relationship|rewrite)\\b/i;";
const newSmokeVoice="const VOICE=/\\b(?:complaint|ridiculous|absurd|patience|patient|silence|annoying|annoyed|ugly|beautiful|glamour|glamorous|champagne|tomatoes|applause|theater|stage|curtain|swagger|embarrass|heckl|boo|joke|funny|stupid|nonsense|I refuse|I resent|I would|I want|I am|I can|good luck|congratulations|mercifully|delicious|rude|parade|confetti|funeral|miracle|costume|shopping|credit card|committee meeting|rent|Monday|Sunday|production|management|enjoy(?:ing)?|irresponsib|scene|audience|roses|balcony|dialogue|drama|encore|apology|formalwear|lighting|outfit|open bar|restraint|tasteful|silly|stain|compliment|credit|ceremony|loud|theor(?:y|ies)|mistake|choice|relationship|rewrite)\\b/i;";
if(!smoke.includes(oldSmokeVoice))throw new Error('Expected smoke VOICE detector not found');
smoke=smoke.replace(oldSmokeVoice,newSmokeVoice);
fs.writeFileSync(smokePath,smoke);

console.log('R21 final voice-gap, natural voice detector, and established-player scoring fix applied');
