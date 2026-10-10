import {applyWeek2EditorialR16 as applyWeek2EditorialR28Base} from './inquirer-week2-editorial-r28-base.mjs';

const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;

const ABSTRACT_DROP=[
 /\bresult and a process to judge separately\b/i,
 /\bstop calling every .* mistake random\b/i,
 /\bthe scoreboard keeps sending .* itemized reasons\b/i,
 /\bsupporters have located the problem\b/i,
 /\bthe market moved\. fine\. the scoreboard still gets the final vote\b/i,
 /\bweak week 2 slot stays quiet\b/i,
 /\bmanagement puzzle\b/i,
 /\bfinished in (?:the|that|this) performance\b/i,
 /\buseful production here\b/i,
 /\bstrong production\b/i,
 /\bthe useful question\b/i,
 /\bcompetitive math\b/i,
 /\bscoring profile\b/i,
 /\bone completed sunday\b/i,
 /\bclean test\b/i,
 /\bstands on its own\b/i,
 /\bdoes not need decoration\b/i
];

function classify(sec){
 const x=(String(sec?.kind||'')+' '+String(sec?.heading||'')).toLowerCase();
 if(String(sec?.kind||'')==='cool-throne'||/deserves credit|cool throne|somebody deserves/.test(x))return'credit';
 if(String(sec?.kind||'')==='outlook'||/outlook|what comes next|week 3|next/.test(x))return'outlook';
 if(/crowd|fan sentiment|fans|supporters/.test(x))return'fans';
 if(/management|decision|fix it|before it becomes/.test(x))return'management';
 if(/players?|names|people|thing everybody saw|rivals have to respect/.test(x))return'players';
 return'other';
}

function playerRows(team){
 return (team?.starter_details||[]).map(p=>({
  name:String(p?.name||'').trim(),
  points:Number(p?.points),
  prior:Number(p?.prior_season_avg),
  projected:Number(p?.projected),
  snap:Number(p?.snap_share),
  priorSnap:Number(p?.prior_season_snap_share)
 })).filter(p=>p.name);
}

function playerInSentence(s,players){
 const low=String(s||'').toLowerCase();
 return players.find(p=>low.includes(p.name.toLowerCase()))||null;
}

function scoreMention(s,p){
 if(!p||!Number.isFinite(p.points))return false;
 return new RegExp(`(^|[^0-9.])${esc(String(p.points))}(?![0-9]|\\.[0-9])`).test(String(s||''));
}

function naturalRoleContext(s,p){
 const x=String(s||'');
 if(!/snap share|snaps in week 2|% of snaps/i.test(x))return x;
 if(/\b(?:up from|jumped from|rose from|expanded from|moved from)\b/i.test(x))return `${p.name}'s Week 2 role was larger than it was last season.`;
 if(/\b(?:down from|fell from|dropped from|smaller than)\b/i.test(x))return `${p.name}'s Week 2 role was smaller than it was last season.`;
 return `${p.name}'s Week 2 role was worth noting, but the fantasy result still matters more.`;
}

function naturalAverageContext(s,p){
 const x=String(s||'');
 const m=x.match(/averaged\s+(-?\d+(?:\.\d+)?)\s+fantasy points.*2025/i);
 if(!m)return x;
 const avg=Number(m[1]);
 if(Number.isFinite(p.points)&&Number.isFinite(avg)&&p.points<avg*0.65)return `${p.name} averaged ${m[1]} in 2025. This was a bad week, not evidence that the player suddenly forgot how to play.`;
 if(Number.isFinite(p.points)&&Number.isFinite(avg)&&p.points>avg*1.25)return `${p.name} beat last season's average by enough that the performance deserves attention.`;
 return `${p.name}'s Week 2 result was close enough to last season's level that there is no need to invent a larger story.`;
}

function cleanPlayerSection(sec,team){
 const players=playerRows(team),seenScore=new Set(),seenContext=new Set(),paragraphs=[];
 for(const raw of sec?.paragraphs||[]){
  const kept=[];
  for(let s of sentenceParts(raw)){
   if(ABSTRACT_DROP.some(re=>re.test(s)))continue;
   const p=playerInSentence(s,players);
   if(p&&scoreMention(s,p)){
    if(seenScore.has(p.name))continue;
    seenScore.add(p.name);
    kept.push(clean(s));
    continue;
   }
   if(p&&/snap share|snaps in week 2|% of snaps/i.test(s)){
    if(seenContext.has(p.name))continue;
    seenContext.add(p.name);
    kept.push(naturalRoleContext(s,p));
    continue;
   }
   if(p&&/averaged .*2025|average in 2025|2025 average/i.test(s)){
    if(seenContext.has(p.name))continue;
    seenContext.add(p.name);
    kept.push(naturalAverageContext(s,p));
    continue;
   }
   if(/\b(?:credit|praise|deserve|earned)\b/i.test(s)&&p)continue;
   kept.push(clean(s));
  }
  const text=clean(kept.join(' '));
  if(text)paragraphs.push(text);
 }
 return {...sec,paragraphs};
}

function actionableManagement(copy){
 return /\b(?:beat .* from the bench|outscored .* from the bench|higher-scoring bench answer|lineup mistake|wrong call|started .* over|bench(?:ed|ing) .* for|left .* on the bench|compatible spot)\b/i.test(copy);
}

function cleanManagementSection(sec){
 const all=(sec?.paragraphs||[]).join(' '),actionable=actionableManagement(all),paragraphs=[];
 for(const raw of sec?.paragraphs||[]){
  const kept=[];
  for(const s0 of sentenceParts(raw)){
   const s=clean(s0);
   if(ABSTRACT_DROP.some(re=>re.test(s)))continue;
   if(!actionable&&/\b(?:manager|management|lineup choice|decision|should know better|blame)\b/i.test(s)&&!/did not leave an obvious higher-scoring bench answer|no obvious higher-scoring bench answer/i.test(s))continue;
   if(actionable&&/\b(?:one wrong call happens|repeat(?:ed)? wrong call|lineup mistake|beat .* from the bench|outscored .* from the bench)\b/i.test(s)){kept.push(s);continue;}
   if(/\b(?:scoreboard highlighted it for management|person who chose the lineup|cute bad decision|management had seven days)\b/i.test(s))continue;
   kept.push(s);
  }
  const text=clean(kept.join(' '));if(text)paragraphs.push(text);
 }
 return {...sec,paragraphs};
}

function cleanCreditSection(sec,team){
 const eligible=(team?.starter_details||[]).filter(p=>{
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),proj=Number(p?.projected),delta=Number.isFinite(proj)?pts-proj:null;
  return Number.isFinite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
 }).sort((a,b)=>Number(b?.points)-Number(a?.points)).slice(0,2).map(p=>String(p?.name||'').trim()).filter(Boolean);
 const original=(sec?.paragraphs||[]).flatMap(sentenceParts);
 const nonPraise=original.filter(s=>!/\b(?:credit|praise|deserve|earned)\b/i.test(s)&&!ABSTRACT_DROP.some(re=>re.test(s))&&!/\b\d+(?:\.\d+)?\b/.test(s));
 const lead=eligible.length>=2?`${eligible[0]} and ${eligible[1]} earned the praise this week.`:eligible.length===1?`${eligible[0]} earned the praise this week.`:null;
 const paragraphs=[];
 if(lead)paragraphs.push(lead);
 if(nonPraise.length)paragraphs.push(clean(nonPraise.slice(0,2).join(' ')));
 return {...sec,paragraphs:paragraphs.filter(Boolean)};
}

function cleanFansSection(sec,team,scoreSeen){
 const players=playerRows(team),paragraphs=[];
 for(const raw of sec?.paragraphs||[]){
  const kept=[];
  for(const s0 of sentenceParts(raw)){
   const s=clean(s0),p=playerInSentence(s,players);
   if(ABSTRACT_DROP.some(re=>re.test(s)))continue;
   if(p&&scoreMention(s,p)&&scoreSeen.has(p.name))continue;
   if(/\b(?:supporters saw the same decision management did|the fan criticism starts with|scoreboard .* management|itemized reasons|fans already know exactly which mistake)\b/i.test(s))continue;
   if(/\b(?:management|manager|lineup mistake|wrong call)\b/i.test(s)&&actionableManagement((sec?.paragraphs||[]).join(' ')))continue;
   kept.push(s);
  }
  const text=clean(kept.join(' '));if(text)paragraphs.push(text);
 }
 return {...sec,paragraphs};
}

function cleanOutlookSection(sec,team){
 const upcoming=(team?.upcoming_opponents||[]).slice().sort((a,b)=>Number(a?.week)-Number(b?.week));
 const names=upcoming.map(x=>String(x?.team_name||'').trim()).filter(Boolean);
 const seen=new Set(),paragraphs=[];
 for(const raw of sec?.paragraphs||[]){
  const kept=[];
  for(const s0 of sentenceParts(raw)){
   const s=clean(s0);
   if(ABSTRACT_DROP.some(re=>re.test(s)))continue;
   const mentioned=names.filter(n=>s.toLowerCase().includes(n.toLowerCase()));
   if(mentioned.length===1){
    const key=mentioned[0].toLowerCase();
    if(seen.has(key)&&/\b(?:next|coming|gets?|plays?|faces?|week 3)\b/i.test(s))continue;
    seen.add(key);
   }
   kept.push(s);
  }
  const text=clean(kept.join(' '));if(text)paragraphs.push(text);
 }
 return {...sec,paragraphs};
}

function cleanOtherSection(sec){
 const paragraphs=(sec?.paragraphs||[]).map(raw=>clean(sentenceParts(raw).filter(s=>!ABSTRACT_DROP.some(re=>re.test(s))).join(' '))).filter(Boolean);
 return {...sec,paragraphs};
}

function dedupeAcrossArticle(article){
 const seen=new Set();
 article.sections=(article.sections||[]).map(sec=>{
  const paragraphs=[];
  for(const raw of sec?.paragraphs||[]){
   const kept=[];
   for(const s of sentenceParts(raw)){
    const key=clean(s).toLowerCase();
    if(words(s)>=7&&seen.has(key))continue;
    if(words(s)>=7)seen.add(key);
    kept.push(s);
   }
   const text=clean(kept.join(' '));if(text)paragraphs.push(text);
  }
  return {...sec,paragraphs};
 });
 article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 return article;
}

function reviseTeam(team){
 const article=team?.inquirer_article;if(!article)return team;
 const scoreSeen=new Set();
 for(const sec of article.sections||[])if(classify(sec)==='players')for(const p of playerRows(team))if((sec.paragraphs||[]).some(x=>scoreMention(x,p)))scoreSeen.add(p.name);
 article.sections=(article.sections||[]).map(sec=>{
  const type=classify(sec);
  if(type==='players')return cleanPlayerSection(sec,team);
  if(type==='management')return cleanManagementSection(sec);
  if(type==='credit')return cleanCreditSection(sec,team);
  if(type==='fans')return cleanFansSection(sec,team,scoreSeen);
  if(type==='outlook')return cleanOutlookSection(sec,team);
  return cleanOtherSection(sec);
 });
 dedupeAcrossArticle(article);
 article.structure_revision='week2-r29';
 return team;
}

function reviseOverview(overview){
 if(!overview)return overview;
 overview.sections=(overview.sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(raw=>clean(sentenceParts(raw).filter(s=>!ABSTRACT_DROP.some(re=>re.test(s))).join(' '))).filter(Boolean)}));
 overview.structure_revision='week2-r29';
 return overview;
}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR28Base(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(reviseTeam);
 out.league_overview=reviseOverview(out.league_overview);
 out.structure_revision='week2-r29';
 return out;
}

export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
