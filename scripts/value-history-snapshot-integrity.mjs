// Read-only chronological integrity guard for archival Value History data.
// Never edits player values or historical observations. Fail closed only
// when a cohort of large changes reverses to its previous state in hours.
// A legitimate new valuation curve or injury update that does NOT reverse
// remains fully eligible for archiving.
export function inspectShortTermSnapback(prior,intermediate,candidate,{maxHours=18,minSwing=75,minAffected=6,ratio=.005}={}){
 const t=[prior,intermediate,candidate].map(x=>Date.parse(x?.t||''));
 if(t.some(x=>!Number.isFinite(x))||!(t[0]<t[1]&&t[1]<t[2])||t[1]-t[0]>maxHours*3600000||t[2]-t[1]>maxHours*3600000)
  return{ok:true,reason:'outside-comparable-short-window',affected:0,comparable:0};
 const a=new Map((prior.rows||[]).map(r=>[String(r.id),Number(r.value)])),
       b=new Map((intermediate.rows||[]).map(r=>[String(r.id),Number(r.value)]));
 let comparable=0;const reversed=[];
 for(const r of candidate.rows||[]){
  const id=String(r?.id||''),x=a.get(id),y=b.get(id),z=Number(r.value);
  if(![x,y,z].every(Number.isFinite))continue;
  comparable++;
  const delta=y-x,back=z-y,scale=Math.max(Math.abs(delta),Math.abs(back));
  if(delta*back<0&&Math.min(Math.abs(delta),Math.abs(back))>=minSwing&&
      Math.abs(z-x)<=Math.max(50,.30*scale))
   reversed.push({id,prior:x,intermediate:y,candidate:z});
 }
 const limit=Math.max(minAffected,Math.ceil(comparable*ratio));
 return{ok:reversed.length<limit,reason:reversed.length>=limit?'cohort-snapback':'normal-movement',
  affected:reversed.length,comparable,threshold:limit,examples:reversed.slice(0,12)};
}
