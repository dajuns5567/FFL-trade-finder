import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const url=process.env.AUDIT_URL||'https://deploy-preview-386--inspiring-bombolone-be4489.netlify.app';
const outFile=process.env.AUDIT_OUT||'.tmp/idp-weight-counterfactual.json';
const candidates=[
  {name:'20/50/30',consensus:.20,scoring:.50,context:.30},
  {name:'20/45/35',consensus:.20,scoring:.45,context:.35},
  {name:'20/40/40',consensus:.20,scoring:.40,context:.40},
  {name:'20/35/45',consensus:.20,scoring:.35,context:.45}
];

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  const response=await page.goto(url+'/?idp_weight_audit='+Date.now(),{waitUntil:'domcontentloaded',timeout:120000});
  if(!response?.ok())throw new Error(`Preview load failed: ${response?.status()||'no response'}`);

  await page.waitForFunction(()=>{
    const v=window.__fllValueRefresh||{},c=window.__fllConsensusRefresh||{};
    return v.inFlight===false&&v.phase==='complete'&&c.complete===true&&c.ok===true&&Number(c.successful)>=7&&window.modeledPlayerValuesV319?.ready===true&&typeof window.idpScoringAudit==='function'&&typeof window.ensureMaster==='function';
  },null,{timeout:240000});

  const report=await page.evaluate((candidates)=>{
    const HUTCH='8289',safe=fn=>{try{return fn()}catch{return null}},num=v=>{const n=Number(v);return Number.isFinite(n)?n:null},clamp=(lo,x,hi)=>Math.max(lo,Math.min(x,hi)),softplus=x=>x>20?x:Math.log1p(Math.exp(x));
    const master=window.ensureMaster?.()||[];
    const playerName=id=>safe(()=>window.playerName?.(String(id)))||String(id);
    function ageOf(id){const p=window.state?.players?.[String(id)]||{},a=Number(p.age);if(Number.isFinite(a)&&a>0)return a;if(p.birth_date){const d=new Date(p.birth_date);if(!Number.isNaN(d.getTime()))return(Date.now()-d.getTime())/(365.2425*86400000)}return null}
    function roleOf(id){const p=window.state?.players?.[String(id)]||{},vals=[p.position,...(Array.isArray(p.fantasy_positions)?p.fantasy_positions:[])].filter(Boolean).map(v=>String(v).toUpperCase());if(vals.some(v=>['DE','EDGE','DL','DT','NT'].includes(v)))return'EDGE';if(vals.some(v=>['LB','ILB','MLB','OLB'].includes(v)))return'LB';if(vals.some(v=>['S','SS','FS'].includes(v)))return'S';if(vals.some(v=>['CB','DB'].includes(v)))return'DB';return'IDP'}
    function shield(row,baseline){const id=String(row.id),p=row.production||{},age=ageOf(id),role=roleOf(id),ev=clamp(0,Number(p.idpEvidenceV53)||0,1),ppg=clamp(0,(Number(p.idpPpgPercentileV53)||50)/100,1),spike=clamp(0,(Number(p.idpSpikePercentileV53)||50)/100,1),tackle=clamp(0,(Number(p.idpTacklePercentileV53)||50)/100,1),ageWeight=!Number.isFinite(age)?0:age<=26?1:age>=29?0:(29-age)/3,emerging=Number(p.idpEmergingDisruptiveFactorV62||1)>1.04||Boolean(p.idpYoungProjectionV65)||Boolean(p.idpRookieDraft2026V64);let s=0;if(role==='EDGE'&&spike>=.85&&ev>=.20)s=Math.max(s,.68*ageWeight);else if(role==='EDGE'&&spike>=.75&&ev>=.15)s=Math.max(s,Math.max(.52,ppg>=.85?.58:0,ev>=.75&&spike>=.78?.56:0)*ageWeight);if(role==='EDGE'&&ppg>=.90&&ev>=.35)s=Math.max(s,.42);else if(role==='EDGE'&&ppg>=.85&&ev>=.25)s=Math.max(s,.30);if(role==='LB'&&tackle>=.93&&ev>=.20)s=Math.max(s,.45*ageWeight);if(emerging&&role==='EDGE')s=Math.max(s,(ev<.10?.40:.50)*ageWeight);if(emerging&&role==='LB')s=Math.max(s,(ev<.10?.25:.35)*ageWeight);if(ev>=.75&&spike>=.90)s=Math.max(s,.42);const elite=.82/(1+Math.exp(-(baseline-3000)/180));return clamp(0,Math.max(s,elite),.88)}
    function v72(row,baseline){baseline=Math.max(1,Number(baseline||1));const id=String(row.id),role=roleOf(id),age=ageOf(id),depth=softplus((2900-baseline)/350),rawFactor=Math.exp(-.075*Math.pow(depth,1.8)),sh=shield(row,baseline),rawBase=clamp(.46,rawFactor,1),original=1-(1-rawBase)*(1-sh);if(Math.abs(original-1)<.002)return baseline;const t=clamp(0,(baseline-350)/375,1),baseFloor=.60+.16*t,dbAdj=(role==='S'||role==='DB')?-.015:0,mature=role==='EDGE'&&Number.isFinite(age)&&age>=29?-.05*clamp(0,(850-baseline)/250,1):0,floor=clamp(.56,baseFloor+dbAdj+mature,.78),baseAware=Math.max(rawBase,floor),factor=baseAware+.75*Math.max(0,original-baseAware);return baseline*factor}
    const idps=[];
    for(let i=0;i<master.length;i++){const z=master[i],id=String(z?.x?.id||''),pos=String(safe(()=>window.groupPos?.(z.x))||'').toUpperCase();if(pos!=='IDP'||!id)continue;const a=safe(()=>window.idpScoringAudit?.(id));if(!a)continue;const consensus=num(a.consensus),scoring=num(a.productionValue),context=num(a.otherContextValue);if(consensus==null||scoring==null||context==null)continue;idps.push({id,name:playerName(id),role:roleOf(id),consensus,scoring,context,production:z.production||{},currentOverall:i+1,currentExact:num(z.marketPrecisionValueV386)})}
    const baseline={name:'40/40/20',consensus:.40,scoring:.40,context:.20};
    const all=[baseline,...candidates];
    const byMix={};
    for(const mix of all){
      const map=new Map();
      for(const r of idps){const b=mix.consensus*r.consensus+mix.scoring*r.scoring+mix.context*r.context;map.set(r.id,{baseline:b,exact:v72(r,b)})}
      const market=master.map((z,i)=>{const id=String(z?.x?.id||''),pos=String(safe(()=>window.groupPos?.(z.x))||'').toUpperCase();return{id,pos,name:playerName(id),value:pos==='IDP'&&map.has(id)?map.get(id).exact:(num(z.marketPrecisionValueV386)??num(z.value)??1),prior:i}}).sort((a,b)=>b.value-a.value||a.prior-b.prior);
      let idpRank=0;const ranks=new Map();for(let i=0;i<market.length;i++){const x=market[i];if(x.pos==='IDP')idpRank++;ranks.set(x.id,{overall:i+1,idpRank:x.pos==='IDP'?idpRank:null,value:x.value})}
      byMix[mix.name]={mix,map,ranks};
    }
    const base=byMix['40/40/20'];
    const q=(xs,p)=>{if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l)};
    const summaries=[];
    for(const mix of candidates){const cur=byMix[mix.name],rows=idps.map(r=>{const b=base.map.get(r.id),c=cur.map.get(r.id),br=base.ranks.get(r.id),cr=cur.ranks.get(r.id);return{...r,baseBaseline:b.baseline,candBaseline:c.baseline,baseExact:b.exact,candExact:c.exact,delta:c.exact-b.exact,baseOverall:br.overall,candOverall:cr.overall,baseIdp:br.idpRank,candIdp:cr.idpRank,overallGain:br.overall-cr.overall,idpGain:br.idpRank-cr.idpRank}});
      const ds=rows.map(r=>r.delta).filter(Number.isFinite),abs=ds.map(Math.abs);
      const h=rows.find(r=>r.id===HUTCH);
      summaries.push({
        mix,
        marketEffect:{idpCount:rows.length,signed:{min:Math.min(...ds),p25:q(ds,.25),median:q(ds,.5),p75:q(ds,.75),max:Math.max(...ds)},absolute:{median:q(abs,.5),p75:q(abs,.75),p90:q(abs,.90)},up25:rows.filter(r=>r.delta>=25).length,up50:rows.filter(r=>r.delta>=50).length,up100:rows.filter(r=>r.delta>=100).length,down25:rows.filter(r=>r.delta<=-25).length,overallUp10:rows.filter(r=>r.overallGain>=10).length,overallDown10:rows.filter(r=>r.overallGain<=-10).length},
        hutchinson:h?{consensus:h.consensus,scoring:h.scoring,context:h.context,oldBaseline:h.baseBaseline,newBaseline:h.candBaseline,oldV72:h.baseExact,newV72:h.candExact,v72Delta:h.delta,oldOverall:h.baseOverall,newOverall:h.candOverall,oldIdpRank:h.baseIdp,newIdpRank:h.candIdp}:null,
        top15:rows.sort((a,b)=>a.candIdp-b.candIdp).slice(0,15).map(r=>({name:r.name,idpRank:r.candIdp,oldIdpRank:r.baseIdp,overall:r.candOverall,consensus:r.consensus,scoring:r.scoring,context:r.context,v72:Number(r.candExact.toFixed(2)),delta:Number(r.delta.toFixed(2))})),
        largestRisers:[...rows].sort((a,b)=>b.delta-a.delta).slice(0,15).map(r=>({name:r.name,oldIdpRank:r.baseIdp,newIdpRank:r.candIdp,delta:Number(r.delta.toFixed(2)),consensus:r.consensus,scoring:r.scoring,context:r.context})),
        largestFallers:[...rows].sort((a,b)=>a.delta-b.delta).slice(0,15).map(r=>({name:r.name,oldIdpRank:r.baseIdp,newIdpRank:r.candIdp,delta:Number(r.delta.toFixed(2)),consensus:r.consensus,scoring:r.scoring,context:r.context}))
      });
    }
    return{audit:'IDP 20%-consensus weight-mix counterfactual',generatedAt:new Date().toISOString(),runtime:{valueRefresh:window.__fllValueRefresh||null,consensusRefresh:window.__fllConsensusRefresh||null,modeledReady:window.modeledPlayerValuesV319?.ready===true,currentWeights:safe(()=>window.idpScoringAudit?.(HUTCH)?.modelWeights)||null},baseline:baseline.name,candidates:summaries};
  },candidates);

  await fs.mkdir('.tmp',{recursive:true});
  await fs.writeFile(outFile,JSON.stringify(report,null,2)+'\n','utf8');
  console.log(JSON.stringify(report,null,2));
  if(pageErrors.length)console.error('PAGE_ERRORS',JSON.stringify(pageErrors,null,2));
}finally{
  await browser.close();
}
