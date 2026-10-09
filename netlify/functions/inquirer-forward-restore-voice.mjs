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
function supportedFallback(rows,t,kind,seed){
 const rid=Math.max(1,Number(t.roster_id)||1),i=rid-1,base=rows[i%rows.length];
 const angles={
  'cool-throne':[
   'but the other starters still had to carry their share of the matchup',
   'which matters because the opponent’s total determined whether the production became a win',
   'but the individual high and the roster result remain two separate facts'
  ],
  'hot-seat':[
   'but an eligible alternative would need verification before judging the lineup call',
   'because a quiet starting return matters even when the matchup was not close',
   'so the next opponent gives management a new choice rather than an automatic fix'
  ],
  value:[
   'because the absence of a market entry cannot establish a flat week',
   'but the fantasy scoring result measures something different from a roster price',
   'which matters because future games cannot establish an unrecorded value change'
  ]
 };
 const tails=angles[kind]||angles.value,tail=tails[Math.floor(i/rows.length)%tails.length];
 return base.replace(/[.!?]\s+(?=[A-Z])/g,'; ').replace(/[.!?]+$/,'')+' — '+tail+'.';
}

const regexEscape=x=>String(x).replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
const names=edition=>(edition?.teams||[]).flatMap(t=>[t.team_name,t.manager_name,t.opponent_name,t.next_opponent_name,...(t.starter_details||[]).map(p=>p?.name)]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
const strip=s=>{let x=norm(s);for(let i=0;i<3;i++){const y=x.replace(lead,'');if(y===x)break;x=y}return x?x[0].toUpperCase()+x.slice(1):''};
function key(s,entities){let x=norm(s).toLowerCase();for(const e of entities)x=x.replace(new RegExp(regexEscape(e.toLowerCase()),'g'),'[entity]');return x.replace(/\b-?\d+(?:\.\d+)?\b/g,'[#]').replace(/\s+/g,' ').trim()}
const all=a=>(a?.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]).flatMap(sentences);
function fallback(t,kind,week){
 const ps=(t.starter_details||[]).filter(p=>valid(p?.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points)),top=ps[0],weak=ps.at(-1),
  team=String(t.team_name||'This roster'),star=String(top?.name||'the top starter'),low=String(weak?.name||'the lowest-scoring starter'),
  high=top?f(top.points):'unavailable',lowScore=weak?f(weak.points):'unavailable',seed=week+'|'+t.roster_id+'|'+kind;
 if(kind==='cool-throne')return supportedFallback([
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
 ],t,kind,seed);
 if(kind==='hot-seat')return supportedFallback([
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
 ],t,kind,seed);
 if(kind==='value'){
  const delta=t.value_history_week?.delta;
  if(valid(delta))return pick([
   team+' registered a '+(Number(delta)>=0?'gain':'decline')+' of '+Math.abs(Math.round(Number(delta)))+' tracked value points. That is separate from fantasy scoring.',
   'The saved value-history delta for '+team+' was '+Math.round(Number(delta))+'. A matchup result is a different statistic.',
   'Roster value for '+team+' moved '+Math.round(Number(delta))+' during the documented interval. That does not change the points already scored.'
  ],seed);
  return supportedFallback([
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
  ],t,kind,seed)
 }
 return '';
}
const interpretation=/\b(?:because|which means|that means|that is|that's|but|however|so |therefore|matters?|problem|warning|useful|useless|earned|deserved|embarrass|ridiculous|painful|good|bad|ugly|should|needs?|cannot|can't|did not|does not|cost|saved|carried|wasted|hid|exposed|punished|survived|buried|standings|division|opponent|matchup|margin)\b/i;
const bareFact=/\b(?:scored|posted|finished with|put up|gave|produced|added)\b[^.!?]*\b\d+(?:\.\d+)?\b|\b(?:Cool Throne|Hot Seat|roster value|market|ranking|projected|projection)\b/i;
const properLead=s=>{const m=norm(s).match(/^[“"']?([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+){1,3})\b/);return m?m[1]:''};
const opening=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').split(/\s+/).slice(0,5).join(' ');
function polishRows(rows,owner,state){
 const result=[];
 for(const p of rows||[]){
  if(bareFact.test(p)&&!interpretation.test(p))continue;
  const output=[];
  for(const sentence of sentences(p)){
   if(bad.test(sentence))continue;
   const proper=properLead(sentence),count=proper?(state.proper.get(proper)||0):0;
   if(proper&&((state.previousProper&&proper===state.previousProper)||count>=3))continue;
   const shape=opening(sentence),owners=state.openOwners.get(shape)||new Set();
   if(shape.split(' ').length>=5&&owners.size>=3&&!owners.has(owner))continue;
   if(proper)state.proper.set(proper,count+1);
   state.previousProper=proper;
   owners.add(owner);state.openOwners.set(shape,owners);
   output.push(sentence);
  }
  if(output.length)result.push(output.join(' '));
 }
 return result;
}
function uniqueSectionFallback(team,kind,week,seen,prior){
 const teamName=String(team.team_name||'the roster'),starters=(team.starter_details||[]).filter(p=>valid(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
 const best=starters[0],worst=starters.at(-1),delta=team.value_history_week?.delta;
 const player=best?String(best.name)+' ('+f(best.points)+' fantasy points)':'the available starting lineup';
 const low=worst?String(worst.name)+' ('+f(worst.points)+' points)':'the lowest starting slot';
 const available=[
   kind==='cool-throne'?[
     'In the Week '+week+' box score, '+player+' supplied '+teamName+' with the strongest individual return; the remaining starters still determined the matchup.',
     'The most productive starting contribution for '+teamName+' came from '+player+'. That result matters even when the team outcome tells a less comfortable story.',
     'For this completed matchup, '+player+' was the brightest line for '+teamName+'. It earned recognition without settling what happens next.',
     'The starting lineup gives '+teamName+' a concrete reason to credit '+player+'; its other positions still had to earn the final total.'
   ]:kind==='hot-seat'?[
     'The difficult starting spot for '+teamName+' in Week '+week+' was '+low+'. That is a role to inspect rather than an excuse to invent a replacement.',
     'A closer look at '+teamName+' finds '+low+' at the bottom of the starter scoring list; the next lineup offers a new decision.',
     'Week '+week+' exposed one quiet contribution for '+teamName+': '+low+'. An actual eligible alternative would be needed before blaming the manager.'
   ]:kind==='value'?[
     valid(delta)?'During the recorded interval, '+teamName+' had a tracked value change of '+Math.round(Number(delta))+'. That measure is distinct from what the starters scored.':'No verified roster-value movement was reported for '+teamName+' in Week '+week+'. The matchup total cannot establish a market price.',
     valid(delta)?'The value tracker moved '+teamName+' by '+Math.round(Number(delta))+' while the schedule produced a separate result. Neither figure substitutes for the other.':'For '+teamName+', the Week '+week+' market comparison is unavailable. That absence cannot establish a gain or loss.',
     valid(delta)?'Market history recorded '+Math.round(Number(delta))+' points of movement for '+teamName+'. The week’s fantasy result answers a different question.':'Week '+week+' has a completed game for '+teamName+' but no validated change in roster value; an unknown change stays unknown.',
     valid(delta)?'A tracked change of '+Math.round(Number(delta))+' belongs to '+teamName+' for this interval, independent of lineup production.':'The available edition supports a scoring account for '+teamName+', not a numerical market-value judgment for Week '+week+'.'
   ]:[]
 ][0]||[];
 if(kind==='cool-throne')available.push(
   'The credit column for '+teamName+' starts with '+player+'. The final margin needed more than that individual effort.',
   'Fantasy managers cannot borrow points from next week; '+player+' gave '+teamName+' a verified contribution right now.',
   player+' stood out among the starters on '+teamName+'. Its significance lies in what the rest of the lineup did around it.',
   'There was at least one dependable result for '+teamName+': '+player+'. A strong line deserves praise without turning it into a prediction.',
   'Any account of '+teamName+' should give '+player+' an individual mention. That contribution did not play all the other positions.',
   'One bright entry in the '+teamName+' lineup was '+player+'. Whether the team won or lost, the points were real.',
   'Praise here belongs to '+player+' for the most productive verified start on '+teamName+'. One player cannot solve every position.',
   'A completed fantasy score makes this recognition possible: '+player+' headed the contributions to '+teamName+'.',
   'Instead of projecting what could happen, the Cool Throne examines what happened. '+player+' led the '+teamName+' starters.',
   'The largest starter total for '+teamName+' came from '+player+'. Credit is deserved; a roster-wide verdict would be premature.',
   'Not every part of this lineup answered the bell, but '+player+' supplied the strongest number for '+teamName+'.'
 );
 if(kind==='value'&&valid(delta)){
  const move=Math.round(Number(delta)),signed=move>=0?'gain':'decline',magnitude=Math.abs(move);
  available.push(
    teamName+' changed by '+move+' tracked value points in the saved history; that direction describes the roster market rather than the Week '+week+' score.',
    'The saved market record puts '+teamName+' at '+(move>=0?'+':'')+move+' for this interval. The matchup result cannot independently confirm that valuation.',
    'A '+signed+' of '+magnitude+' value points accompanies '+teamName+' in the recorded window. Future roster prices are not implied by that single observation.',
    'The roster valuation moved '+move+' for '+teamName+', a distinct measure from how its starters performed against their opponent.',
    'For '+teamName+', the confirmed value-history difference is '+move+'. That movement does not award or remove a fantasy win.',
    'Management can review a '+magnitude+'-point market '+signed+' for '+teamName+'; Week '+week+' lineup production remains a separate question.',
    'Tracked roster value shifted '+(move>=0?'up':'down')+' '+magnitude+' for '+teamName+'. The change belongs to the saved interval, not a forecast.',
    'A documented market delta of '+move+' belongs to '+teamName+' this week. The opponent still decides the on-field matchup margin.',
    'The value timeline for '+teamName+' shows '+move+' during the measured period; standings and player scores tell different stories.',
    'There was a '+signed+' worth '+magnitude+' in '+teamName+'’s market history. That alone cannot determine the next trade or result.',
    'Roster history lists '+(move>=0?'an increase':'a decrease')+' of '+magnitude+' for '+teamName+'. Weekly performance should not be used to invent a different valuation.',
    'Value tracking marked '+teamName+' '+(move>=0?'higher':'lower')+' by '+magnitude+' points; the club’s completed score is evidence of competition, not pricing.'
  );
 }
 if(kind==='value'&&!valid(delta))available.push(
   'A fantasy box score exists for '+teamName+', but there is no corresponding confirmed price change; scoring points cannot fill that gap.',
   'The market column cannot assign a number to '+teamName+' this week. Only the matchup outcome is verified in the saved record.',
   'No reliable value-history observation accompanies the latest '+teamName+' result. Treat the absence as unknown rather than flat.',
   'For the value tracker, '+teamName+' has an unanswered question this interval. Its actual starter scores do not determine a market move.',
   'The completed game tells us how '+teamName+' performed, not how its roster valuation shifted. That second figure is unavailable.',
   'A price gain or loss would require stored market history for '+teamName+'. The Week '+week+' edition provides no such confirmed change.',
   'Unlike the fantasy matchup, the value record for '+teamName+' lacks a verified before-and-after comparison. No adjustment is claimed.',
   'The weekly standings and roster market operate on different records. '+teamName+' has no verified market delta for this interval.',
   'A missing transaction-window valuation prevents a grounded price statement about '+teamName+'. It does not invalidate the game result.',
   'The market desk cannot quantify movement for '+teamName+' from the current evidence. A fabricated zero would be misleading.',
   'Only scoring data can be confirmed for '+teamName+' here; the separate roster-value timeline does not supply this week’s difference.',
   'Nothing in this Week '+week+' snapshot supports assigning a market direction to '+teamName+'. Performance alone is not valuation.',
   'An actual value-history entry would be necessary to judge '+teamName+' as gaining or losing market value this week.',
   'There is a verified Sunday for '+teamName+', but not a verified value delta. Those are different information sources.'
 );
 const options=available.length?available:[
   'For '+teamName+', this Week '+week+' section has no additional verified '+kind+' detail; the game and lineup facts reported elsewhere remain unchanged.',
   'The saved Week '+week+' record cannot support further claims about '+kind+' for '+teamName+'. That limit is better than inventing a story.'
 ];
 const normalize=x=>norm(x).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
 const start=((Number(team.roster_id)||hash(teamName))+week*7)%options.length;
 for(let i=0;i<options.length;i++){let x=options[(start+i)%options.length];if(kind==='value'&&!valid(delta))x=x.replace(/\.\s+(?=[A-Z])/g,'; ').replace(/[.!?]$/,'')+' because the verified fantasy score cannot substitute for a missing market record.';
  if(kind==='value'&&valid(delta))x=x.replace(/\.\s+(?=[A-Z])/g,'; ').replace(/[.!?]$/,'')+' because market prices and weekly fantasy points measure different outcomes.';const normalized=normalize(x);if(!prior.has(normalized)&&!seen.has(normalized)){seen.add(normalized);return x}}
 return options[0];
}
function canonicalizePublishedTeamNames(edition){
 const known=(edition?.teams||[]).map(t=>String(t.team_name||'')).filter(Boolean).sort((a,b)=>b.length-a.length);
 const correct=s=>{let result=String(s||'');for(const label of known){const safe=label.split('').map(c=>'\\.^$*+?()[]{}|'.includes(c)?'\\'+c:c).join('');result=result.replace(new RegExp('\\b'+safe+'\\b','gi'),label)}return result};
 for(const team of edition.teams||[]){
  const article=team.inquirer_article;
  if(!article)continue;
  for(const section of article.sections||[])section.paragraphs=(section.paragraphs||[]).map(correct);
  article.paragraphs=article.sections.flatMap(section=>section.paragraphs||[]);
 }
 for(const section of edition.league_overview?.sections||[]){
  if(section.blocks?.length){for(const block of section.blocks)block.paragraphs=(block.paragraphs||[]).map(correct);section.paragraphs=section.blocks.flatMap(b=>b.paragraphs||[])}
  else section.paragraphs=(section.paragraphs||[]).map(correct);
 }
 return edition;
}
function finalCopyQuality(edition,previousEdition){
 const entityNames=[...names(edition),...names(previousEdition)];
 const priorSentences=[...(previousEdition?.teams||[]).flatMap(t=>all(t.inquirer_article)),...all(previousEdition?.league_overview)];
 const previous=new Set(priorSentences.map(x=>key(x,entityNames)));
 const normalizeExact=x=>norm(x).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
 const previousExact=new Set(priorSentences.map(normalizeExact));
 const keyFn=sentence=>key(sentence,entityNames);
 const used=new Map();
 const openingSeen=new Map(),globalSentences=new Set();
 let afterWeekLeads=0;
 for(const team of edition.teams||[]){
  const article=team.inquirer_article;if(!article)continue;
  const leadCount=new Map(),seen=new Set();let lastProper='';
  const r=team.league_context?.record||{},currentRecord=valid(r.wins)&&valid(r.losses)?String(r.wins)+'-'+String(r.losses):null;
  for(const sec of article.sections||[]){
   sec.paragraphs=(sec.paragraphs||[]).map(p=>{
    let out=[];
    for(const sentence of sentences(p)){
     if(/\b(?:matchup headline|roster-wide verdict|courtroom|docket|cross-examination|defendant|prosecution|indictment)\b/i.test(sentence))continue;
     if(/\balso got \d+(?:\.\d+)? from\b/i.test(sentence))continue;
     if(/\bcrowd is back in rivals after the win\b/i.test(sentence))continue;
     if(/\brivals? now have a week of film\b|\brivals? turn it into a franchise logo\b|\bunder-the-radar credit after\b/i.test(sentence))continue;
     if(/^the week gave .+ a clear offensive or defensive contributor/i.test(sentence))continue;
     if(currentRecord&&/\b\d{1,2}-\d{1,2}\b/.test(sentence)&&[...sentence.matchAll(/\b\d{1,2}-\d{1,2}\b/g)].some(m=>m[0]!==currentRecord)&&!(/\bin Week\s+\d+\b/i.test(sentence)&&!new RegExp('\\bWeek\\s*'+Number(edition.week)+'\\b','i').test(sentence)))continue;
     const key=norm(sentence).toLowerCase(),keySentence=keyFn(sentence),proper=properLead(sentence),count=leadCount.get(proper)||0;
     if(seen.has(key)||previous.has(keySentence)||previousExact.has(normalizeExact(sentence))||globalSentences.has(normalizeExact(sentence)))continue;
     if(/^(.+ registered a (?:gain|decline) of [-+]?\d+ tracked value points|roster value for .+ moved [-+]?\d+ during the documented interval)\b/i.test(sentence))continue;
     if(/^market history recorded [-+]?\d+ points of movement/i.test(sentence))continue;
     if(/^against .+? added [-+]?\d+(?:\.\d+)? for the .+?; (?:passing|rushing|receiving):/i.test(sentence))continue;
     if(/^after a [-+]?\d+(?:\.\d+)?[- ]point week/i.test(sentence)&&afterWeekLeads>=2)continue;
     if(proper&&(count>=3||proper===lastProper))continue;
     const shape=opening(sentence);
     const owners=openingSeen.get(shape)||new Set();
     if(shape.startsWith('from # in week #')&&owners.size>=2)continue;
     if(owners.size>=3&&!owners.has(String(team.roster_id)))continue;
     if(proper)lastProper=proper;else lastProper='';
     seen.add(key);globalSentences.add(normalizeExact(sentence));if(/^after a [-+]?\d+(?:\.\d+)?[- ]point week/i.test(sentence))afterWeekLeads++;if(proper)leadCount.set(proper,count+1);
     owners.add(String(team.roster_id));openingSeen.set(shape,owners);
     out.push(sentence);
    }
    return out.join(' ');
   }).filter(Boolean);
   if(!sec.paragraphs.length)sec.paragraphs=[uniqueSectionFallback(team,sec.kind,Number(edition.week),globalSentences,previousExact)];
  }
  article.paragraphs=article.sections.flatMap(s=>s.paragraphs||[]);
 }
 // Final fallbacks can introduce another team's sentence after the first sweep.
 // Compare the completed articles once more, including their replacement paragraphs.
 const publishedSentences=new Set();
 for(const team of edition.teams||[]){
  const article=team.inquirer_article;if(!article)continue;
  for(const section of article.sections||[]){
   section.paragraphs=(section.paragraphs||[]).map(p=>{
    const keep=[];
    for(const line of sentences(p)){const k=normalizeExact(line);if(!k||publishedSentences.has(k))continue;publishedSentences.add(k);keep.push(line)}
    return keep.join(' ');
   }).filter(Boolean);
   if(!section.paragraphs.length){
    for(let tries=0;tries<16;tries++){
     const candidate=uniqueSectionFallback(team,section.kind,Number(edition.week),globalSentences,previousExact);
     const unique=sentences(candidate).filter(line=>!publishedSentences.has(normalizeExact(line)));
     if(!unique.length)continue;
     section.paragraphs=[unique.join(' ')];
     for(const line of unique)publishedSentences.add(normalizeExact(line));
     break;
    }
   }
  }
  article.paragraphs=article.sections.flatMap(sec=>sec.paragraphs||[]);
 }
 // The recap carries both blocks and flattened section paragraphs; edit the blocks only.
 const recap=edition.league_overview,starts=new Map(),properCounts=new Map();
 if(recap)for(const section of recap.sections||[]){
  const groups=section.blocks?.length?section.blocks:[section];
  for(const group of groups){
   group.paragraphs=(group.paragraphs||[]).map(p=>sentences(p).filter(sentence=>{
    const head=opening(sentence),count=starts.get(head)||0,proper=properLead(sentence),pc=properCounts.get(proper)||0;
    if(head.startsWith('from # in week #')&&count>=2)return false;
    if(proper&&pc>=3)return false;
    starts.set(head,count+1);if(proper)properCounts.set(proper,pc+1);return true;
   }).join(' ')).filter(Boolean);
  }
  if(section.blocks?.length)section.paragraphs=section.blocks.flatMap(b=>b.paragraphs||[]);
 }
 return canonicalizePublishedTeamNames(edition);
}
function polishEdition(edition,generated){
 const state={openOwners:new Map(),proper:new Map(),previousProper:''};
 for(const team of edition.teams||[]){
  const owner=String(team.roster_id),original=generated.get(owner);
  state.proper=new Map();state.previousProper='';
  for(const sec of team.inquirer_article?.sections||[]){
   const cleaned=polishRows(sec.paragraphs||[],owner,state);
   if(!cleaned.length){
    const backup=fallback(team,sec.kind,Number(edition.week));
    const originalSection=(original?.sections||[]).find(x=>x.kind===sec.kind);
    if(backup)cleaned.push(backup);
    else if(originalSection?.paragraphs?.length)cleaned.push(originalSection.paragraphs[0]);
   }
   sec.paragraphs=cleaned;
  }
  if(team.inquirer_article){
   const article=team.inquirer_article;
   if(!article.sections.flatMap(sec=>sec.paragraphs||[]).some(p=>new RegExp('\\bWeek\\s*'+Number(edition.week)+'\\b','i').test(p))){
    const lede=article.sections.find(sec=>sec.kind==='lede')||article.sections[0];
    if(lede?.paragraphs?.length)lede.paragraphs[0]='Week '+Number(edition.week)+': '+lede.paragraphs[0];
   }
   article.paragraphs=article.sections.flatMap(sec=>sec.paragraphs||[]);
  }
 }
 state.proper=new Map();state.previousProper='';
 for(const sec of edition.league_overview?.sections||[]){
  if(sec.blocks?.length){
   for(const block of sec.blocks)block.paragraphs=polishRows(block.paragraphs||[],'__recap__',state);
   sec.paragraphs=sec.blocks.flatMap(b=>b.paragraphs||[]);
  }else sec.paragraphs=polishRows(sec.paragraphs||[],'__recap__',state);
 }
 return edition;
}
export function finalizeReporterUniqueness(edition,previousEdition=null){
 const originals=new Map((edition?.teams||[]).map(t=>[String(t.roster_id),structuredClone(t.inquirer_article)]));
 return finalCopyQuality(edition,previousEdition);
}
export function restoreReporterNarratives(rebuilt,original,{previousEdition=null}={}){
 const allNames=[...names(original),...names(previousEdition)];
 const prior=new Set((previousEdition?.teams||[]).flatMap(t=>all(t.inquirer_article)).map(s=>key(strip(s),allNames)));
 const used=new Set(),byId=new Map((original?.teams||[]).map(t=>[String(t.roster_id),t])),generated=new Map((rebuilt.teams||[]).map(t=>[String(t.roster_id),t.inquirer_article]));
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
  if(!a.paragraphs.some(p=>new RegExp('\\bWeek\\s*'+Number(rebuilt.week)+'\\b','i').test(p))){const lede=(a.sections||[]).find(x=>x.kind==='lede')||a.sections?.[0];if(lede?.paragraphs?.length)lede.paragraphs[0]='In Week '+Number(rebuilt.week)+', '+lede.paragraphs[0].replace(/^[A-Z]/,m=>m.toLowerCase());}
  a.paragraphs=(a.sections||[]).flatMap(sec=>[...(sec.paragraphs||[]),...(sec.blocks||[]).flatMap(b=>b.paragraphs||[])]);
  a.editorial_rebuilt_for_week=Number(rebuilt.week);
  t.inquirer_article=a;
 }
 return finalCopyQuality(polishEdition(rebuilt,generated),previousEdition);
}
