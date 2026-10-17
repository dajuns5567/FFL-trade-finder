// Read-only quality gate for future Inquirer editorial drafts, calibrated against Week 4 v19.
// No edits, publication, external access, or automatic approval.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const [file,baselineFile]=process.argv.slice(2);
assert(file&&baselineFile,'Usage: node scripts/check-future-inquirer-quality.mjs <candidate.json> <week4-baseline.json>');
const input=JSON.parse(fs.readFileSync(file,'utf8'));
const calibration=process.argv.includes('--edition-map');
const candidate=calibration?input['4']:input;
assert(candidate?.teams?.length===32,'A complete 32-team editorial candidate is required');
const baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));
assert.equal(baseline.articles?.length,32,'Accepted baseline corrupted');
assert.equal(candidate.teams?.length,32,'Candidate must cover all 32 teams');
const norm=s=>String(s||'').trim();
const articles=candidate.teams.map(t=>({name:norm(t.team_name),article:t.inquirer_article}));
const uniqueTeams=new Set(articles.map(t=>t.name)).size===32;
if(!calibration)assert(uniqueTeams,'Duplicate or unnamed team');
const accepted=baseline.articles.map(a=>({name:norm(a.team),paragraphs:(a.sections||[]).flatMap(s=>s.paragraphs||[])}));
const approvedNames=new Set(accepted.map(a=>a.name));
const nameCoverage=articles.every(a=>approvedNames.has(a.name));
// Team labels may legitimately change between NFL weeks; Week 4 names are calibration context, not a future-week identity lock.
let paragraphCount=0;const problems=[];
if(!uniqueTeams)problems.push({reason:'duplicate or unnamed teams'});
if(!nameCoverage&&calibration)problems.push({reason:'team names differ from accepted Week 4'});
const collect=(value,out)=>{if(Array.isArray(value))value.forEach(v=>collect(v,out));else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){if(k==='paragraphs'&&Array.isArray(v))v.forEach(p=>{if(typeof p==='string')out.push(norm(p))});collect(v)}};
for(const team of articles){
 if(!team.article||typeof team.article!=='object'){problems.push({team:team.name,reason:'article missing'});continue}
 const paras=[];collect(team.article,paras);
 const meaningful=paras.filter(p=>p.length>=50);
 paragraphCount+=meaningful.length;
 if(meaningful.length<6)problems.push({team:team.name,reason:'fewer than six substantive paragraphs'});
 if(meaningful.some(p=>/\b(?:TBD|TODO|lorem ipsum|insert analysis here)\b/i.test(p)))problems.push({team:team.name,reason:'placeholder editorial text'});
 if(new Set(meaningful).size!==meaningful.length)problems.push({team:team.name,reason:'duplicate paragraphs'});
}
const summary={teams:articles.length,meaningful_paragraphs:paragraphCount,problems:problems.length,reference:'Week 4 v19 coverage and minimum completeness; not a prose quality score'};
console.log('FUTURE INQUIRER EDITORIAL GATE '+JSON.stringify(summary));
if(problems.length){console.error('FUTURE INQUIRER EDITORIAL '+(calibration?'CALIBRATION FINDINGS ':'HOLD ')+JSON.stringify(problems));if(!calibration)process.exitCode=1}
if(calibration)console.log('FUTURE INQUIRER THRESHOLD CALIBRATION COMPLETE; not a publisher approval');
