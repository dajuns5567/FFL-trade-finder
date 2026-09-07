const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const legacy=(rank,maxRank=907)=>{
  const MIN=120,MAX=9999,PLAYER_BREAK=325,PLAYER_BREAK_VALUE=1825;
  const clamp=(a,x,b)=>Math.max(a,Math.min(x,b)),round5=n=>Math.round(Number(n||0)/5)*5;
  const r=clamp(1,Number(rank)||1,maxRank);
  if(r===1)return MAX;
  if(r<=PLAYER_BREAK){const t=(r-1)/(PLAYER_BREAK-1);return round5(PLAYER_BREAK_VALUE+(MAX-PLAYER_BREAK_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.56)),1.4))}
  const span=Math.max(1,maxRank-PLAYER_BREAK),t=(r-PLAYER_BREAK)/span;
  return round5(clamp(MIN,MIN+(PLAYER_BREAK_VALUE-MIN)*Math.pow(Math.max(0,1-Math.pow(t,.7)),1.5),PLAYER_BREAK_VALUE));
};
const players=[];
for(let i=1;i<=24;i++)players.push({type:'player',id:String(i),owner:i<=12?1:2,rank:i,pos:i%4===0?'QB':i%4===1?'RB':i%4===2?'WR':'TE'});
const picks=[
  {type:'pick',id:'pick-2027-1-1',owner:1,original_owner:1,season:2027,round:1},
  {type:'pick',id:'pick-2027-1-2',owner:2,original_owner:2,season:2027,round:1}
];
let modeledBase=2200;
let master=players.map((x,i)=>({x,value:modeledBase-i*45-(i===0?0:(i%5===0?70:0))}));
let ensureCalls=0;
const elements={
  findTeam:{value:'1'},findMode:{value:'balanced'},tradeTier94:{value:'neutral'},findPos:{value:'ANY'},
  finderResults:{innerHTML:'',textContent:'',querySelectorAll(){return[]},appendChild(){}},
  evalA:{value:'1'},evalB:{value:'2'},evalResults:{innerHTML:''},
  evalChooserA:{querySelectorAll(){return[]}},evalChooserB:{querySelectorAll(){return[]}},
  findShop:{querySelectorAll(){return[]}},rankings:{querySelectorAll(){return[]}},
  runFinder:{onclick:null},evaluate:{onclick:null},updateBtn:{onclick:null},updateStatus:{textContent:'ready'}
};
const doc={
  readyState:'complete',documentElement:{},body:{},
  getElementById:id=>elements[id]||null,
  querySelectorAll(sel){
    if(sel.includes('.shopCheck'))return[];
    if(sel.includes('trade97-pos'))return[];
    if(sel.includes('draftYear106')||sel.includes('draftRound106'))return[];
    return[];
  },
  addEventListener(){},
  createElement(){return{style:{},appendChild(){},querySelectorAll(){return[]}}},
};
const ctx={
  console,document:doc,queueMicrotask:fn=>fn(),alert(){},
  MutationObserver:function(cb){this.cb=cb;this.observe=()=>{};this.disconnect=()=>{}},
  setTimeout(fn){fn();return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},
};
ctx.window=ctx;
ctx.state={players:Object.fromEntries(players.map(p=>[p.id,{team:'NFL',fantasy_positions:[p.pos]}])),teams:[{id:1},{id:2}],allAssets:[...players,...picks],assetsA:[],assetsB:[],league:{scoring_settings:{bonus_rec_te:1}}};
ctx.ensureMaster=()=>{ensureCalls++;return master};
ctx.playerRankValue=a=>({rank:Number(a?.rank||a?.id)||9999});
ctx.playerName=id=>'P'+id;
ctx.groupPos=a=>a?.pos||'WR';
ctx.teamName=id=>'Team '+id;
ctx.tradeValueNormalizationV139=ctx.tradeValueNormalizationV130={
  MIN:120,MAX:9999,
  playerValueForRank:legacy,
  playerValue:a=>legacy(Number(a?.rank||a?.id)||1),
  canonicalValue(a){if(a?.type==='player')return legacy(Number(a?.rank||a?.id)||1)*1.1;if(a?.type==='pick')return a.id.endsWith('-1')?7000:6500;return 0},
  canonicalPackageValue(items){return(items||[]).reduce((s,a)=>s+this.canonicalValue(a),0)},
  pickContext(a){return{projectedSlot:16,originalTeam:'Team '+a.original_owner,currentOwnerTeam:'Team '+a.owner}},
  install(){}
};
vm.createContext(ctx);
for(const path of ['player-modeled-gap-display-v313.js','modeled-player-canonical-v318.js'])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const d=ctx.playerModeledGapDisplayV313,c=ctx.modeledPlayerCanonicalV318,n=ctx.tradeValueNormalizationV130;
assert(d&&c&&c.ready,'V318 canonical map did not install from a complete master');
assert(c.size===master.length,'V318 canonical map size mismatch');
for(const p of players)assert(n.canonicalValue(p)===d.value(p),'display and canonical player values differ for '+p.id);
assert(n.canonicalValue(players.find(p=>p.pos==='TE'))===d.value(players.find(p=>p.pos==='TE')),'TE player received an extra post-map adjustment');
assert(n.canonicalValue(picks[0])===7000&&n.canonicalValue(picks[1])===6500,'pick values changed');
assert(n.canonicalValue(players[0])===9999,'top player is not 9999');

const callsBeforeHotPath=ensureCalls;
vm.runInContext(fs.readFileSync('trade-runtime-v256-compiled.js','utf8'),ctx,{filename:'trade-runtime-v256-compiled.js'});
vm.runInContext(fs.readFileSync('trade-finder-v256-compiled.js','utf8'),ctx,{filename:'trade-finder-v256-compiled.js'});
(async()=>{
  const rows=await ctx.tradeFinderV168.generateAsync(0);
  assert(Array.isArray(rows),'compiled Finder did not return an array');
  assert(ensureCalls===callsBeforeHotPath,'Finder hot path re-entered ensureMaster/model construction');
  const give=players[0],recv=players[12];
  ctx.section1V130.evalSel.A.set(give.id,give);
  ctx.section1V130.evalSel.B.set(recv.id,recv);
  ctx.section1V130.install();
  assert(typeof elements.evaluate.onclick==='function','Evaluator click handler was not installed');
  elements.evaluate.onclick({preventDefault(){}});
  assert(/trade95-card/.test(elements.evalResults.innerHTML),'Evaluator did not render a trade card');
  assert(elements.evalResults.innerHTML.includes(Number(n.canonicalValue(give)).toLocaleString()),'Evaluator rendering did not use canonical modeled value');

  const old=n.canonicalValue(players[1]);
  modeledBase=2600;
  master=players.map((x,i)=>({x,value:modeledBase-i*30-(i===0?0:(i%4===0?90:0))}));
  const beforeRefreshCalls=ensureCalls;
  assert(c.refresh(),'validated refresh failed');
  assert(ensureCalls>beforeRefreshCalls,'refresh did not rebuild from fresh master');
  assert(n.canonicalValue(players[1])===d.value(players[1]),'display/canonical diverged after refresh');
  assert(n.canonicalValue(players[1])!==120,'refresh collapsed player to fallback 120');
  assert(n.canonicalValue(players[1])!==old||d.value(players[1])===old,'refresh produced inconsistent value state');

  const displaySrc=fs.readFileSync('player-modeled-gap-display-v313.js','utf8');
  assert(!displaySrc.includes("querySelectorAll('span,small,div')"),'unsafe chooser parent-node scan returned');
  console.log('V318 canonical modeled player lifecycle/Finder/Evaluator smoke passed');
})().catch(e=>{console.error(e);process.exit(1)});
