import fs from 'node:fs';
import assert from 'node:assert/strict';

const path=process.argv[2]||'/tmp/week1-inquirer.json';
const d=JSON.parse(fs.readFileSync(path,'utf8'));
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const articleText=t=>(t?.inquirer_article?.paragraphs||[]).join(' ');
const recapSections=d?.league_overview?.sections||[];
const recap=recapSections.flatMap(s=>s?.paragraphs||[]).join(' ');
const teamWords=(d.teams||[]).map(t=>words(articleText(t)));

assert.equal(Number(d.inquirer_version),26,'Generated edition must be Inquirer V26');
assert.equal(Number(d.editorial_revision),2,'Generated edition must carry recovered editorial revision 2');
assert.equal((d.teams||[]).length,32,'Generated Week 1 edition must contain 32 team articles');
assert.ok(recapSections.length>=4,'Weekly Recap must preserve a complete multi-desk edition');
assert.ok(words(recap)>Math.max(...teamWords),'Editorial Weekly Recap should be deeper than the longest team column');
const mentioned=(d.teams||[]).filter(t=>String(t.team_name||'').trim()&&recap.includes(String(t.team_name).trim()));
assert.ok(mentioned.length<(d.teams||[]).length,'Weekly Recap must select stories instead of mentioning every team by contract');

const all=[recap,...(d.teams||[]).map(articleText)].join('\n').toLowerCase();
for(const phrase of ['statistical lecture','arithmetic lesson','second source of points','absorb a quieter return','where sacks and forced fumbles can turn'])
  assert.ok(!all.includes(phrase),'Rejected explainer/meta phrase survived generated copy: '+phrase);

for(const t of d.teams||[]){
  const a=t.inquirer_article||{};
  assert.equal((a.sections||[]).length,8,'Each team article must preserve eight reporting beats');
  const players=(a.sections||[]).find(s=>s.kind==='players');
  assert.ok(players&&Array.isArray(players.paragraphs),'Each team article must preserve a player reporting beat');
}
console.log(JSON.stringify({ok:true,version:d.inquirer_version,teams:d.teams.length,recap_words:words(recap),max_team_words:Math.max(...teamWords),mentioned_teams:mentioned.length}));
