(()=>{
'use strict';
function run(){
 const rows=window.ensureMaster?.()||[];
 const pos=z=>String(window.groupPos?.(z?.x)||'').toUpperCase();
 const name=z=>window.playerName?.(z?.x?.id)||String(z?.x?.id||'');
 const out=rows.map((z,i)=>({rank:i+1,id:String(z?.x?.id||''),name:name(z),pos:pos(z),served:Number(z?.value),precision:Number(z?.marketPrecisionValueV386),canonical:Number(window.tradeValueNormalizationV139?.canonicalValue?.(z.x)||window.tradeValueNormalizationV130?.canonicalValue?.(z.x)),consensus:Number(z?.consensus),context:Number(z?.context),production:z?.production||{}}));
 const density=[100,150,200,250,300,350,400,450,500].map(k=>({top:k,idp:out.slice(0,k).filter(r=>r.pos==='IDP').length,offense:out.slice(0,k).filter(r=>r.pos!=='IDP').length}));
 const buckets=[];for(let s=101;s<=500;s+=50){const x=out.slice(s-1,s+49);buckets.push({range:s+'-'+(s+49),idp:x.filter(r=>r.pos==='IDP').length,offense:x.filter(r=>r.pos!=='IDP').length})}
 const controls=['Jeffery Simmons','Jeffrey Simmons','Edgerrin Cooper','Jeremiah Owusu-Koramoah','Jonah Coleman','Parker Washington'];
 const controlRows=out.filter(r=>controls.some(q=>r.name.toLowerCase()===q.toLowerCase())).map(r=>({...r,production:{idpBaseline:r.production.idpOverallTradeCurveBaselineV72,idpExact:r.production.idpOverallTradeCurveExactV72,idpFactor:r.production.idpOverallTradeCurveFactorV72,idpShield:r.production.idpOverallTradeCurveShieldV72,offenseTerminal:r.production.offenseTerminalExactV49??r.production.offenseTerminalExactV48??r.production.offenseTerminalExactV47??r.production.offenseTerminalExactV45??r.production.offenseTerminalExactV43,modelWeights:r.production.modelWeights}}));
 const around=n=>out.slice(Math.max(0,n-6),Math.min(out.length,n+5)).map(({rank,name,pos,served,precision,canonical,consensus,context})=>({rank,name,pos,served,precision,canonical,consensus,context}));
 const idp=out.filter(r=>r.pos==='IDP').map(r=>({rank:r.rank,id:r.id,name:r.name,served:r.served,precision:r.precision,canonical:r.canonical,consensus:r.consensus,context:r.context,baseline:Number(r.production?.idpOverallTradeCurveBaselineV72),factor:Number(r.production?.idpOverallTradeCurveFactorV72),shield:Number(r.production?.idpOverallTradeCurveShieldV72)}));
 const suppressed=[...idp].filter(r=>Number.isFinite(r.baseline)&&r.baseline>0).sort((a,b)=>(b.baseline-b.precision)-(a.baseline-a.precision)).slice(0,40);
 const highBaselineLowRank=[...idp].filter(r=>r.rank>=200&&Number.isFinite(r.baseline)).sort((a,b)=>b.baseline-a.baseline).slice(0,50);
 return{players:out.length,density,buckets,controls:controlRows,around200:around(200),around300:around(300),around400:around(400),around500:around(500),idpSuppressed:suppressed,highBaselineLowRank};
}
window.idpMarketAllocationAuditV387={run};
})();