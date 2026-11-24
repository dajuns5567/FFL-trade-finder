import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SECTION_CONTRACTS,auditSectionReadiness,assertSectionReadiness} from '../scripts/audit-section-readiness.mjs';

const source=filename=>readFileSync(new URL('../'+filename,import.meta.url),'utf8');

test('current repository contains all named site sections and subsection reader routes',()=>{
 const report=assertSectionReadiness(source);
 assert.ok(report.areas>=10);
 assert.ok(report.checks>=55);
 assert.equal(report.failed.length,0);
});

test('each section separately blocks removal of a view, data reader, or refresh contract',()=>{
 const original=new Map([...new Set(SECTION_CONTRACTS.map(x=>x.file))].map(file=>[file,source(file)]));
 for(const contract of SECTION_CONTRACTS){
  for(const marker of contract.markers){
   const edited=new Map(original);
   edited.set(contract.file,edited.get(contract.file).replaceAll(marker,'__REGRESSED_MISSING_FEATURE__'));
   assert.throws(()=>assertSectionReadiness(file=>edited.get(file)),
    /Site subsection source regression/,contract.area+' must reject missing '+marker);
  }
 }
});

test('missing source files are reported instead of silently counted as healthy',()=>{
 const report=auditSectionReadiness(file=>file==='league-hub-v451.js'?'':source(file));
 assert.ok(report.failed.some(x=>x.area==='League Hub views'));
 assert.ok(report.failed.some(x=>x.area==='Awards and all-time highs UI'));
 assert.ok(report.failed.some(x=>x.area==='Manager histories and identities UI'));
 assert.ok(report.results.some(x=>x.area==='Trade History and Hindsight'&&x.present));
});
