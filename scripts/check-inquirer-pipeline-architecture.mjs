import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=f=>fs.readFileSync(f,'utf8');
const analysis=read('netlify/functions/inquirer-evidence-analysis.mjs');
const writer=read('netlify/functions/inquirer-narrative-final.mjs');
const rebuild=read('netlify/functions/inquirer-week4-editorial-rebuild.mjs');
const gate=read('scripts/inquirer-future-quality-gate.mjs');
const ci=read('.github/workflows/inquirer-future-newsroom-regression.yml');
const production=read('netlify/functions/league-hub.mjs');
const weekly=production.slice(production.indexOf('export async function weeklyReport(req)'));
const expected=[
 ['legacy authors isolated',analysis.includes('const recapWorkspace=')&&analysis.includes('edition.league_overview=recapWorkspace.league_overview')],
 ['only final team writer in evidence pipeline',(analysis.match(/finalizeInquirerNarrative\(edition/g)||[]).length===1],
 ['finalization after recap workspace',analysis.indexOf('finalizeInquirerNarrative(edition')>analysis.indexOf('edition.league_overview=recapWorkspace.league_overview')],
 ['future brief scoped to week greater than four',writer.includes('if(week>4){')&&writer.includes('future_editorial_briefs')],
 ['future brief rejects mismatched scores',writer.includes('Number(brief.team_points)===own&&Number(brief.opponent_points)===against')],
 ['future brief matches reporter and opponent',writer.includes('brief.opponent===next&&brief.reporter_id===reporter')],
 ['future recap is complete or held',writer.includes("future_recap_brief_status=complete?'COMPLETE_UNAPPROVED':'MISSING_OR_INCOMPLETE'")],
 ['future issue always marked editorial hold',writer.includes("status:'HOLD_EDITORIAL_APPROVAL'")],
 ['future issue requires cross-week comparison',gate.includes('PREVIOUS_ACCEPTED_EDITION_REQUIRED')],
 ['future issue rejects unapproved briefs',gate.includes('MISSING_FRESH_EDITORIAL_BRIEF')],
 ['future issue requires original recap',gate.includes('MISSING_FRESH_RECAP_BRIEF')],
 ['future generator rebuild keeps prior edition',rebuild.includes('restoreReporterNarratives(out,original,{previousEdition:prior})')],
 ['quality check exercised for generator changes',ci.includes("'netlify/functions/inquirer-*.mjs'")],
 ['quality check tests actual future assembly',ci.includes('check-inquirer-future-brief-assembly.mjs')],
 ['real publisher loads fresh trusted briefs',production.includes("editorial-briefs/'+season+")],
 ['real publisher uses authoritative final writer',production.includes('finalizeInquirerNarrative(result,{week})')],
 ['real publisher invokes final newsroom gate',weekly.includes('evaluateFutureEditorialRelease(result,previousBroadcast,')],
 ['real publisher audits before saving',weekly.indexOf('evaluateFutureEditorialRelease(result,previousBroadcast,')>=0&&weekly.indexOf('evaluateFutureEditorialRelease(result,previousBroadcast,')<weekly.indexOf('await s.setJSON(key,')],
 ['real publisher retains independent release approval',production.includes('INQUIRER_APPROVED_THROUGH_WEEK')]
];
for(const [name,ok] of expected)assert.ok(ok,'PIPELINE_REGRESSION: '+name);
console.log('PASS: '+expected.length+' pipeline architecture invariants checked');
