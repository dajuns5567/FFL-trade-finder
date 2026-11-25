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
// Sleeper returns a distinct ADP-only sentinel row for players with no
// published scoring components. This is evidence of a present player row,
// not a numeric individual projection. The team total sums published
// scoring components, as the existing newsroom lineup aggregation does.
// Never apply this convention to an absent row or an unfamiliar schema.
export function isNoPublishedScoringRow(row){
 const stats=row?.stats;
 return !!stats&&typeof stats==='object'&&!Array.isArray(stats)&&
 Object.keys(stats).length===1&&Number(stats.adp_dd_ppr)===1000;
}
export async function completedWeekProjections({season,week,scoring,matchups,fetchJson}){
 const ids=new Set((matchups||[]).flatMap(g=>Array.isArray(g?.starters)?g.starters.map(String).filter(id=>id&&id!=='0'):[]));
 const map=Object.create(null),sources=[],placeholders=new Set();
 for(const host of ['api.sleeper.app','api.sleeper.com']){
  try{
   const raw=await fetchJson('https://'+host+'/projections/nfl/'+season+'/'+week+'?season_type=regular');
   const entries=projectionEntries(raw);let added=0;
   for(const [id,row] of entries){
    if(!id||!ids.has(id)||map[id]!=null)continue;
    const value=scoreProjection(row,scoring);
    if(value!=null){map[id]=value;placeholders.delete(id);added++}
    else if(isNoPublishedScoringRow(row))placeholders.add(id);
   }
   sources.push({host,rows:entries.length,added});
  }catch(error){sources.push({host,error:String(error?.message||error)})}
  if(ids.size&&[...ids].every(id=>map[id]!=null))break;
 }
 const numericCoverage=Object.keys(map).length;
 // Prefer actual scoring components from either endpoint; only then include
 // confirmed ADP-only rows as zero contribution to the aggregate.
 const noScoring=[...placeholders].filter(id=>map[id]==null);
 for(const id of noScoring)map[id]=0;
 return {map,noScoring,diagnostics:{required:ids.size,covered:Object.keys(map).length,
 numeric_coverage:numericCoverage,no_published_scoring:noScoring,
 missing:[...ids].filter(id=>map[id]==null),sources}};
}
