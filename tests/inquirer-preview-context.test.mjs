import test from 'node:test';
import assert from 'node:assert/strict';
import {isPreviewDiagnosticContext,resolvePreviewIdentity,previewStatusMatchesIdentity,privatePreviewStoreName,PREVIEW_DIAGNOSTIC_STATUS,PREVIEW_DIAGNOSTIC_EDITION,PREVIEW_DIAGNOSTIC_REJECTED} from '../netlify/functions/lib/inquirer-preview-diagnostics.mjs';

const preview=(site,n=402)=>'https://deploy-preview-'+n+'--'+site+'.netlify.app/.netlify/functions/inquirer-preview-diagnostic';

test('old and new project previews are accepted without a runtime CONTEXT variable',()=>{
 const prior=process.env.CONTEXT;
 try{
  delete process.env.CONTEXT;
  assert.equal(isPreviewDiagnosticContext(preview('brilliant-faun-c5b649')),true);
  assert.equal(isPreviewDiagnosticContext(preview('transcendent-manatee-2f0123')),true);
  assert.equal(isPreviewDiagnosticContext(preview('transcendent-manatee-2f0123',1002)),true);
  assert.equal(isPreviewDiagnosticContext(preview('gleaming-dodol-8dbc4a',421)),true);
 }finally{if(prior===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=prior}
});

test('production and unrelated Netlify projects never expose the private diagnostic',()=>{
 const prior=process.env.CONTEXT;
 try{
  delete process.env.CONTEXT;
  for(const url of [
   'https://transcendent-manatee-2f0123.netlify.app/.netlify/functions/inquirer-preview-diagnostic',
   'https://brilliant-faun-c5b649.netlify.app/.netlify/functions/inquirer-preview-diagnostic',
   preview('unrelated-project'),
   'https://example.org/.netlify/functions/inquirer-preview-diagnostic'
  ])assert.equal(isPreviewDiagnosticContext(url),false,url);
 }finally{if(prior===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=prior}
});

test('trusted Netlify deploy-preview context is accepted for actual function URLs',()=>{
 const prior=process.env.CONTEXT;
 try{
  process.env.CONTEXT='deploy-preview';
  assert.equal(isPreviewDiagnosticContext('https://localhost/.netlify/functions/inquirer-preview-diagnostic'),true);
 }finally{if(prior===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=prior}
});

test('isolated per-deploy preview keys are not permanently named after Week 5',()=>{
 for(const key of [PREVIEW_DIAGNOSTIC_STATUS,PREVIEW_DIAGNOSTIC_EDITION,PREVIEW_DIAGNOSTIC_REJECTED]){
  assert.ok(key.endsWith('.json'));
  assert.doesNotMatch(key,/week-?5/i);
 }
});

test('diagnostic keys differ across the same season Week 3, Week 5 and Week 6',async()=>{
 const savedFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({season:2026,week:7}),{status:200,headers:{'content-type':'application/json'}});
 try{
  const u='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app/.netlify/functions/inquirer-preview-diagnostic';
  const w3=await resolvePreviewIdentity(u+'?preview_week=3');
  const w5=await resolvePreviewIdentity(u+'?preview_week=5');
  const w6=await resolvePreviewIdentity(u+'?preview_week=6');
  const latest=await resolvePreviewIdentity(u);
  assert.deepEqual([w3.week,w5.week,w6.week,latest.week],[3,5,6,5]);
  assert.equal(new Set([w3.status,w5.status,w6.status]).size,3);
  assert.equal(new Set([w3.edition,w5.edition,w6.edition]).size,3);
  assert.equal(new Set([w3.rejected,w5.rejected,w6.rejected]).size,3);
  assert.match(w5.status,/2026\/week-05\/editorial-r\d+\/status\.json$/);
  assert.equal(w5.status,latest.status);
 }finally{globalThis.fetch=savedFetch}
});

test('new 2027 week reuses no old 2026 preview status',async()=>{
 const savedFetch=globalThis.fetch;
 let year=2026;
 globalThis.fetch=async()=>new Response(JSON.stringify({season:year,week:7}),{status:200});
 try{
  const url='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app/?inquirer_preview=1&preview_week=5';
  const prev=await resolvePreviewIdentity(url);
  year=2027;
  const next=await resolvePreviewIdentity(url);
  assert.notEqual(prev.status,next.status);
  assert.notEqual(prev.edition,next.edition);
 }finally{globalThis.fetch=savedFetch}
});

test('stored preview status must match the requested exact week and error label',()=>{
 const target={season:2026,week:5};
 assert.equal(previewStatusMatchesIdentity(null,target),false);
 assert.equal(previewStatusMatchesIdentity({state:'running',season:2026,week:5},target),true);
 assert.equal(previewStatusMatchesIdentity({state:'completed',season:2026,week:6},target),false);
 assert.equal(previewStatusMatchesIdentity({state:'error',season:2026,week:5,
  error:'Private preview held: Cannot generate Week 6 editorial preview: Week 3 missing'},target),false);
 assert.equal(previewStatusMatchesIdentity({state:'error',season:2026,week:5,
  error:'Private preview held: Cannot generate Week 5 editorial preview: Week 3 missing'},target),true);
 assert.equal(previewStatusMatchesIdentity({state:'running',started_at:new Date().toISOString()},target),false,
  'Legacy unscoped status cannot be trusted or treated as an existing Week 5 generation');
 assert.equal(previewStatusMatchesIdentity({state:'error',season:2027,week:5},target),false);
});


test('new account private diagnostics isolate PRs and reject production and unrelated hosts',()=>{
 const first=privatePreviewStoreName(preview('gleaming-dodol-8dbc4a',421));
 const second=privatePreviewStoreName(preview('gleaming-dodol-8dbc4a',422));
 assert.equal(first,'fleeced-inquirer-private-pr421-persistent');
 assert.notEqual(first,second);
 assert.equal(privatePreviewStoreName('https://gleaming-dodol-8dbc4a.netlify.app/.netlify/functions/inquirer-preview-diagnostic'),null);
 assert.equal(privatePreviewStoreName(preview('unrelated-project',421)),null);
 assert.equal(privatePreviewStoreName('not-a-url'),null);
 assert.equal(privatePreviewStoreName(preview('transcendent-manatee-2f0123',402)),'fleeced-inquirer-private-pr402-persistent');
 assert.equal(privatePreviewStoreName(preview('gleaming-dodol-8dbc4a',402)),'fleeced-inquirer-private-pr402-persistent');
 assert.equal(privatePreviewStoreName('https://deploy-preview-421--gleaming-dodol-8dbc4a.netlify.app.evil.example/'),null);
});

test('private Week 8 continuity accepts only an exact, full-audit Week 7 manuscript',async()=>{
 const {isVerifiedPrivatePreviewPredecessor}=await import('../netlify/functions/lib/inquirer-preview-diagnostics.mjs');
 const {FORWARD_EDITORIAL_REVISION}=await import('../netlify/functions/inquirer-editorial-v31.mjs');
 const kinds=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
 const reporters=['mack-hollis','nora-voss','walter-mercer','tess-delaney'];
 const draft={
  season:2026,week:7,preview_only:true,published_locked:false,
  editorial_revision:FORWARD_EDITORIAL_REVISION,
  preview_editorial_audit:{ok:true},preview_generation_quality:{ok:true},
  teams:Array.from({length:32},(_,i)=>({
   roster_id:i+1,team_name:'Team '+(i+1),
   inquirer_article:{
    headline:'Week 7 for team '+(i+1),reporter:{id:reporters[i%4]},
    sections:kinds.map(kind=>({kind,paragraphs:[
     Array.from({length:43},(_,j)=>'story'+i+'_'+kind.replace('-','')+'_'+j).join(' ') + '.'
    ]}))
   }
  })),
  league_overview:{sections:[
   {blocks:['lead','standings','players','decisions','league','outlook'].map(kind=>({kind,paragraphs:['Unique audited recap '+kind]}))},
   {paragraphs:['Another recap page']},{paragraphs:['Continued coverage']},{paragraphs:['Forward look']}
  ]}
 };
 assert.equal(isVerifiedPrivatePreviewPredecessor(draft,2026,7),true,'fully reviewed draft can anchor only next private week');
 for(const altered of [
  {...draft,week:8},
  {...draft,season:2027},
  {...draft,preview_only:false,published_locked:true},
  {...draft,editorial_revision:FORWARD_EDITORIAL_REVISION-1},
  {...draft,preview_generation_quality:{ok:false}},
  {...draft,preview_editorial_audit:{ok:false}},
  {...draft,teams:draft.teams.slice(0,31)},
  {...draft,teams:draft.teams.map((t,i)=>i===0?{...t,inquirer_article:{...t.inquirer_article,sections:[]}}:t)}
 ])assert.equal(isVerifiedPrivatePreviewPredecessor(altered,2026,7),false,'must refuse nonmatching or substandard prior draft');
 assert.equal(isVerifiedPrivatePreviewPredecessor(draft,2026,6),false);
 assert.equal(isVerifiedPrivatePreviewPredecessor(draft,2026,8),false);
});
test('production publication path cannot consume private predecessors',()=>{
 const source=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert.match(source,/previewReadOnly\?privatePreviewStoreName\(req\.url\):null/);
 assert.match(source,/previewReadOnly&&await getPrivatePredecessor\(w\)/);
 assert.match(source,/previewReadOnly&&previousBroadcast===privatePredecessor/);
 assert.match(source,/requested!==w\+1\|\|w<7/);
 assert.match(source,/isLockedInquirerEdition\(stored,season,w\)/);
 assert.match(source,/getStore\(\{name:privateStoreName,consistency:'strong'\}\)\.get/);
});
