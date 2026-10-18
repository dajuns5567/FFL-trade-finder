import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {loadAcceptedWeek4} from '../netlify/functions/inquirer-week4-accepted-source.mjs';
const original={...fixture,week:4,available:true,published_locked:undefined};
const raw=JSON.stringify(original),sha=createHash('sha256').update(raw).digest('hex');
test('legacy Week 4 archive may serve as style only after exact digest check',async()=>{
 const store={get:async key=>key.includes('recovery-originals')?raw:null};
 const result=await loadAcceptedWeek4(store,{trustedSha:sha});
 assert.equal(result.source,'sha256_pinned_original_archive');
 assert.equal(result.edition.published_locked,true);
 assert.equal(original.published_locked,undefined,'archive remains untouched');
 assert.deepEqual(Object.keys(result.edition).filter(k=>k!=='published_locked'),Object.keys(original));
});
test('changed original bytes cannot be trusted and never fall through',async()=>{
 const store={get:async key=>key.includes('recovery-originals')?raw+' ':null};
 const result=await loadAcceptedWeek4(store,{trustedSha:sha});
 assert.equal(result.edition,null);
 assert.equal(result.source,'trusted_original_not_staged');
});
test('existing verified locked published Week 4 remains the preferred source',async()=>{
 const published={...original,published_locked:true};
 const result=await loadAcceptedWeek4({get:async key=>key.startsWith('broadcasts/')?published:null});
 assert.equal(result.edition,published);
 assert.equal(result.source,'verified_locked_broadcast');
});
