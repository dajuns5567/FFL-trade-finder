// READ ONLY: inspect the old production Inquirer Blob namespace before any authorized restoration.
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
const PROD='2e556797-6f35-4037-aa5a-1338724eb71d';
assert.equal(process.env.FLEECED_NEW_TEAM_SITE_ID,PROD,'wrong production site');
const token=process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN;
assert(token,'missing Actions-only Blob access');
const s=getStore({name:'fleeced-league-hub',siteID:PROD,token,consistency:'strong'});
const idx=await s.get('broadcasts/index.json',{type:'json'});
const rows=Array.isArray(idx)?idx:[];
const weeks=[];
for(const week of [1,2,3,4]){
 const key='broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json';
 const stored=await s.get(key,{type:'json'});
 weeks.push({week,exists:!!stored,teams:stored?.teams?.length||0,available:stored?.available===true,locked:stored?.published_locked===true,indexed:rows.some(x=>Number(x.season)===2026&&Number(x.week)===week)});
}
console.log('FLEECED NEW TEAM LIVE INQUIRER READ-ONLY INVENTORY '+JSON.stringify({site:PROD,store:'fleeced-league-hub',index_entries:rows.length,weeks,mutations:0}));
