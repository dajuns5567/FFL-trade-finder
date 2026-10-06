// Non-destructive final prose sweep for Week 3+.
// Runs after prior-week guarding, edition-wide dedupe and context truth.
// It only removes synthetic transition grammar and repairs surface wording;
// it never adds commentary or strips the natural uniqueness those layers created.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v)
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:No|Mr|Mrs|Ms|Dr|St|Jr|Sr)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/)
  .map(x=>x.replaceAll('§','.').trim())
  .filter(Boolean);
const cap=s=>String(s||'').replace(/^([^A-Za-z]*)([a-z])/,(_,a,b)=>a+b.toUpperCase());

const SYNTHETIC=/^(?:(?:For|On|From|At|With)\s+(?:(?:a|an|this|the)\s+)?(?:direct|practical|measured|current|useful|immediate|grounded|clean|sharp|simple|focused|clear|realistic|tactical|strategic|repeatable|steady|specific|balanced|plain|decisive|careful|concrete|durable|short-term|season-long|matchup-specific|roster-wide|opponent-aware|standings-aware|scoring-driven|decision-level)\s+(?:football|lineup|scoring|matchup|standings|roster|management|season|opponent|division|result|pressure|leverage|performance|starter|bench|schedule|playoff|form|weekly)\s+(?:read|note|angle|lens|level|point|issue|view),\s*)/i;

function cleanSentence(sentence,week){
  let s=norm(sentence);
  const before=s;
  s=s.replace(SYNTHETIC,'').trim();
  if(Number(week)<=13){
    s=s.replace(/\b(?:round|Sunday)\s+(\d{1,2})\b/gi,'Week $1');
    s=s.replace(/\bweek\s+(\d{1,2})\b/gi,(_,n)=>`Week ${n}`);
  }
  s=s.replace(/\bleague order\b/gi,'league standings')
    .replace(/\ba immediate\b/gi,'an immediate')
    .replace(/\ba opponent-aware\b/gi,'an opponent-aware')
    .replace(/\bsunday\b/g,'Sunday')
    .replace(/\s{2,}/g,' ')
    .trim();
  // Only force sentence capitalization when this sweep actually removed a lead
  // or rewrote surface grammar; otherwise preserve reporter styling verbatim.
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
