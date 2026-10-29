import test from 'node:test';
import assert from 'node:assert/strict';
import original from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {ensureLockedEditionIndexed,isLockedInquirerEdition} from '../netlify/functions/league-hub.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
function fakeStore(seed={}){
 const values=new Map(Object.entries(seed).map(([k,v])=>[k,clone(v)])),writes=[];
 return{
  values,writes,
  async get(k){return values.has(k)?clone(values.get(k)):null},
  async setJSON(k,v){values.set(k,clone(v));writes.push(k)}
 };
}
const broadcastKey='broadcasts/2026/week-02.json';

test('imported locked newspaper with no index can rebuild every derived reporter/recap record',async()=>{
 const edition=clone(original),s=fakeStore({[broadcastKey]:edition});
 assert.equal(isLockedInquirerEdition(edition,2026,2),true);
 assert.equal(await ensureLockedEditionIndexed(s,edition,broadcastKey),true);
 assert.equal(s.values.get('broadcasts/index.json').filter(x=>Number(x.week)===2).length,1);
 const reporterIds=[...new Set(edition.teams.map(t=>t.inquirer_article.reporter.id))];
 let articles=0;
 for(const reporterId of reporterIds){
  const index=s.values.get('inquirer/reporters/'+reporterId+'/index.json');
  const entries=index.articles.filter(a=>Number(a.week)===2&&String(a.roster_id)!=='__league__');
  articles+=entries.length;
  for(const entry of entries)assert.ok(s.values.has(entry.article_key));
 }
 assert.equal(articles,32);
 assert.equal(s.values.get('inquirer/league-overview/2026/week-02.json').headline,edition.league_overview.headline);
 assert.deepEqual(s.values.get(broadcastKey),edition,'must never rewrite the approved source article');
 const before=s.writes.length;
 assert.equal(await ensureLockedEditionIndexed(s,edition,broadcastKey),false);
 assert.equal(s.writes.length,before,'subsequent pass must not rewrite complete derived records');
});

test('a committed broadcast index does not mask missing reporter articles or recap',async()=>{
 const edition=clone(original),s=fakeStore({[broadcastKey]:edition});
 await ensureLockedEditionIndexed(s,edition,broadcastKey);
 const reporterId=edition.teams[0].inquirer_article.reporter.id;
 const reporterKey='inquirer/reporters/'+reporterId+'/index.json';
 const idx=s.values.get(reporterKey);
 const toRemove=idx.articles.find(a=>String(a.roster_id)===String(edition.teams[0].roster_id)&&Number(a.week)===2);
 assert.ok(toRemove,'test reporter must have a roster article');
 idx.articles=idx.articles.filter(a=>a!==toRemove);
 s.values.set(reporterKey,clone(idx));
 s.values.delete('inquirer/league-overview/2026/week-02.json');
 const indexOriginal=clone(s.values.get('broadcasts/index.json'));
 const before=s.writes.length;
 assert.equal(await ensureLockedEditionIndexed(s,edition,broadcastKey),true);
 assert.ok(s.writes.length>before);
 assert.deepEqual(s.values.get('broadcasts/index.json'),indexOriginal,'no duplicate published broadcast');
 assert.ok(s.values.get(reporterKey).articles.some(a=>a.article_key===toRemove.article_key));
 assert.equal(s.values.get('inquirer/league-overview/2026/week-02.json').headline,edition.league_overview.headline);
 assert.deepEqual(s.values.get(broadcastKey),edition);
});

test('invalid/corrupted broadcast index must stop instead of being overwritten',async()=>{
 const edition=clone(original),s=fakeStore({'broadcasts/index.json':{corrupted:true}});
 await assert.rejects(()=>ensureLockedEditionIndexed(s,edition,broadcastKey),/Invalid broadcast index/);
 assert.deepEqual(s.values.get('broadcasts/index.json'),{corrupted:true});
 assert.equal(s.writes.length,0);
});
