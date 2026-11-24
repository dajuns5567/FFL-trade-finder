// Only the local scheduled collector uses this bounded retry. An incomplete
// or last-known-good publisher set must never become a fresh history point.
export function completeScheduledConsensus(payload){
 const summary=payload?.summary,rows=summary?.results;
 return payload?.integrity?.all_sources_valid===true&&payload?.promotion?.promoted===true&&
  payload?.promotion?.using_last_known_good===false&&Number(summary?.successful)>=7&&
  Number(summary?.failed)===0&&Array.isArray(rows)&&rows.length>=7&&rows.every(r=>r?.ok===true);
}
function failureKind(row){
 const error=String(row?.error||'');
 if(/(?:\b40[13]\b|robots[- ]denied|access denied|unauthori[sz]ed|forbidden)/i.test(error))return 'access-restricted';
 if(/\b429\b|rate.limit/i.test(error))return 'rate-limit';
 if(/\b5\d\d\b|timeout|abort|fetch failed|network/i.test(error))return 'transient';
 return row?.ok===true?null:'validation-incomplete';
}
export async function retryScheduledConsensus(request,update,{attempts=3,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),log=console.info}={}){
 let last,thrown;
 for(let attempt=1;attempt<=attempts;attempt++){
  let response,payload;
  try{response=await update(request.clone());payload=await response.clone().json();last=response;thrown=null}
  catch(error){
   thrown=error;
   log('scheduled-consensus-attempt',JSON.stringify({attempt,complete:false,error:'request-or-response-failed'}));
   if(attempt===attempts){if(last)return last;throw error}
   await pause(1500*attempt);continue;
  }
  const rows=Array.isArray(payload?.summary?.results)?payload.summary.results:[];
  const diagnostics=rows.map(r=>({source:r.source,ok:r.ok===true,players:Number(r.players_extracted)||0,stage:r.stage||null,failure:failureKind(r)}));
  const complete=response.ok&&completeScheduledConsensus(payload);
  log('scheduled-consensus-attempt',JSON.stringify({attempt,complete,http_status:response.status,successful:payload?.summary?.successful??null,diagnostics}));
  if(complete)return response;
  // Do not retry an explicit permission denial or invalid request. No
  // alternate identity, stored values, or bypass of the seven-source gate.
  if([400,401,403,405].includes(response.status)||diagnostics.some(r=>r.failure==='access-restricted'))return response;
  if(attempt<attempts)await pause(1500*attempt);
 }
 if(last)return last;
 throw thrown||Error('Scheduled consensus did not return a response');
}
