import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groundForwardRecapTeamAttribution as ground,inspectRecapTeamAttribution as inspect}
 from '../netlify/functions/lib/inquirer-recap-attribution.mjs';

const teams=[
 {team_name:'Miami Dolphins',opponent_name:'Detroit Lions',points:89.6,opponent_points:103.4,
  starter_details:[{name:'Selected Starter A',points:19.2}],
  league_context:{standings_rank:11},next_opponent_name:'New York Jets'},
 {team_name:'Detroit Lions',opponent_name:'Miami Dolphins',points:103.4,opponent_points:89.6,
  starter_details:[{name:'Selected Starter B',points:24.8}],
  league_context:{standings_rank:4},next_opponent_name:'Chicago Bears'}
];
const orphan='By the end, the comeback plan was mostly decorative.';
const unnamedStat='The upset landed 81.7–79.7 and the margin was only 2.1.';
const source=()=>({
 sections:[
  {heading:'The Week 9 Story',blocks:[
   {kind:'lead',heading:'The Story That Defined Week 9',paragraphs:[orphan,unnamedStat]},
   {kind:'standings',heading:'The Standings Have Started Talking',paragraphs:['On the starter card: the conference cut line is #4.']},
   {kind:'players',heading:'The Names Behind the Noise',paragraphs:['The leading scorer had an excellent Sunday.']},
   {kind:'decisions',heading:'The Decisions and the Damage',paragraphs:['The chosen starters did the work.']},
   {kind:'outlook',heading:'The Week Ahead',paragraphs:['Next Sunday will decide whether the run continues.']}
  ],paragraphs:[]},
  {heading:'The Back Page',paragraphs:['The losing manager has quite a lot to answer for.']}
 ],
 hot_takes:[{title:'Week 9 call',take:'The favorite is on notice.'}],
 paragraphs:[]
});

test('anonymous recap paragraphs become independently sourced, named-team reporting',()=>{
 const edition=ground(source(),teams,9);
 const audit=inspect(edition,teams);
 assert.equal(audit.ok,true,JSON.stringify(audit.missing));
 assert.ok(edition.sections[0].blocks.every(block=>
   block.paragraphs.every(p=>/Miami Dolphins|Detroit Lions/.test(p))));
 assert.ok(!JSON.stringify(edition).includes(orphan));
 assert.ok(!JSON.stringify(edition).includes(unnamedStat));
 const lead=edition.sections[0].blocks[0].paragraphs;
 assert.ok(lead.every(p=>/103\.4|89\.6/.test(p)),'real source figures replace orphaned numeric claims');
 assert.ok(!JSON.stringify(edition).includes('81.7'),'never preserve anonymous, unverified result');
 assert.ok(edition.sections[0].blocks[2].paragraphs[0].includes('Selected Starter'));
 assert.deepEqual(edition.sections[0].paragraphs,
   edition.sections[0].blocks.flatMap(b=>b.paragraphs));
 assert.deepEqual(edition.paragraphs,edition.sections.flatMap(s=>s.paragraphs));
 assert.match(edition.hot_takes[0].take,/Miami Dolphins|Detroit Lions/);
});

test('already named factual recap paragraphs remain byte-identical',()=>{
 const valid='Detroit Lions defeated Miami Dolphins 103.4 to 89.6 in Week 9.';
 const edition=source();edition.sections[0].blocks[0].paragraphs=[valid];
 const fixed=ground(edition,teams,9);
 assert.equal(fixed.sections[0].blocks[0].paragraphs[0],valid);
});

test('approved 2026 Week 8 and earlier editorial behavior stays untouched',()=>{
 const edition=source(),before=JSON.stringify(edition);
 assert.equal(ground(edition,teams,8),edition);
 assert.equal(JSON.stringify(edition),before);
});

test('missing verified matchup data does not invent team identities or scores',()=>{
 assert.throws(()=>ground(source(),[{team_name:'Detroit Lions'}],10),/verified completed matchups/);
});

test('final editorial writer invokes attribution after all cleanup passes',()=>{
 const generator=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');
 const polish=generator.indexOf('overview=polishForwardReaderCopy(teams,overview,week);');
 const repair=generator.indexOf('overview=groundForwardRecapTeamAttribution(overview,teams,week);');
 const done=generator.indexOf('return{inquirer:{...rawInquirer,teams},leagueOverview:overview,variationSalt};');
 assert.ok(polish>0&&repair>polish&&done>repair);
 assert.match(generator,/export const FORWARD_EDITORIAL_REVISION=110;/);
});
