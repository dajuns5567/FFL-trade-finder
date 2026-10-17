import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adaptWeekLanguage,w2TeamGrammar,w2SentimentRead}
 from '../netlify/functions/inquirer-editorial-v31.mjs';

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
test('plural mascot correction never changes grammar of a preceding noun',()=>{
 const t={team_name:'New York Jets',opponent_name:'Miami Dolphins'};
 assert.equal(w2TeamGrammar(t,'The first result on New York Jets was a win.'),
   'The first result on New York Jets was a win.');
 assert.equal(w2TeamGrammar(t,'New York Jets was competitive.'),
   'New York Jets were competitive.');
});
test('sentiment uses the two latest matchups, not arbitrary cumulative wins and losses',()=>{
 const t={roster_id:'4',team_name:'New York Jets',points:68,opponent_points:143,
  league_context:{record:{wins:1,losses:4},recent_games:[
   {week:4,result:'W'},{week:5,result:'L'}]},
  starter_details:[],best_lineup_miss:null};
 const r={id:'nora-voss'};
 const text=w2SentimentRead(t,null,r,{}, {},false);
 assert(typeof text==='string'&&text.length>30);
 assert(!/At 0-2|At 2-0/.test(text));
});
test('the production generator does not silently insert replacement scoreboard prose',()=>{
 const s=fs.readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert(!s.includes('repairNewEditionCopy('));
 assert(s.includes('inspectEditionBeforePublication(result)'));
 assert(s.includes('if(!accepted){accepted=best;quality=bestQuality;variationSalt=bestSalt}'));
});
