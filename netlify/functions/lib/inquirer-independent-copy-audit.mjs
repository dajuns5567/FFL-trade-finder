// Read-only, source-independent editorial copy check. No Netlify writes.
const sourceParagraphs=article=>(article?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(p=>typeof p==='string');
const normalized=s=>String(s).toLowerCase().replace(/\s+/g,' ').trim();
const defects=[
 ['singular-score-agreement',/\bthe final score against [^.!?;]{2,90}? do not erase that work\b/i],
 ['singular-next-test',/\bthe next test against [^.!?;]{2,70}? are better suited\b/i],
 ['beating-take-agreement',/\bbeating [^.!?;]{2,70}? take a swing\b/i],
 ['singular-recap-quantifier',/\bof which 1 were decided\b/i],
 ['malformed-upset-copy',/at the first names on the scoring sheet card/i],
 ['meta-editorial-caveat',/not a prewritten final score|not a claim about their dynasty market prices|that is useful flexibility, not repetition/i]
];
export function auditIndependentInquirerCopy(editions,{revision=107,mode='preview'}={}){
 const issues=[],summaries=[],byWeek=new Map();
 const issue=(week,id,team)=>issues.push({week,id,team});
 for(const edition of editions||[]){
  const week=Number(edition?.week),teams=edition?.teams||[];
  byWeek.set(week,edition);
  if(!Number.isInteger(week)||week<5||Number(edition?.editorial_revision)!==revision)
   issue(week,'wrong-editorial-revision','Edition');
  if(mode==='preview'&&(edition?.preview_only!==true||edition?.published_locked!==false))
   issue(week,'not-isolated-preview','Edition');
  if(mode==='preview'&&(edition?.preview_editorial_audit?.ok!==true||edition?.preview_generation_quality?.ok!==true))
   issue(week,'generator-audit-held','Edition');
  if(teams.length!==32||new Set(teams.map(t=>String(t?.roster_id))).size!==32)
   issue(week,'coverage','Edition');
  const reporters=new Map(),all=[];
  for(const team of teams){
   const a=team.inquirer_article||{},paragraphs=sourceParagraphs(a),id=a.reporter?.id;
   reporters.set(id,(reporters.get(id)||0)+1);
   if((a.sections||[]).length!==8||paragraphs.filter(p=>p.trim().length>=50).length<6)
    issue(week,'missing-editorial-depth',team.team_name);
   if(/\bwin again\b/i.test(a.headline||'')){
    const prior=team.league_context?.recent_games?.find(g=>Number(g.week)===week-1);
    if(prior?.result!=='W')issue(week,'false-consecutive-win',team.team_name);
   }
   for(const paragraph of paragraphs)all.push({team:team.team_name,paragraph});
  }
  if(reporters.size!==4||[...reporters.values()].some(count=>count!==8))
   issue(week,'reporter-distribution','Edition');
  const recap=edition.league_overview||{};
  if((recap.sections?.[0]?.blocks||[]).length!==6)issue(week,'recap-six-beat-contract','Weekly Recap');
  for(const section of recap.sections||[]){
   const blockParagraphs=(section.blocks||[]).flatMap(block=>block.paragraphs||[]);
   const sectionParagraphs=section.paragraphs||[];
   // The six-beat recap deliberately mirrors block paragraphs in the first
   // section's flat paragraph array for reader compatibility. This is one
   // editorial occurrence, not two independent defects.
   const mirrored=blockParagraphs.length>0&&
    blockParagraphs.length===sectionParagraphs.length&&
    blockParagraphs.every((paragraph,i)=>paragraph===sectionParagraphs[i]);
   if(!mirrored)for(const paragraph of sectionParagraphs)all.push({team:'Weekly Recap',paragraph});
   for(const paragraph of blockParagraphs)all.push({team:'Weekly Recap',paragraph});
  }
  for(const take of recap.hot_takes||[]){
   const paragraph=String(take.take||'');all.push({team:'Weekly Recap',paragraph});
   for(const prefix of ['Forget the preamble:','What Sunday exposed:','On the starter card:'])
    if(paragraph.split(prefix).length>2)issue(week,'repeated-hot-take-preface','Weekly Recap');
  }
  for(const {team,paragraph} of all){
   if(typeof paragraph!=='string'||!paragraph.trim())issue(week,'blank-reader-paragraph',team);
   else if(paragraph!==paragraph.trim())issue(week,'paragraph-whitespace',team);
   for(const [id,regex] of defects)if(regex.test(String(paragraph)))issue(week,id,team);
  }
  summaries.push({week,team_articles:teams.length,reporters:Object.fromEntries(reporters),paragraphs:all.length});
 }
 const before=byWeek.get(7),after=byWeek.get(8);
 if(before&&after){
  const previous=new Map(before.teams.map(t=>[String(t.roster_id),
   new Set(sourceParagraphs(t.inquirer_article).map(normalized).filter(p=>p.length>120))]));
  for(const t of after.teams){
   const prior=previous.get(String(t.roster_id))||new Set();
   for(const paragraph of sourceParagraphs(t.inquirer_article))
    if(prior.has(normalized(paragraph)))issue(8,'exact-prior-week-copy-reuse',t.team_name);
  }
 }
 return{ok:issues.length===0,revision,summary:summaries,issue_count:issues.length,issues:issues.slice(0,100)};
}