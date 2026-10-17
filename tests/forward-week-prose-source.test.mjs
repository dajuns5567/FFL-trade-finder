import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adaptWeekLanguage,evolveSentence,evolveCrossReporterSentence} from '../netlify/functions/inquirer-editorial-v31.mjs';

test('variation does not prepend a mechanical editorial introduction',()=>{
 for(const reporter of ['walter-mercer','tess-delaney','mack-hollis','nora-voss']){
  const result=evolveSentence('Jared caught seven passes for 82 yards.',reporter,'week-6-seed');
  assert.match(result,/^Jared caught seven passes for 82 yards\.$/);
  assert(!/the football read is straightforward|the rival-chat version is uncomfortable/i.test(result));
 }
});
test('cross-reporter variation never appends a canned closing sentence',()=>{
 for(const reporter of ['walter-mercer','tess-delaney','mack-hollis','nora-voss']){
  assert.equal(evolveCrossReporterSentence('Seven catches kept the drive alive.',reporter,'week-6-seed'),
   'Seven catches kept the drive alive.');
 }
});

test('future week copy does not turn an opening win into an previous-week win',()=>{
 const text=adaptWeekLanguage('The Jets gave rivals a win after an opening win in Week 1.',5,{});
 assert(!/an previous-week/i.test(text));
 assert(text.includes('a win the previous week'));
});
test('sentiment streaks are visibly labelled as two-game context',()=>{
 const text=adaptWeekLanguage('At 1-1, supporters disagree. At 2-0, rivals worry.',5,{});
 assert(text.includes('Across the last two games (1-1)'));
 assert(text.includes('Across the last two games (2-0)'));
});
test('plural mascot correction skips prepositional noun mentions',()=>{
 const source=fs.readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');
 assert(source.includes('input.slice(0,offset)'));
 assert(source.includes('on|of|for|with|against|from|after|before'));
});
test('sentiment uses the two latest game outcomes rather than cumulative record',()=>{
 const source=fs.readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');
 assert(source.includes("recent_games||[]).slice(-2)"));
 assert(source.includes("lastWins===2"));
 assert(source.includes("lastLosses===2"));
});
test('the production generator does not silently insert replacement scoreboard prose',()=>{
 const s=fs.readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert(!s.includes('repairNewEditionCopy('));
 assert(s.includes('inspectEditionBeforePublication(result)'));
 assert(s.includes('if(!accepted){accepted=best;quality=bestQuality;variationSalt=bestSalt}'));
});
