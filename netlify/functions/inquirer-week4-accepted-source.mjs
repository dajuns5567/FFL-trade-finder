// Loads the accepted Week 4 writing reference without changing publication storage.
// The original archive predates the published_locked field. Trust it only if
// its raw bytes exactly match the independently recovered signed archival export.
import {createHash} from 'node:crypto';
import {verifyWeeklyEditorialSource} from './inquirer-week4-batch.mjs';
const trustedOriginalSha='038248bef97fd7bfd2bdece6df9c3a538cac9c29ae1bb34487458927c129022c';
const originalKey='inquirer/recovery-originals/2026/week-04.json';
export async function loadAcceptedWeek4(store){
 const live=await store.get('broadcasts/2026/week-04.json',{type:'json'}).catch(()=>null);
 if(live?.published_locked===true&&Number(live.week)===4&&verifyWeeklyEditorialSource(live).ok)
   return{edition:live,source:'verified_locked_broadcast'};
 const raw=await store.get(originalKey,{type:'text'}).catch(()=>null);
 if(typeof raw!=='string'||createHash('sha256').update(raw).digest('hex')!==trustedOriginalSha)
   return{edition:null,source:'trusted_original_not_staged'};
 let original;try{original=JSON.parse(raw)}catch{return{edition:null,source:'archive_json_invalid'}};
 if(Number(original.week)!==4||Number(original.season)!==2026||original.available!==true||
   !verifyWeeklyEditorialSource(original).ok||
   !Array.isArray(original.league_overview?.sections)||original.league_overview.sections.length<4)
   return{edition:null,source:'archive_validation_failed'};
 // Runtime compatibility flag only. Original JSON stored in quarantine remains byte-identical.
 return{edition:{...original,published_locked:true},source:'sha256_pinned_original_archive'};
}
