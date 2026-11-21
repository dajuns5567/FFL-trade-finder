import {getStore} from '@netlify/blobs';
import {privatePreviewStoreName} from './inquirer-preview-diagnostics.mjs';
import {FORWARD_EDITORIAL_REVISION} from '../inquirer-editorial-v31.mjs';

// A source hostname identifies the approved manuscript's original *name*;
// Netlify site-wide Blob storage does not follow a hostname to a former site.
// This check is read-only and must run before a cutover is queued.
export const CUTOVER_SOURCE_PREVIEW='https://deploy-preview-427--precious-dango-fb4633.netlify.app';
export const sourceDraftKey=week=>'2026/week-'+String(week).padStart(2,'0')+
 '/editorial-r'+FORWARD_EDITORIAL_REVISION+'/edition.json';

export async function checkApprovedCutoverSource({store,revision=FORWARD_EDITORIAL_REVISION}={}){
 if(!store?.get)return{ready:false,reason:'No destination-site source store'};
 const issues=[];
 for(const week of [7,8]){
  const key='2026/week-'+String(week).padStart(2,'0')+'/editorial-r'+revision+'/edition.json';
  let draft;
  try{draft=await store.get(key,{type:'json'})}
  catch{issues.push('Week '+week+' private source could not be read');continue}
  if(!draft){issues.push('Week '+week+' approved private manuscript not transferred');continue}
  if(Number(draft.season)!==2026||Number(draft.week)!==week||
     draft.preview_only!==true||draft.published_locked!==false||
     Number(draft.editorial_revision)!==revision||
     !Array.isArray(draft.teams)||draft.teams.length!==32||
     !draft.league_overview?.headline||
     draft.preview_editorial_audit?.ok!==true||
     draft.preview_generation_quality?.ok!==true){
   issues.push('Week '+week+' transferred manuscript fails private editorial identity/quality checks');
  }
 }
 return issues.length?{ready:false,reason:issues.join('; ')}:{ready:true,reason:'Both Week 7–8 private source manuscripts present in destination site storage'};
}
export async function approvedCutoverSourceReadiness(){
 const name=privatePreviewStoreName(CUTOVER_SOURCE_PREVIEW);
 if(!name)return{ready:false,reason:'Approved private source store identifier unavailable'};
 try{return await checkApprovedCutoverSource({store:getStore({name,consistency:'strong'})})}
 catch{return{ready:false,reason:'Destination-site private source store unavailable'}}
}
