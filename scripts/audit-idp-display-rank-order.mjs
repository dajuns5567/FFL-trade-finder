import {chromium} from 'playwright';
const urls=[
 {name:'before',url:'https://6af891716fb055bedc867ef2--precious-dango-fb4633.netlify.app'},
 {name:'new',url:'https://deploy-preview-464--precious-dango-fb4633.netlify.app'}
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const target of urls){
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const r=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:120000});if(!r?.ok())throw Error('HTTP '+r?.status());
 await page.waitForFunction(()=>{try{window.fllStateBridgeV141?.syncState?.()}catch{}
  return window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&window.state?.sleeperHistory?.complete===true&&typeof window.ensureMaster==='function'&&typeof window.playerRankValue==='function';
 },null,{timeout:230000});
 const out=await page.evaluate(()=>{
  try{window.fllStateBridgeV141?.syncState?.()}catch{}
  const rows=window.ensureMaster(),id='11667',index=rows.findIndex(z=>String(z.x.id)===id);
  const z=rows[index],raw=Number(z?.value),hit=window.playerRankValue({type:'player',id});
  const greater=rows.filter(x=>Number(x.value)>raw).length,equals=rows.filter(x=>Number(x.value)===raw).length;
  const sorted=[...rows].sort((a,b)=>Number(b.value)-Number(a.value));
  const correct=sorted.findIndex(x=>String(x.x.id)===id)+1;
  const higher=rows.filter(x=>Number(x.value)>raw);
  const inversions=rows.slice(1).map((x,i)=>({i:i+1,prior:rows[i],next:x})).filter(x=>Number(x.next.value)>Number(x.prior.value)+.001);
  const prev=rows.slice(index-7,index+8).map((x,i)=>({index:index-7+i+1,name:window.state.players?.[x.x.id]?.full_name,id:x.x.id,tv:x.value}));
  const before=sorted.slice(correct-6,correct+7).map((x,i)=>({rank:correct-5+i,name:window.state.players?.[x.x.id]?.full_name,id:x.x.id,tv:x.value}));
  const rowText=[...document.querySelectorAll('[data-player-id]')].filter(e=>e.dataset.playerId===id).map(e=>e.innerText.slice(0,300));
  return{total:rows.length,modelRank:index+1,rankLookup:hit,raw,greater,equals,expectedRank:correct,
   inversions:inversions.length,inversionExamples:inversions.slice(0,15).map(x=>({rank:x.i,previous:x.prior.value,following:x.next.value,previousName:window.state.players?.[x.prior.x.id]?.full_name,followingName:window.state.players?.[x.next.x.id]?.full_name})),
   currentNeighbors:prev,valueNeighbors:before,displayText:rowText,
   masterFirst20:rows.slice(0,20).map(x=>({name:window.state.players?.[x.x.id]?.full_name,value:x.value}))};
 });
 console.log('TURNER_DISPLAY_ORDER_AUDIT '+JSON.stringify({target:target.name,url:target.url,result:out,errors},null,2));
 if(errors.length)throw Error(errors.join(';'));
 await page.close();
 }
}finally{await browser.close()}
