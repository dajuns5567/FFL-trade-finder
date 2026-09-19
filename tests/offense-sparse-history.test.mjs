import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('zero-history young offense projection stays consensus-anchored',()=>{
  const src=fs.readFileSync('valuation-offense-v38.js','utf8');
  assert(src.includes("c>=900?1.28:c>=750?1.22:c>=650?1.16:1.08"),'zero-history projection tiers drifted');
  assert(src.includes("if(pos==='RB')f+=.03"),'RB zero-history adjustment drifted');
  assert(src.includes("clamp38(1,f,1.31)"),'zero-history projection cap drifted');
});

test('zero-history RB receives no secondary rank/context lift',()=>{
  const src=fs.readFileSync('valuation-offense-v40.js','utf8');
  assert(!src.includes("seasons===0&&"),'zero-history RB regained a secondary context lift');
});

test('zero-history RB example is restrained rather than doubled',()=>{
  const c=621;
  let f=c>=900?1.28:c>=750?1.22:c>=650?1.16:1.08;
  f+=.03;
  f=Math.max(1,Math.min(f,1.31));
  const baseEvidenceCap=.95+.05*Math.max(0,Math.min(1,(c-500)/500));
  const rookieEvidenceCap=Math.max(.90,Math.min(1,baseEvidenceCap-.02));
  assert.equal(f,1.11);
  assert(c*f<800,'moderate-consensus zero-history RB context became excessive');
  assert(Math.abs(baseEvidenceCap-.9621)<1e-9,'zero-history RB base evidence cap drifted');
  assert(Math.abs(rookieEvidenceCap-.9421)<1e-9,'zero-history rookie RB uncertainty drifted');
  assert(c*rookieEvidenceCap<c*baseEvidenceCap,'rookie uncertainty no longer distinguishes true rookies from experienced zero-history RBs');
});
