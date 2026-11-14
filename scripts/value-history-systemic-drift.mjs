// Observe significant market changes without delaying real player valuations.
// Only verifiable snapshot-integrity failures may block archival.
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
// Fail only on concrete corruption or material loss of the previously tracked population.
// Rank moves, price magnitudes and synchronized shifts are NEVER rejection criteria.
export function scheduledArchiveDecision(previous,candidate){
 const drift=summarizeDrift(previous?.rows||[],candidate?.rows||[]);
 const rows=Array.isArray(candidate?.rows)?candidate.rows:[];
 const prior=Array.isArray(previous?.rows)?previous.rows:[];
 const identities=new Set();
 const invalid=rows.some(r=>{
  const id=String(r?.id??'').trim();
  const value=Number(r?.value);
  if(!id||!Number.isFinite(value)||value<=0||identities.has(id))return true;
  identities.add(id);
  return false;
 });
 const priorIds=new Set(prior.map(r=>String(r?.id??'')));
 const retained=rows.filter(r=>priorIds.has(String(r?.id??''))).length;
 const retention=priorIds.size?retained/priorIds.size:1;
 const incomplete=priorIds.size>=700&&retention<.90;
 const integrityReason=invalid?'invalid-or-duplicate-player-row':incomplete?'population-coverage-collapse':null;
 return {
  action:integrityReason?'quarantine':'archive',
  integrityReason,
  retained,retention:Number(retention.toFixed(4)),
  // Informational only: never gates an otherwise valid market movement.
  drift,marketMovementObserved:!!(drift.flagged&&drift.reason!=='population-coverage-collapse')
 };
}
