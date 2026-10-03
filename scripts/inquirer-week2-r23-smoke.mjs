import assert from 'node:assert/strict';
import rawWeek2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {applyWeek2EditorialR16,WEEK2_EDITORIAL_REVISION} from '../netlify/functions/inquirer-week2-editorial-r23.mjs';

const snapshot=JSON.stringify(rawWeek2);
const revised=applyWeek2EditorialR16(rawWeek2);
assert.equal(Number(WEEK2_EDITORIAL_REVISION),23);
assert.equal(Number(revised?.editorial_revision),23);
assert.equal(revised?.voice_revision,'week2-r23');
assert.equal(JSON.stringify(rawWeek2),snapshot,'R23 must not mutate frozen Week 2 preload');
assert.equal((revised?.teams||[]).length,32,'R23 must retain all 32 Week 2 teams');

const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fullText=t=>(t?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' ');
const shortTeam=n=>String(n||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(n||'').trim();
const exactCount=(text,phrase)=>(String(text||'').match(new RegExp(`\\b${esc(phrase)}\\b`,'gi'))||[]).length;

const BAD_META=/\b(?:headline|back page|copy desk|newsroom|typeface|case file|receipts?|scoring app|group chat|notification|screenshot|social media|algorithm|meme|MIDA|probability model|projection creates an expectation|accounting with the game missing|accounting in a cheap costume|scoring quality|market movement and weekly production are answering different questions|identify the decision management should repeat or correct)\b/i;
const BAD_CARRY=/\b(?:one[- ]man show|one[- ]player show|one[- ]player magic trick|solo effort|supporting cast|second punch|third scorer|keep(?:ing)? (?:the |this )?(?:roster|team) afloat|hold(?:ing)? (?:the |this )?(?:roster|team) together|whole roster to repeat|asking the whole roster|carry(?:ing|ied|ies)? (?:the |this )?(?:whole |entire )?(?:roster|team|offense))\b/i;
const BAD_TAG=/\b(?:Fleeced Signal (?:was|is|says)|the Fleeced Signal|Signal was (?:Breakout Watch|Hot Seat|Cool Throne))\b/i;
const BAD_TEMPLATE=/\b(?:found a player who owned the scene|resist rewriting the script before the applause stops|triumph and public embarrassment shared the same stage|deserve its own orchestra|lineup returned the favor by judging management in public|market number wearing formal clothes|price tag until Sunday arrives with better dialogue|tragedy has been considerate enough to explain itself|supplying its own punchlines; nobody needs to help|crowd has chosen emotional excess)\b/i;
const BAD_GRAMMAR=/\b(?:The record for .+ are\b|My Week 3 request for .+ are simple\b|For [A-Z][^.]+, good\b|\bi respect\b)/i;
const BAD_SCORE_RESTATEMENT=/\b(?:gets the (?:love|praise) after\s+-?\d|earns? clean credit at\s+-?\d|gave the lineup\s+-?\d|dropped\s+-?\d+(?:\.\d+)?\b|beat projection by\s+-?\d+(?:\.\d+)?\s+points?)\b/i;

function playerNames(t){
 const set=new Set((t?.starter_details||[]).map(p=>String(p?.name||'').trim()).filter(Boolean));
 for(const s of sentences(fullText(t))){
  for(const re of [/^Against .+?,\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+scored\b/i,/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+averaged\b/i,/^The prior baseline for\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\b/i]){const m=s.match(re);if(m){set.add(m[1]);break}}
 }
 return [...set].sort((a,b)=>b.length-a.length);
}
function namedPlayer(s,players){const low=s.toLowerCase();return players.find(p=>{const i=low.indexOf(p.toLowerCase());if(i<0)return false;return !/[A-Za-z]/.test(s[i-1]||'')&&!/[A-Za-z]/.test(s[i+p.length]||'')})||null}
function isScoreFact(s,p){return /real-football line|\bscored\s+-?\d+(?:\.\d+)?\s+fantasy points|\bgave (?:the lineup|\w+)\s+-?\d+(?:\.\d+)?|\bgets the (?:love|praise) after\s+-?\d|\bears? clean credit at\s+-?\d|\bdropped\s+-?\d+(?:\.\d+)?|\bhad a bad Week 2 at\s+-?\d|\bat\s+-?\d+(?:\.\d+)?\s+is specific enough|\bbeat projection by\s+-?\d|\bposted\s+-?\d+(?:\.\d+)?|\banswered with\s+-?\d+(?:\.\d+)?/i.test(s)||new RegExp(`^${esc(p)}\\s+(?:scored|gave|posted|delivered)\\b`,'i').test(s)}

const reporterCounts=new Map();
for(const t of revised.teams){
 const a=t?.inquirer_article||{},sections=a.sections||[],text=fullText(t),full=String(t.team_name||''),short=shortTeam(full);
 assert.equal(Number(a.editorial_revision),23,`R23 article revision missing: ${full}`);
 assert.equal(a.voice_revision,'week2-r23',`R23 voice revision missing: ${full}`);
 assert(words(text)>=750,`R23 over-compressed ${full}: ${words(text)} words`);
 assert(!BAD_META.test(text),`Meta/method language survived in ${full}`);
 assert(!BAD_CARRY.test(text),`Carry/support motif survived in ${full}`);
 assert(!BAD_TAG.test(text),`Unnatural signal language survived in ${full}`);
 assert(!BAD_TEMPLATE.test(text),`Repeated decorative template survived in ${full}`);
 assert(!BAD_GRAMMAR.test(text),`Awkward grammar survived in ${full}`);
 assert(!BAD_SCORE_RESTATEMENT.test(text),`Score-restatement filler survived in ${full}`);

 let sectionsWithCopy=0;
 for(const sec of sections){
  if(!(sec?.paragraphs||[]).length)continue;sectionsWithCopy++;
  for(const p of sec.paragraphs){
   assert(exactCount(p,full)<=1,`Full team name repeated inside one paragraph for ${full}: ${p}`);
   assert(!new RegExp(`\\b${esc(short)}'s\\b`,'i').test(p)||!/s$/i.test(short),`Plural possessive regression for ${full}: ${p}`);
  }
 }
 assert(exactCount(text,full)<=sectionsWithCopy+1,`Full team name overused across ${full}: ${exactCount(text,full)} mentions for ${sectionsWithCopy} sections`);

 const seen=new Set();
 for(const s of sentences(text)){
  if(words(s)<8)continue;const k=s.toLowerCase().replace(/\s+/g,' ').trim();assert(!seen.has(k),`Exact long sentence repeated in ${full}: ${s}`);seen.add(k);
 }
 const players=playerNames(t),scoreCounts=new Map();
 for(const s of sentences(text)){const p=namedPlayer(s,players);if(p&&isScoreFact(s,p))scoreCounts.set(p,(scoreCounts.get(p)||0)+1)}
 for(const [p,n] of scoreCounts)assert(n<=1,`Player score fact repeated for ${p} in ${full}: ${n} times`);

 const rid=String(a?.reporter?.id||'');reporterCounts.set(rid,(reporterCounts.get(rid)||0)+1);
}
for(const id of ['walter-mercer','tess-delaney','mack-hollis','nora-voss'])assert.equal(reporterCounts.get(id),8,`R23 must retain 8 Week 2 articles for ${id}`);

const aints=revised.teams.find(t=>/new orleans aints/i.test(String(t.team_name||'')));
assert(aints,'New Orleans Aints article missing');
const aintsText=fullText(aints);
assert.equal(sentences(aintsText).filter(s=>/Maxx Crosby/i.test(s)&&/\b3\.5\b/.test(s)).length,1,'Maxx Crosby 3.5 should be stated once');
assert.equal(sentences(aintsText).filter(s=>/Jaxon Smith-Njigba/i.test(s)&&/\b42\.5\b/.test(s)).length,1,'JSN 42.5 should be stated once');

const overview=revised?.league_overview||{},overviewText=(overview.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' ');
assert.equal(Number(overview.editorial_revision),23);
assert.equal(overview.voice_revision,'week2-r23');
assert(!BAD_META.test(overviewText),'Weekly Recap still contains meta/method language');
assert(!BAD_CARRY.test(overviewText),'Weekly Recap carry/support motif returned');
assert(!BAD_TAG.test(overviewText),'Weekly Recap unnatural signal language returned');
for(const sec of overview.sections||[]){
 for(const p of sec?.paragraphs||[]){
  for(const t of revised.teams){const full=String(t.team_name||'');if(full)assert(exactCount(p,full)<=1,`Weekly Recap repeats full team name in one paragraph: ${full} -> ${p}`)}
 }
 assert(!/\b(?:headline|back page|receipts?)\b/i.test(String(sec?.heading||'')),`Weekly Recap meta heading survived: ${sec?.heading}`);
}

console.log(JSON.stringify({ok:true,revision:23,teams:revised.teams.length,reporters:Object.fromEntries(reporterCounts),overview_words:words(overviewText)},null,2));
