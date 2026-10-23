import test from 'node:test';
import assert from 'node:assert/strict';
import {permitModelFixReplay,permitReviewSalvageReplay} from '../netlify/functions/inquirer-week4-retry-policy.mjs';
const original={status:'failed_manual_review_required'};
const diagnostic={status:'gateway_rejected',model:'true',provider_http_status:400,
 provider_message:'400 true is not a valid model ID'};
test('only exact invalid-model diagnosis permits controlled replay',()=>{
 assert.equal(permitModelFixReplay({original,diagnostic,model:'gpt-4.1'}),true);
 for(const variant of [
  {original:{status:'draft_staged'},diagnostic,model:'gpt-4.1'},
  {original,diagnostic:{...diagnostic,model:'gpt-4.1'},model:'gpt-4.1'},
  {original,diagnostic:{...diagnostic,provider_message:'Other error'},model:'gpt-4.1'},
  {original,diagnostic,model:'true'},
  {original,diagnostic,model:'gpt-4o'}
 ])assert.equal(permitModelFixReplay(variant),false);
});

test('salvage replay only admits application errors after corrected model was verified',()=>{
 const corrected={status:'failed_manual_review_required',failure_http_status:null,failure_type:'Error',failure_code:'unknown'};
 assert.equal(permitReviewSalvageReplay({original,diagnostic,corrected,model:'gpt-4.1'}),true);
 assert.equal(permitReviewSalvageReplay({original,diagnostic,corrected:{...corrected,failure_http_status:400},model:'gpt-4.1'}),false);
 assert.equal(permitReviewSalvageReplay({original,diagnostic,corrected:{...corrected,status:'draft_staged'},model:'gpt-4.1'}),false);
 assert.equal(permitReviewSalvageReplay({original,diagnostic,corrected,model:'true'}),false);
});
