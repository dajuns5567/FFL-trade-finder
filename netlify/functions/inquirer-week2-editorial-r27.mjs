import {applyWeek2EditorialR16 as applyWeek2EditorialR26Base} from './inquirer-week2-editorial-r26.mjs';

export const WEEK2_EDITORIAL_REVISION=27;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function canonicalScores(article){
 const rows=[];
 const all=(article?.sections||[]).flatMap(sec=>sec?.paragraphs||[]).flatMap(sentences);
 for(const s of all){
  const m=s.match(/^Against .+?,\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+scored\s+(-?\d+(?:\.\d+)?)\s+fantasy points/i);
  if(m)rows.push({name:m[1],score:m[2],canonical:s});
 }
 for(const s of all){
  let m=s.match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+had a bad Week 2 at\s+(-?\d+(?:\.\d+)?)\s+points?\b/i);
  if(!m)m=s.match(/^The problem with\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+is plain:\s+(-?\d+(?:\.\d+)?)\s+in Week 2\b/i);
  if(m&&!rows.some(r=>r.name.toLowerCase()===m[1].toLowerCase()))rows.push({name:m[1],score:m[2],canonical:s});
 }
 return rows;
}
function scorePattern(score){return `(^|[^0-9.])${esc(score)}(?![0-9]|\\.[0-9])`}
function literalScore(sentence,score){
 return new RegExp(scorePattern(score)).test(String(sentence||''));
}
function stripScore(sentence,row){
 let x=String(sentence||'').trim(),e=esc(row.score),n=esc(row.name);
 x=x.replace(new RegExp(`^A\\s+${e}\\s+day from\\s+${n}\\b`,'i'),`${row.name}'s Week 2 performance`);
 x=x.replace(new RegExp(`^${n}\\s+gets the (?:love|praise) after\\s+${e}\\.?$`,'i'),`${row.name} earned the praise for that performance.`);
 x=x.replace(new RegExp(`^${n}\\s+earns? clean credit at\\s+${e}\\.?$`,'i'),`${row.name} earned clean credit for that performance.`);
 x=x.replace(new RegExp(`^${n}\\s+dropped\\s+${e},?\\s*`,'i'),`${row.name} gave the fans a performance worth celebrating, `);
 x=x.replace(new RegExp(`^${n}\\s+(?:gave the lineup|scored|posted|delivered)\\s+${e}\\.?$`,'i'),'');
 x=x.replace(new RegExp(`^${n}\\s+at\\s+${e}\\s+is specific enough`,'i'),`${row.name}'s bad Sunday is specific enough`);
 x=x.replace(new RegExp(`\\b${e}\\s+in Week 2 was not enough`,'i'),'the Week 2 performance was not enough');
 x=x.replace(new RegExp(`(^|[^0-9.])${e}\\s+(?:fantasy\\s+)?points?\\b`,'g'),'$1that performance');
 x=x.replace(new RegExp(scorePattern(row.score),'g'),'$1that performance');
 x=x.replace(/\bthat performance\s+(?:day|score|total|number)\b/gi,'that performance');
 x=x.replace(/\bafter that performance\b/gi,'after the performance');
 x=x.replace(/\bat that performance\b/gi,'in that performance');
 return x.replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
}
function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;const rows=canonicalScores(a);
 a.sections=(a.sections||[]).map(sec=>{const paragraphs=[];
  for(const p of sec?.paragraphs||[]){const kept=[];
   for(let s of sentences(p)){
    const row=rows.find(r=>s.toLowerCase().includes(r.name.toLowerCase())&&literalScore(s,r.score));
    if(row&&s!==row.canonical){s=stripScore(s,row);if(!s)continue}
    if(/^Management should treat the role like something worth keeping\.?$/i.test(s))continue;
    kept.push(s);
   }
   const next=kept.join(' ').replace(/\s+/g,' ').trim();if(next)paragraphs.push(next);
  }
  return{...sec,paragraphs};
 });
 a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);a.editorial_revision=27;a.voice_revision='week2-r27';return t;
}
function reviseOverview(o){
 if(!o)return o;
 o.sections=(o.sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>String(p||'')
  .replace('A clean record can still come from an ugly Sunday. Judge the performance before praising the record.','A clean record can still come from an ugly Sunday, so judge the performance before praising the record.')
  .replace('I refuse to praise the record if the lineup played badly. The score still matters.','I refuse to praise the record if the lineup played badly; the score still matters.')
  .replace(/\s+/g,' ').trim()).filter(Boolean)}));
 o.editorial_revision=27;o.voice_revision='week2-r27';return o;
}
export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR26Base(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(reviseTeam);out.league_overview=reviseOverview(out.league_overview);out.editorial_revision=27;out.voice_revision='week2-r27';return out;
}
export const applyWeek2EditorialR27=applyWeek2EditorialR16;
export const applyWeek2EditorialR26=applyWeek2EditorialR16;
