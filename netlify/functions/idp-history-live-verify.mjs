import { getStore } from '@netlify/blobs';

const CUTOFF_MS=Date.parse('2026-09-22T03:45:00.000Z');
const STORE='fll-value-history-v2';
const MARKER='maintenance/idp-history-before-20260921-2345-et.json';

const json=(body,status=200)=>new Response(JSON.stringify(body,null,2),{
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
const isPre=t=>{
  const ms=Date.parse(String(t||''));
  return Number.isFinite(ms)&&ms<CUTOFF_MS;
};
const isIdp=row=>String(row?.pos||'').toUpperCase()==='IDP';

export default async req=>{
  try{
    if(req.method!=='GET')return json({error:'GET required'},405);

    const store=getStore(STORE,{consistency:'strong'});
    const marker=await store.get(MARKER,{type:'json'}).catch(()=>null);
    const listing=await store.list({prefix:'snapshots/'});
    const keys=(listing?.blobs||[]).map(x=>String(x?.key||'')).filter(Boolean);

    let snapshotsScanned=0;
    let preCutoffSnapshots=0;
    let postCutoffSnapshots=0;
    let remainingPreCutoffIdpRows=0;
    let preservedPreCutoffOffenseRows=0;
    let postCutoffIdpRows=0;
    let postCutoffOffenseRows=0;

    for(let i=0;i<keys.length;i+=25){
      const batch=keys.slice(i,i+25);
      const snaps=await Promise.all(batch.map(key=>store.get(key,{type:'json'}).catch(()=>null)));
      for(const snap of snaps){
        if(!snap?.t||!Array.isArray(snap.rows))continue;
        snapshotsScanned++;
        if(isPre(snap.t)){
          preCutoffSnapshots++;
          remainingPreCutoffIdpRows+=snap.rows.filter(isIdp).length;
          preservedPreCutoffOffenseRows+=snap.rows.filter(r=>!isIdp(r)).length;
        }else{
          postCutoffSnapshots++;
          postCutoffIdpRows+=snap.rows.filter(isIdp).length;
          postCutoffOffenseRows+=snap.rows.filter(r=>!isIdp(r)).length;
        }
      }
    }

    const ok=remainingPreCutoffIdpRows===0;
    return json({
      ok,
      cutoff_et:'2026-09-21 23:45:00 America/New_York',
      cutoff_utc:'2026-09-22T03:45:00.000Z',
      marker,
      snapshotsScanned,
      preCutoffSnapshots,
      postCutoffSnapshots,
      remainingPreCutoffIdpRows,
      preservedPreCutoffOffenseRows,
      postCutoffIdpRows,
      postCutoffOffenseRows
    },ok?200:409);
  }catch(e){
    console.error('idp-history-live-verify',e);
    return json({ok:false,error:String(e?.message||e)},500);
  }
};
