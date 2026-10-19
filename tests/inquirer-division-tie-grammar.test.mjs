import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectEditionBeforePublication} from '../netlify/functions/inquirer-publication-guard.mjs';

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
