import test from 'node:test';
import assert from 'node:assert/strict';
import {hasCompleteWeekFeaturePackage} from '../netlify/functions/inquirer-publish-background.mjs';
function fixture(){
 const teams=Array.from({length:32},(_,i)=>({roster_id:String(i+1),points:100+i,opponent_points:100+i+(i%2===0?10:-10),won:i%2===1,projected:120,opponent_projected:110}));
 const report={season:2026,week:5,available:true,published_locked:true,teams};
 const awards={records:[{season:2026,week:5,newsroom_editorial_revision:39,newsroom_engine:'v31-forward',
 players_of_week:{offense:{player_id:'offense'},defense:{player_id:'idp'}},
 manager_awards:[
  {type:'highest-scorer',roster_id:'32'},
  {type:'lowest-scorer',roster_id:'1'},
  {type:'hot-seat',roster_id:'31'},
  {type:'cool-throne',roster_id:'2'}]}]};
 return{report,awards};
}
test('Week5 complete package requires four matching awards, scored offense and IDP',()=>{
 const {report,awards}=fixture();
 assert.equal(hasCompleteWeekFeaturePackage(report,awards),true);
 for(const kind of ['hot-seat','cool-throne','highest-scorer','lowest-scorer']){
  const broken=structuredClone(awards);
  broken.records[0].manager_awards=broken.records[0].manager_awards.filter(a=>a.type!==kind);
  assert.equal(hasCompleteWeekFeaturePackage(report,broken),false,kind);
 }
});
test('incorrect badge winner, legacy cache and article count fail safely',()=>{
 const {report,awards}=fixture();
 const wrong=structuredClone(awards);
 wrong.records[0].manager_awards[2].roster_id='15';
 assert.equal(hasCompleteWeekFeaturePackage(report,wrong),false);
 const stale=structuredClone(awards);stale.records[0].newsroom_editorial_revision=14;
 assert.equal(hasCompleteWeekFeaturePackage(report,stale),false);
 const short=structuredClone(report);short.teams.pop();
 assert.equal(hasCompleteWeekFeaturePackage(short,awards),false);
});
test('a nonexistent projected upset does not require a phantom hot-seat badge',()=>{
 const {report,awards}=fixture();
 report.teams.forEach(t=>{t.projected=90;t.opponent_projected=110});
 awards.records[0].manager_awards=awards.records[0].manager_awards.filter(a=>a.type!=='hot-seat');
 assert.equal(hasCompleteWeekFeaturePackage(report,awards),true);
});
