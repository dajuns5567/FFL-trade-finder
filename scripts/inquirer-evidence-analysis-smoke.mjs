import assert from 'node:assert/strict';
import week4Preload from '../netlify/functions/inquirer-week4-2026-preload.mjs';
import {rebuildWeek4Editorial} from '../netlify/functions/inquirer-week4-editorial-rebuild.mjs';
import {applyInquirerEditorialClarity} from '../netlify/functions/inquirer-editorial-clarity.mjs';
import {upgradeInquirerAnalysis} from '../netlify/functions/inquirer-evidence-analysis.mjs';
import week4FastHandler from '../netlify/functions/league-hub-week4-fast.mjs';
import {week4Notes,week4Headlines} from '../netlify/functions/inquirer-week4-specific-notes.mjs';
import {readFileSync} from 'node:fs';

const frozen=typeof week4Preload==='function'?week4Preload():week4Preload;
const original=JSON.stringify(frozen);
const edition=upgradeInquirerAnalysis(applyInquirerEditorialClarity(rebuildWeek4Editorial(frozen),{week:4}),{week:4});
assert.equal(JSON.stringify(frozen),original,'Published Week 4 preload must never be mutated');
assert.equal(edition.week,4);
assert(edition.teams?.length>=30,'Expected real league roster coverage');
const meaningful=new Set();
const headlineForms=new Set();
const sentenceOccurrences=new Map();
for(const team of edition.teams){
 const article=team.inquirer_article;
 const starters=(team.starter_details||[]).filter(p=>p?.name&&Number.isFinite(Number(p.points)));
 if(starters.length<3)continue;
 assert.equal(article.fact_driven_analysis,true,'Every scored team needs fact-driven reporting: '+team.team_name);
 assert.equal(article.cohesive_editorial_version,1,'Single authoritative reporter stage required for '+team.team_name);
 assert.equal(article.headline,week4Headlines[team.team_name],'Individually edited Week 4 headline was replaced by template for '+team.team_name);
 const moodLines=article.sections.find(x=>x.kind==='sentiment')?.paragraphs||[];
 assert.equal(week4Notes[team.team_name]?.length>170,true,'Week 4 article lacks substantive independent editorial reporting: '+team.team_name);
 const note=week4Notes[team.team_name];
 const split=[...note.matchAll(/[.!?](?=\s+[A-Z])/g)].map(x=>x.index).find(i=>i>=55);
 const leadPart=split===undefined?note:note.slice(0,split+1);
 const crowdPart=split===undefined?null:note.slice(split+1).trim();
 assert(article.sections.find(x=>x.kind==='lede')?.paragraphs?.includes(leadPart),'Independent team-specific headline argument was dropped for '+team.team_name);
 assert(moodLines.length>=3,'Independently written Week 4 crowd commentary missing for '+team.team_name);
 assert(moodLines[0]?.includes(Number(article.fan_sentiment?.score).toFixed(1)),'Crowd mood must use actual measured score, not an authored number: '+team.team_name);
 assert(/(supporters|fans|crowd|public|trust|confidence|approval|patience|goodwill|audience)/i.test(moodLines.slice(1).join(' ')),'Fan sentiment must actually interpret fan feeling, not just recap the score: '+team.team_name);
 assert(!/and the others combined for|the others managed .*of|three starters.*supplied/i.test((article.sections.find(x=>x.kind==='lede')?.paragraphs||[]).join(' ')),'Top-three box-score worksheet returned to lede: '+team.team_name);

 assert(moodLines.length>=3,'Fan sentiment must include measured mood, a reporter argument, and next-week stakes: '+team.team_name);
 assert(moodLines.length===3,'Week 4 sentiment must contain exactly the verified mood and two distinct editorial paragraphs: '+team.team_name);
 assert(moodLines.join(' ').split(/\s+/).filter(Boolean).length>=70,'Fan sentiment is too shallow to support an editorial argument: '+team.team_name);
 assert(!/the lowest verified score belonged|rivals can see \\d+ starter|the next opponent can count|the manager can offer explanations/i.test(moodLines.join(' ')),'Template-style fan copy returned: '+team.team_name);
 assert(moodLines.slice(-2).every(p=>p.length>=120),'Both independently written crowd paragraphs must contain actual commentary: '+team.team_name);

 assert(moodLines.join(' ').length>=200,'Fan sentiment must contain substantial commentary, not a bare summary: '+team.team_name);
 assert(!/the manager can offer explanations|the standings will record the (win|loss) and move on/i.test(moodLines.join(' ')),'Old boilerplate fan-sentiment writing returned');
 if(article.fan_sentiment&&Number.isFinite(Number(article.fan_sentiment.score))){
  assert(moodLines.join(' ').includes(Number(article.fan_sentiment.score).toFixed(1)),'Crowd column must explain the actual sentiment score for '+team.team_name);
 }

 const editorialSections=(article.sections||[]).filter(s=>['lede','players','management','hot-seat','cool-throne','sentiment','outlook'].includes(s.kind));
 const authored=editorialSections.flatMap(s=>s.paragraphs||[]).filter(Boolean);
 assert.equal(new Set(authored.map(s=>s.trim().toLowerCase())).size,authored.length,'Duplicate paragraphs remain in '+team.team_name);
 const copy=authored.join(' ');
 for(const banned of [
  /repeating the top scorer.s output is a hope/i,
  /that supporting figure explains how much work remained/i,
  /leaving those points out hardly deserves congratulations/i,
  /the manager.s choice rather difficult to applaud/i,
  /the manager can offer explanations. the standings will record/i
 ])assert(!banned.test(copy),'Previously flagged canned commentary returned for '+team.team_name+': '+banned);

 for(const paragraph of authored){
  for(const sentence of paragraph.split(/(?<=[.!?])\s+/)){
   const cleaned=sentence.trim().toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#');
   if(cleaned.length<65)continue;
   if(!sentenceOccurrences.has(cleaned))sentenceOccurrences.set(cleaned,new Set());
   sentenceOccurrences.get(cleaned).add(team.team_name);
  }
 }
 const totalWords=authored.join(' ').split(/\s+/).filter(Boolean).length;
 assert(totalWords>=140&&totalWords<=540,'Article is thin or inflated with redundant prose: '+team.team_name+' ('+totalWords+' words)');
 assert(/(?:sarcas|scoreboard|manager|lineup|rivals|opponent|benched|bench|starters)/i.test(authored.join(' ')),'Editorial needs football-specific point of view');

 for(const kind of ['lede','players','management','outlook']){
  const sec=article.sections.find(x=>x.kind===kind);
  assert(sec?.paragraphs?.length>=2,'Preserve existing '+kind+' and ADD meaningful commentary for '+team.team_name);
 }
 const voiceLine=article.sections.find(x=>x.kind==='lede')?.paragraphs?.[0]||'';
 assert(voiceLine.includes(team.team_name)||voiceLine.includes(team.opponent_name),'Columnist must discuss actual matchup, not generic filler');

 const scoringStarters=starters.filter(p=>Number(p.points)>0);
 if(scoringStarters.length===1&&Number(team.points)>0){
  assert(article.headline.includes(scoringStarters[0].name),'Sole scorer must headline: '+team.team_name);
  assert(/all|one scorer/i.test(article.sections.find(s=>s.kind==='lede')?.paragraphs?.join(' ')||''),'Sole scorer must be distinguished from a three-player performance');
 }
 if(scoringStarters.length===0&&Number(team.points)===0){
  const management=article.sections.find(s=>s.kind==='management')?.paragraphs?.join(' ')||'';
  assert(/all|every|entire/i.test(management)&&!/one can applaud|the star saved|strong individual performance/i.test(management),'Zero-point managerial critique must blame lineup-wide nonproduction');
 }

 assert(!/Three Starters Supplied|Sets the Pace|(?:Patriots|Giants|Jets|Chiefs|Eagles|Raiders) Falls/i.test(article.headline),'Generic or ungrammatical team headline: '+article.headline);
 headlineForms.add(article.headline.replace(team.team_name,'{team}').replace(/\d+(?:\.\d+)?/g,'#').replace(/(?:[A-Z][a-z]+\s){1,3}[A-Z][a-z]+/g,'{player}'));
 if(Number(team.points)===0){
  const cool=article.sections.find(x=>x.kind==='cool-throne');
  assert(/Zero Points/i.test(article.headline),'Zero-score game must receive its own meaningful headline');
  assert(!/earned.*cool throne|helped.*turn.*win/i.test((cool?.paragraphs||[]).join(' ')),'A zero-point player must not be praised as a weekly hero');
 }

 assert(article.headline.includes(team.team_name)&&!/(Turn this Sunday Into a Longer Week|A New Week Awaits|What Comes Next)/i.test(article.headline),'Team headline must state verified football consequence');
 const outlook=article.sections.find(x=>x.kind==='outlook');
 assert(outlook?.paragraphs?.length>=2&&starters.some(p=>outlook.paragraphs.join(' ').includes(p.name)),'Team outlook needs a named, verified scoring/lineup consequence');
 for(const kind of ['lede','players','management']){
  const section=article.sections.find(x=>x.kind===kind);
  assert(section?.paragraphs?.length>=2,'Missing diagnostic '+kind+' for '+team.team_name);
  const copy=section.paragraphs.join(' ');
  assert(!/\b(?:That is this week’s verified performance|not an imagined projection|the next opponent will care less|the useful story sits|this one the roster actually earned)\b/i.test(copy),'Generic article filler was not replaced');
  assert(!/\b\d+(?:\.\d+)?\s+Put\b/.test(copy),'Broken sentence splice appeared in copy');
  const named=starters.slice().sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,kind==='management'?starters.length:3).some(p=>copy.includes(p.name));
  const justifiedNoScapegoat=kind==='management'&&/no verified eligible bench upgrade|every verified starter cleared five/i.test(copy);
  assert(named||justifiedNoScapegoat,'Article must name verified players or explicitly rule out an invented coaching scandal in '+kind+' for '+team.team_name);
 }
 const sentiment=article.sections.find(x=>x.kind==='sentiment');
 if(sentiment){
  const copy=sentiment.paragraphs.join(' ');
  assert(!/fans have started|supporters have moved|call-in crowd|caps-lock key|receipts become|memes are multiplying/i.test(copy),'Unverified crowd behavior or recycled fan-fiction slipped into '+team.team_name);
  assert(sentiment.paragraphs.length>=2,'Opinion and verified roster consequence both required for '+team.team_name);
 }
 const lead=article.sections.find(x=>x.kind==='lede').paragraphs.join(' ');
 assert(Number(team.points)===0? /zero|no positive|finished with zero/i.test(lead):scoringStarters.length===1? /one scorer|all|every other|other verified/i.test(lead):lead.includes(team.team_name)&&/\d+(?:\.\d+)?/.test(lead)&&starters.slice().sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,3).some(p=>lead.includes(p.name)),'Require meaningful matchup context, actual leading scorer, or truthful zero-point reporting');
 meaningful.add(String(team.roster_id));
}
assert(meaningful.size>=25,'Insufficient fact-driven team articles');
const widespreadStockSentences=[...sentenceOccurrences].filter(([_,teams])=>teams.size>=3);
assert(widespreadStockSentences.length<=15,'Too many recycled newspaper sentences: '+widespreadStockSentences.length+' (max 15). '+widespreadStockSentences.slice(0,6).map(([sentence,teams])=>teams.size+'x '+sentence).join(' | '));
assert(headlineForms.size>=4,'Reporter headline formats remain too repetitive: '+headlineForms.size);
assert.equal(new Set(Object.values(week4Headlines)).size,32,'Headlines must be independently authored, not recycled');
const takes=(edition.league_overview?.hot_takes||[]);
const honor=takes.find(t=>t.kind==='player'),breakout=takes.find(t=>t.kind==='breakout');
if(honor&&breakout){
 const featured=x=>String(x.title||'').split(':').slice(1).join(':').trim().toLowerCase();
 if(featured(honor)&&featured(breakout)&&!featured(breakout).includes('no verified'))
  assert.notEqual(featured(honor),featured(breakout),'Do not recycle the same featured player in two separate hot takes');
}
const overview=edition.league_overview;
const blocks=overview.sections[0]?.blocks||[];
for(const kind of ['lead','players','decisions']){
 const block=blocks.find(x=>x.kind===kind);
 assert(block?.paragraphs?.length>=2,'Recap lacks actionable '+kind+' reporting');
}
assert.equal(overview.fact_driven_analysis,true,'Recap must run the actual league-wide analysis');
assert.equal(overview.column_commentary_version,1,'Recap must retain new dry editorial commentary');
for(const kind of ['lead','players','decisions','league']){const b=blocks.find(x=>x.kind===kind);assert(b?.paragraphs?.length>=3,'Existing weekly recap section '+kind+' must be preserved and extended');}
const leadCopy=blocks.find(b=>b.kind==='lead')?.paragraphs?.join(' ')||'';
assert(/median/i.test(leadCopy)&&/cleared 100|below 40/i.test(leadCopy),'Weekly recap must analyze full league scoring distribution rather than repeat the same two games');
assert(!/Dolphins’s|a 84\.0-point|Raiders turns to|Aints takes its/.test(JSON.stringify(overview.sections)),'Recap grammar regression in team possessives, plural verbs, or article usage');

assert(overview.sections[0].blocks.find(x=>x.kind==='decisions').paragraphs.join(' ').includes('eligible bench alternatives'),'Recap must distinguish legal lineup swaps from hindsight');
const before=JSON.stringify(edition);
upgradeInquirerAnalysis(edition,{week:4});
assert.equal(JSON.stringify(edition),before,'Upgrader must be idempotent');
const older=structuredClone(edition);older.week=3;
assert.equal(upgradeInquirerAnalysis(older,{week:3}),older,'Locked Weeks 1-3 never change');
const served=await week4FastHandler();
assert.equal(served.status,200,'Week 4 fast route must actually render upgraded editorial');
const body=await served.json();
assert.equal(body.league_overview?.fact_driven_analysis,true,'Fast route must not serve the old generic weekly recap');
assert(body.teams?.filter(t=>t.inquirer_article?.fact_driven_analysis).length>=25,'Fast route must not serve generic team articles');
const forward=readFileSync('netlify/functions/inquirer-editorial-v31.mjs','utf8');
const hub=readFileSync('netlify/functions/league-hub.mjs','utf8');
assert(forward.includes('evaluateInquirerEditionQuality')&&forward.includes('applyInquirerEditorialClarity(rebuilt,'),'Forward editions must retain their independent strict source-fact and uniqueness quality gates');
assert(hub.includes('upgradeInquirerAnalysis(applyInquirerEditorialClarity(rebuildWeek4Editorial(p),{week:4})'),'Week 4 fallback and archive must preserve evidence analysis');
assert(hub.includes('week>4&&week<18&&Array.isArray(p.teams)')&&hub.includes('upgradeInquirerAnalysis(structuredClone(p),{week})'),'Approved future editions must also receive durable editorial improvements on read');
console.log('Inquirer evidence analysis verified for '+meaningful.size+' real Week 4 team articles, weekly recap, and both public serving paths');
