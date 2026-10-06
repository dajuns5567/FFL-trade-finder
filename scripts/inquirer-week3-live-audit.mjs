import assert from 'node:assert/strict';
import fs from 'node:fs';
import week2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {applyInquirerEditorialV31,evaluateInquirerEditionQuality,FORWARD_INQUIRER_VERSION,FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';
import {inquirerWeekClassification} from '../netlify/functions/inquirer-reporters.mjs';

const SITE=String(process.env.INQUIRER_LIVE_SITE||'https://precious-stroopwafel-196eae.netlify.app').replace(/\/$/,'');
const url=`${SITE}/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week=3`;
const res=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-Inquirer-Week3-Live-Audit/1.0'},cache:'no-store'});
assert.ok(res.ok,`Week 3 stored broadcast fetch failed: ${res.status}`);
const live=await res.json();
assert.equal(Number(live?.season),2026,'Expected stored 2026 Week 3 broadcast');
assert.equal(Number(live?.week),3,'Expected stored Week 3 broadcast');
assert.ok(Array.isArray(live?.teams)&&live.teams.length===32,`Expected 32 Week 3 teams, got ${live?.teams?.length||0}`);

const clone=x=>JSON.parse(JSON.stringify(x));
const rawInquirer={reporters:clone(live.reporters||week2.reporters||[]),teams:clone(live.teams)};
for(const t of rawInquirer.teams){delete t.inquirer_article;}
const rawOverview=clone(live.league_overview||{});
const weekClassification=inquirerWeekClassification(3,2026);

let accepted=null,lastQuality=null;
for(let salt=0;salt<8;salt++){
  const edited=applyInquirerEditorialV31({season:2026,week:3,rawInquirer:clone(rawInquirer),rawOverview:clone(rawOverview),previousEdition:week2,weekClassification,variationSalt:salt});
  const candidate={
    available:true,
    season:2026,
    week:3,
    inquirer_version:FORWARD_INQUIRER_VERSION,
    editorial_revision:FORWARD_EDITORIAL_REVISION,
    teams:edited.inquirer.teams,
    league_overview:edited.leagueOverview,
    editorial_generation:{variation_salt:salt,source:'stored-live-week3-snapshot'}
  };
  const q=evaluateInquirerEditionQuality(candidate,week2);lastQuality=q;
  if(q.ok){accepted=candidate;break;}
}
assert.ok(accepted,'Live Week 3 snapshot could not produce an accepted edition within 8 salts: '+JSON.stringify(lastQuality?.issues||[]).slice(0,8000));

const paragraphs=a=>(a?.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const teamStats=accepted.teams.map(t=>({
  roster_id:String(t.roster_id),
  team_name:String(t.team_name||''),
  reporter:String(t?.inquirer_article?.reporter?.name||''),
  reporter_id:String(t?.inquirer_article?.reporter?.id||''),
  headline:String(t?.inquirer_article?.headline||''),
  paragraphs:paragraphs(t.inquirer_article).length,
  words:words(paragraphs(t.inquirer_article).join(' '))
}));
const reporterCounts=Object.fromEntries([...new Set(teamStats.map(x=>x.reporter_id))].sort().map(id=>[id,teamStats.filter(x=>x.reporter_id===id).length]));
const minWords=Math.min(...teamStats.map(x=>x.words)),maxWords=Math.max(...teamStats.map(x=>x.words)),avgWords=Math.round(teamStats.reduce((n,x)=>n+x.words,0)/teamStats.length);

fs.writeFileSync('/tmp/inquirer-week3-live-candidate.json',JSON.stringify(accepted,null,2)+'\n');
fs.writeFileSync('/tmp/inquirer-week3-live-audit.json',JSON.stringify({
  ok:true,
  source:url,
  stored_generated_at:live.generated_at||null,
  stored_version:live.inquirer_version||null,
  stored_revision:live.editorial_revision||null,
  candidate_version:accepted.inquirer_version,
  candidate_revision:accepted.editorial_revision,
  variation_salt:accepted.editorial_generation.variation_salt,
  quality:lastQuality?.metrics||{},
  teams:accepted.teams.length,
  reporter_counts:reporterCounts,
  words:{min:minWords,max:maxWords,average:avgWords},
  team_stats:teamStats
},null,2)+'\n');
console.log(JSON.stringify({ok:true,teams:accepted.teams.length,variation_salt:accepted.editorial_generation.variation_salt,quality:lastQuality?.metrics||{},reporter_counts:reporterCounts,words:{min:minWords,max:maxWords,average:avgWords},stored_generated_at:live.generated_at||null},null,2));
