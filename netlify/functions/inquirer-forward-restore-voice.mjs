// Restore reporter-specific stories without recycled transitions or copied sentences.
// This works on finished editions, preserves all verified statistics and identities,
// and never invents missing roster-value or player data.
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const sentences=s=>norm(s).replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).split(/(?<=[.!?])\s+/).map(s=>s.replaceAll('§','.').trim()).filter(Boolean);
const bad=/\b(?:for this matchup, the important bit|volume knob snapped off|that is matchup pressure, not decorative arithmetic|three stat lines kept this thing|proof|evidence|sample size|the model|investigat(?:e|ion)|the case for|the test is whether)\b/i;
const lead=/^(?:Elsewhere|Meanwhile|Broadly|Looking ahead|For now|On balance|In context|That said|Next up|At least|Instead|Then again|All told|So far|In turn|Even then|Separately|Notably|Consequently|Afterward|By contrast|At minimum|Likewise|Otherwise|Predictably|Plainly|Briefly|Clearly|Accordingly|Regardless),\s*/i;
const valid=x=>x!=null&&x!==''&&Number.isFinite(Number(x));
const f=x=>Number(x).toFixed(1);
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(rows,seed)=>rows[hash(seed)%rows.length];
const regexEscape=x=>String(x).replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
const names=edition=>(edition?.teams||[]).flatMap(t=>[t.team_name,t.manager_name,t.opponent_name,t.next_opponent_name,...(t.starter_details||[]).map(p=>p?.name)]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
const strip=s=>{let x=norm(s);for(let i=0;i<3;i++){const y=x.replace(lead,'');if(y===x)break;x=y}return x?x[0].toUpperCase()+x.slice(1):''};
function key(s,entities){let x=norm(s).toLowerCase();for(const e of entities)x=x.replace(new RegExp(regexEscape(e.toLowerCase()),'g'),'[entity]');return x.replace(/\b-?\d+(?:\.\d+)?\b/g,'[#]').replace(/\s+/g,' ').trim()}
const all=a=>(a?.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]).flatMap(sentences);
function fallback(t,kind,week){
 const ps=(t.starter_details||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),top=ps[0],weak=ps.at(-1),
  team=String(t.team_name||'This roster'),star=String(top?.name||'the top starter'),low=String(weak?.name||'the lowest-scoring starter'),
  high=top?f(top.points):'unavailable',lowScore=weak?f(weak.points):'unavailable',seed=week+'|'+t.roster_id+'|'+kind;
 if(kind==='cool-throne')return pick([
  star+' supplied '+high+' fantasy points, the best verified starting total for '+team+'.',
  'The positive individual headline belongs to '+star+', whose '+high+' points were actually banked by '+team+'.',
  'At '+high+' points, '+star+' led '+team+' on the score sheet. Credit belongs where it was earned.',
  team+' got a '+high+'-point contribution from '+star+'. That deserves recognition independent of the final margin.',
  star+' recorded '+high+' for '+team+'. A useful individual line is still useful even if other starters struggled.',
  'The highest individual starter total on '+team+' was '+star+' at '+high+' points.',
  'Give '+star+' a positive mention for '+high+' points; '+team+' got production from that starting spot.',
  'The Cool Throne conversation starts with '+star+' and a verified total of '+high+' points for '+team+'.',
  star+' posted '+high+' and gave '+team+' its best individual scoring return of Week '+week+'.',
  'No need to embellish '+star+'’s '+high+' points. That was the largest starting total for '+team+'.',
  team+' can thank '+star+' for a '+high+'-point outing, the most productive individual line in this lineup.',
  'Of the starters available in the record, '+star+' set the pace for '+team+' with '+high+' points.'
 ],seed);
 if(kind==='hot-seat')return pick([
  low+' returned '+lowScore+' points in the starting lineup for '+team+'. That role merits another look.',
  'The difficult number for '+team+' was '+low+' at '+lowScore+'. The manager gets another chance to review the position.',
  'At '+lowScore+' points, '+low+' was the quietest verified starter on '+team+'.',
  team+' received '+lowScore+' from '+low+'. It was the low end of the starting box score this week.',
  'The softest individual score on '+team+' belonged to '+low+': '+lowScore+'.',
  low+' contributed '+lowScore+' for '+team+'. An actual eligible replacement would need to be established before second-guessing the call.',
  'The Week '+week+' Hot Seat question for '+team+' includes '+low+' and a '+lowScore+'-point return.',
  team+' has a practical lineup question around '+low+', whose score was '+lowScore+'.',
  'Among the starters, '+low+' finished last for '+team+' with '+lowScore+'.',
  low+'’s '+lowScore+' points are the weak end of '+team+'’s verified starting totals.',
  'The lowest score in '+team+'’s starting lineup was '+low+' at '+lowScore+'.',
  'No need for blame theater: '+low+' recorded '+lowScore+' as a starter for '+team+'.'
 ],seed);
 if(kind==='value'){
  const delta=t.value_history_week?.delta;
  if(valid(delta))return pick([
   team+' registered a '+(Number(delta)>=0?'gain':'decline')+' of '+Math.abs(Math.round(Number(delta)))+' tracked value points. That is separate from fantasy scoring.',
   'The saved value-history delta for '+team+' was '+Math.round(Number(delta))+'. A matchup result is a different statistic.',
   'Roster value for '+team+' moved '+Math.round(Number(delta))+' during the documented interval. That does not change the points already scored.'
  ],seed);
  return pick([
   'No verified market-value delta accompanies '+team+' for Week '+week+'. A missing entry is not a zero change.',
   team+' has no recorded current-week change in its roster-value history. Matchup scoring cannot fill that gap.',
   'The edition does not establish a market adjustment for '+team+'. One should not be inferred from its final score.',
   'No authoritative value movement was stored for '+team+' in this interval.',
   'For '+team+', market movement is unavailable. That limits the financial storyline, not the game report.',
   'The roster price for '+team+' was not reliably updated with this edition, so no movement is claimed.',
   'There is no confirmed tracked-value change to quote for '+team+' this week.',
   'A Week '+week+' market change for '+team+' cannot be verified from the saved history.',
   team+' has a reportable game result but no verified value-history delta for the same window.',
   'The current record supplies no numerical roster-value change for '+team+'.',
   'For '+team+', the market tracker has not supplied a supported gain or loss this week.',
   'Value history cannot confirm a new price direction for '+team+' at this publication point.'
  ],seed)
 }
 return '';
}
export function restoreReporterNarratives(rebuilt,original,{previousEdition=null}={}){
 const allNames=[...names(original),...names(previousEdition)];
 const prior=new Set((previousEdition?.teams||[]).flatMap(t=>all(t.inquirer_article)).map(s=>key(strip(s),allNames)));
 const used=new Set(),byId=new Map((original?.teams||[]).map(t=>[String(t.roster_id),t]));
 for(const t of rebuilt.teams||[]){
  const source=byId.get(String(t.roster_id))?.inquirer_article;
  if(!source||!t.inquirer_article)continue;
  const a=structuredClone(source),generated=t.inquirer_article,local=new Set();
  for(const sec of a.sections||[]){
   const updated=[];
   for(const p of sec.paragraphs||[]){
    const keep=[];
    for(const originalSentence of sentences(p)){
     const sentence=strip(originalSentence),k=key(sentence,allNames);
     if(!sentence||bad.test(sentence)||!k||prior.has(k)||used.has(k)||local.has(k))continue;
     keep.push(sentence);used.add(k);local.add(k);
    }
    if(keep.length)updated.push(keep.join(' '));
   }
   if(!updated.length){
    const candidate=fallback(t,sec.kind,Number(rebuilt.week));
    const generatedSection=(generated.sections||[]).find(x=>x.kind===sec.kind);
    if(candidate)updated.push(candidate);
    else if(generatedSection?.paragraphs?.length)updated.push(generatedSection.paragraphs[0]);
   }
   sec.paragraphs=updated;
  }
  a.paragraphs=a.sections.flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
  a.editorial_rebuilt_for_week=Number(rebuilt.week);
  t.inquirer_article=a;
 }
 return rebuilt;
}
