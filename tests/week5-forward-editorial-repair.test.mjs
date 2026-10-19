import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
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

test('editorial gate rejects shared ten-word sarcastic clauses even under one reporter',()=>{
 const suffix='get another Sunday to prove the Week 5 noise came from a real speaker and not somebody dropping a pan.';
 const teams=Array.from({length:4},(_,i)=>({roster_id:String(i+1),team_name:'Club '+i,inquirer_article:{reporter:{id:'mack-hollis'},paragraphs:[`The fans of Club ${i} ${suffix}`],sections:[{kind:'outlook',paragraphs:[`The fans of Club ${i} ${suffix}`]}]}}));
 const edition={week:5,teams,league_overview:{sections:[]}};
 assert(evaluateInquirerEditionQuality(edition).issues.some(x=>x.id==='cross-team-clause-scaffold'));
 const result=repairNewEditionCopy({inquirer:{teams},leagueOverview:{sections:[]}},null,5,evaluateInquirerEditionQuality);
 // Missing matchup facts must never be silently invented to placate the gate.
 assert(result.verdict.issues.some(x=>x.id==='cross-team-clause-scaffold'));
});

test('editorial gate catches a long copy-pasted punchline in only two articles',()=>{
 const punch='The fans can keep this ridiculous argument until the next Sunday proves that somebody actually learned the lesson instead of repeating the performance for an exhausted audience.';
 const teams=['Club North','Club South'].map((team,i)=>({roster_id:String(i+1),team_name:team,inquirer_article:{paragraphs:[`For ${team}, ${punch}`]}}));
 assert(evaluateInquirerEditionQuality({week:5,teams,league_overview:{sections:[]}}).issues.some(x=>x.id==='paired-editorial-clause-scaffold'));
});

test('recap section titles are actual accessible headings',()=>{
 const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
 assert.match(source,/<h2 class="lh-inquirer-story-heading">/);
});

test('dated MIDA probabilities cannot masquerade as fresh weekly forecasts',()=>{
 const old=new Date(Date.now()-25*86400000).toISOString();
 const edition={week:5,teams:[{team_name:'Club A',roster_id:'1',mida_outlook:{source_date:old,title:30},inquirer_article:{paragraphs:[]}}],league_overview:{sections:[],hot_takes:[{take:'MIDA currently puts the title chance at 30%.'}]}};
 assert(evaluateInquirerEditionQuality(edition).issues.some(x=>x.id==='stale-forecast-presented-as-current'));
});

test('the subject, not an intervening plural team name, governs agreement',()=>{
 const sentence='The radio station covering New England Patriots have declared its phone lines a public utility.';
 const edition={week:5,teams:[{roster_id:'1',team_name:'New England Patriots',inquirer_article:{paragraphs:[sentence],sections:[{kind:'sentiment',paragraphs:[sentence]}]}}],league_overview:{sections:[]}};
 assert(evaluateInquirerEditionQuality(edition).issues.some(x=>x.id==='intervening-team-subject-agreement'));
 const correct='The radio station covering New England Patriots has declared its phone lines a public utility. The AFC EAST race around New England Patriots is already compressed.';
 edition.teams[0].inquirer_article.paragraphs=[correct];
 edition.teams[0].inquirer_article.sections[0].paragraphs=[correct];
 assert(!evaluateInquirerEditionQuality(edition).issues.some(x=>x.id==='plural-team-agreement'));
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

test('Week 5 and later Fan Sentiment labels follow the article week and prior archived week',()=>{
 const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
 const start=source.indexOf('function fanSentimentMeter(t,a){'),end=source.indexOf('\nfunction storedInquirerArticle(',start);
 assert(start>=0&&end>start);
 const render=runInNewContext(source.slice(start,end)+'\nfanSentimentMeter',{esc:String});
 for(const week of [3,5,6,14,17]){
  const actual=render({previous_fan_sentiment:{score:-12}},{week,fan_sentiment:{score:48,title:'Ready to parade'}});
  assert.match(actual,new RegExp('Gold = Week '+week));
  assert.match(actual,new RegExp('Gray = Week '+(week-1)));
  assert.match(actual,new RegExp('from Week '+(week-1)));
  assert(!actual.includes('Gold = Week 2'));
 }
 const noPrior=render({previous_fan_sentiment:null},{week:5,fan_sentiment:{score:30}});
 assert(!noPrior.includes('Gray ='));
 assert(!noPrior.includes('from Week'));
});

test('editorial quality gate rejects repeated recap arguments, stale hot takes and visible bad grammar',()=>{
 const repeat='The manager made this choice, and it deserves a specific explanation instead of the same speech every week.';
 const edition={week:5,teams:[{roster_id:'1',team_name:'Houston Texans',inquirer_article:{sections:[
  {kind:'lede',heading:'this Sunday, Properly Dressed',paragraphs:['Houston Texans sits in the conference. A 8.3-point edge is not decisive.']}
 ],paragraphs:['Houston Texans sits in the conference. A 8.3-point edge is not decisive.']}}],league_overview:{sections:[{heading:'What Actually Mattered This Week',paragraphs:[repeat,repeat]}],hot_takes:[
  {title:'Title call',take:'A title or fraud argument must not borrow an undefeated claim from Week 2.'},
  {title:'Danger sign',take:'A title or fraud argument must not borrow an undefeated claim from Week 2.'}
 ]}};
 const ids=evaluateInquirerEditionQuality(edition).issues.map(x=>x.id);
 for(const id of ['reader-facing-grammar','uncapitalized-section-heading','recap-recycled-week2-hot-take','recap-duplicate-hot-take-argument','recap-duplicate-commentary'])
  assert(ids.includes(id),id+' not rejected: '+ids.join(','));
});
