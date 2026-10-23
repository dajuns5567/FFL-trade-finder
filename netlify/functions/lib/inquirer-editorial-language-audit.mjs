// Independent editorial language audit for every completed Week 5+ newsroom.
// Mechanical quality checks are fail-closed; humor/voice are reviewer judgments.
const norm=s=>String(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' ]/g,' ').replace(/\s+/g,' ').trim();
const words=s=>norm(s).split(' ').filter(Boolean);
const lines=a=>(a?.sections||[]).flatMap(s=>Array.isArray(s?.paragraphs)?s.paragraphs:[]).filter(Boolean);
const story=t=>t?.inquirer_article||{};
function repeatedCrossTeamWindows(teams,size=13,minimumOwners=5){
 const owners=new Map();
 for(const t of teams){
  const id=String(t.roster_id),seen=new Set();
  for(const p of lines(story(t))){
   const w=words(p);for(let i=0;i+size<=w.length;i++){
    const part=w.slice(i,i+size).join(' ');
    if(part.length>=55)seen.add(part);
   }
  }
  for(const phrase of seen){const set=owners.get(phrase)||new Set();set.add(id);owners.set(phrase,set)}
 }
 return [...owners].filter(([,ids])=>ids.size>=minimumOwners).sort((a,b)=>b[1].size-a[1].size)
  .slice(0,12).map(([phrase,ids])=>({phrase,teams:ids.size}));
}
// Detect entire reusable sentence structures even when teams, players and
// numerical scores change. This is a cross-week rule, not a Week5 phrase list.
export function editorialSentenceSkeleton(sentence,team){
 const names=[team?.team_name,team?.opponent_name,team?.manager_name,
  ...(team?.starter_details||[]).map(p=>p.name)]
  .filter(x=>typeof x==='string'&&x.trim().length>=4).sort((a,b)=>b.length-a.length);
 let masked=String(sentence).toLowerCase();
 for(const name of names)masked=masked.split(name.toLowerCase()).join('@');
 return norm(masked.replace(/\b\d+(?:\.\d+)?\b/g,'#'));
}
function sentenceSkeletons(team){
 const seen=new Set();
 for(const p of lines(story(team)))for(const sentence of String(p).split(/(?<=[.!?])\s+/)){
  const skeleton=editorialSentenceSkeleton(sentence,team),w=words(skeleton);
  if(w.length>=13&&w.length<=85&&w.filter(x=>x!=='fantasy'&&x!=='points').length>=11)
   seen.add(skeleton);
 }
 return seen;
}
function recycledPreviousWeekTemplates(teams,previous){
 if(!Array.isArray(previous?.teams))return [];
 const previousByRoster=new Map(previous.teams.map(t=>[String(t.roster_id),t]));
 const flagged=[];
 for(const team of teams){
  const prior=previousByRoster.get(String(team.roster_id));
  if(!prior)continue;
  const a=sentenceSkeletons(team),b=sentenceSkeletons(prior);
  const reused=[...a].filter(x=>b.has(x));
  if(reused.length>=2)flagged.push({roster_id:String(team.roster_id),count:reused.length,
   examples:reused.slice(0,2).map(x=>x.slice(0,130))});
 }
 return flagged;
}
function templateSkeletonEchoes(teams){
 const ownership=new Map();
 for(const t of teams){
  for(const phrase of sentenceSkeletons(t)){
   if(!ownership.has(phrase))ownership.set(phrase,new Set());
   ownership.get(phrase).add(String(t.roster_id));
  }
 }
 return [...ownership].filter(([,ids])=>ids.size>=4)
  .sort((a,b)=>b[1].size-a[1].size).slice(0,12)
  .map(([phrase,ids])=>({template:phrase.slice(0,160),teams:ids.size}));
}
export function auditInquirerLanguage(edition,previous=null){
 const teams=Array.isArray(edition?.teams)?edition.teams:[];
 const issues=[],warnings=[],reporters={},leads=new Map(),headlines=new Set();
 if(Number(edition?.season)===2026&&Number(edition?.week)<5)return{ok:true,issues,warnings,stats:{skipped:'original 2026 Week 1-4 archive'}};
 for(const t of teams){
  const id=String(t?.roster_id),a=story(t),paragraphs=lines(a),rid=String(a?.reporter?.id||'unknown');
  reporters[rid]=(reporters[rid]||0)+1;
  const headline=norm(a.headline);
  if(teams.length===32&&headlines.has(headline))issues.push({id:'duplicate-headline',team:id});
  headlines.add(headline);
  const opening=words(paragraphs[0]||'').slice(0,9).join(' ');
  if(opening.length>35){const set=leads.get(opening)||new Set();set.add(id);leads.set(opening,set)}
  const seen=new Set();
  for(const p of paragraphs){
   const k=norm(p);
   if(k.length>75&&seen.has(k))issues.push({id:'within-article-paragraph-echo',team:id,excerpt:k.slice(0,85)});
   seen.add(k);
  }
  const prior=(previous?.teams||[]).find(x=>String(x?.roster_id)===id);
  if(prior){
   const p=new Set(lines(story(prior)).map(norm).filter(x=>x.length>75));
   const copied=paragraphs.map(norm).filter(x=>x.length>75&&p.has(x));
   if(copied.length>=2)issues.push({id:'recycled-prior-week-paragraphs',team:id,count:copied.length});
  }
  const text=paragraphs.join(' ');
  // Such examples are objective anti-journalism scaffolds, not humor itself.
  if(/\b(?:as an ai|generated narrative|data suggests that|the algorithm concludes|in this section we will|fantasy football analysis follows)\b/i.test(text))
   issues.push({id:'robotic-editorial-meta-copy',team:id});
  // A 0.0-point lineup is reporting gold, not a positive contribution.
  // The Week5 Chiefs story literally said it 'got something' from a player
  // despite all seven starters scoring zero; never rubber-stamp that praise.
  const lede=lines(a).slice(0,3).join(' ');
  if(Number(t?.points)===0&&/\bgot something from\b/i.test(lede))
   issues.push({id:'zero-point-roster-false-credit',team:id,detail:'Article credits a zero-point starter with meaningful production'});
  const sarcasmSignals=(text.match(/\b(?:apparently|naturally|of course|congratulations|surely|mercifully|somehow|ridiculous|audacity|absurd|embarrass|excus|please|parade|miracle|disaster|fiasco|suspect|fraud|laugh|joke|nonsense|inexplicable|unbelievable|gall|nerve)\b|[!?]/gi)||[]).length;
  if(sarcasmSignals===0)warnings.push({id:'voice-read-required',team:id,detail:'No simple sarcasm signal; a human must judge whether this is funny, original and reporter-specific'});
 }
 // Week 5 manuscript review exposed recycled editorial jokes shared by only
 // two clubs; the legacy >=5-team n-gram threshold missed them.
 // This is a targeted warning about newsroom rhetoric, not sports facts.
 // Fail closed on a repeated recognizably identical punchline or stale
 // first-two-game arc, while preserving common factual stat syntax.
 const checkedPunchlines=[
  'the week 5 noise came from a real speaker and not somebody dropping a pan',
  'the week 5 strengths survive a new opponent or whether the joke simply changes names',
  'the kind of headline that usually gets folded underneath the newspaper',
  'the loud part of week 5 to bring backup',
  'not a rerun of the first two'
 ];
 for(const punch of checkedPunchlines){
  const matches=teams.filter(t=>norm(lines(story(t)).join(' ')).includes(norm(punch)))
   .map(t=>({team:t.team_name,roster_id:String(t.roster_id)}));
  if(punch==='not a rerun of the first two'&&matches.length)
   issues.push({id:'stale-opening-weeks-outlook',phrase:punch,teams:matches});
  else if(matches.length>=2)
   issues.push({id:'recycled-editorial-punchline',phrase:punch,teams:matches});
 }
 // Recap is part of the newspaper, not a free pass around article QA.
 const overview=edition?.league_overview||{};
 const first=(overview.sections||[])[0]||{};
 const kinds=(first.blocks||[]).map(b=>b.kind);
 if(teams.length===32&&(overview.sections||[]).length>0&&kinds.join('|')!=='lead|standings|players|decisions|league|outlook')
  issues.push({id:'recap-six-beat-layout',beats:kinds});
 if(teams.length===32&&(overview.sections||[]).length>0&&(Number(edition.week)<14?(overview.sections||[]).length!==4:((overview.sections||[]).length<4||(overview.sections||[]).length>5)))
  issues.push({id:'recap-four-reporter-desks',count:(overview.sections||[]).length});
 const takes=overview.hot_takes||[];
 const division=String(takes.find(h=>h.kind==='division')?.take||'');
 const labels=['AFC EAST','AFC NORTH','AFC SOUTH','AFC WEST','NFC EAST','NFC NORTH','NFC SOUTH','NFC WEST'];
 if(teams.length===32&&takes.some(h=>h.kind==='division')&&labels.some(label=>!division.includes(label+':')))
  issues.push({id:'recap-missing-division-report',missing:labels.filter(label=>!division.includes(label+':'))});
 if(/(?:Washington Commanders|Baltimore Ravens|Carolina Panthers|New Orleans Aints) now has\\b/i.test(JSON.stringify(overview)))
  issues.push({id:'recap-plural-team-grammar'});
 if(/(?:1-4[^.]{0,80}|0-5[^.]{0,80})close enough/i.test(division))
  issues.push({id:'recap-misleading-standings-gap'});
 if(/The gap is real but thin; one stumble turns the leader from front-runner into participant again/i.test(division))
  issues.push({id:'recap-misleading-division-lead'});
 for(const h of takes){
  if(/over [A-Z][a-z]+(?: [A-Z][a-z]+)* are the Week \d+ upset call/.test(h.take||''))
   issues.push({id:'recap-upset-syntax',title:h.title});
 }
 for(const echo of recycledPreviousWeekTemplates(teams,previous))
  issues.push({id:'recycled-prior-week-sentence-template',...echo});
 const skeletons=templateSkeletonEchoes(teams);
 for(const offender of skeletons)issues.push({id:'cross-team-reused-sentence-template',...offender});
 const cross=repeatedCrossTeamWindows(teams);
 for(const offender of cross)issues.push({id:'cross-team-long-language-reuse',...offender});
 for(const [prefix,ids] of leads)if(ids.size>=5)issues.push({id:'formulaic-lede-openings',opening:prefix,teams:ids.size});
 if(teams.length===32&&(Object.keys(reporters).length!==4||Object.values(reporters).some(n=>n!==8)))
  issues.push({id:'reporter-rotation-break',counts:reporters});
 return{ok:issues.length===0,issues,warnings,stats:{article_count:teams.length,reporters,
  common_openings:[...leads].filter(([,ids])=>ids.size>=3).slice(0,8).map(([text,ids])=>({text,count:ids.size})),
  repetitive_windows:cross.length,voice_warnings:warnings.length},
  reviewer_required:true,reviewer_questions:[
   'Do all four writers sound unmistakably different in rhythm and satire?',
   'Is the humor grounded in real box scores, management decisions and consequences?',
   'Are the insults clever rather than interchangeable filler?',
   'Does each team story add a distinct fact or argument beyond the recap?',
   'Is the sarcasm frequent, earned and non-repetitive without fabricated facts?'
  ]};
}
