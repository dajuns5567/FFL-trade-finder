// Read-only production stage preflight. Never export the unpublished manuscript or write to Blobs.
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import {inspectEditionBeforePublication,editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';

const season=2026,week=5,siteID=process.env.FLEECED_NEW_TEAM_SITE_ID;
assert.equal(siteID,'8776d155-bc7b-4dcd-bafc-3d70d3d51800','Incorrect production site');
const token=process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN;
assert(token,'Missing Netlify production site-scoped credential');
const store=getStore({name:'fleeced-league-hub',siteID,token,consistency:'strong'});
const suffix=season+'/week-'+String(week).padStart(2,'0')+'.json';
const [stage,approval,published,index]=await Promise.all([
 store.get('inquirer/editorial-staging/'+suffix,{type:'json'}),
 store.get('inquirer/editorial-approvals/'+suffix,{type:'json'}),
 store.get('broadcasts/'+suffix,{type:'json'}),
 store.get('broadcasts/index.json',{type:'json'})
]);
assert(stage?.edition?.teams?.length===32,'Missing completed Week 5 production staging manuscript');
assert.equal(Number(stage.season),season);
assert.equal(Number(stage.week),week);
const digest=editorialCopyDigest(stage.edition),audit=inspectEditionBeforePublication(stage.edition);
const result={
 site_id:siteID,season,week,staged:true,sha256:digest,
 digest_matches_stage:digest===stage.digest,
 editorial_revision:stage.edition.editorial_revision,
 generation_quality_ok:stage.generation_quality?.ok===true,
 audit_ok:audit.ok,
 audit_findings:audit.issues.length,
 team_count:stage.edition.teams.length,
 reporter_count:new Set(stage.edition.teams.map(t=>t.inquirer_article?.reporter?.id).filter(Boolean)).size,
 recap_present:!!stage.edition.league_overview?.headline,
 already_approved:approval?.approved===true,
 already_published:published?.available===true&&published?.published_locked===true,
 index_contains_week:Array.isArray(index)&&index.some(x=>Number(x.season)===season&&Number(x.week)===week),
 generated_at:stage.generated_at||null,
 note:'Read-only inspection only. No manuscript exported and no approval or publication performed.'
};
console.log('STAGED_INQUIRER_READONLY_PREFLIGHT '+JSON.stringify(result));
assert(result.digest_matches_stage,'Digest mismatch: stage must not be approved');
assert(result.generation_quality_ok&&result.audit_ok,'Stage fails editorial guards');
assert(!result.already_published,'Week 5 already published: verify site before any approval attempt');
