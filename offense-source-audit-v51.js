(()=>{
'use strict';
// V51 diagnostic only. No source refresh, valuation recalculation, or market changes.
const POS=new Set(['QB','RB','WR','TE']);
const SOURCES=['FantasyPros','DraftSharks','The IDP Show Combined Offense','KTC','FanRanked'];
const finite=x=>x==null||x===''?null:(Number.isFinite(Number(x))?Number(x):null);
const normalized=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
function build({players={},consensusComposite={},rankings={},masterRows=[],capturedAt=null}={}){
  const details=consensusComposite.detailsById||{};
  const offenseRows=(masterRows||[]).filter(z=>{
    const p=players[String(z?.x?.id)]||{};
    const pos=String(z?.x?.position||z?.x?.pos||p.fantasy_positions?.find(x=>POS.has(x))||p.position||'').toUpperCase();
    return POS.has(pos);
  });
  const rankById=new Map(offenseRows.map((z,i)=>[String(z.x.id),i+1]));
  const allIds=new Set([...rankById.keys(),...Object.keys(details).filter(id=>(players[id]?.fantasy_positions||[]).some(p=>POS.has(String(p).toUpperCase())))]);
  const output=[];
  for(const id of allIds){
    const player=players[id]||{},detail=details[id]||{};
    const z=offenseRows.find(x=>String(x.x.id)===id)||null;
    const pos=String(z?.x?.position||z?.x?.pos||player.fantasy_positions?.find(p=>POS.has(p))||player.position||'').toUpperCase();
    if(!POS.has(pos))continue;
    const name=[player.first_name,player.last_name].filter(Boolean).join(' ')||player.full_name||detail.name||id;
    const evidence=Array.isArray(detail.offenseSourceEvidence)?detail.offenseSourceEvidence:[];
    const observed=evidence.filter(e=>e?.listed===true&&finite(e.rank)!=null);
    const ranks=observed.map(e=>Number(e.rank));
    const min=ranks.length?Math.min(...ranks):null,max=ranks.length?Math.max(...ranks):null;
    const overallRank=z?masterRows.findIndex(x=>String(x?.x?.id)===id)+1:null;
    const compositeRank=finite(detail.offenseRank);
    const sourceRanks=Object.fromEntries(SOURCES.map(src=>{
      const entry=observed.find(e=>e.source===src);
      const snapshot=rankings[src]||{};
      const penalty=evidence.find(e=>e.source===src+' (not listed)');
      return[src,{
        rank:entry?finite(entry.rank):null,weight:entry?finite(entry.weight):null,
        status:entry?'listed':penalty?'not-listed-penalty':'not-listed-or-unmatched',
        penaltyRank:penalty?finite(penalty.rank):null,
        penaltyWeight:penalty?finite(penalty.weight):null,
        sourceRows:finite(snapshot.playerCount)??Object.keys(snapshot.data||{}).length,
        lastFetchedAt:snapshot.freshness?.fetchedAt||snapshot.updated||null,
        publisherUpdatedAt:snapshot.freshness?.publisherUpdatedAt||null,
        snapshotStatus:snapshot.freshness?.contentChangeStatus||null
      }];
    }));
    const span=min!=null&&max!=null?max-min:null;
    const missing=SOURCES.filter(src=>sourceRanks[src].rank==null);
    const flags=[];
    if(!observed.length)flags.push('no-independent-source-ranking');
    else if(observed.length===1)flags.push('single-source-consensus');
    if(span!=null&&span>=50)flags.push('source-rank-spread-50-plus');
    if(span!=null&&span>=100)flags.push('source-rank-spread-100-plus');
    if(compositeRank!=null&&rankById.has(id)&&Math.abs(rankById.get(id)-compositeRank)>=40)flags.push('model-vs-consensus-rank-gap-40-plus');
    if(z?.coverageGate384)flags.push('exact-coverage-fallback');
    const weightAll=evidence.filter(e=>finite(e?.rank)!=null&&finite(e?.weight)>0);
    const sensitivity=Object.fromEntries(SOURCES.map(src=>{
      const removed=weightAll.filter(e=>e.source!==src&&e.source!==src+' (not listed)');
      const wt=removed.reduce((sum,e)=>sum+Number(e.weight),0);
      const result=wt>0?removed.reduce((sum,e)=>sum+Number(e.rank)*Number(e.weight),0)/wt:null;
      return[src,result==null||compositeRank==null?null:Math.round((result-compositeRank)*10)/10];
    }));
    output.push({
      id,name,position:pos,team:player.team||null,age:finite(player.age),
      overallRank,offenseOnlyRank:rankById.get(id)||null,
      consensusOffenseRank:compositeRank,consensusValue:finite(consensusComposite.byId?.[id]),
      modelValue:finite(z?.value),observedSourceCount:observed.length,
      sourceRankMin:min,sourceRankMax:max,sourceRankSpread:span,
      notListedPenaltyCount:evidence.filter(e=>e.listed===false).length,
      missingSourceNames:missing,sourceRanks,
      sensitivityRemovingSourceFromFixedEvidence:sensitivity,
      flags
    });
  }
  output.sort((a,b)=>(a.offenseOnlyRank??99999)-(b.offenseOnlyRank??99999)||a.name.localeCompare(b.name));
  const flagged=output.filter(p=>p.flags.length);
  const bySource=Object.fromEntries(SOURCES.map(src=>[src,{
    listedPlayers:output.filter(p=>p.sourceRanks[src].status==='listed').length,
    notListedPenaltyPlayers:output.filter(p=>p.sourceRanks[src].status==='not-listed-penalty').length,
    missingOrUnmatchedPlayers:output.filter(p=>p.sourceRanks[src].status==='not-listed-or-unmatched').length,
    fetchedAt:rankings[src]?.freshness?.fetchedAt||rankings[src]?.updated||null,
    publisherUpdatedAt:rankings[src]?.freshness?.publisherUpdatedAt||null
  }]));
  return{
    audit:'FFL V51 offense source-by-source ranking disagreement (read-only)',
    capturedAt:capturedAt||new Date().toISOString(),
    interpretation:{
      sourceRanks:'Per-source model ranks recorded by the same composite used for valuation; may be reindexed after source extraction.',
      missing:'Not listed, unmatched, or outside source published depth; missing does not prove an error.',
      sensitivity:'Fixed-evidence weighted rank change if one channel is omitted; diagnostic only, not a full recalculation or recommended change.',
      freshness:'FetchedAt is retrieval time, not publisher update time.',
      rankTypes:'offenseOnlyRank excludes IDP; overallRank includes IDP.'
    },
    summary:{
      totalOffense:output.length,flagged:flagged.length,
      missingAllSources:output.filter(p=>p.observedSourceCount===0).length,
      singleSource:output.filter(p=>p.observedSourceCount===1).length,
      rankSpread50:output.filter(p=>p.sourceRankSpread!=null&&p.sourceRankSpread>=50).length,
      rankSpread100:output.filter(p=>p.sourceRankSpread!=null&&p.sourceRankSpread>=100).length,
      modelConsensusGap40:output.filter(p=>p.flags.includes('model-vs-consensus-rank-gap-40-plus')).length,
      bySource
    },
    priorityReview:flagged.sort((a,b)=>(b.sourceRankSpread??0)-(a.sourceRankSpread??0)).slice(0,100).map(p=>({id:p.id,name:p.name,position:p.position,sourceRankSpread:p.sourceRankSpread,sourceRanks:Object.fromEntries(SOURCES.map(src=>[src,p.sourceRanks[src].rank])),flags:p.flags})),
    players:output
  };
}
function download(audit,filename='ffl-v51-offense-source-audit.json'){
  const data=JSON.stringify(audit,null,2);
  const link=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
window.fflOffenseSourceAuditV51={build,download,sourceNames:SOURCES.slice(),normalizeName:normalized};
})();
