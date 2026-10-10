import assert from 'node:assert/strict';
import week4Preload from '../netlify/functions/inquirer-week4-2026-preload.mjs';
import {rebuildWeek4Editorial} from '../netlify/functions/inquirer-week4-editorial-rebuild.mjs';
import week4FastHandler from '../netlify/functions/league-hub-week4-fast.mjs';

const original=week4Preload();
const rebuilt=rebuildWeek4Editorial(original);
assert.equal(rebuilt.season,2026);
assert.equal(rebuilt.week,4);
assert.equal(rebuilt.teams.length,32,'All 32 team articles must be present');
assert.equal(new Set(rebuilt.teams.map(t=>String(t.roster_id))).size,32,'Duplicate roster articles');
assert.notEqual(rebuilt,original,'Rebuild must not mutate the locked source object');
assert.equal(rebuilt.league_overview.sections.length,4);
assert.equal(rebuilt.league_overview.sections[0].blocks.length,6,'Recap requires five games and week-level context');
const requiredKinds=['championship','breakout','player','fraud','division','upset'];
const kinds=new Set((rebuilt.league_overview.hot_takes||[]).map(h=>h.kind));
for(const k of requiredKinds)assert(kinds.has(k),'Missing required Hot Take: '+k);
const banned=/\b(?:for this matchup, the important bit|volume knob snapped off|that is matchup pressure, not decorative arithmetic|three stat lines kept this thing)\b/i;
for(const team of rebuilt.teams){
 const article=team.inquirer_article;
 assert(article,'Missing team article '+team.roster_id);
 assert.equal(article.editorial_rebuilt_for_week,4,'Article not rebuilt: '+team.roster_id);
 assert.equal(article.sections.length,8,'Expected Week 2-approved eight-section story structure');
 const required=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
 for(const kind of required){
  const sec=article.sections.find(x=>x.kind===kind);
  assert(sec&&Array.isArray(sec.paragraphs)&&sec.paragraphs.length,'Empty '+kind+' for '+team.team_name);
 }
 const text=article.sections.flatMap(x=>x.paragraphs||[]).join(' ');
 assert(!banned.test(text),'Legacy article language: '+team.team_name);
 assert(text.includes(team.team_name),'Team name missing in '+team.team_name);
 assert(text.includes('Week 4')||text.includes('week'),'Week context missing: '+team.team_name);
}
for(const section of rebuilt.league_overview.sections){
 const text=[...(section.paragraphs||[]),...(section.blocks||[]).flatMap(b=>b.paragraphs||[])].join(' ');
 assert(!banned.test(text),'Legacy recap phrase');
}
const servedResponse=await week4FastHandler();
assert.equal(servedResponse.status,200,'Week 4 fast handler must serve a successful response');
assert.match(servedResponse.headers.get('cache-control')||'',/no-store/i,'Week 4 fast handler must bypass browser cache');
assert.match(servedResponse.headers.get('netlify-cdn-cache-control')||'',/no-store/i,'Week 4 fast handler must bypass CDN cache');
const served=await servedResponse.json();
assert.equal(served.season,2026);
assert.equal(served.week,4);
assert.equal(served.teams.length,32,'Week 4 endpoint must return all 32 article entries');
assert.equal(served.league_overview.sections[0].blocks.length,6,'Week 4 endpoint must serve rebuilt recap blocks');
for(const team of served.teams){
 assert.equal(team?.inquirer_article?.editorial_rebuilt_for_week,4,'Fast endpoint returned unrebuilt article '+String(team?.roster_id));
 assert.equal(team.inquirer_article.sections.length,8,'Fast endpoint returned incomplete article '+String(team?.roster_id));
}
const wordCounts=rebuilt.teams.map(t=>t.inquirer_article.sections.flatMap(sec=>sec.paragraphs||[]).join(' ').split(/\s+/).filter(Boolean).length);
const result={ok:true,season:2026,week:4,team_articles:rebuilt.teams.length,recap_blocks:rebuilt.league_overview.sections[0].blocks.length,hot_takes:rebuilt.league_overview.hot_takes.map(x=>x.kind),article_words:{min:Math.min(...wordCounts),max:Math.max(...wordCounts),mean:Math.round(wordCounts.reduce((a,b)=>a+b,0)/wordCounts.length)},sample_headline:rebuilt.teams[0].inquirer_article.headline};
console.log(JSON.stringify(result,null,2));
