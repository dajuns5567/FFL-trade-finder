import assert from 'node:assert/strict';
import {fallbackProjection} from '../netlify/functions/inquirer-projection-fallback.mjs';
const rows=[
 {player_id:'a',position:'RB',week:3,points:13},
 {player_id:'a',position:'RB',week:2,points:17},
 {player_id:'b',position:'RB',week:3,points:9},
 {player_id:'c',position:'QB',week:3,points:23}
];
const own=fallbackProjection({playerId:'a',position:'RB',history:rows});
assert.deepEqual({points:own.points,basis:own.basis,sample:own.sample_size},{points:15,basis:'prior-games',sample:2});
const peer=fallbackProjection({playerId:'not-available',position:'RB',history:rows});
assert.equal(peer.points,13);
assert.equal(peer.basis,'position-median');
assert.equal(peer.confidence,'low');
assert.equal(fallbackProjection({playerId:'none',position:'TE',history:rows}),null);
assert.equal(fallbackProjection({playerId:'zero',position:'RB',history:[{player_id:'zero',position:'RB',points:0}]}).points,0);
console.log('RETROSPECTIVE_PROJECTION_FALLBACK_VERIFIED');
