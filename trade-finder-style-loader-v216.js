(()=>{
'use strict';
// V216 starts from frozen V209. Future-Oriented is isolated to findMode=rebuild and disabled for Acquire Draft Picks.
// It changes candidate preference inside existing structure buckets only; V209 still owns generation, eligibility,
// fairness, package construction, structure mixing, 2-for-2 behavior, 3-asset spacing, Partner Fit, Maximum Value, and Evaluator logic.
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v209.js?v=209',false);
try{xhr.send(null)}catch(e){console.error('V216 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V216 loader fetch failed',xhr.status);return}
let src=xhr.responseText;

// Preserve receive-package shape during Future-Oriented dedupe so Future scoring cannot collapse package variety.
const blankOld="||tier==='down'||(give.length===2&&playerCount(give)===2))?`|${packageShape(recv)}|p${playerCount(recv)}|a${recv.length}`:''";
const blankNew="||tier==='down'||searchStyle()==='rebuild'||(give.length===2&&playerCount(give)===2))?`|${packageShape(recv)}|p${playerCount(recv)}|a${recv.length}`:''";
if(src.split(blankOld).length-1!==1){console.error('V216 guard failed: blank shape preservation');return}
src=src.replace(blankOld,blankNew);
const selectedOld="||give.length>=3||tier==='down'||(give.length===2&&playerCount(give)===2)\";";
const selectedNew="||give.length>=3||tier==='down'||searchStyle()==='rebuild'||(give.length===2&&playerCount(give)===2)\";";
if(src.split(selectedOld).length-1!==1){console.error('V216 guard failed: selected shape preservation');return}
src=src.replace(selectedOld,selectedNew);

// Future-Oriented keeps a balanced receive-shape candidate slice before V209's established final structure mixers.
const takeOld="if(giveCount>=3&&tier!=='draft')return mixReceiveCounts(arr,6);if(!fairAny(tier,w))";
const takeNew="if(searchStyle()==='rebuild'&&tier!=='draft'){const buckets=new Map(FAIR_SHAPES.map(s=>[s,[]]));for(const r of arr){const s=packageShape(r.recv);if(buckets.has(s))buckets.get(s).push(r)}const out=[],used=new Set();let moved=true;while(moved&&out.length<6){moved=false;for(const s of FAIR_SHAPES){const b=buckets.get(s);if(b?.length){const r=b.shift();out.push(r);used.add(r);moved=true;if(out.length>=6)break}}}for(const r of mixReceiveCounts(arr,6)){if(out.length>=6)break;if(!used.has(r)){out.push(r);used.add(r)}}if(twoOut&&!out.some(trueTwo)){const cand=arr.find(r=>trueTwo(r)&&!out.includes(r));if(cand&&out.length){let i=out.findIndex(r=>packageShape(r.recv)==='multi-player');if(i<0)i=out.length-1;out[i]=cand}}return out}if(giveCount>=3&&tier!=='draft')return mixReceiveCounts(arr,6);if(!fairAny(tier,w))";
if(src.split(takeOld).length-1!==1){console.error('V216 guard failed: partner candidate slice');return}
src=src.replace(takeOld,takeNew);

// Candidate dedupe uses Future score only in Future-Oriented and never in Acquire Draft Picks.
const betterOld="}return a.recommend>b.recommend||(a.recommend===b.recommend&&a.gap<b.gap)}\";";
const betterNew="}if(futureActive()){const af=futureComposite(a),bf=futureComposite(b);if(af!==bf)return af>bf}return a.recommend>b.recommend||(a.recommend===b.recommend&&a.gap<b.gap)}\";";
if(src.split(betterOld).length-1!==1){console.error('V216 guard failed: candidate comparator');return}
src=src.replace(betterOld,betterNew);

// Inject Future-only helper functions into the frozen Finder source before V197/V209 transforms run.
const stageOld="const stagePatch=`\n";
const stageNew=`const stagePatch=\`\nconst v216OldPresentationSort=\"function presentationSort(a,b){return b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap}\";\nconst v216NewPresentationSort=\"function futureActive(){return searchStyle()==='rebuild'&&finderMode()!=='draft'}function futureQuality(x){return clamp(0,(av(x)-900)/5000,1)}function futureAgeScore(x){if(x?.type!=='player')return 50;const a=Number(st().players?.[id(x)]?.age);if(!Number.isFinite(a))return 50;const p=pos(x),peak=p==='RB'?24:p==='WR'?26:p==='QB'?29:p==='TE'?27:27,late=p==='RB'?10:p==='WR'?7:p==='QB'?4:p==='TE'?6:5;return clamp(10,100-Math.max(0,a-peak)*late,100)}function futureAssetScore(x){if(x?.type==='pick'){const q=clamp(0,(av(x)-350)/3600,1),r=Number(x?.round)||4,liq=r===1?15:r===2?9:r===3?4:0;return clamp(0,q*85+liq,100)}const q=futureQuality(x),age=futureAgeScore(x);return clamp(0,q*75+q*age*.25,100)}function futurePackageScore(xs){let n=0,d=0;for(const x of xs||[]){const w=Math.max(x?.type==='pick'?500:250,av(x));n+=futureAssetScore(x)*w;d+=w}return d?n/d:50}function futurePickScore(xs){const ps=(xs||[]).filter(x=>x?.type==='pick');return ps.length?ps.reduce((s,x)=>s+futureAssetScore(x),0)/ps.length:50}function futureTradeScore(r){const recv=futurePackageScore(r.recv),give=futurePackageScore(r.give),delta=clamp(0,50+(recv-give),100),tier=finderMode();if(tier==='up'){const c=rankCenter(r.recv),center=c?futureAssetScore(c):50;return clamp(0,center*.60+recv*.25+delta*.15,100)}if(tier==='down')return clamp(0,recv*.45+futurePickScore(r.recv)*.25+delta*.30,100);return clamp(0,50+(recv-give)*.55+(recv-50)*.25+(futurePickScore(r.recv)-50)*.20,100)}function futureComposite(r){if(!futureActive())return Number(r?.recommend)||0;const tier=finderMode(),w=tier==='up'?0.30:tier==='down'?0.28:0.25;return (Number(r?.recommend)||0)*(1-w)+futureTradeScore(r)*w}function presentationSort(a,b){if(futureActive()){const d=futureComposite(b)-futureComposite(a);if(d)return d}return b.recommend-a.recommend||b.f.score-a.f.score||a.gap-b.gap}\";\nif(src.split(v216OldPresentationSort).length-1!==1){console.error('V216 Finder guard failed: presentationSort');return}\nsrc=src.replace(v216OldPresentationSort,v216NewPresentationSort);\n`;
if(src.split(stageOld).length-1!==1){console.error('V216 guard failed: Finder-source stage');return}
src=src.replace(stageOld,stageNew)
       .replaceAll('V209 Finder','V216 Finder')
       .replace("version:'v209',base:'v208'","version:'v216',base:'v209'")
       .replace('trade-finder-v150-v209-runtime.js','trade-finder-v150-v216-runtime.js')
       .replace('trade-finder-style-loader-v209-transformed.js','trade-finder-style-loader-v216-transformed.js');
try{(0,eval)(src+'\n//# sourceURL=trade-finder-style-loader-v216-wrapper.js')}catch(e){console.error('V216 loader eval failed',e)}
})();
