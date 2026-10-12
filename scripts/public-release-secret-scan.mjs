import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// High-confidence tracked-file scan. Never print matched credential material.
const files=execFileSync('git',['ls-files','-z'],{maxBuffer:10*1024*1024})
 .toString('utf8').split('\0').filter(Boolean);
const forbiddenPath=/(^|\/)(?:\.env(?:\..*)?|\.npmrc|id_rsa|id_ed25519|.*\.pem|.*\.p12|.*\.pfx)$/i;
const tests=[
 ['private key',/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
 ['GitHub access token',/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{30,}\b/g],
 ['GitHub fine-grained token',/\bgithub_pat_[A-Za-z0-9_]{60,}\b/g],
 ['AWS access key',/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
 ['Google API key',/\bAIza[0-9A-Za-z_-]{35}\b/g],
 ['Slack token',/\bxox[baprs]-[A-Za-z0-9-]{25,}\b/g],
 ['Stripe secret',/\bsk_(?:live|test)_[A-Za-z0-9]{24,}\b/g],
 ['Netlify token assignment',/\b(?:NETLIFY_AUTH_TOKEN|NETLIFY_BLOBS_TOKEN)\s*[:=]\s*["'][A-Za-z0-9_.-]{30,}["']/g],
];
const problems=[];
for(const filename of files){
 if(forbiddenPath.test(filename)){problems.push(filename+': tracked credential file path');continue}
 if(!/\.(?:js|mjs|cjs|json|ya?ml|toml|md|txt|html|css|sh)$/i.test(filename))continue;
 let source;
 try{source=readFileSync(filename,'utf8')}catch{continue}
 if(source.includes('\0'))continue;
 for(const [label,re] of tests){
  re.lastIndex=0;
  if(re.test(source))problems.push(filename+': possible '+label);
 }
}
if(problems.length){
 console.error('Potential tracked credentials (values deliberately hidden):');
 for(const problem of problems)console.error(' - '+problem);
 process.exitCode=1;
}else console.log('High-confidence tracked-file credential patterns: none found in '+files.length+' files.');
