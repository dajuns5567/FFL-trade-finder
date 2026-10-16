import test from 'node:test';
import assert from 'node:assert/strict';
import {readSnapshotInventory} from '../scripts/archive-blob-inventory.mjs';
const valid=s=>s.valid!==false;
const store=(pages,objects)=>({
 async list({cursor}){return pages[cursor||'first']},
 async get(k){const v=objects[k];if(v instanceof Error)throw v;return v??null}
});
test('reads multiple pages, deduplicates and orders',async()=>{
 const pages={first:{blobs:[{key:'b'},{key:'a'}],cursor:'next'},next:{blobs:[{key:'b'},{key:'c'}]}};
 const got=await readSnapshotInventory(store(pages,{a:{t:'1'},b:{t:'2'},c:{t:'3'}}),valid);
 assert.deepEqual(got.map(x=>x.t),['1','2','3']);
});
test('empty collection',async()=>assert.deepEqual(await readSnapshotInventory(store({first:{blobs:[]}},{}),valid),[]));
test('rejects malformed page',async()=>assert.rejects(readSnapshotInventory(store({first:{cursor:'x'}},{}),valid),/ARCHIVE_INTEGRITY/));
test('rejects repeated cursor',async()=>assert.rejects(readSnapshotInventory(store({first:{blobs:[],cursor:'x'},x:{blobs:[],cursor:'x'}},{}),valid),/repeated snapshot cursor/));
test('rejects page cap',async()=>assert.rejects(readSnapshotInventory(store({first:{blobs:[],cursor:'x'}},{}),valid,{maxPages:1}),/page limit/));
test('rejects missing object',async()=>assert.rejects(readSnapshotInventory(store({first:{blobs:[{key:'missing'}]}},{}),valid),/missing listed snapshot/));
test('rejects thrown read',async()=>assert.rejects(readSnapshotInventory(store({first:{blobs:[{key:'broken'}]}},{broken:Error('failure')}),valid),/unreadable listed snapshot/));
test('filters explicitly invalid snapshots',async()=>assert.deepEqual(await readSnapshotInventory(store({first:{blobs:[{key:'bad'},{key:'good'}]}},{bad:{t:'0',valid:false},good:{t:'1'}}),valid),[{t:'1'}]));
