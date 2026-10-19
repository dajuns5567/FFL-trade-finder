import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectEditionBeforePublication} from '../netlify/functions/inquirer-publication-guard.mjs';
import {evaluateInquirerEditionQuality} from '../netlify/functions/inquirer-editorial-v31.mjs';

const source=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');

test('all divisions report tied leaders without leaking null into prose',()=>{
 const board=source.slice(source.indexOf('function w2DivisionBoardTake('),source.indexOf('function w2Recap',source.indexOf('function w2DivisionBoardTake(')));
 assert.match(board,/leadSubject=leadOne\|\|leaderNames/);
 assert.match(board,/leadVerb=\(singular,plural\)=>leadOne\?/);
 for(const division of ['AFC SOUTH','AFC WEST','NFC SOUTH','NFC WEST']){
  const block=board.split('case "'+division+'":')[1]?.split('break;')[0];
  assert.ok(block,division);
  assert.match(block,/context=leadSubject\+" "\+leadVerb\(/,division);
  assert.doesNotMatch(block,/context=leadOne\+/,division);
 }
 for(const division of ['AFC EAST','NFC NORTH']){
  const block=board.split('case "'+division+'":')[1]?.split('break;')[0];
  assert.match(block,/chasePair\+" "\+chase(?:Be|Verb)/,division+' must agree with a two-team chasing pair');
 }
});

test('publication gate blocks unrendered data placeholders inside recap hot takes',()=>{
 const audit=inspectEditionBeforePublication({teams:[],league_overview:{headline:'Recap',sections:[{paragraphs:['Some valid text.']}],hot_takes:[{title:'Division board',take:'NFC WEST: null has banked 4-1.'}]}});
 assert.ok(audit.issues.some(x=>x.id==='recap-hot-take-unrendered-data-placeholder'));
});

test('future weekly quality gate rejects grammar and player-name casing in rendered desks and recap',()=>{
 const current={week:5,teams:[{team_name:'New York Jets',roster_id:1,starter_details:[{name:'Jahmyr Gibbs'}],inquirer_article:{headline:'Week 5',sections:[{heading:'What Changed',paragraphs:['jahmyr Gibbs produced the points.']}],paragraphs:['jahmyr Gibbs produced the points.']}}],league_overview:{sections:[{heading:'The Back Page: this Sunday Gets a Headline',paragraphs:['New York Jets does not get a polite result.']}],hot_takes:[]}};
 const ids=evaluateInquirerEditionQuality(current).issues.map(i=>i.id);
 assert.ok(ids.includes('plural-team-agreement'));
 assert.ok(ids.includes('reader-facing-case-and-punctuation'));
 assert.ok(ids.includes('player-name-capitalization'));
});
