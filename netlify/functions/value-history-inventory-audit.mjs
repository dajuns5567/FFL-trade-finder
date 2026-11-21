// Read-only inventory comparison. No snapshot reads, storage mutations or
// inferred values. Timestamp equality alone never proves identical contents.
const validTime=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))&&new Date(t).toISOString()===t;
const normalized=(items,kind)=>{
  const rows=new Map(),duplicates=[],invalid=[];
  for(const item of items||[]){
    const t=String(item?.t||'');
    if(!validTime(t)){invalid.push({t:t.slice(0,80)});continue}
    const row={
      t,source:kind,
      fingerprint:String(item?.fingerprint||'')||null,
      count:Number.isInteger(Number(item?.count))&&Number(item?.count)>0?Number(item.count):null,
      valuation_model:String(item?.valuation_model||'')||null,
      valuation_contract:String(item?.valuation_contract||'')||null
    };
    const old=rows.get(t);
    if(old){
      duplicates.push(t);
      if(old.fingerprint&&row.fingerprint&&old.fingerprint!==row.fingerprint)old.duplicate_conflict=true;
    }else rows.set(t,row);
  }
  return{rows,duplicates,invalid};
};
export function reconcileSnapshotInventories(archiveItems,localItems,{archiveReachable=true,localReachable=true,limit=100}={}){
  const archive=normalized(archiveItems,'github'),local=normalized(localItems,'netlify');
  const a=archive.rows,b=local.rows,union=new Set([...a.keys(),...b.keys()]);
  const archiveOnly=[...a.keys()].filter(t=>!b.has(t)).sort();
  const localOnly=[...b.keys()].filter(t=>!a.has(t)).sort();
  const overlaps=[...a.keys()].filter(t=>b.has(t)).sort();
  const conflicts=[],unchecked=[];
  for(const t of overlaps){
    const x=a.get(t),y=b.get(t);
    if(x.fingerprint&&y.fingerprint&&x.fingerprint!==y.fingerprint||
       x.count!=null&&y.count!=null&&x.count!==y.count||
       x.duplicate_conflict||y.duplicate_conflict){
      conflicts.push({t,github_fingerprint:x.fingerprint,netlify_fingerprint:y.fingerprint,
        github_count:x.count,netlify_count:y.count});
    }else if(!x.fingerprint||!y.fingerprint)unchecked.push(t);
  }
  const n=Math.max(1,Math.min(500,Math.trunc(Number(limit)||100)));
  return{
    read_only:true,complete:!!(archiveReachable&&localReachable),
    archive_reachable:!!archiveReachable,netlify_reachable:!!localReachable,
    github_count:a.size,netlify_count:b.size,union_count:union.size,
    overlap_count:overlaps.length,github_only_count:archiveOnly.length,
    netlify_only_count:localOnly.length,conflict_count:conflicts.length,
    overlap_unverifiable_count:unchecked.length,
    invalid_count:{github:archive.invalid.length,netlify:local.invalid.length},
    duplicate_count:{github:archive.duplicates.length,netlify:local.duplicates.length},
    github_latest:[...a.keys()].sort().at(-1)||null,
    netlify_latest:[...b.keys()].sort().at(-1)||null,
    union_latest:[...union].sort().at(-1)||null,
    github_only:archiveOnly.slice(-n).map(t=>a.get(t)),
    netlify_only:localOnly.slice(-n).map(t=>b.get(t)),
    conflicts:conflicts.slice(-n),
    overlap_unverifiable_sample:unchecked.slice(-Math.min(n,20)),
    truncated:{github_only:archiveOnly.length>n,netlify_only:localOnly.length>n,conflicts:conflicts.length>n},
    interpretation:'Separate indexed observations only. Unknown fingerprints do not establish equality; no missing, invalid, or conflicting snapshot may be backfilled automatically.'
  };
}
