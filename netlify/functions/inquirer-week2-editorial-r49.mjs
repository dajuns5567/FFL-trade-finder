import {applyWeek2EditorialR16 as applyR48} from './inquirer-week2-editorial-r48.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const words=s=>(clean(s).match(/\b[\w’'-]+\b/g)||[]).length;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
const fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'0.0';
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const R45_PADDING=/\b(?:built the Week 2 case on|put the useful part of the role in|role was easiest to see in|doing the serious work beneath the sparkle|gave the performance some bones through|propped up by .*pixie dust|part of the role worth taking seriously|something sturdier than the final score|work against .* rested on|what mattered against .* was|repeatable football basis through|the useful clue for .* was|actual role underneath the fantasy result|real work attached to the performance|volume may not be glamorous|real football spine|role with actual substance underneath the shine|workload did more talking than the decoration|football work to evaluate instead of a lucky ornament|role shape gives the performance|underlying work that I would judge|production came from a defined role)\b/i;
const GLOBAL_FILLER=/\b(?:Another result in the same direction would turn a trend into something the losing side has to carry around all season|Next week gets to break the tie instead of merely adding another footnote to it|There is no trend to hide behind and no old edge worth pretending is bigger than it is|That is progress of a sort|hindsight wearing steel-toed boots|point Week 2 gap demands a deliberate choice)\b/i;
const TECH=/\b(?:scoring app|screenshots?|notifications?|group chats?|algorithm|timeline|social media|feed)\b/i;
const SOLO=/\b(?:one-man show|supporting cast|solo effort|second punch|third scorer|keeping (?:the )?roster afloat|passenger|rescue mission|weekly emergency labor)\b/i;
const OPP_TRIVIA=/\b(?:Latest-game scoring puts|the next matchup gives .* another data point)\b/i;

function reporterName(article){return String(article?.reporter?.name||'').trim();}
function rosterRecord(team){const r=team?.league_context?.record||{};return `${Number(r.wins)||0}-${Number(r.losses)||0}`;}
function fullTeam(team){return String(team?.team_name||'This team').trim();}
function shortTeam(team){const n=fullTeam(team),bits=n.split(/\s+/).filter(Boolean);return bits.at(-1)||n;}
function isPluralTeamName(name){return /s$/i.test(String(name||'').trim());}
function normalizeTeamGrammar(text,team){
 let out=String(text||'');
 for(const name of [fullTeam(team),shortTeam(team)]){
  if(!name||!isPluralTeamName(name))continue;
  const q=esc(name);
  out=out.replace(new RegExp(`\\b${q} is\\b`,'g'),`${name} are`)
    .replace(new RegExp(`\\b${q} has\\b`,'g'),`${name} have`)
    .replace(new RegExp(`\\b${q} gets\\b`,'g'),`${name} get`)
    .replace(new RegExp(`\\b${q} holds\\b`,'g'),`${name} hold`)
    .replace(new RegExp(`\\b${q} brings\\b`,'g'),`${name} bring`)
    .replace(new RegExp(`\\b${q} turns\\b`,'g'),`${name} turn`)
    .replace(new RegExp(`\\b${q} meets\\b`,'g'),`${name} meet`)
    .replace(new RegExp(`\\b${q} wants\\b`,'g'),`${name} want`)
    .replace(new RegExp(`\\b${q} wastes\\b`,'g'),`${name} waste`)
    .replace(new RegExp(`\\b${q} trips\\b`,'g'),`${name} trip`);
 }
 return out.replace(/\b([A-Z][A-Za-z.'’-]*s)'s\b/g,"$1'");
}

function benchSignature(article){
 const management=(article?.sections||[]).find(s=>String(s?.kind||'')==='management');
 const text=(management?.paragraphs||[]).join(' ');
 const NAME="[A-Z][A-Za-z'.’-]+(?:\\s+[A-Z][A-Za-z'.’-]+){0,3}";
 const m=text.match(new RegExp(`(${NAME})\\s+(?:outscored|beat)\\s+(${NAME})\\s+by\\s+(\\d+(?:\\.\\d+)?)`,'i'));
 return m?{a:m[1].toLowerCase(),b:m[2].toLowerCase(),delta:m[3]}:null;
}
function repeatsBench(sentence,sig){
 if(!sig)return false;
 const x=String(sentence||'').toLowerCase();
 return (x.includes(sig.a)&&x.includes(sig.b))||(x.includes(sig.delta)&&/\bbench\b/i.test(sentence));
}

function sentenceKey(s){return clean(s).toLowerCase().replace(/[“”"'’]/g,'').replace(/\b\d+(?:\.\d+)?%?\b/g,'#').replace(/[^a-z0-9# ]+/g,' ').replace(/\s+/g,' ').trim();}

function meaningfulPlayers(team){
 return (team?.starter_details||[]).filter(p=>{
  const pts=Number(p?.points),proj=Number(p?.projected),prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0;
  if(!Number.isFinite(pts))return false;
  if(pts>=10)return true;
  if(Number.isFinite(proj)&&pts-proj>=4&&pts>=6)return true;
  if(Number.isFinite(prior)&&prior>0&&games>=6&&pts>=6&&pts>=Math.max(prior*1.4,prior+4))return true;
  return false;
 }).sort((a,b)=>Number(b?.points)-Number(a?.points));
}
function playerMention(text,p){
 const full=String(p?.name||'').trim();if(!full)return false;
 const last=full.split(/\s+/).filter(Boolean).at(-1)||full;
 const low=String(text||'').toLowerCase();
 return low.includes(full.toLowerCase())||new RegExp(`(?:^|\\W)${esc(last)}(?:$|\\W)`,'i').test(text);
}

function revisePlayers(team,sec){
 const meaningful=meaningfulPlayers(team).slice(0,2);
 const kept=[];let historyKept=0;
 for(const raw of sec?.paragraphs||[]){
  const p=normalizeTeamGrammar(clean(raw),team);if(!p||R45_PADDING.test(p))continue;
  const isStat=/^Against .+?, .+? scored \d+(?:\.\d+)? fantasy points/i.test(p);
  const isHistory=/\b(?:2025 averages?|averaged .*last season|last season|prior season)\b/i.test(p);
  if(isStat){
   if(meaningful.some(x=>playerMention(p,x)))kept.push(p);
   continue;
  }
  if(isHistory){
   if(historyKept<1&&meaningful.some(x=>playerMention(p,x))){kept.push(p);historyKept++;}
   continue;
  }
  if(meaningful.some(x=>playerMention(p,x))&&kept.length<4)kept.push(p);
 }
 if(!meaningful.length){
  const top=(team?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).sort((a,b)=>Number(b.points)-Number(a.points))[0];
  const topPts=Number(top?.points);
  sec.heading=reporterName(team?.inquirer_article)==='Jefferson Filch'?'Nobody Passed Inspection':'No Star to Invent';
  kept.length=0;
  kept.push(`${fullTeam(team)} did not produce a Week 2 performance worth dressing up as a standout${Number.isFinite(topPts)?`; the lineup high was ${fmt(topPts)} fantasy points`:''}.`);
  if(top?.name)kept.push(`${top.name} led this lineup, but leading a bad team total is not the same thing as giving rivals a player they need to fear.`);
 }else{
  const names=meaningful.map(p=>p.name).filter(Boolean);
  if(!kept.some(p=>names.some(n=>String(p).includes(n)))){
   kept.unshift(`${names[0]} gave ${fullTeam(team)} the clearest individual Week 2 performance worth carrying into the next matchup.`);
  }
 }
 return {...sec,paragraphs:kept.slice(0,4)};
}

function stripParagraph(raw,team,kind,sig,seen){
 const kept=[];
 for(const sentence0 of sentences(raw)){
  const sentence=normalizeTeamGrammar(sentence0,team);
  if(!sentence||GLOBAL_FILLER.test(sentence)||TECH.test(sentence)||SOLO.test(sentence))continue;
  if(kind!=='management'&&repeatsBench(sentence,sig))continue;
  if(kind==='sentiment'&&/\b(?:manager|management)\b/i.test(sentence))continue;
  if(kind==='outlook'&&(OPP_TRIVIA.test(sentence)||/\b(?:manager|management)\b/i.test(sentence)))continue;
  if(kind==='lede'&&!sig&&/\b(?:manager|management)\b/i.test(sentence))continue;
  const key=sentenceKey(sentence);if(!key||seen.has(key))continue;
  seen.add(key);kept.push(sentence);
 }
 return clean(kept.join(' '));
}

function reviseTeam(team){
 const article=team?.inquirer_article;if(!article)return team;
 const sig=benchSignature(article),seen=new Set();
 let sections=[];
 for(const sec0 of article.sections||[]){
  let sec={...sec0,paragraphs:[...(sec0?.paragraphs||[])]};
  const kind=String(sec?.kind||'');
  if(kind==='players')sec=revisePlayers(team,sec);
  sec.paragraphs=(sec.paragraphs||[]).map(p=>stripParagraph(p,team,kind,sig,seen)).filter(Boolean);
  if(kind==='value'){
   let flirtSeen=false;
   sec.paragraphs=sec.paragraphs.map(p=>clean(sentences(p).filter(s=>{
    if(!/can flirt with the market/i.test(s))return true;
    if(flirtSeen)return false;flirtSeen=true;return true;
   }).join(' '))).filter(Boolean);
  }
  sections.push(sec);
 }
 article.sections=sections;
 article.paragraphs=sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r49';
 return team;
}

function recentWeek1(t){return Number(t?.league_context?.recent_games?.find?.(g=>Number(g?.week)===1)?.points);}
function recordWins(t){return Number(t?.league_context?.record?.wins)||0;}
function recordLosses(t){return Number(t?.league_context?.record?.losses)||0;}
function twoWeekAvg(t){const gs=t?.league_context?.recent_games||[];const vals=gs.map(g=>Number(g?.points)).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:Number(t?.points)||0;}
function teamLabel(t){return `${fullTeam(t)} (${rosterRecord(t)})`;}
function uniqueMatchups(teams){
 const byId=new Map(teams.map(t=>[String(t.roster_id),t])),seen=new Set(),out=[];
 for(const t of teams){
  const oid=String(t?.opponent_roster_id||'');if(!oid||!byId.has(oid))continue;
  const key=[String(t.roster_id),oid].sort().join(':');if(seen.has(key))continue;seen.add(key);
  const o=byId.get(oid);out.push({a:t,b:o,combined:Number(t.points)+Number(o.points),margin:Math.abs(Number(t.points)-Number(o.points))});
 }
 return out;
}
function replaceSectionParagraphs(overview,teams){
 const sections=overview?.sections||[];if(!sections.length)return;
 const sortedWeek2=[...teams].sort((a,b)=>Number(b.points)-Number(a.points));
 const matchups=uniqueMatchups(teams);
 const high=sortedWeek2[0],low=sortedWeek2.at(-1);
 const close=[...matchups].sort((a,b)=>a.margin-b.margin)[0],wide=[...matchups].sort((a,b)=>b.margin-a.margin)[0],loud=[...matchups].sort((a,b)=>b.combined-a.combined)[0],quiet=[...matchups].sort((a,b)=>a.combined-b.combined)[0];
 const jumps=teams.map(t=>({t,d:Number(t.points)-recentWeek1(t)})).filter(x=>Number.isFinite(x.d)).sort((a,b)=>b.d-a.d),falls=[...jumps].sort((a,b)=>a.d-b.d);
 const undefeated=teams.filter(t=>recordWins(t)===2).map(t=>({t,avg:twoWeekAvg(t)})).sort((a,b)=>b.avg-a.avg),winless=teams.filter(t=>recordLosses(t)===2).map(t=>({t,avg:twoWeekAvg(t)})).sort((a,b)=>b.avg-a.avg);
 const projection=teams.filter(t=>Number.isFinite(Number(t.next_projected))&&Number.isFinite(Number(t.next_opponent_projected))).map(t=>({t,gap:Math.abs(Number(t.next_projected)-Number(t.next_opponent_projected))})).sort((a,b)=>b.gap-a.gap)[0];
 const paragraphSets={
  'walter-mercer':[
   high?`${teamLabel(high)} led Week 2 at ${fmt(high.points)} points. ${teamLabel(low)} finished last at ${fmt(low.points)}, which is the range the league actually produced.`:'Week 2 did not produce a clean scoring extreme worth forcing into copy.',
   close?`${teamLabel(close.a)} and ${teamLabel(close.b)} finished ${fmt(close.margin)} points apart, the closest margin on the board. That is where one lineup decision can matter without pretending every bench point caused the result.`:'No completed matchup supplied a usable close-game comparison.',
   jumps[0]?`${teamLabel(jumps[0].t)} made the largest Week 1-to-Week 2 scoring jump at ${fmt(jumps[0].d)} points. That change matters more than repeating the opener as if nothing moved.`:'The week-over-week scoring board did not yield a clean biggest mover.'
  ],
  'tess-delaney':[
   loud?`${teamLabel(loud.a)} and ${teamLabel(loud.b)} combined for ${fmt(loud.combined)} points, the highest-scoring matchup of Week 2. That game earned the noise without needing another costume change.`:'Week 2 did not supply a clean highest-scoring matchup.',
   quiet?`${teamLabel(quiet.a)} and ${teamLabel(quiet.b)} combined for ${fmt(quiet.combined)} points, the lowest-scoring matchup of the week. Nobody needs a fake star from that.`:'Week 2 did not supply a clean lowest-scoring matchup.',
   wide?`${teamLabel(wide.a)} and ${teamLabel(wide.b)} finished ${fmt(wide.margin)} points apart, the largest margin of Week 2. The scoreboard did enough talking on its own.`:'Week 2 did not supply a clean largest-margin matchup.'
  ],
  'mack-hollis':[
   undefeated[0]?`${teamLabel(undefeated[0].t)} owns the strongest two-week scoring average among the 2-0 teams at ${fmt(undefeated[0].avg)}. A clean record with real scoring behind it is considerably easier to admire.`:'No 2-0 team produced a usable two-week scoring comparison.',
   winless[0]?`${teamLabel(winless[0].t)} has the strongest two-week scoring average among the 0-2 teams at ${fmt(winless[0].avg)}. The record is ugly; the underlying scoring says the obituary can wait.`:'No 0-2 team produced a usable two-week scoring comparison.',
   falls[0]?`${teamLabel(falls[0].t)} had the sharpest scoring fall from Week 1, dropping ${fmt(Math.abs(falls[0].d))} points. One bad turn does not erase the opener, but it does make Week 3 interesting.`:'No team produced a clear week-over-week scoring fall.'
  ],
  'nora-voss':[
   projection?`${teamLabel(projection.t)} sits in the largest Week 3 projection gap at ${fmt(projection.gap)} points against ${String(projection.t?.next_opponent_name||'its next opponent')}. The projection is a question to test, not a result to pre-write.`:'The Week 3 projection board does not have a clean enough gap to feature.',
   undefeated.at(-1)?`${teamLabel(undefeated.at(-1).t)} has the weakest two-week scoring average among the 2-0 teams at ${fmt(undefeated.at(-1).avg)}. The record is clean; the scoring profile still deserves inspection.`:'The undefeated group does not have a clean low-end scoring comparison.',
   winless[0]?`${teamLabel(winless[0].t)} has the strongest two-week scoring average among winless teams at ${fmt(winless[0].avg)}. Two losses can still describe a lineup doing more right than the standings admit.`:'The winless group does not have a clean high-end scoring comparison.'
  ]
 };
 for(const sec of sections){
  const id=String(sec?.reporter?.id||'');if(paragraphSets[id])sec.paragraphs=paragraphSets[id];
 }
}
function compactHotTake(h){
 const title=String(h?.title||''),take=String(h?.take||'');
 if(/division board/i.test(title))return h;
 const out=[];for(const s of sentences(take)){
  if(TECH.test(s)||SOLO.test(s)||GLOBAL_FILLER.test(s))continue;
  out.push(s);if(out.length>=2||words(out.join(' '))>=55)break;
 }
 return {...h,take:clean(out.join(' '))};
}
function reviseOverview(overview,teams){
 if(!overview)return overview;
 replaceSectionParagraphs(overview,teams);
 overview.sections=(overview.sections||[]).map(s=>({...s,paragraphs:(s.paragraphs||[]).map(p=>clean(sentences(p).filter(x=>!TECH.test(x)&&!SOLO.test(x)&&!GLOBAL_FILLER.test(x)).join(' '))).filter(Boolean)}));
 overview.hot_takes=(overview.hot_takes||[]).map(compactHotTake);
 overview.structure_revision='week2-r49';
 return overview;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR48(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(reviseTeam);
 out.league_overview=reviseOverview(out.league_overview,out.teams||[]);
 out.structure_revision='week2-r49';
 if(out.league_overview)out.league_overview.structure_revision='week2-r49';
 return out;
}

export const applyWeek2EditorialR49=applyWeek2EditorialR16;
export const applyWeek2EditorialR48=applyWeek2EditorialR16;
export const applyWeek2EditorialR47=applyWeek2EditorialR16;
export const applyWeek2EditorialR46=applyWeek2EditorialR16;
export const applyWeek2EditorialR45=applyWeek2EditorialR16;
export const applyWeek2EditorialR44=applyWeek2EditorialR16;
export const applyWeek2EditorialR43=applyWeek2EditorialR16;
export const applyWeek2EditorialR42=applyWeek2EditorialR16;
export const applyWeek2EditorialR41=applyWeek2EditorialR16;
export const applyWeek2EditorialR40=applyWeek2EditorialR16;
export const applyWeek2EditorialR39=applyWeek2EditorialR16;
export const applyWeek2EditorialR38=applyWeek2EditorialR16;
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
