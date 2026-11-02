import test from 'node:test';
import assert from 'node:assert/strict';
import week2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {isLockedInquirerEdition} from '../netlify/functions/league-hub.mjs';

const clone=()=>JSON.parse(JSON.stringify(week2));

test('frozen Week 2 reference is a valid fully locked edition and remains unchanged',()=>{
 assert.equal(isLockedInquirerEdition(week2,2026,2),true);
 assert.equal(week2.published_locked,true);
 assert.equal(week2.teams.length,32);
});
test('missing lock bit, wrong season/week or missing overview prevents past edition promotion',()=>{
 const e=clone();
 e.published_locked=false;
 assert.equal(isLockedInquirerEdition(e,2026,2),false);
 e.published_locked=true;
 assert.equal(isLockedInquirerEdition(e,2027,2),false);
 assert.equal(isLockedInquirerEdition(e,2026,3),false);
 e.league_overview={headline:'',sections:[]};
 assert.equal(isLockedInquirerEdition(e,2026,2),false);
});
test('only 32 distinct team articles qualify as complete archive lineage',()=>{
 const e=clone();
 e.teams.pop();
 assert.equal(isLockedInquirerEdition(e,2026,2),false);
 e.teams.push({...e.teams[0]});
 assert.equal(isLockedInquirerEdition(e,2026,2),false);
 e.teams[31]={...e.teams[31],roster_id:'99',inquirer_article:{headline:''}};
 assert.equal(isLockedInquirerEdition(e,2026,2),false);
});
