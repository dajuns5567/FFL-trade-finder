import fs from 'node:fs';
import {gzipSync} from 'node:zlib';

const source=process.argv[2];
const target=process.argv[3];
if(!source||!target)throw new Error('Usage: node scripts/pack-inquirer-preload.mjs <edition.json> <preload.mjs>');
const edition=JSON.parse(fs.readFileSync(source,'utf8'));
const payload=gzipSync(Buffer.from(JSON.stringify(edition)),{level:9,mtime:0}).toString('base64');
fs.writeFileSync(target,"import {gunzipSync} from 'node:zlib';\nconst payload='"+payload+"';\nconst week1=JSON.parse(gunzipSync(Buffer.from(payload,'base64')).toString('utf8'));\nexport default week1;\n");
