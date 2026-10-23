// Deploy Preview diagnostics are isolated from shared league publication storage.
export const PREVIEW_DIAGNOSTIC_STORE = 'fleeced-inquirer-editorial-diagnostics';
export const PREVIEW_DIAGNOSTIC_STATUS = 'current-status.json';
export const PREVIEW_DIAGNOSTIC_EDITION = 'current-edition.json';
export const PREVIEW_DIAGNOSTIC_REJECTED = 'current-rejected-review.json';

export function isPreviewDiagnosticContext(url='') {
 const context=String(globalThis.Netlify?.env?.get?.('CONTEXT')||process.env.CONTEXT||'');
 const host=url?new URL(url).hostname:'';
 return context==='deploy-preview'||/^deploy-preview-\d+--(?:brilliant-faun-c5b649|transcendent-manatee-2f0123)\.netlify\.app$/i.test(host);
}


// A Deploy Preview can inspect several weeks without allowing a Week 3 draft
// to masquerade as Week 5. Keep all diagnostic keys season/week scoped.
// Resolve the default from Sleeper's NFL clock, never from a stale shared key.
export async function resolvePreviewIdentity(url=''){
 const query=new URL(url);
 const value=query.searchParams.get('preview_week');
 if(value!==null&&(!/^\d{1,2}$/.test(value)||Number(value)<1||Number(value)>17))
  throw Error('Invalid private preview_week; enter a fantasy week between 1 and 17');
 const response=await fetch('https://api.sleeper.app/v1/state/nfl',{
  headers:{accept:'application/json'},signal:AbortSignal.timeout(6000),cache:'no-store'
 });
 if(!response.ok)throw Error('Sleeper season/week clock unavailable (HTTP '+response.status+'); preview held.');
 const state=await response.json(),season=Number(state?.season),current=Number(state?.week);
 if(!Number.isInteger(season)||season<2026||!Number.isInteger(current)||current<1)
  throw Error('Sleeper season/week clock invalid; preview held.');
 const week=value===null?Math.min(17,Math.max(1,current-1)):Number(value);
 const prefix=season+'/week-'+String(week).padStart(2,'0');
 return{
  season,week,explicit:value!==null,
  status:prefix+'/status.json',
  edition:prefix+'/edition.json',
  rejected:prefix+'/rejected-review.json'
 };
}

// Old or cross-week deploy-local status can never be authoritative. In
// particular, a Week 6 error may not be displayed on the requested Week 5
// page just because both drafts share the same Netlify deploy.
export function previewStatusMatchesIdentity(status,identity){
 if(!status||typeof status!=='object')return false;
 if(Number(status.season)!==identity.season||Number(status.week)!==identity.week)return false;
 const error=String(status.error||'');
 const mentioned=error.match(/Cannot generate Week (\d+) editorial preview/i);
 return !mentioned||Number(mentioned[1])===identity.week;
}

export function summarizePreviewDiagnostic(edition) {
 const teams=Array.isArray(edition?.teams)?edition.teams:[];
 const reporterCounts={};
 for(const team of teams){
  const id=String(team?.inquirer_article?.reporter?.id||'unknown');
  reporterCounts[id]=(reporterCounts[id]||0)+1;
 }
 return {
  available:edition?.available===true,season:edition?.season??null,week:edition?.week??null,
  preview_only:edition?.preview_only===true,published_locked:edition?.published_locked===true,
  article_count:teams.length,reporter_counts:reporterCounts,
  editorial_audit:edition?.preview_editorial_audit??null,
  generation_quality:edition?.preview_generation_quality??null,
  league_recap_headline:edition?.league_overview?.headline??null,
  headline_samples:teams.slice(0,8).map(t=>({team:t.team_name,headline:t.inquirer_article?.headline||''})),
  reason:edition?.reason||null
 };
}

const REQUIRED_DESKS=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
const REQUIRED_BEATS=['lead','standings','players','decisions','league','outlook'];
export function auditPrivateEdition(edition){
 const teams=Array.isArray(edition?.teams)?edition.teams:[],counts={},rosters=new Set(),paragraphs=new Map();
 const issues=[],lengths=[];
 for(const t of teams){
  const id=String(t?.roster_id||'');rosters.add(id);
  const article=t?.inquirer_article||{},sections=Array.isArray(article.sections)?article.sections:[];
  const reporter=String(article?.reporter?.id||'missing');counts[reporter]=(counts[reporter]||0)+1;
  const kinds=sections.map(s=>s?.kind);
  if(REQUIRED_DESKS.some(kind=>!kinds.includes(kind)))issues.push('missing desks roster '+id);
  if(!String(article.headline||'').trim())issues.push('missing headline roster '+id);
  const prose=sections.flatMap(s=>Array.isArray(s?.paragraphs)?s.paragraphs:[]);
  const words=prose.join(' ').trim().split(/\s+/).filter(Boolean).length;
  lengths.push(words);
  if(words<300||words>650)issues.push('article length roster '+id+': '+words);
  for(const p of prose){
   const normalized=String(p||'').toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
   if(normalized.split(' ').length<12)continue;
   const seen=paragraphs.get(normalized)||new Set();seen.add(id);paragraphs.set(normalized,seen);
  }
 }
 if(teams.length!==32||rosters.size!==32)issues.push('32 distinct team articles required');
 if(Object.keys(counts).length!==4||Object.values(counts).some(c=>c!==8))issues.push('four reporters, eight articles each required');
 const repeated=[...paragraphs].filter(([,ids])=>ids.size>=3);
 if(repeated.length)issues.push('repeated cross-roster paragraphs: '+repeated.length);
 const overview=edition?.league_overview||{},blocks=overview?.sections?.[0]?.blocks||[];
 if(!Array.isArray(overview.sections)||overview.sections.length<4||
   blocks.length!==6||REQUIRED_BEATS.some((b,i)=>blocks[i]?.kind!==b))
  issues.push('six-beat recap missing');
 if(edition?.preview_only!==true||edition?.published_locked!==false)issues.push('must be an unpublished preview');
 if(edition?.preview_editorial_audit?.ok!==true||edition?.preview_generation_quality?.ok!==true)issues.push('underlying editorial audit failed');
 return{passed:issues.length===0,issues,article_count:teams.length,reporter_counts:counts,
  word_counts:{minimum:lengths.length?Math.min(...lengths):null,maximum:lengths.length?Math.max(...lengths):null,average:lengths.length?Math.round(lengths.reduce((a,b)=>a+b,0)/lengths.length):null},
  repeated_paragraph_groups:repeated.length,recap_beats:blocks.map(b=>b.kind)};
}
