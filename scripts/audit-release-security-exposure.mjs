import {execFileSync} from 'node:child_process';
import {readFileSync,statSync} from 'node:fs';
import {basename} from 'node:path';

// Read-only release-tree screening. Report paths and categories, NEVER matches,
// credential values, authorization headers, personal account data or file bodies.
// This is a limited pattern-based check, not a complete history/secret scanner.
const tracked=execFileSync('git',['ls-files','-z'],{maxBuffer:32*1024*1024}).toString('utf8').split('\0').filter(Boolean);
const findings=[],review=[],skipped=[];
const patterns=[
 ['GitHub access token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/],
 ['OpenAI-style secret key',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,255}\b/],
 ['AWS access key identifier',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['Private key material',/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=]{40,}/],
 ['Netlify personal access token',/\bnfp_[A-Za-z0-9_-]{30,255}\b/],
 ['URL-embedded credentials',/https?:\/\/[^/\s"'<>:@]{1,100}:[^/\s"'<>@]{8,300}@[^/\s"'<>]+/]
];
let scanned=0;
for(const file of tracked){
 const name=basename(file);
 if((/^\.env(?:\.|$)/.test(name)&&name!=='.env.example')||/\.(?:pem|p12|pfx|key|storage-state\.json)$/i.test(name))
  findings.push({file,category:'Tracked credential or session filename'});
 if(/(?:^|\/)(?:tests|scripts|artifacts|netlify\/functions|\.github)(?:\/|$)/.test(file))review.push(file);
 let size;try{size=statSync(file).size}catch{skipped.push({file,reason:'unreadable'});continue}
 if(size>16*1024*1024){skipped.push({file,reason:'over 16 MiB'});continue}
 let bytes;try{bytes=readFileSync(file)}catch{skipped.push({file,reason:'unreadable'});continue}
 if(bytes.includes(0)){continue}
 const body=bytes.toString('utf8');scanned++;
 for(const [category,pattern] of patterns)if(pattern.test(body))findings.push({file,category});
}
const config=readFileSync('netlify.toml','utf8');
const rootPublished=/^\s*publish\s*=\s*"\."\s*$/m.test(config);
console.log('RELEASE_EXPOSURE_REPORT '+JSON.stringify({tracked:tracked.length,textFilesScanned:scanned,possibleSecretFindings:findings,unscannedFiles:skipped,rootPublish:rootPublished,developmentFileCountForReview:rootPublished?review.length:0,limitations:['Pattern-based release-tree check only; historical commits, external secret stores and deployed file access are not verified.','Development-file count is an exposure review queue, not proof those paths are served.']}));
if(findings.length)process.exitCode=1;
