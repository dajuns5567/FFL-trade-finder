// Promotion of League Hub statistics is allowed only from the trusted GitHub
// Actions headless collector. Never accept unverified browser POSTs in production.
import {readFileSync,existsSync} from 'node:fs';

const path=process.env.LEAGUE_AWARDS_SNAPSHOT_FILE||'.tmp/league-hub-trusted-awards.json';
const token=String(process.env.FLEECED_SERVER_WRITE_TOKEN||'');
if(!existsSync(path)){console.log('TRUSTED_AWARDS_PUBLISH_SKIPPED no completed collector output');process.exit(0)}
if(token.length<32)throw new Error('FLEECED_SERVER_WRITE_TOKEN must be configured as a repository Actions secret');
const data=JSON.parse(readFileSync(path,'utf8'));
if(data?.version!==1||data.league!=='1316867686394769408'||data.source!=='trusted-headless-awards'||
   data.valuation_contract!=='precision-idp-runtime-20260919'||
   !/^[a-z0-9]+$/i.test(String(data.canonical_fingerprint||''))||
   !Array.isArray(data.award_highs?.records)||data.award_highs.records.length<200||
   !Array.isArray(data.awards?.awards)||data.awards.awards.length<18||
   !/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([1-9]|[12][0-9]|3[01]) 20[0-9]{2}$/.test(String(data.awards.period||''))){
  throw new Error('Trusted award snapshot failed canonical completeness validation');
}
const age=Date.now()-Date.parse(String(data.captured_at||''));
if(!Number.isFinite(age)||age<0||age>30*60*1000)throw new Error('Trusted awards snapshot is stale');
const origin='https://extraordinary-toffee-98c3b7.netlify.app';
const payloads=[['award_highs',data.award_highs],['draft_records',data.draft_records],['awards',data.awards]].filter(([,body])=>body);
let total=0;
for(const [query,body] of payloads){
  const response=await fetch(origin+'/.netlify/functions/league-hub?'+query+'=1',{
    method:'POST',redirect:'manual',headers:{
      authorization:'Bearer '+token,'content-type':'application/json','accept':'application/json'
    },body:JSON.stringify(body),signal:AbortSignal.timeout(120000)
  });
  // Existing Netlify project remains protected by team SSO before public launch.
  // Do not weaken access; keep the capture for future authenticated publication.
  if(response.status===401||response.status===302||response.status===303||response.status===307||response.status===308){
    console.warn('TRUSTED_AWARDS_PUBLISH_BLOCKED private Netlify visitor access; no security settings changed');
    process.exitCode=0;break;
  }
  if(!response.ok)throw new Error('Trusted award promotion '+query+' returned HTTP '+response.status);
  const result=await response.json();
  if(result?.error)throw new Error('Trusted award promotion '+query+' rejected the submitted data');
  total++;
  console.log('TRUSTED_AWARDS_PUBLISH_OK',query);
}
if(total===payloads.length)console.log('TRUSTED_AWARDS_PUBLISH_COMPLETE',total);
