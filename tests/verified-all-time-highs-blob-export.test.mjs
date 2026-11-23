import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateBlobHighsExport} from '../scripts/validate-all-time-highs-blob-export.mjs';
const source=fs.readFileSync(new URL('../scripts/award-highs-verified-export.js',import.meta.url),'utf8');
function fixture(){
 const records=[];
 for(let category=1;category<=20;category++)
  for(let roster=1;roster<=32;roster++){
   if(category===20&&roster===32)continue;
   records.push({award_key:'category-'+category,roster_id:String(roster),
    score:category*100+roster,detail:'Verified historic award',
    captured_at:'2026-11-20T00:00:00.000Z'});
  }
 return {schema_version:1,source:'ffl-verified-netlify-blob-all-time-highs-readback',
  league_id:'1316867686394769408',
  preview_origin:'https://deploy-preview-611--animated-dasik-3de74a.netlify.app',
  exported_at:new Date().toISOString(),record_count:records.length,
  source_counts:{blob:639,durable:0},records};
}
test('original 639 highs survive offline validation without score or timestamp changes',()=>{
 const result=validateBlobHighsExport(fixture());
 assert.equal(result.record_count,639);assert.equal(result.category_count,20);
 assert.equal(result.roster_count,32);
 assert.equal(result.records[0].captured_at,'2026-11-20T00:00:00.000Z');
 assert.equal(result.records.find(x=>x.award_key==='category-20'&&x.roster_id==='31').score,2031);
});
test('reject missing, forged, duplicated, or future awards instead of inventing data',()=>{
 const mutations=[
  p=>{p.records[0].score=-999999},
  p=>{p.records[0].captured_at='2999-01-01T00:00:00Z'},
  p=>{p.records[1]={...p.records[0]}},
  p=>{p.records=p.records.filter(r=>r.award_key!=='category-20');p.record_count=p.records.length;p.source_counts.blob=p.records.length},
  p=>{p.source_counts.durable=12},
  p=>{p.source_counts.blob=640},
  p=>{p.preview_origin='https://production.example.com'},
  p=>{p.records[3].score=NaN}
 ];
 for(const mut of mutations){const p=fixture();mut(p);assert.throws(()=>validateBlobHighsExport(p))}
});
test('the browser export is GET-only, preview-only, and never writes an archive',()=>{
 assert.match(source,/deploy-preview-/);
 assert.match(source,/\.netlify\/functions\/league-hub\?award_highs=1/);
 assert.match(source,/cache:'no-store'/);
 assert.doesNotMatch(source,/method:\s*['"]POST|\.setJSON\(|github\.com\/repos|api\.github\.com\/repos/);
 assert.match(source,/a\.download='ffl-all-time-highs-verified-blob-export\.json'/);
});
