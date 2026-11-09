// Draft-pick ORDER only. Never used to compute an asset's dynasty value.
// Strongest record and most points-for each rank #1; weakest combined team
// gets the earliest projected draft selection (1.01).
export const PICK_ORDER_CUTOVER_UTC='2026-09-25T04:00:00.000Z'; // Sep 25, midnight ET
export function rank5050(rows){
  if(!Array.isArray(rows)||rows.length!==32)throw Error('pick ranks require exactly 32 teams');
  const seen=new Set();
  const teams=rows.map(row=>{
    const id=Number(row.id),wins=Number(row.wins),losses=Number(row.losses),ties=Number(row.ties||0),pf=Number(row.pf);
    if(!Number.isInteger(id)||id<1||seen.has(id)||![wins,losses,ties,pf].every(Number.isFinite)||wins<0||losses<0||ties<0||pf<0)throw Error('invalid 32-team standings');
    seen.add(id);
    const games=wins+losses+ties;
    if(!Number.isInteger(games)||!games)throw Error('unverified completed-week standings');
    return{id,wins,losses,ties,pf,record:(wins+ties*.5)/games,games};
  });
  const games=teams[0].games;
  if(teams.some(t=>t.games!==games))throw Error('different completed games across league');
  function ranks(key){
    const sorted=[...teams].sort((a,b)=>b[key]-a[key]||a.id-b.id),out=new Map();
    for(let i=0;i<sorted.length;){let j=i+1;while(j<sorted.length&&Math.abs(sorted[i][key]-sorted[j][key])<1e-8)j++;const rank=(i+1+j)/2;for(let k=i;k<j;k++)out.set(sorted[k].id,rank);i=j}
    return out;
  }
  const recordRanks=ranks('record'),pointsRanks=ranks('pf');
  const results=teams.map(t=>({...t,recordRank:recordRanks.get(t.id),pointsRank:pointsRanks.get(t.id),combinedRank:(recordRanks.get(t.id)+pointsRanks.get(t.id))/2}));
  results.sort((a,b)=>b.combinedRank-a.combinedRank||b.pointsRank-a.pointsRank||b.recordRank-a.recordRank||a.id-b.id);
  return results.map((t,i)=>({...t,projectedSlot:i+1,method:'50% record rank + 50% points-for rank'}));
}
export function standingsFromCompletedMatchups(weekly,through){
  const n=Number(through);
  if(!Number.isInteger(n)||n<1||n>18)throw Error('invalid completed week');
  const totals=new Map();
  for(let w=1;w<=n;w++){
    const rows=weekly?.[w];
    if(!Array.isArray(rows)||rows.length!==32)throw Error('missing complete matchup week '+w);
    const groups=new Map(),used=new Set();
    for(const row of rows){
      const id=Number(row.roster_id),mid=String(row.matchup_id??''),pf=Number(row.points);
      if(!Number.isInteger(id)||id<1||used.has(id)||!mid||!Number.isFinite(pf)||pf<0)throw Error('invalid matchup week '+w);
      used.add(id);if(!groups.has(mid))groups.set(mid,[]);groups.get(mid).push({id,pf});
    }
    if(groups.size!==16||[...groups.values()].some(p=>p.length!==2))throw Error('week '+w+' has incomplete head-to-head results');
    if(w===1)for(const id of used)totals.set(id,{id,wins:0,losses:0,ties:0,pf:0});
    if(totals.size!==32||[...used].some(id=>!totals.has(id)))throw Error('roster mapping changed in matchup week '+w);
    for(const pair of groups.values()){
      const [a,b]=pair;totals.get(a.id).pf+=a.pf;totals.get(b.id).pf+=b.pf;
      if(Math.abs(a.pf-b.pf)<1e-8){totals.get(a.id).ties++;totals.get(b.id).ties++}
      else{totals.get(a.pf>b.pf?a.id:b.id).wins++;totals.get(a.pf>b.pf?b.id:a.id).losses++}
    }
  }
  return rank5050([...totals.values()]);
}
export const postCutoverTrade=t=>Number.isFinite(Date.parse(t?.created))&&Date.parse(t.created)>=Date.parse(PICK_ORDER_CUTOVER_UTC);
