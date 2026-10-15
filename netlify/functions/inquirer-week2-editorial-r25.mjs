import {applyWeek2EditorialR16 as applyWeek2EditorialR24Base} from './inquirer-week2-editorial-r24.mjs';

export const WEEK2_EDITORIAL_REVISION=25;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;

function dedupeParagraphs(paragraphs,seen){
 const out=[];
 for(const p of paragraphs||[]){
  const kept=[];
  for(const s of sentences(p)){
   const k=s.toLowerCase().replace(/\s+/g,' ').trim();
   if(words(s)>=8&&seen.has(k))continue;
   if(words(s)>=8)seen.add(k);
   kept.push(s);
  }
  const next=kept.join(' ').replace(/\s+/g,' ').trim();
  if(next)out.push(next);
 }
 return out;
}

function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;const seen=new Set();
 a.sections=(a.sections||[]).map(sec=>({...sec,paragraphs:dedupeParagraphs(sec?.paragraphs||[],seen)}));
 a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);a.editorial_revision=25;a.voice_revision='week2-r25';return t;
}
function reviseOverview(o){
 if(!o)return o;const seen=new Set();
 o.sections=(o.sections||[]).map(sec=>({...sec,paragraphs:dedupeParagraphs(sec?.paragraphs||[],seen)}));
 o.editorial_revision=25;o.voice_revision='week2-r25';return o;
}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR24Base(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(reviseTeam);out.league_overview=reviseOverview(out.league_overview);out.editorial_revision=25;out.voice_revision='week2-r25';return out;
}

export const applyWeek2EditorialR25=applyWeek2EditorialR16;
export const applyWeek2EditorialR24=applyWeek2EditorialR16;
export const applyWeek2EditorialR23=applyWeek2EditorialR16;
