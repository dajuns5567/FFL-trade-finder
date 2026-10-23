// Offline-only copy promotion preflight. No Netlify keys, network, Blob writes,
// approval creation, lock mutation, scheduler activation, or deploy.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectEditionBeforePublication,editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';
const digest=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function inspectImmutableWeekCandidate(original,candidate){
 const failures=[],changes=[];
 if(Number(original?.season)!==2026||Number(original?.week)!==5||Number(candidate?.season)!==2026||Number(candidate?.week)!==5)
  failures.push('Only the authenticated 2026 Week 5 source and Week 5 candidate are permitted');
 if(original?.published_locked!==false||candidate?.published_locked!==false)
  failures.push('Source and candidate must remain explicitly unpublished');
 if(original?.preview_only!==true||candidate?.preview_only!==true)
  failures.push('A private deploy-local manuscript and private candidate are required');
 if(Number(original?.editorial_revision)!==Number(candidate?.editorial_revision))
  failures.push('Candidate changed original editorial provenance');
 const a=Array.isArray(original?.teams)?original.teams:[],b=Array.isArray(candidate?.teams)?candidate.teams:[];
 if(a.length!==32||b.length!==32)failures.push('Exactly 32 team records required');
 const indexed=new Map(b.map(x=>[String(x.roster_id),x]));
 if(indexed.size!==32)failures.push('Candidate roster IDs are not unique');
 for(const team of a){
  const next=indexed.get(String(team.roster_id));
  if(!next){failures.push('Missing roster '+team.roster_id);continue}
  // Only editorial article text may change; every other team fact is immutable.
  const strip=x=>Object.fromEntries(Object.entries(x).filter(([k])=>k!=='inquirer_article'));
  if(digest(strip(team))!==digest(strip(next)))failures.push('Fact or context modified in roster '+team.roster_id);
  if(digest(team.inquirer_article)!==digest(next.inquirer_article))changes.push('article:'+team.roster_id);
 }
 if(digest(original?.reporters)!==digest(candidate?.reporters))failures.push('Reporter directory altered');
 const oldRecap=original?.league_overview||{},newRecap=candidate?.league_overview||{};
 const omitRecap=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['sections','hot_takes'].includes(k)));
 if(digest(omitRecap(oldRecap))!==digest(omitRecap(newRecap)))failures.push('Recap metadata/provenance changed');
 if(digest(oldRecap.sections)!==digest(newRecap.sections))changes.push('recap:sections');
 if(digest(oldRecap.hot_takes)!==digest(newRecap.hot_takes))changes.push('recap:hot_takes');
 const record=(e)=>Object.fromEntries(Object.entries(e).filter(([k])=>!['teams','league_overview'].includes(k)));
 if(digest(record(original))!==digest(record(candidate)))failures.push('Root source metadata modified');
 for(const t of b){
  const sections=t.inquirer_article?.sections||[],flat=sections.flatMap(s=>s.paragraphs||[]);
  if(JSON.stringify(flat)!==JSON.stringify(t.inquirer_article?.paragraphs||[]))
   failures.push('Article mirror differs for roster '+t.roster_id);
 }
 const six=['lead','standings','players','decisions','league','outlook'];
 const blocks=newRecap?.sections?.[0]?.blocks||[];
 if(six.join('|')!==blocks.map(x=>x.kind).join('|'))failures.push('Recap six beat order changed');
 if(JSON.stringify(blocks.flatMap(x=>x.paragraphs||[]))!==JSON.stringify(newRecap?.sections?.[0]?.paragraphs||[]))
  failures.push('Recap paragraph mirror mismatch');
 const admission=inspectEditionBeforePublication(candidate);
 if(!admission.ok)failures.push('Independent editorial admission found '+admission.issues.length+' issue(s)');
 return{safe_to_consider_for_manual_review:failures.length===0,
  publication_authorized:false,never_activate_scheduler:true,failures,
  editorial_issues:admission.issues,changes,original_digest:editorialCopyDigest(original),
  candidate_digest:editorialCopyDigest(candidate),source_sha256:digest(original),
  candidate_sha256:digest(candidate)};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const original=JSON.parse(readFileSync(process.argv[2],'utf8'));
 const candidate=JSON.parse(readFileSync(process.argv[3],'utf8'));
 const outcome=inspectImmutableWeekCandidate(original,candidate);
 process.stdout.write(JSON.stringify(outcome,null,2)+'\n');
 if(!outcome.safe_to_consider_for_manual_review)process.exitCode=1;
}
