(()=>{
const priorPickValue90=pickValue;
const priorProjection90=window.draftPickProjection86;
function blendedSlot90(x){
  const base=typeof priorProjection90==='function'?priorProjection90(x):null;
  const oldSlot=Number(base?.projectedSlot)||16;
  const mode=String(base?.mode||'');
  if(mode==='pre-week-1'||mode.startsWith('final-'))return oldSlot;
  const rid=Number(base?.originalRoster)||0,z=window.teamContextOutlook90?.(rid);
  if(!z||!Number.isFinite(Number(z.rank)))return oldSlot;
  const projectionSlot=33-Number(z.rank);
  return Math.max(1,Math.min(32,Math.round(oldSlot*.75+projectionSlot*.25)));
}
function curve90(round,slot){const curves={1:[[1,4200],[4,3600],[8,3000],[16,2300],[24,1700],[32,1300]],2:[[1,1200],[8,1000],[16,800],[24,640],[32,500]],3:[[1,450],[8,380],[16,300],[24,235],[32,175]]},a=curves[Number(round)];if(!a)return 60;const s=Math.max(1,Math.min(32,Number(slot)||16));for(let i=1;i<a.length;i++){if(s<=a[i][0]){const[x1,y1]=a[i-1],[x2,y2]=a[i],t=(s-x1)/(x2-x1);return y1+(y2-y1)*t}}return a[a.length-1][1]}
pickValue=function(x){
  if(!x||x.type!=='pick')return priorPickValue90(x);
  const base=typeof priorProjection90==='function'?priorProjection90(x):null;
  if(!base||base.mode==='pre-week-1'||String(base.mode||'').startsWith('final-')||!window.teamContextOutlook90?.(Number(base.originalRoster)))return priorPickValue90(x);
  const r=Number(x.round)||1,y=Number(x.season)||Number(base.targetDraftYear)||2027,baseYear=Number(base.targetDraftYear)||y,slot=blendedSlot90(x),discount=Math.pow(.90,Math.max(0,y-baseYear));let value=curve90(r,slot)*discount;if(y===2027&&r===1)value*=1.03;return Math.max(10,Math.round(value/5)*5);
};
window.draftPickProjection90=x=>{const base=typeof priorProjection90==='function'?priorProjection90(x):{};const slot=blendedSlot90(x),z=window.teamContextOutlook90?.(Number(base?.originalRoster));return{...base,projectedSlot:slot,value:pickValue(x),projectionContextUsed:Boolean(z&&base?.mode!=='pre-week-1'&&!String(base?.mode||'').startsWith('final-')),projectionWeight:z?.rank?0.25:0,projectionSourceDate:window.teamContext90?.sourceDate||null,projectionTeamRank:z?.rank||null,source:z?`${base?.source||''} + 25% live projection outlook`:(base?.source||null)}};
})();
