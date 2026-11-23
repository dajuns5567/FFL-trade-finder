/* FFL All-Time Highs verified read-only export.
 * Run from authenticated Ctrl+Alt+J on current Netlify Deploy Preview.
 * Never writes to Netlify, GitHub or league records. */
(async()=>{
  if(!/^deploy-preview-\d+--animated-dasik-3de74a\.netlify\.app$/.test(location.hostname)){
    console.error('Export is restricted to the current authorized FFL deploy preview.');
    return;
  }
  const response=await fetch('/.netlify/functions/league-hub?award_highs=1',
    {cache:'no-store',headers:{accept:'application/json'}});
  if(!response.ok)throw Error('All-Time Highs GET failed: '+response.status);
  const data=await response.json();
  if(!Array.isArray(data?.records)||data.records.length<500||
    Number(data?.sources?.blob)<500||
    Number(data.sources.blob)!==data.records.length||
    Number(data?.sources?.durable)!==0)
    throw Error('Export refused: expected verified Blob-only archive with >=500 records');
  const exportData={
    schema_version:1,
    source:'ffl-verified-netlify-blob-all-time-highs-readback',
    league_id:'1316867686394769408',
    preview_origin:location.origin,
    exported_at:new Date().toISOString(),
    record_count:data.records.length,
    source_counts:{blob:data.sources.blob,durable:data.sources.durable},
    records:data.records
  };
  const blob=new Blob([JSON.stringify(exportData,null,2)+'\n'],{type:'application/json'});
  const a=document.createElement('a'),u=URL.createObjectURL(blob);
  a.href=u;a.download='ffl-all-time-highs-verified-blob-export.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),30000);
  console.log('Downloaded original All-Time Highs records read-only:',data.records.length);
})().catch(error=>console.error('FFL verified All-Time Highs export refused:',error));
