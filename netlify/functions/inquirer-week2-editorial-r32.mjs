import {applyWeek2EditorialR16 as applyR31} from './inquirer-week2-editorial-r31.mjs';
import {applyWeek2EditorialR16 as applyR28Base} from './inquirer-week2-editorial-r28-base.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const nums=s=>(String(s||'').match(/\b-?\d+(?:\.\d+)?%?\b/g)||[]).length;
const norm=s=>clean(s).toLowerCase();
const BAD=/\b(?:management puzzle|finished in (?:the|that|this) performance|useful production here|strong production|the useful question|competitive math|scoring profile|one completed sunday|clean test|stands on its own|does not need decoration|headline|back page|copy desk|newsroom|typeface|case file|receipts?|scoring app|group chat|notification|screenshot|social media|algorithm|meme|one[- ]man show|solo effort|supporting cast|second punch|third scorer)\b/i;
const STAT=/\b(?:averaged|average|snap share|fantasy points?|yards?|carries|receptions?|targets?|sacks?|assists?|solo|TD|TFL|QB hits?|Week [12] score|scored)\b/i;

const articleWords=t=>words((t?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' '));

function dedupeExact(article){
 const seen=new Set();
 article.sections=(article.sections||[]).map(sec=>{
  const paragraphs=[];
  for(const raw of sec?.paragraphs||[]){
   const kept=[];
   for(const s0 of sentences(raw)){
    const s=clean(s0),k=norm(s);
    if(words(s)>=7&&seen.has(k))continue;
    if(words(s)>=7)seen.add(k);
    kept.push(s);
   }
   const text=clean(kept.join(' '));if(text)paragraphs.push(text);
  }
  return {...sec,paragraphs};
 });
 article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 return article;
}

function safeRows(before){
 const out=[];
 for(const sec of before?.inquirer_article?.sections||[]){
  const label=(String(sec?.kind||'')+' '+String(sec?.heading||'')).toLowerCase();
  const penalty=/management|decision|fix it|cool-throne|deserves credit|fan sentiment|crowd|supporters|outlook|week 3/.test(label)?20:0;
  for(const raw of sec?.paragraphs||[]){
   for(const s0 of sentences(raw)){
    const s=clean(s0),n=words(s);
    if(n<9||n>45||BAD.test(s))continue;
    if(/\b(?:credit|praise|deserve|earned)\b/i.test(s))continue;
    const statPenalty=STAT.test(s)?10:0;
    out.push({kind:String(sec?.kind||''),heading:String(sec?.heading||''),text:s,score:penalty+statPenalty+nums(s)});
   }
  }
 }
 return out.sort((a,b)=>a.score-b.score||words(a.text)-words(b.text));
}

function restoreUnique(after,before){
 const a=after?.inquirer_article;if(!a)return after;
 dedupeExact(a);
 if(articleWords(after)>=760)return after;
 const existing=new Set((a.sections||[]).flatMap(s=>s?.paragraphs||[]).flatMap(sentences).map(norm));
 for(const row of safeRows(before)){
  const k=norm(row.text);if(existing.has(k))continue;
  if(STAT.test(row.text)&&nums(row.text)>=2)continue;
  const target=(a.sections||[]).find(s=>String(s?.kind||'')===row.kind)||
    (a.sections||[]).find(s=>String(s?.heading||'')===row.heading)||
    (a.sections||[]).find(s=>!/(management|decision|cool-throne|fan|crowd|outlook)/i.test(String(s?.kind||'')+' '+String(s?.heading||'')))||
    (a.sections||[])[0];
  if(!target)continue;
  target.paragraphs=[...(target.paragraphs||[]),row.text];
  existing.add(k);
  a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  if(articleWords(after)>=760)break;
 }
 dedupeExact(a);
 return after;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR31(clone(raw));
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 const before=applyR28Base(clone(raw));
 const map=new Map((before?.teams||[]).map(t=>[String(t?.roster_id||''),t]));
 out.teams=(out.teams||[]).map(t=>restoreUnique(t,map.get(String(t?.roster_id||''))||{}));
 out.structure_revision='week2-r32';
 for(const t of out.teams||[])if(t?.inquirer_article)t.inquirer_article.structure_revision='week2-r32';
 if(out.league_overview)out.league_overview.structure_revision='week2-r32';
 return out;
}

export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
