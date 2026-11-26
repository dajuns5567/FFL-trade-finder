import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,copyFileSync,rmSync,writeFileSync,statSync} from 'node:fs';
import {dirname,extname,posix,resolve} from 'node:path';
import assert from 'node:assert/strict';
import site from '../netlify/functions/site-v29.mjs';
const target=resolve('.public-site');
const tracked=new Set(execFileSync('git',['ls-files','-z'],{maxBuffer:32*1024*1024}).toString('utf8').split('\0').filter(Boolean));
const publicExt=new Set(['.js','.css','.json','.png','.jpg','.jpeg','.webp','.gif','.svg','.ico','.woff','.woff2','.ttf','.webmanifest']);
const denied=/^(?:netlify|scripts|tests|artifacts|node_modules|\.github|\.git|\.tmp)(?:\/|$)/;
const files=new Set(),queue=[];
function assetName(raw,from=''){
 const literal=String(raw||'').trim();
 if(!literal||/^(?:https?:|data:|blob:|mailto:|tel:|#|\/\/)/i.test(literal))return null;
 const clean=literal.split(/[?#]/,1)[0];
 if(!clean||clean.includes('\\')||clean.includes('%')||clean.split('/').includes('..'))return null;
 const file=clean.startsWith('/')?clean.slice(1):posix.normalize(posix.join(dirname(from==='page.html'?'':from),clean));
 if(!file||denied.test(file)||file.split('/').some(p=>p.startsWith('.'))||!publicExt.has(extname(file).toLowerCase()))return null;
 // Root browser assets and explicitly referenced public data/image assets only.
 if(file.includes('/')&&!/^(?:data|assets|images|img|fonts)\//.test(file))return null;
 return file;
}
function include(raw,from='',required=false){
 const file=assetName(raw,from);
 if(!file)return;
 if(!tracked.has(file)){
  if(required&&!file.startsWith('sleeper-data/'))throw Error('Required browser asset missing: '+file);
  return;
 }
 if(files.has(file))return;
 assert(statSync(file).isFile(),'Asset is not a regular file: '+file);
 files.add(file);queue.push(file);
}
const response=await site();if(!response.ok)throw Error('Could not assemble actual public loader');
const html=await response.text();
for(const m of html.matchAll(/<(?:script|link|img|source)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))include(m[1],'page.html',true);
// A root-path reference inside actual runtime scripts (source verification,
// image assets, lazy JSON etc.) is part of the public dependency closure.
function inspect(text,from){
 for(const m of text.matchAll(/["'\x60](\/?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:js|css|json|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|webmanifest)(?:\?[^"'\x60\s]*)?)["'\x60]/gi))include(m[1],from);
 for(const m of text.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi))include(m[1],from);
}
inspect(html,'page.html');
while(queue.length){const file=queue.shift();if(/\.(?:js|css)$/i.test(file))inspect(readFileSync(file,'utf8'),file)}
if(tracked.has('favicon.ico'))include('favicon.ico','page.html');
assert(files.size>=70,'Public loader asset inventory unexpectedly incomplete: '+files.size);
rmSync(target,{recursive:true,force:true});mkdirSync(target,{recursive:true});
for(const file of [...files].sort()){
 const out=resolve(target,file);assert(out.startsWith(target+'/'));
 mkdirSync(dirname(out),{recursive:true});copyFileSync(file,out);
}
copyFileSync('robots.txt',resolve(target,'robots.txt'));
writeFileSync(resolve(target,'_headers'),"/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n");
console.log('PUBLIC_ASSET_MANIFEST '+JSON.stringify({count:files.size,paths:[...files].sort(),excludedTrackedFiles:tracked.size-files.size-1}));
