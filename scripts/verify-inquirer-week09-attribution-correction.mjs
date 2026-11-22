import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {recoveredInquirerEdition,RECOVERED_INQUIRER_COMMIT} from '../netlify/functions/lib/inquirer-github-archive.mjs';
import {correctWeekNineReaderEdition,ORIGINAL_SHA,CORRECTION_ID} from '../netlify/functions/lib/inquirer-week09-editorial-correction.mjs';
import {inspectFantasyTeamAttribution} from '../netlify/functions/lib/inquirer-attribution-audit.mjs';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const original=await recoveredInquirerEdition(2026,9,fetch);
assert.equal(sha(original),ORIGINAL_SHA,'Must apply only to byte-for-byte archived Week 9');
assert.equal(original.league_overview.sections[0].blocks[0].paragraphs[0],'By the end, the comeback plan was mostly decorative.');
assert(inspectFantasyTeamAttribution(original).length>=2,'Original missing names must fail future attribution audit');
const corrected=correctWeekNineReaderEdition(original);
assert.notEqual(corrected,original);
assert.equal(corrected.reader_editorial_correction?.id,CORRECTION_ID);
assert(corrected.reader_editorial_correction?.corrected_team_paragraph_count>=10);
assert.equal(corrected.league_overview.sections[0].blocks.length,6);
assert.equal(corrected.teams.length,32);
assert.equal(new Set(corrected.teams.map(t=>String(t.roster_id))).size,32);
assert.equal(inspectFantasyTeamAttribution(corrected).length,0);
const teamNames=corrected.teams.map(t=>t.team_name);
for(const beat of corrected.league_overview.sections[0].blocks){
 assert(beat.paragraphs.length>=2,'Missing named recap beat '+beat.kind);
 for(const paragraph of beat.paragraphs){
  assert(teamNames.some(name=>paragraph.includes(name)), 'Unattributed recap sentence in '+beat.kind+': '+paragraph);
 }
}
assert.equal(corrected.league_overview.sections[0].paragraphs.length,
 corrected.league_overview.sections[0].blocks.flatMap(b=>b.paragraphs).length);
assert(corrected.league_overview.sections[0].blocks[0].paragraphs[0].includes('manager kevinfalkenstein'));
assert(corrected.league_overview.sections[0].blocks[0].paragraphs[0].includes('manager JustInTheF1elds'));
assert(corrected.league_overview.sections[0].blocks[2].paragraphs[0].includes('Arvell Reese'));
assert(corrected.league_overview.sections[0].blocks[3].paragraphs[0].includes('Myles Garrett'));
for(const team of corrected.teams){
 const old=original.teams.find(t=>t.roster_id===team.roster_id);
 assert.equal(team.team_name,old.team_name);
 assert.equal(team.points,old.points);
 assert.equal(team.opponent_points,old.opponent_points);
 assert.equal(team.opponent_name,old.opponent_name);
 assert.deepEqual(team.starter_details,old.starter_details);
 assert.deepEqual(team.best_lineup_miss,old.best_lineup_miss);
 assert.equal(team.inquirer_article.sections.length,8);
 assert.equal(team.inquirer_article.paragraphs.length,team.inquirer_article.sections.flatMap(x=>x.paragraphs).length);
}
assert.equal(original.reader_editorial_correction,undefined,'Source must remain unchanged');
assert.equal(sha(original),ORIGINAL_SHA,'Original bytes must remain unchanged after projection');
assert.equal(correctWeekNineReaderEdition(corrected),corrected,'Cannot apply to already-corrected copy');
const week8=await recoveredInquirerEdition(2026,8,fetch);
assert.equal(correctWeekNineReaderEdition(week8),week8,'Week 8 must remain identical');
console.info('FLEECED Week 9 independent attribution correction verified',JSON.stringify({
 source_sha:ORIGINAL_SHA,commit:RECOVERED_INQUIRER_COMMIT,
 correction_id:CORRECTION_ID,original_team_articles:32,
 corrected_unattributed_team_paragraphs:corrected.reader_editorial_correction.corrected_team_paragraph_count,
 corrected_recap_beats:6,original_blob_bytes_preserved:true,
 previously_published_weeks_unchanged:true
}));
