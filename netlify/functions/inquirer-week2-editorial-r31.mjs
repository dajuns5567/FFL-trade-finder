import {applyWeek2EditorialR16 as applyR30} from './inquirer-week2-editorial-r30.mjs';
import {applyWeek2EditorialR16 as applyR28Base} from './inquirer-week2-editorial-r28-base.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const numCount=s=>(String(s||'').match(/\b-?\d+(?:\.\d+)?%?\b/g)||[]).length;
const BAD=/\b(?:management puzzle|finished in (?:the|that|this) performance|useful production here|strong production|the useful question|competitive math|scoring profile|one completed sunday|clean test|stands on its own|does not need decoration|headline|back page|copy desk|newsroom|typeface|case file|receipts?|scoring app|group chat|notification|screenshot|social media|algorithm|meme|one[- ]man show|solo effort|supporting cast|second punch|third scorer)\b/i;

const articleWords=t=>words((t?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' '));

function candidates(before){
 const rows=[];
 for(const sec of before?.inquirer_article?.sections||[]){
  const label=(String(sec?.kind||'')+' '+String(sec?.heading||'')).toLowerCase();
  const penalty=/management|decision|fix it|cool-throne|deserves credit|fan sentiment|crowd|supporters|outlook|week 3/.test(label)?20:0;
  for(const raw of sec?.paragraphs||[]){
   const text=clean(raw),n=words(text);
   if(n<18||n>85||BAD.test(text))continue;
   if(/\b(?:credit|praise|deserve|earned)\b/i.test(text))continue;
   rows.push({kind:String(sec?.kind||''),heading:String(sec?.heading||''),text,score:penalty+numCount(text)});
  }
 }
 return rows.sort((a,b)=>a.score-b.score||words(a.text)-words(b.text));
}

function restore(after,before){
 const a=after?.inquirer_article;
 if(!a||articleWords(after)>=760)return after;
 const existing=new Set((a.sections||[]).flatMap(s=>s?.paragraphs||[]).map(x=>clean(x).toLowerCase()));
 for(const row of candidates(before)){
  if(existing.has(row.text.toLowerCase()))continue;
  const target=(a.sections||[]).find(s=>String(s?.kind||'')===row.kind)||
    (a.sections||[]).find(s=>String(s?.heading||'')===row.heading)||
    (a.sections||[])[0];
  if(!target)continue;
  target.paragraphs=[...(target.paragraphs||[]),row.text];
  existing.add(row.text.toLowerCase());
  a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  if(articleWords(after)>=760)break;
 }
 return after;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR30(clone(raw));
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 const before=applyR28Base(clone(raw));
 const map=new Map((before?.teams||[]).map(t=>[String(t?.roster_id||''),t]));
 out.teams=(out.teams||[]).map(t=>restore(t,map.get(String(t?.roster_id||''))||{}));
 out.structure_revision='week2-r31';
 for(const t of out.teams||[])if(t?.inquirer_article)t.inquirer_article.structure_revision='week2-r31';
 return out;
}

export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
