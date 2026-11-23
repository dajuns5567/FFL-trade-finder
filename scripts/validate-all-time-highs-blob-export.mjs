// Offline-only validator for an authenticated preview read-only Blob export.
// Does NOT contain a write operation, credentials, or a synthetic high scorer.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validAwardHigh,mergeAwardHighs} from '../netlify/functions/lib/league-all-time-highs.mjs';
const LEAGUE='1316867686394769408';
const SOURCE='ffl-verified-netlify-blob-all-time-highs-readback';
export function validateBlobHighsExport(payload){
 if(payload?.schema_version!==1||payload.source!==SOURCE||
    payload.league_id!==LEAGUE||
    !/^https:\/\/deploy-preview-\d+--animated-dasik-3de74a\.netlify\.app$/.test(String(payload.preview_origin||''))||
    !Number.isFinite(Date.parse(payload.exported_at))||
    Math.abs(Date.now()-Date.parse(payload.exported_at))>30*86400000||
    !Array.isArray(payload.records)||payload.records.length<500||
    payload.record_count!==payload.records.length||
    Number(payload.source_counts?.blob)!==payload.records.length||
    Number(payload.source_counts?.durable)!==0)
  throw Error('AWARD_BLOB_EXPORT_INCOMPLETE_OR_UNTRUSTED');
 const recordKeys=new Set(),groups=new Set(),rosters=new Set();
 for(const row of payload.records){
  if(!validAwardHigh(row)||!Number.isFinite(Date.parse(row.captured_at))||
    Date.parse(row.captured_at)>Date.parse(payload.exported_at)+60000)
    throw Error('AWARD_BLOB_EXPORT_INVALID_RECORD');
  const key=row.award_key+'|'+row.roster_id;
  if(recordKeys.has(key))throw Error('AWARD_BLOB_EXPORT_DUPLICATE: '+key);
  recordKeys.add(key);groups.add(String(row.award_key));rosters.add(String(row.roster_id));
 }
 // The canonical Awards model has exactly twenty categories and thirty-two
 // rosters. A single absent score is allowed; incomplete seasons are not.
 if(groups.size!==20||rosters.size!==32)
  throw Error('AWARD_BLOB_EXPORT_INCOMPLETE_COVERAGE');
 const preserved=mergeAwardHighs(payload.records,[],payload.exported_at);
 if(preserved.length!==payload.records.length||
    preserved.some(row=>{
      const existing=payload.records.find(v=>v.award_key===row.award_key&&
        String(v.roster_id)===String(row.roster_id));
      return !existing||Number(existing.score)!==row.score||
        String(existing.captured_at)!==String(row.captured_at);
    }))
   throw Error('AWARD_BLOB_EXPORT_LOSSY_MERGE');
 return{league_id:LEAGUE,source:SOURCE,records:preserved,
  exported_at:payload.exported_at,record_count:preserved.length,
  category_count:groups.size,roster_count:rosters.size};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file=process.argv[2];
 if(!file)throw Error('Usage: node scripts/validate-all-time-highs-blob-export.mjs <authenticated-export.json>');
 const result=validateBlobHighsExport(JSON.parse(fs.readFileSync(file,'utf8')));
 console.log('VERIFIED_BLOB_ARCHIVE_IMPORT_CANDIDATE',JSON.stringify({
  record_count:result.record_count,category_count:result.category_count,
  roster_count:result.roster_count,exported_at:result.exported_at
 }));
 console.log('No write performed. Review the original records and provenance before any durable import.');
}
