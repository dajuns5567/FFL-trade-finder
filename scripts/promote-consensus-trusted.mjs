// GitHub Actions only: server independently re-fetches consensus sources and
// validates their completeness before writing the last-known-good snapshot.
import {existsSync,readFileSync} from 'node:fs';
const path=process.env.CONSENSUS_TRUSTED_PLAYERS_FILE||'.tmp/consensus-trusted-players.json';
if(!existsSync(path)){console.log('TRUSTED_CONSENSUS_PROMOTION_SKIPPED no canonical manifest');process.exit(0)}
const token=String(process.env.FLEECED_SERVER_WRITE_TOKEN||'');
if(token.length<32)throw new Error('Trusted consensus promotion requires the GitHub Actions server write token');
const manifest=JSON.parse(readFileSync(path,'utf8'));
const players=manifest?.players;
const age=Date.now()-Date.parse(String(manifest?.captured_at||''));
if(manifest?.version!==1||manifest?.league!=='1316867686394769408'||
  manifest.source!=='trusted-headless-consensus'||!Array.isArray(players)||
  players.length<700||players.length>4000||!Number.isFinite(age)||age<0||age>30*60*1000||
  players.some(p=>!p?.id||!p?.name||!p?.position))throw new Error('Untrusted or incomplete consensus identity manifest');
const endpoint='https://extraordinary-toffee-98c3b7.netlify.app/.netlify/functions/update';
const result=await fetch(endpoint,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(180000),
  headers:{authorization:'Bearer '+token,'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify({players})});
if([301,302,303,307,308,401].includes(result.status)){
  console.warn('TRUSTED_CONSENSUS_PROMOTION_BLOCKED private Netlify SSO; no access controls changed');
  process.exit(0);
}
if(!result.ok)throw new Error('Authenticated consensus refresh failed with HTTP '+result.status);
const response=await result.json();
if(response.promotion?.promoted===true&&response.integrity?.all_sources_valid===true)
  console.log('TRUSTED_CONSENSUS_LKG_PROMOTED',JSON.stringify({sources:response.summary?.successful||0,updated:response.updatedAt}));
else
  console.warn('TRUSTED_CONSENSUS_LKG_RETAINED',JSON.stringify({sources:response.summary?.successful||0,allValid:response.integrity?.all_sources_valid===true,promoted:false}));
