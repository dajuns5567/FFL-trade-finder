import { getStore } from '@netlify/blobs';

const CUTOFF_MS = Date.parse('2026-09-22T03:45:00.000Z');
const STORE = 'fll-value-history-v2';
const CONFIRM = 'delete-idp-before-20260921-2345-et';
const MARKER = 'maintenance/idp-history-before-20260921-2345-et.json';

const json=(body,status=200)=>new Response(JSON.stringify(body,null,2),{
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
const isPre=t=>{
  const ms=Date.parse(String(t||''));
  return Number.isFinite(ms)&&ms<CUTOFF_MS;
};
const isIdp=row=>String(row?.pos||'').toUpperCase()==='IDP';

function fingerprint(rows,picks=[],teams=[]){
  let h=2166136261;
  for(const r of rows){
    const x=`${r.id}:${r.value}:${r.overall}:${r.posRank}|`;
    for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}
  }
  for(const p of picks){
    const x=`P:${p.id}:${p.value}:${p.season}:${p.round}:${p.original_owner}|`;
    for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}
  }
  for(const t of teams){
    const x=`T:${t.id}:${t.value}:${t.player_count}|`;
    for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}
  }
  return (h>>>0).toString(36);
}

export default async req=>{
  try{
    if(!['GET','POST'].includes(req.method))return json({error:'GET or POST required'},405);
    const url=new URL(req.url);
    if(url.searchParams.get('confirm')!==CONFIRM)return json({error:'confirmation required'},400);

    const store=getStore(STORE,{consistency:'strong'});
    const prior=await store.get(MARKER,{type:'json'}).catch(()=>null);
    if(prior?.done===true)return json({ok:true,alreadyDone:true,...prior});

    const listing=await store.list({prefix:'snapshots/'});
    const keys=(listing?.blobs||[]).map(x=>String(x?.key||'')).filter(Boolean);
    const report={
      done:false,
      cutoff_et:'2026-09-21 23:45:00 America/New_York',
      cutoff_utc:'2026-09-22T03:45:00.000Z',
      snapshotsScanned:0,
      preCutoffSnapshots:0,
      postCutoffSnapshots:0,
      snapshotsChanged:0,
      idpRowsRemoved:0,
      offenseRowsBefore:0,
      offenseRowsAfter:0
    };

    const touched=new Map();
    for(let i=0;i<keys.length;i+=25){
      const batch=keys.slice(i,i+25);
      const snaps=await Promise.all(batch.map(key=>store.get(key,{type:'json'}).catch(()=>null)));
      for(let j=0;j<snaps.length;j++){
        const snap=snaps[j],key=batch[j];
        if(!snap?.t||!Array.isArray(snap.rows))continue;
        report.snapshotsScanned++;
        if(!isPre(snap.t)){report.postCutoffSnapshots++;continue}
        report.preCutoffSnapshots++;
        const offense=snap.rows.filter(r=>!isIdp(r));
        const removed=snap.rows.length-offense.length;
        report.offenseRowsBefore+=offense.length;
        if(removed>0){
          const updated={...snap,rows:offense,fingerprint:fingerprint(offense,snap.picks||[],snap.teams||[])};
          await store.setJSON(key,updated);
          touched.set(key,updated);
          report.snapshotsChanged++;
          report.idpRowsRemoved+=removed;
        }
        report.offenseRowsAfter+=offense.length;
      }
    }

    if(report.offenseRowsBefore!==report.offenseRowsAfter){
      throw new Error(`offense preservation failed: ${report.offenseRowsBefore} -> ${report.offenseRowsAfter}`);
    }

    const latest=await store.get('latest.json',{type:'json'}).catch(()=>null);
    if(latest?.key&&isPre(latest.t)){
      const snap=touched.get(String(latest.key))||await store.get(String(latest.key),{type:'json'}).catch(()=>null);
      if(snap?.t&&Array.isArray(snap.rows)){
        await store.setJSON('latest.json',{
          ...latest,
          fingerprint:snap.fingerprint||fingerprint(snap.rows,snap.picks||[],snap.teams||[]),
          count:snap.rows.length
        });
      }
    }

    let remainingPreCutoffIdpRows=0,verifiedOffenseRows=0,verifiedPreCutoffSnapshots=0;
    for(let i=0;i<keys.length;i+=25){
      const batch=keys.slice(i,i+25);
      const snaps=await Promise.all(batch.map(key=>store.get(key,{type:'json'}).catch(()=>null)));
      for(const snap of snaps){
        if(!snap?.t||!Array.isArray(snap.rows)||!isPre(snap.t))continue;
        verifiedPreCutoffSnapshots++;
        remainingPreCutoffIdpRows+=snap.rows.filter(isIdp).length;
        verifiedOffenseRows+=snap.rows.filter(r=>!isIdp(r)).length;
      }
    }

    report.verifiedPreCutoffSnapshots=verifiedPreCutoffSnapshots;
    report.remainingPreCutoffIdpRows=remainingPreCutoffIdpRows;
    report.verifiedOffenseRows=verifiedOffenseRows;
    if(remainingPreCutoffIdpRows!==0)throw new Error(`verification found ${remainingPreCutoffIdpRows} pre-cutoff IDP rows`);
    if(verifiedOffenseRows!==report.offenseRowsBefore)throw new Error('offense verification count changed');

    const marker={...report,done:true,completedAt:new Date().toISOString()};
    await store.setJSON(MARKER,marker);
    return json({ok:true,...marker});
  }catch(e){
    console.error('idp-history-live-scrub',e);
    return json({ok:false,error:String(e?.message||e)},500);
  }
};
