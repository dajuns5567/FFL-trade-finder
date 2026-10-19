import test from 'node:test';
import assert from 'node:assert/strict';
import {repairNewEditionCopy} from '../netlify/functions/inquirer-editorial-collision-repair.mjs';
import {adaptWeekLanguage,evaluateInquirerEditionQuality} from '../netlify/functions/inquirer-editorial-v31.mjs';
test('future-week duplicate copy is replaced with scoreboard facts without disabling the strict editorial gate',()=>{
 const sentence='The next Sunday can improve the wording if it objects, but the team still has to answer the same stale argument every week without any individual matchup evidence.';
 const teams=Array.from({length:4},(_,i)=>({
  roster_id:String(i+1),team_name:['Alphas','Bruins','Cobras','Dragons'][i],
  opponent_name:['Dragons','Cobras','Bruins','Alphas'][i],
  points:140+i*3,opponent_points:128+i,
  starter_details:[],
  inquirer_article:{reporter:{id:i%2?'mack-hollis':'tess-delaney'},sections:[{kind:'lede',paragraphs:[sentence]}],paragraphs:[sentence]}
 }));
 const before=evaluateInquirerEditionQuality({teams,league_overview:{sections:[]}},null);
 assert(before.issues.some(x=>x.id==='cross-team-copy-scaffold'));
 const result=repairNewEditionCopy({inquirer:{teams},leagueOverview:{sections:[]}},null,5,evaluateInquirerEditionQuality);
 assert.equal(result.verdict.ok,true,JSON.stringify(result.verdict.issues));
 assert(result.replacements>=3);
 const paragraphs=result.edited.inquirer.teams.map(t=>t.inquirer_article.paragraphs[0]);
 assert.equal(new Set(paragraphs).size,4);
 assert(paragraphs.some(p=>/fantasy points/.test(p)&&/143\.00/.test(p)));
});

test('future-week editorial gate rejects Week 2 record leakage and mandated scoring trios',()=>{
 const current={week:5,teams:[{roster_id:'1',team_name:'Test Team',inquirer_article:{paragraphs:['A specific and otherwise acceptable team paragraph.']}}],league_overview:{sections:[
  {heading:'What Actually Mattered This Week',blocks:Array.from({length:3},(_,i)=>({heading:'Game '+i,paragraphs:['A — 12 fantasy points\nB — 10 fantasy points\nC — 8 fantasy points']})),paragraphs:['The 2-0 club now includes Test Team.']}
 ]}};
 const audit=evaluateInquirerEditionQuality(current);
 assert(audit.issues.some(x=>x.id==='recap-week2-record-language'));
 assert(audit.issues.some(x=>x.id==='recap-mandatory-scorer-trios'));
});

test('future-week editorial gate catches sentence-template repetition despite different team labels',()=>{
 const teams=Array.from({length:3},(_,i)=>({roster_id:String(i+1),team_name:'Club '+i,inquirer_article:{paragraphs:[
  'Club '+i+' came out of the previous matchup with a defeat; the next Sunday changes the season sample; it does not simply photocopy the first conclusion.'
 ]}}));
 const audit=evaluateInquirerEditionQuality({week:5,teams,league_overview:{sections:[]}});
 assert(audit.issues.some(x=>x.id==='repeated-team-editorial-template'));
});

test('future weeks never describe the prior week as the season opener',()=>{
 const copy=adaptWeekLanguage('That opener belongs in the comparison. A week earlier was Week 1. In the opener, the opponent won.',5,{});
 assert(!/\bopener\b/i.test(copy),copy);
 assert.match(copy,/Week 4/);
});

test('32-team editorial gate prevents bench and screenshot fan-commentary monoculture',()=>{
 const teams=Array.from({length:32},(_,i)=>({
  roster_id:String(i+1),team_name:'Club '+(i+1),
  inquirer_article:{paragraphs:[`Club ${i+1} has a distinct result to explain.`],sections:[{
   kind:'sentiment',paragraphs:[`Club ${i+1} supporters are screaming about a player sitting behind somebody else. A lineup screenshot has become their whole personality.`,
    'Their crowd reaction should be specific to a result and not just repeat the same bench choice.']
  }]}
 }));
 const audit=evaluateInquirerEditionQuality({week:5,teams,league_overview:{sections:[]}});
 assert(audit.issues.some(x=>x.id==='fan-bench-subject-monoculture'));
 assert(audit.issues.some(x=>x.id==='fan-screenshot-monoculture'));
});
