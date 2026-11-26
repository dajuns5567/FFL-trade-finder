import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const maxCode=readFileSync(new URL('../trade-specific-max-value-v279.js',import.meta.url),'utf8');
const ordinaryCode=readFileSync(new URL('../trade-specific-player-v232.js',import.meta.url),'utf8');
const routerCode=readFileSync(new URL('../trade-specific-blank-router-v325.js',import.meta.url),'utf8');
const fullFinder=readFileSync(new URL('../trade-finder-v256-compiled.js',import.meta.url),'utf8');
function harness({rosterSize=18,mode='balanced',tier='neutral',position='ANY',selected=false,alias=true,addAssets=false,target=true}={}){
 const outgoing=Array.from({length:rosterSize},(_,i)=>({type:'player',id:'send-'+i,owner:1,value:600+i*270,rank:24+i,position:['QB','RB','WR','TE','IDP'][i%5]}));
 const jt={type:'player',id:'taylor',owner:2,value:8200,rank:7,position:'RB'};
 const incoming=Array.from({length:16},(_,i)=>({type:'player',id:'recv-'+i,owner:2,value:600+i*240,rank:45+i,position:['QB','RB','WR','TE','IDP'][i%5]}));
 const picks=Array.from({length:6},(_,i)=>({type:'pick',id:'pick-'+i,season:2027+(i%2),round:1+(i%3),owner:1,value:1750+i*100}));
 const elements={findMode:{value:mode},tradeTier94:{value:tier},desiredPlayerSearch:{value:target?'Jonathan Taylor':''},
   findTeam:{value:'1'},tradeAssist97:{checked:addAssets},finderResults:{innerHTML:'',appendChild(){}},finderGlobalSearch:{value:''}};
 const boxes=outgoing.map((a,i)=>({_asset:a,checked:selected&&i===0,value:a.id}));
 const positions=position==='ANY'?[{value:'ANY',checked:true}]:[{value:position,checked:true}];
 let yieldCount=0;
 const doc={
  getElementById:id=>elements[id]||null,
  querySelectorAll:sel=>sel.includes('trade97-pos:checked')?positions:
    sel.includes('.shopCheck:checked')?boxes.filter(b=>b.checked):
    sel.includes('.shopCheck')?boxes:[],
  addEventListener(){},
  createElement:()=>({className:'',textContent:'',style:{},appendChild(){}})
 };
 const values=x=>Number(x?.value)||0;
 const win={
  state:{teams:Array.from({length:32},(_,i)=>({id:i+1,name:'Team '+(i+1)})),players:{},allAssets:[...outgoing,jt,...incoming,...picks]},
  tradeValueNormalizationV130:{canonicalValue:values},tradeValueNormalizationV139:{canonicalValue:values},
  tradeSelectAllV165:{aliasActive:()=>alias},playerName:id=>id==='taylor'?'Jonathan Taylor':id,
  playerRankValue:x=>({rank:x.rank||9999}),groupPos:x=>x.position||'IDP',teamName:id=>'Team '+id,
  section1V130:{fair:(a,b)=>{
   const ar=a.reduce((sum,x)=>sum+values(x),0),br=b.reduce((sum,x)=>sum+values(x),0);
   return {score:83,rejected:false,ratio:.9,edgeEffective:180,aRaw:ar,bRaw:br,aAdj:0,bAdj:0,aEffective:ar,bEffective:br+180}
  }}
 };
 const ctx={window:win,document:doc,Number,String,Set,Map,Array,Math,Promise,console,setTimeout:(fn,ms)=>{yieldCount++;return setTimeout(fn,ms)}};
 vm.runInNewContext(maxCode,ctx,{filename:'trade-specific-max-value-v279.js'});
 vm.runInNewContext(ordinaryCode,ctx,{filename:'trade-specific-player-v232.js'});
 vm.runInNewContext(routerCode,ctx,{filename:'trade-specific-blank-router-v325.js'});
 return {win,doc,ctx,elements,boxes,jt,getYields:()=>yieldCount};
}

test('all targeted filter families, intents, manual/alias modes and position choices terminate without a stuck searching state',async()=>{
 const cases=[];
 for(const mode of ['balanced','need','value'])
  for(const tier of ['neutral','up','down','draft'])
   for(const position of ['ANY','QB','RB','IDP'])
    for(const selected of [false,true]){
     // This checks the actual target engine selected by the live router;
     // rows legitimately can be empty when Tier Down/position rules conflict.
     cases.push({mode,tier,position,selected,alias:!selected});
    }
 let completed=0;
 for(const opts of cases){
  const f=harness({...opts,rosterSize:16});
  const engine=opts.mode==='value'?f.win.tradeSpecificMaxValueV279:f.win.tradeSpecificPlayerV232;
  await Promise.race([engine.run(),new Promise((_,rej)=>setTimeout(()=>rej(Error('search did not resolve: '+JSON.stringify(opts))),4500))]);
  assert.doesNotMatch(f.elements.finderResults.innerHTML,/Searching realistic trades|Searching maximum-value trades/);
  assert.ok(f.elements.finderResults.innerHTML.includes('No ')||f.elements.finderResults.innerHTML.includes('Jonathan Taylor'));
  assert.ok(f.getYields()>0);
  completed++;
 }
 assert.equal(completed,96);
});

test('all singles and two-asset pairs remain eligible with a bounded representative 3-asset family',()=>{
 const s1=maxCode.indexOf('function spreadTriples('),e1=maxCode.indexOf('function outgoing(me)',s1);
 const s2=ordinaryCode.indexOf('function buildCombos('),e2=ordinaryCode.indexOf('function buildOutgoing(me)',s2);
 assert.ok(s1>0&&e1>s1&&s2>0&&e2>s2);
 const pool=Array.from({length:110},(_,i)=>({type:'player',id:'asset'+i,value:1000+i*100}));
 const ctx={unique:a=>a,uniqueAssets:a=>a,av:x=>x.value,spreadAssets:(arr,n)=>Array.from({length:n},(_,i)=>arr[Math.round(i*(arr.length-1)/(n-1))]),Set,Map,Math,Number,String};
 vm.runInNewContext(maxCode.slice(s1,e1)+ordinaryCode.slice(s2,e2),ctx);
 const expectedSingles=110,pairs=110*109/2,maxTriples=36*35*34/6;
 for(const method of [ctx.combos,ctx.buildCombos]){
  const packages=method(pool,3);
  assert.equal(packages.length,expectedSingles+pairs+maxTriples);
  assert.equal(packages.filter(p=>p.length===1).length,110);
  assert.equal(packages.filter(p=>p.length===2).length,pairs);
  assert.ok(packages.length<15000,'do not allocate hundreds of thousands of triple packages synchronously');
  assert.equal(new Set(packages.map(p=>p.map(x=>x.id).sort().join('|'))).size,packages.length);
 }
});

test('balanced/need ordinary targeted mode uses indexed max-value neighborhood and retains a safe fallback',()=>{
 assert.match(ordinaryCode,/const indexed=window\.tradeSpecificMaxValueV279\?\.structureCandidates/);
 assert.match(ordinaryCode,/if\(typeof indexed==='function'\)return indexed\(sorted,v,2,count\)/);
 assert.match(ordinaryCode,/for\(let ri=0;ri<recvs\.length;ri\+\+\)/);
 assert.match(ordinaryCode,/await new Promise\(r=>setTimeout\(r,0\)\)/);
});

test('regular non-targeted searches still cap blank-package generation and yield between partners',()=>{
 assert.match(fullFinder,/return out\.slice\(0,80\)/);
 assert.match(fullFinder,/if\(Date\.now\(\)-sliceStart>=18\)\{await yieldUI\(\);sliceStart=Date\.now\(\)\}/);
 assert.match(fullFinder,/if\(token!==runToken\)return\[\]/);
 assert.match(routerCode,/const api=mode==='value'\?window\.tradeSpecificMaxValueV279:window\.tradeSpecificPlayerV232/);
});

test('ordinary Finder handles 36 realistic untargeted permutations including full Select All and manual additions',async()=>{
 let completed=0;
 for(const mode of ['balanced','need','value'])
  for(const tier of ['neutral','up','down','draft'])
   for(const position of ['ANY','WR','IDP']){
    const selected=completed%2===1,addAssets=selected&&completed%3===0;
    const f=harness({rosterSize:14,mode,tier,position,selected,alias:!selected,addAssets,target:false});
    vm.runInNewContext(fullFinder,f.ctx,{filename:'trade-finder-v256-compiled.js'});
    const results=await Promise.race([
      f.win.tradeFinderV168.generateAsync(0),
      new Promise((_,reject)=>setTimeout(()=>reject(Error('untargeted Finder stalled '+JSON.stringify({mode,tier,position,selected,addAssets}))),12000))
    ]);
    assert.ok(Array.isArray(results));
    assert.ok(results.length<=250);
    assert.ok(results.every(row=>row.give?.length&&row.recv?.length&&Number(row.other)===2));
    completed++;
   }
 assert.equal(completed,36);
});
