import {applyWeek2EditorialR16 as applyR36} from './inquirer-week2-editorial-r36.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
const words=s=>(clean(s).match(/\b[\w’'-]+\b/g)||[]).length;
const exactName=(text,name)=>{
 const t=String(text||'').toLowerCase(),n=String(name||'').toLowerCase();
 if(!n)return false;
 const i=t.indexOf(n);if(i<0)return false;
 return !/[a-z]/.test(t[i-1]||'')&&!/[a-z]/.test(t[i+n.length]||'');
};

const THEATER=/\b(?:stage|curtain|act|audience|encore|production|lights?|dialogue|scene|program|show|formalwear)\b/i;
const TECH=/\b(?:screenshots?|phone|apps?|notifications?|group chats?|algorithm|timeline|feed|social media)\b/i;
const SOLO=/\b(?:one-man show|supporting cast|solo effort|second punch|third scorer|keeping (?:the )?roster afloat|everyone else (?:is|was) (?:a )?passenger)\b/i;
const HIST=/\b(?:averaged .*2025|last season|prior season|snap share|snaps in Week 2|of the snaps in Week 2)\b/i;
const PLAYER_LINE=/^Against .+?, .+? scored \d+(?:\.\d+)? fantasy points/i;
const GOOD_FILLER=/(?:^|\s)Good\.(?:\s|$)/g;
const FINE_FILLER=/(?:^|\s)Fine\.(?:\s|$)/g;

const ORDER={
 'walter-mercer':['lede','management','players','hot-seat','value','cool-throne','sentiment','outlook'],
 'tess-delaney':['lede','players','cool-throne','sentiment','management','hot-seat','value','outlook'],
 'mack-hollis':['lede','players','management','cool-throne','value','hot-seat','sentiment','outlook'],
 'nora-voss':['lede','management','hot-seat','players','value','sentiment','cool-throne','outlook']
};

function materialPlayer(team){
 let best=null,bestScore=-1;
 for(const p of team?.starter_details||[]){
  const pts=Number(p?.points),avg=Number(p?.prior_season_avg),cur=Number(p?.current_snap_pct),prior=Number(p?.prior_season_snap_pct);
  let score=0;
  if(Number.isFinite(cur)&&Number.isFinite(prior))score+=Math.abs(cur-prior)*100;
  if(Number.isFinite(pts)&&Number.isFinite(avg)&&avg>0)score+=Math.abs(pts-avg)/avg*8;
  if(score>bestScore){bestScore=score;best=p;}
 }
 return bestScore>=10?best:null;
}

function compactPlayers(team,sec,reporterId){
 const material=materialPlayer(team);
 const lineCap=reporterId==='tess-delaney'?3:2;
 let playerLines=0,historicalKept=0,otherKept=0;
 const out=[];
 for(const raw of sec?.paragraphs||[]){
  const p=clean(raw);if(!p)continue;
  if(PLAYER_LINE.test(p)){
   if(playerLines<lineCap){out.push(p);playerLines++;}
   continue;
  }
  if(HIST.test(p)){
   if(material&&historicalKept<1&&exactName(p,material?.name)){
    out.push(p);historicalKept++;
   }
   continue;
  }
  if(otherKept<2){out.push(p);otherKept++;}
 }
 return {...sec,paragraphs:out.filter(Boolean)};
}

function benchSignature(article){
 const management=(article?.sections||[]).find(s=>String(s?.kind||'')==='management');
 const text=(management?.paragraphs||[]).join(' ');
 const NAME="[A-Z][A-Za-z'.-]+(?:\\s+[A-Z][A-Za-z'.-]+){0,3}";
 const re=new RegExp(`(${NAME})\\s+(?:outscored|beat)\\s+(${NAME})\\s+by\\s+(\\d+(?:\\.\\d+)?)`,'i');
 const m=text.match(re);
 return m?{a:m[1].toLowerCase(),b:m[2].toLowerCase(),delta:m[3]}:null;
}

function dropRepeatedBench(raw,sig){
 if(!sig)return clean(raw);
 return clean(sentences(raw).filter(s=>{
  const x=s.toLowerCase();
  const samePlayers=x.includes(sig.a)&&x.includes(sig.b);
  const sameBench=x.includes(sig.delta)&&/\bbench\b/i.test(s);
  return !(samePlayers||sameBench);
 }).join(' '));
}

function nickLift(team,sec){
 if(String(sec?.kind||'')!=='lede')return sec;
 const ps=[...(sec?.paragraphs||[])];
 const won=Boolean(team?.won),name=String(team?.team_name||'This team');
 const line=won
  ? `${name} won. Enjoy it, then find the mistake that would get punished by a better opponent.`
  : `${name} lost. The score already hurts enough; find the fixable mistake before Sunday turns it into a habit.`;
 if(!ps.some(p=>p.includes(line)))ps.splice(Math.min(2,ps.length),0,line);
 return {...sec,paragraphs:ps};
}

function cleanJefferson(sec){
 if(String(sec?.kind||'')==='cool-throne')sec={...sec,heading:'What Survived Inspection'};
 return {...sec,paragraphs:(sec?.paragraphs||[]).map(p=>clean(String(p||'').replace(GOOD_FILLER,' ').replace(FINE_FILLER,' '))).filter(Boolean)};
}

function cleanTilly(sec,state){
 const ps=[];
 for(const raw of sec?.paragraphs||[]){
  const kept=[];
  for(const s of sentences(raw)){
   if(THEATER.test(s)&&!/[0-9]/.test(s)){
    if(state.theater>=4)continue;
    state.theater++;
   }
   kept.push(s);
  }
  const p=clean(kept.join(' '));if(p)ps.push(p);
 }
 return {...sec,paragraphs:ps};
}

function reviseTeam(team){
 const article=team?.inquirer_article;if(!article)return team;
 const rid=String(article?.reporter?.id||'');
 const sig=benchSignature(article);
 const tillyState={theater:0};
 let sections=(article.sections||[]).map(sec=>{
  let x={...sec,paragraphs:[...(sec?.paragraphs||[])]};
  if(String(x?.kind||'')==='players')x=compactPlayers(team,x,rid);
  if(['sentiment','outlook','hot-seat','cool-throne','value'].includes(String(x?.kind||''))){
   x={...x,paragraphs:(x.paragraphs||[]).map(p=>dropRepeatedBench(p,sig)).filter(Boolean)};
  }
  if(rid==='walter-mercer')x=nickLift(team,x);
  if(rid==='nora-voss')x=cleanJefferson(x);
  if(rid==='tess-delaney')x=cleanTilly(x,tillyState);
  if(String(x?.kind||'')==='cool-throne'){
   const heading={
    'walter-mercer':'What Actually Worked',
    'tess-delaney':'Applause Before I Change My Mind',
    'mack-hollis':'Fine, Take the Compliment',
    'nora-voss':'What Survived Inspection'
   }[rid];
   if(heading)x={...x,heading};
  }
  return x;
 });
 const rank=new Map((ORDER[rid]||[]).map((k,i)=>[k,i]));
 sections=sections.map((s,i)=>({s,i})).sort((a,b)=>(rank.get(String(a.s?.kind||''))??100+a.i)-(rank.get(String(b.s?.kind||''))??100+b.i)).map(x=>x.s);
 article.sections=sections;
 article.paragraphs=sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r37';
 return team;
}

function compactParagraph(raw,maxWords=68){
 const ss=sentences(raw).filter(s=>!TECH.test(s)&&!SOLO.test(s));
 const out=[];let n=0;
 for(const s of ss){
  const w=words(s);if(!w)continue;
  if(out.length>=3)break;
  if(n+w>maxWords){
   if(!out.length)out.push(words(s).slice(0,maxWords).join(' '));
   break;
  }
  out.push(s);n+=w;
 }
 return clean(out.join(' '));
}

function reviseOverview(overview){
 if(!overview)return overview;
 overview.sections=(overview.sections||[]).map(sec=>({
  ...sec,
  paragraphs:(sec?.paragraphs||[]).map(p=>compactParagraph(p,66)).filter(Boolean).slice(0,3)
 }));
 overview.hot_takes=(overview.hot_takes||[]).map(h=>{
  const title=String(h?.title||'');
  const cap=/division board/i.test(title)?180:72;
  return {...h,take:compactParagraph(h?.take,cap)};
 });
 overview.structure_revision='week2-r37';
 return overview;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR36(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(reviseTeam);
 out.league_overview=reviseOverview(out.league_overview);
 out.structure_revision='week2-r37';
 return out;
}

export const applyWeek2EditorialR37=applyWeek2EditorialR16;
export const applyWeek2EditorialR36=applyWeek2EditorialR16;
export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
