// Read-only, independent editorial regression gate. Never generates or publishes.
import {readFileSync,writeFileSync} from 'node:fs';
const expected=Number(process.env.INQUIRER_AUDIT_REVISION||106);
const origin=process.env.INQUIRER_PREVIEW_BASE||'https://deploy-preview-427--precious-dango-fb4633.netlify.app';
const findings=[],stats=[];
const paragraphs=a=>(a?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(p=>typeof p==='string');
const mark=(week,id,team)=>findings.push({week,id,team});
const norm=s=>String(s).toLowerCase().replace(/\s+/g,' ').trim();
async function load(week){
 const path=process.env['INQUIRER_WEEK'+week+'_FILE'];
 if(path)return JSON.parse(readFileSync(path,'utf8'));
 const u=new URL('/.netlify/functions/inquirer-preview-diagnostic',origin);
 u.searchParams.set('draft','1');u.searchParams.set('preview_week',week);
 const res=await fetch(u,{signal:AbortSignal.timeout(45000)});
 if(!res.ok)throw Error('Week '+week+' diagnostic returned HTTP '+res.status);
 return res.json();
}
function check(e,week){
 if(e.week!==week||e.season!==2026||e.editorial_revision!==expected)mark(week,'edition-identity','Edition');
 if(e.preview_only!==true||e.published_locked!==false)mark(week,'publication-isolation','Edition');
 if(e.preview_editorial_audit?.ok!==true||e.preview_generation_quality?.ok!==true)mark(week,'source-audit-failure','Edition');
 const teams=e.teams||[];
 if(teams.length!==32||new Set(teams.map(t=>String(t.roster_id))).size!==32)mark(week,'coverage','Edition');
 const reporters=new Map(),all=[];
 for(const t of teams){
  const a=t.inquirer_article||{},p=paragraphs(a),id=a.reporter?.id;
  reporters.set(id,(reporters.get(id)||0)+1);
  if((a.sections||[]).length!==8||p.filter(x=>x.trim().length>=50).length<6)mark(week,'article-depth-or-desks',t.team_name);
  if(/\bwin again\b/i.test(a.headline||'')){
   const prior=t.league_context?.recent_games?.find(g=>Number(g.week)===week-1);
   if(prior?.result!=='W')mark(week,'false-consecutive-win',t.team_name);
  }
  for(const x of p)all.push({team:t.team_name,copy:x});
 }
 if(reporters.size!==4||[...reporters.values()].some(n=>n!==8))mark(week,'reporter-balance','Edition');
 const overview=e.league_overview||{};
 if((overview.sections?.[0]?.blocks||[]).length!==6)mark(week,'recap-six-beat-contract','Weekly Recap');
 for(const s of overview.sections||[]){
  for(const x of s.paragraphs||[])all.push({team:'Weekly Recap',copy:x});
  for(const b of s.blocks||[])for(const x of b.paragraphs||[])all.push({team:'Weekly Recap',copy:x});
 }
 for(const h of overview.hot_takes||[]){
  const x=String(h.take||'');all.push({team:'Weekly Recap',copy:x});
  for(const label of ['Forget the preamble:','What Sunday exposed:','On the starter card:'])
   if(x.split(label).length>2)mark(week,'repeated-hot-take-preface','Weekly Recap');
 }
 const defects=[
  ['singular-score-agreement',/\bthe final score against [^.!?;]{2,90}? do not erase that work\b/i],
  ['singular-next-test',/\bthe next test against [^.!?;]{2,70}? are better suited\b/i],
  ['beating-take-agreement',/\bbeating [^.!?;]{2,70}? take a swing\b/i],
  ['recap-singular-quantifier',/\bof which 1 were decided\b/i],
  ['malformed-upset-copy',/at the first names on the scoring sheet card/i],
  ['meta-editorial-caveat',/not a prewritten final score|not a claim about their dynasty market prices|that is useful flexibility, not repetition/i]
 ];
 for(const {team,copy} of all){
  if(typeof copy!=='string'||!copy.trim())mark(week,'empty-paragraph',team);
  else if(copy!==copy.trim())mark(week,'paragraph-whitespace',team);
  for(const [id,regex] of defects)if(regex.test(String(copy)))mark(week,id,team);
 }
 stats.push({week,articles:teams.length,reporters:Object.fromEntries(reporters),teamParagraphs:teams.reduce((sum,t)=>sum+paragraphs(t.inquirer_article).length,0)});
}
try{
 const w7=await load(7),w8=await load(8);
 if(!Array.isArray(w7.teams)||!Array.isArray(w8.teams))throw Error('Diagnostic omitted manuscript teams');
 check(w7,7);check(w8,8);
 const byTeam=new Map(w7.teams.map(t=>[String(t.roster_id),new Set(paragraphs(t.inquirer_article).map(norm).filter(s=>s.length>120))]));
 for(const t of w8.teams){
  const prior=byTeam.get(String(t.roster_id))||new Set();
  for(const p of paragraphs(t.inquirer_article))if(prior.has(norm(p)))mark(8,'reused-prior-week-paragraph',t.team_name);
 }
}catch(e){mark(null,'manuscript-unavailable',String(e.message||e));process.exitCode=2;}
if(findings.length&&process.exitCode!==2)process.exitCode=1;
const summary={passed:findings.length===0,expected_revision:expected,checked_at:new Date().toISOString(),stats,findings};
if(process.env.INQUIRER_AUDIT_OUTPUT)writeFileSync(process.env.INQUIRER_AUDIT_OUTPUT,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));