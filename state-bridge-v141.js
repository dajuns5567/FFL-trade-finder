(()=>{
'use strict';
function syncState(){
 try{
  if(typeof state==='undefined'||!state)return null;
  window.state=state;
  for(const p of Object.values(state.players||{})){
   if(!p||p.team)return;
   const team=p.team_abbr||p.nfl_team||p.pro_team||'';
   if(team)p.team=String(team).toUpperCase();
  }
  return state;
 }catch(_){return window.state||null}
}
const priorRenderAll=typeof renderAll==='function'?renderAll:null;
if(priorRenderAll){
 renderAll=function(){syncState();return priorRenderAll.apply(this,arguments)};
 window.renderAll=renderAll;
}
syncState();
window.fllStateBridgeV141={syncState};
})();
