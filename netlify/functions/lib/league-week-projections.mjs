// Read exact-week Sleeper projections, preserving IDs from keyed payloads.
export function projectionEntries(raw){
 const payload=raw?.players??raw?.projections??raw?.data??raw;
 if(Array.isArray(payload))return payload.map(row=>[String(row?.player_id??row?.player?.player_id??''),row]);
 if(!payload||typeof payload!=='object')return [];
 return Object.entries(payload).map(([key,row])=>[String(row?.player_id??row?.player?.player_id??key),row]);
}
export function scoreProjection(row,scoring){
 if(!row||typeof row!=='object')return null;
 const stats=row.stats??row.projection??row;
 if(!stats||typeof stats!=='object')return null;
 let total=0,known=false;
 for(const [key,weight] of Object.entries(scoring||{})){
  const raw=stats[key]??(key.startsWith('idp_')?stats[key.slice(4)]:undefined);
  if(raw==null||raw===''||!Number.isFinite(Number(raw))||!Number.isFinite(Number(weight)))continue;
  total+=Number(raw)*Number(weight);known=true;
 }
 return known?Number(total.toFixed(2)):null;
}
export async function completedWeekProjections({season,week,scoring,matchups,fetchJson}){
 const ids=new Set((matchups||[]).flatMap(g=>Array.isArray(g?.starters)?g.starters.map(String).filter(id=>id&&id!=='0'):[]));
 const map=Object.create(null),sources=[];
 for(const host of ['api.sleeper.app','api.sleeper.com']){
  try{
   const raw=await fetchJson('https://'+host+'/projections/nfl/'+season+'/'+week+'?season_type=regular');
   const entries=projectionEntries(raw);let added=0;
   for(const [id,row] of entries){
    if(!id||!ids.has(id)||map[id]!=null)continue;
    const value=scoreProjection(row,scoring);
    if(value!=null){map[id]=value;added++}
   }
   sources.push({host,rows:entries.length,added});
  }catch(error){sources.push({host,error:String(error?.message||error)})}
  if(ids.size&&[...ids].every(id=>map[id]!=null))break;
 }
 return {map,diagnostics:{required:ids.size,covered:Object.keys(map).length,missing:[...ids].filter(id=>map[id]==null),sources}};
}
