import assert from 'node:assert/strict';
import rawWeek2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import week1 from '../netlify/functions/inquirer-week1-2026-preload.mjs';
import {applyWeek2EditorialR16 as applyR19} from '../netlify/functions/inquirer-week2-editorial-r19.mjs';
import {applyWeek2EditorialR16 as applyR20,WEEK2_EDITORIAL_REVISION} from '../netlify/functions/inquirer-week2-editorial-r20.mjs';

const snapshot=JSON.stringify(rawWeek2);
const r19=applyR19(rawWeek2);
const revised=applyR20(rawWeek2);
assert.equal(JSON.stringify(rawWeek2),snapshot,'R20 must not mutate the locked Week 2 preload');
assert.equal(Number(WEEK2_EDITORIAL_REVISION),20);
assert.equal(Number(revised?.editorial_revision),20);
assert.equal(revised?.voice_revision,'week2-r20');

const one=v=>Number(v).toFixed(1);
const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const wordCount=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const escapeRe=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pluralGrammar=(t,text)=>{
 const full=String(t?.team_name||'').trim(),mascot=full.split(/\s+/).filter(Boolean).at(-1)||'';
 if(!full||!/s$/i.test(mascot))return String(text||'');
 const re=new RegExp('(^|[.!?]\\s+)(?:'+escapeRe(full)+'|'+escapeRe(mascot)+')\\s+(is|has|gets|holds|brings|turns)\\b','gi');
 const verbs={is:'are',has:'have',gets:'get',holds:'hold',brings:'bring',turns:'turn'};
 return String(text||'').replace(re,(m,prefix,verb)=>{
  const subject=m.slice(prefix.length,m.length-verb.length).trimEnd();
  return prefix+subject+' '+(verbs[String(verb).toLowerCase()]||verb);
 });
};
const stripArticle=t=>{const x=JSON.parse(JSON.stringify(t));delete x.inquirer_article;return x};
const stripArticleMeta=a=>{const x=JSON.parse(JSON.stringify(a||{}));delete x.sections;delete x.paragraphs;delete x.editorial_revision;delete x.voice_revision;return x};
const section=(t,kind)=>(t?.inquirer_article?.sections||[]).find(s=>String(s?.kind||'')===kind)||null;
const articleParagraphs=t=>(t?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
const teamMap=new Map((r19?.teams||[]).map(t=>[String(t.roster_id),t]));
const w1ByRoster=new Map((week1?.teams||[]).map(t=>[String(t.roster_id),Number(t.points)]));
const w1Scores=[...w1ByRoster.values()].filter(Number.isFinite).sort((a,b)=>b-a);
const w2Scores=(revised?.teams||[]).map(t=>Number(t.points)).filter(Number.isFinite).sort((a,b)=>b-a);
const rank=(v,rows)=>{const n=Number(v);if(!Number.isFinite(n))return null;const i=rows.findIndex(x=>x<=n+1e-9);return i<0?rows.length:i+1};

assert.equal((revised?.teams||[]).length,(r19?.teams||[]).length,'R20 changed the Week 2 team count');
for(const t of revised?.teams||[]){
 const old=teamMap.get(String(t.roster_id));assert(old,'Missing R19 baseline team '+t.roster_id);
 assert.deepEqual(stripArticle(t),stripArticle(old),'R20 changed non-article Week 2 facts for '+t.team_name);
 assert.deepEqual(stripArticleMeta(t.inquirer_article),stripArticleMeta(old.inquirer_article),'R20 changed article metadata/facts outside prose for '+t.team_name);
 assert.deepEqual((t.inquirer_article?.sections||[]).map(s=>s.kind),(old.inquirer_article?.sections||[]).map(s=>s.kind),'R20 changed team-article section format for '+t.team_name);
 for(const kind of ['players','management','hot-seat','cool-throne','value','sentiment','outlook']){
  const expected=(section(old,kind)?.paragraphs||[]).map(p=>pluralGrammar(t,p));
  assert.deepEqual(section(t,kind)?.paragraphs||[],expected,'R20 should retain R19 '+kind+' information except plural-team grammar corrections for '+t.team_name);
 }
 const oldLede=section(old,'lede')?.paragraphs||[],lede=section(t,'lede')?.paragraphs||[];
 assert.notDeepEqual(lede,oldLede,'R20 scoring-quality context did not change the lede for '+t.team_name);
 const factualOldLede=oldLede.filter(x=>{
  const s=String(x||'');
  return /\d+(?:\.\d+)?–\d+(?:\.\d+)?/.test(s)||(/\b(?:Week 1|opener|opened|arrived from)\b/i.test(s)&&/\d+(?:\.\d+)?/.test(s));
 });
 for(const p of factualOldLede){
  const expected=pluralGrammar(t,p);
  assert(lede.includes(expected),'R20 dropped an existing score/Week 1 lede fact for '+t.team_name+': '+expected);
 }
 const quality=lede.find(p=>/scored -?\d+(?:\.\d+)? in Week 2, ranked \d+ of \d+/i.test(String(p)));
 assert(quality,'R20 lede lacks league-relative scoring rank for '+t.team_name);
 assert(/two-week scoring average ranks \d+ of \d+/i.test(quality),'R20 lede lacks two-week scoring context for '+t.team_name);
 const prior=w1ByRoster.get(String(t.roster_id));
 if(Number.isFinite(prior))assert(/Week 1 was -?\d+(?:\.\d+)?, ranked \d+ of \d+/i.test(quality),'R20 lede lacks Week 1 comparison for '+t.team_name);
 const r2=rank(t.points,w2Scores),r1=rank(prior,w1Scores),isWin=Number(t.points)>Number(t.opponent_points);
 if(isWin&&r2>24&&r1>24)assert(/bottom-quarter|not a strength|warning|low-scoring/i.test(quality),'Consistently low-scoring winner is being treated too generously: '+t.team_name);
 if(!isWin&&r2<=8&&rank(t.opponent_points,w2Scores)<=8)assert(/scored well|strong number|top-quarter|offense does not deserve/i.test(quality),'High-scoring loss lacks tough-matchup context: '+t.team_name);
 const mascot=String(t.team_name||'').trim().split(/\s+/).at(-1)||'';
 if(/s$/i.test(mascot)){
  const subject=new RegExp('^(?:'+escapeRe(String(t.team_name||''))+'|'+escapeRe(mascot)+')\\s+(?:is|has|gets|holds|brings|turns)\\b','i');
  for(const s of sentenceParts(articleParagraphs(t).join(' ')))assert.doesNotMatch(s,subject,'R20 left plural-team singular agreement in '+t.team_name+': '+s);
 }
 assert.equal(Number(t.inquirer_article?.editorial_revision),20,'R20 article revision missing for '+t.team_name);
 assert.equal(t.inquirer_article?.voice_revision,'week2-r20','R20 article voice revision missing for '+t.team_name);
 assert.deepEqual(t.inquirer_article?.paragraphs||[],articleParagraphs(t),'Flattened article body is out of sync for '+t.team_name);
}

const overview=revised?.league_overview||{};
assert.equal(Number(overview.editorial_revision),20);
assert.equal(overview.voice_revision,'week2-r20');
const overviewParagraphs=(overview.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
assert(overviewParagraphs.length>=8&&overviewParagraphs.length<=16,'R20 recap should be concise and insight-dense, got '+overviewParagraphs.length+' paragraphs');
for(const p of overviewParagraphs){
 assert(wordCount(p)<=85,'R20 recap paragraph is still too long ('+wordCount(p)+' words): '+p);
 assert(sentenceParts(p).length<=3,'R20 recap paragraph still bundles too many ideas: '+p);
}
const overviewText=overviewParagraphs.join(' ');
assert.doesNotMatch(overviewText,/The league has \d+ teams wearing 2-0, \d+ wearing 1-1 and \d+ wearing 0-2/i,'R20 retained the repetitive standings block from the screenshot');
assert.doesNotMatch(overviewText,/glamorous teams are already demanding attention|winless teams are running out of charming explanations|Week 2 arrived wearing jewelry/i,'R20 retained the concentrated recap sarcasm block from R19');

const REPORTERS=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];
const HUMOR=/\b(?:stupid|complaint|adorable|lipstick|gift|cape|furniture|hangover|healthy hobby|brass instruments|chess|tragedy|stage|bowing|retail price|bragging|funeral|parade|confetti|glamour|roses|villain|fireworks|accounting|coronation)\b/i;
for(const id of REPORTERS){
 const ps=(overview.sections||[]).filter(s=>String(s?.reporter?.id||'')===id).flatMap(s=>s?.paragraphs||[]);
 assert.equal(ps.length,3,'R20 recap should give each reporter three focused insight paragraphs: '+id+' -> '+ps.length);
 const funnyParagraphs=ps.filter(p=>HUMOR.test(p)).length;
 assert(funnyParagraphs>=2,'R20 recap humor/sarcasm is not distributed across the '+id+' section');
}
const seen=new Set(),dupes=[];
for(const s of sentenceParts(overviewText).filter(x=>wordCount(x)>=8)){
 const k=s.replace(/\s+/g,' ').trim().toLowerCase();if(seen.has(k))dupes.push(s);else seen.add(k);
}
assert.deepEqual(dupes,[],'R20 recap repeats exact commentary sentences');

console.log(JSON.stringify({ok:true,editorial_revision:revised.editorial_revision,teams:revised.teams.length,recap_paragraphs:overviewParagraphs.length,recap_max_words:Math.max(...overviewParagraphs.map(wordCount))},null,2));
