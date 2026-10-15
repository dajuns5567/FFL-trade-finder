// Final natural-language cleanup for Week 3+ Inquirer copy.
// Removes synthetic de-duplication scaffolds, repairs week wording/capitalization,
// and gives genuinely bare facts one short reporter-specific consequence.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v)
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:No|Mr|Mrs|Ms|Dr|St|Jr|Sr)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/)
  .map(x=>x.replaceAll('§','.').trim())
  .filter(Boolean);
const key=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const cap=s=>String(s||'').replace(/^([^A-Za-z]*)([a-z])/,(_,a,b)=>a+b.toUpperCase());

const SYNTHETIC=/^(?:(?:For|On|From|At|With)\s+(?:(?:a|an|this|the)\s+)?(?:direct|practical|measured|current|useful|immediate|grounded|clean|sharp|simple|focused|clear|realistic|tactical|strategic|repeatable|steady|specific|balanced|plain|decisive|careful|concrete|durable|short-term|season-long|matchup-specific|roster-wide|opponent-aware|standings-aware|scoring-driven|decision-level)\s+(?:football|lineup|scoring|matchup|standings|roster|management|season|opponent|division|result|pressure|leverage|performance|starter|bench|schedule|playoff|form|weekly)\s+(?:read|note|angle|lens|level|point|issue|view),\s*)/i;
const HARDENED=/^(?:(?:For|On|From|At|With|Once|In|When)\s+(?:the\s+)?(?:immediate football read|next lineup question|matchup itself|practical level|part that matters|score is settled|noise stripped away|usable takeaway|roster side|next decision|weekly ledger|manager’s chair|field of play|standings picture|lineup lock|points are counted|opponent’s view|week’s consequence|useful side|part worth keeping|next matchup|roster level|final score|correction ahead|football merits|week-to-week level|scoring margin|repeatable lesson|current race|lineup level|Sunday’s result|next opponent|management side|standings level|weekly result|practical fix|immediate concern|matchup level|roster view|next test|scoring side|decision point|season view|clean football read|useful football point|current position|weekly consequence|actual weakness|actual strength|result alone|part rivals noticed|part management owns|pressure point|current form|repeatable strength|avoidable mistake|next checkpoint|division picture|current leverage|next correction|season level|scoring consequence|next roster call|matchup consequence|lineup result|current concern|part to preserve|part to repair|actual football consequence|next usable adjustment|point of impact|week just played|next clean answer|immediate roster issue|current football level|result that counts|next practical answer),\s*)/i;
const EMPTY_FUTURE=/^(?:The |the )?schedule beyond Week \d+ is not complete enough for a larger claim, so the next assignment stays simple: beat the team on the page\.?$/i;
const STAT=/\b(?:scored|posted|finished with|put up|gave|produced|added|averaged)\b[^.!?]*\b\d+(?:\.\d+)?\b/i;
const FACT=/\b(?:Cool Throne|Hot Seat|award|honor|playoff estimate|projection|projected|odds|chance|roster value|market|ranked|standings|division leader|playoff seed|outscored|benched|started over)\b/i;
const INTERPRET=/\b(?:because|which means|that means|but|however|therefore|matters?|problem|warning|useful|useless|earned|deserved|embarrass|ridiculous|painful|good|bad|ugly|should|needs?|cannot|can't|did not|does not|enough|cost|saved|carried|wasted|hid|exposed|punished|bailed out|survived|buried|blew out|stole|dragged|pressure|leverage|standings|division|opponent|matchup|margin|answer|confetti|door|building|paying|respect|credit|week \d+|next week|next matchup)\b/i;

const REACTIONS={
  'walter-mercer':[
    'That matters because the rest of the lineup had less rescuing to do.',
    'Useful points. The opponent had to account for them, which is the standard.',
    'That is production with a consequence, not a number looking for applause.',
    'The lineup got something real from that spot and can ask for it again next week.',
    'That moved the matchup enough to deserve the ink.',
    'The number only matters because it changed what everybody else had to do.',
    'Bank it. A better opponent will make them prove it travels.',
    'That contribution bought the roster actual breathing room.'
  ],
  'tess-delaney':[
    'A useful contribution, chiefly because the opponent had to live with it.',
    'The number is attractive because it actually paid for something in the matchup.',
    'One may admire that without turning it into a parade.',
    'That was tasteful production with an appropriately rude effect on the opponent.',
    'The stat line earned its place by making the rest of the lineup less needy.',
    'Lovely enough to notice, practical enough to matter.',
    'There is substance there after the shine wears off.',
    'The contribution did real work and fortunately required no speech.'
  ],
  'mack-hollis':[
    'That hit the matchup, not just the stat sheet.',
    'Those points made the other side chase. That is the whole job.',
    'Real scoreboard damage. Keep it coming.',
    'That number was loud in exactly the right place.',
    'The opponent had to pay for that one.',
    'That moved the week. Everything else is formatting.',
    'Useful damage beats pretty arithmetic every time.',
    'That gave the rest of the lineup room to be human.'
  ],
  'nora-voss':[
    'Rivals had to account for it in real time, which makes the number worth keeping.',
    'That created leverage the opponent could not ignore.',
    'The useful part is the consequence, not the tidy stat line.',
    'That reduced the number of excuses available elsewhere in the lineup.',
    'Rivals now have a concrete reason to plan for that role.',
    'That changed what the other side needed from the rest of the matchup.',
    'The number matters because it narrowed the opponent’s paths to a win.',
    'That performance turned one roster spot into an actual problem for the other side.'
  ]
};

function cleanSentence(sentence,week){
  let s=norm(sentence);
  s=s.replace(SYNTHETIC,'').replace(HARDENED,'').trim();
  if(Number(week)<=13){
    s=s.replace(/\b(?:round|Sunday)\s+(\d{1,2})\b/gi,'Week $1');
    s=s.replace(/\bweek\s+(\d{1,2})\b/gi,(_,n)=>`Week ${n}`);
  }
  s=s.replace(/\bleague order\b/gi,'league standings')
     .replace(/\bthe league conversation version is simple:\s*/gi,'')
     .replace(/\bthe part worth (?:keeping|circling):\s*/gi,'')
     .replace(/\bbrought this on the board:\s*/gi,'')
     .replace(/\bcurrently in the chat\b/gi,'already part of the season')
     .replace(/\bnow in the chat\b/gi,'already part of the season')
     .replace(/\bsunday\b/g,'Sunday')
     .replace(/\ba immediate\b/gi,'an immediate')
     .replace(/\ba opponent-aware\b/gi,'an opponent-aware')
     .replace(/\s{2,}/g,' ').trim();
  const repeatedWeek=new RegExp(`^(Week \\d+ had[^;]+;)\\s*Week \\d+ just gave`,'i');
  s=s.replace(repeatedWeek,(_,lead)=>`${lead} Week ${week} just gave`);
  if(/^leaving\s+/i.test(s))s=`That result left ${s.replace(/^leaving\s+/i,'')}`;
  return cap(s);
}

function pickReaction(reporter,seed,used){
  const bank=REACTIONS[reporter]||REACTIONS['walter-mercer'];
  for(let i=0;i<bank.length;i++){
    const row=bank[(hash(seed)+i)%bank.length],k=key(row);
    if(!used.has(k)){used.add(k);return row}
  }
  return bank[hash(seed)%bank.length];
}

function rewriteParagraphs(rows,reporter,week,used){
  const out=[];
  for(const paragraph of rows||[]){
    let ss=sentences(paragraph).map(s=>cleanSentence(s,week)).filter(s=>s&&!EMPTY_FUTURE.test(s));
    if(!ss.length)continue;
    const joined=ss.join(' ');
    if(ss.length===1&&(STAT.test(joined)||FACT.test(joined))&&!INTERPRET.test(joined)){
      ss.push(pickReaction(reporter,joined+week,used));
    }
    out.push(ss.join(' ').trim());
  }
  return out;
}

function article(a,week){
  if(!a)return;const reporter=String(a?.reporter?.id||'walter-mercer'),used=new Set();
  for(const sec of a.sections||[]){
    if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewriteParagraphs(sec.paragraphs,reporter,week,used);
    for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewriteParagraphs(b.paragraphs,reporter,week,used)
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean)
}

export function naturalizeInquirerForwardEdition(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  for(const team of edition.teams)article(team?.inquirer_article,Number(week));
  const o=edition.league_overview,used=new Set();
  if(o){
    for(const sec of o.sections||[]){
      if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewriteParagraphs(sec.paragraphs,'walter-mercer',Number(week),used);
      for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewriteParagraphs(b.paragraphs,'walter-mercer',Number(week),used)
    }
    for(const h of o.hot_takes||[])if(h?.take)h.take=rewriteParagraphs([h.take],'walter-mercer',Number(week),used).join(' ')
  }
  return edition;
}
