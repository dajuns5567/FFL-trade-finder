import fs from 'node:fs';

const source=process.argv[2];
const edition=source?JSON.parse(fs.readFileSync(source,'utf8')):(await import('../netlify/functions/inquirer-week1-2026-preload.mjs')).default;
const fail=m=>{throw new Error(m)};
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean);
const numeric=s=>(String(s||'').match(/\b\d+(?:\.\d+)?\b/g)||[]).length;
const o=edition?.league_overview||{};
const sections=Array.isArray(o.sections)?o.sections:[];
const takes=Array.isArray(o.hot_takes)?o.hot_takes:[];

if(Number(o.inquirer_version)<18)fail('League overview must be V18 or newer; got '+o.inquirer_version);
if(sections.length!==4)fail('League overview must contain four reporter sections; got '+sections.length);
for(const s of sections){
  if(!s?.reporter?.id)fail('Overview section missing reporter identity');
  if(!String(s.heading||'').trim())fail('Overview section missing heading');
  if(!Array.isArray(s.paragraphs)||s.paragraphs.length<2)fail('Overview section '+s.heading+' needs at least two complete paragraphs');
}
if(new Set(sections.map(s=>s.reporter.id)).size!==4)fail('All four desks must appear once in the overview');

const body=sections.flatMap(s=>s.paragraphs||[]).join(' ');
const wc=words(body).length,nd=numeric(body)/Math.max(1,wc);
if(wc<320)fail('League overview is too thin to read like a newspaper notebook: '+wc+' words');
if(nd>.065)fail('League overview is too numbers-heavy: '+(nd*100).toFixed(1)+'% numeric-token density');

const robotPatterns=[
 /the rosters carrying the most immediate/i,
 /market check:/i,
 /completed trades this week:/i,
 /this is a standings-based race/i,
 /one box score is not a trend/i,
 /manager malpractice watch/i,
 /the bottom of the table has consequences/i,
 /that does not predict next week/i,
 /the next data point/i,
 /top-line result sheet/i
];
for(const re of robotPatterns)if(re.test(body)||takes.some(t=>re.test(String(t.title||'')+' '+String(t.take||''))))fail('Legacy statistical/checklist language survived: '+re);

const required=['championship','fraud','division','player','upset'];
const kinds=new Set(takes.map(t=>String(t.kind||'')));
for(const k of required)if(!kinds.has(k))fail('Hot Takes missing required prediction type: '+k);
if(takes.length<5)fail('Hot Takes must contain at least five actual predictions');

for(const t of takes){
  const copy=String(t.title||'')+' '+String(t.take||'');
  if(!/pick|calling|predict|beats|win|flag|fraud|upset/i.test(copy))fail('Hot Take is analysis instead of a prediction: '+String(t.title||'untitled'));
  if(words(t.take).length<12)fail('Hot Take is too thin: '+String(t.title||'untitled'));
}
const report={
  inquirer_version:o.inquirer_version,
  headline:o.headline,
  sections:sections.map(s=>({reporter:s.reporter.name,heading:s.heading,paragraphs:s.paragraphs.length,words:words((s.paragraphs||[]).join(' ')).length})),
  words:wc,
  numeric_density:Number(nd.toFixed(4)),
  hot_take_kinds:[...kinds],
  hot_takes:takes.map(t=>({kind:t.kind,title:t.title,take:t.take}))
};
console.log(JSON.stringify(report,null,2));
console.log('Fleeced Inquirer V18 league-overview / real-hot-takes audit passed');
