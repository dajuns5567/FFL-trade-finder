import {applyWeek2EditorialR16 as applyR29Base} from './inquirer-week2-editorial-r29-base.mjs';
import {applyWeek2EditorialR16 as applyR28Base} from './inquirer-week2-editorial-r28-base.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const numericCount=s=>(String(s||'').match(/\b-?\d+(?:\.\d+)?%?\b/g)||[]).length;

const BAD=/\b(?:management puzzle|finished in (?:the|that|this) performance|useful production here|strong production|the useful question|competitive math|scoring profile|one completed sunday|clean test|stands on its own|does not need decoration|headline|back page|copy desk|newsroom|typeface|case file|receipts?|scoring app|group chat|notification|screenshot|social media|algorithm|meme|one[- ]man show|solo effort|supporting cast|second punch|third scorer)\b/i;

function articleWords(team){
 return words((team?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' '));
}

function safeCandidateParagraphs(team){
 const out=[];
 for(const sec of team?.inquirer_article?.sections||[]){
  const label=(String(sec?.kind||'')+' '+String(sec?.heading||'')).toLowerCase();
  if(/management|decision|fix it|cool-throne|deserves credit|fan sentiment|crowd|supporters|outlook|week 3/.test(label))continue;
  for(const raw of sec?.paragraphs||[]){
   const p=clean(raw);
   const n=words(p);
   if(n<18||n>65)continue;
   if(numericCount(p)>2)continue;
   if(BAD.test(p))continue;
   if(/\b(?:credit|praise|deserve|earned)\b/i.test(p))continue;
   out.push({kind:String(sec?.kind||''),heading:String(sec?.heading||''),text:p});
  }
 }
 return out;
}

function restoreDepth(after,before){
 const a=after?.inquirer_article;
 if(!a||articleWords(after)>=760)return after;
 const existing=new Set((a.sections||[]).flatMap(s=>s?.paragraphs||[]).map(x=>clean(x).toLowerCase()));
 for(const candidate of safeCandidateParagraphs(before)){
  const key=candidate.text.toLowerCase();
  if(existing.has(key))continue;
  const target=(a.sections||[]).find(s=>String(s?.kind||'')===candidate.kind)||
    (a.sections||[]).find(s=>String(s?.heading||'')===candidate.heading)||
    (a.sections||[]).find(s=>!/(management|decision|cool-throne|fans?|outlook)/i.test(String(s?.kind||'')+' '+String(s?.heading||'')));
  if(!target)continue;
  target.paragraphs=[...(target.paragraphs||[]),candidate.text];
  existing.add(key);
  a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  if(articleWords(after)>=760)break;
 }
 return after;
}

export function applyWeek2EditorialR16(raw){
 const structural=applyR29Base(clone(raw));
 if(!structural||Number(structural.season)!==2026||Number(structural.week)!==2)return structural;
 const before=applyR28Base(clone(raw));
 const priorByRoster=new Map((before?.teams||[]).map(t=>[String(t?.roster_id||''),t]));
 structural.teams=(structural.teams||[]).map(t=>restoreDepth(t,priorByRoster.get(String(t?.roster_id||''))||{}));
 structural.structure_revision='week2-r30';
 for(const t of structural.teams||[])if(t?.inquirer_article)t.inquirer_article.structure_revision='week2-r30';
 if(structural.league_overview)structural.league_overview.structure_revision='week2-r30';
 return structural;
}

export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
