import {applyWeek2EditorialR16 as applyWeek2EditorialR27Base} from './inquirer-week2-editorial-r27.mjs';

export const WEEK2_EDITORIAL_REVISION=28;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const cleanSpace=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const SCHEDULE_DIFFICULTY=/\b(?:stiffen|rougher|difficult stretch|hard part|hard stretch|hardens|gauntlet|resistance|heavy part|friendlier|friendly part|softer|manageable|forgiving|breathing room|favorable|mercy|soft landing|lowering the volume|mixed|split schedule|split the|uneven|difficulty level|lands in the middle|split screen)\b/i;

const DROP_SENTENCE=[
 /^Fine, this one gets its own argument\.?$/i,
 /^Give me a minute\.?$/i,
 /^I have tomatoes and applause; choose correctly\.?$/i,
 /^Keep what worked; no committee meeting required\.?$/i,
 /^Use the obvious answer and spare me the theory\.?$/i,
 /^I can live with this; alert the historians\.?$/i,
 /^This scene gets its own note\.?$/i,
 /^Keep the player involved and stop turning obvious help into a management puzzle\.?$/i,
 /^Another result in the same direction would turn a trend into something the losing side has to carry around all season\.?$/i,
 /^Those are different jobs and management should know the difference\.?$/i,
 /^The scoreboard even highlighted it for management\.?$/i,
 /^\w+(?:\s+\w+){0,3} (?:finished|ended) in (?:the|that|this) performance\.?$/i,
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
 x=x.replace(/\bthe established baseline says to criticize the week without inventing a role controversy\.?/gi,'The bad week deserves criticism, but one poor Sunday does not erase what this player usually gives the lineup.');
 x=x.replace(/^The prior baseline for ([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3}) is (-?\d+(?:\.\d+)?)\.?$/i,'$1 averaged $2 last season.');
 x=x.replace(/\bestablished baseline\b/gi,'usual level');
 x=x.replace(/\bprior baseline\b/gi,'2025 average');
 x=x.replace(/\bbelow the baseline\b/gi,'below the usual level');
 x=x.replace(/\bthe baseline itself\b/gi,'the usual level itself');
 x=x.replace(/\bbaseline\b/gi,'usual level');
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
 x=x.replace(/\b(?:earned|deserves) clean credit\b/gi,'deserves credit');
 return cleanSpace(x);
}

function compressContextParagraph(p){
 const ss=sentences(p);
 if(ss.length!==2)return p;
 const a=ss[0],b=ss[1];
 const m1=a.match(/^([A-Z][A-Za-z'.-]+) averaged (-?\d+(?:\.\d+)?) fantasy points across (\d+) games in 2025\.?$/i);
 const m2=b.match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3}) (?:played|has expanded from|jumped from|fell from|moved from).+snap share.+$/i);
 if(m1&&m2)return cleanSpace(`${m2[1]} averaged ${m1[2]} fantasy points across ${m1[3]} games in 2025; ${b.replace(new RegExp('^'+esc(m2[1])+'\\s+','i'),'its ')}`);
 return p;
}

function dedupeCredit(ss){
 const out=[];
 const credit=/\b(?:credit|praise|deserve|earned)\b/i;
 for(const s of ss){
  const prev=out.at(-1)||'';
  if(credit.test(prev)&&credit.test(s)&&!/[0-9]/.test(s))continue;
  out.push(s);
 }
 return out;
}

function dedupeArticleCredit(a){
 const credit=/\b(?:credit|praise|deserve|earned)\b/i;
 let prev='';
 a.sections=(a.sections||[]).map(sec=>{
  const paragraphs=[];
  for(const p of sec?.paragraphs||[]){
   const kept=[];
   for(const s of sentences(p)){
    if(credit.test(prev)&&credit.test(s)&&!/[0-9]/.test(s))continue;
    kept.push(s);prev=s;
   }
   const next=cleanSpace(kept.join(' '));
   if(next)paragraphs.push(next);
  }
  return {...sec,paragraphs};
 });
 a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 return a;
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
  if(m)return `${f.name} averaged ${m[1]} in 2025; one bad week does not erase that usual level.`;
  m=x.match(new RegExp(`^Week 2 gave ${esc(f.name)} ${score} against a ([-0-9.]+) prior-season average\\.?$`,'i'));
  if(m)return `${f.name} entered the week with a ${m[1]} prior-season average; one poor result does not erase what he usually gives this lineup.`;
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
  for(const raw of sec?.paragraphs||[]){
   let kept=[];
   for(let s of sentences(raw)){
    s=rewriteRepeatedFact(s,facts);
    if(!s)continue;
    s=naturalizeSentence(s);
    if(/management puzzle/i.test(s))continue;
    if(hasNoBenchAnswer&&isManagement&&/did not leave an obvious higher-scoring bench answer in a compatible spot/i.test(s))s=s.replace(/;\s*management had seven days.*$/i,'.');
    if(!s||DROP_SENTENCE.some(re=>re.test(s)))continue;
    if(hasNoBenchAnswer&&isManagement&&/\b(?:blam|person who chose the lineup|cute bad decision|tomatoes|avoid looking silly|management had seven days)\b/i.test(s))continue;
    if(/\b(?:player|starter) still has homework\b/i.test(s))s=s.replace(/\b(?:player|starter) still has homework\b/i,'performance still needs a better answer');
    kept.push(cleanSpace(s));
   }
   kept=dedupeCredit(kept);
   let next=cleanSpace(kept.join(' '));
   if(/players?|names|people/i.test(String(sec?.kind||'')+' '+String(sec?.heading||'')))next=compressContextParagraph(next);
   if(next)paragraphs.push(next);
  }
  return {...sec,paragraphs};
 });
 dedupeArticleCredit(a);
 a.editorial_revision=28;a.voice_revision='week2-r28';return t;
}

function removeCrossTeamBoilerplate(teams){
 const seen=new Map();
 for(const t of teams){
  for(const sec of t?.inquirer_article?.sections||[]){
   for(const p of sec?.paragraphs||[]){
    for(const s of sentences(p)){
     if(words(s)<8||SCHEDULE_DIFFICULTY.test(s))continue;
     const key=cleanSpace(s).toLowerCase();
     const set=seen.get(key)||new Set();set.add(String(t.team_name||''));seen.set(key,set);
    }
   }
  }
 }
 const banned=new Set([...seen].filter(([,set])=>set.size>=3).map(([key])=>key));
 if(!banned.size)return teams;
 for(const t of teams){
  const a=t?.inquirer_article;if(!a)continue;
  a.sections=(a.sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>cleanSpace(sentences(p).filter(s=>SCHEDULE_DIFFICULTY.test(s)||!banned.has(cleanSpace(s).toLowerCase())).join(' '))).filter(Boolean)}));
  dedupeArticleCredit(a);
 }
 return teams;
}

function normalizeScheduleRoadPosition(t){
 const a=t?.inquirer_article;if(!a)return t;
 const outlook=(a.sections||[]).find(sec=>String(sec?.kind||'')==='outlook');
 const paragraphs=outlook?.paragraphs;if(!Array.isArray(paragraphs)||paragraphs.length<2)return t;
 const later=(t?.upcoming_opponents||[]).slice().sort((x,y)=>Number(x?.week)-Number(y?.week)).slice(1,3);
 if(!later.length)return t;
 const idx=paragraphs.findIndex(p=>SCHEDULE_DIFFICULTY.test(String(p||''))&&later.every(x=>String(p||'').toLowerCase().includes(String(x?.team_name||'').toLowerCase()))&&/Week 3|win|bank|beat|handle/i.test(String(p||'')));
 if(idx<0||idx===paragraphs.length-2)return t;
 const [road]=paragraphs.splice(idx,1);
 paragraphs.splice(Math.max(0,paragraphs.length-1),0,road);
 a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 return t;
}

function ensureCoolThroneRecognition(t){
 const a=t?.inquirer_article;if(!a)return t;
 const cool=(a.sections||[]).find(sec=>String(sec?.kind||'')==='cool-throne');
 if(!cool||!Array.isArray(cool.paragraphs)||!cool.paragraphs.length)return t;
 const eligible=(t?.starter_details||[]).filter(p=>{
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),proj=Number(p?.projected),delta=Number.isFinite(proj)?pts-proj:null;
  return Number.isFinite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
 }).sort((x,y)=>Number(y?.points)-Number(x?.points)).slice(0,2);
 if(eligible.length<2)return t;
 const names=eligible.map(p=>String(p?.name||'').trim()).filter(Boolean);
 if(names.length<2)return t;
 const copy=cool.paragraphs.join(' ').toLowerCase();
 if(names.every(name=>copy.includes(name.toLowerCase())))return t;
 const first=names.find(name=>String(cool.paragraphs[0]||'').toLowerCase().includes(name.toLowerCase()));
 if(first)cool.paragraphs[0]=cleanSpace(String(cool.paragraphs[0]).replace(first,`${names[0]} and ${names[1]}`));
 else cool.paragraphs[0]=cleanSpace(`${names[0]} and ${names[1]} both earned recognition here. ${cool.paragraphs[0]}`);
 a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 return t;
}

const RECAP_VOICE={
 'walter-mercer':[
  'I care more about what this changes next Sunday than how tidy the record looks tonight.',
  'The score matters; the decision behind it is what deserves another look.',
  'That is where the argument belongs, because standings alone can hide a lousy process.'
 ],
 'tess-delaney':[
  'Enjoy the result, sure, but nobody gets a parade for surviving an opponent’s bad Sunday.',
  'If management wants applause, it can earn some without borrowing it from the other team’s collapse.',
  'Fantasy football hands out wins and then rudely asks how they happened.'
 ],
 'mack-hollis':[
  'I can applaud the result and still boo the way it arrived; both reactions fit.',
  'A win can look handsome from across the room and deeply suspicious up close.',
  'The score gets the curtain call; the decisions still have to survive the review.'
 ],
 'nora-voss':[
  'I am not giving management credit for an opponent having the worse Sunday.',
  'The result matters, but the decision behind it is the part I would question first.',
  'A clean record does not make a bad lineup choice disappear.'
 ]
};

function reviseOverview(o){
 if(!o)return o;
 o.sections=(o.sections||[]).map(sec=>{
  const rid=String(sec?.reporter?.id||''),voice=RECAP_VOICE[rid]||[];
  const paragraphs=(sec?.paragraphs||[]).map((p,i)=>{
   let x=String(p||'');
   x=x.replace(/\bfavorite'?s badge\b/gi,'favorite label');
   x=x.replace(/\bthe scoring profile eventually collects the debt\b/gi,'weak scoring eventually catches up with the record');
   x=x.replace(/\bI want the numbers tied to a football consequence: the decision-making tells me who actually learned anything\.?/gi,'The useful question is whether the next lineup reflects what this week exposed.');
   x=x.replace(/\brepeat the good process and remove the avoidable mistake\b/gi,'keep what worked and fix what did not');
   x=x.replace(/\bkeep matching receipts\b/gi,'keep matching results');
   x=cleanSpace(x);
   const add=voice[i%voice.length];
   if(add&&words(x)<=70&&sentences(x).length<4&&!/\bI\b|\brefuse\b|\bapplause\b|\bboo\b/i.test(x))x=cleanSpace(`${x} ${add}`);
   return x;
  }).filter(Boolean);
  return {...sec,paragraphs};
 });
 o.editorial_revision=28;o.voice_revision='week2-r28';return o;
}

function repairMiamiWeek2Copy(t){
 if(String(t?.team_name||'').toLowerCase()!=='miami dolphins')return t;
 const a=t?.inquirer_article;if(!a)return t;
 a.sections=(a.sections||[]).map(sec=>({...sec,paragraphs:(sec.paragraphs||[]).map(p=>{
  let x=String(p||'');
  x=x.replace('turns 2-0 into a parade route after fourteen days','turns a 1-1 record into a parade route after two weeks');
  x=x.replace('explaining a 2-0 fantasy record','explaining a 1-1 fantasy record');
  x=x.replace('3 carries, 30 rush yds, 1 rush Enjoy','3 carries and 30 rushing yards. Enjoy');
  x=x.replace('7/9 rec, 75 yds, 2 Take','7 catches on 9 targets and 75 receiving yards. Take');
  x=x.replace('Nik Bonitto gave Dolphins 7.5 points on 3.','Nik Bonitto gave Dolphins 7.5 fantasy points. That modest return left the defense with ground to make up.');
  x=x.replace('Week 2 performance. praise is unavoidable','Week 2 performance. Praise is unavoidable');
  x=x.replace('After 142.4 points, the crowd has decided restraint is for teams with worse records and fewer screenshots of the standings.','After 142.4 points, the crowd has decided restraint is for teams that lost. At 1-1, Miami has reclaimed some breathing room, but one victory cannot settle a season.');
  return x;
 })}));
 a.paragraphs=a.sections.flatMap(sec=>sec.paragraphs||[]).filter(Boolean);
 return t;
}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR27Base(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=removeCrossTeamBoilerplate((out.teams||[]).map(reviseTeam)).map(normalizeScheduleRoadPosition).map(ensureCoolThroneRecognition).map(repairMiamiWeek2Copy);
 out.league_overview=reviseOverview(out.league_overview);
 out.editorial_revision=28;out.voice_revision='week2-r28';return out;
}
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
export const applyWeek2EditorialR27=applyWeek2EditorialR16;
