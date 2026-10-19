import test from 'node:test';
import assert from 'node:assert/strict';
import {startPreviewDraftForDeploy} from '../netlify/functions/inquirer-preview-on-deploy.mjs';

const previewUrl='https://deploy-preview-402--brilliant-faun-c5b649.netlify.app';

test('successful PR preview queues its own isolated unpublished draft',async()=>{
 const calls=[];
 const queued=await startPreviewDraftForDeploy({deploy:{context:'deploy-preview',sslUrl:previewUrl}},async(url,options)=>{
  calls.push({url:String(url),options});return{ok:true};
 });
 assert.equal(queued,true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,previewUrl+'/.netlify/functions/inquirer-preview-background?start=1');
 assert.equal(calls[0].options.method,'GET');
});

test('Netlify immutable deploy URL is accepted for an event with matching deploy and site identity',async()=>{
 const id='6ad56e4f9821461e4876bac6',permalinkUrl='https://'+id+'--brilliant-faun-c5b649.netlify.app';
 const calls=[];
 const queued=await startPreviewDraftForDeploy({deploy:{context:'deploy-preview',id,permalinkUrl,sslUrl:'https://brilliant-faun-c5b649.netlify.app'},site:{name:'brilliant-faun-c5b649'}},async url=>{calls.push(String(url));return{ok:true}});
 assert.equal(queued,true);
 assert.equal(calls[0],permalinkUrl+'/.netlify/functions/inquirer-preview-background?start=1');
});

test('never starts draft generation on production, branch or arbitrary hosts',async()=>{
 const calls=[];const fetcher=async url=>{calls.push(url);return{ok:true}};
 for(const event of [
  {deploy:{context:'production',sslUrl:previewUrl}},
  {deploy:{context:'branch-deploy',sslUrl:previewUrl}},
  {deploy:{context:'deploy-preview',sslUrl:'https://brilliant-faun-c5b649.netlify.app'}},
  {deploy:{context:'deploy-preview',sslUrl:'https://example.com'}},
  {deploy:{context:'deploy-preview',id:'6ad56e4f9821461e4876bac6',permalinkUrl:'https://6ad56e4f9821461e4876bac6--wrong-site.netlify.app'},site:{name:'brilliant-faun-c5b649'}},
  {deploy:{context:'deploy-preview'}},
  {}
 ])assert.equal(await startPreviewDraftForDeploy(event,fetcher),false);
 assert.equal(calls.length,0);
});
