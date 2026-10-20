// Deploy Preview diagnostics are isolated from shared league publication storage.
export const PREVIEW_DIAGNOSTIC_STORE = 'fleeced-inquirer-editorial-diagnostics';
export const PREVIEW_DIAGNOSTIC_STATUS = 'week5-status.json';
export const PREVIEW_DIAGNOSTIC_EDITION = 'week5-edition.json';
export const PREVIEW_DIAGNOSTIC_REJECTED = 'week5-rejected-review.json';

export function isPreviewDiagnosticContext(url='') {
 const context=String(globalThis.Netlify?.env?.get?.('CONTEXT')||process.env.CONTEXT||'');
 const host=url?new URL(url).hostname:'';
 return context==='deploy-preview'||host==='deploy-preview-402--brilliant-faun-c5b649.netlify.app';
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
