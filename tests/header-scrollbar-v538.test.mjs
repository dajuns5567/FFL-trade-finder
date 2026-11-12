import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../header-scrollbar-v538.css',import.meta.url),'utf8');
const site=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
const header=readFileSync(new URL('../fleeced-header-v512.js',import.meta.url),'utf8');
test('header hover scrollbar is invisible but scrolling remains enabled',()=>{
 assert.match(site,/header-scrollbar-v538\.css\?v=538/);
 assert.match(css,/scrollbar-width:none!important/);
 assert.match(css,/::-webkit-scrollbar/);
 assert.match(css,/display:none!important/);
 assert.doesNotMatch(css,/overflow-x:\s*hidden|pointer-events:\s*none|touch-action:\s*none/);
 assert.match(header,/overflow-x:auto!important/);
 assert.match(header,/button\.addEventListener\('click'/);
});
test('header scrollbar styling is scoped away from other site scroll regions',()=>{
 assert.match(css,/header\.fleeced-site-header/);
 assert.doesNotMatch(css,/(^|\n)\s*(?:body|html|\*)\s*\{/);
});
