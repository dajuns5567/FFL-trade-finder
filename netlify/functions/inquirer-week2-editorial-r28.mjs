import {applyWeek2EditorialR16 as applyWeek2EditorialR27Base} from './inquirer-week2-editorial-r27.mjs';

export const WEEK2_EDITORIAL_REVISION=28;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const cleanSpace=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();

const DROP_SENTENCE=[
 /^Fine, this one gets its own argument\.?$/i,
 /^Give me a minute\. I have tomatoes and applause; choose correctly\.?$/i,
 /^Keep what worked; no committee meeting required\.?$/i,
 /^Use the obvious answer and spare me the theory\.?$/i,
 /^I can live with this; alert the historians\.?$/i,
 /^This scene gets its own note\.?$/i,
 /^Patriots got useful production here\. Good\.?$/i,
 /^\w+(?:\s+\w+){0,3} got useful production here\. Good\.?$/i,
 /^\w+(?:\s+\w+){0,3} produced something worth enjoying here\.?$/i,
 /^The smart move is to use what worked instead of inventing a theory around it\.?$/i,
 /^Management should resist the traditional urge to make that more complicated than necessary\.?$/i,
 /^The useful question for .+ after two weeks has changed from what happened to which parts are likely to happen again\.?$/i
];

function naturalizeSentence(s){
 let x=String(s||'').trim();
 x=x.replace(/\s+on a real-football line of\s+/gi,': ');
 x=x.replace(/\s+on a fantasy-football line of\s+/gi,': ');
 x=x.replace(/^A that performance afternoon from ([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\b/i,'That performance from $1');
 x=x.replace(/^that performance belongs next to\s+/i,'That performance belongs next to ');
 x=x.replace(/\b([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3}) have a useful player line on the page, and I refuse to ruin every nice thing immediately\.?/gi,'$1 gave me something worth praising, and I refuse to ruin every nice thing immediately.');
 x=x.replace(/\b([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3}) has a useful player line on the page, and I refuse to ruin every nice thing immediately\.?/gi,'$1 gave me something worth praising, and I refuse to ruin every nice thing immediately.');
 x=x.replace(/\bthe weak spot for ([A-Za-z0-9' -]+) are obvious\b/gi,'the weak spot for $1 is obvious');
 x=x.replace(/\bMy standard for ([A-Za-z0-9' -]+) are getting simpler\b/gi,'My standard for $1 is getting simpler');
 x=x.replace(/\bThe next opponent for ([A-Za-z0-9' -]+) are\b/gi,'The next opponent for $1 is');
 x=x.replace(/\b([A-Z][A-Za-z0-9' -]+) either handles\b/g,'$1 either handle');
 x=x.replace(/\bFootball around ([A-Za-z0-9' -]+) are already\b/gi,'Football around $1 is already');
 x=x.replace(/\b([A-Z][A-Za-z0-9' -]+) does not need another explanation for the lineup\b/g,'$1 do not need another explanation for the lineup');
 x=x.replace(/\bFor ([A-Za-z0-9' -]+), good\.?/gi,'Good.');
 x=x.replace(/\bthe production materially changed the matchup\b/gi,'the performance changed the matchup');
 return cleanSpace(x);
}

function removeScoreRestatements(article){
 const all=(article?.sections||[]).flatMap(sec=>sec?.paragraphs||[]).flatMap(sentences);
 const facts=[];
 for(const s of all){
  const m=s.match(/^Against .+?,\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+scored\s+(-?\d+(?:\.\d+)?)\s+fantasy points/i);
  if(m)facts.push({name:m[1],score:m[2],canonical:s});
 }
 return facts;
}

function redundantPlayerSentence(s,facts){
 const low=String(s||'').toLowerCase();
 for(const f of facts){
  if(!low.includes(f.name.toLowerCase()))continue;
  const score=f.score.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(`(^|[^0-9.])${score}(?![0-9]|\\.[0-9])`);
  if(!re.test(s)||s===f.canonical)continue;
  if(/\b(?:at|after|landed at|week 2 gave|finished at|posted|scored)\b/i.test(s))return true;
 }
 return false;
}

function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;
 const facts=removeScoreRestatements(a);
 const hasNoBenchAnswer=(a.sections||[]).some(sec=>(sec?.paragraphs||[]).some(p=>/did not leave an obvious higher-scoring bench answer in a compatible spot/i.test(String(p||''))));
 a.sections=(a.sections||[]).map(sec=>{
  const isManagement=/management|decision|fix it/i.test(String(sec?.heading||''));
  const paragraphs=[];
  for(const p of sec?.paragraphs||[]){
   const kept=[];
   for(let s of sentences(p)){
    s=naturalizeSentence(s);
    if(!s||DROP_SENTENCE.some(re=>re.test(s)))continue;
    if(redundantPlayerSentence(s,facts))continue;
    if(hasNoBenchAnswer&&isManagement&&/\b(?:blam|person who chose the lineup|cute bad decision|tomatoes|avoid looking silly|management had seven days)\b/i.test(s))continue;
    if(/\b(?:player|starter) still has homework\b/i.test(s))s=s.replace(/\b(?:player|starter) still has homework\b/i,'performance still needs a better answer');
    kept.push(s);
   }
   const next=cleanSpace(kept.join(' '));if(next)paragraphs.push(next);
  }
  return {...sec,paragraphs};
 });
 a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 a.editorial_revision=28;a.voice_revision='week2-r28';return t;
}

function reviseOverview(o){
 if(!o)return o;
 o.sections=(o.sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>{
  let x=String(p||'');
  x=x.replace(/\bfavorite'?s badge\b/gi,'favorite label');
  x=x.replace(/\bthe scoring profile eventually collects the debt\b/gi,'weak scoring eventually catches up with the record');
  x=x.replace(/\bI want the numbers tied to a football consequence: the decision-making tells me who actually learned anything\.?/gi,'The useful question is whether the next lineup reflects what this week exposed.');
  x=x.replace(/\brepeat the good process and remove the avoidable mistake\b/gi,'keep what worked and fix what did not');
  return cleanSpace(x);
 }).filter(Boolean)}));
 o.editorial_revision=28;o.voice_revision='week2-r28';return o;
}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR27Base(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(reviseTeam);
 out.league_overview=reviseOverview(out.league_overview);
 out.editorial_revision=28;out.voice_revision='week2-r28';return out;
}
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
export const applyWeek2EditorialR27=applyWeek2EditorialR16;
