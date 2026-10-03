import {applyWeek2EditorialR16 as applyR48} from './inquirer-week2-editorial-r48.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const words=s=>(clean(s).match(/\b[\w’'-]+\b/g)||[]).length;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
const fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'0.0';
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

const R45_PADDING=/\b(?:built the Week 2 case on|put the useful part of the role in|role was easiest to see in|doing the serious work beneath the sparkle|gave the performance some bones through|propped up by .*pixie dust|part of the role worth taking seriously|something sturdier than the final score|work against .* rested on|what mattered against .* was|repeatable football basis through|the useful clue for .* was|actual role underneath the fantasy result|real work attached to the performance|volume may not be glamorous|real football spine|role with actual substance underneath the shine|workload did more talking than the decoration|football work to evaluate instead of a lucky ornament|role shape gives the performance|underlying work that I would judge|production came from a defined role)\b/i;
const GLOBAL_FILLER=/\b(?:Another result in the same direction would turn a trend into something the losing side has to carry around all season|Next week gets to break the tie instead of merely adding another footnote to it|There is no trend to hide behind and no old edge worth pretending is bigger than it is|The series is even, so neither side gets to arrive carrying ancestral rights to the result|The series is dead even, which is a good reminder that history has declined to do anybody a favor here|Their Week 2 records make the next act a hard stretch, so one good result now would improve the lighting considerably|A \d+-\d+ start has removed the luxury of pretending every flaw is adorable because September is young|Through Week 2, that reads as a friendlier stretch|That is progress of a sort|hindsight wearing steel-toed boots|point Week 2 gap demands a deliberate choice)\b/i;
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
  for(const [singular,plural] of [['is','are'],['has','have'],['gets','get'],['holds','hold'],['brings','bring'],['turns','turn'],['meets','meet'],['wants','want'],['wastes','waste'],['trips','trip']])out=out.replace(new RegExp(`\\b${q} ${singular}\\b`,'g'),`${name} ${plural}`);
 }
 return out.replace(/\b([A-Z][A-Za-z.'’-]*s)'s\b/g,"$1'");
}

function benchSignature(article){
 const management=(article?.sections||[]).find(s=>String(s?.kind||'')==='management');
 const text=(management?.paragraphs||[]).join(' '),NAME="[A-Z][A-Za-z'.’-]+(?:\\s+[A-Z][A-Za-z'.’-]+){0,3}";
 const m=text.match(new RegExp(`(${NAME})\\s+(?:outscored|beat)\\s+(${NAME})\\s+by\\s+(\\d+(?:\\.\\d+)?)`,'i'));
 return m?{a:m[1].toLowerCase(),b:m[2].toLowerCase(),delta:m[3]}:null;
}
function repeatsBench(sentence,sig){if(!sig)return false;const x=String(sentence||'').toLowerCase();return (x.includes(sig.a)&&x.includes(sig.b))||(x.includes(sig.delta)&&/\bbench\b/i.test(sentence));}
function sentenceKey(s){return clean(s).toLowerCase().replace(/[“”"'’]/g,'').replace(/\b\d+(?:\.\d+)?%?\b/g,'#').replace(/[^a-z0-9# ]+/g,' ').replace(/\s+/g,' ').trim();}

function topThree(team){return (team?.starter_details||[]).slice(0,3).filter(p=>String(p?.name||'').trim());}
function isMeaningful(p){
 const pts=Number(p?.points),proj=Number(p?.projected),prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0;
 if(!Number.isFinite(pts))return false;
 return pts>=10||(Number.isFinite(proj)&&pts-proj>=4&&pts>=6)||(Number.isFinite(prior)&&prior>0&&games>=6&&pts>=6&&pts>=Math.max(prior*1.4,prior+4));
}
function playerMention(text,p){
 const full=String(p?.name||'').trim();if(!full)return false;
 const last=full.split(/\s+/).filter(Boolean).at(-1)||full,low=String(text||'').toLowerCase();
 return low.includes(full.toLowerCase())||new RegExp(`(?:^|\\W)${esc(last)}(?:$|\\W)`,'i').test(text);
}
function performanceAssessment(team,p,slot){
 const name=String(p?.name||'').trim(),last=name.split(/\s+/).filter(Boolean).at(-1)||name,pts=Number(p?.points),proj=Number(p?.projected),prior=Number(p?.prior_season_avg),pos=String(p?.position||'player'),opp=String(team?.opponent_name||'the opponent'),voice=reporterName(team?.inquirer_article),meaningful=isMeaningful(p);
 const delta=Number.isFinite(proj)?pts-proj:null,baseline=Number.isFinite(prior)&&prior>0?prior:null;
 if(!meaningful){
  const low={
   'Nick Swindell':`${name} finished against ${opp} at ${fmt(pts)} points from a ${pos} slot. That is a player-performance problem; it is not automatic proof the manager chose wrong.`,
   'Tilly Fleecer':`${name} gave ${fullTeam(team)} only ${fmt(pts)} points against ${opp}. That is bad production, not a permission slip to invent a lineup crime.`,
   'Bartholomew Roycington III':`${name} produced ${fmt(pts)} against ${opp}. The number is unattractive enough on its own; I do not need to fabricate a management scandal around it.`,
   'Jefferson Filch':`${name} finished at ${fmt(pts)} against ${opp}. The evidence supports criticism of the performance, not an unsupported claim that management caused it.`
  };
  return low[voice]||`${name} finished at ${fmt(pts)} against ${opp}; criticize the performance unless a compatible lineup alternative proves a management mistake.`;
 }
 const context=delta!=null&&Math.abs(delta)>=4?`${delta>0?'+':''}${fmt(delta)} versus projection`:baseline!=null?`${fmt(pts)} versus a ${fmt(baseline)} prior-season average`:`${fmt(pts)} fantasy points`;
 const variants={
  'Nick Swindell':[
   `${name} gave ${fullTeam(team)} a meaningful Week 2 result against ${opp}: ${context}. Keep the conclusion narrow and useful.`,
   `${last}'s ${context} is enough to matter for ${fullTeam(team)} without turning one game into a role controversy.`,
   `Against ${opp}, ${name} supplied real production at ${fmt(pts)} points. That belongs in the Week 3 expectation; the rest does not need embellishment.`
  ],
  'Tilly Fleecer':[
   `${name} gave ${fullTeam(team)} something worth yelling about against ${opp}: ${context}. The performance earned the noise; no fake subplot required.`,
   `${last} landed at ${fmt(pts)} against ${opp}, which is enough to matter without dressing the box score in sequins.`,
   `${name} cleared the bar against ${opp} with ${context}. Keep the applause attached to the football.`
  ],
  'Bartholomew Roycington III':[
   `${name} gave ${fullTeam(team)} a performance with actual weight against ${opp}: ${context}. I can admire that without inventing a grander story.`,
   `${last}'s ${context} deserves notice because the production itself is sufficient. Decoration would only cheapen the point.`,
   `Against ${opp}, ${name} reached ${fmt(pts)} points. That is substantial enough to praise and specific enough to stop there.`
  ],
  'Jefferson Filch':[
   `${name} produced ${context} against ${opp}. That is the fact worth carrying forward; the evidence does not require a larger theory.`,
   `${last} finished at ${fmt(pts)} against ${opp}. The result is useful because it changes the expectation, not because it gives us permission to speculate.`,
   `The relevant finding on ${name}: ${context} against ${opp}. Week 3 can test whether it repeats.`
  ]
 };
 const list=variants[voice]||variants['Nick Swindell'];return list[slot%list.length];
}

function revisePlayers(team,sec){
 const top=topThree(team),meaningful=top.filter(isMeaningful),kept=[];let historyKept=0;
 for(const raw of sec?.paragraphs||[]){
  const p=normalizeTeamGrammar(clean(raw),team);if(!p||R45_PADDING.test(p))continue;
  const isStat=/^Against .+?, .+? scored \d+(?:\.\d+)? fantasy points/i.test(p),isHistory=/\b(?:2025 averages?|averaged .*last season|last season|prior season)\b/i.test(p);
  if(isStat){if(top.some(x=>playerMention(p,x)))kept.push(p);continue;}
  if(isHistory){if(historyKept<1&&top.some(x=>playerMention(p,x))){kept.push(p);historyKept++;}continue;}
  if(top.some(x=>playerMention(p,x))&&kept.length<5)kept.push(p);
 }
 if(!meaningful.length)sec.heading=reporterName(team?.inquirer_article)==='Jefferson Filch'?'Nobody Passed Inspection':'No Star to Invent';
 const current=()=>kept.join(' ');
 for(const p of top)if(!current().toLowerCase().includes(String(p.name).toLowerCase()))kept.push(`Also in the top-three Week 2 starter group for ${shortTeam(team)}: ${p.name}.`);
 let slot=0;
 while(kept.length<6&&top.length){kept.push(performanceAssessment(team,top[slot%top.length],slot));slot++;}
 return {...sec,paragraphs:kept.slice(0,6)};
}

function stripParagraph(raw,team,kind,sig,seen){
 const kept=[];
 for(const sentence0 of sentences(raw)){
  const sentence=normalizeTeamGrammar(sentence0,team);
  if(!sentence||GLOBAL_FILLER.test(sentence)||TECH.test(sentence)||SOLO.test(sentence))continue;
  if(kind!=='management'&&repeatsBench(sentence,sig))continue;
  if(['lede','sentiment','outlook'].includes(kind)&&/\b(?:manager|management)\b/i.test(sentence))continue;
  if(kind==='outlook'&&OPP_TRIVIA.test(sentence))continue;
  const key=sentenceKey(sentence);if(!key||seen.has(key))continue;seen.add(key);kept.push(sentence);
 }
 return clean(kept.join(' '));
}
function ensureRoad(team,sec){
 const up=(team?.upcoming_opponents||[]).slice().sort((a,b)=>Number(a.week)-Number(b.week)),later=up.slice(1,3);if(!later.length)return sec;
 const ranks=later.map(x=>Number(x?.context?.standings_rank)).filter(Number.isFinite),difficulty=ranks.length&&ranks.every(x=>x<=8)?'hard stretch':ranks.length&&ranks.every(x=>x>=24)?'friendlier stretch':'mixed stretch';
 const names=later.map(x=>`${String(x?.team_name||'opponent')} (${Number(x?.context?.record?.wins)||0}-${Number(x?.context?.record?.losses)||0})`),variant=(Number(team?.roster_id)||0)%4;
 const ends=[`A Week 3 win would bank something useful before that sequence.`,`Handle Week 3 and that road looks different for reasons the standings can actually explain.`,`Beat the Week 3 opponent and the pressure attached to those later games changes immediately.`,`Week 3 matters first; a win would keep that later stretch from carrying extra weight.`];
 const road=`After Week 3 come ${names.join(' and ')}; by the current standings, that is a ${difficulty}. ${ends[variant]}`;
 let ps=[...(sec?.paragraphs||[])].filter(p=>!later.every(x=>String(p).toLowerCase().includes(String(x?.team_name||'').toLowerCase())));ps.splice(Math.max(0,ps.length-1),0,road);return {...sec,paragraphs:ps};
}

function reviseTeam(team){
 const article=team?.inquirer_article;if(!article)return team;const sig=benchSignature(article),seen=new Set();let sections=[];
 for(const sec0 of article.sections||[]){
  let sec={...sec0,paragraphs:[...(sec0?.paragraphs||[])]};const kind=String(sec?.kind||'');
  if(kind==='players')sec=revisePlayers(team,sec);
  sec.paragraphs=(sec.paragraphs||[]).map(p=>stripParagraph(p,team,kind,sig,seen)).filter(Boolean);
  if(kind==='value'){
   let flirtSeen=false;sec.paragraphs=sec.paragraphs.map(p=>clean(sentences(p).filter(s=>{if(!/can flirt with the market/i.test(s))return true;if(flirtSeen)return false;flirtSeen=true;return true;}).join(' '))).filter(Boolean);
  }
  if(kind==='outlook')sec=ensureRoad(team,sec);
  sections.push(sec);
 }
 article.sections=sections;article.paragraphs=sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);article.structure_revision='week2-r49';return team;
}

function recentWeek1(t){return Number(t?.league_context?.recent_games?.find?.(g=>Number(g?.week)===1)?.points);}
function recordWins(t){return Number(t?.league_context?.record?.wins)||0;}
function recordLosses(t){return Number(t?.league_context?.record?.losses)||0;}
function twoWeekAvg(t){const vals=(t?.league_context?.recent_games||[]).map(g=>Number(g?.points)).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:Number(t?.points)||0;}
function teamLabel(t){return `${fullTeam(t)} (${rosterRecord(t)})`;}
function uniqueMatchups(teams){const byId=new Map(teams.map(t=>[String(t.roster_id),t])),seen=new Set(),out=[];for(const t of teams){const oid=String(t?.opponent_roster_id||'');if(!oid||!byId.has(oid))continue;const key=[String(t.roster_id),oid].sort().join(':');if(seen.has(key))continue;seen.add(key);const o=byId.get(oid);out.push({a:t,b:o,combined:Number(t.points)+Number(o.points),margin:Math.abs(Number(t.points)-Number(o.points))});}return out;}
function sectionVoice(sec){
 const name=String(sec?.reporter?.name||'');if(/Nick Swindell/i.test(name))return'nick';if(/Tilly Fleecer/i.test(name))return'tilly';if(/Bartholomew Roycington/i.test(name))return'bartholomew';if(/Jefferson Filch/i.test(name))return'jefferson';
 const id=String(sec?.reporter?.id||'');return id==='walter-mercer'?'nick':id==='nora-voss'?'jefferson':id==='mack-hollis'?'tilly':'bartholomew';
}
function replaceSectionParagraphs(overview,teams){
 const sections=overview?.sections||[];if(!sections.length)return;const sorted=[...teams].sort((a,b)=>Number(b.points)-Number(a.points)),matchups=uniqueMatchups(teams),high=sorted[0],low=sorted.at(-1),close=[...matchups].sort((a,b)=>a.margin-b.margin)[0],wide=[...matchups].sort((a,b)=>b.margin-a.margin)[0],loud=[...matchups].sort((a,b)=>b.combined-a.combined)[0],quiet=[...matchups].sort((a,b)=>a.combined-b.combined)[0],jumps=teams.map(t=>({t,d:Number(t.points)-recentWeek1(t)})).filter(x=>Number.isFinite(x.d)).sort((a,b)=>b.d-a.d),falls=[...jumps].sort((a,b)=>a.d-b.d),undefeated=teams.filter(t=>recordWins(t)===2).map(t=>({t,avg:twoWeekAvg(t)})).sort((a,b)=>b.avg-a.avg),winless=teams.filter(t=>recordLosses(t)===2).map(t=>({t,avg:twoWeekAvg(t)})).sort((a,b)=>b.avg-a.avg),projection=teams.filter(t=>Number.isFinite(Number(t.next_projected))&&Number.isFinite(Number(t.next_opponent_projected))).map(t=>({t,gap:Math.abs(Number(t.next_projected)-Number(t.next_opponent_projected))})).sort((a,b)=>b.gap-a.gap)[0];
 const sets={
  nick:[high?`${teamLabel(high)} led Week 2 at ${fmt(high.points)} points, while ${teamLabel(low)} finished last at ${fmt(low.points)}. That is the actual scoring range; start there.`:'The scoring board did not produce a clean extreme worth forcing into copy.',close?`${teamLabel(close.a)} and ${teamLabel(close.b)} finished ${fmt(close.margin)} points apart, the closest margin of Week 2. One lineup decision can matter there without pretending every bench point caused the result.`:'No completed matchup supplied a usable close-game comparison.',jumps[0]?`${teamLabel(jumps[0].t)} made the largest Week 1-to-Week 2 scoring jump at ${fmt(jumps[0].d)} points. That change matters more than repeating the opener.`:'The week-over-week board did not yield a clean biggest mover.'],
  tilly:[loud?`${teamLabel(loud.a)} and ${teamLabel(loud.b)} combined for ${fmt(loud.combined)} points, the highest-scoring matchup of Week 2. That game earned the noise without a fake subplot.`:'Week 2 did not supply a clean highest-scoring matchup.',quiet?`${teamLabel(quiet.a)} and ${teamLabel(quiet.b)} combined for ${fmt(quiet.combined)} points, the lowest-scoring matchup of the week. Nobody needs a fake star from that.`:'Week 2 did not supply a clean lowest-scoring matchup.',wide?`${teamLabel(wide.a)} and ${teamLabel(wide.b)} finished ${fmt(wide.margin)} points apart, the largest margin of Week 2. The scoreboard did enough talking on its own.`:'Week 2 did not supply a clean largest-margin matchup.'],
  bartholomew:[undefeated[0]?`${teamLabel(undefeated[0].t)} owns the strongest two-week scoring average among the 2-0 teams at ${fmt(undefeated[0].avg)}. A clean record with real scoring behind it is considerably easier to admire.`:'No 2-0 team produced a usable scoring comparison.',winless[0]?`${teamLabel(winless[0].t)} has the strongest two-week scoring average among the 0-2 teams at ${fmt(winless[0].avg)}. The record is ugly; the scoring says the obituary can wait.`:'No 0-2 team produced a usable scoring comparison.',falls[0]?`${teamLabel(falls[0].t)} had the sharpest scoring fall from Week 1, dropping ${fmt(Math.abs(falls[0].d))} points. One bad turn does not erase the opener, but it makes Week 3 interesting.`:'No team produced a clear week-over-week scoring fall.'],
  jefferson:[projection?`${teamLabel(projection.t)} sits in the largest Week 3 projection gap at ${fmt(projection.gap)} points against ${String(projection.t?.next_opponent_name||'its next opponent')}. The projection is a question to test, not a result to pre-write.`:'The Week 3 projection board is not clean enough to feature a verified gap.',undefeated.at(-1)?`${teamLabel(undefeated.at(-1).t)} has the weakest two-week scoring average among the 2-0 teams at ${fmt(undefeated.at(-1).avg)}. The record is clean; the scoring still deserves inspection.`:'The undefeated group does not have a clean low-end comparison.',winless[0]?`${teamLabel(winless[0].t)} has the strongest two-week scoring average among winless teams at ${fmt(winless[0].avg)}. Two losses can still describe a lineup doing more right than the standings admit.`:'The winless group does not have a clean high-end comparison.']
 };
 for(const sec of sections){const v=sectionVoice(sec);if(sets[v])sec.paragraphs=sets[v];}
}
function compactHotTake(h){const title=String(h?.title||''),take=String(h?.take||'');if(/division board/i.test(title))return h;const out=[];for(const s of sentences(take)){if(TECH.test(s)||SOLO.test(s)||GLOBAL_FILLER.test(s))continue;out.push(s);if(out.length>=2||words(out.join(' '))>=55)break;}return {...h,take:clean(out.join(' '))};}
function reviseOverview(overview,teams){if(!overview)return overview;replaceSectionParagraphs(overview,teams);overview.sections=(overview.sections||[]).map(s=>({...s,paragraphs:(s.paragraphs||[]).map(p=>clean(sentences(p).filter(x=>!TECH.test(x)&&!SOLO.test(x)&&!GLOBAL_FILLER.test(x)).join(' '))).filter(Boolean)}));overview.hot_takes=(overview.hot_takes||[]).map(compactHotTake);overview.structure_revision='week2-r49';return overview;}

export function applyWeek2EditorialR16(raw){const out=applyR48(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;out.teams=(out.teams||[]).map(reviseTeam);out.league_overview=reviseOverview(out.league_overview,out.teams||[]);out.structure_revision='week2-r49';if(out.league_overview)out.league_overview.structure_revision='week2-r49';return out;}

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
