import assert from 'node:assert/strict';
import rawWeek2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {applyWeek2EditorialR15,WEEK2_EDITORIAL_REVISION} from '../netlify/functions/inquirer-week2-editorial-r15.mjs';

const rawSnapshot=JSON.stringify(rawWeek2);
const revised=applyWeek2EditorialR15(rawWeek2);

assert.equal(Number(rawWeek2?.season),2026);
assert.equal(Number(rawWeek2?.week),2);
assert.equal(Number(WEEK2_EDITORIAL_REVISION),15);
assert.equal(Number(revised?.editorial_revision),15);
assert.equal(revised?.voice_revision,'week2-r15');
assert.equal(JSON.stringify(rawWeek2),rawSnapshot,'Revision layer must not mutate the locked raw Week 2 preload');

const rawTeams=new Map((rawWeek2?.teams||[]).map(t=>[String(t.roster_id),t]));
const revisedTeams=revised?.teams||[];
assert.equal(revisedTeams.length,rawTeams.size,'Week 2 team count changed');

const stripArticle=t=>{const x=JSON.parse(JSON.stringify(t));delete x.inquirer_article;return x};
const stripArticleProse=a=>{
 const x=JSON.parse(JSON.stringify(a||{}));
 delete x.sections;delete x.editorial_revision;delete x.voice_revision;
 return x;
};
const articleText=t=>(t?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean).join(' ');
const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const SUPPORT_RE=/\b(?:supporting cast|supporting score|supporting production|secondary scoring|second real scorer|second dependable foothold|second useful jolt|second punch|second answer|third score|third reason|one more working outlet|another usable starter|rest of (?:the )?(?:lineup|roster)|whole lineup|one[- ]man|one[- ]guest|solo effort|lonely haymaker|did not have to .* alone|didn't have to .* alone|kept .* from (?:becoming|being) (?:a )?(?:one[- ]man|solo)|top[- ]heavy|more than one emergency|another meaningful score)\b/i;
const VOICE_RE=/\b(?:I\b|me\b|my\b|fans?|supporters?|annoyed|annoying|joy|euphoric|furious|hope|mood|parade|meme|group chat|screenshot|joke|punch line|complaint|reckless|unbearable|dramatic|suspicious|ridiculous|beautiful|hostile|therapy|receipt|rivals?)\b/i;
const BANNED=[
 /There is one roster-memory note worth keeping beside the Week 2 stars:/i,
 /there is nowhere to hide a September result/i
];

const reporterCounts=new Map();
for(const t of revisedTeams){
 const before=rawTeams.get(String(t.roster_id));
 assert(before,'Missing raw team '+t.roster_id);
 assert.deepEqual(stripArticle(t),stripArticle(before),'Non-article Week 2 facts changed for '+t.team_name);
 assert.deepEqual(stripArticleProse(t.inquirer_article),stripArticleProse(before.inquirer_article),'Article metadata/facts changed outside prose for '+t.team_name);
 assert.equal(Number(t?.inquirer_article?.editorial_revision),15,'Article revision missing for '+t.team_name);
 assert.equal(t?.inquirer_article?.voice_revision,'week2-r15','Article voice revision missing for '+t.team_name);

 const text=articleText(t),sentences=sentenceParts(text);
 const voiceHits=sentences.filter(s=>VOICE_RE.test(s));
 assert(voiceHits.length>=4,'Too little explicit reporter/fan voice remains in '+t.team_name+': '+voiceHits.length);

 const supportNonNumeric=sentences.filter(s=>SUPPORT_RE.test(s)&&!(/\d/.test(s)));
 assert(supportNonNumeric.length<=1,'Repeated star-had-help scaffolding remains in '+t.team_name+': '+supportNonNumeric.join(' || '));
 for(const re of BANNED)assert(!re.test(text),'Generic Week 2 scaffold remains in '+t.team_name+': '+re);

 const id=String(t?.inquirer_article?.reporter?.id||'');
 reporterCounts.set(id,(reporterCounts.get(id)||0)+1);
}
for(const id of ['walter-mercer','tess-delaney','mack-hollis','nora-voss'])assert((reporterCounts.get(id)||0)>0,'Reporter missing from revised Week 2: '+id);

const saints=revisedTeams.find(t=>/new orleans (?:aints|saints)/i.test(String(t?.team_name||'')));
assert(saints,'New Orleans Week 2 article not found');
const saintsText=articleText(saints),saintsVoice=sentenceParts(saintsText).filter(s=>VOICE_RE.test(s));
assert(saintsVoice.length>=4,'New Orleans article did not receive the voice revision');
assert(sentenceParts(saintsText).filter(s=>SUPPORT_RE.test(s)&&!(/\d/.test(s))).length<=1,'New Orleans article still repeats the solo/support motif');

const overview=revised?.league_overview||{};
assert.equal(Number(overview.editorial_revision),15);
assert.equal(overview.voice_revision,'week2-r15');
const overviewText=(overview.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' ');
assert(!/current-player side an early performance problem to answer/i.test(overviewText),'Weekly recap still repeats current-player-side scaffold');
assert(!/trade is attached to a roster that is still actively chasing something/i.test(overviewText),'Weekly recap still repeats active-roster trade scaffold');
for(const id of ['walter-mercer','tess-delaney','mack-hollis','nora-voss']){
 const sections=(overview.sections||[]).filter(s=>String(s?.reporter?.id||'')===id);
 assert(sections.length,'Weekly recap reporter section missing: '+id);
 const copy=sections.flatMap(s=>s?.paragraphs||[]).join(' ');
 assert(VOICE_RE.test(copy),'Weekly recap reporter section lacks explicit voice: '+id);
}

console.log(JSON.stringify({
 ok:true,
 editorial_revision:revised.editorial_revision,
 teams:revisedTeams.length,
 reporter_counts:Object.fromEntries(reporterCounts),
 new_orleans:{
  team:saints.team_name,
  reporter:saints.inquirer_article?.reporter?.name,
  voice_sentences:saintsVoice.length,
  support_non_numeric:sentenceParts(saintsText).filter(s=>SUPPORT_RE.test(s)&&!(/\d/.test(s))).length
 }
},null,2));
