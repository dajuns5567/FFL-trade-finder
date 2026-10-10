import assert from 'node:assert/strict';
import preload from '../netlify/functions/inquirer-week4-2026-preload.mjs';
import snapshotLoader from '../netlify/functions/inquirer-week4-2026-projections.mjs';
import {rebuildWeek4Editorial} from '../netlify/functions/inquirer-week4-editorial-rebuild.mjs';
const source=preload(),snap=snapshotLoader(),w=rebuildWeek4Editorial(source);
assert.equal(w.teams.length,32);
assert.equal(snap.scoring_keys,143);
assert.equal(snap.verified_pregame,false);
assert.equal(w.league_overview.sections[0].blocks.length,6,'Preserve six-theme recap');
let total=0,covered=0,full=0,partial=0;
for(const t of w.teams){
 const detail=t.starter_details||[],known=detail.filter(p=>p.projected!==null&&Number.isFinite(p.projected)),sum=known.reduce((n,p)=>n+p.projected,0);
 assert(t.projection_snapshot?.retrieved_at,'Every Week 4 team must identify projection retrieval time');
 assert.equal(t.projection_snapshot?.verified_pregame,false,'Do not claim pregame verification');
 assert.equal(t.projection_coverage,known.length,'Count only projections actually present');
 assert.equal(t.starter_count,detail.length);
 total+=detail.length;covered+=known.length;
 if(known.length===detail.length&&detail.length){
  full++;assert.equal(t.projected,Number(sum.toFixed(2)),'Team total must reconcile to starter values');
 }else{partial++;assert.equal(t.projected,null,'Do not zero-fill a partial projection');}
}
assert.equal(total,223,'Expected accepted Week 4 starter census');
assert.equal(covered,210,'Recovered points should cover 210 of 223 starters');
assert.equal(full,24,'Only fully projected teams may receive a total');
assert.equal(partial,8,'Preserve partial-coverage disclosure for eight teams');
console.log('WEEK4_PROJECTION_SNAPSHOT_ACCEPTED',JSON.stringify({teams:32,scoring_keys:snap.scoring_keys,starters:total,projected_starters:covered,complete_teams:full,partial_teams:partial,source:snap.source,retrieved_at:snap.retrieved_at,pregame_verified:snap.verified_pregame}));
