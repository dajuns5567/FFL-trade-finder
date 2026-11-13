// Final reader-facing Weekly Recap attribution. Editorial transforms can delete
// the team-bearing sentence and accidentally leave an anonymous punchline or
// numeric claim as its own paragraph. Repair only those orphan paragraphs from
// verified current-week team results, never by guessing their former subject.
const cleanName=value=>String(value||'').trim();
const norm=value=>cleanName(value).toLocaleLowerCase('en-US');
const num=value=>Number(value);
const one=value=>num(value).toFixed(1);

function verifiedTeamRows(teams){
 return (teams||[]).filter(team=>cleanName(team?.team_name)&&
  cleanName(team?.opponent_name)&&team?.points!=null&&team?.opponent_points!=null&&
  Number.isFinite(num(team?.points))&&
  Number.isFinite(num(team?.opponent_points)))
  .slice().sort((a,b)=>num(b.points)-num(a.points)||
   cleanName(a.team_name).localeCompare(cleanName(b.team_name)));
}

export function inspectRecapTeamAttribution(overview,teams){
 const names=[...new Set((teams||[]).map(team=>norm(team?.team_name)).filter(Boolean))];
 const named=paragraph=>names.some(name=>norm(paragraph).includes(name));
 const missing=[];
 for(const [sectionIndex,section] of (overview?.sections||[]).entries()){
  const groups=Array.isArray(section?.blocks)&&section.blocks.length?section.blocks:[section];
  for(const [blockIndex,block] of groups.entries())
   for(const [paragraphIndex,paragraph] of (block?.paragraphs||[]).entries())
    if(cleanName(paragraph)&&!named(paragraph))
     missing.push({sectionIndex,blockIndex,paragraphIndex,
      kind:String(block?.kind||section?.kind||'general')});
 }
 for(const [takeIndex,take] of (overview?.hot_takes||[]).entries())
  if(cleanName(take?.take)&&!named(take.take))
   missing.push({takeIndex,kind:'hot-take'});
 return{ok:missing.length===0,missing};
}

export function groundForwardRecapTeamAttribution(overview,teams,week){
 // The previously accepted Week 1–8 manuscript bytes and editorial behavior
 // stay untouched. New Week 9+ editions must name their subjects explicitly.
 if(!overview||Number(week)<9)return overview;
 const rows=verifiedTeamRows(teams);
 if(!rows.length)throw Error('Recap team attribution requires verified completed matchups');
 const names=[...new Set((teams||[]).map(t=>norm(t?.team_name)).filter(Boolean))];
 const hasTeam=paragraph=>names.some(name=>norm(paragraph).includes(name));
 let repairNumber=0;
 const receipt=(kind)=>{
  const variant=repairNumber%3;
  const t=rows[repairNumber++%rows.length];
  const club=cleanName(t.team_name),rival=cleanName(t.opponent_name);
  const score=one(t.points),against=one(t.opponent_points);
  const margin=one(Math.abs(num(t.points)-num(t.opponent_points)));
  const outcome=num(t.points)>num(t.opponent_points)?'outscored':
   num(t.points)<num(t.opponent_points)?'finished behind':'finished level with';
  const result=club+' '+outcome+' '+rival+' '+score+' to '+against+
   ' in Week '+week+'.';
  const player=(t.starter_details||[]).filter(p=>cleanName(p?.name)&&p?.points!=null&&
   Number.isFinite(num(p?.points))).slice()
   .sort((a,b)=>num(b.points)-num(a.points))[0];
  const rank=num(t.league_context?.standings_rank);
  if(kind==='players'&&player)
   return club+' counted '+one(player.points)+' fantasy points from starter '+
    cleanName(player.name)+' against '+rival+'. The full selected lineup scored '+
    score+' in Week '+week+'. '+cleanName(player.name)+' supplied '+
    Math.round(num(player.points)/Math.max(1,num(t.points))*100)+
    '% of those starter points, a share '+rival+' had to account for.';
  if(kind==='standings'&&Number.isInteger(rank)&&rank>0)
   return club+' sat No. '+rank+' in the standings after Week '+week+
    ', with a recorded '+score+' to '+against+' result against '+rival+
    '. With that score in the books, the next opponent has a specific result to measure.';
  if(kind==='decisions'&&player)
   return club+' started '+cleanName(player.name)+' for '+one(player.points)+
    ' fantasy points in Week '+week+'. The full lineup totaled '+score+' against '+rival+
    '’s '+against+'; the starter actually selected is the one on the receipt.';
  if(kind==='outlook'&&cleanName(t.next_opponent_name))
   return club+' next faces '+cleanName(t.next_opponent_name)+
    ' after scoring '+score+' against '+rival+' in Week '+week+
    '. That is the measured starting point for the next matchup, not a forecast.';
  if(kind==='league')
   return result+' Those '+margin+' points split two actual league rivals; '+
    (num(t.points)>num(t.opponent_points)?club+' earned the better side of the ledger.':rival+' earned the better side of the ledger.');
  if(variant===0)return result+' The margin was '+margin+' points, '+
   'leaving '+(num(t.points)>num(t.opponent_points)?rival:club)+' with a specific score to answer in its next game.';
  if(variant===1)return 'Against '+rival+', '+club+' registered '+score+
   ' fantasy points in Week '+week+'. The opponent had '+against+
   ', making the recorded difference '+margin+' points.';
  return 'The Week '+week+' box score for '+club+' against '+rival+
   ' reads '+score+' to '+against+'. A '+margin+
   '-point separation is enough to settle the matchup, regardless of the pregame noise.';
 };
 const fix=(paragraphs,kind)=>(paragraphs||[]).map(paragraph=>{
  const text=cleanName(paragraph);
  // Never attach an unsupported team to a claim whose original subject was
  // lost. Replace the entire orphan with a different, fully sourced receipt.
  return !text||hasTeam(text)?paragraph:receipt(kind);
 });
 const kindFor=section=>{
  const heading=norm(section?.heading);
  if(/standings|contender|playoff/.test(heading))return'standings';
  if(/player|names behind/.test(heading))return'players';
  if(/decision|manager|back page/.test(heading))return'decisions';
  if(/next week|week ahead|outlook/.test(heading))return'outlook';
  if(/league|wire/.test(heading))return'league';
  return'lead';
 };
 for(const section of overview.sections||[]){
  if(Array.isArray(section.blocks)&&section.blocks.length){
   for(const block of section.blocks)
    block.paragraphs=fix(block.paragraphs,block.kind||kindFor(section));
   section.paragraphs=section.blocks.flatMap(b=>b.paragraphs||[]);
  }else section.paragraphs=fix(section.paragraphs,section.kind||kindFor(section));
 }
 for(const take of overview.hot_takes||[]){
  if(cleanName(take.take)&&!hasTeam(take.take))
   take.take=receipt('lead');
 }
 overview.paragraphs=(overview.sections||[]).flatMap(section=>section.paragraphs||[]);
 const audit=inspectRecapTeamAttribution(overview,teams);
 if(!audit.ok)throw Error('Weekly Recap attribution remains incomplete: '+audit.missing.length+' orphan paragraphs');
 return overview;
}
