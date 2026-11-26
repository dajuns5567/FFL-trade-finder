import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const helper=read('finder-pagination-read-batch-v662.js');
const normalizer=read('trade-value-normalization-v139.js');
const engines=[
 ['trade-finder-v256-compiled.js','rows','visible'],
 ['trade-specific-max-tier-add-v300.js','rows','visible'],
 ['trade-specific-tier-up-v282.js','rows','visible'],
 ['trade-specific-add-assets-v282.js','rows','visible'],
 ['trade-specific-max-value-v279.js','active','visible'],
 ['trade-specific-player-v232.js','activeRows','visibleRows']
];
function harness(enabled){
 const picks=Array.from({length:288},(_,i)=>({type:'pick',id:'pick-'+i,season:2027+Math.floor(i/96),round:1+Math.floor(i%96/32),owner:1+i%32,original_owner:1+i%32}));
 const players=Array.from({length:900},(_,i)=>({type:'player',id:'p'+i,rank:i+1,owner:1+i%32}));
 const state={allAssets:[...players,...picks],players:{},teams:Array.from({length:32},(_,i)=>({id:i+1,name:'Team '+(i+1)}))};
 let projectionReads=0,rankReads=0,revision=0,listener,button,html='';
 const host={get innerHTML(){return html},set innerHTML(v){html=v;button=null},appendChild(b){button=b}};
 const doc={addEventListener(type,fn,capture){if(type==='click'&&capture)listener=fn},createElement(){return {style:{},textContent:'',closest:q=>q==='#finderResults > button'?button:null}},getElementById:id=>id==='finderResults'?host:null};
 const win={state,teamName:id=>'Team '+id,playerRankValue:a=>{rankReads++;return{rank:a.rank+revision}},draftPickProjection92:a=>{
   projectionReads++;const slot=(a.original_owner+revision-1)%32+1;
   // Simulate the same 32-team ordering fingerprint overhead as V527,
   // while using actual V139 normalization/year recursion unchanged.
   const fingerprint=JSON.stringify(state.teams.map(t=>[t.id,slot,t.name]).sort((a,b)=>a[0]-b[0]));
   assert(fingerprint.length>0);
   return{projectedSlot:slot,value:Math.round((4300-slot*90)/a.round*Math.pow(.88,a.season-2027)),originalTeam:'Team '+a.original_owner,currentOwnerTeam:'Team '+a.owner};
 }};
 win.window=win;win.document=doc;
 const ctx=vm.createContext({window:win,document:doc,console});
 vm.runInContext(normalizer,ctx);if(enabled)vm.runInContext(helper,ctx);
 const norm=win.tradeValueNormalizationV139,originals=[win.draftPickProjection92,win.playerRankValue,norm.canonicalValue,norm.pickContext,norm.pickValue];
 const assertRestored=()=>assert.deepEqual([win.draftPickProjection92,win.playerRankValue,norm.canonicalValue,norm.pickContext,norm.pickValue],originals);
 const rows=Array.from({length:17},(_,i)=>[picks[192+i%7],picks[96+(i+1)%8],players[i%4]]);
 // Exercise the production draw bodies and their original Load More handlers.
 // Card rendering uses actual canonical values and projection reads, with
 // repeated picks and players across packages, not mock price results.
 const card=(assets,i)=>'<article data-i="'+i+'">'+assets.map(a=>{
   const v=norm.canonicalValue(a),r=a.type==='pick'?norm.pickContext(a):win.playerRankValue(a);
   return '<div>'+a.id+'|'+v+'|'+JSON.stringify(r)+'</div>';
 }).join('')+'</article>';
 function run(engine){
  const [path,array,count]=engine,s=read(path),i=s.indexOf('function draw(host)'),j=s.indexOf('\n',i);assert(i>=0&&j>i);
  const draw=s.slice(i,j);assert.match(draw,/Load more trades/);assert.match(draw,/\+5/);
  Object.assign(ctx,{fixtureRows:rows,fixtureCard:card,fixtureHost:host});
  vm.runInContext('(()=>{let '+array+'=fixtureRows,'+count+'=5;const card=fixtureCard;'+draw+';draw(fixtureHost)})()',ctx);
  const pages=[],calls=[];for(let n=0;n<3;n++){
   assert(button);const old=button,evt={target:old};
   // Change canonical source between clicks: cache must never persist.
   revision=n+1;projectionReads=rankReads=0;
   const t=performance.now();if(listener)listener(evt);old.onclick.call(old,evt);
   calls.push({projections:projectionReads,ranks:rankReads,ms:performance.now()-t});assertRestored();
   pages.push({markup:host.innerHTML,next:button?.textContent||null});
  }
  assert.equal(button,null);assert.equal((pages[0].markup.match(/<article/g)||[]).length,10);assert.equal((pages[1].markup.match(/<article/g)||[]).length,15);assert.equal((pages[2].markup.match(/<article/g)||[]).length,17);
  return{pages,calls};
 }
 return{run,win,norm,assertRestored,listener};
}
test('six actual Finder pagination handlers preserve exact ordered rendered values and current pick projections while eliminating redundant projection reads',()=>{
 let baseline=0,candidate=0,oldMs=0,newMs=0;
 for(const engine of engines){
  const a=harness(false).run(engine),b=harness(true).run(engine);
  assert.deepEqual(b.pages,a.pages,engine[0]+' exact markup and pagination parity');
  const total=x=>x.calls.reduce((s,v)=>s+v.projections,0);
  assert(total(b)<total(a)*.25,engine[0]+' projection reads must drop by at least 75%');
  baseline+=total(a);candidate+=total(b);oldMs+=a.calls.reduce((s,v)=>s+v.ms,0);newMs+=b.calls.reduce((s,v)=>s+v.ms,0);
 }
 console.log('FINDER_PAGINATION_BATCH '+JSON.stringify({baseline,candidate,oldMs,newMs}));
});
test('non-Finder buttons untouched; original handler return, this, error and method restoration preserved',()=>{
 const h=harness(true),err=new Error('original failure');
 const other={textContent:'Load more trades (9 more)',onclick(){throw err},closest(){return null}};
 const before=other.onclick;h.listener({target:other});assert.equal(other.onclick,before);
 const button={textContent:'Load more trades (9 more)',closest(){return this},onclick(event){assert.equal(this,button);assert.equal(event.target,button);h.norm.canonicalValue(h.win.state.allAssets[900]);throw err}};
 const original=button.onclick;const event={target:button};h.listener(event);assert.throws(()=>button.onclick.call(button,event),e=>e===err);assert.equal(button.onclick,original);h.assertRestored();
});
