const fs=require('fs');const cp=require('child_process');
function run(cmd,args){const r=cp.spawnSync(cmd,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}
run('node',['scripts/compile-v256-runtimes.cjs']);
run('git',['diff','--exit-code','--','trade-finder-v256-compiled.js','trade-runtime-v256-compiled.js']);
run('node',['--check','trade-finder-v256-compiled.js']);
run('node',['--check','trade-runtime-v256-compiled.js']);
for(const path of['trade-finder-v256-compiled.js','trade-runtime-v256-compiled.js']){const s=fs.readFileSync(path,'utf8');if(/XMLHttpRequest|trade-finder-style-loader-v197|trade-finder-v150\.js|trade-runtime-v130\.js|\(0,eval\)|eval\s*\(/.test(s))throw new Error(path+' still contains runtime loader/eval machinery')}
const src=fs.readFileSync('scripts/finder-runtime-smoke-v254.cjs','utf8');
const needle="runFile('trade-finder-style-loader-v209.js');";
if((src.split(needle).length-1)!==1)throw new Error('compiled smoke guard failed: Finder loader call');
const tmp='scripts/.finder-runtime-compiled-smoke.tmp.cjs';
fs.writeFileSync(tmp,src.replace(needle,"runFile('trade-finder-v256-compiled.js');"));
try{run('node',[tmp])}finally{try{fs.unlinkSync(tmp)}catch(_){}}
console.log('V258 fully flattened runtime equivalence smoke passed');
