// Pure continuity evaluation with a separately monitored durable archive.
export function assessArchiveContinuity({archiveLatest,productionLatest,now=Date.now(),maxAgeHours=8}){
 const archiveTime=Date.parse(String(archiveLatest||''));
 if(!Number.isFinite(archiveTime)||archiveTime>now)throw Error('CONTINUITY_INTEGRITY: invalid durable archive timestamp');
 const durableAgeHours=(now-archiveTime)/3600000;
 if(durableAgeHours>maxAgeHours)throw Error('DURABLE ARCHIVE STALE: latest durable snapshot '+durableAgeHours.toFixed(2)+' hours old');
 const productionTime=productionLatest?Date.parse(String(productionLatest)):NaN;
 if(productionLatest&&!Number.isFinite(productionTime))throw Error('CONTINUITY_INTEGRITY: invalid upstream snapshot timestamp');
 if(Number.isFinite(productionTime)&&productionTime>now)throw Error('CONTINUITY_INTEGRITY: upstream snapshot is in future');
 if(Number.isFinite(productionTime)&&productionTime>archiveTime)throw Error('CONTINUITY PENDING: production Blob source is ahead of durable GitHub history');
 return {durableAgeHours,productionAgeHours:Number.isFinite(productionTime)?(now-productionTime)/3600000:null,productionBufferFresh:Number.isFinite(productionTime)&&(now-productionTime)/3600000<=maxAgeHours};
}
