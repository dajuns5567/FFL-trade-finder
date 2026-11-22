import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFantasyTeamAttribution} from '../netlify/functions/lib/inquirer-attribution-audit.mjs';
const teams=[
 {team_name:'New York Jets',inquirer_article:{}},
 {team_name:'New England Patriots',inquirer_article:{}},
 {team_name:'Los Angeles Chargers',inquirer_article:{}},
 {team_name:'Las Vegas Raiders',inquirer_article:{}}
];
const paper=(week,blocks)=>({week,teams,league_overview:{sections:[{blocks}]}});
test('editorial admission blocks generic Week 9 openings even if complete article structures exist',()=>{
 const broken=paper(9,[
  {kind:'lead',paragraphs:['By the end, the comeback plan was mostly decorative.']},
  {kind:'players',paragraphs:['The blowout had fingerprints everywhere: Arvell Reese, 48.8.']},
  {kind:'decisions',paragraphs:['New England Patriots left Daiyan Henley on the bench.']},
  {kind:'league',paragraphs:['Los Angeles Chargers scored 143.1.']},
  {kind:'outlook',paragraphs:['New York Jets next face Jacksonville Jags.']}
 ]);
 assert.deepEqual(inspectFantasyTeamAttribution(broken).map(x=>x.beat),['lead','players']);
});
test('all leading beats name actual fantasy league teams rather than generic NFL-style prose',()=>{
 const good=paper(10,['lead','players','decisions','league','outlook'].map(kind=>({
  kind,paragraphs:['New York Jets scored 81.7 against New England Patriots in this fantasy league.']
 })));
 assert.equal(inspectFantasyTeamAttribution(good).length,0);
 good.league_overview.sections[0].blocks[2].paragraphs[0]='The lineup explains why the season changed.';
 assert.equal(inspectFantasyTeamAttribution(good)[0].beat,'decisions');
});
test('historical Week 8 and earlier editions are not retroactively rejected by the new admission check',()=>{
 assert.deepEqual(inspectFantasyTeamAttribution(paper(8,[{kind:'lead',paragraphs:['An older published lead.']}])),[]);
});
