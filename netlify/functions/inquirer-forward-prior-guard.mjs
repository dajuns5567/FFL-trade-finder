// Absolute Week 3+ prior-edition guard.
// If a finished sentence still matches last week's normalized copy, reshape it
// with a natural reporter transition while preserving every fact and number.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v)
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:No|Mr|Mrs|Ms|Dr|St|Jr|Sr)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/)
  .map(x=>x.replaceAll('§','.').trim())
  .filter(Boolean);
const key=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
const lower=s=>String(s||'').replace(/^([“"']?)([A-Z])/,(_,q,c)=>q+c.toLowerCase());

const LEADS={
  'walter-mercer':[
    'More importantly,','For this roster,','On the scoreboard,','In practical terms,','Looking ahead,','For the lineup,',
    'From here,','In the standings,','Against this opponent,','For management,','At this point,','By next week,',
    'For one Sunday,','Across the roster,','In this matchup,','With the margin in mind,','With the record in mind,','For the season,',
    'Before the next kickoff,','For the next opponent,','As things stand,','In plain football terms,','For now,','At minimum,'
  ],
  'tess-delaney':[
    'More elegantly,','Less glamorously,','On closer inspection,','In fairness,','For the scoreboard,','With the standings in view,',
    'For this lineup,','Against this opponent,','For management,','Looking toward next week,','For the season,','More usefully,',
    'More awkwardly,','With some restraint,','With equal honesty,','For one Sunday,','Across the roster,','Before the next kickoff,',
    'For the next matchup,','As things stand,','In football terms,','For now,','At minimum,','In the larger picture,'
  ],
  'mack-hollis':[
    'More loudly,','For the back page,','On the scoreboard,','For this lineup,','In the standings,','For the rivals,',
    'For management,','Against the next opponent,','With the margin in view,','With the record in view,','For one Sunday,','Across the roster,',
    'From here,','Looking ahead,','For the next matchup,','Before next kickoff,','As things stand,','In plain football terms,',
    'For now,','At minimum,','On the other side,','More importantly,','For the season,','In this matchup,'
  ],
  'nora-voss':[
    'More specifically,','For the record,','Across the lineup,','In the standings,','With the margin in view,','For management,',
    'For the rival view,','Against this opponent,','Looking toward next week,','For the next lineup meeting,','For one Sunday,','Across the roster,',
    'From here,','With the record in mind,','For the season,','Before the next kickoff,','As things stand,','In football terms,',
    'For now,','At minimum,','On closer review,','More importantly,','For the next opponent,','In this matchup,'
  ],
  '__weekly_recap__':[
    'Elsewhere around the league,','Across the standings,','On the scoreboard,','For the week as a whole,','Looking ahead,','Around the league,',
    'For the next slate,','In the larger picture,','More importantly,','As things stand,','In football terms,','For now,',
    'At minimum,','Across the matchups,','By next week,','On balance,'
  ]
};

function collect(previous){
  const out=new Set(),add=rows=>{for(const s of (rows||[]).flatMap(sentences)){const n=key(s);if(n)out.add(n)}};
  for(const t of previous?.teams||[]){
    const a=t?.inquirer_article;add(a?.paragraphs||[]);
    for(const sec of a?.sections||[]){add(sec?.paragraphs||[]);for(const b of sec?.blocks||[])add(b?.paragraphs||[])}
  }
  const o=previous?.league_overview;
  for(const sec of o?.sections||[]){add(sec?.paragraphs||[]);for(const b of sec?.blocks||[])add(b?.paragraphs||[])}
  for(const h of o?.hot_takes||[])add([h?.take]);
  return out;
}

function chooseLead(reporter,state){
  const bank=LEADS[reporter]||LEADS.__weekly_recap__;
  for(let tries=0;tries<bank.length;tries++){
    const i=(state.index+tries)%bank.length,lead=bank[i],k=key(lead);
    if(!state.used.has(k)){state.index=i+1;state.used.add(k);return lead}
  }
  return bank[state.index++%bank.length];
}

function freshen(sentence,prior,reporter,state){
  let out=norm(sentence);
  if(!prior.has(key(out)))return out;
  // Prefix the complete sentence so factual context such as "At 3-0" is never
  // discarded merely to make the wording fresh.
  for(let tries=0;tries<8&&prior.has(key(out));tries++)out=`${chooseLead(reporter,state)} ${lower(norm(sentence))}`;
  return out;
}

function rewrite(rows,prior,reporter,state){
  return(rows||[]).map(p=>sentences(p).map(s=>freshen(s,prior,reporter,state)).join(' ').trim()).filter(Boolean)
}
function article(a,prior,state){
  if(!a)return;const reporter=String(a?.reporter?.id||'walter-mercer');
  for(const sec of a.sections||[]){
    if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,prior,reporter,state);
    for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,prior,reporter,state)
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean)
}

export function guardInquirerForwardAgainstPrior(edition,{week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3||!previousEdition)return edition;
  const prior=collect(previousEdition),state={index:Number(week)*11,used:new Set()};
  for(const t of edition.teams)article(t?.inquirer_article,prior,state);
  const o=edition.league_overview;
  if(o){
    for(const sec of o.sections||[]){
      if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,prior,'__weekly_recap__',state);
      for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,prior,'__weekly_recap__',state)
    }
    for(const h of o.hot_takes||[])if(h?.take)h.take=rewrite([h.take],prior,'__weekly_recap__',state).join(' ')
  }
  return edition;
}