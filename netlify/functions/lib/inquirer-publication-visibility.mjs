// Read-only admission for a completed edition's public archive visibility.
// A status cursor alone is not proof that readers can discover the edition.
export function inspectInquirerPublicationVisibility({status,index,edition,awards,locked=false}={}){
 const season=Number(status?.season),week=Number(status?.week);
 if(status?.state!=='completed'||status?.available!==true||
    !Number.isInteger(season)||season<2026||!Number.isInteger(week)||week<1||week>18||
    (season===2026&&week<5))
  return{checked:false,visible:false,repair:false,reason:'No completed forward edition to reconcile'};
 const key='broadcasts/'+season+'/week-'+String(week).padStart(2,'0')+'.json';
 if(!locked||Number(edition?.season)!==season||Number(edition?.week)!==week)
  return{checked:true,visible:false,repair:false,reason:'Completed cursor has no verified locked newspaper'};
 const record=(Array.isArray(awards?.records)?awards.records:[])
  .find(x=>Number(x?.season)===season&&Number(x?.week)===week);
 const awardReady=!!record?.players_of_week?.offense?.player_id&&
  !!record?.players_of_week?.defense?.player_id&&
  Array.isArray(record?.manager_awards)&&
  ['highest-scorer','lowest-scorer'].every(type=>record.manager_awards.some(x=>x?.type===type))&&
  record.newsroom_engine==='v31-forward'&&Number(record.newsroom_editorial_revision)>=39;
 if(!awardReady)return{checked:true,visible:false,repair:false,reason:'Completed newspaper lacks verified weekly awards'};
 if(!Array.isArray(index))return{checked:true,visible:false,repair:false,reason:'Public archive index unreadable'};
 const matching=index.filter(x=>Number(x?.season)===season&&Number(x?.week)===week);
 if(matching.length>1||matching.some(x=>x?.key!==key))
  return{checked:true,visible:false,repair:false,reason:'Public archive index has duplicate or conflicting week entries'};
 if(matching.length===1)return{checked:true,visible:true,repair:false,reason:'Completed edition is discoverable in the public archive'};
 return{checked:true,visible:false,repair:true,reason:'Verified locked newspaper and awards exist, but the public archive index omits this week'};
}
