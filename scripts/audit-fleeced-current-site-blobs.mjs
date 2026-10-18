// Read-only audit of the currently connected Netlify production site.
// Never generates, repairs, stages, publishes, or overwrites content.
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';

const EXPECTED_SITE='d51af6d7-e5f3-4c51-8c6d-25e31db39a0c';
assert.equal(process.env.FLEECED_AUDIT_SITE_ID,EXPECTED_SITE,'Refusing to audit an unexpected Netlify site');
const token=process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN;
assert(token,'Missing GitHub Actions Netlify Blob token');
const s=getStore({name:'fleeced-league-hub',siteID:EXPECTED_SITE,token,consistency:'strong'});
const get=key=>s.get(key,{type:'json',consistency:'strong'});
const index=await get('broadcasts/index.json'),rows=Array.isArray(index)?index:[];
const weeks=[];
for(const week of [1,2,3,4,5]){
 const key='broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json';
 const item=await get(key);
 const teams=Array.isArray(item?.teams)?item.teams:[];
 weeks.push({
  week,stored:!!item,available:item?.available===true,locked:item?.published_locked===true,
  indexed:rows.some(x=>Number(x?.season)===2026&&Number(x?.week)===week),
  team_count:teams.length,article_count:teams.filter(t=>t?.inquirer_article?.headline).length,
  fan_sentiment_count:teams.filter(t=>!!t?.inquirer_article?.fan_sentiment).length,
  has_recap:!!item?.league_overview?.headline,
  editor:String(item?.editorial_generation?.engine||''),
 });
}
const awards=await get('awards/weekly.json'),records=Array.isArray(awards?.records)?awards.records:[],
 managers=await get('managers/history-cache.json'),registry=await get('managers/registry.json'),
 reporters=await get('inquirer/reporters/index.json');
const reporterEntries=await s.list({prefix:'inquirer/reporters/',consistency:'strong'});
const summary={
 site:EXPECTED_SITE,store:'fleeced-league-hub',weeks,
 weekly_award_weeks:records.filter(r=>Number(r.season)===2026).map(r=>Number(r.week)),
 weekly_player_award_weeks:records.filter(r=>Number(r.season)===2026&&r.players_of_week?.offense&&r.players_of_week?.defense).map(r=>Number(r.week)),
 manager_cache:!!managers?.career?.length,manager_registry:!!registry,
 reporter_directory:!!reporters?.reporters?.length,
 reporter_blob_count:reporterEntries.blobs?.length||0,mutations:0,
};
console.log('FLEECED CURRENT SITE BLOB INVENTORY '+JSON.stringify(summary));
