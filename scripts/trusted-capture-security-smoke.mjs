import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCaptureHandler} from '../netlify/functions/value-history-capture-background.mjs';
import valueHistory,{persistCanonicalCapture} from '../netlify/functions/value-history.mjs';
import {createUpdateHandler} from '../netlify/functions/update.mjs';
import {trustedServerRequest,isAuthorizedWrite,rememberDeploymentContext} from '../netlify/functions/privileged-write.mjs';
import {isReadOnlyPreview} from '../netlify/functions/preview-read-only.mjs';
import leagueHub from '../netlify/functions/league-hub.mjs';
import fastRead from '../netlify/functions/league-hub-read-fast.mjs';
import archiveIndexFast from '../netlify/functions/league-hub-archive-index-fast.mjs';
import weeklyLiveFast from '../netlify/functions/league-hub-weekly-live-fast.mjs';
import {publiclyApprovedEdition} from '../netlify/functions/inquirer-public-approval.mjs';
import {config as publishingSchedule} from '../netlify/functions/inquirer-publish-native-scheduled.mjs';
import {config as projectionSchedule} from '../netlify/functions/inquirer-projection-capture-native-scheduled.mjs';
class MemoryStore{
 values=new Map();writes=0;sequence=0;
 async get(key){return structuredClone(this.values.get(key)?.data??null)}
 async getWithMetadata(key){return structuredClone(this.values.get(key)??null)}
 async setJSON(key,data,conditions={}){
  const old=this.values.get(key);
  if(conditions.onlyIfNew&&old||conditions.onlyIfMatch&&old?.etag!==conditions.onlyIfMatch)return {modified:false};
  const etag=String(++this.sequence);this.values.set(key,{data:structuredClone(data),etag});this.writes++;
  return {modified:true,etag};
 }
}
async function securityTest(){
 const saved={CONTEXT:process.env.CONTEXT,DEPLOY_URL:process.env.DEPLOY_URL,SITE_NAME:process.env.SITE_NAME,SITE_ID:process.env.SITE_ID,FLEECED_SERVER_WRITE_TOKEN:process.env.FLEECED_SERVER_WRITE_TOKEN};
 const originalFetch=globalThis.fetch,originalBlobs=globalThis.netlifyBlobsContext;
 process.env.CONTEXT='production';
 for(const k of ['DEPLOY_URL','SITE_NAME','SITE_ID','FLEECED_SERVER_WRITE_TOKEN'])delete process.env[k];
 const canonical={rows:Array.from({length:700},(_,i)=>({id:String(i+1),value:1000,overall:i+1,pos:'WR',posRank:i+1})),picks:[{id:'pick-2027-1-1',value:2000,season:2027,round:1,original_owner:1,owner:1}],teams:Array.from({length:32},(_,i)=>({id:String(i+1),value:10000,player_count:10}))};
 const events=new MemoryStore(),history=new MemoryStore();let calculations=0;
 const handler=createCaptureHandler({getStorage:()=>events,calculate:async()=>{calculations++;return canonical},persist:(rows,id,source)=>persistCanonicalCapture(rows,id,source,history)});
 const post=body=>new Request('https://fleeced.example/.netlify/functions/value-history-capture-background',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 try{
  const id=randomUUID();
  assert.equal((await handler(post({event_id:id,source:'page-load',rows:[{value:999999}]}))).status,400);
  assert.equal(calculations,0);assert.equal(events.writes,0);assert.equal(history.writes,0);
  await handler(post({event_id:id,source:'page-load'}));
  assert.equal(calculations,1);
  const stored=await history.get('snapshots/capture-'+id+'.json');
  assert.deepEqual(stored.rows,canonical.rows.slice().sort((a,b)=>a.id.localeCompare(b.id)));
  assert.deepEqual(stored.teams,canonical.teams.slice().sort((a,b)=>a.id.localeCompare(b.id)));
  assert.equal((await events.get('events/'+id+'.json')).state,'complete');
  await handler(post({event_id:id,source:'manual-update'}));assert.equal(calculations,1);
  await Promise.all(Array.from({length:6},()=>handler(post({event_id:randomUUID(),source:'page-load'}))));
  assert.equal((await history.get('snapshot-index.json')).items.length,7);
  const month=stored.t.slice(0,7);assert.equal((await history.get('indexes/'+month+'.json')).items.length,7);
  await assert.rejects(()=>persistCanonicalCapture({...canonical,rows:canonical.rows.slice(0,699)},randomUUID(),'page-load',history),/Incomplete/);
  process.env.CONTEXT='deploy-preview';assert.equal((await handler(post({event_id:randomUUID(),source:'page-load'}))).status,403);
  assert.equal(calculations,7);process.env.CONTEXT='production';
  const privateRequest=trustedServerRequest('https://fleeced.example/.netlify/functions/league-hub');
  assert.equal(isAuthorizedWrite(privateRequest),true);assert.equal(isAuthorizedWrite(privateRequest.clone()),false);
  assert.equal(isAuthorizedWrite(new Request(privateRequest.url,{headers:{'x-trusted-server':'1'}})),false);
  const permalink='https://6acbaecb6b312719ad893115--extraordinary-toffee-98c3b7.netlify.app/.netlify/functions/value-history';
  process.env.DEPLOY_URL=permalink;
  assert.equal(isReadOnlyPreview(new Request(permalink)),false);
  assert.equal(isReadOnlyPreview(new Request('https://deploy-preview-390--extraordinary-toffee-98c3b7.netlify.app')),true);
  delete process.env.CONTEXT;assert.equal(isReadOnlyPreview(new Request(permalink)),true);
  const publicPublished=new Request(permalink);rememberDeploymentContext(publicPublished,{deploy:{context:'production'}});
  assert.equal(isAuthorizedWrite(publicPublished),false);
  const internalPublished=trustedServerRequest(permalink,{}, {deploy:{context:'production'}});
  assert.equal(isReadOnlyPreview(internalPublished),false);assert.equal(isReadOnlyPreview(internalPublished.clone()),true);
  assert.equal(isReadOnlyPreview(new Request(permalink),{deploy:{context:'deploy-preview'}}),true);
  process.env.CONTEXT='production';delete process.env.DEPLOY_URL;
  assert.equal(publishingSchedule.schedule,'0 * * * *');assert.equal(projectionSchedule.schedule,'5 * * * *');
  const refresh={results:Array.from({length:7},(_,i)=>({id:'source-'+i,source:'source-'+i,valid:true,rankings:[{player:'Test Player',rank:1,position:'WR'}],timestamp:'2026-10-12T00:00:00Z'}))};
  let reads=0,writes=0;
  const players=[{id:'1',name:'Test Player',position:'WR'}],prior={sources:{'Cached Source':{data:{'test player':1},playerCount:1}},composite:{byId:{'1':1}},updatedAt:'2026-10-11T00:00:00Z'};
  const update=createUpdateHandler({refresh:async()=>refresh,read:async()=>{reads++;return prior},write:async()=>{writes++;return true}});
  const updateReq=trusted=>{
   const init={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({players})};
   return trusted?trustedServerRequest('https://fleeced.example/api/update',init):new Request('https://fleeced.example/api/update',init);
  };
  assert.equal((await (await update(updateReq(false))).json()).promotion.promoted,false);assert.equal(writes,0);
  const directoryRequest=new Request('https://fleeced.example/api/update',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({players:Array.from({length:5500},(_,i)=>({id:String(i),name:'Historical Player '+i,position:'WR'}))})});
  assert.equal((await update(directoryRequest)).status,200);assert.equal(writes,0);
  assert.equal((await (await update(updateReq(true))).json()).promotion.promoted,true);assert.equal(writes,1);
  const failed=createUpdateHandler({refresh:async()=>({results:[]}),read:async()=>{reads++;return prior},write:async()=>{throw new Error('public fallback must not write')}});
  const fallback=await (await failed(updateReq(false))).json();
  assert.equal(fallback.promotion.using_last_known_good,true);assert.deepEqual(fallback.sources,prior.sources);
  process.env.CONTEXT='deploy-preview';const beforeReads=reads;await failed(updateReq(true));assert.equal(reads,beforeReads);
  process.env.CONTEXT='production';
  globalThis.netlifyBlobsContext=Buffer.from(JSON.stringify({siteID:'test',token:'fixture-only',edgeURL:'https://blobs.test',uncachedEdgeURL:'https://blobs.test'})).toString('base64');
  const hub=new MemoryStore();
  await hub.setJSON('broadcasts/index.json',[{season:2026,week:5},{season:2027,week:1}]);
  await hub.setJSON('broadcasts/2026/week-05.json',{available:true,season:2026,week:5,teams:[{headline:'LOCKED'}]});
  await hub.setJSON('awards/weekly.json',{records:[{season:2026,week:4},{season:2026,week:5},{season:2027,week:1}]});
  globalThis.fetch=async (input,init={})=>{
   const url=new URL(typeof input==='string'?input:input.url||String(input));
   if(url.hostname==='blobs.test'){
    const parts=url.pathname.split('/').filter(Boolean),store=decodeURIComponent(parts[1])==='site:fll-value-history-v2'?history:hub,key=parts.slice(2).join('/');
    if(String(init.method||'GET').toUpperCase()!=='GET')throw new Error('Public read attempted a storage mutation');
    const item=await store.getWithMetadata(key);return item?Response.json(item.data,{headers:{etag:item.etag}}):new Response(null,{status:404});
   }
   if(url.hostname==='raw.githubusercontent.com'&&url.pathname.endsWith('/index.json'))return Response.json({items:[],months:[]});
   throw new Error('Unexpected test network access: '+url.hostname+url.pathname);
  };
  for(const body of [{league:'1316867686394769408',rows:canonical.rows},{event_id:randomUUID(),source:'page-load'}]){
   const r=await valueHistory(new Request('https://fleeced.example/.netlify/functions/value-history',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));assert.equal(r.status,403);
  }
  for(const query of ['player_id=1','team_net=1&team_id=1&player_ids=1,2','market=1']){
   const response=await valueHistory(new Request('https://fleeced.example/.netlify/functions/value-history?'+query));
   assert.equal(response.status,200);const body=await response.json();
   assert(query==='market=1'?body.market.snapshot_count===7:body.points.length===7,'Stored canonical observations must reach public charts');
  }
  const fastIndex=await (await archiveIndexFast()).json();assert(fastIndex.reports.every(x=>publiclyApprovedEdition(x.season,x.week)));
  assert.equal((await (await weeklyLiveFast(new Request('https://fleeced.example/?season=2026&week=5'))).json()).available,false);
  for(const mode of ['archive','latest','weekly-awards']){
   const body=await (await fastRead(new Request('https://fleeced.example/.netlify/functions/league-hub-read-fast?mode='+mode))).json();
   assert(!JSON.stringify(body).includes('LOCKED'));
   assert((body.reports||body.records||[body]).every(row=>!row.season||publiclyApprovedEdition(row.season,row.week)));
  }
  for(const query of ['reporters=1','broadcast_season=2026&broadcast_week=5','broadcast_season=2027&broadcast_week=1']){
   const response=await leagueHub(new Request('https://fleeced.example/.netlify/functions/league-hub?'+query));assert.equal(response.status,200);
   if(!query.startsWith('reporters'))assert.equal((await response.json()).available,false);
  }
  process.env.CONTEXT='deploy-preview';assert.equal((await leagueHub(new Request('https://fleeced.example/.netlify/functions/league-hub?reporters=1'))).status,200);
  process.env.CONTEXT='production';
  let failOnce=true;const recoveryId=randomUUID();
  const recover=createCaptureHandler({getStorage:()=>events,calculate:async()=>canonical,persist:async(snap,id,source)=>{const saved=await persistCanonicalCapture(snap,id,source,history);if(failOnce){failOnce=false;throw new Error('simulated failure after storage')}return saved}});
  await assert.rejects(()=>recover(post({event_id:recoveryId,source:'page-load'})),/simulated/);
  assert.equal((await events.get('events/'+recoveryId+'.json')).state,'failed');
  const firstTime=(await history.get('snapshots/capture-'+recoveryId+'.json')).t;
  await recover(post({event_id:recoveryId,source:'page-load'}));
  assert.equal((await events.get('events/'+recoveryId+'.json')).state,'complete');
  assert.equal((await history.get('snapshots/capture-'+recoveryId+'.json')).t,firstTime);
  assert.equal((await history.get('snapshot-index.json')).items.length,8);
  console.log('Trusted capture, replay/concurrency, chart reads, consensus fallback, and approval boundary integration passed');
 }finally{
  globalThis.fetch=originalFetch;globalThis.netlifyBlobsContext=originalBlobs;
  for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
}
await securityTest();
