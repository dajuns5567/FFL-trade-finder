import assert from 'node:assert/strict';
import rawWeek2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {applyWeek2EditorialR16 as applyR20} from '../netlify/functions/inquirer-week2-editorial-r20.mjs';
import {applyWeek2EditorialR16 as applyR21,WEEK2_EDITORIAL_REVISION} from '../netlify/functions/inquirer-week2-editorial-r21.mjs';

const snapshot=JSON.stringify(rawWeek2);
const baseline=applyR20(rawWeek2);
const revised=applyR21(rawWeek2);
assert.equal(JSON.stringify(rawWeek2),snapshot,'R21 must not mutate the locked Week 2 preload');
assert.equal(Number(WEEK2_EDITORIAL_REVISION),21);
assert.equal(Number(revised?.editorial_revision),21);
assert.equal(revised?.voice_revision,'week2-r21');
assert.equal((revised?.teams||[]).length,32,'R21 must retain all 32 Week 2 team articles');

const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const articleParagraphs=t=>(t?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
const section=(t,kind)=>(t?.inquirer_article?.sections||[]).find(s=>String(s?.kind||'')===kind)||null;
const stripArticle=t=>{const x=JSON.parse(JSON.stringify(t));delete x.inquirer_article;return x};
const stripArticleMeta=a=>{const x=JSON.parse(JSON.stringify(a||{}));delete x.sections;delete x.paragraphs;delete x.editorial_revision;delete x.voice_revision;return x};
const baseByRoster=new Map((baseline?.teams||[]).map(t=>[String(t.roster_id),t]));
const VOICE=/\b(?:complaint|ridiculous|absurd|patience|patient|silence|annoying|annoyed|ugly|beautiful|glamour|glamorous|champagne|tomatoes|applause|theater|stage|curtain|swagger|embarrass|heckl|boo|joke|funny|stupid|nonsense|I refuse|I resent|I would|I want|I am|I can|good luck|congratulations|mercifully|delicious|rude|parade|confetti|funeral|miracle|costume|shopping|credit card|committee meeting|rent|Monday|Sunday|production|scene|audience|roses|balcony|dialogue|drama|encore|apology|formalwear|lighting|outfit|open bar|restraint|tasteful|silly|stain|compliment|credit|ceremony|loud|theor(?:y|ies)|mistake|choice|relationship|rewrite)\b/i;
const CLINICAL=/\b(?:the question is no longer whether|too early to tell|strong result, useful contribution|materially changed the matchup|made the roster materially better for one week|role now has to justify another start|structural backing|does not need embellishment|enough real Week 2 information|still only one completed Sunday|the production was real|stands on its own|the useful question is whether)\b/i;
const META=/\b(?:back page|headline|copy desk|newsroom|typeface|case file|receipts?)\b/i;
const PANIC=/\b(?:panic|alarm|crisis|emergency|bench(?:ing)?|cut\b|replace(?:ment)?|hot seat|justify another start|should not start|shouldn't start|cannot be trusted|can't be trusted|problem harder to dismiss)\b/i;
const HUMOR=/\b(?:complaint|adorable|lipstick|gift|cape|furniture|hangover|healthy hobby|brass instruments|chess|tragedy|stage|bowing|retail price|bragging|funeral|parade|confetti|glamour|roses|villain|fireworks|accounting|coronation|overtime|stupid|benched|accident|ugly|tomatoes|champagne|rent|Monday|Sunday|costume|credit card|ridiculous|absurd|delicious|rude)\b/i;

function established(article){
 const out=new Map(),NAME="[A-Z][A-Za-z'.-]+(?:\\s+[A-Z][A-Za-z'.-]+){0,3}";
 const reAvg=new RegExp(`^(${NAME}) averaged (\\d+(?:\\.\\d+)?) fantasy points across (\\d+) games in 2025;`,'i');
 const rePrior=new RegExp(`^The prior baseline for (${NAME}) is (\\d+(?:\\.\\d+)?)`,'i');
 const reAPrior=new RegExp(`^A (\\d+(?:\\.\\d+)?) prior average .*? for (${NAME})\\b`,'i');
 for(const s of (article?.sections||[]).flatMap(x=>x?.paragraphs||[]).flatMap(sentences)){
  let m=s.match(reAvg);if(m){if(Number(m[2])>=12&&Number(m[3])>=8)out.set(m[1],Number(m[2]));continue}
  m=s.match(rePrior);if(m){if(Number(m[2])>=12)out.set(m[1],Number(m[2]));continue}
  m=s.match(reAPrior);if(m&&Number(m[1])>=12)out.set(m[2],Number(m[1]));
 }
 return out;
}
function benchKeys(text){
 const NAME="[A-Z][A-Za-z'.-]+(?:\\s+[A-Z][A-Za-z'.-]+){0,3}",re=new RegExp(`^(${NAME})\\s+(?:outscored|beat)\\s+(${NAME})\\s+by\\s+(\\d+(?:\\.\\d+)?)`,'i'),m=new Map();
 for(const s of sentences(text)){const x=s.match(re);if(!x)continue;const k=[x[1].toLowerCase(),x[2].toLowerCase(),x[3]].join('|');m.set(k,(m.get(k)||0)+1)}
 return m;
}
function maxColdRun(paragraphs){
 let best=0,cur=0;for(const p of paragraphs){if(VOICE.test(p))cur=0;else{cur++;best=Math.max(best,cur)}}return best;
}

const majorKinds=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
const reporterCounts=new Map();
for(const t of revised?.teams||[]){
 const old=baseByRoster.get(String(t.roster_id));assert(old,'Missing R20 baseline for '+t.team_name);
 assert.deepEqual(stripArticle(t),stripArticle(old),'R21 changed non-article Week 2 facts for '+t.team_name);
 assert.deepEqual(stripArticleMeta(t.inquirer_article),stripArticleMeta(old.inquirer_article),'R21 changed article metadata/facts outside prose for '+t.team_name);
 assert.deepEqual((t.inquirer_article?.sections||[]).map(s=>s.kind),(old.inquirer_article?.sections||[]).map(s=>s.kind),'R21 changed section format for '+t.team_name);
 assert.equal(Number(t.inquirer_article?.editorial_revision),21,'R21 article revision missing for '+t.team_name);
 assert.equal(t.inquirer_article?.voice_revision,'week2-r21','R21 article voice revision missing for '+t.team_name);
 assert.deepEqual(t.inquirer_article?.paragraphs||[],articleParagraphs(t),'Flattened article body is out of sync for '+t.team_name);
 const text=articleParagraphs(t).join(' '),wc=words(text);
 assert(wc>=850,'R21 over-compressed '+t.team_name+': '+wc+' words');
 assert.doesNotMatch(text,CLINICAL,'R21 left banned clinical/explanatory prose in '+t.team_name);
 for(const sec of t.inquirer_article?.sections||[]){
  assert.doesNotMatch(String(sec?.heading||''),META,'R21 left newsroom/meta heading in '+t.team_name+': '+sec?.heading);
  for(const p of sec?.paragraphs||[])assert(words(p)<=82,'R21 left an overlong paragraph in '+t.team_name+' / '+sec?.kind+': '+words(p));
 }
 for(const kind of majorKinds){
  const ps=section(t,kind)?.paragraphs||[];if(!ps.length)continue;
  assert(maxColdRun(ps)<=3,'R21 left a long reporter-voice desert in '+t.team_name+' / '+kind);
  assert(ps.some(p=>VOICE.test(p)),'R21 '+kind+' section lacks reporter voice for '+t.team_name);
 }
 const playerPs=section(t,'players')?.paragraphs||[];
 if((section(old,'players')?.paragraphs||[]).length>=12)assert(playerPs.length<=8,'R21 did not compact the repetitive player module for '+t.team_name+': '+playerPs.length);
 for(const [k,count] of benchKeys(text))assert(count<=2,'R21 repeats the same bench comparison more than twice for '+t.team_name+': '+k+' -> '+count);
 const bases=established(t.inquirer_article);
 for(const [player] of bases){
  for(const p of articleParagraphs(t))if(p.toLowerCase().includes(player.toLowerCase()))assert.doesNotMatch(p,PANIC,'R21 overreacts to established scorer '+player+' for '+t.team_name+': '+p);
 }
 const rid=String(t?.inquirer_article?.reporter?.id||'');reporterCounts.set(rid,(reporterCounts.get(rid)||0)+1);
}
assert.deepEqual(Object.fromEntries([...reporterCounts.entries()].sort()),{'mack-hollis':8,'nora-voss':8,'tess-delaney':8,'walter-mercer':8});

const overview=revised?.league_overview||{};
assert.equal(Number(overview.editorial_revision),21);
assert.equal(overview.voice_revision,'week2-r21');
const recapSections=overview.sections||[],recapParagraphs=recapSections.flatMap(s=>s?.paragraphs||[]).filter(Boolean),recapText=recapParagraphs.join(' ');
assert.equal(recapParagraphs.length,12,'R21 Weekly Recap must retain 12 focused insight paragraphs');
for(const p of recapParagraphs){assert(words(p)<=70,'R21 recap paragraph too long: '+words(p));assert(sentences(p).length<=3,'R21 recap paragraph bundles too many ideas: '+p)}
for(const s of recapSections)assert.doesNotMatch(String(s?.heading||''),META,'R21 recap heading still uses newsroom/meta language: '+s?.heading);
assert.doesNotMatch(recapText,META,'R21 recap body still uses newsroom/meta language');
const reporterIds=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];
for(const id of reporterIds){
 const ps=recapSections.filter(s=>String(s?.reporter?.id||'')===id).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 assert.equal(ps.length,3,'R21 recap must give '+id+' exactly three insight paragraphs');
 assert(ps.filter(p=>HUMOR.test(p)).length>=2,'R21 recap humor/sarcasm is not distributed across '+id);
}
const what=recapSections.find(s=>/What Actually Mattered This Week/i.test(String(s?.heading||'')));
assert(what,'R21 must retain What Actually Mattered This Week');
assert.equal((what.paragraphs||[]).length,3);
assert((what.paragraphs||[]).every(p=>HUMOR.test(p)||VOICE.test(p)),'R21 What Actually Mattered must carry reporter voice throughout');
const teamSentenceSet=new Set((revised.teams||[]).flatMap(t=>articleParagraphs(t)).flatMap(sentences).filter(s=>words(s)>=8).map(s=>s.toLowerCase().replace(/\s+/g,' ').trim()));
for(const p of what.paragraphs||[])for(const s of sentences(p).filter(x=>words(x)>=8))assert(!teamSentenceSet.has(s.toLowerCase().replace(/\s+/g,' ').trim()),'R21 What Actually Mattered copied a developed team-article sentence verbatim: '+s);

console.log(JSON.stringify({ok:true,editorial_revision:21,teams:revised.teams.length,reporters:Object.fromEntries(reporterCounts),recap_paragraphs:recapParagraphs.length,max_recap_words:Math.max(...recapParagraphs.map(words)),max_team_words:Math.max(...revised.teams.map(t=>words(articleParagraphs(t).join(' '))))},null,2));
