import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium,webkit,devices} from 'playwright';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const norm=read('trade-value-normalization-v139.js'),ranking=read('draft-pick-rankings-v527.js'),batch=read('finder-pagination-read-batch-v662.js'),oldOwner=read('trade-recommended-pick-ownership-v301.js'),newOwner=read('trade-recommended-pick-ownership-v662.js');
const renderer=read('trade-finder-v256-compiled.js');
const hook='window.tradeFinderV168={render,';
assert.equal(renderer.split(hook).length,2);
const instrumented=renderer.replace(hook,'window.__drawFixture=fixture=>{rows=fixture;visible=Math.min(5,rows.length);draw(document.getElementById("finderResults"))};'+hook);
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html data-fleeced-view="mobile"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><section id="finder"><div id="finderResults"></div></section></main></body></html>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/';
const results=[];
try{
 for(const [name,engine,opts] of [['iPhone WebKit',webkit,devices['iPhone 13']],['Desktop Chromium',chromium,{viewport:{width:1440,height:900}}]]){
  const browser=await engine.launch(engine===chromium?{args:['--no-sandbox']}:{});
  try{
   async function run(candidate){
    const page=await browser.newPage(opts);
    try{
     await page.goto(url);
     await page.evaluate(()=>{
      const teams=Array.from({length:32},(_,i)=>({id:i+1,name:'Team '+(i+1)})),players=Array.from({length:900},(_,i)=>({id:'p'+i,type:'player',rank:i+1,owner:1+i%32,position:['QB','RB','WR','TE','IDP'][i%5]})),picks=Array.from({length:288},(_,i)=>({id:'pick-'+i,type:'pick',season:2027+Math.floor(i/96),round:1+Math.floor(i%96/32),owner:1+i%32,original_owner:1+i%32}));
      window.state={teams,players:Object.fromEntries(players.map(p=>[p.id,{team:'MIN'}])),allAssets:[...players,...picks],league:{league_id:'fixture',season:'2026'}};
      window.teamName=id=>'Team '+id;window.playerName=id=>'Player '+id;
      window.playerRankValue=a=>({rank:a.rank});window.groupPos=a=>a.position;window.ensureMaster=()=>players.map(x=>({x}));
      const source=a=>({projectedSlot:a.original_owner,value:Math.round((4300-a.original_owner*90)/a.round*Math.pow(.88,a.season-2027)),originalTeam:'Team '+a.original_owner,currentOwnerTeam:'Team '+a.owner});
      window.draftPickProjection92=source;window.draftPickProjection90=source;
      const standings={status:'current',source:'sleeper-live-rosters',league_id:'fixture',season:2026,standings_season:2026,completed_week:11,teams:teams.map(t=>({roster_id:t.id,projected_slot:t.id,record_rank:t.id,points_rank:t.id,combined_rank:t.id,wins:5,losses:6,ties:0,points_for:1000+t.id}))};
      localStorage.setItem('fleeced-verified-pick-order-5050-v527',JSON.stringify(standings));
      window.fetch=async()=>({ok:true,json:async()=>standings});
      window.__rows=Array.from({length:17},(_,i)=>({other:2+i%10,give:[picks[192+i%7]],recv:[picks[96+(i+1)%8],players[i%4]],f:{score:95,aRaw:4000,bRaw:4050,aAdj:0,bAdj:0,aEffective:4000,bEffective:4050,edgeRaw:50},recommend:95,fit:90}));
     });
     for(const code of [norm,ranking,instrumented,...(candidate?[batch,newOwner]:[oldOwner])])await page.addScriptTag({content:code});
     await page.evaluate(()=>{window.__drawFixture(window.__rows)});
     await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
     const pages=[],times=[];
     for(const expected of [10,15,17]){
      const b=page.locator('#finderResults > button');await b.scrollIntoViewIfNeeded();
      const t=Date.now();
      if(name.includes('iPhone'))await b.tap({timeout:120000});else await b.click({timeout:120000});
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      times.push(Date.now()-t);
      const output=await page.locator('#finderResults').evaluate(e=>({html:e.innerHTML,cards:e.querySelectorAll('.trade95-card').length,ownership:e.querySelectorAll('[data-pick-ownership-v301="1"]').length}));
      assert.equal(output.cards,expected);assert.equal(output.ownership,expected*2,'All uniquely identified picks retain ownership labels');
      pages.push(output);
     }
     return{pages,times};
    }finally{await page.close()}
   }
   const baseline=await run(false),candidate=await run(true);
   assert.deepEqual(candidate.pages,baseline.pages,name+' exact production card markup, order, values, ownership, remaining count');
   const total=x=>x.times.reduce((s,v)=>s+v,0);
   assert(total(candidate)<total(baseline)*.8,name+' total native click through paint must improve by at least 20%');
   results.push({name,baselineMs:baseline.times,candidateMs:candidate.times});
  }finally{await browser.close()}
 }
 console.log('FINDER_PAGINATION_BROWSER '+JSON.stringify(results));
}finally{await new Promise(r=>server.close(r))}
