import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fleeced-brief-packet-'));
const teams=Array.from({length:32},(_,i)=>({
 team_name:'Team '+i,opponent_name:'Rival '+i,next_opponent_name:'Next '+i,
 points:100+i/10,opponent_points:95+i/10,
 starter_details:[{name:'Scorer '+i,points:20+i/10,lineup_slot:'FLEX'}],
 inquirer_article:{reporter:{id:'reporter-'+i%4,name:'Columnist '+i%4,voice:'Dry humor'},fan_sentiment:{score:i-16},sections:[{kind:'lede',paragraphs:['Team '+i+' earned a result.']}]}
}));
const previous={season:2026,week:4,articles:teams.map(t=>({team:t.team_name,sections:t.inquirer_article.sections}))};
const current={season:2026,week:5,teams,league_overview:{sections:[{blocks:[{kind:'lead',paragraphs:[]},{kind:'standings',paragraphs:[]},{kind:'players',paragraphs:[]},{kind:'decisions',paragraphs:[]},{kind:'league',paragraphs:[]},{kind:'outlook',paragraphs:[]}]}]}};
const a=path.join(dir,'current.json'),b=path.join(dir,'previous.json');
fs.writeFileSync(a,JSON.stringify(current));fs.writeFileSync(b,JSON.stringify(previous));
const r=spawnSync(process.execPath,['scripts/inquirer-prep-future-editorial.mjs',a,b],{encoding:'utf8'});
assert.equal(r.status,0,r.stderr);
const packet=JSON.parse(r.stdout);
assert.equal(packet.assignments.length,32);
assert.equal(Object.keys(packet.draft_manifest.teams).length,32);
assert.equal(Object.keys(packet.draft_manifest.recap).length,6);
assert.equal(packet.draft_manifest.editorial_approval.approved,false);
assert.deepEqual(packet.draft_manifest.teams['Team 0'].players,[]);
assert.equal(packet.assignments[0].roster.starters[0].points,20);
assert.equal(packet.assignments[0].reference_week,undefined);
console.log('PASS: fact-only assignment packet, no fabricated copy or editorial approval');
