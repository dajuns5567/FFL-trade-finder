import fs from 'node:fs';

const source=process.argv[2];
let edition;
if(source){
  edition=JSON.parse(fs.readFileSync(source,'utf8'));
}else{
  edition=(await import('../netlify/functions/inquirer-week1-2026-preload.mjs')).default;
}

const fail=(m)=>{throw new Error(m)};
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean);
const median=a=>{const x=a.slice().sort((p,q)=>p-q);return x.length?(x[Math.floor((x.length-1)/2)]+x[Math.floor(x.length/2)])/2:0};
const numericTokens=s=>(String(s||'').match(/\b\d+(?:\.\d+)?(?:[-–]\d+(?:\.\d+)?)?\b/g)||[]).length;
const upperWords=s=>(String(s||'').match(/\b[A-Z]{4,}\b/g)||[]).length;
const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const normalizeHeadline=(team,a)=>{
  let s=String(a?.headline||'').toLowerCase();
  for(const name of [team.team_name,...((a?.facts?.starter_details||[]).map(x=>x.name))].filter(Boolean))s=s.replaceAll(String(name).toLowerCase(),' <name> ');
  return s.replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/\s+/g,' ').trim();
};

if(Number(edition?.inquirer_version)<17)fail('Prose audit requires Inquirer V17 or newer; got '+edition?.inquirer_version);
const teams=edition?.teams||[];
if(teams.length!==32)fail('Expected 32 team articles; got '+teams.length);

const requiredKinds=['lede','players','management','value','sentiment','outlook'];
const voiceAnchors={
  'walter-mercer':['press box','notebook','clipping','ink','receipts'],
  'tess-delaney':['process','sample','spreadsheet','numbers','repeatable'],
  'mack-hollis':['back page','front page','newspaper','ink','circulation','confetti'],
  'nora-voss':['evidence','file','witness','paper trail','inquiry','prosecution']
};

const headlinePatterns=new Map(),openingCounts=new Map(),report={articles:[],headline_patterns:{},global:{}};
let allWords=0,allNums=0,allUpper=0,allParagraphs=0,allShortSentences=0,allSentences=0;

for(const team of teams){
  const a=team?.inquirer_article||{},rid=String(a?.reporter?.id||'');
  if(!rid)fail('Missing reporter id for roster '+team.roster_id);
  if(!a.headline)fail('Missing headline for roster '+team.roster_id);
  const sections=Array.isArray(a.sections)?a.sections:[];
  if(sections.length!==6)fail(team.team_name+' must have exactly six newspaper sections; got '+sections.length);
  const kinds=sections.map(s=>s.kind);
  for(const k of requiredKinds)if(!kinds.includes(k))fail(team.team_name+' missing section kind '+k);
  for(const s of sections){
    if(!String(s.heading||'').trim())fail(team.team_name+' has a section without a heading');
    if(!Array.isArray(s.paragraphs)||s.paragraphs.length<2)fail(team.team_name+' section '+s.heading+' must contain at least two connected paragraphs');
  }
  const paras=sections.flatMap(s=>s.paragraphs||[]),body=paras.join(' ');
  if(paras.length<12)fail(team.team_name+' has only '+paras.length+' narrative paragraphs');
  const wc=words(body).length,nums=numericTokens(body),upp=upperWords(body),lens=paras.map(p=>words(p).length);
  if(wc<520)fail(team.team_name+' is too short for a full beat column: '+wc+' words');
  if(median(lens)<38)fail(team.team_name+' paragraphs are too fragmentary; median paragraph is '+median(lens)+' words');
  if(nums/Math.max(1,wc)>.075)fail(team.team_name+' is too numbers-heavy: '+(100*nums/wc).toFixed(1)+'% numeric-token density');
  if(upp/Math.max(1,wc)>.018)fail(team.team_name+' body relies too heavily on all-caps words');
  if(/\s\|\s/.test(body))fail(team.team_name+' still contains pipe-delimited stat-dump prose');
  if(/\b(?:PUT THESE MEN ON THE FRONT PAGE|THE SUPPORTING CAST|ABOUT THE PEOPLE WE JUST|LET US AUTOPSY|NOW FOR THE PART WE WILL)\b/i.test(body))fail(team.team_name+' still contains V16 checklist-template copy');

  let short=0,sents=0;
  for(const p of paras){
    const ss=sentenceParts(p);sents+=ss.length;
    for(const s of ss)if(words(s).length<5)short++;
    const opener=words(p).slice(0,5).join(' ').toLowerCase().replace(/\d+(?:\.\d+)?/g,'#');
    openingCounts.set(opener,(openingCounts.get(opener)||0)+1);
  }
  if(short/Math.max(1,sents)>.22)fail(team.team_name+' has too many sentence fragments/very short sentences: '+short+'/'+sents);

  const anchors=voiceAnchors[rid]||[],hits=anchors.filter(x=>body.toLowerCase().includes(x));
  if(hits.length<2)fail(team.team_name+' does not sound sufficiently like '+a.reporter.name+'; voice-anchor hits='+hits.join(', '));

  const hp=normalizeHeadline(team,a);
  if(!headlinePatterns.has(rid))headlinePatterns.set(rid,new Set());
  headlinePatterns.get(rid).add(hp);

  allWords+=wc;allNums+=nums;allUpper+=upp;allParagraphs+=paras.length;allShortSentences+=short;allSentences+=sents;
  report.articles.push({roster_id:String(team.roster_id),team:team.team_name,reporter:a.reporter.name,headline:a.headline,words:wc,paragraphs:paras.length,median_paragraph_words:Number(median(lens).toFixed(1)),numeric_density:Number((nums/wc).toFixed(4)),voice_anchor_hits:hits});
}

for(const [rid,set] of headlinePatterns){
  report.headline_patterns[rid]=set.size;
  if(set.size<6)fail('Reporter '+rid+' has only '+set.size+' distinct normalized headline structures across eight stories');
}
const repeatedOpeners=[...openingCounts.entries()].filter(([k,n])=>k&&n>8).sort((a,b)=>b[1]-a[1]);
if(repeatedOpeners.length)fail('Canned paragraph opener repeated across more than eight stories: '+JSON.stringify(repeatedOpeners.slice(0,5)));

report.global={
  articles:teams.length,
  average_words:Number((allWords/teams.length).toFixed(1)),
  average_paragraphs:Number((allParagraphs/teams.length).toFixed(1)),
  numeric_density:Number((allNums/allWords).toFixed(4)),
  uppercase_density:Number((allUpper/allWords).toFixed(4)),
  short_sentence_ratio:Number((allShortSentences/Math.max(1,allSentences)).toFixed(4)),
  repeated_openers_over_8:repeatedOpeners
};
console.log(JSON.stringify(report,null,2));
console.log('Fleeced Inquirer prose-quality audit passed');
