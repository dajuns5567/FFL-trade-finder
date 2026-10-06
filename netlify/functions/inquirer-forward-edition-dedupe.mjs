// Final Week 3+ edition-wide uniqueness pass.
// The first natural occurrence of a sentence stays untouched. Later exact copies,
// heavily shared openings, and adjacent repeated proper-name leads are reshaped
// with short reporter-specific transitions. Facts, names and numbers are preserved.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v)
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:No|Mr|Mrs|Ms|Dr|St|Jr|Sr)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/)
  .map(x=>x.replaceAll('§','.').trim())
  .filter(Boolean);
const key=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
const opening=(s,n=5)=>key(s).split(/\s+/).filter(Boolean).slice(0,n).join(' ');

const LEADS={
  'walter-mercer':[
    'One correction:', 'The useful distinction:', 'Keep one thing straight:', 'The part that travels:',
    'The part that does not:', 'There is a simpler football point:', 'The scoreboard adds this:', 'The lineup adds this:',
    'The standings add this:', 'The opponent already knows this:', 'Management should know this:', 'The next week starts here:',
    'This much deserves credit:', 'This much deserves criticism:', 'That leaves one practical point:', 'The margin changes the read:',
    'The record changes the stakes:', 'No need to decorate it:', 'No need to excuse it:', 'The season has room for this:',
    'The season has less room for this:', 'Before the next kickoff:', 'Before anybody celebrates twice:', 'Before anybody buries them:'
  ],
  'tess-delaney':[
    'A small but important distinction:', 'The less glamorous detail:', 'The more flattering detail:', 'One should also notice this:',
    'One should not romanticize this:', 'The score permits this observation:', 'The score requires this observation:', 'The standings make this impolite:',
    'The lineup makes this awkward:', 'The opponent has already noticed:', 'Management may prefer another subject:', 'The next week deserves this much:',
    'This part is worth admiring:', 'This part is worth correcting:', 'There is a cleaner conclusion:', 'There is an uglier conclusion:',
    'A little restraint helps here:', 'A little honesty helps more:', 'One useful luxury remains:', 'One inconvenient detail remains:',
    'Before ordering another round of praise:', 'Before ordering another round of panic:', 'The tasteful version is brief:', 'The football version is briefer:'
  ],
  'mack-hollis':[
    'One more thing for the back page:', 'Here is the clean shot:', 'Here is the cheap shot they earned:', 'This part gets big type:',
    'This part gets circled in red:', 'The scoreboard has another message:', 'The lineup has another confession:', 'The standings have another insult:',
    'Rivals already saw this:', 'Management better see it too:', 'The next opponent gets this warning:', 'The next opponent gets this opportunity:',
    'Credit where it is loud:', 'Blame where it belongs:', 'That leaves one punchline:', 'That leaves one problem:',
    'The margin makes this simple:', 'The record makes this louder:', 'No committee needed:', 'No excuse package needed:',
    'Save this part:', 'Fix this part:', 'Put this on the fridge:', 'Keep this off the victory speech:'
  ],
  'nora-voss':[
    'One detail remains on the board:', 'One detail comes off the board:', 'Rivals should keep this in mind:', 'Management should keep this in mind:',
    'The record now includes this:', 'The lineup still owns this:', 'The standings make this relevant:', 'The margin makes this specific:',
    'The opponent already exposed this:', 'The opponent already confirmed this:', 'The next week begins with this:', 'The next lineup meeting begins with this:',
    'Credit belongs here:', 'The complaint belongs here:', 'That leaves one useful loose end:', 'That leaves one irritating loose end:',
    'The rival view is straightforward:', 'The management view should be too:', 'No mystery is required:', 'No alibi is required:',
    'Keep this on the list:', 'Take this off the excuse list:', 'The consequence is easier to read:', 'The pattern is easier to read:'
  ],
  '__weekly_recap__':[
    'Elsewhere around the league:', 'One league-wide correction:', 'One league-wide reminder:', 'The week added this:',
    'The standings added this:', 'The scoreboard added this:', 'One result deserves context:', 'One result deserves ridicule:',
    'One trend deserves respect:', 'One trend deserves suspicion:', 'The next week inherits this:', 'The recap can be simple here:',
    'The league already noticed:', 'The league should notice:', 'One final useful distinction:', 'One final uncomfortable distinction:'
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
  return `${chooseLead(reporter,state)} ${norm(sentence)}`;
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
      const adjacent=!!(proper&&previousProper&&proper===previousProper);
      const duplicate=state.seen.has(original);
      const overused=shape.split(' ').length>=5&&owners.size>=2&&!owners.has(owner);
      if(duplicate||overused||adjacent)sentence=reshape(sentence,reporter,state);
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
  const state={seen:new Set(),openOwners:new Map(),usedLeadShapes:new Set(),lead:Number(week)*19};
  for(const team of edition.teams)article(team,state);
  overview(edition.league_overview,state);
  return edition;
}
