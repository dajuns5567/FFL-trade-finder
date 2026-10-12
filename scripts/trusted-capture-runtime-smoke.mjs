// Controlled valuation-provider fixtures; real application and Sleeper inputs.
// All Netlify persistence is intercepted by a memory transport.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
import {collectCanonicalSnapshot} from './value-history-headless-refresh.mjs';
import {createUpdateHandler} from '../netlify/functions/update.mjs';
import {createCaptureHandler} from '../netlify/functions/value-history-capture-background.mjs';
async function runtimeTest(){
 const originalFetch=globalThis.fetch,originalContext=globalThis.netlifyBlobsContext;
 const records=new Map();let writes=0;
 globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'runtime-test',token:'fixture-only',edgeURL:'https://blobs.runtime.test',uncachedEdgeURL:'https://blobs.runtime.test'})).toString('base64');
 globalThis.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url||String(input));
  if(url.hostname!=='blobs.runtime.test')return originalFetch(input,init);
  const key=decodeURIComponent(url.pathname),previous=records.get(key),headers=new Headers(init.headers),method=String(init.method||'GET').toUpperCase();
  if(method==='GET')return previous?Response.json(previous.data,{headers:{etag:previous.etag}}):new Response(null,{status:404});
  assert.equal(method,'PUT','Runtime must not delete historical data');
  if(headers.get('if-none-match')==='*'&&previous||headers.has('if-match')&&headers.get('if-match')!==previous?.etag)return new Response(null,{status:412});
  const data=JSON.parse(await new Response(init.body).text()),etag=String(++writes);
  records.set(key,{data,etag});return new Response(null,{headers:{etag}});
 };
 try{
  const response=await fetch('https://api.sleeper.app/v1/players/nfl',{signal:AbortSignal.timeout(60000)});
  assert(response.ok);const directory=await response.json();
  const players=Object.values(directory).filter(p=>p.active&&p.team&&p.full_name);
  const rows=(positions,idp=false)=>players.filter(p=>positions.includes(p.position)).slice(0,650).map((p,i)=>({player:p.full_name,position:idp?'IDP':p.position,rank:i+1}));
  const offense=rows(['QB','RB','WR','TE']),idp=rows(['DL','DE','DT','LB','DB','CB','S','EDGE'],true);
  assert(offense.length>=300&&idp.length>=100);
  const definitions=[
   ['ktc','KeepTradeCut',offense],['fantasypros-superflex','FantasyPros Superflex',offense],
   ['draftsharks','Draft Sharks',offense],['combined-dynasty','The IDP Show Combined',[...offense,...idp]],
   ['draftsharks-idp','DraftSharks IDP',idp],['rotowire-idp','RotoWire IDP',idp],['fanranked','FanRanked',offense]
  ];
  let promoted=0;
  const update=createUpdateHandler({refresh:async()=>({results:definitions.map(([id,source,rankings])=>({id,source,rankings,valid:true,players_extracted:rankings.length,timestamp:new Date().toISOString()}))}),read:async()=>null,write:async()=>{promoted++;return true}});
  const snapshot=await collectCanonicalSnapshot({
   persistLocal:false,promoteConsensus:true,maintainAwards:true,isolationProbe:true,update,
   launch:async()=>playwright.launch({args:chromium.args,executablePath:process.env.FLEECED_TEST_CHROMIUM_PATH||await chromium.executablePath(),headless:true})
  });
  assert(snapshot.rows.length>=700);assert.equal(snapshot.teams.length,32);assert(snapshot.picks.length>0);
  assert.equal(snapshot.maintenance?.ok,true);assert(promoted>0);
  assert(records.has('/runtime-test/site:fleeced-league-hub/awards/highs.json'));
  assert(records.has('/runtime-test/site:fleeced-league-hub/awards/draft-records.json'));
  assert(records.has('/runtime-test/site:fleeced-league-hub/awards/history.json'));
  const eventId=randomUUID();
  await createCaptureHandler({calculate:async()=>snapshot})(new Request('https://fleeced.example/.netlify/functions/value-history-capture-background',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event_id:eventId,source:'page-load'})}),{deploy:{context:'production'}});
  assert.equal(records.get('/runtime-test/site:fll-value-history-capture/events/'+eventId+'.json')?.data?.state,'complete');
  assert.equal(records.get('/runtime-test/site:fll-value-history-v2/snapshots/capture-'+eventId+'.json')?.data?.rows?.length,snapshot.rows.length);
  console.log(JSON.stringify({ok:true,test:'controlled providers, real Sleeper, memory-only persistence, collector isolation',players:snapshot.rows.length,teams:snapshot.teams.length,picks:snapshot.picks.length,promoted,writes},null,2));
 }finally{globalThis.fetch=originalFetch;globalThis.netlifyBlobsContext=originalContext}
}
await runtimeTest();
