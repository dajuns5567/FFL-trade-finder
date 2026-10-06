// Absolute Week 3+ prior-edition guard.
// If a finished sentence still matches last week's normalized copy, reshape it
// with a natural reporter transition instead of synthetic "angle/lens/read" prose.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v)
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:No|Mr|Mrs|Ms|Dr|St|Jr|Sr)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/)
  .map(x=>x.replaceAll('§','.').trim())
  .filter(Boolean);
const key=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();

const SYNTHETIC_LEAD=/^(?:(?:For|On|From|At|With|Once|In|When|After|As|Looking|Before)\b[^,]{0,95},\s+)?/i;

const LEADS={
  'walter-mercer':[
    'The useful part is simpler:', 'One thing actually matters here:', 'The Sunday version is less complicated:',
    'That leaves the football point:', 'No parade route required:', 'The part worth keeping is this:',
    'The part worth fixing is obvious:', 'Put the record aside for a second:', 'The next opponent will care about this:',
    'The scoreboard already settled one part:', 'Management should remember this much:', 'There is a cleaner way to say it:',
    'The season has made this much clear:', 'The roster can live with this:', 'The roster cannot keep living with this:',
    'The standings make one thing useful:', 'The margin makes one thing obvious:', 'Week to week, this is what survives:',
    'The old desk will concede this:', 'The old desk will not concede this:', 'One Sunday does not erase this:',
    'The next lineup decision starts here:', 'Before anybody gets comfortable:', 'Before anybody gets miserable:'
  ],
  'tess-delaney':[
    'The less flattering detail is this:', 'The elegant version ends here:', 'A more useful observation:',
    'One may admire the result and still notice this:', 'The charming part is obvious:', 'The ugly part is equally available:',
    'There is no tasteful way around this:', 'A little perspective helps:', 'The next opponent will be less polite about this:',
    'The score permits one indulgence:', 'The score does not excuse this:', 'For all the celebration, this remains:',
    'For all the misery, this remains:', 'One detail deserves better manners:', 'One detail deserves none at all:',
    'The standings have already made this impolite:', 'The lineup has supplied its own critique:', 'The useful luxury is this:',
    'The uncomfortable luxury is this:', 'Even a good Sunday has housekeeping:', 'Even a bad Sunday can leave something worth keeping:',
    'The next week should inherit this:', 'The next week should not inherit this:', 'If we must be serious for a moment:'
  ],
  'mack-hollis':[
    'Here is the part worth yelling about:', 'Here is the part nobody should hide:', 'Put this in big type:',
    'Put this in smaller type, but keep it:', 'Now the good part:', 'Now the bad part:',
    'The scoreboard made this easy:', 'The scoreboard made this painful:', 'Rivals are going to screenshot this:',
    'Management should screenshot this too:', 'The next opponent just got a warning:', 'The next opponent just got an invitation:',
    'This is where the week got loud:', 'This is where the week got stupid:', 'The back page can work with this:',
    'The back page cannot rescue this:', 'One thing survived the noise:', 'One thing got buried by the noise:',
    'The margin tells the story here:', 'The lineup tells on itself here:', 'Save the speech and keep this:',
    'Save the excuses and fix this:', 'That is enough setup:', 'This one does not need a committee:'
  ],
  'nora-voss':[
    'Rivals noticed this:', 'Management should have noticed this too:', 'The useful detail is harder to bury:',
    'The uncomfortable detail is harder to bury:', 'The record now includes this:', 'The lineup now has to answer for this:',
    'The opponent already supplied the warning:', 'The opponent already supplied the compliment:', 'One fact deserves to stay on the board:',
    'One mistake deserves to stay on the board:', 'The standings make this harder to dismiss:', 'The margin makes this harder to excuse:',
    'The next opponent will start here:', 'The next lineup meeting should start here:', 'The quiet part is not especially quiet:',
    'The front office can call it whatever it wants:', 'The rival view is simpler:', 'The manager view should be simpler:',
    'There is one useful loose end:', 'There is one irritating loose end:', 'The week left this behind:',
    'The week did not clean this up:', 'The numbers are not the interesting part:', 'The consequence is the interesting part:'
  ],
  '__weekly_recap__':[
    'Around the league, one thing stood out:', 'The week left one clean takeaway:', 'The scoreboard added another wrinkle:',
    'The standings added another wrinkle:', 'One result deserves a second look:', 'One trend deserves less patience:',
    'One trend deserves more respect:', 'The league made this part obvious:', 'The next week inherits this story:',
    'That leaves one useful league-wide point:', 'The recap can be blunt here:', 'The rest of the league already noticed:'
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
  const lead=bank[state.index++%bank.length];
  return lead;
}

function freshen(sentence,prior,reporter,state){
  let out=norm(sentence);
  if(!prior.has(key(out)))return out;
  const body=out.replace(SYNTHETIC_LEAD,'').trim()||out;
  for(let tries=0;tries<8&&prior.has(key(out));tries++)out=`${chooseLead(reporter,state)} ${body}`;
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
