const fs=require('fs');const cp=require('child_process');
const selectAll=fs.readFileSync('trade-select-all-v165.js','utf8');
if(/dispatchEvent\s*\(/.test(selectAll))throw new Error('Select All must not broadcast synthetic manual-selection change events');
if(!/selectAllBlankAlias/.test(selectAll))throw new Error('Select All blank alias helper missing');
const src=fs.readFileSync('scripts/finder-runtime-smoke-v254.cjs','utf8');
const loader="runFile('trade-finder-style-loader-v209.js');";
if((src.split(loader).length-1)!==1)throw new Error('Select All smoke guard failed: Finder loader call');
const hook="    controls.tradeAssist97.checked = true;\n    fairCalls = 0;\n    const onRows = await window.tradeFinderV168.generateAsync(0);";
if((src.split(hook).length-1)!==1)throw new Error('Select All smoke guard failed: normal Finder test hook');
const injected=`    const rowSig=rs=>(rs||[]).map(r=>({other:r.other,give:(r.give||[]).map(x=>x.type+':'+x.id),recv:(r.recv||[]).map(x=>x.type+':'+x.id),score:r.f?.score,recommend:r.recommend,gap:r.gap}));\n    for(const b of boxes)b.checked=false;\n    controls.tradeAssist97.checked=true;\n    const blankRows=await window.tradeFinderV168.generateAsync(0);\n    for(const b of boxes)b.checked=true;\n    const allRows=await window.tradeFinderV168.generateAsync(0);\n    if(JSON.stringify(rowSig(blankRows))!==JSON.stringify(rowSig(allRows)))failures.push('Select All / manually-all-selected search drifted from exact blank-search recommendations');\n    for(const b of boxes)b.checked=(b._asset?.id==='manual');\n    controls.tradeAssist97.checked = true;\n    fairCalls = 0;\n    const onRows = await window.tradeFinderV168.generateAsync(0);`;
const tmp='scripts/.select-all-blank-equivalence-v258.tmp.cjs';
fs.writeFileSync(tmp,src.replace(loader,"runFile('trade-finder-v256-compiled.js');").replace(hook,injected));
try{const r=cp.spawnSync('node',[tmp],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}finally{try{fs.unlinkSync(tmp)}catch(_){}}
console.log('V258 Select All exact blank-search equivalence passed');
