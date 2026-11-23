import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../ui-player-values-v139.js',import.meta.url),'utf8');
const start=src.indexOf('function pickRows('),end=src.indexOf('\nfunction setMode(',start);
assert.ok(start>=0&&end>start,'test must execute installed Player Values draft renderer');
const picks=[
 {type:'pick',id:'a',season:2027,round:1,name:'2027 R1'},
 {type:'pick',id:'b',season:2028,round:1,name:'2028 R1'},
 {type:'pick',id:'c',season:2029,round:1,name:'2029 R1'},
 {type:'pick',id:'d',season:2027,round:1,name:'2027 R1'},
 {type:'pick',id:'e',season:2027,round:2,name:'2027 R2'}
];
const values={a:7000,b:6160,c:5420,d:6660,e:3000};
const raw={a:7000,b:6865,c:6865,d:6660,e:3000};
function render(query=''){
 const context={state:{allAssets:picks},tv:()=>({sourceValue:a=>raw[a.id],pickValue:a=>values[a.id],
  pickContext:a=>({projectedSlot:a.id==='d'?2:1,originalTeam:a.id,currentOwnerTeam:a.id})}),
  normText:s=>String(s).toLowerCase(),esc:s=>String(s),fmt:n=>Number(n).toLocaleString('en-US'),teamName:s=>s,Math,Number,String};
 vm.createContext(context);
 vm.runInContext(src.slice(start,end)+';globalThis.renderPicks=pickRows;',context);
 return context.renderPicks(query);
}
test('visible pick list is descending by discounted value rather than pre-discount source',()=>{
 const html=render();
 const displayed=[...html.matchAll(/Value ([\d,]+)/g)].map(x=>Number(x[1].replaceAll(',','')));
 assert.deepEqual(displayed,[7000,6660,6160,5420,3000]);
 assert.ok(html.indexOf('2027 R1')<html.indexOf('2028 R1'));
});
test('search retains exact same descending value ordering',()=>{
 const html=render('r1');
 const displayed=[...html.matchAll(/Value ([\d,]+)/g)].map(x=>Number(x[1].replaceAll(',','')));
 assert.deepEqual(displayed,[7000,6660,6160,5420]);
});
test('ties keep deterministic season / round / projected slot ordering',()=>{
 assert.match(src.slice(start,end),/y\.value-x\.value\|\|Number\(x\.a\.season\)-Number\(y\.a\.season\)/);
 assert.doesNotMatch(src.slice(start,end),/y\.source-x\.source/);
});
