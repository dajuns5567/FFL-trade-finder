import {execFileSync} from 'node:child_process';
import {basename} from 'node:path';
import {readFileSync} from 'node:fs';
// No credential strings or private values are printed. Scan unique reachable
// Git blobs (including archived branches), not a separate checkout of every commit.
const patterns=[
 ['GitHub access token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/],
 ['OpenAI-style secret key',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,255}\b/],
 ['AWS access key identifier',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['Private key material',/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=]{40,}/],
 ['Netlify personal access token',/\bnfp_[A-Za-z0-9_-]{30,255}\b/],
 ['URL-embedded credentials',/https?:\/\/[^/\s"'<>:@]{1,100}:[^/\s"'<>@]{8,300}@[^/\s"'<>]+/]
];

const run=(args,opts={})=>execFileSync('git',args,{maxBuffer:96*1024*1024,...opts});
const listing=run(['rev-list','--objects','--all'],{encoding:'utf8'}).split('\n').filter(Boolean);
const paths=new Map();
for(const row of listing){const i=row.indexOf(' ');if(i>0)paths.set(row.slice(0,i),row.slice(i+1))}
const ids=[...paths.keys()];
const meta=run(['cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],{input:ids.join('\n')+'\n',encoding:'utf8'}).split('\n').filter(Boolean);
const jobs=[],skipped=[],findings=[],privateFields=[];
const suspiciousName=file=>{const name=basename(file);return (/^\.env(?:\.|$)/.test(name)&&name!=='.env.example')||/\.(?:pem|p12|pfx|key|storage-state\.json)$/i.test(name)};
for(const row of meta){const [id,type,sizeText]=row.split(' '),size=Number(sizeText);if(type!=='blob')continue;const file=paths.get(id);
 if(suspiciousName(file))findings.push({file,category:'Historical credential or session filename',blob:id});
 if(size>16*1024*1024){skipped.push({file,bytes:size,reason:'large blob'});continue}jobs.push({id,file,size});
}
let scanned=0,binary=0;
for(let i=0;i<jobs.length;){
 let bytes=0;const batch=[];
 do{const job=jobs[i++];batch.push(job);bytes+=job.size+120}while(i<jobs.length&&bytes+jobs[i].size<12*1024*1024&&batch.length<1500);
 const result=run(['cat-file','--batch'],{input:batch.map(x=>x.id).join('\n')+'\n',maxBuffer:32*1024*1024});
 let offset=0;
 for(const job of batch){
  const end=result.indexOf(10,offset);if(end<0)throw Error('Git blob header unavailable');
  const [id,type,size]=result.subarray(offset,end).toString('utf8').split(' ');if(id!==job.id||type!=='blob'||Number(size)!==job.size)throw Error('Git blob scan inventory mismatch');
  const data=result.subarray(end+1,end+1+job.size);offset=end+1+job.size+1;
  if(data.includes(0)){binary++;continue}scanned++;
  const text=data.toString('utf8');
  for(const [category,pattern] of patterns)if(pattern.test(text))findings.push({file:job.file,category,blob:job.id});
  // Review private contact/session-like fields in archived league JSON, not
  // ordinary usernames or player statistics. Report field categories only.
  if(/^(?:data\/sleeper\/|value-history\/|inquirer\/).*\.json$/i.test(job.file)){
   for(const [field,pattern] of [['email',/"(?:email|email_address)"\s*:\s*"[^"]+@[^"]+"/i],['phone',/"(?:phone_number|mobile_number)"\s*:\s*"[^"]{7,}"/i],['private token',/"(?:access_token|refresh_token|session_token|password)"\s*:\s*"[^"]{8,}"/i]])if(pattern.test(text))privateFields.push({file:job.file,field,blob:job.id});
  }
 }
 if(offset!==result.length)throw Error('Git blob scan trailing data');
}
const tracked=run(['ls-files','-z']).toString('utf8').split('\0').filter(Boolean);
const functions=tracked.filter(p=>/^netlify\/functions\/[^/]+\.(?:mjs|js|mts|ts|cjs)$/.test(p)).flatMap(file=>{
 const code=readFileSync(file,'utf8');
 if(!/export\s+default\b|exports\.handler\s*=/.test(code))return [];
 return[{file,scheduled:/\bschedule\s*:/.test(code),background:/\bbackground\s*:\s*true/.test(code),rateLimit:/\brateLimit\s*:/.test(code),potentialStorageMutation:/\.setJSON\(|\.delete\(|\.set\(/.test(code),methodGuard:/req(?:uest)?\.method/.test(code),serverCredentialReference:/process\.env\.[A-Z_]*(?:TOKEN|SECRET|KEY)|Netlify\.env/.test(code)}];
});
const workflows=tracked.filter(p=>/^\.github\/workflows\/[^/]+\.ya?ml$/.test(p)).flatMap(file=>{
 const code=readFileSync(file,'utf8');
 if(/pull_request_target\s*:/m.test(code))return[{file,reason:'review pull_request_target workflow'}];
 if(!/pull_request\s*:/m.test(code)||!/contents:\s*write\b/m.test(code))return [];
 // Only explicitly branch/event-gated jobs may hold write permission in a
 // PR-triggerable workflow. Check the actual job-level guard, not step guards.
 // This deliberately rejects unfamiliar YAML layouts for manual review.
 const lines=code.split('\n'),jobStart=lines.findIndex(line=>/^jobs:\s*$/.test(line));
 const allowed=new Set([
  "github.ref == 'refs/heads/main' && (github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' || github.event_name == 'push')",
  "github.event_name == 'push' && github.ref == 'refs/heads/fix/inquirer-github-native-publication-20261121'"
 ]);
 const bad=[];let job='',guard='';
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(i>jobStart&&/^  [A-Za-z0-9_-]+:\s*$/.test(line)){job=line.trim().slice(0,-1);guard='';}
  if(i>jobStart&&/^    if: /.test(line))guard=line.trim().slice(4);
  if(/contents:\s*write\b/.test(line)&&!/^\s*#/.test(line)){
   if(jobStart<0||i<=jobStart||!job||!/^      contents: write(?:\s*(?:#.*)?)$/.test(line)||!allowed.has(guard))
    bad.push({file,job:job||'workflow',reason:'write permission lacks explicit trusted job-level event/ref guard'});
  }
 }
 return bad;
});
console.log('HISTORICAL_SECURITY_REPORT '+JSON.stringify({reachableObjects:listing.length,textBlobsScanned:scanned,binaryBlobs:binary,skippedLargeBlobs:skipped.length,possibleSecretFindings:findings,possiblePrivateFields:privateFields,limitations:['Known credential patterns only; binary/large blobs and unreachable objects are excluded. No account settings or active token validity inferred.']}));
console.log('FUNCTION_ACCESS_INVENTORY '+JSON.stringify(functions));
console.log('PR_WORKFLOW_PERMISSION_REVIEW '+JSON.stringify(workflows));
if(findings.length||privateFields.length||workflows.length)process.exitCode=1;
