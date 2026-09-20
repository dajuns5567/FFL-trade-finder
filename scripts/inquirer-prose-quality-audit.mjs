import fs from 'node:fs';

const source=process.argv[2];
let edition;
if(source){
  edition=JSON.parse(fs.readFileSync(source,'utf8'));
}else{
  edition=(await import('../netlify/functions/inquirer-week1-2026-preload.mjs')).default;
}

if(Number(edition?.inquirer_version)>=22){const {auditV22}=await import('./inquirer-v22-audit.mjs');auditV22(edition);process.exit(0)}
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

if(Number(edition?.inquirer_version)<21)fail('Prose audit requires the V21 impact-and-depth Inquirer or newer; got '+edition?.inquirer_version);
const teams=edition?.teams||[];
if(teams.length!==32)fail('Expected 32 team articles; got '+teams.length);

const requiredKinds=['lede','players','management','value','sentiment','outlook','hot-seat','cool-throne'];
const voiceAnchors={
  'walter-mercer':['press box','press-box','notebook','clipping','old desk','complaint','parking','cynic','sunday story','manager’s chair','front office homework','next assignment','folder','heroes','homework'],
  'tess-delaney':['civilized','good china','theatrical','elegant','taste','sigh','waistcoat','salons','vulgar','review','leading men','patrons','engagement','footnotes','etiquette','composition'],
  'mack-hollis':['back page','group chat','angry font','confetti','presses','responsible journalism','heroes','villains','complaint box','front page','scream','yell','headline'],
  'nora-voss':['evidence','file','witness','paper trail','inquiry','fingerprints','docket','cross-examination']
};
const humorPattern=/\b(?:parade|confetti|group chat|angry font|classifieds|parking|complaint|aspirin|good china|theatrical|waistcoat|salons|rental shoes|hotel lobby art|fingerprints|witness|paperwork|docket|restraining order|TED Talk|legal department|burn it|coffee|snacks|civilized|vulgar|hors d|accessor|dinner guest|sigh|everything)\b/i;

const headlinePatterns=new Map(),openingCounts=new Map(),sentenceCounts=new Map(),sectionOrderCounts=new Map(),report={articles:[],headline_patterns:{},global:{}};
let allWords=0,allNums=0,allUpper=0,allParagraphs=0,allShortSentences=0,allSentences=0;

for(const team of teams){
  const a=team?.inquirer_article||{},rid=String(a?.reporter?.id||'');
  if(!rid)fail('Missing reporter id for roster '+team.roster_id);
  if(!a.headline)fail('Missing headline for roster '+team.roster_id);
  const sections=Array.isArray(a.sections)?a.sections:[];
  if(sections.length!==8)fail(team.team_name+' must have exactly eight newspaper sections; got '+sections.length);
  const kinds=sections.map(s=>s.kind),orderKey=kinds.join('>');
  sectionOrderCounts.set(orderKey,(sectionOrderCounts.get(orderKey)||0)+1);
  for(const k of requiredKinds)if(!kinds.includes(k))fail(team.team_name+' missing section kind '+k);
  for(const s of sections){
    if(!String(s.heading||'').trim())fail(team.team_name+' has a section without a heading');
    if(!Array.isArray(s.paragraphs)||s.paragraphs.length<3)fail(team.team_name+' section '+s.heading+' must contain at least three connected paragraphs');
  }
  const paras=sections.flatMap(s=>s.paragraphs||[]),body=paras.join(' ');
  if(paras.length<24)fail(team.team_name+' has only '+paras.length+' narrative paragraphs; V21 requires three-paragraph depth across all eight sections');
  const wc=words(body).length,nums=numericTokens(body),upp=upperWords(body),lens=paras.map(p=>words(p).length);
  if(wc<500)fail(team.team_name+' is too short to carry a complete eight-section beat column: '+wc+' words');
  if(median(lens)<19)fail(team.team_name+' paragraphs are too fragmentary for the expanded eight-section column; median paragraph is '+median(lens)+' words');
  if(nums/Math.max(1,wc)>.08)fail(team.team_name+' is too numbers-heavy: '+(100*nums/wc).toFixed(1)+'% numeric-token density');
  if(upp/Math.max(1,wc)>.018)fail(team.team_name+' body relies too heavily on all-caps words');
  if(/\s\|\s/.test(body))fail(team.team_name+' still contains pipe-delimited stat-dump prose');
  if(/\b(?:1th|2th|3th|21th|22th|23th|31th|32th)\b/i.test(body))fail(team.team_name+' contains a malformed standings ordinal');
  if(/\b(?:PUT THESE MEN ON THE FRONT PAGE|THE SUPPORTING CAST|ABOUT THE PEOPLE WE JUST|LET US AUTOPSY|NOW FOR THE PART WE WILL)\b/i.test(body))fail(team.team_name+' still contains V16 checklist-template copy');
  if(/\b(?:giant photo|tiny photo|large photos and small photos|find the parade permit|taking the night off)\b/i.test(body+' '+sections.map(s=>s.heading||'').join(' ')))fail(team.team_name+' contains a rejected canned/photo-size phrase');
  const management=sections.find(s=>s.kind==='management');
  if(!/transaction verdict/i.test((management?.paragraphs||[]).join(' ')))fail(team.team_name+' management section lists activity without an explicit transaction-quality verdict');
  const explainerPatterns=[
    /usable real-life stat line/i,
    /the useful (?:question|part|comparison)\b/i,
    /that is the player-level result/i,
    /the numbers are asking/i,
    /this section carries forward/i,
    /the market has moved this roster/i,
    /the next data point/i,
    /the question for the file is whether value movement/i,
    /because the fantasy number has a real football stat line sitting underneath it/i,
    /the result is real\. motive, intent/i,
    /Sleeper (?:did not|returned|has not|currently|supplied)/i,
    /the final score is useful/i,
    /the repeatable part looks like/i,
    /the real question is whether/i,
    /I care about the direction more than the drama/i,
    /the market usually stops looking so theoretical/i,
    /that is useful context/i,
    /the part I trust more is/i,
    /the data (?:says|shows|suggests)/i
  ];
  for(const re of explainerPatterns)if(re.test(body))fail(team.team_name+' contains data-explainer / pipeline language instead of reporter prose: '+re);

  let short=0,sents=0;
  for(const p of paras){
    const ss=sentenceParts(p);sents+=ss.length;
    for(const s of ss){
      if(words(s).length<5)short++;
      let norm=s.toLowerCase();
      const names=[team.team_name,team.manager_name,team.opponent_name,...((a?.facts?.starter_details||[]).map(x=>x.name)),a?.facts?.best_bench?.name,a?.facts?.worst_starter?.name].filter(Boolean).sort((x,y)=>String(y).length-String(x).length);
      for(const name of names)norm=norm.replaceAll(String(name).toLowerCase(),'<name>');
      norm=norm.replace(/\b\d+(?:\.\d+)?(?:[-–]\d+(?:\.\d+)?)?\b/g,'#').replace(/\s+/g,' ').trim();
      if(words(norm).length>=8&&!/^<name> finished with # fantasy points\b/.test(norm))sentenceCounts.set(norm,(sentenceCounts.get(norm)||0)+1);
    }
    const opener=words(p).slice(0,5).join(' ').toLowerCase().replace(/\d+(?:\.\d+)?/g,'#');
    openingCounts.set(opener,(openingCounts.get(opener)||0)+1);
  }
  if(short/Math.max(1,sents)>.22)fail(team.team_name+' has too many sentence fragments/very short sentences: '+short+'/'+sents);

  const voiceText=(body+' '+sections.map(s=>s.heading||'').join(' ')).toLowerCase();
  const anchors=voiceAnchors[rid]||[],hits=anchors.filter(x=>voiceText.includes(x));
  if(hits.length<2)fail(team.team_name+' does not sound sufficiently like '+a.reporter.name+'; voice-anchor hits='+hits.join(', '));
  if(!humorPattern.test(body))fail(team.team_name+' reads too straight; every desk needs visible humor/sarcasm, not just factual narration');

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
const repeatedOpeners=[...openingCounts.entries()].filter(([k,n])=>k&&n>4).sort((a,b)=>b[1]-a[1]);
if(repeatedOpeners.length)fail('Canned paragraph opener repeated across more than four stories: '+JSON.stringify(repeatedOpeners.slice(0,5)));
const repeatedSentences=[...sentenceCounts.entries()].filter(([s,n])=>s&&n>4).sort((a,b)=>b[1]-a[1]);
if(repeatedSentences.length)fail('Template sentence reused across more than four stories: '+JSON.stringify(repeatedSentences.slice(0,5)));

const sectionOrders=[...sectionOrderCounts.entries()].sort((a,b)=>b[1]-a[1]);
if(sectionOrders.length<4)fail('V21 still reads like one section template; only '+sectionOrders.length+' distinct article structures were generated');
if(sectionOrders[0]?.[1]>8)fail('One V21 section structure is reused across '+sectionOrders[0][1]+' stories; 32 articles must not feel like the same template');

report.global={
  articles:teams.length,
  average_words:Number((allWords/teams.length).toFixed(1)),
  average_paragraphs:Number((allParagraphs/teams.length).toFixed(1)),
  numeric_density:Number((allNums/allWords).toFixed(4)),
  uppercase_density:Number((allUpper/allWords).toFixed(4)),
  short_sentence_ratio:Number((allShortSentences/Math.max(1,allSentences)).toFixed(4)),
  repeated_openers_over_4:repeatedOpeners,
  repeated_sentences_over_4:repeatedSentences,
  section_orders:Object.fromEntries(sectionOrders)
};
console.log(JSON.stringify(report,null,2));
console.log('Fleeced Inquirer prose-quality audit passed');
