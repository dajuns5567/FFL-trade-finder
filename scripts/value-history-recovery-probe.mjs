import { getStore } from '@netlify/blobs';

const sites=[
  {name:'precious-stroopwafel-196eae',id:'c5780469-ab95-4c28-b572-33b10a9d1c81'},
  {name:'subtle-genie-6167c5',id:'0cc03543-09f9-4de9-9b52-6cbc4fbc4357'}
];
const tokens=[
  ['NETLIFY_BLOBS_TOKEN',String(process.env.NETLIFY_BLOBS_TOKEN||'').trim()],
  ['NETLIFY_AUTH_TOKEN',String(process.env.NETLIFY_AUTH_TOKEN||'').trim()]
].filter(([,v])=>v).filter((x,i,a)=>a.findIndex(y=>y[1]===x[1])===i);
const from=Date.parse('2026-09-19T22:01:38.323Z');
const through=Date.parse('2026-09-21T04:00:00.000Z');
if(!tokens.length)throw new Error('No Netlify Blob/Auth token is configured');

const results=[];
for(const site of sites){
  let resolved=false,lastError=null;
  for(const [tokenName,token] of tokens){
    try{
      const store=getStore({name:'fll-value-history-v2',siteID:site.id,token,consistency:'strong'});
      const listing=await store.list({prefix:'snapshots/'});
      const keys=(listing?.blobs||[]).map(x=>String(x?.key||'')).filter(Boolean).sort();
      const manifest=[];
      for(let i=0;i<keys.length;i+=25){
        const batch=keys.slice(i,i+25);
        const rows=await Promise.all(batch.map(key=>store.get(key,{type:'json'}).catch(()=>null)));
        for(let j=0;j<rows.length;j++){
          const snap=rows[j],ms=new Date(String(snap?.t||'')).getTime();
          if(!snap?.t||!Array.isArray(snap?.rows)||!Number.isFinite(ms)||ms<from||ms>through)continue;
          manifest.push({
            key:batch[j],
            t:String(snap.t),
            source:String(snap.source||'page-load'),
            fingerprint:String(snap.fingerprint||''),
            count:snap.rows.length,
            pick_count:Array.isArray(snap.picks)?snap.picks.length:0,
            team_count:Array.isArray(snap.teams)?snap.teams.length:0,
            valuation_contract:snap.valuation_contract||null
          });
        }
      }
      manifest.sort((a,b)=>a.t.localeCompare(b.t));
      results.push({site:site.name,site_id:site.id,token:tokenName,snapshot_count:manifest.length,snapshots:manifest});
      resolved=true;
      break;
    }catch(e){lastError=String(e?.message||e)}
  }
  if(!resolved)results.push({site:site.name,site_id:site.id,error:lastError||'unavailable'});
}
console.log(JSON.stringify({ok:true,window:{from:new Date(from).toISOString(),through:new Date(through).toISOString()},results},null,2));
