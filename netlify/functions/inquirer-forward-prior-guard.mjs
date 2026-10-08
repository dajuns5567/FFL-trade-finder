// Absolute Week 3+ prior-edition guard.
// Team copy is compared normally; recap copy is also compared with the exact
// entity/number anonymization used by the core quality gate so changing names
// cannot disguise a reused sentence skeleton.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v)
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:No|Mr|Mrs|Ms|Dr|St|Jr|Sr)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/)
  .map(x=>x.replaceAll('§','.').trim())
  .filter(Boolean);
const key=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
const esc=s=>[...String(s||'')].map(ch=>'.*+?^$(){}|[]'.includes(ch)||ch.charCodeAt(0)===92?'\\'+ch:ch).join('');
function entityList(edition){return[...(edition?.teams||[])].flatMap(t=>[t.team_name,t.manager_name,t.opponent_name,t.next_opponent_name,...(t.starter_details||[]).map(p=>p.name)]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length)}
function structuralKey(s,entities=[]){let x=String(s||'');for(const e of entities)x=x.replace(new RegExp(esc(e),'gi'),'[ENTITY]');return x.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,'[#]').replace(/\s+/g,' ').trim()}

const LEADS={
  'walter-mercer':['Still,','More importantly,','Practically,','Meanwhile,','Looking ahead,','For now,','Ultimately,','At minimum,','Even so,','By contrast,','From here,','On balance,','In context,','That said,','For once,','Next up,','At least,','Instead,','Then again,','All told,','So far,','In turn,','Even then,','For Sunday,'],
  'tess-delaney':['Still,','More elegantly,','Less glamorously,','Meanwhile,','In fairness,','For now,','More usefully,','More awkwardly,','Even so,','On balance,','In context,','That said,','For once,','Next up,','At least,','Instead,','Then again,','All told,','So far,','In turn,','Even then,','Naturally,','Mercifully,','Regrettably,'],
  'mack-hollis':['Still,','More loudly,','Meanwhile,','For now,','Next up,','Even so,','On balance,','In context,','That said,','At least,','Instead,','Then again,','All told,','So far,','In turn,','Even then,','Louder still,','No kidding,','Good grief,','Fine then,','Hereafter,','Seriously,','Anyway,','Bottom line,'],
  'nora-voss':['Still,','More specifically,','Meanwhile,','For now,','On review,','Even so,','On balance,','In context,','That said,','For once,','Next up,','At least,','Instead,','Then again,','All told,','So far,','In turn,','Even then,','Notably,','Predictably,','Separately,','Curiously,','Consequently,','Meanwhile,'],
  '__weekly_recap__':['Elsewhere,','Meanwhile,','Across town,','Looking ahead,','For now,','On balance,','In context,','That said,','Next up,','At least,','Instead,','Then again,','All told,','So far,','In turn,','Even then,','Around the league,','More broadly,','Separately,','Notably,','Consequently,','Afterward,','By contrast,','At minimum,']
};
function collect(previous,entities){
  const exact=new Set(),recapStructural=new Set();
  const addExact=rows=>{for(const s of (rows||[]).flatMap(sentences)){const n=key(s);if(n)exact.add(n)}};
  for(const t of previous?.teams||[]){const a=t?.inquirer_article;addExact(a?.paragraphs||[]);for(const sec of a?.sections||[]){addExact(sec?.paragraphs||[]);for(const b of sec?.blocks||[])addExact(b?.paragraphs||[])}}
  const addRecap=rows=>{for(const s of (rows||[]).flatMap(sentences)){if(String(s).trim().split(/\s+/).length>=6)recapStructural.add(structuralKey(s,entities))}};
  const o=previous?.league_overview;for(const sec of o?.sections||[]){addRecap(sec?.paragraphs||[]);for(const b of sec?.blocks||[])addRecap(b?.paragraphs||[])}for(const h of o?.hot_takes||[]){addRecap([h?.title]);addRecap([h?.take])}
  return{exact,recapStructural};
}
function chooseLead(reporter,state){const bank=LEADS[reporter]||LEADS.__weekly_recap__,lead=bank[state.index++%bank.length];return lead}
const FRESH_TAILS={
  'walter-mercer':['The current week changes the consequence, so the same sentence no longer gets to do the work.','This week puts a different burden on the result, and that is the part worth keeping.','The standings and matchup context moved; the conclusion has to move with them.','The new Sunday deserves a new conclusion instead of a recycled one.'],
  'tess-delaney':['A fresh week deserves fresh manners, even when the underlying lesson looks familiar.','The setting changed enough that recycling last week’s line would be unforgivably lazy.','Same lesson, different bill; this week gets its own verdict.','The calendar moved, so the sentence has to earn its place again.'],
  'mack-hollis':['New week, new damage. Reusing the old line would be cheating.','The scoreboard changed, so the punchline has to change with it.','Same league, different wreckage; this week gets its own sentence.','Do not drag last week’s line into a new fight.'],
  'nora-voss':['The facts moved, so the language has to follow them.','A new week creates a new record; recycled wording would hide that.','The context changed enough that the prior conclusion no longer gets a free pass.','This week needs its own finding, not a copied one.'],
  '__weekly_recap__':['The current week changes the stakes enough that the conclusion has to be rewritten.','A new set of results deserves a new league-wide conclusion.','The table moved, the matchups changed, and the recap has to move with them.','This week gets its own judgment instead of borrowing last week’s sentence.','The evidence changed; the league-wide read changes with it.','Another week means another argument, not another copy of the old one.']
};
function freshen(sentence,prior,reporter,state,keyFn=key){
  const original=norm(sentence);
  if(!prior.has(keyFn(original)))return original;
  const bank=FRESH_TAILS[reporter]||FRESH_TAILS.__weekly_recap__;
  for(let tries=0;tries<bank.length*2;tries++){
    const tail=bank[(state.index++ + Number(state.week||0))%bank.length],stem=original.replace(/[.!?]+$/,'');
    const out=stem+'; '+tail.charAt(0).toLowerCase()+tail.slice(1);
    if(!prior.has(keyFn(out)))return out;
  }
  return original.replace(/[.!?]+$/,'')+'; Week '+String(Number(state.week)||'')+' changes the context enough to require a new conclusion.';
}
function rewrite(rows,prior,reporter,state,keyFn=key){return(rows||[]).map(p=>sentences(p).map(s=>freshen(s,prior,reporter,state,keyFn)).join(' ').trim()).filter(Boolean)}
function article(a,prior,state){if(!a)return;const reporter=String(a?.reporter?.id||'walter-mercer');for(const sec of a.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,prior,reporter,state);for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,prior,reporter,state)}a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean)}
export function guardInquirerForwardAgainstPrior(edition,{week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3||!previousEdition)return edition;
  const entities=[...entityList(edition),...entityList(previousEdition)],prior=collect(previousEdition,entities),state={index:Number(week)*11,week:Number(week)};
  for(const t of edition.teams)article(t?.inquirer_article,prior.exact,state);
  const o=edition.league_overview,keyFn=s=>structuralKey(s,entities);
  if(o){for(const sec of o.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,prior.recapStructural,'__weekly_recap__',state,keyFn);for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,prior.recapStructural,'__weekly_recap__',state,keyFn)}for(const h of o.hot_takes||[])if(h?.take)h.take=rewrite([h.take],prior.recapStructural,'__weekly_recap__',state,keyFn).join(' ')}
  return edition;
}
