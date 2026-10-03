import {applyWeek2EditorialR16 as applyWeek2EditorialR25Base} from './inquirer-week2-editorial-r25.mjs';

export const WEEK2_EDITORIAL_REVISION=26;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function scoreMapFromArticle(article){
 const map=new Map();
 for(const s of (article?.sections||[]).flatMap(sec=>sec?.paragraphs||[]).flatMap(sentences)){
  const m=s.match(/^Against .+?,\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+scored\s+(-?\d+(?:\.\d+)?)\s+fantasy points/i);
  if(m)map.set(m[1].toLowerCase(),{name:m[1],score:m[2]});
 }
 return map;
}
function hasName(s,name){const low=s.toLowerCase(),needle=name.toLowerCase(),i=low.indexOf(needle);if(i<0)return false;return !/[A-Za-z]/.test(s[i-1]||'')&&!/[A-Za-z]/.test(s[i+name.length]||'')}
function hasExactScore(s,score){return new RegExp(`(^|[^0-9.])${esc(score)}(?![0-9.])`).test(s)}
function rewriteLaterScore(s,name,score){
 let x=String(s||'').trim(),e=esc(score),n=esc(name);
 x=x.replace(new RegExp(`^A\\s+${e}\\s+day from\\s+${n}\\b`,'i'),`${name}'s Week 2 performance`);
 x=x.replace(new RegExp(`^${n}\\s+gets the (?:love|praise) after\\s+${e}\\.?$`,'i'),`${name} earned the praise for that performance.`);
 x=x.replace(new RegExp(`^${n}\\s+earns? clean credit at\\s+${e}\\.?$`,'i'),`${name} earned clean credit for that performance.`);
 x=x.replace(new RegExp(`^${n}\\s+dropped\\s+${e},?\\s*`,'i'),`${name} gave the fans a performance worth celebrating, `);
 x=x.replace(new RegExp(`^${n}\\s+(?:gave the lineup|scored|posted|delivered)\\s+${e}\\.?$`,'i'),'');
 x=x.replace(new RegExp(`^${n}\\s+at\\s+${e}\\s+is specific enough`,'i'),`${name}'s bad Sunday is specific enough`);
 x=x.replace(new RegExp(`\\b${e}\\s+in Week 2 was not enough`,'i'),'the Week 2 performance was not enough');
 return x.replace(/\s+/g,' ').trim();
}
function dedupeArticleScores(t){
 const a=t?.inquirer_article;if(!a)return t;const scoreMap=scoreMapFromArticle(a),seen=new Set();
 const order=[...a.sections.keys()].sort((i,j)=>String(a.sections[i]?.kind||'')==='players'?-1:String(a.sections[j]?.kind||'')==='players'?1:i-j),rewritten=new Map();
 for(const idx of order){const sec=a.sections[idx],paras=[];
  for(const p of sec?.paragraphs||[]){const kept=[];
   for(let s of sentences(p)){
    let matched=null;
    for(const row of scoreMap.values())if(hasName(s,row.name)&&hasExactScore(s,row.score)){matched=row;break}
    if(matched){const k=matched.name.toLowerCase();if(seen.has(k)){s=rewriteLaterScore(s,matched.name,matched.score);if(!s)continue}else seen.add(k)}
    kept.push(s);
   }
   const next=kept.join(' ').replace(/\s+/g,' ').trim();if(next)paras.push(next);
  }
  rewritten.set(idx,{...sec,paragraphs:paras});
 }
 a.sections=a.sections.map((s,i)=>rewritten.get(i)||s);a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);a.editorial_revision=26;a.voice_revision='week2-r26';return t;
}
function reviseOverview(o){if(!o)return o;o.editorial_revision=26;o.voice_revision='week2-r26';return o}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR25Base(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(dedupeArticleScores);out.league_overview=reviseOverview(out.league_overview);out.editorial_revision=26;out.voice_revision='week2-r26';return out;
}
export const applyWeek2EditorialR26=applyWeek2EditorialR16;
export const applyWeek2EditorialR25=applyWeek2EditorialR16;
