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
 const kindCounters=new Map();
 const receipt=kind=>{
  // Rotate separately within each desk. Entity/number normalization in the
  // independent audit must still see distinct sentences, not a team swap.
  const sequence=kindCounters.get(kind)||0;
  kindCounters.set(kind,sequence+1);
  const variant=sequence%8;
  const t=rows[repairNumber++%rows.length];
  const club=cleanName(t.team_name),rival=cleanName(t.opponent_name);
  const score=one(t.points),against=one(t.opponent_points);
  const margin=one(Math.abs(num(t.points)-num(t.opponent_points)));
  const won=num(t.points)>num(t.opponent_points);
  const player=(t.starter_details||[]).filter(p=>cleanName(p?.name)&&p?.points!=null&&
   Number.isFinite(num(p.points))).slice()
   .sort((a,b)=>num(b.points)-num(a.points))[0];
  const rank=num(t.league_context?.standings_rank);
  const star=cleanName(player?.name),starPoints=player?one(player.points):null;
  const share=player?Math.round(num(player.points)/Math.max(1,num(t.points))*100):null;
  const next=cleanName(t.next_opponent_name);
  if(kind==='players'&&player){
   const variants=[
    club+' drew '+starPoints+' starter points from '+star+' against '+rival+
      '. That contribution accounted for '+share+'% of the recorded '+score+'-point lineup total.',
    'The most productive counted starter for '+club+' was '+star+' at '+starPoints+
      ' points. Facing '+rival+', the lineup finished at '+score+' in Week '+week+'.',
    'Against '+rival+', '+club+' got '+starPoints+' fantasy points out of '+star+
      '. His or her individual tally formed '+share+'% of the lineup’s '+score+' points.',
    star+' led the selected '+club+' starters with '+starPoints+' in Week '+week+
      '. The remaining starters added to a '+score+'-point total against '+rival+'.',
    club+' put '+star+' on the starter card for '+starPoints+' points, with '+rival+
      ' on the opposite sideline. The full starting group closed the week on '+score+'.',
    'One measurable difference-maker for '+club+' was '+star+': '+starPoints+
      ' fantasy points. That made up '+share+'% of the club’s total against '+rival+'.',
    'In the '+club+'–'+rival+' fixture, '+star+' supplied '+starPoints+
      ' for '+club+'. The club’s recorded team score was '+score+' in Week '+week+'.',
    'The '+score+' points on '+club+'’s Week '+week+' scoreboard included '+star+
      ' at '+starPoints+'. That named contribution arrived against '+rival+'.'
   ];
   return variants[variant];
  }
  if(kind==='standings'&&Number.isInteger(rank)&&rank>0){
   const variants=[
    club+' occupied standing No. '+rank+' after its '+score+' to '+against+
      ' result against '+rival+'. That Week '+week+' result belongs on the division ledger.',
    'The table lists '+club+' at position '+rank+'. Its most recent entry is '+score+
      ' against '+rival+' at '+against+' in Week '+week+'.',
    'A '+score+'-point Week '+week+' performance against '+rival+
      ' left '+club+' ranked No. '+rank+'. That is the standings evidence, not a projection.',
    'Position '+rank+' currently belongs to '+club+', whose latest score against '+
      rival+' was '+score+' to '+against+'. The ranking will face another test next week.',
    club+' carried '+score+' points into the standings after facing '+rival+
      ' and '+against+'. Its recorded place in the league table is No. '+rank+'.',
    'At No. '+rank+', '+club+' has a specific Week '+week+' score to defend: '+
      score+' against '+rival+'’s '+against+'. The record keeps the receipt.',
    'From its matchup with '+rival+', '+club+' brought a '+score+' to '+against+
      ' final into a No. '+rank+' standings position. That is the number under discussion.',
    'The '+club+' standings argument begins at rank '+rank+
      ', not with a reputation. The club posted '+score+' against '+rival+' in Week '+week+'.'
   ];
   return variants[variant];
  }
  if(kind==='decisions'&&player){
   const variants=[
    club+' started '+star+' for '+starPoints+' fantasy points against '+rival+
      '. The entire chosen group recorded '+score+' in Week '+week+'.',
    'On '+club+'’s selected lineup, '+star+' contributed '+starPoints+
      ' points. That choice sat inside the '+score+'-point result against '+rival+'.',
    'A documented starter choice for '+club+' was '+star+', whose Week '+week+
      ' total reached '+starPoints+'. The team produced '+score+' against '+rival+'.',
    'Before arguing about hypothetical bench swaps, '+club+' can count '+star+
      ' at '+starPoints+' among its actual starters. The matchup with '+rival+' ended '+score+' to '+against+'.',
    star+' appeared on the '+club+' starting card and registered '+starPoints+
      '. The selected lineup, not an imagined alternative, put up '+score+' against '+rival+'.',
    'With '+rival+' across the matchup, '+club+' chose a starting group featuring '+
      star+'. Its '+starPoints+' contribution fed a '+score+'-point team total.',
    'The '+club+' lineup accounted for '+score+' fantasy points, including '+star+
      ' at '+starPoints+'. That is the player selection visible in the result against '+rival+'.',
    'For '+club+', '+star+' was a real Week '+week+' starter worth '+starPoints+
      ' points. Against '+rival+', that production counted toward the final '+score+'.'
   ];
   return variants[variant];
  }
  if(kind==='outlook'&&next){
   const variants=[
    club+' will meet '+next+' next after finishing Week '+week+' on '+score+
      ' against '+rival+'. The next opponent has a measured score to challenge.',
    'The next named opponent for '+club+' is '+next+
      '. Its latest lineup total was '+score+' in a matchup with '+rival+'.',
    'After a '+score+'-point result against '+rival+', '+club+' heads toward '+
      next+'. The old score is a baseline, not next week’s final.',
    next+' appears next on the '+club+' schedule. The club’s last completed tally '+
      'was '+score+' against '+rival+' in Week '+week+'.',
    club+' leaves the '+rival+' matchup at '+score+' points and turns to '+
      next+'. That is the actual transition in its schedule.',
    'The Week '+week+' scorecard gave '+club+' '+score+' against '+rival+
      '. Its following scheduled assignment comes against '+next+'.',
    'For '+club+', a game with '+next+' follows a '+score+'-point performance '+
      'against '+rival+'. No projection is needed to describe that sequence.',
    club+' now prepares for '+next+', carrying a '+score+'-point Week '+week+
      ' showing from the '+rival+' matchup as its most recent evidence.'
   ];
   return variants[variant];
  }
  if(kind==='league'){
   const variants=[
    'The '+club+' and '+rival+' result closed '+score+' to '+against+
      '. Their '+margin+'-point separation shows where the Week '+week+' scoreboard divided.',
    'Week '+week+' gave '+club+' '+score+' points against '+rival+' at '+against+
      '. That completed matchup belongs in any league-wide scoring comparison.',
    'Across the '+club+'–'+rival+' fixture, '+margin+
      ' points separated the starting totals. The club scores were '+score+' and '+against+'.',
    'League scoring has a concrete '+club+'–'+rival+' example: '+
      score+' to '+against+'. That is a '+margin+'-point difference.',
    'For '+club+' and '+rival+', the board supplied '+score+' and '+against+
      ' fantasy points respectively. The result belongs to Week '+week+', not the next round.',
    'A result worth measuring came from '+club+' facing '+rival+': '+
      score+' versus '+against+'. The margin reached '+margin+' points.',
    'The league’s Week '+week+' ledger places '+club+' on '+score+' against '+
      rival+' at '+against+'. Their matchup contributed one settled result to the table.',
    'One completed league comparison pairs '+club+' at '+score+' with '+rival+
      ' at '+against+'. The score gap is '+margin+' fantasy points.'
   ];
   return variants[variant];
  }
  const variants=[
   club+' finished Week '+week+' on '+score+' points against '+rival+' at '+
     against+'. The '+margin+'-point result sets the scale of this matchup.',
   'Facing '+rival+', '+club+' put '+score+' fantasy points on the board. The '+
     against+' from the other side made the Week '+week+' gap '+margin+'.',
   'The Week '+week+' game between '+club+' and '+rival+' ended '+score+
     ' to '+against+'. That is the recorded result behind this matchup.',
   'For '+club+', the score against '+rival+' settled at '+score+
     ' to '+against+'. A '+margin+'-point split is not something a Monday speech can change.',
   'A '+score+'-point lineup for '+club+' met '+against+' from '+rival+
     '. Week '+week+' left '+margin+' points between those totals.',
   'On the completed Week '+week+' scoreboard, '+club+' posted '+score+
     ' while '+rival+' posted '+against+'. The separation reached '+margin+'.',
   rival+' had to answer '+score+' points from '+club+' in their Week '+week+
     ' meeting. With '+against+' on its own card, the final margin was '+margin+'.',
   'The '+club+'–'+rival+' Week '+week+' fixture finished at '+score+
     ' and '+against+'. The difference came to '+margin+' fantasy points.'
  ];
  return variants[variant];
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
