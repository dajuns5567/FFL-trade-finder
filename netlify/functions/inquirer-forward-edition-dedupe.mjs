// Final Week 3+ edition-wide uniqueness pass.
// The first natural occurrence of a sentence stays untouched. Later exact copies,
// heavily shared openings, and overused proper-name leads are reshaped with short
// reporter-specific natural transitions. Facts, names and numbers are preserved.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v)
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:No|Mr|Mrs|Ms|Dr|St|Jr|Sr)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/)
  .map(x=>x.replaceAll('§','.').trim())
  .filter(Boolean);
const key=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
const opening=(s,n=5)=>key(s).split(/\s+/).filter(Boolean).slice(0,n).join(' ');
const lower=s=>String(s||'').replace(/^([“"']?)([A-Z])/,(_,q,c)=>q+c.toLowerCase());

const LEADS={
  'walter-mercer':[
    'More importantly,','For this roster,','On the scoreboard,','In practical terms,','Looking ahead,','For the lineup,',
    'From here,','In the standings,','Against this opponent,','For management,','At this point,','By next week,',
    'For one Sunday,','Across the roster,','In this matchup,','With the margin in mind,','With the record in mind,','For the season,',
    'Before the next kickoff,','For the next opponent,','As things stand,','In plain football terms,','For now,','At minimum,'
  ],
  'tess-delaney':[
    'More elegantly,','Less glamorously,','For the discerning reader,','On closer inspection,','In fairness,','For the scoreboard,',
    'With the standings in view,','For this lineup,','Against this opponent,','For management,','Looking toward next week,','For the season,',
    'More usefully,','More awkwardly,','With some restraint,','With equal honesty,','For one Sunday,','Across the roster,',
    'Before the next kickoff,','For the next matchup,','As things stand,','In football terms,','For now,','At minimum,'
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
    'For the next slate,','In the larger picture,','More importantly,','For the recap,','As things stand,','In football terms,',
    'For now,','At minimum,','Across the matchups,','By next week,'
  ]
};

function properLead(sentence){
  const s=norm(sentence).replace(/^[“"']+/,'');
  const m=s.match(/^([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+){0,3})\b/);
  return m?m[1]:'';
}

function chooseLead(reporter,state){
  const bank=LEADS[reporter]||LEADS.__weekly_recap__;
  for(let tries=0;tries<bank.length;tries++){
    const index=(state.lead+tries)%bank.length;
    const value=bank[index];
    const shape=opening(value);
    if(!state.usedLeadShapes.has(shape)){
      state.lead=index+1;
      state.usedLeadShapes.add(shape);
      return value;
    }
  }
  return bank[state.lead++%bank.length];
}

function reshape(sentence,reporter,state){
  return `${chooseLead(reporter,state)} ${lower(norm(sentence))}`;
}

function processParagraphs(rows,owner,reporter,state){
  const output=[];
  let previousProper='';
  for(const paragraph of rows||[]){
    const out=[];
    for(let sentence of sentences(paragraph)){
      const original=key(sentence);
      const shape=opening(sentence);
      const owners=state.openOwners.get(shape)||new Set();
      const proper=properLead(sentence);
      const properKey=proper?`${owner}|${proper}`:'';
      const properCount=properKey?(state.properCounts.get(properKey)||0):0;
      const adjacent=!!(proper&&previousProper&&proper===previousProper);
      const repeatedProper=!!(proper&&properCount>=3);
      const duplicate=state.seen.has(original);
      const overused=shape.split(' ').length>=5&&owners.size>=2&&!owners.has(owner);
      if(duplicate||overused||adjacent||repeatedProper)sentence=reshape(sentence,reporter,state);
      if(properKey)state.properCounts.set(properKey,properCount+1);
      const finalKey=key(sentence),finalShape=opening(sentence),finalOwners=state.openOwners.get(finalShape)||new Set();
      state.seen.add(finalKey);
      finalOwners.add(owner);
      state.openOwners.set(finalShape,finalOwners);
      out.push(sentence);
      previousProper=properLead(sentence);
    }
    if(out.length)output.push(out.join(' ').trim());
  }
  return output;
}

function article(team,state){
  const a=team?.inquirer_article;if(!a)return;
  const owner=String(team?.roster_id||team?.team_name||'team');
  const reporter=String(a?.reporter?.id||'walter-mercer');
  for(const sec of a.sections||[]){
    if(Array.isArray(sec?.paragraphs))sec.paragraphs=processParagraphs(sec.paragraphs,owner,reporter,state);
    for(const block of sec?.blocks||[])if(Array.isArray(block?.paragraphs))block.paragraphs=processParagraphs(block.paragraphs,owner,reporter,state);
  }
  a.paragraphs=(a.sections||[]).flatMap(sec=>[...(sec?.paragraphs||[]),...(sec?.blocks||[]).flatMap(block=>block?.paragraphs||[])]).filter(Boolean);
}

function overview(o,state){
  if(!o)return;const owner='__weekly_recap__',reporter='__weekly_recap__';
  for(const sec of o.sections||[]){
    if(Array.isArray(sec?.paragraphs))sec.paragraphs=processParagraphs(sec.paragraphs,owner,reporter,state);
    for(const block of sec?.blocks||[])if(Array.isArray(block?.paragraphs))block.paragraphs=processParagraphs(block.paragraphs,owner,reporter,state);
  }
  for(const hot of o.hot_takes||[])if(hot?.take)hot.take=processParagraphs([hot.take],owner,reporter,state).join(' ');
}

export function dedupeInquirerForwardEdition(edition,{week}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const state={seen:new Set(),openOwners:new Map(),properCounts:new Map(),usedLeadShapes:new Set(),lead:Number(week)*19};
  for(const team of edition.teams)article(team,state);
  overview(edition.league_overview,state);
  return edition;
}