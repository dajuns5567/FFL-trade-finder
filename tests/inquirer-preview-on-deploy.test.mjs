import test from 'node:test';
import assert from 'node:assert/strict';
import {startPreviewDraftForDeploy,findFirstMissingInquirerWeek} from '../netlify/functions/inquirer-preview-on-deploy.mjs';

const previewUrl='https://deploy-preview-402--brilliant-faun-c5b649.netlify.app';

test('successful PR preview queues its own isolated unpublished draft',async()=>{
 const calls=[];
 const queued=await startPreviewDraftForDeploy({deploy:{context:'deploy-preview',sslUrl:previewUrl}},async request=>{
  calls.push({url:request.url,method:request.method});
 });
 assert.equal(queued,true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,previewUrl+'/.netlify/functions/inquirer-preview-background?start=1');
 assert.equal(calls[0].method,'GET');
});

test('Netlify immutable deploy URL is accepted for an event with matching deploy and site identity',async()=>{
 const id='6ad56e4f9821461e4876bac6',permalinkUrl='https://'+id+'--brilliant-faun-c5b649.netlify.app';
 const calls=[];
 const queued=await startPreviewDraftForDeploy({deploy:{context:'deploy-preview',id,permalinkUrl,sslUrl:'https://brilliant-faun-c5b649.netlify.app'},site:{name:'brilliant-faun-c5b649'}},async request=>{calls.push(request.url)});
 assert.equal(queued,true);
 assert.equal(calls[0],permalinkUrl+'/.netlify/functions/inquirer-preview-background?start=1');
});

test('never starts draft generation on production, branch or arbitrary hosts',async()=>{
 const calls=[];const generator=async request=>{calls.push(request)};
 for(const event of [
  {deploy:{context:'production',sslUrl:previewUrl}},
  {deploy:{context:'branch-deploy',sslUrl:previewUrl}},
  {deploy:{context:'deploy-preview',sslUrl:'https://brilliant-faun-c5b649.netlify.app'}},
  {deploy:{context:'deploy-preview',sslUrl:'https://example.com'}},
  {deploy:{context:'deploy-preview',id:'6ad56e4f9821461e4876bac6',permalinkUrl:'https://6ad56e4f9821461e4876bac6--wrong-site.netlify.app'},site:{name:'brilliant-faun-c5b649'}},
  {deploy:{context:'deploy-preview'}},
  {}
 ])assert.equal(await startPreviewDraftForDeploy(event,generator),false);
 assert.equal(calls.length,0);
});

test('deploy event only waits for background 202 acceptance, never for the full manuscript',async()=>{
 let calls=0;
 const started=Date.now();
 const queued=await startPreviewDraftForDeploy({deploy:{context:'deploy-preview',sslUrl:previewUrl}},async request=>{
  calls++;assert.match(request.url,/inquirer-preview-background\?start=1$/);
  return new Response(null,{status:202});
 });
 assert.equal(queued,true);
 assert.equal(calls,1);
 assert(Date.now()-started<300,'Queue acknowledgement must be immediate');
});

test('a permanent background enqueue failure cannot silently claim success',async()=>{
 await assert.rejects(
  startPreviewDraftForDeploy({deploy:{context:'deploy-preview',sslUrl:previewUrl}},async()=>new Response('Unavailable',{status:403})),
  /Could not enqueue isolated Inquirer preview background job: HTTP 403/
 );
});

test('PR 402 deploy worker targets the earliest missing archived Week 5',async()=>{
 const url='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app';
 const calls=[];
 const started=await startPreviewDraftForDeploy({deploy:{context:'deploy-preview',sslUrl:url}},async req=>{
  calls.push(req.url);return new Response(null,{status:202});
 },async()=>5);
 assert.equal(started,true);
 assert.deepEqual(calls,[url+'/.netlify/functions/inquirer-preview-background?start=1&preview_week=5']);
});

test('archive continuity moves private generation forward only after Week 5 is locked',async()=>{
 const url='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app';
 const urls=[];
 const read=async input=>{
  const u=String(input);urls.push(u);
  if(u.includes('/state/nfl'))return new Response(JSON.stringify({season:2026,week:7}),{status:200});
  if(u.includes('broadcast_week=5'))return new Response(JSON.stringify({
   available:true,published_locked:true,season:2026,week:5
  }),{status:200});
  if(u.includes('broadcast_week=6'))return new Response(JSON.stringify({error:'broadcast not found'}),{status:200});
  throw Error('Unexpected archive URL: '+u);
 };
 assert.equal(await findFirstMissingInquirerWeek(new URL(url),read),6);
 assert.equal(urls.length,3);
});
