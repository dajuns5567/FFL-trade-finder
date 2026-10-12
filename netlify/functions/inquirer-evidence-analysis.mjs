// Fact-first edition analysis: replaces replaceable motivational copy with a
// concrete diagnosis of how completed fantasy matchups were actually decided.
// Applies ONLY to editable Week 4+ material; Weeks 1-3 stay frozen.
// Never infers injuries, transactions, lineup eligibility or future results.
const has=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const num=x=>Number(x);
const fmt=x=>num(x).toFixed(1);
const word=x=>String(x||'').trim();
const starters=t=>(t?.starter_details||[]).filter(p=>word(p.name)&&has(p.points)).slice().sort((a,b)=>num(b.points)-num(a.points));
const name=t=>word(t?.team_name)||'The team';
const player=p=>word(p?.name)||'an unnamed starter';
const matchup=t=>has(t.points)&&has(t.opponent_points);
const list=a=>a.filter(Boolean);
const voices={
 'walter-mercer':{
  gap:'There is no need to invent a coaching scandal when the score sheet tells us which starting spots failed to contribute.',
  narrow:'This is precisely the kind of result where a verified eligible bench swap belongs in the discussion, not a retrospective guess.',
  spread:'Good teams survive a star having an ordinary day; that is why the supporting scores belong in the headline.',
  blowout:'The deficit was a lineup-wide problem, not a one-snap morality play.'
 },
 'tess-delaney':{
  gap:'A glamorous first name on the team sheet does not accessorize an empty second or third scoring option.',
  narrow:'A narrow finish makes an actual eligible bench alternative much more interesting than the manager’s preferred postgame explanation.',
  spread:'The supporting cast has earned billing; without those scores this performance would have been a one-person show.',
  blowout:'That is far too much ground to cover by rearranging one decorative piece of the lineup.'
 },
 'mack-hollis':{
  gap:'THE TOP SCORER DID HIS JOB. The rest of that box score needs to explain itself.',
  narrow:'Show me an eligible bench upgrade with a real point total. Otherwise the Monday-morning lineup genius can sit down.',
  spread:'THAT IS DEPTH. Not a roster graphic. Actual starters putting up actual points.',
  blowout:'STOP BLAMING ONE BUTTON CLICK. That was an entire lineup getting outscored.'
 },
 'nora-voss':{
  gap:'Rivals have a scouting report now: take away the headline scorer and make the supporting positions beat you.',
  narrow:'Opponents know the margin was small enough to turn on one verifiable lineup decision.',
  spread:'An opponent cannot focus on one player when the next two names are producing alongside him.',
  blowout:'Rivals will treat that gap as evidence of a structural scoring problem until the supporting starters answer it.'
 }
};
const voice=t=>voices[word(t?.inquirer_article?.reporter?.id)]||voices['walter-mercer'];
function teamAnalysis(t,by,week){
 const a=t.inquirer_article;if(!a||!matchup(t))return;
 const own=starters(t),opp=by.get(String(t.opponent_roster_id||'')),theirs=starters(opp);
 if(own.length<3)return;
 const total=num(t.points),against=num(t.opponent_points),diff=total-against,top=own[0],two=own[1],three=own[2],last=own.at(-1);
 const topThree=own.slice(0,3).reduce((s,p)=>s+num(p.points),0);
 const remaining=total-topThree,share=total>0?topThree/total:0;
 const opponentTop=theirs[0],opponentThree=theirs.slice(0,3).reduce((s,p)=>s+num(p.points),0);
 const gap=Math.abs(diff),win=diff>=0,v=voice(t),opponent=name(opp||{team_name:t.opponent_name});
 const countUnder=own.filter(p=>num(p.points)<5).length;
 const who=player(top),support=player(two),third=player(three);
 const lead=list([
   name(t)+' '+(win?'beat ':'lost to ')+opponent+' '+fmt(total)+'–'+fmt(against)+' in Week '+week+'. '+who+' led its starters with '+fmt(top.points)+', but the more revealing number is the '+fmt(topThree)+' points supplied by its three highest scorers.',
   share>=.65
     ?name(t)+' relied on those three for '+fmt(share*100)+'% of the team total. The other starters combined for just '+fmt(remaining)+'. '+v.gap
     :name(t)+' got '+fmt(share*100)+'% of the total from its three leaders, leaving '+fmt(remaining)+' points from the other starting positions. '+v.spread,
   opponentTop
     ?player(opponentTop)+' paced '+opponent+' with '+fmt(opponentTop.points)+'. '+(theirs.length>=3?'Its three biggest starter scores totaled '+fmt(opponentThree)+', '+fmt(Math.abs(topThree-opponentThree))+' '+(topThree>=opponentThree?'fewer than '+name(t)+' received from its top three.':'more than '+name(t)+' received from its top three.'):'The remaining opposing starter detail is incomplete.')
     :null
 ]);
 const players=list([
   who+' ('+word(top.position||'starter')+') scored '+fmt(top.points)+'; '+support+' ('+word(two.position||'starter')+') delivered '+fmt(two.points)+'; '+third+' ('+word(three.position||'starter')+') added '+fmt(three.points)+'. Their combined '+fmt(topThree)+' explains how much of the game was carried by identifiable starters, not a vague claim about effort.',
   countUnder
     ?name(t)+' had '+countUnder+' of '+own.length+' verified starters finish below five points. '+player(last)+' had '+fmt(last.points)+' in '+word(last.position||'a starting position')+'. '+(win?'The win concealed that weak point on the standings page; it did not erase the lack of production.':'That lack of production is a specific part of the loss, rather than a reason to blame every starter.')
     :name(t)+' had every individually verified starter reach at least five points. '+(win?'The breadth of those contributions is part of why the roster won.':'The loss therefore deserves more attention to the opponent’s production than to a fabricated collapse by one player.')
 ]);
 const miss=t.best_lineup_miss||a.facts?.best_lineup_miss;
 const reserve=miss?.reserve||miss?.bench,started=miss?.starter;
 const legal=reserve?.name&&started?.name&&has(miss?.gap)&&num(miss.gap)>0;
 const management=list([
   legal
     ?player(reserve)+' outscored starter '+player(started)+' by '+fmt(miss.gap)+' points in a documented eligible lineup alternative. '+(gap<num(miss.gap)?'That available improvement exceeded the '+fmt(gap)+'-point final margin; it could have changed the result, assuming the other scores remained fixed.':'It would not by itself erase a '+fmt(gap)+'-point gap; the rest of the roster also needed to produce.')
     :gap<=8
       ?name(t)+' finished '+fmt(gap)+' points '+(win?'ahead':'behind')+'. That is close enough for a small eligible lineup change to matter, but this edition does not verify a specific legal alternative; a blame assignment would be invented.'
       :name(t)+' faced a '+fmt(gap)+'-point final margin. '+v.blowout,
   name(t)+' received '+fmt(topThree)+' of its '+fmt(total)+' points from three starters, versus '+fmt(remaining)+' from the rest. '+(share>=.65?'The next lineup needs another usable scorer behind '+who+' and '+support+'.':'Keeping '+who+', '+support+' and '+third+' productive gives the manager several ways to counter an opponent.'),
   name(t)+': '+(legal?v.narrow:(share>=.65?v.gap:v.spread))
 ]);
 const next=word(t.next_opponent_name),upcoming=next?'Week '+(week+1)+' against '+next:'the next verified matchup';
 const outlook=list([
   name(t)+' goes into '+upcoming+' after '+who+' delivered '+fmt(top.points)+' and '+support+' followed with '+fmt(two.points)+'. '+(share>=.65?'The first improvement to look for is a third or fourth meaningful contribution beyond those leaders.':'The manager already has more than one productive starter to build around.'),
   last&&num(last.points)<5?player(last)+' produced just '+fmt(last.points)+' at '+word(last.position||'his starting spot')+'. Before the next lineup lock, the choice is whether that role and its eligible alternatives justify another start; the previous result alone does not establish a replacement.':name(t)+' had its weakest individually recorded starter at '+fmt(last.points)+' points from '+player(last)+'. Matching the top of this lineup is not the only task; retaining enough useful scoring at the bottom is what turns one good week into another.'
 ]);
 a.headline=share>=.65
  ?name(t)+': '+fmt(topThree)+' of '+fmt(total)+' Points Came From Three Starters Against '+opponent
  :countUnder>=3
    ?name(t)+': '+countUnder+' Quiet Starters Define the '+fmt(total)+'-Point '+(win?'Win':'Loss')
    :name(t)+' '+(win?'Edges ':'Falls to ')+opponent+' by '+fmt(gap)+' as '+who+' Leads the Scoring';
 const lede=(a.sections||[]).find(s=>s.kind==='lede');
 const people=(a.sections||[]).find(s=>s.kind==='players');
 const manager=(a.sections||[]).find(s=>s.kind==='management');
 const nextSection=(a.sections||[]).find(s=>s.kind==='outlook');
 // Replace only these sections: other independently reported story sections,
 // rankings, awards and all underlying football facts remain untouched.
 if(lede)lede.paragraphs=lead;
 if(people)people.paragraphs=players;
 if(manager)manager.paragraphs=management;
 if(nextSection)nextSection.paragraphs=outlook;
 a.paragraphs=(a.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
 a.fact_driven_analysis=true;
}
function recapAnalysis(edition){
 const teams=(edition.teams||[]).filter(matchup),o=edition.league_overview;
 if(!o||!teams.length)return;
 const by=new Map(teams.map(t=>[String(t.roster_id),t])),games=[],used=new Set();
 for(const t of teams){
  const opp=by.get(String(t.opponent_roster_id||''));
  if(!opp)continue;
  const k=[String(t.roster_id),String(opp.roster_id)].sort().join(':');
  if(used.has(k))continue;used.add(k);
  const winner=num(t.points)>=num(opp.points)?t:opp,loser=winner===t?opp:t;
  games.push({winner,loser,gap:Math.abs(num(t.points)-num(opp.points)),total:num(t.points)+num(opp.points)});
 }
 if(!games.length)return;
 const close=games.slice().sort((a,b)=>a.gap-b.gap)[0];
 const wide=games.slice().sort((a,b)=>b.gap-a.gap)[0];
 const scoring=teams.slice().sort((a,b)=>num(b.points)-num(a.points));
 const best=scoring[0],lowest=scoring.at(-1);
 const allStarters=teams.flatMap(t=>starters(t).map(p=>({t,p}))).sort((a,b)=>num(b.p.points)-num(a.p.points));
 const hero=allStarters[0],second=allStarters.find(x=>String(x.t.roster_id)!==String(hero?.t?.roster_id));
 const topThree=t=>starters(t).slice(0,3).reduce((sum,p)=>sum+num(p.points),0);
 const week=Number(edition.week),blocks=(o.sections||[])[0]?.blocks||[];
 const lead=list([
   'Week '+week+' did not have one universal story: '+name(close.winner)+' survived '+name(close.loser)+' by '+fmt(close.gap)+' points, while '+name(wide.winner)+' put '+fmt(wide.gap)+' between itself and '+name(wide.loser)+'. The league had both a lineup-decision game and a mismatch in the same slate.',
   name(best)+' led all '+teams.length+' teams with '+fmt(best.points)+' points. Its three leading starters produced '+fmt(topThree(best))+'. '+name(lowest)+' finished at '+fmt(lowest.points)+'; that is a '+fmt(num(best.points)-num(lowest.points))+'-point difference in total team scoring, not just a contrast in star power.'
 ]);
 const players=list([
   hero?player(hero.p)+' scored '+fmt(hero.p.points)+' for '+name(hero.t)+', the highest individually recorded starter total in these completed games. That was '+fmt(num(hero.p.points)/num(hero.t.points)*100)+'% of '+name(hero.t)+'’s full score.':null,
   second?player(second.p)+' supplied '+fmt(second.p.points)+' for '+name(second.t)+'. The comparison matters because individual explosions and team wins are not interchangeable; the supporting starters determine how far that performance goes.':null,
   'For the weekly scoring leader '+name(best)+', the three highest individual scores totaled '+fmt(topThree(best))+' and the rest of the team contributed '+fmt(num(best.points)-topThree(best))+'. That split is a better measure of depth than counting marquee names on a roster.'
 ]);
 const decisions=list([
   'The closest matchup was '+name(close.winner)+' '+fmt(close.winner.points)+', '+name(close.loser)+' '+fmt(close.loser.points)+'. A '+fmt(close.gap)+'-point margin invites an audit of genuine eligible bench alternatives, but those alternatives must be verified before anyone declares a bad start/sit decision.',
   'The widest gap belonged to '+name(wide.winner)+' over '+name(wide.loser)+', '+fmt(wide.winner.points)+'–'+fmt(wide.loser.points)+'. Even a well-chosen replacement would have to be measured against '+fmt(wide.gap)+' points; generic coaching blame is not enough to account for that difference.'
 ]);
 const set=(kind,rows)=>{const b=blocks.find(x=>x.kind===kind);if(b)b.paragraphs=rows};
 set('lead',lead);set('players',players);set('decisions',decisions);
 if((o.sections||[])[0]?.blocks?.length)(o.sections[0]).paragraphs=o.sections[0].blocks.flatMap(b=>b.paragraphs||[]);
 o.paragraphs=(o.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])]);
 o.fact_driven_analysis=true;
}
export function upgradeInquirerAnalysis(edition,{week=Number(edition?.week)}={}){
 if(!edition||Number(week)<4||!Array.isArray(edition.teams))return edition;
 const by=new Map(edition.teams.map(t=>[String(t.roster_id),t]));
 for(const t of edition.teams)teamAnalysis(t,by,Number(week));
 recapAnalysis(edition);
 return edition;
}
