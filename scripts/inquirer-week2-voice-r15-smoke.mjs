import assert from 'node:assert/strict';
import rawWeek2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {applyWeek2EditorialR16,WEEK2_EDITORIAL_REVISION} from '../netlify/functions/inquirer-week2-editorial-r15.mjs';

const rawSnapshot=JSON.stringify(rawWeek2);
const revised=applyWeek2EditorialR16(rawWeek2);

assert.equal(Number(rawWeek2?.season),2026);
assert.equal(Number(rawWeek2?.week),2);
assert.equal(Number(WEEK2_EDITORIAL_REVISION),16);
assert.equal(Number(revised?.editorial_revision),16);
assert.equal(revised?.voice_revision,'week2-r16');
assert.equal(JSON.stringify(rawWeek2),rawSnapshot,'Revision layer must not mutate the locked raw Week 2 preload');

const rawTeams=new Map((rawWeek2?.teams||[]).map(t=>[String(t.roster_id),t]));
const revisedTeams=revised?.teams||[];
assert.equal(revisedTeams.length,rawTeams.size,'Week 2 team count changed');

const stripArticle=t=>{const x=JSON.parse(JSON.stringify(t));delete x.inquirer_article;return x};
const stripArticleProse=a=>{
 const x=JSON.parse(JSON.stringify(a||{}));
 delete x.sections;delete x.paragraphs;delete x.editorial_revision;delete x.voice_revision;
 return x;
};
const paragraphs=t=>(t?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
const articleText=t=>paragraphs(t).join(' ');
const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const wordCount=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;

const PLAYER_SUPPORT_RE=/\b(?:supporting cast|supporting score|supporting production|secondary scoring|second real scorer|second dependable foothold|second useful jolt|second punch|second answer|second scorer|third scorer|third score|third reason|one more working outlet|another usable starter|another meaningful score|rest of (?:the )?(?:lineup|roster)|whole lineup|one[- ]man|one[- ]player|solo effort|solo act|solo show|rescue mission|magic trick|lonely haymaker|did not have to .* alone|didn't have to .* alone|kept .* from (?:becoming|being)|prevented .* from (?:becoming|being)|top[- ]heavy|more than one emergency|same stars doing all the lifting|one guy screaming|backup singers|enough additional scoring|enough production elsewhere|cover every gap|the next answer is support|support behind the lead score)\b/i;
const OLD_SCAFFOLD_RE=/\b(?:gave Week 2 the stronger jolt|put a brighter number on the second Sunday|put a quieter number on the second Sunday|turned the Week 2 volume up|usable top end|the issue is not the stars|there is nowhere to hide a September result|worth keeping beside the Week 2 stars|management chose this version of the roster|the lineup that happened to score Sunday)\b/i;
const SHARED_OUTLOOK_RE=/\b(?:take a head-to-head bite out of|instead of hoping another result moves the same playoff route|not alone in a crowded AFC EAST race|rest of the division reads)\b/i;
const VOICE_RE=/\b(?:I\b|me\b|my\b|fans?|supporters?|annoyed|annoying|joy|furious|hope|mood|parade|joke|complaint|reckless|unbearable|dramatic|suspicious|ridiculous|beautiful|hostile|rivals?|headline|back page|therapy|aspirin|offended|adore|patience|ugly|awful|insult|boo|praise|credit)\b/i;
const TECH_JOKE_RE=/\b(?:screenshots?|group chats?|rival chats?|rival threads?|memes?|lineup screen|apps?)\b/i;
const EDITORIAL_META_RE=/\b(?:headline|story|paragraph|editor|narrative|graphic|typeface|print|column|publication|writing|write|written)\b/i;
const SYNTHETIC_CADENCE_RE=/(?:^|[.!?]\s+)(?:At the moment|At least today|From this angle|On this result|In this spot|For the moment|On the current read|By my count|On review|For now|This week|From here|As it stands|After Sunday|In plain terms|At first glance|In the short term|From the sideline|With that settled|For the record|Looking ahead|After a second look|From this score|In the meantime|For this matchup|Until next Sunday|On balance),/i;

const reporterCounts=new Map();
for(const t of revisedTeams){
 const before=rawTeams.get(String(t.roster_id));
 assert(before,'Missing raw team '+t.roster_id);
 assert.deepEqual(stripArticle(t),stripArticle(before),'Non-article Week 2 facts changed for '+t.team_name);
 assert.deepEqual(stripArticleProse(t.inquirer_article),stripArticleProse(before.inquirer_article),'Article metadata/facts changed outside prose for '+t.team_name);
 assert.equal(Number(t?.inquirer_article?.editorial_revision),16,'Article revision missing for '+t.team_name);
 assert.equal(t?.inquirer_article?.voice_revision,'week2-r16','Article voice revision missing for '+t.team_name);

 const ps=paragraphs(t),text=ps.join(' '),sentences=sentenceParts(text);
 assert(ps.every(p=>typeof p==='string'),'Every Week 2 article paragraph must render as prose, not an array/object, for '+t.team_name);
 assert.deepEqual(t?.inquirer_article?.paragraphs||[],ps,'Flattened Week 2 article body must exactly match rewritten section prose for '+t.team_name);
 assert(ps.length<=45,'Week 2 rewrite became overstuffed for '+t.team_name+': '+ps.length+' paragraphs');
 assert(wordCount(text)>=850,'Week 2 article is still too short for the deeper reporter treatment: '+t.team_name+' -> '+wordCount(text)+' words');
 assert(sentences.filter(s=>VOICE_RE.test(s)).length>=7,'Too little explicit reporter/fan voice in '+t.team_name);
 assert(!PLAYER_SUPPORT_RE.test(text),'Player-support/solo-effort motif survived Week 2 rewrite for '+t.team_name);
 assert(!OLD_SCAFFOLD_RE.test(text),'Old Week 2 scaffold survived rewrite for '+t.team_name);
 assert(!SHARED_OUTLOOK_RE.test(text),'Shared outlook boilerplate survived rewrite for '+t.team_name);
 assert(!TECH_JOKE_RE.test(text),'Screenshot/chat/meme/app humor returned to Week 2 copy for '+t.team_name);
 assert(!EDITORIAL_META_RE.test(text),'Newsroom/meta commentary returned to Week 2 copy for '+t.team_name);
 assert(!SYNTHETIC_CADENCE_RE.test(text),'Synthetic cadence-preface meta language returned for '+t.team_name);

 const sections=t?.inquirer_article?.sections||[],byKind=Object.fromEntries(sections.map(s=>[String(s?.kind||''),(s?.paragraphs||[]).length]));
 const lede=(sections.find(s=>String(s?.kind||'')==='lede')?.paragraphs||[]),teamScoreToken=Number(t.points).toFixed(1)+'–'+Number(t.opponent_points).toFixed(1),opponentScoreToken=Number(t.opponent_points).toFixed(1)+'–'+Number(t.points).toFixed(1);
 assert.equal(lede.filter(p=>{const x=String(p);return x.includes(teamScoreToken)||x.includes(opponentScoreToken)}).length,1,'Current Week 2 result must be stated exactly once in the lede for '+t.team_name);
 assert((byKind.lede||0)>=4&&(byKind.lede||0)<=6,'Lede must be developed without repeating the result for '+t.team_name);
 assert((byKind.players||0)===12,'Player section must give three featured players separate fact/reaction/context/trend treatment for '+t.team_name);
 assert((byKind.management||0)>=2&&(byKind.management||0)<=4,'Management section must be developed without repetition for '+t.team_name);
 assert((byKind['cool-throne']||0)<=2,'Cool Throne is overstuffed for '+t.team_name);
 assert((byKind.value||0)<=3,'Value section is overstuffed for '+t.team_name);
 assert((byKind.sentiment||0)===6,'Fan sentiment must contain six distinct, substantive reactions for '+t.team_name);
 const sentimentText=(sections.find(s=>String(s?.kind||'')==='sentiment')?.paragraphs||[]).join(' ');
 assert(wordCount(sentimentText)>=120,'Fan sentiment is still too thin for '+t.team_name+': '+wordCount(sentimentText)+' words');
 assert.doesNotMatch(sentimentText,/\b(?:projection(?: gap)?|sentiment model|rating|meter|temperature|model output|process instead)\b/i,'Fan Sentiment must describe fans and football, not narrate a model/projection, for '+t.team_name);
 assert((byKind.outlook||0)>=3&&(byKind.outlook||0)<=6,'Outlook must be developed without overstuffing for '+t.team_name);

 const id=String(t?.inquirer_article?.reporter?.id||'');
 reporterCounts.set(id,(reporterCounts.get(id)||0)+1);
}
for(const id of ['walter-mercer','tess-delaney','mack-hollis','nora-voss'])assert((reporterCounts.get(id)||0)>0,'Reporter missing from revised Week 2: '+id);

const aints=revisedTeams.find(t=>/new orleans (?:aints|saints)/i.test(String(t?.team_name||'')));
assert(aints,'New Orleans Week 2 article not found');
const aintsText=articleText(aints),aintsParagraphs=paragraphs(aints);
assert(!/one-man rescue mission|one-player magic trick|enough production elsewhere|third scorer/i.test(aintsText),'New Orleans still contains the exact support/solo language called out by the live audit');
assert(/Dallas Turner/i.test(aintsText)&&/Breakout Watch/i.test(aintsText),'Dallas Turner must be discussed naturally in the context of his verified Fleeced Breakout Watch signal');
assert(aintsParagraphs.length<=45&&wordCount(aintsText)>=850,'New Orleans article was not materially rebuilt with enough distinct reporting depth');

const chiefs=revisedTeams.find(t=>/kansas city chiefs/i.test(String(t?.team_name||'')));
assert(chiefs,'Kansas City Week 2 article not found');
const chiefsText=articleText(chiefs);
assert(/-0\.2/.test(chiefsText),'Kansas City negative Week 2 team score must remain explicit');
assert(/below zero|negative points|less than zero|argument against arithmetic|full roster worked|fantasy team poorer/i.test(chiefsText),'Tilly must react directly and sarcastically to Kansas City scoring -0.2 instead of using generic newsroom/app humor');

const overview=revised?.league_overview||{};
assert.equal(Number(overview.editorial_revision),16);
assert.equal(overview.voice_revision,'week2-r16');
const overviewParagraphs=(overview.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
const overviewText=overviewParagraphs.join(' ');
assert(overviewParagraphs.length<=32,'Weekly recap still carries too much revision-14 body copy: '+overviewParagraphs.length);
assert(!PLAYER_SUPPORT_RE.test(overviewText),'Weekly recap still frames results through star-support/solo-effort boilerplate');
assert(!OLD_SCAFFOLD_RE.test(overviewText),'Weekly recap still contains old shared scaffolding');
assert(!/current-player side an early performance problem to answer/i.test(overviewText),'Weekly recap still repeats current-player-side scaffold');
assert(!/trade is attached to a roster that is still actively chasing something/i.test(overviewText),'Weekly recap still repeats active-roster trade scaffold');

for(const id of ['walter-mercer','tess-delaney','mack-hollis','nora-voss']){
 const sections=(overview.sections||[]).filter(s=>String(s?.reporter?.id||'')===id);
 assert(sections.length,'Weekly recap reporter section missing: '+id);
 const copy=sections.flatMap(s=>s?.paragraphs||[]).join(' ');
 assert(VOICE_RE.test(copy),'Weekly recap reporter section lacks explicit voice: '+id);
 assert(sections.flatMap(s=>s?.paragraphs||[]).length<=10,'Weekly recap reporter section is overstuffed: '+id);
}

console.log(JSON.stringify({
 ok:true,
 editorial_revision:revised.editorial_revision,
 teams:revisedTeams.length,
 reporter_counts:Object.fromEntries(reporterCounts),
 new_orleans:{
  team:aints.team_name,
  reporter:aints.inquirer_article?.reporter?.name,
  paragraphs:aintsParagraphs.length,
  support_motif:false
 },
 weekly_recap_paragraphs:overviewParagraphs.length
},null,2));
