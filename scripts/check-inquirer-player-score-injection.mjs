// Regression check for the final Week 4 player-score insertion layer.
// Run with: node scripts/check-inquirer-player-score-injection.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('netlify/functions/inquirer-narrative-final.mjs','utf8');
const start = source.indexOf('const embedVerifiedPlayerEvidence=');
const end = source.indexOf('const week4IntegratedPlayerColumns=', start);
assert(start >= 0 && end > start, 'player evidence helper missing');
const code = source.slice(start,end);
const inject = vm.runInNewContext(code + '\nembedVerifiedPlayerEvidence;', {Number, String, Set, Map, RegExp, Math});
const starters = [{id:'1',name:'Bijan Robinson',points:27.7},{id:'2',name:'Courtland Sutton',points:1.4},{id:'3',name:'DK Metcalf',points:11.2}];
const cases = [
  ["Bijan Robinson's 27.7 was excellent.", "Bijan Robinson's (27.7 pts) was excellent."],
  ["Courtland Sutton's 1.4 was dreadful.", "Courtland Sutton's (1.4 pts) was dreadful."],
  ["Bijan Robinson was excellent.", "Bijan Robinson (27.7 pts) was excellent."],
  ["Bijan Robinson (27.7 pts) was excellent.", "Bijan Robinson (27.7 pts) was excellent."],
  ["Bijan Robinson's 20-point lead mattered.", "Bijan Robinson's (27.7 pts) 20-point lead mattered."],
  ["DK Metcalf scored for Cincinnati.", "DK Metcalf (11.2 pts) scored for Cincinnati."]
];
for(const [input,expected] of cases){
 const actual=inject(input,starters);
 assert.equal(actual,expected, 'score insertion: '+input);
}
const columnStart=source.indexOf('const week4IntegratedPlayerColumns=');
const columnEnd=source.indexOf('\nconst ',columnStart+6);
assert(columnStart>=0 && columnEnd>columnStart,'integrated player columns missing');
console.log('PASS: 6 player-score insertion regression examples');
