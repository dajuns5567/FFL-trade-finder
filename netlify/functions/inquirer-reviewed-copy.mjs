// Last reader-copy boundary, driven by the authenticated revision-80 audit.
// Operates on new forward candidates only; stored historical editions are inputs.
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const escape=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const sentences=s=>String(s||'').replace(/\b(?:Jr|Sr|St|Dr|Mr|Mrs|No)\./g,m=>m.replace('.','§')).replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).split(/(?<=[.!?])\s+/).map(s=>s.replaceAll('§','.').trim()).filter(Boolean);
const plain=s=>String(s).toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const paragraphs=a=>(a?.sections||[]).flatMap(s=>s.blocks?.length?s.blocks.flatMap(b=>b.paragraphs||[]):s.paragraphs||[]);

export function isRecordedPlayerStatSentence(line){
 const split=String(line||'').split(' recorded ');if(split.length!==2||!split[0].trim())return false;
 const bit=String.raw`(?:\d+ carr(?:y|ies) for -?\d+ yards|\d+ rushing touchdowns?|\d+ catch(?:es)? on \d+ targets?(?: for -?\d+ yards)?|\d+ receiving touchdowns?|\d+ completions on \d+ attempts|\d+ passing yards|\d+ passing touchdowns?|\d+ interceptions?|\d+ solo tackles?|\d+ assisted tackles?|\d+(?:\.\d+)? sacks?|\d+ tackles? for loss|\d+ QB hits?)`;
 return new RegExp('^'+bit+'(?:, '+bit+')*\\.$').test(split[1]);
}

function isRecordedPerformanceSentence(line,t){
 if(!t?.opponent_name)return false;
 const copy=polishReviewedGrammar(line,[],true),mascot=String(t.team_name||'').split(/\s+/).at(-1);
 return (t.starter_details||[]).some(p=>{
  if(!p?.name||p.points==null||!Number.isFinite(Number(p.points)))return false;
  const start='Against '+t.opponent_name+', '+p.name;
  const amount=Number(p.points).toFixed(1);
  const patterns=[start+' led the '+mascot+' with '+amount+' fantasy points',start+' added '+amount+' for the '+mascot];
  return patterns.some(prefix=>copy===prefix+'.'||copy.startsWith(prefix+'; '));
 });
}

export function polishReviewedGrammar(value,names=[],stripPrefixes=true){
 let s=String(value||'');if(stripPrefixes)s=s.replace(/\b(?:Nicely put, but|After the applause|Read the final score first|The football is plain|The game tape will answer|Cut through the commotion|Turn it up|Forget the excuses|Nothing mysterious here|One lineup detail|Carry this into Monday|Screenshot this|Put this onscreen|Here is the noise|Across the sideline|The lineup explains why|Rivals noticed|Next week remembers|Spare me the excuses|No fine print):\s*/gi,'');
 // A club at the end of a prepositional phrase is not the subject. Earlier
 // entity substitution changed "the score against Jets does" into "do".
 for(const name of names){
  if(!/s$/i.test(name))continue;
  const e=escape(name),verbs={is:'are',has:'have',does:'do',gets:'get',needs:'need',faces:'face',was:'were'};
  s=s.replace(new RegExp('\\b'+e+' (?:(still|already|now) )?(is|has|does|gets|needs|faces|was)\\b','g'),(all,adverb,v,at,input)=>
   /\b(?:against|around|covering|for|from|of|to|with|before|after)\s$/i.test(input.slice(0,at))?all:name+' '+(adverb?adverb+' ':'')+verbs[v]);
 }
 return s
  .replace(/\b(\d+(?:\.\d+)? points against [^.;!?]{3,70}?) are the one detail/gi,'$1 is the one detail')
  .replace(/\b(the final score against [^.;!?]{3,70}?) do not erase/gi,'$1 does not erase')
  .replace(/\b(the optimism around [^.;!?]{3,70}?) are understandable/gi,'$1 is understandable')
  .replace(/\b(the next (?:test|matchup) (?:against|with) [^.;!?]{3,70}?) (are|do|need)\b/gi,(_,sub,v)=>sub+' '+({are:'is',do:'does',need:'needs'}[v]))
  .replace(/\b(the upcoming matchup with [^.;!?]{3,70}?) do not care/gi,'$1 does not care')
  .replace(/\b(A second one against [^.;!?]{3,70}?) get reviewed/g,'$1 gets reviewed')
  .replace(/\b(the next envelope addressed to [^.;!?]{3,70}?) need\b/gi,'$1 needs')
  .replace(/\b(The [\d.]+ from [^.;!?]{3,60}?) (belong|demand)\b/g,(_,sub,v)=>sub+' '+(v==='belong'?'belongs':'demands'))
  .replace(/changed the roster this week by (?=(?:dropped|added)\b)/gi,'changed the roster this week: ')
  .replace(/\s+:/g,':').replace(/\bJr\.\./g,'Jr.').replace(/\bSr\.\./g,'Sr.')
  .replace(/;\s*$/g,'.').replace(/\ba (?=(?:8|11|18)(?:\d|\.|-point))/gi,m=>m[0]==='A'?'An ':'an ')
  .replace(/\bthe pregame screenshot shows\b/gi,m=>m[0]==='T'?'The current projection shows':'the current projection shows')
  .replace(/\bThat top rival target shift put more on the board in Week (\d+)\./g,'')
  .replace(/\s+/g,' ').trim();
}

export function finishReviewedForwardCopy(edition,previousEditions=[]){
 if(Number(edition?.week)<5)return edition;
 const teams=edition.teams||[],names=[...new Set(teams.flatMap(t=>[t.team_name,t.opponent_name,t.next_opponent_name]).filter(Boolean))];
 const entities=[...names,...teams.flatMap(t=>(t.starter_details||[]).map(p=>p.name))].sort((a,b)=>b.length-a.length);
 const normalize=s=>{for(const n of entities)s=s.replace(new RegExp(escape(n),'gi'),'[entity]');return s.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,'[#]').replace(/\s+/g,' ').trim()};
 const owners=new Map(),exactOwners=new Map();
 for(const t of teams)for(const line of sentences(paragraphs(t.inquirer_article).join(' '))){
  const key=normalize(polishReviewedGrammar(line,names)),ids=owners.get(key)||new Set();ids.add(String(t.roster_id));owners.set(key,ids);const exact=plain(polishReviewedGrammar(line,names)),same=exactOwners.get(exact)||new Set();same.add(String(t.roster_id));exactOwners.set(exact,same);
 }
 const prior=new Map();
 for(const old of previousEditions)for(const t of old?.teams||[]){
  const id=String(t.roster_id),set=prior.get(id)||new Set();for(const line of sentences(paragraphs(t.inquirer_article).join(' ')))if(words(line)>=14)set.add(plain(polishReviewedGrammar(line,names)));prior.set(id,set);
 }
 const clean=(p,t)=>{
  // The late roster-indexed kicker restated every score and could celebrate a
  // loss or mourn a win. Keep the original substantive fan scene instead.
  if(t&&new RegExp('; around '+escape(t.team_name)+',').test(p))return '';
  const lines=sentences(p).filter(line=>{
   if(t&&!isRecordedPlayerStatSentence(line)&&!isRecordedPerformanceSentence(line,t)&&prior.get(String(t.roster_id))?.has(plain(polishReviewedGrammar(line,names))))return false;
   const count=owners.get(normalize(polishReviewedGrammar(line,names)))?.size||0;
   const pureStats=isRecordedPlayerStatSentence(line)||isRecordedPerformanceSentence(line,t)||/^\d+ (?:carries|catches|completions|solo|assisted|sacks?|yards?)/i.test(line);
   if(t&&!pureStats&&count>=4&&words(line)>=10)return false;
   if(t&&(exactOwners.get(plain(polishReviewedGrammar(line,names)))?.size||0)>=3&&words(line)>=8&&!/\d/.test(line))return false;
   return true;
  });
  // Never empty an essential desk just to evade the quality gate.
  return polishReviewedGrammar(lines.join(' '),names,!!t);
 };
 for(const t of teams){
  const a=t.inquirer_article;if(!a)continue;
  a.headline=polishReviewedGrammar(a.headline,names);
  for(const section of a.sections||[]){
   const cleaned=(section.paragraphs||[]).map(p=>clean(p,t)).filter(Boolean);
   if(cleaned.length)section.paragraphs=cleaned;
   section.heading=polishReviewedGrammar(section.heading,names);
  }
  const value=a.sections?.find(s=>s.kind==='value'),v=t.value_history_week||{};
  if(value&&words(value.paragraphs.join(' '))<30&&v.pct!=null&&Number.isFinite(Number(v.pct))&&Number(v.player_count)>0){
   value.paragraphs.push('The '+(Number(v.delta)>=0?'gain':'decline')+' is '+Math.abs(Number(v.pct)).toFixed(1)+'% of the prior appraisal across '+Number(v.player_count)+' rostered players.');
  }
  const missed=t.best_lineup_miss,management=a.sections?.find(s=>s.kind==='management');
  if(management&&(words(paragraphs(a).join(' '))<300||words(management.paragraphs.join(' '))<25)&&missed?.reserve?.name&&missed?.starter?.name&&Number(missed.gap)>0&&Number.isFinite(Number(t.points))&&Number.isFinite(Number(t.opponent_points))){
   const corrected=Number(t.points)+Number(missed.gap),remaining=Number(t.opponent_points)-corrected;
   management.paragraphs[0]+=' Making that compatible substitution would raise the team total to '+corrected.toFixed(1)+' points against '+Number(t.opponent_points).toFixed(1)+'. '+(remaining>0?'The remaining deficit would be '+remaining.toFixed(1)+' points; that substitution alone could not rescue the result.':remaining<0?(Number(t.points)<Number(t.opponent_points)?'That compatible substitution would have reversed the result by ':'The winning margin would have expanded to ')+Math.abs(remaining).toFixed(1)+' points.':'That compatible substitution would have tied the matchup.');
  }
  if(management&&(words(management.paragraphs.join(' '))<25||words(paragraphs(a).join(' '))<300)&&!(Number(missed?.gap)>0)&&Number(t.points)>0){
   const lead=(t.starter_details||[]).filter(p=>p?.name&&p.points!=null&&Number.isFinite(Number(p.points))).sort((a,b)=>Number(b.points)-Number(a.points))[0];
   if(lead){
    const share=100*Number(lead.points)/Number(t.points),rest=Number(t.points)-Number(lead.points),margin=Math.abs(Number(t.points)-Number(t.opponent_points));
    management.paragraphs[0]+=' '+lead.name+' accounted for '+share.toFixed(1)+'% of the team score. The other starters supplied '+rest.toFixed(1)+' points, compared with a '+margin.toFixed(1)+'-point '+(Number(t.points)>Number(t.opponent_points)?'winning margin.':'deficit.');
   }
  }
  a.paragraphs=paragraphs(a);
 }
 const overview=edition.league_overview;
 if(overview){
  for(const section of overview.sections||[]){
   for(const block of section.blocks||[])block.paragraphs=(block.paragraphs||[]).map(p=>clean(p)).filter(Boolean);
   section.paragraphs=section.blocks?.length?section.blocks.flatMap(b=>b.paragraphs||[]):(section.paragraphs||[]).map(p=>clean(p)).filter(Boolean);
  }
  for(const take of overview.hot_takes||[])take.take=clean(take.take);
  overview.paragraphs=paragraphs(overview);
 }
 return edition;
}
