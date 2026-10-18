// Read-only audit of a draft already staged in the private review namespace.
// This endpoint never approves, edits, publishes, or returns access credentials.
import {authorizeEditorialGeneration} from './inquirer-week4-run-auth.mjs';
import {editorialCopyDigest} from './inquirer-publication-guard.mjs';
import {originalJobKey,correctedJobKey,reviewSalvageJobKey} from './inquirer-week4-retry-policy.mjs';
const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const counts=items=>items.reduce((a,item)=>{const k=String(item||'unknown');a[k]=(a[k]||0)+1;return a},{});
export async function handler(req,{site,readEnv=(name)=>globalThis.Netlify?.env?.get?.(name)||process.env[name],
 openStore=async()=>{const {getStore}=await import('@netlify/blobs');return getStore({name:'fleeced-league-hub',consistency:'strong'});}}={}){
 const auth=authorizeEditorialGeneration(req,{readEnv,method:'GET'});
 if(!auth.ok)return respond(auth.status,{error:'Draft audit unavailable or unauthorized'});
 if(site?.id&&site.id!=='2e556797-6f35-4037-aa5a-1338724eb71d')return respond(403,{error:'Wrong Netlify project'});
 try{
  const store=await openStore();
  const markers=await Promise.all([reviewSalvageJobKey,correctedJobKey,originalJobKey].map(k=>
   store.get(k,{type:'json'}).catch(()=>null)));
  const job=markers.find(Boolean);
  if(!job||job.status!=='draft_staged'||!job.key)return respond(200,{ready:false,status:job?.status||'not_started',publishable:false});
  const envelope=await store.get(job.key,{type:'json'});
  if(!envelope||envelope.schema!=='fleeced-editorial-review-draft-v1'||envelope.review_status!=='unapproved'||
    envelope.publishable!==false||Number(envelope.week)!==5||envelope.sha256!==job.sha256||
    editorialCopyDigest(envelope.edition)!==job.sha256)return respond(409,{error:'Staged draft integrity mismatch'});
  const teams=envelope.edition.teams||[],overview=envelope.edition.league_overview||{};
  const teamChecks=teams.map(t=>{
    const a=t.inquirer_article||{},sections=Array.isArray(a.sections)?a.sections:[];
    const text=sections.flatMap(s=>s.paragraphs||[]).join(' ');
    return{roster_id:String(t.roster_id),team:t.team_name,headline:a.headline||'',
      section_count:sections.length,sentiment:sections.some(s=>s.kind==='sentiment'&&(s.paragraphs||[]).length>=2),
      management:sections.some(s=>s.kind==='management'&&(s.paragraphs||[]).length>=2),
      player_mention:(t.starter_details||[]).some(p=>p.name&&text.includes(p.name)),
      score_mention:text.includes(Number(t.points).toFixed(1))||text.includes(Number(t.points).toFixed(2)),
      opponent_mention:!!t.opponent_name&&text.includes(t.opponent_name),
      prose_characters:text.length};
  });
  const quality=envelope.quality||{},structural=quality.structural||{},deep=quality.deep||{};
  const failures=Array.isArray(quality.article_review_issues)?quality.article_review_issues:[];
  const structuralIssues=Array.isArray(structural.issues)?structural.issues:[];
  return respond(200,{ready:true,season:2026,week:5,sha256:job.sha256,
   approved:false,publishable:false,quality_ok:quality.ok===true,
   team_count:teams.length,headline_count:teamChecks.filter(t=>t.headline).length,
   recap_sections:(overview.sections||[]).length,hot_takes:(overview.hot_takes||[]).length,
   checks:{sentiment:teamChecks.filter(t=>t.sentiment).length,management:teamChecks.filter(t=>t.management).length,
    player_mentions:teamChecks.filter(t=>t.player_mention).length,
    score_mentions:teamChecks.filter(t=>t.score_mention).length,
    opponent_mentions:teamChecks.filter(t=>t.opponent_mention).length},
   structural_issue_count:structuralIssues.length,structural_issue_categories:counts(structuralIssues.map(x=>x.id)),
   article_review_issue_count:failures.length,article_issue_categories:counts(failures.flatMap(x=>x.issues||[])),
   recap_review_issue:quality.recap_review_issue||null,deep_ok:deep.ok===true,
   deep_issue_categories:counts((deep.issues||[]).map(x=>x.id)),
   article_review_issues:failures.map(x=>({roster_id:String(teams[x.team_index]?.roster_id||''),team:teams[x.team_index]?.team_name||'',issues:x.issues||[]})),
   structural_issues:structuralIssues.map(x=>({id:x.id,team:x.team||null,teams:x.teams||null,excerpt:x.excerpt||null})),
   teams:teamChecks});
 }catch{return respond(503,{error:'Private staged draft could not be inspected'});}
}
export default handler;
export const config={rateLimit:{action:'rate_limit',windowLimit:12,windowSize:60,aggregateBy:'ip'}};
