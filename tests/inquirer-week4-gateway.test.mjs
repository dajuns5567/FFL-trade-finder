import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetlifyEditorialGatewayClient} from '../netlify/functions/inquirer-week4-gateway.mjs';

test('gateway adapter requires injected runtime variables and uses the official SDK defaults',()=>{
  let constructed=0;
  class FakeOpenAI{constructor(options){assert.equal(options,undefined,'SDK must consume injected credentials');constructed++}}
  const readEnv=k=>({'OPENAI_BASE_URL':'https://gateway.example/v1/','OPENAI_API_KEY':'injected-runtime-token'})[k];
  assert.ok(createNetlifyEditorialGatewayClient({OpenAIClass:FakeOpenAI,readEnv}));
  assert.equal(constructed,1);
  assert.throws(()=>createNetlifyEditorialGatewayClient({OpenAIClass:FakeOpenAI,readEnv:()=>undefined}),/not active/);
  assert.equal(constructed,1,'no paid model client is constructed without gateway activation');
});
