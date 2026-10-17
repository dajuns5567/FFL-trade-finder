// Regression for the undefined teamName ReferenceError seen in scheduled publication logs.
// Pure source-level contract; does not run a publisher, fetch Sleeper data, or mutate Blobs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
test('completed-week enrichment has a defined roster-to-team-name resolver',()=>{
 const match=source.match(/\bteamName=id=>(byId\.get\(String\(id\)\)\?\.team_name\|\|null)/);
 assert.ok(match,'Missing teamName resolver that blocks Week 3+ publication');
 const byId=new Map([['7',{team_name:'The Underdogs'}],['9',{team_name:'The Sharks'}]]);
 const teamName=Function('byId','return id=>'+match[1])(byId);
 assert.equal(teamName(7),'The Underdogs');
 assert.equal(teamName('9'),'The Sharks');
 assert.equal(teamName(null),null);
 assert.ok(source.includes('opponent_name:teamName(t.opponent_roster_id)'));
 assert.ok(source.includes('next_opponent_name:teamName(t.next_opponent_roster_id)'));
});
