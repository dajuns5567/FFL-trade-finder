import assert from 'node:assert/strict';
import {evaluateFutureEditorialRelease} from '../netlify/functions/inquirer-future-release-guard.mjs';

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
  league_overview:{future_recap_brief_status:'COMPLETE_UNAPPROVED',sections:[{blocks}]}
 };
};
const approval={approved:true,season:2026,week:5,reviewed_by:'Fixture Desk',reviewed_at:'2026-10-14T00:00:00Z'};
const reference={season:2026,week:4,teams:Array.from({length:32},(_,i)=>({team_name:'Team '+i,inquirer_article:{sections:[]}})),league_overview:{sections:[]}};
const evaluate=(candidate,prior=reference)=>evaluateFutureEditorialRelease(candidate,prior,{approval});
const e=mk();
const accepted=evaluate(e);
assert.equal(accepted.ok,true,JSON.stringify(accepted.issues.slice(0,10)));
const prior=mk();prior.week=4;
assert.match(evaluate(mk(),prior).issues.join('|'),/recycled last-week sentence/);
assert.match(evaluateFutureEditorialRelease(mk(),null,{approval}).issues.join('|'),/immediately previous accepted full edition/);
const unsigned=evaluateFutureEditorialRelease(mk());
assert.match(unsigned.issues.join('|'),/approval attestation required/);
const noBrief=mk();noBrief.teams[0].inquirer_article.future_brief_status='MISSING_OR_FACT_MISMATCH';
assert.match(evaluate(noBrief).issues.join('|'),/fresh section brief/);
const noJokes=mk();for(const t of noJokes.teams)t.inquirer_article.sections.find(s=>s.kind==='sentiment').paragraphs=['Crowd mood: 15.0. Fans should remain calm.'];
assert.match(evaluate(noJokes).issues.join('|'),/hypothetical sports-fan scene/);
const altered=mk();altered.teams[0].points=201;
assert.match(evaluate(altered).issues.join('|'),/lede does not identify/);
const recap=mk();recap.league_overview.future_recap_brief_status='MISSING_OR_INCOMPLETE';
assert.match(evaluate(recap).issues.join('|'),/fresh complete recap brief missing/);
console.log('PASS: editorial release guard accepts complete fixture, blocks stale, weak, fact-mismatched and missing recap editions');
