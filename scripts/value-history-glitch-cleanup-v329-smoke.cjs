const fs=require('fs');
const src=fs.readFileSync('netlify/functions/value-history.mjs','utf8');
function assert(x,m){if(!x)throw new Error(m)}
assert(src.includes("KNOWN_BAD_MINUTES=new Set(['2026-09-07T21:07'])"),'known 5:07 PM Eastern bad minute missing');
assert(src.includes('return at120/rows.length>=0.9'),'collapsed-120 threshold missing');
assert(src.includes('rows.filter(validSnapshot)'),'stored snapshot reads are not filtered');
assert(src.includes("reason:'rejected-collapsed-120-snapshot'"),'future collapsed snapshot rejection missing');

function minuteKey(t){const d=new Date(t);return Number.isFinite(d.getTime())?d.toISOString().slice(0,16):''}
const KNOWN_BAD_MINUTES=new Set(['2026-09-07T21:07']);
const knownBadTimestamp=t=>KNOWN_BAD_MINUTES.has(minuteKey(t));
function collapsed120Snapshot(snap){
  const rows=Array.isArray(snap?.rows)?snap.rows:[];
  if(rows.length<100)return false;
  let at120=0;
  for(const r of rows)if(Number(r?.value)===120)at120++;
  return at120/rows.length>=0.9;
}
const rows=(n,at120)=>Array.from({length:n},(_,i)=>({value:i<at120?120:1000+i}));
assert(knownBadTimestamp('2026-09-07T21:07:00.000Z'),'start of bad minute not excluded');
assert(knownBadTimestamp('2026-09-07T21:07:59.999Z'),'end of bad minute not excluded');
assert(!knownBadTimestamp('2026-09-07T21:08:00.000Z'),'adjacent good minute incorrectly excluded');
assert(collapsed120Snapshot({rows:rows(200,200)}),'all-120 collapse not detected');
assert(collapsed120Snapshot({rows:rows(200,180)}),'90% collapse not detected');
assert(!collapsed120Snapshot({rows:rows(200,20)}),'legitimate sparse 120 values incorrectly rejected');
console.log('V329 Value History glitch cleanup regression passed');
