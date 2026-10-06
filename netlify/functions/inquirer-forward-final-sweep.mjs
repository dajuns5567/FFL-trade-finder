// Non-destructive final prose sweep for Week 3+.
// Runs after prior-week guarding, edition-wide dedupe and context truth.
// It removes synthetic/stacked transition grammar and repairs narrow surface
// defects without adding facts, commentary or changing football numbers.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v)
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:No|Mr|Mrs|Ms|Dr|St|Jr|Sr)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/)
  .map(x=>x.replaceAll('§','.').trim())
  .filter(Boolean);
const cap=s=>String(s||'').replace(/^([^A-Za-z]*)([a-z])/,(_,a,b)=>a+b.toUpperCase());

const SYNTHETIC=/^(?:(?:For|On|From|At|With)\s+(?:(?:a|an|this|the)\s+)?(?:direct|practical|measured|current|useful|immediate|grounded|clean|sharp|simple|focused|clear|realistic|tactical|strategic|repeatable|steady|specific|balanced|plain|decisive|careful|concrete|durable|short-term|season-long|matchup-specific|roster-wide|opponent-aware|standings-aware|scoring-driven|decision-level)\s+(?:football|lineup|scoring|matchup|standings|roster|management|season|opponent|division|result|pressure|leverage|performance|starter|bench|schedule|playoff|form|weekly)\s+(?:read|note|angle|lens|level|point|issue|view),\s*)/i;
const STOCK_LABEL=/^(?:(?:The practical read|The clean read|The less glamorous truth|Here is the punch|Big letters first|The opponent already knows this|This much deserves criticism|The practical problem|One useful luxury remains|The next week begins with this|The next lineup meeting should start here|Rivals will notice this|This is what rivals will remember|Management may prefer another subject|No decoration needed|The next opponent gets this opportunity|Without dressing it up|Against this opponent|One sensible point|A little restraint|For all the theater|In the standings)\s*:\s*)/i;
const STACKED_LABEL=/(?:The practical read|The clean read|The less glamorous truth|Here is the punch|Big letters first|The opponent already knows this|This much deserves criticism|The practical problem|One useful luxury remains|The next week begins with this|The next lineup meeting should start here|Rivals will notice this|This is what rivals will remember|Management may prefer another subject|No decoration needed|The next opponent gets this opportunity|Without dressing it up|Against this opponent|One sensible point|A little restraint|For all the theater|In the standings)\s*:\s*(?:The practical read|The clean read|The less glamorous truth|Here is the punch|Big letters first|The opponent already knows this|This much deserves criticism|The practical problem|One useful luxury remains|The next week begins with this|The next lineup meeting should start here|Rivals will notice this|This is what rivals will remember|Management may prefer another subject|No decoration needed|The next opponent gets this opportunity|Without dressing it up|Against this opponent|One sensible point|A little restraint|For all the theater|In the standings)\s*:/i;
const AGREEMENT_ARTIFACT=/\b(?:the positioning are not a theory; they are|the race is not a theory; they are)\b/i;
const GARBLED_MARGIN=/\bthe\s+(\d+(?:\.\d+)?)-point gap scoring to support behind the best scorers\b/i;

function stripStockLead(s){
  let out=s;
  // These labels are editorial scaffolding, not football meaning. Remove all
  // consecutive occurrences while preserving the factual sentence underneath.
  for(let i=0;i<5;i++){
    const next=out.replace(STOCK_LABEL,'').trim();
    if(next===out)break;
    out=next;
  }
  return out;
}

function cleanSentence(sentence,week){
  let s=norm(sentence);
  const before=s;
  s=s.replace(SYNTHETIC,'').trim();
  s=stripStockLead(s);
  if(Number(week)<=13){
    s=s.replace(/\b(?:round|Sunday)\s+(\d{1,2})\b/gi,'Week $1');
    s=s.replace(/\bweek\s+(\d{1,2})\b/gi,(_,n)=>`Week ${n}`);
  }
  s=s.replace(/\bleague order\b/gi,'league standings')
    .replace(/\ba immediate\b/gi,'an immediate')
    .replace(/\ba opponent-aware\b/gi,'an opponent-aware')
    .replace(/\bseptember\b/g,'September')
    .replace(/\bthe positioning are not a theory; they are the part of the result everybody can see\.?/gi,'The standings position is not theoretical; it is visible in the result.')
    .replace(/\bthe race is not a theory; they are the part of the result everybody can see\.?/gi,'The race is not theoretical; the standings make that part of the result visible.')
    .replace(GARBLED_MARGIN,(_,gap)=>`the ${gap}-point gap came from too little support behind the best scorers`)
    .replace(/\bsunday\b/g,'Sunday')
    .replace(/\s{2,}/g,' ')
    .trim();
  return s!==before?cap(s):s;
}

function rewrite(rows,week){
  return (rows||[]).map(p=>sentences(p).map(s=>cleanSentence(s,week)).filter(Boolean).join(' ').trim()).filter(Boolean);
}
function article(a,week){
  if(!a)return;
  for(const sec of a.sections||[]){
    if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,week);
    for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,week);
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
}
function allCopy(edition){
  const rows=[];
  for(const team of edition?.teams||[]){const a=team?.inquirer_article;if(a)rows.push(a.headline||'',a.deck||'',...(a.paragraphs||[]));}
  const o=edition?.league_overview;
  if(o){rows.push(o.headline||'',o.deck||'');for(const sec of o.sections||[]){rows.push(...(sec?.paragraphs||[]));for(const b of sec?.blocks||[])rows.push(...(b?.paragraphs||[]));}for(const h of o.hot_takes||[])rows.push(h?.take||'');}
  return rows.join('\n');
}

export function findInquirerForwardSurfaceIssues(edition,{week}={}){
  if(!edition||Number(week)<3)return[];
  const text=allCopy(edition),issues=[];
  if(SYNTHETIC.test(text))issues.push({kind:'synthetic-transition'});
  if(STACKED_LABEL.test(text))issues.push({kind:'stacked-stock-label'});
  if(AGREEMENT_ARTIFACT.test(text))issues.push({kind:'agreement-artifact'});
  if(GARBLED_MARGIN.test(text))issues.push({kind:'garbled-margin'});
  if(/\b(?:The practical read|The clean read|The less glamorous truth|Here is the punch|Big letters first|The opponent already knows this|This much deserves criticism|The practical problem|One useful luxury remains|The next week begins with this|The next lineup meeting should start here|Rivals will notice this|This is what rivals will remember|Management may prefer another subject|No decoration needed|The next opponent gets this opportunity|Without dressing it up|Against this opponent|One sensible point|A little restraint|For all the theater|In the standings)\s*:/i.test(text))issues.push({kind:'stock-label'});
  return issues;
}

export function finalSweepInquirerForwardEdition(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  for(const team of edition.teams)article(team?.inquirer_article,Number(week));
  const o=edition.league_overview;
  if(o){
    for(const sec of o.sections||[]){
      if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,Number(week));
      for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,Number(week));
    }
    for(const h of o.hot_takes||[])if(h?.take)h.take=rewrite([h.take],Number(week)).join(' ');
  }
  return edition;
}
