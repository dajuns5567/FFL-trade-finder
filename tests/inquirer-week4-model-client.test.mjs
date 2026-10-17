import test from 'node:test';
import assert from 'node:assert/strict';
import {createWeek4EditorialModelClient} from '../netlify/functions/inquirer-week4-model-client.mjs';

const credential='private-unit-test-token';

test('server-only adapter makes an explicit authenticated JSON model request',async()=>{
  let count=0;
  const client=createWeek4EditorialModelClient({apiKey:credential,baseUrl:'https://example.org/v1/',fetchImpl:async(url,options)=>{
    count++;
    assert.equal(String(url),'https://example.org/v1/chat/completions');
    assert.equal(options.method,'POST');
    assert.equal(options.headers.authorization,'Bearer '+credential);
    assert.equal(JSON.parse(options.body).model,'configured-model');
    return{ok:true,json:async()=>({choices:[{message:{content:'{"headline":"Example"}'}}]})};
  }});
  assert.equal(count,0,'constructing the model adapter never triggers billing');
  const response=await client.chat.completions.create({model:'configured-model',messages:[{role:'system',content:'style'},{role:'user',content:'facts'}],response_format:{type:'json_object'}});
  assert.equal(response.choices[0].message.content,'{"headline":"Example"}');
  assert.equal(count,1);
});

test('unsafe configuration and failed requests cannot silently yield editorial copy',async()=>{
  assert.throws(()=>createWeek4EditorialModelClient({}),/credential missing/);
  assert.throws(()=>createWeek4EditorialModelClient({apiKey:credential,baseUrl:'http://example.org/v1/'}),/HTTPS/);
  assert.throws(()=>createWeek4EditorialModelClient({apiKey:credential,timeoutMs:0}),/timeout/);
  const client=createWeek4EditorialModelClient({apiKey:credential,fetchImpl:async()=>({ok:false,status:429})});
  await assert.rejects(client.chat.completions.create({model:'model',messages:[{},{}]}),/HTTP 429/);
  const invalid=createWeek4EditorialModelClient({apiKey:credential,fetchImpl:async()=>({ok:true,json:async()=>({choices:[]})})});
  await assert.rejects(invalid.chat.completions.create({model:'model',messages:[{},{}]}),/returned no text/);
});
