// Live read-only acceptance for the actual isolated restored Blob stores.
// This runs only inside GitHub Actions; never installs a runtime token on Netlify.
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
import {makeReadOnlyGateway} from './fullapp-sandbox-recovery-gateway.mjs';
const SITE='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
assert.equal(process.env.RECOVERY_DESTINATION_SITE_ID,SITE,'Refuse unexpected source site');
const token=process.env.NETLIFY_BLOBS_TOKEN;assert(token,'Missing Actions recovery token');
const history=getStore({name:'fleeced-recovery-history-rehearsal',siteID:SITE,token,consistency:'strong'});
const editorial=getStore({name:'fleeced-recovery-editorial-rehearsal',siteID:SITE,token,consistency:'strong'});
const gateway=makeReadOnlyGateway(()=>({history,editorial}));
const call=async(route,method='GET')=>gateway(new Request('https://sandbox.invalid'+route,{method}));
const index=await history.get('value-history/index.json',{type:'json'});
assert.equal(index.items?.length,156,'Restored 156-snapshot baseline changed');
const snapshot=await history.get(index.items[0].path,{type:'json'});
const sample=snapshot.rows?.find(row=>/^[a-zA-Z0-9_-]{1,48}$/.test(String(row.id||''))&&Number.isFinite(Number(row.value)));
assert(sample,'Cannot select a valid sample player from restored snapshot');
const hist=await call('/api/value-history?player_id='+encodeURIComponent(String(sample.id)));
assert.equal(hist.status,200,'Live recovered player-history gateway failed');
const player=await hist.json();
assert.equal(player.player_id,String(sample.id));
assert.equal(player.snapshot_count,156);
assert(player.points?.some(point=>point.t===snapshot.t&&Number(point.value)===Number(sample.value)),'Sample recovered valuation missing');
assert(player.points.every(point=>Number.isFinite(Number(point.value))),'Non-numeric historical values');
const archive=await call('/api/league-hub?broadcast_archive=1');
assert.equal(archive.status,200,'Live Inquirer archive route failed');
const archiveBody=await archive.json();
assert.deepEqual(archiveBody.reports.map(r=>r.week),[1,2,3,4]);
for(let week=1;week<=4;week++){
 const reply=await call('/api/league-hub?broadcast_season=2026&broadcast_week='+week);
 assert.equal(reply.status,200,'Isolated Inquirer week unavailable: '+week);
 const edition=await reply.json();
 assert.equal(edition.week,week);assert.equal(edition.teams,32);
 assert.equal(edition.article_count,32,'Missing restored article coverage');
 assert.equal(edition.content_redacted,true);
 assert(!JSON.stringify(edition).includes('inquirer_article'));
}
for(const route of ['/api/league-hub?broadcast_season=2026&broadcast_week=5','/api/value-history?archive_export=1']){
 const response=await call(route);assert([400,403].includes(response.status),'Unsupported route was accepted');
}
for(const route of ['/api/value-history?player_id='+encodeURIComponent(String(sample.id)),'/api/league-hub?broadcast_archive=1']){
 assert.equal((await call(route,'POST')).status,405,'Write method unexpectedly accepted');
}
console.log('LIVE ISOLATED FULLAPP GATEWAY READ CONTRACT PASS '+JSON.stringify({source_site:SITE,snapshots:156,history_points:player.points.length,inquirer_weeks:archiveBody.reports.length,articles_per_week:32,article_text_exposed:false,production_writes:0,netlify_deploys:0}));
