import test from 'node:test';
import assert from 'node:assert/strict';
import {auditInquirerLanguage} from '../netlify/functions/lib/inquirer-editorial-language-audit.mjs';
const kinds=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
function draft(){
 return{season:2026,week:5,teams:Array.from({length:32},(_,i)=>({
  roster_id:String(i+1),team_name:'Team '+(i+1),inquirer_article:{
   reporter:{id:'writer-'+Math.floor(i/8)},headline:'Different angle for roster '+i,
   sections:kinds.map((kind,k)=>({kind,paragraphs:[
    'Team '+i+' has a specific '+kind+' fact '+k+'. '+Array.from({length:18},(_,j)=>'word'+i+'f'+k+'x'+j).join(' ')+'.'
   ]}))}
 }))};
}
test('distinct articles and four reporters pass language mechanics, with subjective voice still pending',()=>{
 const result=auditInquirerLanguage(draft());
 assert.equal(result.ok,true,JSON.stringify(result.issues));
 assert.equal(result.stats.article_count,32);
 assert.equal(result.reviewer_required,true);
});
test('copied long language over five teams fails even with changed team names',()=>{
 const e=draft();
 const phrase='The dreadful performance gave fans another full night of complaints and the manager offered absolutely nothing worth celebrating beyond another exhausted excuse.';
 for(let i=0;i<6;i++)e.teams[i].inquirer_article.sections[3].paragraphs.push(phrase);
 assert.equal(auditInquirerLanguage(e).issues.some(x=>x.id==='cross-team-long-language-reuse'),true);
});
test('prior-week verbatim prose, copied ledes and robotic filler are identified',()=>{
 const e=draft(),prior=draft();prior.week=4;
 const repeated='The manager also failed to explain how this roster collapsed despite the bright lights of a supposedly favorable draw.';
 e.teams[0].inquirer_article.sections[0].paragraphs.push(repeated);
 e.teams[0].inquirer_article.sections[1].paragraphs.push('As an AI, I conclude the algorithm likes this manager.');
 prior.teams[0].inquirer_article.sections[0].paragraphs.push(repeated);
 prior.teams[0].inquirer_article.sections[2].paragraphs.push(e.teams[0].inquirer_article.sections[2].paragraphs[0]);
 const issues=auditInquirerLanguage(e,prior).issues;
 assert.ok(issues.some(x=>x.id==='recycled-prior-week-paragraphs'),JSON.stringify(issues));
 assert.ok(issues.some(x=>x.id==='robotic-editorial-meta-copy'));
});


test('two clubs cannot recycle the same newsroom joke, and week 5 cannot regress to first-two-game outlook language',()=>{
 const e=draft();
 const line='The Week 5 noise came from a real speaker and not somebody dropping a pan.';
 e.teams[0].inquirer_article.sections[7].paragraphs.push(line);
 e.teams[1].inquirer_article.sections[7].paragraphs.push(line);
 e.teams[2].inquirer_article.sections[7].paragraphs.push('The next Sunday is a new roster test, not a rerun of the first two.');
 const issues=auditInquirerLanguage(e).issues;
 assert.ok(issues.some(x=>x.id==='recycled-editorial-punchline'),JSON.stringify(issues));
 assert.ok(issues.some(x=>x.id==='stale-opening-weeks-outlook'),JSON.stringify(issues));
});


test('a winless scoreless lineup must not be described as useful player production',()=>{
 const e=draft();
 e.teams[0].points=0;
 e.teams[0].inquirer_article.sections[0].paragraphs.push('The Chiefs got something from Michael Burton, but not much else.');
 assert.ok(auditInquirerLanguage(e).issues.some(x=>x.id==='zero-point-roster-false-credit'));
});

test('weekly recap rejects unsupported closeness, incomplete divisions and stale tabloid syntax',()=>{
 const e=draft();
 e.league_overview={sections:[
  {blocks:['lead','standings','players','decisions','league','outlook'].map(kind=>({kind,paragraphs:['Reporting']}))},
  {paragraphs:['Reporter two']},{paragraphs:['Reporter three']},{paragraphs:['Reporter four']}
 ],hot_takes:[{kind:'division',take:'AFC EAST: Clubs at 1-4 remain close enough to 4-1 leaders. NFC SOUTH: The gap is real but thin; one stumble turns the leader from front-runner into participant again.'},
 {kind:'upset',title:'Upset',take:'Baltimore Ravens over Indianapolis Colts are the Week 6 upset call.'}]};
 const issues=auditInquirerLanguage(e).issues.map(x=>x.id);
 assert.ok(issues.includes('recap-missing-division-report'));
 assert.ok(issues.includes('recap-misleading-standings-gap'));
 assert.ok(issues.includes('recap-misleading-division-lead'));
 assert.ok(issues.includes('recap-upset-syntax'));
});
