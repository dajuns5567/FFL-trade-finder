// Explicitly bounded replay policy for the October 2026 invalid-model configuration.
// Never removes, overwrites or resets the original failed one-shot marker.
export const originalJobKey='inquirer/week4-style-drafts/2026/week-05/generation-job.json';
export const correctedJobKey='inquirer/week4-style-drafts/2026/week-05/generation-job-model-fix-v2.json';
export const diagnosticKey='inquirer/week4-style-drafts/2026/week-05/gateway-diagnostic.json';
export function permitModelFixReplay({original,diagnostic,model}={}){
 return model==='gpt-4.1'&&
  original?.status==='failed_manual_review_required'&&
  diagnostic?.status==='gateway_rejected'&&
  diagnostic?.model==='true'&&
  diagnostic?.provider_http_status===400&&
  /true is not a valid model ID/i.test(String(diagnostic?.provider_message||''));
}
