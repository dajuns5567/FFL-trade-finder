// Fail-closed, complete Netlify Blob snapshot inventory. No writes.
export async function readSnapshotInventory(live, validSnapshot, {maxPages=10000, batchSize=25}={}) {
  const keys=[];
  let cursor;
  const seenCursors=new Set();
  for(let page=0;page<maxPages;page++){
    const listing=await live.list({prefix:'snapshots/',...(cursor?{cursor}:{})});
    if(!listing||!Array.isArray(listing.blobs))throw Error('ARCHIVE_INTEGRITY: invalid snapshot listing page');
    keys.push(...listing.blobs.map(x=>String(x?.key||'')).filter(Boolean));
    const next=String(listing.cursor||'');
    if(!next){cursor=null;break}
    if(seenCursors.has(next))throw Error('ARCHIVE_INTEGRITY: repeated snapshot cursor');
    seenCursors.add(next);cursor=next;
  }
  if(cursor)throw Error('ARCHIVE_INTEGRITY: snapshot listing exceeded page limit');
  const uniqueKeys=[...new Set(keys)].sort(), snapshots=[];
  for(let i=0;i<uniqueKeys.length;i+=batchSize){
    const batch=uniqueKeys.slice(i,i+batchSize);
    const rows=await Promise.all(batch.map(async key=>{
      let item;
      try{item=await live.get(key,{type:'json'})}
      catch(e){throw Error('ARCHIVE_INTEGRITY: unreadable listed snapshot: '+key,{cause:e})}
      if(item===null||item===undefined)throw Error('ARCHIVE_INTEGRITY: missing listed snapshot: '+key);
      return item;
    }));
    for(const row of rows)if(validSnapshot(row))snapshots.push(row);
  }
  snapshots.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  return snapshots;
}
