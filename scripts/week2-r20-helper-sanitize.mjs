import {readFileSync,writeFileSync} from 'node:fs';

const path='scripts/week2-r20-wire-helper.mjs';
let s=readFileSync(path,'utf8');
const old='if(count===1)return text.replace(oldValue,newValue);';
const next='if(count===1)return text.replace(oldValue,()=>newValue);';
const count=s.split(old).length-1;
if(count===1)s=s.replace(old,next);
else if(!s.includes(next))throw new Error(`R20 helper sanitize expected one replaceOnce implementation, found ${count}`);
writeFileSync(path,s);
console.log('R20 helper replacement semantics sanitized');
