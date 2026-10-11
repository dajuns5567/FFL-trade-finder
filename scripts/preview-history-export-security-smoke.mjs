import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isReadOnlyPreview} from '../netlify/functions/preview-read-only.mjs';

const prior={SITE_ID:process.env.SITE_ID,SITE_NAME:process.env.SITE_NAME,CONTEXT:process.env.CONTEXT,DEPLOY_URL:process.env.DEPLOY_URL};
try{
  delete process.env.SITE_NAME;
  delete process.env.DEPLOY_URL;
  process.env.CONTEXT='production';
  process.env.SITE_ID='3db3f8f7-4997-48db-b8a3-1325d18c75ec';
  const primary='https://fleeced-inquirer-browser-ci.netlify.app/.netlify/functions/value-history?archive_export=1';
  assert.equal(isReadOnlyPreview({url:primary}),true,'CI site ID must be read-only even in production context');
  process.env.SITE_ID='different-production-site';
  assert.equal(isReadOnlyPreview({url:primary}),true,'CI primary hostname must remain read-only');
  assert.equal(isReadOnlyPreview({url:'https://player-signal-layer-r1--fleeced-inquirer-browser-ci.netlify.app/.netlify/functions/value-history?archive_export=1'}),true,'CI branch hostname must remain read-only');
  assert.equal(isReadOnlyPreview({url:'https://deploy-preview-390--fleeced-inquirer-browser-ci.netlify.app/.netlify/functions/value-history?archive_export=1'}),true,'CI PR hostname must remain read-only');
  assert.equal(isReadOnlyPreview({url:'https://actual-production.example/.netlify/functions/value-history?archive_export=1'}),false,'normal production must not inherit preview restriction');
  const source=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
  assert(source.includes("url.searchParams.get('archive_export')==='1'&&isReadOnlyPreview(req)"),'archive export must be rejected on preview');
  assert(source.includes("preview history export disabled"),'preview rejection must be explicit');
  const update=readFileSync(new URL('../netlify/functions/update.mjs',import.meta.url),'utf8');
  assert(update.includes('const previewReadOnly=isReadOnlyPreview(req);'),'preview consensus must be identified, not blanket POST-blocked');
  const previewIndex=update.indexOf('if(previewReadOnly)return json(');
  const storedReadIndex=update.indexOf('const previous=await readLastGood();');
  assert(previewIndex>0&&storedReadIndex>previewIndex,'preview must return live consensus results before any store read');
  assert(update.includes('preview_read_only:true'),'preview must mark non-persistent consensus refresh');
  assert(update.indexOf('await writeLastGood(promoted);')>storedReadIndex,'preview cannot write the consensus LKG store');
  console.log('Public preview history export guard passed');
}finally{
  for(const [k,v] of Object.entries(prior))if(v===undefined)delete process.env[k];else process.env[k]=v;
}
