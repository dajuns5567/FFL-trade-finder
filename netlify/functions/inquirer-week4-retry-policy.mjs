// Explicitly bounded replay policy for the October 2026 invalid-model configuration.
// Never removes, overwrites or resets the original failed one-shot marker.
export const originalJobKey='inquirer/week4-style-drafts/2026/week-05/generation-job.json';
export const correctedJobKey='inquirer/week4-style-drafts/2026/week-05/generation-job-model-fix-v2.json';
export const reviewSalvageJobKey='inquirer/week4-style-drafts/2026/week-05/generation-job-review-salvage-v3.json';
export const targetedRepairJobKey='inquirer/week4-style-drafts/2026/week-05/generation-job-targeted-repair-v4.json';
export const diagnosticKey='inquirer/week4-style-drafts/2026/week-05/gateway-diagnostic.json';
export function permitModelFixReplay({original,diagnostic,model}={}){
 return model==='gpt-4.1'&&
  original?.status==='failed_manual_review_required'&&
  diagnostic?.status==='gateway_rejected'&&
  diagnostic?.model==='true'&&
  diagnostic?.provider_http_status===400&&
  /true is not a valid model ID/i.test(String(diagnostic?.provider_message||''));
}

// A single review-salvage rerun is permitted only after the corrected-model
// attempt failed inside application validation (not at the provider boundary).
export function permitReviewSalvageReplay({original,diagnostic,corrected,model}={}){
 return permitModelFixReplay({original,diagnostic,model})&&
  corrected?.status==='failed_manual_review_required'&&
  corrected?.failure_http_status==null&&
  corrected?.failure_type==='Error'&&
  corrected?.failure_code==='unknown';
}
