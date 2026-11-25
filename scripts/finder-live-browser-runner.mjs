import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const original='scripts/value-history-headless-refresh.mjs',ephemeral='scripts/.finder-live-audit-collector.mjs';
let source=readFileSync(original,'utf8');
const replace=(from,to)=>{if(source.split(from).length!==2)throw Error('Original collector anchor drift: '+from);source=source.replace(from,to)};
replace("async function valueHistory(req){","let finderAuditReadMode=false;\nasync function valueHistory(req){\n if(finderAuditReadMode&&req.method==='GET'){const safe=new URL(req.url);safe.searchParams.set('readonly_preview','1');return valueHistoryReadHandler(new Request(safe.toString(),{method:'GET'}))}");
replace("    let response;","    if(finderAuditReadMode&&req.method!=='GET'){res.writeHead(403);res.end('FINDER AUDIT READ ONLY');return}\n    let response;");
replace("}finally{\n  await browser.close();\n  await new Promise(resolve=>server.close(resolve));\n}","  finderAuditReadMode=true;\n  const {auditFinder}=await import('./finder-live-browser-audit.mjs');\n  await auditFinder(page,browser);\n  await page.setViewportSize({width:357,height:564});\n  await page.waitForFunction(()=>document.documentElement.dataset.fleecedView===\'mobile\');\n  console.log(\'FINDER_LIVE_MOBILE_357\');\n  await auditFinder(page,browser);\n"+"}finally{\n  await browser.close();\n  await new Promise(resolve=>server.close(resolve));\n}");
writeFileSync(ephemeral,source);
try{
 const r=spawnSync(process.execPath,[ephemeral],{stdio:'inherit',env:{...process.env,CONTEXT:'deploy-preview',VALUE_HISTORY_CANDIDATE_MODEL:'idp-v101-verified-role-growth-v100-source-free-lineage',VALUE_HISTORY_READ_ONLY_CANDIDATE:'1',VALUE_HISTORY_SCHEDULED_MODEL:'idp-v96-single-source-continuous-v95-evidence',VALUE_HISTORY_V101_APPROVED:'0',VALUE_HISTORY_SNAPSHOT_FILE:'.tmp/finder-audit-snapshot.json',ALL_TIME_HIGHS_SCHEDULED_FILE:'.tmp/finder-audit-highs.json'},timeout:1100000});
 if(r.error)throw r.error;process.exitCode=r.status??1;
}finally{unlinkSync(ephemeral)}
