// Guards the durable archive against one-off, market-wide valuation swings.
// A candidate is quarantined for one cycle, then automatically admitted only
// if an independent scheduled capture corroborates its new baseline.
const POSITIONS=['QB','RB','WR','TE','IDP'];
function median(values){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
export function summarizeDrift(previousRows=[],nextRows=[]){
 const old=new Map(previousRows.filter(r=>r?.id!=null&&Number(r.value)>0).map(r=>[String(r.id),r]));
 const rows=nextRows.filter(r=>r?.id!=null&&old.has(String(r.id)));
 const groups={};let largeGroups=[];
 for(const pos of POSITIONS){
  const changes=rows.filter(r=>r.pos===pos&&old.get(String(r.id))?.pos===pos).map(r=>(Number(r.value)-Number(old.get(String(r.id)).value))/Number(old.get(String(r.id)).value)).filter(Number.isFinite);
  const med=median(changes),share5=changes.length?changes.filter(x=>Math.abs(x)>.05).length/changes.length:0;
  const share10=changes.length?changes.filter(x=>Math.abs(x)>.10).length/changes.length:0;
  const share2_5=changes.length?changes.filter(x=>Math.abs(x)>=.025).length/changes.length:0;
  groups[pos]={count:changes.length,medianPct:Number((med*100).toFixed(2)),share5:Number(share5.toFixed(4)),share2_5:Number(share2_5.toFixed(4)),share10:Number(share10.toFixed(4))};
  if(changes.length>=40&&Math.abs(med)>=.025&&(share5>=.30||share2_5>=.70))largeGroups.push({pos,direction:Math.sign(med)});
 }
 const rising=largeGroups.filter(g=>g.direction>0).length,falling=largeGroups.filter(g=>g.direction<0).length;
 const idp=groups.IDP;
 const broad=(rising>=3||falling>=3);
 const idpShock=idp.count>=100&&idp.share10>=.40;
 const shared=rows.length,coverage=Math.max(previousRows.length,nextRows.length)>0?shared/Math.max(previousRows.length,nextRows.length):0;
 const populationShock=previousRows.length>=700&&nextRows.length>=100&&coverage<.90;
 const flagged=populationShock||(shared>=500&&(broad||idpShock));
 return{flagged,reason:flagged?(populationShock?'population-coverage-collapse':idpShock?'idp-population-shock':'multi-position-coherent-shift'):null,shared,coverage:Number(coverage.toFixed(4)),groups};
}
export function corroboratesPending(pendingRows=[],candidateRows=[]){
 const old=new Map(pendingRows.filter(r=>r?.id!=null&&Number(r.value)>0).map(r=>[String(r.id),r]));
 const comparisons=candidateRows.filter(r=>old.has(String(r?.id))&&old.get(String(r.id)).pos===r.pos).map(r=>Math.abs(Number(r.value)-Number(old.get(String(r.id)).value))/Number(old.get(String(r.id)).value)).filter(Number.isFinite);
 const coverage=comparisons.length/Math.max(1,Math.max(pendingRows.length,candidateRows.length));
 return comparisons.length>=500&&coverage>=.95&&median(comparisons)<=.012&&comparisons.filter(x=>x>.03).length/comparisons.length<=.15;
}

/**
 * Pure decision boundary: no GitHub writes until source freshness, monotonicity
 * and independent corroboration have been established. A pending candidate is
 * only eligible when it was created from the *same* archived baseline and the
 * new capture was made later, under the same valuation contract.
 */
export function scheduledArchiveDecision(previous,candidate,pending=null){
 const drift=summarizeDrift(previous?.rows||[],candidate?.rows||[]);
 const nextTime=Date.parse(candidate?.t||'');
 const priorTime=Date.parse(previous?.t||'');
 const pendingTime=Date.parse(pending?.capturedAt||'');
 const pendingValid=!!pending&&pending.schema_version===1&&
   pending.previous===previous?.t&&
   pending.valuation_contract===candidate?.valuation_contract&&
   Number.isFinite(pendingTime)&&Number.isFinite(nextTime)&&pendingTime>priorTime&&nextTime>pendingTime&&
   Array.isArray(pending.rows)&&pending.rows.length>=700;
 const corroborated=drift.flagged&&drift.reason!=='population-coverage-collapse'&&pendingValid&&corroboratesPending(pending.rows,candidate.rows);
 return {
   action:drift.flagged?(corroborated?'archive-confirmed':'quarantine'):'archive',
   drift,corroborated:!!corroborated,
   previousPendingValid:!!pendingValid,
   pendingStale:!!pending&&!pendingValid
 };
}
