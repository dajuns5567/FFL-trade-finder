import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveInquirerQueueCredential,inquirerQueueKeyMatches} from '../netlify/functions/lib/inquirer-queue-credential.mjs';

const fakeStore=()=>{
 const rows=new Map();let writes=0;
 return{rows,get writes(){return writes;},
  async get(key){return rows.get(key)||null;},
  async setJSON(key,value,{onlyIfNew}={}){
   if(!onlyIfNew||!rows.has(key)){rows.set(key,value);writes++;return{modified:true}}
   return{modified:false}
  }
 };
};
test('queue credential cannot self-bootstrap from direct background requests',async()=>{
 const store=fakeStore();
 assert.equal(await resolveInquirerQueueCredential({store,bootstrap:false}),null);
 assert.equal(store.writes,0);
});
test('authorized scheduler generates a private durable high-entropy queue key once',async()=>{
 const store=fakeStore();
 const key=await resolveInquirerQueueCredential({store,bootstrap:true});
 assert.ok(key.length>=40);
 assert.match(key,/^[A-Za-z0-9_-]+$/);
 assert.equal(store.writes,1);
 assert.equal(await resolveInquirerQueueCredential({store,bootstrap:false}),key);
 assert.equal(await resolveInquirerQueueCredential({store,bootstrap:true}),key);
 assert.equal(store.writes,1);
 assert.equal(inquirerQueueKeyMatches(key,key),true);
 assert.equal(inquirerQueueKeyMatches(key,key+'x'),false);
 assert.equal(inquirerQueueKeyMatches(key,null),false);
});
test('legacy configured queue keys remain supported without rewriting site secrets',async()=>{
 const store=fakeStore();
 assert.equal(await resolveInquirerQueueCredential({store,configured:'legacy-queue-key',bootstrap:true}),'legacy-queue-key');
 assert.equal(store.writes,0);
 assert.equal(inquirerQueueKeyMatches('legacy-queue-key','legacy-queue-key'),true);
});
test('invalid or corrupted Blob credentials fail closed',async()=>{
 const store=fakeStore();
 store.rows.set('inquirer/internal-queue-credential.json',{key:'small'});
 await assert.rejects(resolveInquirerQueueCredential({store,bootstrap:true}),/Invalid stored/);
 assert.equal(store.writes,0);
});
