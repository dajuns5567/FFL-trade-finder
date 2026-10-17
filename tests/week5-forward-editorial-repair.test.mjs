import test from 'node:test';
import assert from 'node:assert/strict';
import {repairNewEditionCopy} from '../netlify/functions/inquirer-editorial-collision-repair.mjs';
import {evaluateInquirerEditionQuality} from '../netlify/functions/inquirer-editorial-v31.mjs';
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
 assert(paragraphs.some(p=>/fantasy points/.test(p)&&/140\.00/.test(p)));
});
