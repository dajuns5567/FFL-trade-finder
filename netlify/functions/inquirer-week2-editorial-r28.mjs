import {applyWeek2EditorialR16 as applyWeek2EditorialR27Base} from './inquirer-week2-editorial-r27.mjs';

export const WEEK2_EDITORIAL_REVISION=28;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const cleanSpace=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const DROP_SENTENCE=[
 /^Fine, this one gets its own argument\.?$/i,
 /^Give me a minute\.?$/i,
 /^I have tomatoes and applause; choose correctly\.?$/i,
 /^Keep what worked; no committee meeting required\.?$/i,
 /^Use the obvious answer and spare me the theory\.?$/i,
 /^I can live with this; alert the historians\.?$/i,
 /^This scene gets its own note\.?$/i,
 /^\w+(?:\s+\w+){0,3} got (?:enough )?useful production here(?: that I can save one complaint for later)?\.?$/i,
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
 x=x.replace(/\bCriticize the bad week, fix the usage, and do not pretend one ugly Sunday erased an established track record\.?/gi,'Criticize the bad week without inventing a role problem from one ugly Sunday.');
 x=x.replace(/^Week 3 needs either better production or a different plan\.?$/i,'Week 3 needs better production; the role only becomes a management question if the usage changes.');
 return cleanSpace(x);
}

function scoreFacts(article){
 const all=(article?.sections||[]).flatMap(sec=>sec?.paragraphs||[]).flatMap(sentences);
 const facts=[];
 const add=(name,score,canonical)=>{if(!name||score==null)return;const key=name.toLowerCase()+'|'+score;if(!facts.some(f=>f.key===key))facts.push({key,name,score:String(score),canonical})};
 for(const s of all){
  let m=s.match(/^Against .+?,\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+scored\s+(-?\d+(?:\.\d+)?)\s+fantasy points/i);if(m){add(m[1],m[2],s);continue}
  m=s.match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+scored\s+(-?\d+(?:\.\d+)?)\s+in both Week 1 and Week 2/i);if(m){add(m[1],m[2],s);continue}
  m=s.match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+(?:fell|improved) from\s+-?\d+(?:\.\d+)?\s+in Week 1 to\s+(-?\d+(?:\.\d+)?)\s+in Week 2/i);if(m){add(m[1],m[2],s);continue}
  m=s.match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+had a bad Week 2 at\s+(-?\d+(?:\.\d+)?)\s+points?/i);if(m){add(m[1],m[2],s);continue}
  m=s.match(/^The problem with\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+is plain:\s+(-?\d+(?:\.\d+)?)\s+in Week 2/i);if(m){add(m[1],m[2],s);continue}
  m=s.match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+at\s+(-?\d+(?:\.\d+)?)\b/i);if(m)add(m[1],m[2],s);
 }
 return facts;
}

function rewriteRepeatedFact(s,facts){
 let x=String(s||'').trim(),low=x.toLowerCase();
 for(const f of facts){
  if(!low.includes(f.name.toLowerCase())||x===f.canonical)continue;
  const score=esc(f.score),re=new RegExp(`(^|[^0-9.])${score}(?![0-9]|\\.[0-9])`);
  if(!re.test(x))continue;
  let m=x.match(new RegExp(`^${esc(f.name)} came from ([-0-9.]+) (?:per game|average) in 2025 and landed at ${score} this week\\.?$`,'i'));
  if(m)return `${f.name} averaged ${m[1]} in 2025; one bad week does not erase that baseline.`;
  m=x.match(new RegExp(`^Week 2 gave ${esc(f.name)} ${score} against a ([-0-9.]+) prior-season average\\.?$`,'i'));
  if(m)return `${f.name} entered the week with a ${m[1]} prior-season average; one poor result does not erase the established baseline.`;
  m=x.match(new RegExp(`^Compare ${score} now with ([-0-9.]+) last season for ${esc(f.name)}\\.?$`,'i'));
  if(m)return `${f.name} averaged ${m[1]} last season. One poor week is worth criticizing without inventing a new role problem.`;
  if(new RegExp(`^${esc(f.name)} at ${score}\\b`,'i').test(x))return '';
  if(/\b(?:landed at|Week 2 gave|finished at|posted|scored)\b/i.test(x))return '';
 }
 return x;
}

function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;
 const facts=scoreFacts(a);
 const hasNoBenchAnswer=(a.sections||[]).some(sec=>(sec?.paragraphs||[]).some(p=>/did not leave an obvious higher-scoring bench answer in a compatible spot/i.test(String(p||''))));
 a.sections=(a.sections||[]).map(sec=>{
  const isManagement=/management|decision|fix it/i.test(String(sec?.heading||''));
  const paragraphs=[];
  for(const p of sec?.paragraphs||[]){
   const kept=[];
   for(let s of sentences(p)){
    s=rewriteRepeatedFact(s,facts);
    if(!s)continue;
    s=naturalizeSentence(s);
    if(hasNoBenchAnswer&&isManagement&&/did not leave an obvious higher-scoring bench answer in a compatible spot/i.test(s))s=s.replace(/;\s*management had seven days.*$/i,'.');
    if(!s||DROP_SENTENCE.some(re=>re.test(s)))continue;
    if(hasNoBenchAnswer&&isManagement&&/\b(?:blam|person who chose the lineup|cute bad decision|tomatoes|avoid looking silly|management had seven days)\b/i.test(s))continue;
    if(/\b(?:player|starter) still has homework\b/i.test(s))s=s.replace(/\b(?:player|starter) still has homework\b/i,'performance still needs a better answer');
    kept.push(cleanSpace(s));
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
