// Self-sustaining Week 3+ newsroom pass.
// Runs last, after ranking normalization, so the published text is what gets
// compared against prior weeks. It prevents finite phrase banks from wrapping,
// supplies reporter-specific commentary when a fact is still bare, and breaks
// shared internal scaffolds without changing football facts or numbers.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v).replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const freshNorm=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
const prefixShape=(s,n=5)=>freshNorm(s).split(/\s+/).filter(Boolean).slice(0,n).join(' ');
const lower=s=>String(s||'').replace(/^([“"']?)([A-Z])/,(_,q,c)=>q+c.toLowerCase());

const ADJ=['direct','practical','measured','current','useful','immediate','grounded','clean','sharp','simple','focused','clear','realistic','tactical','strategic','repeatable','steady','specific','balanced','plain','decisive','careful','concrete','durable','short-term','season-long','matchup-specific','roster-wide','opponent-aware','standings-aware','scoring-driven','decision-level'];
const TOPIC=['football','lineup','scoring','matchup','standings','roster','management','season','opponent','division','result','pressure','leverage','performance','starter','bench','schedule','playoff','form','weekly'];
const PATTERN=[
  (a,t)=>`For a ${a} ${t} read,`,
  (a,t)=>`On a ${a} ${t} note,`,
  (a,t)=>`From a ${a} ${t} angle,`,
  (a,t)=>`With a ${a} ${t} lens,`,
  (a,t)=>`At a ${a} ${t} level,`,
  (a,t)=>`For this ${a} ${t} point,`,
  (a,t)=>`On this ${a} ${t} issue,`,
  (a,t)=>`From this ${a} ${t} view,`
];
const OLD_LEAD=/^(?:(?:For|On|From|At|Once|With|In|When|After|As|Looking|Before)\b[^,]{0,90},\s+)?(?:(?:the\s+)?(?:bottom line|useful part|practical read|clean version|actual issue|football part|part to keep|part to fix|scoreboard point|next concern|simplest read|part rivals noticed|part management owns|consequence is simple|important bit|pressure point|part worth remembering|matchup lesson|standings lesson):\s*)?/i;

function nextLead(state){
  const total=PATTERN.length*ADJ.length*TOPIC.length;
  for(let tries=0;tries<total;tries++){
    const i=state.lead++%total,p=i%PATTERN.length,a=ADJ[Math.floor(i/PATTERN.length)%ADJ.length],t=TOPIC[Math.floor(i/(PATTERN.length*ADJ.length))%TOPIC.length];
    const lead=PATTERN[p](a,t),shape=prefixShape(lead);
    if(!state.usedLeads.has(shape)){state.usedLeads.add(shape);return lead}
  }
  return'For a direct football read,';
}
function reshape(s,state){
  const body=norm(s).replace(OLD_LEAD,'').trim()||norm(s);
  return `${nextLead(state)} ${lower(body)}`;
}

const META_RE=/\b(?:copy desk|newsroom|this article|the article|this paragraph|same paragraph|same sentence|we wrote|i wrote|editorial|evidence says|the evidence|investigat(?:e|ion|ing)|case file|the file says|proof|verdict|exhibit|sample size|one repeat|another data point|test whether|gets to decide whether|decide whether it was real|whether it was real)\b/gi;
function scrubMeta(s){
  return norm(s).replace(META_RE,m=>{
    const k=m.toLowerCase();
    if(k.includes('investigat'))return'review';
    if(k.includes('article')||k.includes('paragraph')||k.includes('sentence')||k.includes('editorial')||k.includes('copy desk')||k.includes('newsroom'))return'column';
    if(k.includes('sample size'))return'recent stretch';
    if(k.includes('data point')||k.includes('repeat'))return'week';
    if(k.includes('proof')||k.includes('evidence')||k.includes('exhibit')||k.includes('verdict')||k.includes('file'))return'result';
    if(k.includes('whether'))return'if';
    return'read';
  }).replace(/\barguments?\b/gi,'issues').replace(/\s+/g,' ').trim();
}
function scrubVoice(s,reporter){
  let x=scrubMeta(s);
  if(reporter==='tess-delaney')x=x
    .replace(/\bfurniture\b/gi,'lineup pieces').replace(/\bchairs?\b/gi,'spots')
    .replace(/\btablecloth\b/gi,'presentation').replace(/\blinen\b/gi,'polish').replace(/\bnapkin\b/gi,'polish')
    .replace(/\bchina\b/gi,'best material').replace(/\bsilverware\b/gi,'hardware').replace(/\bplace setting\b/gi,'lineup spot')
    .replace(/\bdining room\b/gi,'league').replace(/\bdinner\b/gi,'week').replace(/\bcenterpiece\b/gi,'top scorer')
    .replace(/\bvelvet rope\b/gi,'front line').replace(/\bchaise\b/gi,'bench').replace(/\bballroom\b/gi,'matchup')
    .replace(/\bsalon\b/gi,'league').replace(/\bcoat check\b/gi,'bench');
  if(reporter==='nora-voss')x=x
    .replace(/\bdocket\b/gi,'list').replace(/\bcross-examination\b/gi,'pressure').replace(/\bdefendant\b/gi,'starter')
    .replace(/\bprosecution\b/gi,'criticism').replace(/\bindictment\b/gi,'warning').replace(/\bcourtroom\b/gi,'matchup');
  return x.replace(/\s+/g,' ').trim();
}

const INTERPRET_RE=/\b(?:because|which means|that means|that's|but|however|therefore|matters?|problem|warning|useful|useless|earned|deserved|embarrass|ridiculous|painful|good|bad|ugly|fine\.|should|needs?|cannot|can't|did not|does not|enough to|not enough|cost|saved|carried|wasted|hid|exposed|punished|bailed out|survived|buried|blew out|stole|dragged|passenger|ceiling|floor|leverage|standings|division|opponent|matchup|margin)\b/i;
const STAT_RE=/\b(?:scored|posted|finished with|put up|gave|produced|added)\b[^.!?]*\b\d+(?:\.\d+)?\b/i;
const FACT_RE=/\b(?:Cool Throne|Hot Seat|award|honor|playoff estimate|projection|projected|odds|chance|roster value|market|ranked|standings|division leader|playoff seed|outscored|benched|started over)\b/i;
function bareParagraph(p){const ss=sentences(p);return ss.length===1&&!INTERPRET_RE.test(ss[0])&&(STAT_RE.test(ss[0])||FACT_RE.test(ss[0]))}

const COMMENTS={
  'walter-mercer':[
    'That output matters because it changed how much the rest of the lineup had to do.',
    'The number is useful only because the matchup had to bend around it.',
    'That contribution gave the rest of the roster actual margin to work with.',
    'The points did a job; now the question is whether the role can do it again.',
    'That is the kind of production that turns a lineup spot from neutral into useful.',
    'The stat line belongs here because it changed the burden on everybody around it.',
    'That result created breathing room instead of merely filling a box-score row.',
    'The next opponent now has a real reason to account for that role.',
    'That was practical production, and practical production travels better than hype.',
    'The value is in the consequence: somebody else in the lineup needed less rescuing.',
    'That number moved the week enough to deserve more than a passing mention.',
    'The roster got something actionable from that spot, which is the standard that matters.',
    'That is usable weekly output, not just a number looking for applause.',
    'The matchup changed when those points arrived, and that is the useful part.',
    'That performance made the rest of the lineup easier to manage for one Sunday.',
    'If that role repeats, management has one fewer problem to solve next week.',
    'The points mattered because they reduced the amount of perfection required elsewhere.',
    'That is enough production to alter the next lineup conversation.',
    'The number earned attention by changing the game rather than decorating it.',
    'That contribution bought the roster options it did not have before kickoff.'
  ],
  'tess-delaney':[
    'Useful, yes; glamour is optional when the points have already done their work.',
    'The number is attractive chiefly because the opponent had to live with it.',
    'That contribution was tidy, effective and mercifully free of unnecessary theater.',
    'One can admire the production without pretending it needs a parade.',
    'The performance earned attention in the most tasteful way possible: by mattering.',
    'A polished stat line is nice; a stat line that changes the matchup is better.',
    'The useful part is not the presentation but the pressure it removed elsewhere.',
    'That was efficient enough to make the surrounding lineup look calmer by association.',
    'There is no need to oversell points that already improved the afternoon.',
    'That contribution did its work quietly enough to be trusted and loudly enough to matter.',
    'The line is worth keeping because it made the roster less needy elsewhere.',
    'A sensible performance with an actual consequence is difficult to complain about.',
    'That was the pleasant kind of production: visible in the result, not desperate for attention.',
    'The number has manners, but the effect on the opponent was appropriately rude.',
    'That is useful work precisely because it did not require the rest of the roster to be perfect.',
    'The performance improved the week without demanding that anyone romanticize it.',
    'There is enough substance there to survive after the postgame shine wears off.',
    'That production earned its place by making the rest of the lineup easier to carry.',
    'The stat line is neat; the more important point is that it actually bought margin.',
    'A contribution that reduces pressure elsewhere is always better than decorative arithmetic.'
  ],
  'mack-hollis':[
    'That number hit the matchup, not just the stat sheet.',
    'Those points bought the rest of the lineup room to breathe, which is worth yelling about.',
    'That was real scoreboard damage and the opponent had to pay for it.',
    'The stat matters because somebody on the other side spent Sunday trying to answer it.',
    'That output changed the week instead of sitting there looking impressive.',
    'Big enough to matter, useful enough to repeat, loud enough to remember.',
    'Those points gave the roster actual leverage, not fake confidence.',
    'That is the kind of line that makes a quiet teammate survivable for one week.',
    'The opponent felt every bit of that number, which is the whole point.',
    'That contribution put pressure on the other side before the rest of the lineup finished talking.',
    'The number earned the megaphone because it moved the game.',
    'That was useful damage, and useful damage is the easiest thing in football to understand.',
    'The scoreboard got louder when that production landed.',
    'That output did enough work to cover somebody else having a bad afternoon.',
    'The line matters because it forced the opponent to chase.',
    'That is not stat-sheet wallpaper; it changed how the matchup had to be played.',
    'Those points were loud in exactly the right place.',
    'The roster needed production and got a problem the opponent actually had to solve.',
    'That number turned a lineup slot into an advantage for one week.',
    'The contribution mattered immediately, which is more than most fantasy talking points can say.'
  ],
  'nora-voss':[
    'Rivals now know exactly what that number can do to a close matchup.',
    'The useful fact is that the opponent had to account for those points in real time.',
    'That contribution reduced the number of excuses available elsewhere in the lineup.',
    'The stat matters because it created leverage the opponent could not ignore.',
    'That output changed the burden on the rest of the roster, which makes it worth tracking.',
    'The number has a consequence attached, and that is what separates it from clutter.',
    'Rivals can debate sustainability later; the matchup already paid for it.',
    'That performance gave management one fewer weak spot to explain.',
    'The useful part is how much pressure it removed from the surrounding lineup.',
    'That contribution changed what the opponent needed from the rest of the game.',
    'The number is relevant because it narrowed the paths the other side had to win.',
    'That was production with an immediate strategic effect on the matchup.',
    'Rivals now have a concrete reason to plan for that role.',
    'That output mattered enough to change the next roster conversation.',
    'The stat line is secondary to the leverage it created on the other side.',
    'That contribution made the rest of the lineup less dependent on a perfect script.',
    'The opponent had to respond to that production, which is the useful takeaway.',
    'That number moved the week in a way rivals cannot simply wave away.',
    'The role earned attention because the matchup changed around it.',
    'That performance converted a roster slot into a problem for the opponent.'
  ]
};
const GENERIC_COMMENTS=[
  'That matters because it changed what the rest of the matchup required.',
  'The number earns space here because it altered the week rather than merely describing it.',
  'The useful part is the consequence: the other side had to respond.'
];
function pickComment(reporter,ctx){
  const bank=COMMENTS[reporter]||GENERIC_COMMENTS;
  for(let i=0;i<bank.length;i++){
    const row=bank[(ctx.state.comment+i)%bank.length],n=freshNorm(row);
    if(!ctx.usedComments.has(n)&&!ctx.prior.has(n)){ctx.state.comment++;ctx.usedComments.add(n);return row}
  }
  return GENERIC_COMMENTS[ctx.state.comment++%GENERIC_COMMENTS.length];
}

function collectPrior(previous){
  const out=new Set(),add=rows=>{for(const s of (rows||[]).flatMap(sentences)){const n=freshNorm(s);if(n)out.add(n)}};
  for(const t of previous?.teams||[]){const a=t?.inquirer_article;add(a?.paragraphs||[]);for(const sec of a?.sections||[]){add(sec?.paragraphs||[]);for(const b of sec?.blocks||[])add(b?.paragraphs||[])}}
  const o=previous?.league_overview;for(const sec of o?.sections||[]){add(sec?.paragraphs||[]);for(const b of sec?.blocks||[])add(b?.paragraphs||[])}for(const h of o?.hot_takes||[])add([h?.take]);
  return out;
}

function processParagraphs(paragraphs,owner,reporter,ctx){
  return (paragraphs||[]).map(p=>{
    let row=sentences(p).map(s=>scrubVoice(s,reporter)).filter(Boolean).join(' ');
    if(!row)return'';
    if(bareParagraph(row))row=`${row} ${pickComment(reporter,ctx)}`;
    const out=[];
    for(let s of sentences(row)){
      let n=freshNorm(s),sh=prefixShape(s),owners=ctx.openOwners.get(sh)||new Set();
      const stale=ctx.prior.has(n),duplicate=ctx.seen.has(n),overused=sh.split(' ').length>=5&&owners.size>=2&&!owners.has(owner);
      if(stale||duplicate||overused){s=reshape(s,ctx.state);n=freshNorm(s);sh=prefixShape(s);owners=ctx.openOwners.get(sh)||new Set()}
      if(n)ctx.seen.add(n);owners.add(owner);ctx.openOwners.set(sh,owners);out.push(s);
    }
    return out.join(' ').trim();
  }).filter(Boolean);
}

function rawTokens(s){return norm(s).split(/\s+/).map((raw,i)=>({raw,i,n:raw.toLowerCase().replace(/\d+(?:\.\d+)?/g,'#').replace(/[^a-z#']/g,'')})).filter(x=>x.n)}
function windows(s,size=6){const t=rawTokens(s),out=[];for(let i=0;i+size<=t.length;i++)out.push({key:t.slice(i,i+size).map(x=>x.n).join(' '),start:t[i].i,end:t[i+size-1].i});return out}
const SYN={
  standings:['race','order','positioning'],pressure:['leverage','strain','heat'],receiver:['wideout','pass-catcher'],turned:['converted','made'],good:['strong','useful'],top:['leading','best'],actual:['real','tangible'],already:['now','currently'],put:['placed','brought'],score:['total','number'],lineup:['starters','unit'],week:['Sunday','round'],result:['outcome','finish'],roster:['squad','team'],matchup:['game','head-to-head'],points:['scoring','output'],clear:['obvious','plain'],useful:['valuable','workable'],strong:['solid','forceful'],weakness:['problem','soft spot'],strength:['advantage','asset'],player:['starter','name'],production:['output','work']
};
function varySharedWindow(s,win,state){
  const raw=norm(s).split(/\s+/),choices=[];
  for(let i=win.start;i<=win.end&&i<raw.length;i++){
    const clean=raw[i].toLowerCase().replace(/[^a-z'-]/g,'');if(SYN[clean])choices.push({i,clean});
  }
  if(!choices.length)return reshape(s,state);
  const c=choices[state.lex++%choices.length],alts=SYN[c.clean],alt=alts[state.lex%alts.length],punct=(raw[c.i].match(/[^A-Za-z'-]+$/)||[''])[0];
  raw[c.i]=alt+punct;return raw.join(' ');
}

function breakSharedWindowsParagraphs(paragraphs,owner,ctx){
  return (paragraphs||[]).map(p=>{
    const out=[];
    for(let s of sentences(p)){
      for(let pass=0;pass<4;pass++){
        const ws=windows(s,6);let hit=null;
        for(const w of ws){const owners=ctx.windowOwners.get(w.key);if(owners&&owners.size&&!owners.has(owner)){hit=w;break}}
        if(!hit)break;s=varySharedWindow(s,hit,ctx.state);
      }
      for(const w of windows(s,6)){const owners=ctx.windowOwners.get(w.key)||new Set();owners.add(owner);ctx.windowOwners.set(w.key,owners)}
      out.push(s);
    }
    return out.join(' ').trim();
  }).filter(Boolean);
}

function processArticle(team,ctx){
  const a=team?.inquirer_article;if(!a)return;const owner=String(team?.roster_id||team?.team_name||'team'),reporter=String(a?.reporter?.id||'');
  for(const sec of a.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=processParagraphs(sec.paragraphs,owner,reporter,ctx);for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=processParagraphs(b.paragraphs,owner,reporter,ctx)}
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
}
function processOverview(o,ctx){if(!o)return;const owner='__weekly_recap__';for(const sec of o.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=processParagraphs(sec.paragraphs,owner,'',ctx);for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=processParagraphs(b.paragraphs,owner,'',ctx)}for(const h of o.hot_takes||[])if(h?.take)h.take=processParagraphs([h.take],owner,'',ctx).join(' ')}
function windowArticle(team,ctx){const a=team?.inquirer_article;if(!a)return;const owner=String(team?.roster_id||team?.team_name||'team');for(const sec of a.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=breakSharedWindowsParagraphs(sec.paragraphs,owner,ctx);for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=breakSharedWindowsParagraphs(b.paragraphs,owner,ctx)}a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean)}
function windowOverview(o,ctx){if(!o)return;const owner='__weekly_recap__';for(const sec of o.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=breakSharedWindowsParagraphs(sec.paragraphs,owner,ctx);for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=breakSharedWindowsParagraphs(b.paragraphs,owner,ctx)}for(const h of o.hot_takes||[])if(h?.take)h.take=breakSharedWindowsParagraphs([h.take],owner,ctx).join(' ')}

export function sustainInquirerForwardEdition(edition,{week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const ctx={prior:collectPrior(previousEdition),seen:new Set(),openOwners:new Map(),windowOwners:new Map(),usedComments:new Set(),state:{lead:Number(week)*97,comment:Number(week)*11,lex:Number(week)*13,usedLeads:new Set()}};
  for(const team of edition.teams)processArticle(team,ctx);processOverview(edition.league_overview,ctx);
  for(const team of edition.teams)windowArticle(team,ctx);windowOverview(edition.league_overview,ctx);
  return edition;
}
