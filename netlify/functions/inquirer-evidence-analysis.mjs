import {finalizeInquirerNarrative} from './inquirer-narrative-final.mjs';
import {addInquirerCharacter} from './inquirer-editorial-character.mjs';
import {polishInquirerStories} from './inquirer-story-polish.mjs';
import {addInquirerColumns} from './inquirer-editorial-column.mjs';
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
 const total=num(t.points),against=num(t.opponent_points),diff=total-against,gap=Math.abs(diff),win=diff>=0;
 const [top,two,three]=own,last=own.at(-1),topThree=own.slice(0,3).reduce((sum,p)=>sum+num(p.points),0);
 const remaining=total-topThree,share=total>0?topThree/total:0;
 const who=player(top),support=player(two),third=player(three),low=player(last);
 const rival=opp?name(opp):word(t.opponent_name)||'its opponent';
 const rivalStar=theirs[0],rivalThree=theirs.slice(0,3).reduce((sum,p)=>sum+num(p.points),0);
 const countUnder=own.filter(p=>num(p.points)<5).length;
 const reporter=word(a.reporter?.id),next=word(t.next_opponent_name)||'an opponent yet to be verified';
 const led=gap<8?'a decision-level finish':gap>35?'a wide scoring gap':'a margin that reflected several starter contributions';
 const lede=list([
  name(t)+' '+(win?'defeated ':'lost to ')+rival+' '+fmt(total)+'–'+fmt(against)+' in Week '+week+', '+led+'. '+who+' scored '+fmt(top.points)+' from '+word(top.position||'a starting slot')+', establishing the biggest individual contribution to this side of the scoreboard.',
  'Behind '+who+' and '+support+', the third-leading starter '+third+' supplied '+fmt(three.points)+'. For '+name(t)+', the highest three starters accounted for '+fmt(topThree)+' points ('+fmt(share*100)+'%); all other starting positions together were responsible for '+fmt(remaining)+'.',
  rivalStar?player(rivalStar)+' led '+rival+' with '+fmt(rivalStar.points)+'. '+rival+' drew '+fmt(rivalThree)+' from its three highest-scoring starters, '+fmt(Math.abs(topThree-rivalThree))+' '+(topThree>=rivalThree?'fewer than ':'more than ')+name(t)+' got from the same three-slot comparison.':null
 ]);
 const players=list([
  who+' finished at '+fmt(top.points)+'; '+support+' delivered '+fmt(two.points)+'; '+third+' posted '+fmt(three.points)+'. Within '+name(t)+'’s lineup, those three added '+fmt(topThree)+' points '+(share>=.65?'left a heavy burden on the remaining starting spots.':'made this a multi-starter effort rather than a one-player rescue.'),
  low+' was the lowest individually scored starter at '+fmt(last.points)+' in '+word(last.position||'the lineup')+'. Across '+name(t)+'’s starters, '+countUnder+' of '+own.length+' verified starters scored fewer than five points; '+(win?'the win survived those shortfalls, which still warrant attention.':'those shortfalls explain some of the deficit without erasing the contributions above them.')
 ]);
 const miss=t.best_lineup_miss||a.facts?.best_lineup_miss,reserve=miss?.reserve||miss?.bench,started=miss?.starter;
 const legal=reserve?.name&&started?.name&&has(miss?.gap)&&num(miss.gap)>0;
 const decision=legal
  ?player(reserve)+' outscored the selected '+player(started)+' by '+fmt(miss.gap)+' in a documented eligible alternative. '+(win?'On '+name(t)+'’s bench, that was an opportunity to extend an existing lead.':gap<num(miss.gap)?'On '+name(t)+'’s bench, the '+fmt(miss.gap)+'-point improvement exceeded the '+fmt(gap)+'-point deficit and could have reversed the result if all other scores held.':'On '+name(t)+'’s bench, the available '+fmt(miss.gap)+' points were insufficient by themselves to overcome a '+fmt(gap)+'-point defeat.')
  :'Against '+rival+', the '+fmt(gap)+'-point '+(win?'victory':'defeat')+' does not establish a bench mistake by itself. '+who+' produced '+fmt(top.points)+', but the edition does not document an eligible replacement that can responsibly be blamed or credited.';
 const angle=reporter==='mack-hollis'
  ?low+' finished on '+fmt(last.points)+'. For '+name(t)+', THAT is the starting spot to review before promising a different Week '+(week+1)+' outcome.'
  :reporter==='tess-delaney'
   ?support+' brought '+fmt(two.points)+' as the supporting act, while '+low+' managed '+fmt(last.points)+'. For '+name(t)+', the headline scorer cannot conceal that imbalance.'
   :reporter==='nora-voss'
    ?rival+' saw '+low+' finish with '+fmt(last.points)+'. For '+name(t)+', that quiet position is the obvious item for next week’s opponents to examine.'
    :low+' recorded '+fmt(last.points)+'; '+who+' delivered '+fmt(top.points)+'. For '+name(t)+', a repeatable fix begins with the '+fmt(Math.abs(num(top.points)-num(last.points)))+'-point difference between its strongest and quietest starters.';
 const management=[
  decision,
  'Beyond '+who+' and '+support+', the rest of '+name(t)+' earned '+fmt(total-num(top.points)-num(two.points))+' points. '+angle
 ];
 const outlook=list([
  name(t)+' next prepares for '+next+' after a '+fmt(total)+'-point Week '+week+'. After '+who+' put up '+fmt(top.points)+', the issue is whether '+support+' and '+third+' can remain useful when the next opposing lineup arrives.',
  low+' carries a '+fmt(last.points)+'-point result into the next selection decision. '+(legal?'With '+player(reserve)+' available, this manager can compare actual eligible alternatives instead of inventing a transaction.':'Inside '+name(t)+'’s roster, the '+fmt(gap)+'-point margin does not reveal a legal replacement; the next starting decision still needs an actual role comparison.')
 ]);
 a.headline=share>=.65
  ?name(t)+': Three Starters Supplied '+fmt(topThree)+' of '+fmt(total)+' Points Against '+rival
  :countUnder>=3
    ?name(t)+': '+countUnder+' Quiet Starters Define the '+fmt(total)+'-Point '+(win?'Win':'Loss')
    :name(t)+' '+(win?'Defeats ':'Falls to ')+rival+' by '+fmt(gap)+' as '+who+' Sets the Pace';
 const replace=(kind,rows)=>{const section=(a.sections||[]).find(x=>x.kind===kind);if(section)section.paragraphs=rows};
 replace('lede',lede);replace('players',players);replace('management',management);replace('outlook',outlook);
 a.paragraphs=(a.sections||[]).flatMap(section=>[...(section.paragraphs||[]),...(section.blocks||[]).flatMap(b=>b.paragraphs||[])]);
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
   hero?player(hero.p)+' scored '+fmt(hero.p.points)+' for '+name(hero.t)+', the highest individually recorded starter total in these completed games. That was '+(num(hero.t.points)>0?fmt(num(hero.p.points)/num(hero.t.points)*100)+'% of ':'part of ')+name(hero.t)+'’s full score.':null,
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
 addInquirerCharacter(edition,{week});
 polishInquirerStories(edition,{week});
 addInquirerColumns(edition,{week});
 finalizeInquirerNarrative(edition,{week});
 return edition;
}
