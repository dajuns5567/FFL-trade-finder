import assert from 'node:assert/strict';
import rawWeek2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {applyWeek2EditorialR16 as applyR21} from '../netlify/functions/inquirer-week2-editorial-r21.mjs';
import {applyWeek2EditorialR16 as applyR22,WEEK2_EDITORIAL_REVISION} from '../netlify/functions/inquirer-week2-editorial-r22.mjs';

const snapshot=JSON.stringify(rawWeek2);
const baseline=applyR21(rawWeek2);
const revised=applyR22(rawWeek2);
assert.equal(JSON.stringify(rawWeek2),snapshot,'R22 must not mutate the locked Week 2 preload');
assert.equal(Number(WEEK2_EDITORIAL_REVISION),22);
assert.equal(Number(revised?.editorial_revision),22);
assert.equal(revised?.voice_revision,'week2-r22');
assert.equal((revised?.teams||[]).length,32,'R22 must retain all 32 Week 2 team articles');

const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const articleParagraphs=t=>(t?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
const section=(t,kind)=>(t?.inquirer_article?.sections||[]).find(s=>String(s?.kind||'')===kind)||null;
const stripArticle=t=>{const x=JSON.parse(JSON.stringify(t));delete x.inquirer_article;return x};
const stripArticleMeta=a=>{const x=JSON.parse(JSON.stringify(a||{}));delete x.sections;delete x.paragraphs;delete x.editorial_revision;delete x.voice_revision;return x};
const baseByRoster=new Map((baseline?.teams||[]).map(t=>[String(t.roster_id),t]));

const META_TECH=/\b(?:headline|back page|copy desk|newsroom|typeface|case file|receipts?|scoring app|group chat|notification|screenshot|social media|algorithm|meme)\b/i;
const CARRY=/\b(?:carry(?:ing|ied|ies)? (?:the |this )?(?:entire |whole )?(?:roster|team|offense)|carried (?:the |this )?(?:entire |whole )?(?:roster|team|offense)|keep(?:ing)? (?:the |this )?(?:roster|team) afloat|hold(?:ing)? (?:the |this )?(?:roster|team) together|on (?:his|her|their) (?:back|shoulders)|one[- ]man show|one[- ]player show|one[- ]player magic trick|solo effort|supporting cast|second punch|third scorer|do it all (?:himself|herself|themselves)|all by (?:himself|herself|themselves)|drag(?:ged|ging)? (?:the |this )?(?:roster|team)|shoulder(?:ing|ed)? (?:the |this )?(?:whole |entire )?(?:roster|team)|everyone else (?:was|is) (?:a )?passenger|save(?:d|s|ing)? everyone else|prevent(?:ed|ing)? .* solo effort|can(?:not|'t) do it alone|needs? (?:somebody|someone) else to help|rest of the roster .* help|one player .* everything)\b/i;
const BAD_SIGNAL=/\b(?:Fleeced Signal|Fleeced\s+(?:Breakout Watch|Hot Seat|Cool Throne|Established Star|Steady Veteran|Young Breakout|Proven Star)\s+signal|carried a Fleeced\s+.+?\s+signal into Week 2)\b/i;
const WEIGHTLESS=/\b(?:Subtlety was apparently scratched before kickoff|favorite badge is the whole argument|difference is large enough to track directly into Week 3|excessive enough to be enjoyable and useful enough to avoid becoming nonsense|touring comedy|number is funny because|difference is funny because)\b/i;
const VOICE=/\b(?:I refuse|I resent|I want|I need|I am|I can|I would|I dislike|I adore|I expect|ridiculous|absurd|ugly|awful|pathetic|embarrass|tomatoes|champagne|applause|theater|stage|curtain|complaint|rent|committee|mock|rude|mercifully|annoy|nonsense|drama|rewrite|audience|roses|balcony|dialogue|ceremony|swagger|irresponsib|management owns|bad luck|heckl|boo|criticism|generosity|suspicious|delicious|lovely|disgust|laugh)\b/i;
const majorKinds=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];

function discoverPlayers(article){
 const out=new Set(),ss=(article?.sections||[]).flatMap(s=>s?.paragraphs||[]).flatMap(sentences);
 const patterns=[
  /^Against .+?,\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+scored\s+-?\d/i,
  /^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+averaged\s+\d/i,
  /^The prior baseline for\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+is\s+\d/i,
  /^A\s+\d+(?:\.\d+)?\s+prior average .*? for\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\b/i,
  /^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+played\s+\d+(?:\.\d+)?%/i,
  /snap share for\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\b/i,
  /^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+entered Week 2 (?:on|tagged)\s+/i
 ];
 for(const s of ss){for(const re of patterns){const m=s.match(re);if(m){out.add(m[1].trim());break}}}
 return [...out].sort((a,b)=>b.length-a.length);
}
function exactName(text,name){
 const low=String(text||'').toLowerCase(),needle=String(name||'').toLowerCase(),i=low.indexOf(needle);if(i<0)return false;
 const before=String(text||'')[i-1]||'',after=String(text||'')[i+name.length]||'';
 return !/[A-Za-z]/.test(before)&&!/[A-Za-z]/.test(after);
}
function namedPlayer(s,players){return players.find(p=>exactName(s,p))||null}
function canonicalPlayer(player,players){
 const p=String(player||'').trim();if(!p)return'';if(/\s/.test(p))return p.toLowerCase();
 const full=players.find(x=>/\s/.test(x)&&String(x).split(/\s+/)[0].toLowerCase()===p.toLowerCase());
 return String(full||p).toLowerCase();
}
function factKey(s,players){
 const p=namedPlayer(s,players);
 if(p){
  const k=canonicalPlayer(p,players),escaped=p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(/real-football line|\bscored\s+-?\d+(?:\.\d+)?\s+fantasy points|\bgave\s+(?:\w+\s+)?-?\d+(?:\.\d+)?\s+points|\bposted\s+-?\d+(?:\.\d+)?\b|\bdelivered\s+-?\d+(?:\.\d+)?\b|Week 2 landed at\s+-?\d|\b-?\d+(?:\.\d+)?\s+(?:fantasy\s+)?points?\s+from\b/i.test(s)||new RegExp('^'+escaped+'\\s+at\\s+-?\\d+(?:\\.\\d+)?\\b','i').test(s))return`score|${k}`;
  if(/averaged\s+\d+(?:\.\d+)?\s+fantasy points|prior baseline|prior average/i.test(s))return`baseline|${k}`;
  if(/snap share|played\s+\d+(?:\.\d+)?%|available snaps/i.test(s))return`usage|${k}`;
  if(/Breakout Watch|Hot Seat|Cool Throne|Established Star|Steady Veteran|Young Breakout|Proven Star|Week 2 tag|entered Week 2 (?:on|tagged)/i.test(s))return`tag|${k}`;
 }
 const m=String(s||'').match(/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+(?:outscored|beat)\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+by\s+(\d+(?:\.\d+)?)/i);
 if(m)return`bench|${m[1].toLowerCase()}|${m[2].toLowerCase()}|${m[3]}`;
 return'';
}
function conclusionKey(s,players){
 if(/\d/.test(s))return'';const p=namedPlayer(s,players);if(!p)return'';const k=canonicalPlayer(p,players);
 if(/keep .*?(?:involved|plan)|use .*?(?:again|what worked)|obvious answer|smart move is to use/i.test(s))return`use|${k}`;
 if(/bad week|ugly|dreadful|rough|problem|concern|not enough/i.test(s))return`concern|${k}`;
 if(/role|usage|snap|opportunity/i.test(s))return`role|${k}`;
 if(/trust|baseline|expectation/i.test(s))return`trust|${k}`;
 if(/management|lineup (?:call|choice|decision|mistake)/i.test(s))return`management|${k}`;
 return'';
}
function maxExactLongRepeat(text){
 const m=new Map();for(const s of sentences(text)){if(words(s)<8)continue;const k=s.toLowerCase().replace(/\s+/g,' ').trim();m.set(k,(m.get(k)||0)+1)}
 return Math.max(0,...m.values());
}
function maxDryRun(paragraphs){
 let cur=0,max=0;for(const p of paragraphs||[]){if(VOICE.test(p)){cur=0}else{cur+=1;max=Math.max(max,cur)}}return max;
}

const reporterCounts=new Map();
for(const t of revised?.teams||[]){
 const old=baseByRoster.get(String(t.roster_id));assert(old,'Missing R21 baseline for '+t.team_name);
 assert.deepEqual(stripArticle(t),stripArticle(old),'R22 changed non-article Week 2 facts for '+t.team_name);
 assert.deepEqual(stripArticleMeta(t.inquirer_article),stripArticleMeta(old.inquirer_article),'R22 changed article metadata/facts outside prose for '+t.team_name);
 assert.deepEqual((t.inquirer_article?.sections||[]).map(s=>s.kind),(old.inquirer_article?.sections||[]).map(s=>s.kind),'R22 changed section format for '+t.team_name);
 assert.equal(Number(t.inquirer_article?.editorial_revision),22,'R22 article revision missing for '+t.team_name);
 assert.equal(t.inquirer_article?.voice_revision,'week2-r22','R22 article voice revision missing for '+t.team_name);
 assert.deepEqual(t.inquirer_article?.paragraphs||[],articleParagraphs(t),'R22 flattened article body is out of sync for '+t.team_name);
 const text=articleParagraphs(t).join(' '),wc=words(text);
 assert(wc>=800,'R22 over-compressed '+t.team_name+': '+wc+' words');
 assert.doesNotMatch(text,META_TECH,'R22 left meta/tech language in '+t.team_name);
 assert.doesNotMatch(text,CARRY,'R22 revived carry-the-roster/supporting-cast language in '+t.team_name);
 assert.doesNotMatch(text,BAD_SIGNAL,'R22 uses unnatural Fleeced Signal phrasing in '+t.team_name);
 assert.doesNotMatch(text,WEIGHTLESS,'R22 left weightless arithmetic/meta humor in '+t.team_name);
 assert(maxExactLongRepeat(text)<=1,'R22 repeats a long sentence inside '+t.team_name);
 const voiceSentences=sentences(text).filter(s=>VOICE.test(s)).length;
 assert(voiceSentences>=7,'R22 article is still too dry for '+t.team_name+': '+voiceSentences+' voice sentences');
 for(const sec of t.inquirer_article?.sections||[]){
  for(const p of sec?.paragraphs||[])assert(words(p)<=82,'R22 left an overlong paragraph in '+t.team_name+' / '+sec?.kind+': '+words(p));
 }
 for(const kind of majorKinds){
  const ps=section(t,kind)?.paragraphs||[];if(!ps.length)continue;
  assert(ps.some(p=>VOICE.test(p)),'R22 '+kind+' section lacks sarcastic/emotional reporter voice for '+t.team_name);
  if(ps.length>=4)assert(maxDryRun(ps)<=3,'R22 '+kind+' section has a long dry voice stretch for '+t.team_name+': '+maxDryRun(ps));
 }
 const players=discoverPlayers(t.inquirer_article),facts=new Map(),conclusions=new Map();
 for(const sec of t.inquirer_article?.sections||[]){
  for(const s of (sec?.paragraphs||[]).flatMap(sentences)){
   const fk=factKey(s,players);if(fk)facts.set(fk,(facts.get(fk)||0)+1);
   const ck=conclusionKey(s,players);if(ck)conclusions.set(ck,(conclusions.get(ck)||0)+1);
  }
 }
 for(const [k,c] of facts)assert(c<=1,'R22 repeats the same player fact across sections for '+t.team_name+': '+k+' -> '+c);
 for(const [k,c] of conclusions)assert(c<=1,'R22 repeats the same player conclusion across sections for '+t.team_name+': '+k+' -> '+c);
 const rid=String(t?.inquirer_article?.reporter?.id||'');reporterCounts.set(rid,(reporterCounts.get(rid)||0)+1);
}
assert.deepEqual(Object.fromEntries([...reporterCounts.entries()].sort()),{'mack-hollis':8,'nora-voss':8,'tess-delaney':8,'walter-mercer':8});

const overview=revised?.league_overview||{};
assert.equal(Number(overview.editorial_revision),22);
assert.equal(overview.voice_revision,'week2-r22');
const recapSections=overview.sections||[],recapParagraphs=recapSections.flatMap(s=>s?.paragraphs||[]).filter(Boolean),recapText=recapParagraphs.join(' ');
assert.equal(recapParagraphs.length,12,'R22 Weekly Recap must retain 12 focused insight paragraphs');
assert.doesNotMatch(recapText,META_TECH,'R22 recap still uses meta/tech language');
assert.doesNotMatch(recapText,CARRY,'R22 recap revived carry-the-roster/supporting-cast language');
assert.doesNotMatch(recapText,BAD_SIGNAL,'R22 recap uses unnatural Fleeced Signal phrasing');
assert.doesNotMatch(recapText,WEIGHTLESS,'R22 recap left weightless arithmetic/meta humor');
for(const s of recapSections)assert.doesNotMatch(String(s?.heading||''),META_TECH,'R22 recap heading uses meta language: '+s?.heading);
for(const p of recapParagraphs){assert(words(p)<=85,'R22 recap paragraph too long: '+words(p));assert(sentences(p).length<=4,'R22 recap paragraph bundles too many ideas: '+p);assert.match(p,VOICE,'R22 recap paragraph lacks sarcastic/emotional reporter commentary: '+p)}
for(const id of ['walter-mercer','tess-delaney','mack-hollis','nora-voss']){
 const ps=recapSections.filter(s=>String(s?.reporter?.id||'')===id).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 assert.equal(ps.length,3,'R22 recap must retain three focused paragraphs for '+id);
}
const what=recapSections.find(s=>/What Actually Mattered This Week/i.test(String(s?.heading||'')));
assert(what,'R22 must retain What Actually Mattered This Week');
assert.equal((what.paragraphs||[]).length,3);
for(const p of what.paragraphs||[])assert.match(p,VOICE,'R22 What Actually Mattered paragraph lacks reporter personality: '+p);

const aints=(revised.teams||[]).find(t=>/new orleans aints/i.test(String(t.team_name||'')));
if(aints){
 const text=articleParagraphs(aints).join(' ');
 if(/Dallas Turner/i.test(text)&&/Breakout Watch/i.test(text)){
  assert.doesNotMatch(text,/Fleeced Signal|Fleeced\s+Breakout Watch\s+signal/i,'Dallas Turner tag must read naturally');
 }
}

console.log(JSON.stringify({ok:true,editorial_revision:22,teams:revised.teams.length,reporters:Object.fromEntries(reporterCounts),recap_paragraphs:recapParagraphs.length,max_recap_words:Math.max(...recapParagraphs.map(words)),min_team_words:Math.min(...revised.teams.map(t=>words(articleParagraphs(t).join(' ')))),max_team_words:Math.max(...revised.teams.map(t=>words(articleParagraphs(t).join(' '))))},null,2));