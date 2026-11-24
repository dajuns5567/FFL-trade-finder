// KTC is a reduced-weight dynasty consensus source. If its public feed refuses
// a server-side request, carry forward only the previously VERIFIED snapshot,
// and only for a short window. Never manufacture or silently refresh its ranks.
const MAX_KTC_LKG_AGE_MS=7*24*60*60*1000;
const OFFENSE=new Set(["QB","RB","WR","TE"]);
export function reuseVerifiedKtc(refresh,previous,now=new Date().toISOString()){
 const results=refresh?.results;
 if(!Array.isArray(results)||results.length!==7)return null;
 const failed=results.filter(r=>r?.valid!==true);
 if(failed.length!==1||failed[0]?.id!=="ktc")return null;
 const old=previous?.sources?.KTC;
 const oldManifest=previous?.sourceManifest?.find(x=>x?.source==="KTC");
 if(!old||old.kind!=="offense"||old.reducedWeight!==true||!oldManifest)return null;
 if(!["fresh","last-known-good"].includes(oldManifest.status))return null;
 const priorDate=Date.parse(old.updated);
 const at=Date.parse(now);
 if(!Number.isFinite(priorDate)||!Number.isFinite(at)||at<priorDate||
   at-priorDate>MAX_KTC_LKG_AGE_MS)return null;
 const entries=Object.entries(old.data||{});
 if(entries.length<300||entries.length>500)return null;
 const rankSet=new Set(),nameSet=new Set(),rankings=[];
 for(const [player,sourceRank] of entries){
  const rank=Number(sourceRank),name=String(player).trim();
  if(!name||!Number.isInteger(rank)||rank<1||rank>500||
     rankSet.has(rank)||nameSet.has(name.toLowerCase()))return null;
  nameSet.add(name.toLowerCase());rankSet.add(rank);
  // The persisted rank map has no player positions: leave position unset.
  // The composite's canonical/ownership matching handles ambiguous names.
  rankings.push({rank,player:name});
 }
 rankings.sort((a,b)=>a.rank-b.rank);
 const result={
  ...failed[0],valid:true,status:"last-known-good",rankings,
  ranking_rows:rankings.length,players_extracted:rankings.length,
  timestamp:old.updated,reducedWeight:true,format:"dynasty-superflex",
  error:null,stage:"retained",source:"KTC",id:"ktc"
 };
 return {
  refresh:{...refresh,results:results.map(r=>r.id==="ktc"?result:r)},
  snapshotTimestamp:old.updated,
  sourceRows:rankings.length,
  failedAttempt:failed[0]
 };
}
