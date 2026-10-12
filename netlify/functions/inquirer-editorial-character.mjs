// Week 4+ final reporting pass: factual, opinionated and dry, not a template recap.
const ok=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const fmt=x=>Number(x).toFixed(1);
const team=t=>String(t?.team_name||'The team');
const pname=p=>String(p?.name||'an unnamed starter');
const scored=t=>(t?.starter_details||[]).filter(p=>p?.name&&ok(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
const set=(a,k,rows)=>{const s=(a.sections||[]).find(s=>s.kind===k);if(s)s.paragraphs=rows};
export function addInquirerCharacter(edition,{week=Number(edition?.week)}={}){
 if(!edition||Number(week)<4||!Array.isArray(edition.teams))return edition;
 const by=new Map(edition.teams.map(t=>[String(t.roster_id),t]));
 for(const t of edition.teams){
  const a=t.inquirer_article,p=scored(t);
  if(!a||p.length<3||!ok(t.points)||!ok(t.opponent_points))continue;
  const [star,second,third]=p,weak=p.at(-1),rival=by.get(String(t.opponent_roster_id));
  const own=Number(t.points),other=Number(t.opponent_points),margin=Math.abs(own-other),won=own>=other;
  const three=p.slice(0,3).reduce((n,v)=>n+Number(v.points),0),rest=own-three,share=own>0?three/own:0;
  const tiny=p.filter(v=>Number(v.points)<5).length,zero=own===0,near=margin<=8,wide=margin>=30;
  const miss=t.best_lineup_miss||a.facts?.best_lineup_miss;
  const bench=miss?.reserve||miss?.bench,starter=miss?.starter,upgrade=Number(miss?.gap)||0;
  const legal=!!(bench?.name&&starter?.name&&upgrade>0),opponent=team(rival||{team_name:t.opponent_name});
  const angle=zero?'zero':!won&&legal&&upgrade>margin?'swing':near?'close':wide?'wide':share>=.70?'thin':tiny>=3?'quiet':won?'depth':'support';
  const first=pname(star),secondName=pname(second),thirdName=pname(third);
  const headlines={
   zero:team(t)+': Zero Points, '+opponent+' Wins. Hard to Spin That',
   swing:team(t)+': A '+fmt(upgrade)+'-Point Bench Choice in a '+fmt(margin)+'-Point Loss',
   close:team(t)+': '+fmt(margin)+' Points Decide the '+(won?'Escape From ':'Loss to ')+opponent,
   wide:team(t)+': '+(won?'A '+fmt(margin)+'-Point Rout of ':'A '+fmt(margin)+'-Point Defeat to ')+opponent,
   thin:team(t)+': '+first+' Produces, the Supporting Cast Has Questions',
   quiet:team(t)+': '+tiny+' Starters Under Five Points. There Is the Problem',
   depth:team(t)+': '+secondName+' and '+thirdName+' Make the Win More Than a One-Man Show',
   support:team(t)+': '+first+' Delivers '+fmt(star.points)+', '+opponent+' Still Wins'
  };
  const verdicts={
   zero:team(t)+' managed '+fmt(own)+' against '+opponent+'\'s '+fmt(other)+'. No verified starter delivered a positive score. One cannot reasonably declare a zero-point hero.',
   swing:team(t)+' lost '+fmt(own)+'–'+fmt(other)+'. '+pname(bench)+' scored '+fmt(upgrade)+' more than '+pname(starter)+' in a documented eligible alternative. The deficit was '+fmt(margin)+'. This is an actual lineup decision worth examining.',
   close:team(t)+' '+(won?'beat ':'lost to ')+opponent+' '+fmt(own)+'–'+fmt(other)+'. '+fmt(margin)+' points determined the result. It is precisely where actual eligible lineup choices matter and invented Monday certainty does not.',
   wide:team(t)+' '+(won?'beat ':'lost to ')+opponent+' '+fmt(own)+'–'+fmt(other)+'. The '+fmt(margin)+'-point gap was a team-wide result, not one particularly cruel bounce.',
   thin:first+', '+secondName+' and '+thirdName+' supplied '+fmt(three)+' of '+fmt(own)+' points for '+team(t)+'. The other starters combined for '+fmt(rest)+'. For a full lineup, that is a rather exclusive scoring club.',
   quiet:team(t)+' '+(won?'won':'lost')+' against '+opponent+' '+fmt(own)+'–'+fmt(other)+' with '+tiny+' starters below five points. Those quiet starting spots are not an abstract concern; they are where the points stopped.',
   depth:team(t)+' beat '+opponent+' '+fmt(own)+'–'+fmt(other)+'. '+first+' scored '+fmt(star.points)+', but '+secondName+' and '+thirdName+' also worked for their roster spots. Refreshingly democratic.',
   support:first+' scored '+fmt(star.points)+' for '+team(t)+', and '+opponent+' still won '+fmt(other)+'–'+fmt(own)+'. One strong player does not count as an entire lineup, inconvenient as that may be.'
  };
  const voices={
   'walter-mercer':'The scores are final; the promises about next week remain unscored.',
   'tess-delaney':'An attractive roster on paper does not come with complimentary points.',
   'mack-hollis':'NO SPEECH REQUIRED. The starting card is where the work happens.',
   'nora-voss':'Rivals have already noticed that weak starting role. They can read numbers too.'
  };
  const voice=voices[String(a.reporter?.id)]||voices['walter-mercer'];
  const line=zero?'Every verified starter finished on zero. Finding a hero here would require rewriting the scorebook.':
   first+' ('+String(star.position||'starter')+') scored '+fmt(star.points)+', '+secondName+' added '+fmt(second.points)+', and '+thirdName+' contributed '+fmt(third.points)+'. Their '+fmt(three)+' points were '+fmt(share*100)+'% of the team total; the rest supplied '+fmt(rest)+'.';
  const weakline=pname(weak)+' returned '+fmt(weak.points)+' at '+String(weak.position||'a starter slot')+'. '+tiny+' of '+p.length+' individually scored starters finished under five points. '+(won?'The victory conceals that number in the standings, not the box score.':'The loss makes it harder to ignore.');
  const decision=legal?pname(bench)+' beat selected starter '+pname(starter)+' by '+fmt(upgrade)+' in a verified eligible replacement. '+(won?'That would have widened a win.':upgrade>margin?'The potential gain exceeded the loss by '+fmt(upgrade-margin)+' points if other scores remained unchanged.':'The swap still would have left '+fmt(margin-upgrade)+' points to recover.'):
   'No eligible bench replacement is documented for '+team(t)+'. Announcing a specific bad start/sit choice anyway would be speculation dressed as analysis.';
  a.headline=headlines[angle];
  set(a,'lede',[verdicts[angle],line,'Against '+opponent+', the score margin was '+fmt(margin)+'. '+(near?'One legitimate lineup decision might be significant at that distance.':'The supporting positions, not just the headline scorer, had to account for the rest.')]);
  set(a,'players',[line,weakline]);
  set(a,'management',[decision,voice+' '+pname(weak)+' at '+fmt(weak.points)+' gives the manager a specific starting spot to review.']);
  const next=t.next_opponent_name?String(t.next_opponent_name):'an opponent not yet verified';
  set(a,'outlook',[team(t)+' next faces '+next+'. '+(zero?'First task: get a positive starter score. Ambitious, apparently.':share>=.70?'Another useful contributor beyond '+first+' and '+secondName+' is needed.':'Whether '+first+' repeats '+fmt(star.points)+' is not a management strategy.'),pname(weak)+' finished on '+fmt(weak.points)+'. That role requires a real decision, not a guarantee about what Week '+(week+1)+' will produce.']);
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
  a.editorial_character_version=1;
 }
 const recap=edition.league_overview,first=recap?.sections?.[0];
 if(first?.blocks?.length){
  const scores=edition.teams.filter(t=>ok(t.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const hi=scores[0],lo=scores.at(-1),lead=first.blocks.find(b=>b.kind==='lead');
  if(hi&&lo&&lead)lead.paragraphs.push(team(hi)+' put up '+fmt(hi.points)+'; '+team(lo)+' managed '+fmt(lo.points)+'. A '+fmt(Number(hi.points)-Number(lo.points))+'-point spread in the same league week makes talk of universal parity sound rather optimistic.');
  first.paragraphs=first.blocks.flatMap(b=>b.paragraphs||[]);
  recap.paragraphs=(recap.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
  recap.editorial_character_version=1;
 }
 return edition;
}
