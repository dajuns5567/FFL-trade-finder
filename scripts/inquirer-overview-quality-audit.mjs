import fs from 'node:fs';

const source=process.argv[2];
const edition=source?JSON.parse(fs.readFileSync(source,'utf8')):(await import('../netlify/functions/inquirer-week1-2026-preload.mjs')).default;
const fail=m=>{throw new Error(m)};
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean);
const numeric=s=>(String(s||'').match(/\b\d+(?:\.\d+)?\b/g)||[]).length;
const o=edition?.league_overview||{};
const sections=Array.isArray(o.sections)?o.sections:[];
const takes=Array.isArray(o.hot_takes)?o.hot_takes:[];

if(Number(o.inquirer_version)<21)fail('Weekly Recap must be V21 or newer; got '+o.inquirer_version);
if(sections.length!==4)fail('League overview must contain four reporter sections; got '+sections.length);
for(const s of sections){
  if(!s?.reporter?.id)fail('Overview section missing reporter identity');
  if(!String(s.heading||'').trim())fail('Overview section missing heading');
  if(!Array.isArray(s.paragraphs)||!s.paragraphs.length)fail('Weekly Recap section '+s.heading+' is empty');
  const noInfo=s.paragraphs.length===1&&String(s.paragraphs[0]).trim()==='n/a';
  if(!noInfo&&s.paragraphs.length<2)fail('Weekly Recap section '+s.heading+' needs at least two connected paragraphs when evidence exists');
}
if(new Set(sections.map(s=>s.reporter.id)).size!==4)fail('All four desks must appear once in the overview');
const humor=/\b(?:parade|rental shoes|gala|hotel[- ]lobby|good china|chaise|melodrama|elegant insult|group chat|honeymoon|front page|back page|receipt|rookie class|mock|burn it|ceremonially|evidence|file|paperwork|docket|deadline|confetti|argument|sigh|screenshot|decorative|decoration)\b/i;
for(const s of sections){const copy=(s.paragraphs||[]).join(' ');if(copy.trim()==='n/a')continue;if(!humor.test(copy))fail((s.reporter?.name||'Reporter')+' Weekly Recap section is too straight; every desk must carry personality/humor');}

const bartholomew=sections.find(s=>String(s?.reporter?.id||'')==='tess-delaney'||/Bartholomew Roycington III/i.test(String(s?.reporter?.name||'')));
if(!bartholomew)fail('Weekly Recap must preserve Bartholomew Roycington III’s section');
const bartholomewCopy=(bartholomew.paragraphs||[]).join(' ');
if(!/offensive breakout watch admits\s+.+?\s+and\s+.+?\s+past the velvet rope/i.test(bartholomewCopy))fail('Bartholomew must name two offensive breakout players to watch');
if(!/On defense,\s+.+?\s+gets the third seat/i.test(bartholomewCopy))fail('Bartholomew must name one defensive breakout player to watch');
if(!/are the two offensive names Bartholomew trusts/i.test(bartholomewCopy))fail('Bartholomew must name two offensive reliable players');
if(!/On defense,\s+.+?\s+gets the same designation/i.test(bartholomewCopy))fail('Bartholomew must name one defensive reliable player');

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
const upset=takes.find(t=>t.kind==='upset');
if(!Number.isFinite(Number(upset?.underdog_projected))||!Number.isFinite(Number(upset?.favorite_projected))||Number(upset.underdog_projected)>=Number(upset.favorite_projected))fail('Upset pick must name a true projected underdog with a lower projected score than the favorite');
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
console.log('Fleeced Inquirer Weekly Recap / projection-valid hot-takes audit passed');
