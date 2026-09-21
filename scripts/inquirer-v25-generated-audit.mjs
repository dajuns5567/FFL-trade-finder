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
assert.equal(Number(d.editorial_revision),3,'Generated edition must carry contextual editorial revision 3');
assert.equal((d.teams||[]).length,32,'Generated Week 1 edition must contain 32 team articles');
assert.ok(recapSections.length>=4,'Weekly Recap must preserve a complete multi-desk edition');
assert.ok(words(recap)>Math.max(...teamWords),'Editorial Weekly Recap should be deeper than the longest team column');
const mentioned=(d.teams||[]).filter(t=>String(t.team_name||'').trim()&&recap.includes(String(t.team_name).trim()));
assert.ok(mentioned.length<(d.teams||[]).length,'Weekly Recap must select stories instead of mentioning every team by contract');
const mattered=recapSections.find(s=>s?.heading==='What Actually Mattered This Week');
assert.ok((mattered?.paragraphs||[]).length>=10,'What Actually Mattered This Week must develop at least five selected matchups with follow-up implications');
const matterBlocks=(mattered?.blocks||[]).filter(x=>Array.isArray(x?.paragraphs)&&x.paragraphs.length);
assert.ok(matterBlocks.length>=5,'What Actually Mattered This Week must expose labeled matchup/story blocks');
assert.ok(matterBlocks.slice(0,5).every(x=>String(x.heading||'').trim()&&x.paragraphs.length>=2),'Each featured matchup must have a visible heading and developed analysis');
const topScorer=(d.teams||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0];
assert.ok(topScorer&&matterBlocks[0]?.heading?.includes(topScorer.team_name),'First Weekly Recap matchup block must feature the week’s top scoring team');
assert.ok((matterBlocks[0]?.paragraphs||[]).join(' ').includes(topScorer.team_name),'Top scorer must receive actual Weekly Recap commentary, not merely a heading');
assert.ok(((mattered?.paragraphs||[]).join(' ').match(/week’s cleanest upset/gi)||[]).length<=1,'Expanded recap must not call multiple games the week’s cleanest upset');
const recapOpeners=(mattered?.paragraphs||[]).map(p=>String(p).trim().split(/\s+/).slice(0,7).join(' ').toLowerCase());
const openerCounts=new Map();for(const x of recapOpeners)openerCounts.set(x,(openerCounts.get(x)||0)+1);
assert.ok(Math.max(0,...openerCounts.values())<=2,'Expanded matchup paragraphs must not repeat one canned implication opener across the recap');
assert.ok(recapSections.some(s=>/Velvet Rope/i.test(String(s?.heading||''))),'Bartholomew’s Weekly Recap desk must retain his own identity instead of a generic analytics heading');

const all=[recap,...(d.teams||[]).map(articleText)].join('\n').toLowerCase();
for(const phrase of ['statistical lecture','arithmetic lesson','second source of points','absorb a quieter return','where sacks and forced fumbles can turn','awkward; deliciously so','the back page has not forgotten','the back page is keeping the receipt','which tells us whether','the responsible read is simple','what i want to see next','this is where a weekly recap should','require no further explanation'])
  assert.ok(!all.includes(phrase),'Rejected explainer/meta/repeated phrase survived generated copy: '+phrase);
assert.ok(!String(d.historical_player_stats_source||'').includes('unavailable'),'Generated Week 1 must carry a real prior-season player-history source');
const historicalStarters=(d.teams||[]).flatMap(t=>t.starter_details||[]).filter(p=>Number(p.prior_season_games)>=6&&Number.isFinite(Number(p.prior_season_avg)));
assert.ok(historicalStarters.length>=40,'Week 1 must propagate meaningful prior-season baselines into player reporting; got '+historicalStarters.length);
assert.match(recap,/\b(?:targets|carries|pass attempts|solo|tackles|sack|receiving|rushing|passing)\b/i,'Weekly Recap must discuss real-life stat-line context, not fantasy points alone');
assert.match(recap,/BREAKOUT WATCH|RELIABLE:|DECLINE WATCH|VETERAN CHECK-IN/i,'Weekly Recap must carry an evidence-backed player trajectory/reliability story');

const spedale=(d.teams||[]).find(t=>String(t.manager_name||'').toLowerCase()==='mike3spedale');
if(spedale){
  const goedert=(spedale.starter_details||[]).find(p=>/Dallas Goedert/i.test(String(p.name||''))),spedaleText=articleText(spedale);
  assert.ok(goedert?.acquisition||((spedale.trade_acquisitions||[]).some(x=>/Dallas Goedert/i.test(String(x.player_name||'')))),'Dallas Goedert must retain canonical trade-acquisition memory for Mike3Spedale');
  assert.match(spedaleText,/Dallas Goedert[^.]{0,160}trade|trade[^.]{0,160}Dallas Goedert/i,'Mike3Spedale article must describe Dallas Goedert as a trade acquisition');
  assert.doesNotMatch(spedaleText,/ADD ALERT:[^.]*Dallas Goedert/i,'Dallas Goedert trade acquisition must never regress to waiver/free-agent ADD ALERT copy');
}

const orderByReporter=new Map();
for(const t of d.teams||[]){
  const a=t.inquirer_article||{};
  const rid=String(a?.reporter?.id||''),order=(a.sections||[]).map(s=>s.kind).join('>');if(!orderByReporter.has(rid))orderByReporter.set(rid,new Set());orderByReporter.get(rid).add(order);
  assert.equal((a.sections||[]).length,8,'Each team article must preserve eight reporting beats');
  const players=(a.sections||[]).find(s=>s.kind==='players');
  assert.ok(players&&Array.isArray(players.paragraphs),'Each team article must preserve a player reporting beat');
  const lede=(a.sections||[]).find(s=>s.kind==='lede'),management=(a.sections||[]).find(s=>s.kind==='management'),outlook=(a.sections||[]).find(s=>s.kind==='outlook');
  assert.ok((lede?.paragraphs||[]).length>=3,'Team ledes must carry result plus reporter commentary');
  assert.ok((players?.paragraphs||[]).length>=3,'Player sections must add commentary beyond the stat line');
  if((management?.paragraphs||[])[0]!=='n/a')assert.ok((management?.paragraphs||[]).length>=2,'Meaningful management sections must include reporter follow-through');
  if((outlook?.paragraphs||[])[0]!=='n/a')assert.ok((outlook?.paragraphs||[]).length>=3,'Next-week sections must develop the matchup and road ahead');
  const top=(t.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],playerCopy=(players?.paragraphs||[]).join(' ');
  if(top?.real_stat_line){
    assert.ok(playerCopy.includes(String(top.name||'')),'Player section must discuss the leading player by name for '+t.team_name);
    assert.match(playerCopy,/\b(?:targets?|carries|passing|rushing|receiving|yards?|touchdowns?|tackles?|sacks?|snaps?|interceptions?)\b/i,'Player section must translate the leading player real-life stat line into football prose for '+t.team_name);
  }
}
for(const [rid,orders] of orderByReporter)assert.ok(orders.size>=2,'Reporter '+rid+' must have more than one article structure across eight team stories');
const repeatedLong=new Map();
for(const t of d.teams||[]){
  const body=articleText(t);
  for(const sentence of body.split(/(?<=[.!?])\s+/)){
    const key=String(sentence||'').trim();
    if(words(key)<8)continue;
    repeatedLong.set(key,(repeatedLong.get(key)||0)+1);
  }
}
const repeatedLongOffenders=[...repeatedLong].filter(([,count])=>count>2);
assert.deepEqual(repeatedLongOffenders,[],'Generated team articles must not repeat any long sentence across more than two placements');
const avgTeamWords=teamWords.reduce((n,x)=>n+x,0)/Math.max(1,teamWords.length);
assert.ok(Math.min(...teamWords)>=400,'Every team column must preserve substantial commentary; shortest='+Math.min(...teamWords));
assert.ok(avgTeamWords>=500,'Team columns must average at least 500 words of reporting/commentary; average='+avgTeamWords.toFixed(1));
console.log(JSON.stringify({ok:true,version:d.inquirer_version,teams:d.teams.length,recap_words:words(recap),max_team_words:Math.max(...teamWords),min_team_words:Math.min(...teamWords),avg_team_words:Number(avgTeamWords.toFixed(1)),mentioned_teams:mentioned.length,reporter_structures:Object.fromEntries([...orderByReporter].map(([k,v])=>[k,v.size]))}));
