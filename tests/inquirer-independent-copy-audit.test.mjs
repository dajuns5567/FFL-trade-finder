import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditIndependentInquirerCopy} from '../netlify/functions/lib/inquirer-independent-copy-audit.mjs';
const kinds=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
const beats=['lead','standings','players','decisions','league','outlook'];
function edition(week){return {week,season:2026,editorial_revision:107,preview_only:true,published_locked:false,
 preview_editorial_audit:{ok:true},preview_generation_quality:{ok:true},
 teams:Array.from({length:32},(_,i)=>({roster_id:i+1,team_name:'Team '+(i+1),league_context:{recent_games:[{week:week-1,result:'L'}]},
 inquirer_article:{headline:'Team '+(i+1)+' Week '+week,reporter:{id:'r'+Math.floor(i/8)},
 sections:kinds.map(k=>({kind:k,paragraphs:['Lineup '+i+' Week '+week+' earned a careful and specific football report with the exact recorded starters on the scoreboard.']}))}})),
 league_overview:{sections:[{blocks:beats.map(kind=>({kind,paragraphs:['Week '+week+' league recap on the actual results']}))},
 {paragraphs:['Results under review']},{paragraphs:['Next schedules']},{paragraphs:['Standings context']}],hot_takes:[]}};}
test('independent gate accepts factual, complete, distinct weekly copy',()=>{
 assert.equal(auditIndependentInquirerCopy([edition(7),edition(8)]).ok,true);
});
test('detects true revision-105 copy failures that passed generator audits',()=>{
 const w7=edition(7),w8=edition(8);
 w7.teams[0].inquirer_article.sections[2].paragraphs=['the final score against New York Jets do not erase that work'];
 w7.teams[2].inquirer_article.sections[3].paragraphs=[' '];
 w8.teams[3].inquirer_article.headline='Team 4 Win Again, Which Is How Expectations Get Expensive';
 w8.league_overview.hot_takes=[{take:'Forget the preamble: One. Forget the preamble: Two.'}];
 const audit=auditIndependentInquirerCopy([w7,w8]);
 assert.equal(audit.ok,false);
 for(const id of ['singular-score-agreement','blank-reader-paragraph','false-consecutive-win','repeated-hot-take-preface'])
  assert.ok(audit.issues.some(issue=>issue.id===id),id);
});

test('Week 9+ publication admission independently blocks broken prose without preview flags',()=>{
 const candidate=edition(9);
 delete candidate.preview_only;
 candidate.published_locked=true;
 delete candidate.preview_editorial_audit;
 delete candidate.preview_generation_quality;
 assert.equal(auditIndependentInquirerCopy([candidate],{mode:'publication'}).ok,true);
 candidate.league_overview.sections[0].blocks[0].paragraphs=['of which 1 were decided within five fantasy points'];
 const audit=auditIndependentInquirerCopy([candidate],{mode:'publication'});
 assert.equal(audit.ok,false);
 assert.ok(audit.issues.some(x=>x.id==='singular-recap-quantifier'));
});
test('live weekly writer checks independent copy before persistent archive writes',()=>{
 const source=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const call=source.indexOf("auditIndependentInquirerCopy([result],{revision:FORWARD_EDITORIAL_REVISION,mode:'publication'})");
 const persist=source.indexOf('await s.setJSON(key,result)',call);
 assert.ok(call>0&&persist>call,'independent admission must run before publishing');
 assert.match(source,/!independentCopy\.ok/);
 assert.match(source,/currentPublisherSite&&week>=9/);
});


test('private Week 8 checks the independently approved same-revision Week 7 before saving completion',()=>{
 const source=readFileSync(new URL('../netlify/functions/inquirer-preview-background.mjs',import.meta.url),'utf8');
 const gate=source.indexOf('auditIndependentInquirerCopy([previous,edition],{revision:FORWARD_EDITORIAL_REVISION})');
 const write=source.indexOf('const write=await store.setJSON(identity.edition,edition');
 assert.ok(gate>0&&write>gate,'independent copy gate must reject before saved completion');
 assert.match(source,/if\(!independent\.ok\)/);
 assert.match(source,/identity\.season===2026&&identity\.week===8/);
});

test('mirrored recap beat and flat paragraphs count as one editorial occurrence',()=>{
 const copy=edition(8),first=copy.league_overview.sections[0];
 first.blocks[0].paragraphs=['The next opponent will get a fresh lineup, not a prewritten final score.'];
 first.paragraphs=first.blocks.flatMap(block=>block.paragraphs);
 const issues=auditIndependentInquirerCopy([copy]).issues.filter(x=>x.id==='meta-editorial-caveat');
 assert.equal(issues.length,1);
});
test('recap source and one-time private retry address the actual rejected Week 8 phrase without production writes',()=>{
 const editorial=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(editorial,/That is useful flexibility, not repetition/);
 const retry=readFileSync(new URL('../netlify/functions/inquirer-private-audit-on-deploy.mjs',import.meta.url),'utf8');
 assert.match(retry,/inquirer-private-week8-status/);
 assert.match(retry,/rejected-review\.json/);
 assert.doesNotMatch(retry,/generateInquirerPreview\(new Request\(url\)\)/);
 assert.doesNotMatch(retry,/onlyIfNew:true/);
 assert.match(retry,/event\?\.deploy\?\.context!=='deploy-preview'/);
 assert.match(retry,/precious-dango-fb4633\.netlify\.app/);
});
