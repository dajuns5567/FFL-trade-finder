const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const els={findTeam:{value:'1'},tradeTier94:{value:'neutral'},findMode:{value:'balanced'},finderResults:{innerHTML:'',appendChild(){}},findShop:{querySelectorAll(){return[]}}};
const document={readyState:'complete',addEventListener(){},getElementById:id=>els[id]||null,querySelectorAll(){return[]},querySelector(){return null},createElement(){return{style:{},appendChild(){}}}};
const ctx={console,document,window:null,setTimeout(fn){fn();return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{}},queueMicrotask:fn=>fn()};
ctx.window=ctx;
ctx.state={allAssets:[],teams:[],players:{}};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});
ctx.playerName=x=>String(x?.name||x?.id||'');
ctx.groupPos=x=>x?.pos||'WR';
ctx.section1V130={fair(){return{score:85,rejected:false,ratio:1,aRaw:0,bRaw:0,aAdj:0,bAdj:0,aEffective:0,bEffective:0,edgeRaw:0,edgeEffective:0}}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('trade-finder-v256-compiled.js','utf8'),ctx,{filename:'trade-finder-v256-compiled.js'});
const api=ctx.tradeFinderV168;
assert(api?.outgoingFamilyKey&&api?.selectBlankDistribution&&api?.stabilizeBlankFamilies,'V328 helpers unavailable');
const P=(id,v,rank)=>({type:'player',id,name:id,v,rank,pos:'WR'}),K=(id,v)=>({type:'pick',id,v,season:2028,round:2});
const maxx=P('Maxx',6100,56),jj=P('Jefferson',8200,14),a=P('A',4800,80),b=P('B',3600,130),c=P('C',4300,95),d=P('D',3300,150),e=P('E',3900,110),f=P('F',3500,140);
assert(api.outgoingFamilyKey([maxx,K('p1',1000)])===api.outgoingFamilyKey([maxx,K('p2',900)]),'same player + different pick must be one family');
assert(api.outgoingFamilyKey([a,b])!==api.outgoingFamilyKey([a,c]),'different player cores must remain distinct families');
assert(api.outgoingFamilyKey([K('k1',800)])!==api.outgoingFamilyKey([K('k2',800)]),'pick-only packages must remain exact, not collapsed');
function row(give,score=90,rec=90,other=2,maxValueScore=null){return{give,recv:[P('R'+0,5000,70)],other,f:{score,edgeEffective:0},recommend:rec,gap:0,maximumValueScore:maxValueScore}}
const rows=[];
for(let i=0;i<12;i++)rows.push(row([maxx,K('mx'+i,1000-i)],92-i*.05,92-i*.05,2));
for(let i=0;i<10;i++)rows.push(row([jj,K('jj'+i,500-i)],91-i*.05,91-i*.05,3));
rows.push(row([a,b],91.5,91.5,4),row([c,d],91.4,91.4,5),row([e,f],91.3,91.3,6),row([a,c],91.2,91.2,7),row([b,d],91.1,91.1,8));
const selected=api.selectBlankDistribution(rows);
const first=selected.slice(0,8).map(r=>api.outgoingFamilyKey(r.give));
assert(new Set(first).size>=5,'blank selector still allows same-player + pick variants to crowd out distinct families: '+first.join(','));
assert(first.filter(x=>x==='P:Maxx').length<=1,'Maxx family repeated too early: '+first.join(','));

const ordered=[row([maxx,K('x1',1000)],94,94),row([maxx,K('x2',950)],93.9,93.9),row([a,b],93.5,93.5),row([c,d],93.4,93.4),row([e,f],93.3,93.3),row([jj,K('x3',300)],92,92)];
const stable=api.stabilizeBlankFamilies(ordered,'neutral');
const sf=stable.slice(0,4).map(r=>api.outgoingFamilyKey(r.give));
assert(new Set(sf).size===4,'final family stabilizer did not space families: '+sf.join(','));
assert(stable[0].f.score>=ordered[0].f.score-2,'quality guard allowed excessive fairness drop');

const src=fs.readFileSync('trade-finder-v256-compiled.js','utf8');
assert(src.includes("if(tier==='draft')return stabilizeBlankOrder(list)"),'draft exclusion missing');
assert(src.includes("if(tier!=='draft')for(const r of ordered)r.regularBlankFamilyKey=outgoingFamilyKey(r.give)"),'blank-only family marker missing');
const manualStart=src.indexOf("if(!blank){let ordered=varied.sort(presentationSort)");
const blankStart=src.indexOf("const diversified=stabilizeBlankOrder(varied)");
assert(manualStart>=0&&blankStart>manualStart,'manual and blank finalize branches not preserved');
const manualBlock=src.slice(manualStart,blankStart);
assert(!manualBlock.includes('stabilizeBlankFamilies')&&!manualBlock.includes('regularBlankFamilyKey'),'manual Finder path was modified by family stabilization');
assert(src.includes("const familyAware=finderMode()!=='draft'"),'draft-mode selector protection missing');

const pres=fs.readFileSync('trade-presentation-v169.js','utf8');
assert(pres.includes("const familyOrdered=cards.every(c=>String(c.dataset?.regularFamilyKey||''))"),'presentation family-order guard missing');
assert(pres.includes('Initial batch for all other searches keeps the V176 fairness/recommendation invariant'),'non-family presentation invariant was not retained');
console.log('V328 regular Finder family-diversity regression passed',first.join(' | '));
