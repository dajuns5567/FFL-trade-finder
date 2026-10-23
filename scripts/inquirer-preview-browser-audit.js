/* Fleeced! Inquirer Deploy Preview — READ ONLY browser acceptance audit.
 * Paste into DevTools on ?inquirer_preview=1&preview_week=5 on the exact
 * replacement Fleeced! PR Preview. Same-origin GETs only; NO tokens,
 * credentials, external traffic, writes, publication, or deploy actions.
 * Always review the actual 32 pieces of prose before public approval.
 */
(async function fleecedReadOnlyPreviewAudit(){
 'use strict';
 const host=location.hostname;
 if(!/^deploy-preview-\d+--transcendent-manatee-2f0123\.netlify\.app$/i.test(host))
  throw Error('Refusing browser audit outside the Fleeced! replacement Netlify Deploy Preview.');
 const query=new URLSearchParams(location.search);
 if(query.get('inquirer_preview')!=='1')throw Error('Open the unpublished Inquirer reader before auditing.');
 const season=Number(query.get('preview_season')||2026);
 const week=Number(query.get('preview_week'));
 if(!Number.isInteger(week)||week<1||week>17||season!==2026)
  throw Error('An explicit 2026 preview_week=1..17 is required for this audit.');
 const path='/\.netlify/functions/league-hub';
 const jsonGet=async pathname=>{
  const res=await fetch(pathname,{method:'GET',cache:'no-store',credentials:'same-origin'});
  let data=null;
  try{data=await res.json()}catch{}
  return{http:res.status,data};
 };
 const needed=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
 const beats=['lead','standings','players','decisions','league','outlook'];
 const auditEdition=(e,w,privateDraft=false)=>{
  const teams=Array.isArray(e?.teams)?e.teams:[],ids=teams.map(t=>String(t?.roster_id||''));
  const unique=new Set(ids);
  const headings=[],short=[],long=[],missing=[],reporters={},paragraphs=new Map();
  const normalize=t=>String(t||'').toLowerCase().replace(/\s+/g,' ').replace(/[^a-z0-9 ]/g,'').trim();
  for(const t of teams){
   const article=t.inquirer_article||{},ss=article.sections||[],kinds=ss.map(x=>x?.kind);
   const text=ss.flatMap(x=>x.paragraphs||[]).join(' ');
   const words=text.split(/\s+/).filter(Boolean).length;
   const rid=String(article.reporter?.id||'unknown');
   reporters[rid]=(reporters[rid]||0)+1;
   if(words<300)short.push({team:t.team_name,words});
   if(words>650)long.push({team:t.team_name,words});
   if(needed.some(k=>!kinds.includes(k)))missing.push({team:t.team_name,kinds});
   for(const h of ss.map(x=>String(x?.heading||'')))if(!h||/^[a-z]/.test(h))headings.push({team:t.team_name,heading:h});
   for(const p of ss.flatMap(x=>x.paragraphs||[])){
    const n=normalize(p);
    if(n.split(' ').length<12)continue;
    const arr=paragraphs.get(n)||new Set();arr.add(String(t.roster_id));paragraphs.set(n,arr);
   }
  }
  const duplicated=[...paragraphs].filter(([_,s])=>s.size>=3).slice(0,16).map(([text,s])=>({teamCount:s.size,excerpt:text.slice(0,95)}));
  const overview=e?.league_overview||{},ss=overview.sections||[],b=ss[0]?.blocks||[];
  const sixBeats=ss.length>=4&&b.length===6&&beats.every((kind,i)=>b[i]?.kind===kind);
  const actualWeek=Number(e?.week),actualSeason=Number(e?.season);
  const hasEditorialGates=e?.preview_editorial_audit?.ok===true&&e?.preview_generation_quality?.ok===true;
  const constraints={yearWeek:actualSeason===season&&actualWeek===w,
   locked:privateDraft?(e?.preview_only===true&&e?.published_locked===false):e?.published_locked===true,
   teamCount:teams.length===32,uniqueRosters:unique.size===32,
   eightSections:missing.length===0,recapSixBeats:sixBeats,
   readableHeadings:headings.length===0,wordLength:short.length===0&&long.length===0,
   exactParagraphRepetition:duplicated.length===0,
   editorialGates:privateDraft?hasEditorialGates:null};
  return{constraints,passed:Object.entries(constraints).every(([key,value])=>value===null||value===true),
   reporterCounts:reporters,recapHeadline:overview.headline||null,
   missingDesks:missing,missingHeadings:headings,tooShort:short,tooLong:long,duplicatedParagraphs:duplicated};
 };
 const getWeek=w=>jsonGet('/.netlify/functions/league-hub?broadcast_season='+season+'&broadcast_week='+w);
 const report={mode:'READ_ONLY',time:new Date().toISOString(),site:host,requested:{season,week},
  historical:{},preview:{},awards:{},recommendation:'HOLD',productionWrites:0};
 for(const w of [3,4]){
  const r=await getWeek(w);
  report.historical['week'+w]={http:r.http,available:r.data?.available===true,
   locked:r.data?.published_locked===true,correctIdentity:Number(r.data?.season)===season&&Number(r.data?.week)===w,
   teams:r.data?.teams?.length||0,headline:r.data?.league_overview?.headline||null};
  if(r.data?.available===true&&r.data?.published_locked===true)
   report.historical['week'+w].schema=auditEdition(r.data,w);
 }
 const status=await jsonGet('/.netlify/functions/inquirer-preview-diagnostic?preview_week='+week);
 report.preview.diagnostic={http:status.http,target:status.data?.target||null,
  state:status.data?.status?.state||'unknown',
  error:status.data?.status?.error||status.data?.error||null,
  summary:status.data?.status?.summary||null};
 if(status.data?.target&&Number(status.data.target.week)!==week)
  report.preview.identityFailure='The diagnostic returned the WRONG requested week';
 if(status.data?.status?.state==='completed'){
  const draft=await jsonGet('/.netlify/functions/inquirer-preview-diagnostic?draft=1&preview_week='+week);
  report.preview.draftHttp=draft.http;
  if(draft.http===200)report.preview.manuscript=auditEdition(draft.data,week,true);
 }
 const awardResult=await jsonGet('/.netlify/functions/league-hub?weekly_awards=1');
 const record=(awardResult.data?.records||[]).find(r=>Number(r.season)===season&&Number(r.week)===week);
 report.awards={http:awardResult.http,requestedWeekStored:!!record,
  offense:!!record?.players_of_week?.offense?.player_id,
  idpDefense:!!record?.players_of_week?.defense?.player_id,
  managerBadges:Array.isArray(record?.manager_awards)?record.manager_awards.length:0,
  note:'Production awards are distinct from the private draft; missing awards here do not prove the preview failed.'};
 if(report.historical.week3?.locked&&report.historical.week4?.locked&&
    report.preview.manuscript?.passed&&report.preview.diagnostic.state==='completed')
  report.recommendation='PRIVATE DRAFT STRUCTURAL GATES PASS; human prose and real-fact review still required before publishing';
 console.group('Fleeced! PRIVATE Week '+week+' editorial acceptance audit (read-only)');
 console.log(report);
 console.log(JSON.stringify(report,null,2));
 console.groupEnd();
 return report;
})();