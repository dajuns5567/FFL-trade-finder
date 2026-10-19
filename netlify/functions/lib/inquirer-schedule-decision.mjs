// Pure decision boundary for the scheduled Inquirer poll. It deliberately
// makes no publication decision: the background job performs the authoritative
// matchup, roster-record and editorial checks.
export function inquirerScheduleDecision({status,nfl,revision,now=Date.now()}={}){
 const stateWeek=Number(nfl?.week),season=Number(nfl?.season);
 if(!Number.isInteger(stateWeek)||stateWeek<2||!Number.isInteger(season)||season<2026)
  return{queue:false,reason:'No prior NFL week has been completed for this season'};
 const finishedWeek=stateWeek-1;
 const same=Number(status?.week)===finishedWeek&&Number(status?.season)===season;
 if(status?.state==='running'&&now-Date.parse(status.started_at||0)<16*60*1000)
  return{queue:false,reason:'A background publication is already running'};
 if(same&&Number(status?.editorial_revision)===Number(revision)){
  if(status.state==='editorial-hold')return{queue:false,reason:'Unchanged editorial draft is held; new revision or completed week required'};
  if(status.state==='completed'&&status.available===true)return{queue:false,reason:'Current completed week is already published'};
 }
 return{queue:true,season,finishedWeek};
}
