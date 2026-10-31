import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');
test('revision 62 keeps reviewed Week 5 recycled prose out of source templates',()=>{
 for(const phrase of [
  'supplies the new reference point this week',
  'be read aloud before the mock hearing begins',
  'needing a specific plan for ',
  'schedule offers no free results',
  'is to make that contribution less lonely'
 ])assert.equal(source.includes(phrase),false,'recycled narrative scaffold: '+phrase);
});
test('a modest projected gap is not called heavily favored',()=>{
 assert.match(source,/gap<12\?"favored":"strongly favored"/);
 assert.doesNotMatch(source,/gap<8\?"modestly favored":"heavily favored"/);
});

test('forward editions compare with multiple locked historical weeks, not just the immediately preceding edition',()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert.match(hub,/const historicalEditorialMemory=\[\]/);
 assert.match(hub,/oldWeek=Math\.max\(1,week-4\)/);
 assert.match(hub,/isLockedInquirerEdition\(archived,season,oldWeek\)/);
 assert.match(hub,/inspectPreviousWeekEditorialReuse\(candidate,old\)/);
 assert.match(hub,/if\(archivalReuse\.length\)\{q\.issues\.push\(\.\.\.archivalReuse\);q\.ok=false\}/);
});
test('forward humor is not a single reporter-wide repeated tagline',()=>{
 assert.match(source,/const kicker=\[/);
 assert.match(source,/Number\(t\.roster_id\)/);
 assert.doesNotMatch(source,/sentiment\.paragraphs\.push\(joke\)/);
});
