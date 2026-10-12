// Final Week 4+ copy edit. Keeps actual box scores, awards and metadata intact.
// Distinguishes lede analysis from the player feature rather than repeating it.
const good=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const f=x=>Number(x).toFixed(1);
const nm=p=>String(p?.name||'an unnamed starter');
const tn=t=>String(t?.team_name||'The team');
const scorers=t=>(t?.starter_details||[]).filter(p=>p?.name&&good(p.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
const section=(a,k)=>(a?.sections||[]).find(x=>x.kind===k);
export function polishInquirerStories(edition,{week=Number(edition?.week)}={}){
 if(!edition||Number(week)<4)return edition;
 const byId=new Map((edition.teams||[]).map(t=>[String(t.roster_id),t]));
 for(const t of edition.teams||[]){
  const a=t.inquirer_article,players=scorers(t);
  if(!a||players.length<3||!good(t.points)||!good(t.opponent_points))continue;
  const [star,second,third]=players,weak=players.at(-1);
  const foe=byId.get(String(t.opponent_roster_id)),theirs=scorers(foe);
  const own=Number(t.points),other=Number(t.opponent_points),gap=Math.abs(own-other);
  const short=players.filter(p=>Number(p.points)<5);
  const lede=section(a,'lede'),features=section(a,'players');
  if(lede&&lede.paragraphs?.length>=3){
   const rival=foe?tn(foe):String(t.opponent_name||'the opponent');
   if(theirs[0]){
    const theirsTop=theirs[0],delta=Math.abs(Number(star.points)-Number(theirsTop.points));
    lede.paragraphs[2]=nm(theirsTop)+' paced '+rival+' with '+f(theirsTop.points)+', while '+nm(star)+' led '+tn(t)+' at '+f(star.points)+'. The best starters were '+f(delta)+' points apart. '+(gap<=8?'At a '+f(gap)+'-point final margin, scoring elsewhere in the lineup was decisive.':'It took more than either star to create the '+f(gap)+'-point final gap.');
   }
  }
  if(features&&features.paragraphs?.length>=2){
   if(own===0&&players.every(x=>Number(x.points)===0)){
    features.paragraphs[0]=nm(star)+', '+nm(second)+' and '+nm(third)+' all recorded zero. Treating any one of them as a standout would be an exercise in creative accounting.';
   }else{
    const starToLow=Number(star.points)-Number(weak.points),secondary=Number(second.points)+Number(third.points);
    features.paragraphs[0]=nm(star)+' led '+tn(t)+' with '+f(star.points)+' from '+String(star.position||'a starter role')+'. '+nm(second)+' and '+nm(third)+' combined for '+f(secondary)+'. Against '+f(weak.points)+' from '+nm(weak)+', the gap between the strongest and quietest starters was '+f(starToLow)+' points. That imbalance is a better clue than a vague complaint about effort.';
   }
  }
  if(own===0&&players.every(x=>Number(x.points)===0)){
   const hot=section(a,'hot-seat'),cool=section(a,'cool-throne');
   if(hot)hot.paragraphs=[tn(t)+' recorded zero across the verified starting lineup. That is a collective scoring problem rather than one convenient player to blame.'];
   if(cool)cool.paragraphs=['No starter scored a positive point for '+tn(t)+'. No player warrants a performance honor in this game.'];
   const lead=section(a,'lede');
   if(lead?.paragraphs?.length)lead.paragraphs[0]=tn(t)+' scored '+f(own)+' while '+tn(foe||{team_name:t.opponent_name})+' scored '+f(other)+'. The verified starter scores were all zero.';
  }
  if(own>0){
   const hot=section(a,'hot-seat'),cool=section(a,'cool-throne');
   const won=own>=other;
   if(hot)hot.paragraphs=[nm(weak)+' finished on '+f(weak.points)+' at '+String(weak.position||'a starting position')+'. '+(won?'The win got away with it; the next opponent might not.':'The loss made that quiet role rather more visible than management would prefer.')];
   if(cool)cool.paragraphs=[nm(star)+' recorded '+f(star.points)+' and led the verified starters. '+(won?'A useful performance, although even the best score needs help to produce a win.':'A good box score in a loss is still good work. It is not a win, however convenient that would be.')];
  }
  if(own>0){
   if(lede?.paragraphs?.length>=3){
    const trio=scorers(t).slice(0,3).reduce((sum,p)=>sum+Number(p.points),0);
    const others=own-trio;
    lede.paragraphs[1]=(trio>=own*.7
      ?tn(t)+' depended on its leading trio for '+f(trio)+' of '+f(own)+' points. Everyone outside that group supplied '+f(others)+'. One rather hopes the remaining starters were not charging appearance fees.'
      :nm(star)+' did the loud work with '+f(star.points)+', while the top three combined for '+f(trio)+'. The other starting roles supplied '+f(others)+'. That '+f(gap)+'-point '+(own>=other?'win':'loss')+' belongs to a lineup, not a highlight clip.');
   }
   if(features?.paragraphs?.length>=2){
    const count=short.length,low=Number(weak.points);
    features.paragraphs[1]=count>=3
      ?nm(weak)+' managed '+f(low)+' in '+String(weak.position||'a starter role')+'. '+tn(t)+' also had '+(count-1)+' other starters below five points. That is a collection of holes, not an isolated bad bounce.'
      :low<=0
       ?nm(weak)+' contributed zero in '+String(weak.position||'a starter role')+'. '+(own>=other?'The team won anyway; the next opponent need not be so accommodating.':'That empty return narrowed the margin for everyone who did contribute.')
       :nm(weak)+' managed '+f(low)+' in '+String(weak.position||'a starter role')+'. '+(own>=other?'Enough for the result, perhaps; hardly the reason the team won.':'That return matters when the final deficit was '+f(gap)+'.');
   }
  }
  const outlook=section(a,'outlook');
  if(outlook?.paragraphs?.length>=2){
   const opponent=String(t.next_opponent_name||'an opponent not yet established');
   const role=String(weak.position||'starter');
   outlook.paragraphs[1]=nm(weak)+' leaves Week '+week+' with '+f(weak.points)+' at '+role+'. '+tn(t)+' will face '+opponent+' next; the lineup decision in that role needs a genuine alternative, not a promise that Sunday will simply be kinder.';
  }
  const management=section(a,'management');
  if(management?.paragraphs?.length>=2){
   const voice=String(a.reporter?.id||'walter-mercer'),count=short.length;
   const remarks={
    'walter-mercer':nm(star)+' scored '+f(star.points)+'; '+nm(weak)+' scored '+f(weak.points)+'. The scorebook records both figures, however long the manager would prefer to discuss the first.',
    'tess-delaney':nm(star)+' provided '+f(star.points)+' and '+nm(weak)+' brought '+f(weak.points)+'. One can applaud the first performance without pretending the second was an elegant accessory.',
    'mack-hollis':nm(star)+' posted '+f(star.points)+'. '+nm(weak)+' managed '+f(weak.points)+'. THAT is the discrepancy to address, not a motivational speech.',
    'nora-voss':nm(weak)+' supplied '+f(weak.points)+' opposite '+f(star.points)+' from '+nm(star)+'. A rival has little reason to fear the quieter spot until the manager fixes it.'
   };
   management.paragraphs[1]=(remarks[voice]||remarks['walter-mercer'])+' '+(count>=3?count+' of '+players.length+' verified starters scored below five; the weakness extends beyond one player.':'The next decision has to concern real starting roles, not a convenient retelling of the final score.');
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
  a.insight_copy_edit=1;
 }
 const recap=edition.league_overview;
 const blocks=recap?.sections?.[0]?.blocks||[];
 const lead=blocks.find(b=>b.kind==='lead');
 if(lead&&lead.paragraphs?.length>=3){
  const sorted=(edition.teams||[]).filter(t=>good(t.points)).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const high=sorted[0],low=sorted.at(-1);
  if(high&&low){
   const highTop=scorers(high)[0];
   const context=high?.inquirer_article?.facts?.league_context||{};
   const place=good(context.standings_rank)?'#'+context.standings_rank:'somewhere below first';
   lead.paragraphs[2]=tn(high)+' topped the Week '+week+' scoring chart behind '+nm(highTop)+' ('+f(highTop?.points||0)+'), but its '+f(high.points)+' points buy exactly one win. At '+place+' in the standings with '+(context.record?context.record.wins+'-'+context.record.losses:'a record not independently confirmed')+', there is rather more to the season than a weekly fireworks display.';
  }
 }
 if(recap?.sections?.[0]?.blocks?.length){
  recap.sections[0].paragraphs=blocks.flatMap(b=>b.paragraphs||[]);
  recap.paragraphs=(recap.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
 }
 return edition;
}
