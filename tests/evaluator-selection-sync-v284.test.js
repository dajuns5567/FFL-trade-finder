// V284 regression contract: evaluator search add, roster checkbox toggle, and selected-asset remove must share one selection state.
const fs=require('fs');
const src=fs.readFileSync('trade-evaluator-any-team-v186.js','utf8');
if(!src.includes("function apply(side){syncRuntime(side);writeDisplay(side)}")) throw new Error('missing shared apply sync');
if(!src.includes("stores[side].set(key(a),{...a});")) throw new Error('search add missing store update');
if(!src.includes("apply(side);const inp=document.getElementById('evalGlobalSearch'+side)")) throw new Error('search add does not sync runtime/display');
if(!src.includes("stores[side].delete(key(a));apply(side)")) throw new Error('x removal does not sync runtime/display');
if(!src.includes("if(box.checked)stores[s].set(key(a),{...a});else stores[s].delete(key(a));apply(s)")) throw new Error('checkbox toggle does not sync runtime/display');
console.log('V284 evaluator selection sync contract OK');
