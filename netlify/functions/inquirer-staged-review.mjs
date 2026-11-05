// Private, read-only inspection of the exact production-staged Inquirer copy.
// The Netlify project requires team login on non-production deploys. Never serve
// the manuscript from production, a branch deploy, or to an unauthenticated user.
import {getStore} from '@netlify/blobs';
import {editorialCopyDigest,inspectEditionBeforePublication} from './inquirer-publication-guard.mjs';

const headers={'cache-control':'private, no-store, max-age=0','content-type':'application/json; charset=utf-8','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export default async function inquirerStagedReview(req,context){
 const url=new URL(req.url),siteId=globalThis.Netlify?.env?.get?.('SITE_ID')||process.env.SITE_ID||'';
 const deployment=globalThis.Netlify?.env?.get?.('CONTEXT')||process.env.CONTEXT||'';
 const hostname=url.hostname;
 const expected='8776d155-bc7b-4dcd-bafc-3d70d3d51800';
 const previewHost=/^deploy-preview-[0-9]+--transcendent-manatee-2f0123\.netlify\.app$/i.test(hostname);
 if(req.method!=='GET'||siteId!==expected||deployment!=='deploy-preview'||!previewHost)
  return reply({error:'Private deploy-preview review only'},403);
 if(!context?.user?.id)return reply({error:'Authenticated Netlify team reviewer required'},401);
 const season=2026,week=5,key='inquirer/editorial-staging/2026/week-05.json';
 const store=getStore('fleeced-league-hub',{consistency:'strong'});
 let stage;
 try{stage=await store.get(key,{type:'json'})}
 catch(error){console.error('inquirer-staged-review-read-error',String(error?.message||error));return reply({error:'Production stage cannot be read'},503)}
 if(!stage?.edition?.teams?.length)return reply({ready:false,reason:'No completed production-staged Week 5 manuscript'},404);
 const edition=stage.edition,sha256=editorialCopyDigest(edition),audit=inspectEditionBeforePublication(edition);
 const teams=edition.teams.slice().sort((a,b)=>Number(a.roster_id)-Number(b.roster_id));
 const metadata={ready:true,season,week,sha256,digest_matches_stage:sha256===stage.digest,
  editorial_revision:edition.editorial_revision,article_count:teams.length,
  reporters:[...new Set(teams.map(t=>t?.inquirer_article?.reporter?.id).filter(Boolean))],
  quality_ok:stage.generation_quality?.ok===true,audit_ok:audit.ok,audit_findings:audit.issues.length,
  generated_at:stage.generated_at||null,
  manuscript_note:'Unpublished production-staged copy; private read-only review. Does not approve or publish.'};
 if(url.searchParams.get('edition')==='1'){
  if(!metadata.digest_matches_stage||!metadata.audit_ok||!metadata.quality_ok||
     metadata.article_count!==32||!edition.league_overview?.headline)
   return reply({error:'Production stage fails private review integrity checks',...metadata},409);
  // Return exact original article and recap fields to the existing League Hub
  // renderer. Only ephemeral preview annotations are added outside the digest.
  return reply({...metadata,edition:{...edition,published_locked:false,preview_only:true,
   preview_editorial_audit:{ok:true},preview_generation_quality:{ok:true}}});
 }
 const teamId=url.searchParams.get('team');
 if(teamId!==null){
  if(!/^\d{1,2}$/.test(teamId))return reply({error:'Invalid roster id'},400);
  const t=teams.find(x=>String(x.roster_id)===teamId);
  return t?reply({...metadata,team:{roster_id:t.roster_id,team_name:t.team_name,manager_name:t.manager_name,article:t.inquirer_article}}):reply({error:'Team not found'},404);
 }
 if(url.searchParams.get('recap')==='1')return reply({...metadata,league_overview:edition.league_overview});
 return reply({...metadata,teams:teams.map(t=>({roster_id:t.roster_id,team_name:t.team_name,
  manager_name:t.manager_name,reporter:t.inquirer_article?.reporter?.id||null})),
  links:{recap:'?recap=1',team:'?team=ROSTER_ID'}});
}
