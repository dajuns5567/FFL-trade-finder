import assert from 'node:assert/strict';
import {evaluateFutureEditorialRelease,editorialManifestDigest} from '../netlify/functions/inquirer-future-release-guard.mjs';

const alias=i=>String.fromCharCode(65+i%26)+String.fromCharCode(65+Math.floor(i/26));
const filler=(i,k)=>'The manager must answer for the actual outcome on this roster, and the supporters deserve a specific explanation about the performance of club '+alias(i)+' in the '+k+' column. ';
const mkArticle=i=>({
 reporter:{id:['walter-mercer','mack-hollis','nora-voss','tess-delaney'][i%4]},
 future_brief_status:'COMPLETE_UNAPPROVED',
 fan_sentiment:{score:15},
 sections:['lede','players','management','hot-seat','cool-throne','sentiment','outlook'].map(kind=>({
  kind,paragraphs:[kind==='lede'?'Team '+i+' beat Opponent '+i+' 102.0–88.0. '+filler(i,kind).repeat(2):
   kind==='players'?'Starter '+i+' (32.0 pts) earned the applause. '+filler(i,kind).repeat(2):
   kind==='sentiment'?'Crowd mood: 15.0. At the imaginary parade in club '+alias(i)+', supporters ask whether the manager deserves trust. '+filler(i,kind).repeat(3):
   kind==='outlook'?'Next opponent: Next '+i+'. '+filler(i,kind).repeat(2):filler(i,kind).repeat(3)]
 }))
});
const mk=()=>{
 const teams=Array.from({length:32},(_,i)=>({
  team_name:'Team '+i,points:102,opponent_points:88,
  next_opponent_name:'Next '+i,starter_details:[{name:'Starter '+i,points:32}],
  inquirer_article:mkArticle(i)
 }));
 const kinds=['lead','standings','players','decisions','league','outlook'];
 const blocks=kinds.map(k=>({kind:k,paragraphs:Array.from({length:3},(_,j)=>'The '+k+' desk examines a different verified result and demands the manager answer difficult questions. Club '+j+' gets the result, but the coach must still justify the decisions on the scorecard for this '+k+' report. ')}));
 return {
  season:2026,week:5,teams,
  editorial_quality:{status:'HOLD_EDITORIAL_APPROVAL',fresh_briefs_complete:true,review_required:true},
  league_overview:{future_recap_brief_status:'COMPLETE_UNAPPROVED',editorial_review_required:true,sections:[{blocks}]}
 };
};
const manifest={season:2026,week:5,teams:{fictional:true},recap:{lead:[]}};
const approval={approved:true,season:2026,week:5,reviewed_by:'Fixture Desk',reviewed_at:'2026-10-14T00:00:00Z',content_sha256:editorialManifestDigest(manifest)};
const reference={season:2026,week:4,teams:Array.from({length:32},(_,i)=>({team_name:'Team '+i,inquirer_article:{sections:[]}})),league_overview:{sections:[]}};
const evaluate=(candidate,prior=reference)=>evaluateFutureEditorialRelease(candidate,prior,{approval,manifest});
const e=mk();
const accepted=evaluate(e);
assert.equal(accepted.ok,true,JSON.stringify(accepted.issues.slice(0,10)));
const prior=mk();prior.week=4;
assert.match(evaluate(mk(),prior).issues.join('|'),/recycled last-week sentence/);
assert.match(evaluateFutureEditorialRelease(mk(),null,{approval}).issues.join('|'),/immediately previous accepted full edition/);
const unsigned=evaluateFutureEditorialRelease(mk());
assert.match(unsigned.issues.join('|'),/approval attestation required/);
const changedManifest={...manifest,recap:{lead:['changed after signoff']}};
assert.match(evaluateFutureEditorialRelease(mk(),reference,{approval,manifest:changedManifest}).issues.join('|'),/digest does not match/);
const wrongScope={...manifest,week:6};
assert.match(evaluateFutureEditorialRelease(mk(),reference,{approval,manifest:wrongScope}).issues.join('|'),/manifest scope or structure invalid/);
const wrongPrevious={...reference,week:3};
assert.match(evaluate(mk(),wrongPrevious).issues.join('|'),/immediately previous accepted full edition/);
const noBrief=mk();noBrief.teams[0].inquirer_article.future_brief_status='MISSING_OR_FACT_MISMATCH';
assert.match(evaluate(noBrief).issues.join('|'),/fresh section brief/);
const variedScene=mk();
variedScene.teams[0].inquirer_article.sections.find(x=>x.kind==='sentiment').paragraphs[0]=variedScene.teams[0].inquirer_article.sections.find(x=>x.kind==='sentiment').paragraphs[0].replace('At the imaginary parade','Picture the museum');
assert.equal(evaluate(variedScene).ok,true,'A different obviously hypothetical fan scene should pass without forcing the same imaginary-parade wording');
const noJokes=mk();for(const t of noJokes.teams)t.inquirer_article.sections.find(s=>s.kind==='sentiment').paragraphs=['Crowd mood: 15.0. Fans should remain calm.'];
assert.match(evaluate(noJokes).issues.join('|'),/hypothetical sports-fan scene/);
const playerMislabel=mk();playerMislabel.teams[0].inquirer_article.sections.find(x=>x.kind==='players').paragraphs[0]=playerMislabel.teams[0].inquirer_article.sections.find(x=>x.kind==='players').paragraphs[0].replace('(32.0 pts)','(99.0 pts)')+' Starter 0 (32.0 pts) helped.';
assert.match(evaluate(playerMislabel).issues.join('|'),/annotated starter score conflicts with source/);
const altered=mk();altered.teams[0].points=201;
assert.match(evaluate(altered).issues.join('|'),/lede does not identify/);
const recap=mk();recap.league_overview.future_recap_brief_status='MISSING_OR_INCOMPLETE';
assert.match(evaluate(recap).issues.join('|'),/fresh complete recap brief missing/);
const voices=mk();for(const t of voices.teams)t.inquirer_article.reporter.id='same-person';
assert.match(evaluate(voices).issues.join('|'),/four distinct reporter voices/);
const repetitiveRecap=mk();
repetitiveRecap.league_overview.sections[0].blocks[1].paragraphs=[...repetitiveRecap.league_overview.sections[0].blocks[0].paragraphs];
assert.match(evaluate(repetitiveRecap).issues.join('|'),/identical reporting reused across/);
console.log('PASS: editorial release guard accepts complete fixture, blocks stale, weak, fact-mismatched and missing recap editions');
