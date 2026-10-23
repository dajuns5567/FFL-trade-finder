// Read-only acceptance of the actual new-team live Week5 release and protected archive.
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import {inspectEditionBeforePublication} from '../netlify/functions/inquirer-publication-guard.mjs';
import {evaluateInquirerEditionQuality} from '../netlify/functions/inquirer-editorial-v31.mjs';
const SITE='2e556797-6f35-4037-aa5a-1338724eb71d';
assert.equal(process.env.FLEECED_NEW_TEAM_SITE_ID,SITE);
assert(process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN);
const store=getStore({name:'fleeced-league-hub',siteID:SITE,token:process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN,consistency:'strong'});
const read=key=>store.get(key,{type:'json'});
const [week3,week4,week5,index,awards]=await Promise.all([
 read('broadcasts/2026/week-03.json'),read('broadcasts/2026/week-04.json'),read('broadcasts/2026/week-05.json'),read('broadcasts/index.json'),read('awards/weekly.json')
]);
for(const [week,b] of [[3,week3],[4,week4],[5,week5]]){
 assert(b?.available&&Number(b.week)===week&&Number(b.season)===2026&&b.teams?.length===32,'Week '+week+' edition compromised');
 if(week===5)assert(b.published_locked,'Week 5 must be published locked');
 assert(index.some(x=>Number(x.season)===2026&&Number(x.week)===week),'Week '+week+' missing in broadcast index');
}
assert.equal(new Set(week5.teams.map(t=>String(t.roster_id))).size,32);
assert(week5.league_overview?.headline&&week5.league_overview?.sections?.length);
assert(week5.teams.every(t=>t.inquirer_article?.headline&&t.inquirer_article?.sections?.some(s=>s.kind==='sentiment'&&s.paragraphs?.length>=2)));
assert(week5.teams.every(t=>(t.inquirer_article?.paragraphs||[]).every(p=>!/\bn\/a\b/i.test(p))));
// Archive presence alone is not editorial acceptance: Week 5 previously
// passed completeness checks while serving repetitive, regressed prose.
const structural=inspectEditionBeforePublication(week5);
const deep=evaluateInquirerEditionQuality(week5,week4);
assert(structural.ok,'Week 5 editorial structural audit failed: '+JSON.stringify(structural.issues.slice(0,12)));
assert(deep.ok,'Week 5 editorial copy-forward audit failed: '+JSON.stringify((deep.issues||[]).slice(0,12)));
const award=(awards?.records||[]).find(x=>Number(x.season)===2026&&Number(x.week)===5);
assert.equal(award?.manager_awards?.length,4);
assert(award.players_of_week?.offense?.player_id&&award.players_of_week?.defense?.player_id);
const dirs=await read('inquirer/reporters/index.json'),reporters=dirs?.reporters||[];
assert.equal(reporters.length,4);
let articleCount=0;
for(const reporter of reporters){
 const archive=await read('inquirer/reporters/'+reporter.id+'/index.json');
 const entries=archive?.articles?.filter(e=>Number(e.season)===2026&&Number(e.week)===5)||[];
 assert(entries.some(e=>e.roster_id==='__league__'),'Recap missing from '+reporter.id);
 for(const entry of entries.filter(e=>e.roster_id!=='__league__')){
  const article=await read(entry.article_key);
  assert(article?.headline&&article.published_locked,'Article missing: '+entry.article_key);
  articleCount++;
 }
}
assert.equal(articleCount,32);
const overview=await read('inquirer/league-overview/2026/week-05.json');
assert(overview?.headline&&overview?.published_locked);
console.log('WEEK5 LIVE COMPLETE POST-PUBLISH AUDIT '+JSON.stringify({site:SITE,season:2026,archived_weeks:[3,4,5],team_articles:articleCount,reporters:reporters.length,weekly_recap:true,player_awards:Object.keys(award.players_of_week).filter(k=>award.players_of_week[k]).length,manager_badges:award.manager_awards.length,no_na_placeholders:true,history_preserved:true,production_mutations:0}));
