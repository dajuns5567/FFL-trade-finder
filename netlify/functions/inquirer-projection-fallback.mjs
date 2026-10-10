// Retrospective estimate, never an official Sleeper or contemporaneous pregame forecast.
// Derives estimates exclusively from games completed before the requested week.
const group=x=>{
 const p=String(x||'').toUpperCase();
 if(['CB','S','SS','FS','DB'].includes(p))return 'DB';
 if(['DE','DT','NT','DL','EDGE'].includes(p))return 'DL';
 if(['ILB','OLB','MLB','LB'].includes(p))return 'LB';
 if(p==='FB')return 'RB';
 return p;
};
const mean=a=>a.reduce((n,x)=>n+x,0)/a.length;
const median=a=>{const v=a.slice().sort((x,y)=>x-y);return v.length?(v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2):null};
export function fallbackProjection({playerId,position,history,peerPosition,minimum=0}){
 const id=String(playerId);
 const own=(history||[]).filter(x=>String(x.player_id)===id&&Number.isFinite(x.points)&&x.points>=minimum).slice(0,4);
 if(own.length>=1)return {points:Number(mean(own.map(x=>x.points)).toFixed(2)),basis:'prior-games',sample_size:own.length,confidence:own.length>=3?'medium':'low'};
 const peers=(history||[]).filter(x=>group(x.position)===group(position||peerPosition)&&Number.isFinite(x.points)&&x.points>=minimum).map(x=>x.points);
 const typical=median(peers);
 if(typical!==null)return {points:Number(typical.toFixed(2)),basis:'position-median',sample_size:peers.length,confidence:'low'};
 return null;
}
