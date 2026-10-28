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
  'The task against '+String.fromCharCode(39)+'+next+''+' is to make that contribution less lonely'
 ])assert.equal(source.includes(phrase),false,'recycled narrative scaffold: '+phrase);
});
test('a modest projected gap is not called heavily favored',()=>{
 assert.match(source,/gap<12\?"favored":"strongly favored"/);
 assert.doesNotMatch(source,/gap<8\?"modestly favored":"heavily favored"/);
});
