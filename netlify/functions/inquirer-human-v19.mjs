'use strict';

const one=v=>Number(v||0).toFixed(1);
const ordinal=n=>{const x=Math.abs(Number(n)||0),m100=x%100,m10=x%10;return String(x)+(m100>=11&&m100<=13?'th':m10===1?'st':m10===2?'nd':m10===3?'rd':'th')};
const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(rows,seed)=>rows[Math.abs(Number(seed)||0)%rows.length];
const voiceId=r=>r?.id==='walter-mercer'?'nick':r?.id==='tess-delaney'?'bart':r?.id==='mack-hollis'?'tilly':'jeff';
const articleVariant=(t,w)=>{const n=Number(t?.roster_id);return Number.isFinite(n)&&n>0?(Math.floor((n-1)/4)+Math.max(0,Number(w||1)-1))%8:hash(String(t?.roster_id||t?.team_name)+'|'+w)%8};

function playerCore(p,detail=true){
 if(!p)return'';
 const fp=Number.isFinite(Number(p.points))?one(p.points)+' fantasy points':'a quiet fantasy line';
 const real=detail?String(p.real_stat_line||'').trim().replaceAll(' • ',', '):'';
 return real?fp+', backed by '+real:fp;
}
function topPlayerSentence(p,voice,v){
 if(!p)return'Nobody on the starting card made a clean claim to the headline, which is usually how the editor starts looking for aspirin.';
 const c=playerCore(p,true),name=p.name;
 const rows={
  nick:[
   name+' earned the first line in my notebook: '+c+'. No flourish needed; that is just a football player doing useful work.',
   'Start with '+name+'. He gave us '+c+', which is the sort of thing that makes an old press-box cynic briefly stop complaining about parking.',
   name+' did his part and then some: '+c+'. I have seen Sundays survive on less.',
   'The clipping starts with '+name+' and '+c+'. Put a star beside it and resist the urge to make it a personality trait after one week.',
   name+' was the grown-up in the room with '+c+'. Every lineup needs at least one adult when the afternoon gets weird.',
   'If you are saving one line from this game, save '+name+': '+c+'. The rest of the notebook can fight for second place.',
   name+' gave the desk something pleasant to type for once: '+c+'. I am choosing to enjoy this without asking what could possibly go wrong.',
   'There is a reason '+name+' gets the big paragraph: '+c+'. That is production you can build a Sunday around.'
  ],
  bart:[
   name+' was magnificent, which is irritating because it ruins the complaint I had prepared: '+c+'. I will recover.',
   'I had several clever criticisms ready, and then '+name+' produced '+c+'. Very inconsiderate of him, frankly.',
   name+' walked into the column and stole it with '+c+'. One does admire a player who saves the writer from inventing drama.',
   'The most elegant thing on the page belonged to '+name+': '+c+'. I would call it tasteful if fantasy football had any taste.',
   name+' gave us '+c+'. I am tempted to call it art, but the league chat has already suffered enough pretension from me.',
   'Please allow '+name+' his flowers before someone in this league trades three picks for the memory of this game: '+c+'.',
   name+' supplied '+c+', and for one blessed paragraph I have nothing sarcastic to add. I resent this deeply.',
   'The headline found '+name+' before I did: '+c+'. Fine. Sometimes the obvious story is obvious because it is good.'
  ],
  tilly:[
   name+' gets the giant photo, the expensive ink and probably a completely unauthorized billboard after '+c+'.',
   'Put a frame around '+name+' — figuratively, legal department — because '+c+' just paid for the front page.',
   name+' brought '+c+'. I have already moved the headline font from “reasonable” to “neighbors can read it.”',
   name+' just dropped '+c+' on the newsroom desk. Somebody clear tomorrow’s front page and hide the adult supervision.',
   'The giant photo belongs to '+name+' after '+c+'. We are accepting no appeals and very little dignity.',
   name+' gave us '+c+', which is how perfectly normal newspapers end up pricing confetti by the pallet.',
   'If '+name+' wants the front page, '+c+' is a persuasive application. Approved immediately and with poor judgment.',
   name+' delivered '+c+'. I have informed the copy desk that subtlety is cancelled until Tuesday.'
  ],
  jeff:[
   'Exhibit A is '+name+': '+c+'. The evidence is annoyingly straightforward, which ruins several excellent conspiracy theories.',
   name+' left fingerprints all over the result with '+c+'. For once, the fingerprints are helping the defense.',
   'The cleanest evidence in the file belongs to '+name+': '+c+'. I checked twice because optimism makes me suspicious.',
   name+' enters the record with '+c+'. No anonymous source needed; the box score is willing to testify.',
   'I would like to question '+name+' about '+c+', mostly to learn why the rest of the lineup cannot simply do that too.',
   'The file has one very cooperative witness: '+name+', who supplied '+c+'. I recommend the others review the transcript.',
   name+' gave us '+c+'. That is what investigators call corroboration and fans call “finally, somebody showed up.”',
   'Circle '+name+' in red: '+c+'. The case gets much easier when your best witness refuses to be subtle.'
  ]
 };
 return pick(rows[voice],v);
}
function supportSentence(p,voice,v){
 if(!p)return'';
 const c=playerCore(p,false),name=p.name;
 const rows={
  nick:[name+' was right there behind him with '+c+'.',name+' kept the lineup from turning into a one-man rescue mission with '+c+'.',name+' chipped in '+c+', which matters more than it sounds in a league this deep.',name+' gave the middle of the card some backbone with '+c+'.'],
  bart:[name+' added '+c+', an extremely civilized contribution.',name+' followed with '+c+', which I will accept without requiring a sonnet.',name+' contributed '+c+'. Not everything needs to be transcendent; sometimes useful is beautiful.',name+' brought '+c+', and I am willing to call that respectable in public.'],
  tilly:[name+' also showed up with '+c+'. Yes, there are two photos on the front page now.',name+' added '+c+', so the rest of the lineup may keep its parking privileges.',name+' brought '+c+'. The back page acknowledges depth when it is forced to.',name+' chipped in '+c+'. Nobody tell him the headline was already assigned.'],
  jeff:[name+' corroborated the story with '+c+'.',name+' added '+c+', enough to stay off the witness list for now.',name+' supplied '+c+'. Consider that cooperative testimony.',name+' backed the lead witness with '+c+'. The file appreciates teamwork.']
 };
 return pick(rows[voice],v+1);
}
function lowSentence(p,voice,v){
 if(!p)return'';
 const c=playerCore(p,false),name=p.name;
 const rows={
  nick:[name+' finished with '+c+'. I am not mailing a complaint yet, but I did find the envelope.',name+' gave us '+c+'. One bad Sunday is weather; two starts becoming climate.',name+' ended at '+c+'. Put it in the notebook, not on the wanted poster.',name+' managed '+c+'. We will call it forgettable and grant him the chance to make that description temporary.'],
  bart:[name+' finished with '+c+'. It lacked a certain… everything.',name+' gave us '+c+'. I have had appetizers with more staying power.',name+' landed at '+c+'. Not a tragedy, merely the sort of performance that makes one sigh theatrically.',name+' produced '+c+'. I refuse to call it disastrous because I am saving that adjective for a worse occasion.'],
  tilly:[name+' gets the tiny photo by the classifieds after '+c+'. Redemption applications reopen next Sunday.',name+' brought '+c+'. The angry font is warming up but has not yet cleared legal.',name+' finished with '+c+'. We are not booing; we are simply making sustained disappointed noises.',name+' gave us '+c+'. The back page has placed a very small question mark over his locker.'],
  jeff:[name+' contributed '+c+'. Not a conviction, but certainly enough for a follow-up interview.',name+' finished with '+c+'. The file remains open and the coffee remains terrible.',name+' gave us '+c+'. One weak exhibit is survivable; a pattern is where paperwork gets expensive.',name+' landed at '+c+'. No charges today, but I am keeping the folder on my desk.']
 };
 return pick(rows[voice],v+2);
}
function trendSentence(p,voice,v){
 const f=p?.recent_form;if(!f||f.games<3||!['hot','cold'].includes(f.label))return'';
 const up=f.label==='hot',last=one(f.last3_avg),prior=one(f.prior3_avg),name=p.name;
 if(up){
  const rows=[
   name+' has now pushed his three-game average to '+last+' after '+prior+' over the previous three. At some point a heater stops being a coincidence and starts demanding better snacks in the press box.',
   'This is not a one-Sunday fever dream either: '+name+' is at '+last+' per game over the last three, up from '+prior+'. I am officially interested.',
   name+' keeps doing this: '+last+' per game across the last three after '+prior+' before that. The “small sample” excuse is losing office space.',
   'The recent run has teeth. '+name+' is up to '+last+' per game over three weeks from '+prior+' in the prior stretch. I have begun allowing myself dangerous amounts of hope.'
  ];
  return pick(rows,v);
 }
 const rows=[
  name+' is down to '+last+' per game over the last three after '+prior+' before that. The slump has stayed long enough to get mail here.',
  'The uncomfortable part is the trend: '+name+' has slipped from '+prior+' per game to '+last+' over the last three. That is more than one bad afternoon asking for forgiveness.',
  name+' has cooled to '+last+' per game across the last three, down from '+prior+'. Somebody open a window or fix something.',
  'Three weeks is enough to circle it: '+name+' has moved from '+prior+' per game to '+last+'. I would prefer this sentence become obsolete immediately.'
 ];
 return pick(rows,v);
}
function recordSentence(t,w,voice,v){
 const c=t.league_context||{},r=c.record||{},rank=Number(c.standings_rank),size=Number(c.league_size)||32,record=String(r.wins||0)+'-'+String(r.losses||0)+(Number(r.ties)?'-'+String(r.ties):'');
 const standing=rank?', '+ordinal(rank)+' in a '+size+'-team league':'';
 const st=c.streak||{},streak=Number(st.length)>=2?' The '+(st.type==='W'?'winning':'losing')+' streak is '+st.length+' now.':'';
 const rows={
  nick:['That leaves '+t.team_name+' at '+record+standing+'. I have learned not to marry the standings in September, but I do write down the phone number.',t.team_name+' walks out of Week '+w+' at '+record+standing+'. The table is young; our blood pressure is not.',t.team_name+' sits at '+record+standing+' tonight. Put the clipping away, but do not throw it out.',t.team_name+' is '+record+standing+' after this one. The standings are not scripture, though fans have been known to treat them that way.'],
  bart:['So we arrive at '+record+standing+'. It is early enough for manners and late enough for opinions, my favorite combination.',t.team_name+' now sits '+record+standing+'. I will resist declaring an era, mostly because eras require better tailoring.',t.team_name+' currently lives at '+record+standing+'. It is not destiny; it is merely where the mail is being delivered.',t.team_name+' leaves the week '+record+standing+'. A modest fact, already being overinterpreted in several group chats.'],
  tilly:[t.team_name+' is '+record+standing+'. I have already seen parade maps and mock drafts in the same ten-minute span.',t.team_name+' is '+record+standing+'! That is either the beginning of a banner season or the first page of a future apology, and we will print both.',t.team_name+' wakes up '+record+standing+'. The city is reacting with its customary balance and restraint, meaning none at all.',t.team_name+' owns a '+record+standing+' line tonight. Somebody in the group chat has already made it their entire personality.'],
  jeff:[t.team_name+' is '+record+standing+'. The standings have been entered into evidence and immediately placed under surveillance.',t.team_name+' carries a '+record+standing+' file status. Nobody gets acquitted in Week '+w+', but nobody gets buried either.',t.team_name+' now sits '+record+standing+'. I note this because memory becomes suspiciously selective by November.',t.team_name+' enters the record at '+record+standing+' tonight. The standings do not lie; managers sometimes develop creative interpretations.']
 };
 return pick(rows[voice],v)+streak;
}
function opponentSentence(t,voice,v){
 const o=t.opponent_context||{},r=o.record||{},rank=Number(o.standings_rank),record=o.record?String(r.wins||0)+'-'+String(r.losses||0)+(Number(r.ties)?'-'+String(r.ties):''):'',name=t.opponent_name||'the opponent';
 if(!record)return'';
 const quality=rank&&rank<=8?'near the sharp end of the table':rank&&rank>=25?'down in the league basement':'somewhere in the crowded middle';
 const rows={
  nick:[name+' comes out of the same week '+record+(rank?', ranked '+ordinal(rank):'')+', '+quality+'. That matters when we decide how much of this Sunday to trust.',name+' is '+record+(rank?', '+ordinal(rank):'')+' after the dust settles. I mention it because opponents are people too, unfortunately.'],
  bart:[name+' sits '+record+(rank?', '+ordinal(rank):'')+' and '+quality+'. Context is not an excuse; it is simply good manners for an argument.',name+' leaves the week '+record+(rank?', ranked '+ordinal(rank):'')+'. One should know the quality of the dinner guest before reviewing the meal.'],
  tilly:[name+' is now '+record+(rank?', '+ordinal(rank):'')+'. Please forward all complaints about strength of schedule to somebody who cares less than I do.',name+' comes out '+record+(rank?', '+ordinal(rank):'')+'. Rivals may submit context in triplicate and wait six to eight business days.'],
  jeff:[name+' is '+record+(rank?', '+ordinal(rank):'')+' after this one. The opposing résumé is in the file because selective memory is how bad alibis begin.',name+' leaves the scene '+record+(rank?', ranked '+ordinal(rank):'')+'. I checked; they were, in fact, a real opponent.']
 };
 return pick(rows[voice],v+1);
}
function transactionStory(t,facts,voice,v){
 const tx=t.transactions||[],named=[];
 for(const move of tx){
  for(const id of move.adds||[])if(facts[String(id)])named.push({verb:'added',p:facts[String(id)]});
  for(const id of move.drops||[])if(facts[String(id)])named.push({verb:'cut',p:facts[String(id)]});
  if(named.length>=3)break;
 }
 if(!tx.length){
  const rows={
   nick:['The front office left the wire alone this week. Sometimes the best move is no move; sometimes that sentence becomes hilarious by Tuesday.','No waiver smoke from this front office. I will call it patience until events force a harsher noun.','Management kept its hands in its pockets. I admire restraint right up until somebody useful gets claimed elsewhere.','The transaction log stayed quiet. My notebook appreciates the rest; my suspicious side does not.'],
   bart:['Management declined to rearrange the furniture this week. Admirable restraint, or the calm before somebody discovers a waiver claim at 2 a.m.','The transaction page stayed quiet. I appreciate restraint almost as much as I enjoy mocking it when it fails.','No roster shopping this week. Either the room is beautifully furnished already or management has misplaced the catalogue.','The waiver wire received no visit from this front office. Such composure is either elegant or deeply suspicious.'],
   tilly:['The transaction wire was quiet. Suspiciously quiet. Somebody check whether the GM lost the password.','No roster churn this week. The back page is furious to report that management behaved like an adult.','Nobody mashed the add button. I had already cleared space for a transaction scandal, so this is personally inconvenient.','The waiver wire survived the week untouched. We send our condolences to the content department.'],
   jeff:['The transaction log offers no fingerprints this week. That is either clean work or an annoyingly empty evidence bag.','No movement on the wire. I have inspected the paper trail and found only paper.','Management left no waiver trail behind. Clean scene, no witnesses, very inconsiderate.','The transaction file stayed thin enough to slide under a locked door. I will keep looking.']
  };
  return pick(rows[voice],v);
 }
 const level=tx.length>=10?'high':tx.length>=5?'mid':'low';
 const activityRows={
  nick:{
   high:[t.manager_name+' practically moved into the waiver office this week.',t.manager_name+' kept the transaction desk lit long after sensible people went home.',t.manager_name+' treated the waiver wire like a second job, apparently with overtime.',t.manager_name+' spent enough time changing the roster that the transaction clerk now knows the coffee order.'],
   mid:[t.manager_name+' kept the waiver wire busy without quite requiring a forwarding address.',t.manager_name+' did some noticeable roster housekeeping this week.',t.manager_name+' made enough moves to keep the front-office phone warm.',t.manager_name+' was active on the wire, not frantic but certainly not asleep.'],
   low:[t.manager_name+' made a couple of deliberate roster edits.',t.manager_name+' made a small trip through the transaction wire.',t.manager_name+' changed the roster just enough to leave fingerprints.',t.manager_name+' made a few quiet moves and left the rest of the furniture alone.']
  },
  bart:{
   high:[t.manager_name+' went on a waiver-wire shopping spree that would alarm a tasteful accountant.',t.manager_name+' rearranged the roster with the enthusiasm of someone redecorating a house they do not own.',t.manager_name+' spent the week acquiring and discarding players like hors d’oeuvres at a nervous cocktail party.',t.manager_name+' treated the transaction page like an all-you-can-eat menu and showed admirable commitment to the bit.'],
   mid:[t.manager_name+' did enough roster shopping to make the receipt interesting.',t.manager_name+' rearranged several pieces of the roster furniture this week.',t.manager_name+' was busy enough on the wire to justify calling it curation rather than fidgeting.',t.manager_name+' made a respectable tour of the transaction market, tastefully or otherwise.'],
   low:[t.manager_name+' made a few selective roster edits and resisted turning it into performance art.',t.manager_name+' visited the wire briefly and escaped with dignity mostly intact.',t.manager_name+' adjusted the roster without knocking over the good china.',t.manager_name+' made a modest transaction cameo this week.']
  },
  tilly:{
   high:[t.manager_name+' attacked the waiver wire like the add button owed money.',t.manager_name+' spent the week turning roster churn into a contact sport.',t.manager_name+' made so many moves the transaction page should start charging rent.',t.manager_name+' treated the waiver wire like a late-night infomercial and apparently ordered everything.'],
   mid:[t.manager_name+' kept the transaction page busy enough to earn its own small headline.',t.manager_name+' did some serious roster stirring this week, because peace was never an option.',t.manager_name+' gave the add/drop button a healthy workout.',t.manager_name+' supplied the transaction desk with actual content, bless this irresponsible league.'],
   low:[t.manager_name+' made a few roster moves and mercifully stopped before we needed a flow chart.',t.manager_name+' tinkered with the roster just enough to keep the back page interested.',t.manager_name+' made a couple of moves, which is technically restraint around here.',t.manager_name+' dipped into the wire and escaped before it became a shopping montage.']
  },
  jeff:{
   high:[t.manager_name+' left fingerprints all over the transaction log this week.',t.manager_name+' generated enough waiver paperwork to require a second evidence box.',t.manager_name+' worked the wire so aggressively that the paper trail now has subfolders.',t.manager_name+' spent the week creating transactions faster than this desk could label the exhibits.'],
   mid:[t.manager_name+' left a healthy trail of roster paperwork behind.',t.manager_name+' made enough moves to keep the transaction file pleasantly thick.',t.manager_name+' gave the front-office file several new exhibits this week.',t.manager_name+' was active on the wire and considerate enough to leave receipts.'],
   low:[t.manager_name+' made a few roster edits and left a manageable paper trail.',t.manager_name+' touched the wire briefly; the evidence bag remains travel-sized.',t.manager_name+' made a small number of moves, each now filed whether management likes it or not.',t.manager_name+' added a little paperwork to the roster file this week.']
  }
 };
 let detail='';
 if(named[0]){
  const p=named[0].p.name,verb=named[0].verb;
  const rows={
   nick:[t.manager_name+' '+verb+' '+p+'. That is the move I circled first.',p+' was the clearest name in the shuffle; management '+verb+' him before Sunday.',p+' is the transaction worth remembering after '+t.manager_name+' '+verb+' him.',t.manager_name+' '+verb+' '+p+', the move most likely to survive into next week’s notebook.'],
   bart:[p+' was the most interesting piece: '+t.manager_name+' '+verb+' him, and I have chosen to have an opinion about it.',t.manager_name+' '+verb+' '+p+'. At least one transaction arrived dressed for dinner.',p+' gets top billing from the move list after '+t.manager_name+' '+verb+' him.',t.manager_name+' '+verb+' '+p+', a transaction with enough shape to deserve actual prose.'],
   tilly:[t.manager_name+' '+verb+' '+p+'. There is your transaction headline.',p+' gets the giant transaction arrow after '+t.manager_name+' '+verb+' him.',t.manager_name+' '+verb+' '+p+', and the back page immediately began overreacting.',p+' was the loudest name in the churn after '+t.manager_name+' '+verb+' him.'],
   jeff:[t.manager_name+' '+verb+' '+p+'. I marked that exhibit first.',p+' is the clearest transaction fingerprint after '+t.manager_name+' '+verb+' him.',t.manager_name+' '+verb+' '+p+', a fact now preserved in the paper trail.',p+' enters the transaction file after management '+verb+' him.']
  };
  detail+=' '+pick(rows[voice],v);
 }
 if(named[1]){
  const p=named[1].p.name;
  const rows={
   nick:[p+' was in the shuffle too.','Do not lose '+p+' in the fine print.','The week also moved through '+p+'.','And yes, '+p+' made the transaction notes as well.'],
   bart:[p+' also wandered through the transaction salon.','The roster choreography included '+p+' too.','Do spare a glance for '+p+', who was part of the rearrangement.','And '+p+' was involved, lest the supporting furniture feel ignored.'],
   tilly:[p+' got dragged into the chaos too.','Also in the transaction blender: '+p+'.','The churn reached '+p+' as well. Nobody was safe.','And '+p+' appears in the paperwork because apparently we needed one more name.'],
   jeff:[p+' appears elsewhere in the paper trail.','The file also contains '+p+'.','A second name worth noting: '+p+'.','The transaction evidence reaches '+p+' too.']
  };
  detail+=' '+pick(rows[voice],v+1);
 }
 const tails={
  nick:['Busy is not the same as clever, but at least nobody can accuse the office of sleeping through the week.','I like an active desk. I like a correct active desk even more. Sunday gets the final word.','Movement is easy; improving the roster is the trick. We will know more after the next whistle.','A transaction earns praise only when the football cooperates. I have learned this lesson against my will.'],
  bart:['Motion is not strategy, of course, but standing still is also a choice and usually a less entertaining one.','There is a thin line between curation and panic-shopping. We shall discover which side this was on.','Roster movement can be art, commerce or nervous furniture rearrangement. Sunday is the critic with the sharpest pen.','I applaud decisive shopping while reserving the right to mock the receipt later.'],
  tilly:['Either this is roster craftsmanship or somebody discovered the “add player” button and became drunk with power. I support the content either way.','The back page loves activity. Results, annoyingly, remain part of the grading rubric.','Transactions! Movement! Content! Now please make sure one of these people actually helps on Sunday.','I endorse roster chaos as journalism and demand competence as a fan. These positions are perfectly compatible.'],
  jeff:['Every transaction is a statement about what management believed before kickoff. I have saved the statements.','The paper trail is healthy. Whether it leads to genius or motive remains an open matter.','Moves made before Sunday are useful because hindsight cannot rewrite when they happened. The timestamps are preserved.','Management may explain the moves later. The transaction log has already given its deposition.']
 };
 return pick(activityRows[voice][level],v)+detail+' '+pick(tails[voice],v+2);
}
function lineupStory(t,voice,v){
 const m=t.best_lineup_miss;
 if(m?.reserve&&m?.starter&&Number(m.gap)>=5){
  const b=m.reserve,s=m.starter,slot=String(m.slot||s.lineup_slot||s.position||'lineup'),gap=one(m.gap);
  const leads={
   nick:[
    b.name+' could legally have occupied the '+slot+' seat held by '+s.name+', and the bench won that comparison by '+gap+'.',
    'Here is the fair second-guess: '+b.name+' was eligible at '+slot+', where '+s.name+' started, and finished '+gap+' points ahead.',
    'The lineup rules actually allow this complaint. '+b.name+' could have filled '+s.name+'’s '+slot+' slot and outscored him by '+gap+'.',
    'One bench gripe survives inspection: '+b.name+' was a legal '+slot+' alternative to '+s.name+' and produced '+gap+' more points.'
   ],
   bart:[
    'At last, a second-guess with proper credentials: '+b.name+' was eligible for '+s.name+'’s '+slot+' chair and outscored him by '+gap+'.',
    b.name+' could actually have taken the '+slot+' place occupied by '+s.name+', finishing '+gap+' points higher. This complaint is dressed appropriately.',
    'Unlike most Monday outrage, this one has manners: '+b.name+' was a legal '+slot+' option over '+s.name+' and won the scoring comparison by '+gap+'.',
    'The lineup card offers one legitimate critique. '+b.name+' qualified for the '+slot+' seat, '+s.name+' got it, and the bench finished '+gap+' points better.'
   ],
   tilly:[
    'Now we may yell: '+b.name+' was actually allowed in the '+slot+' chair occupied by '+s.name+', and the bench beat him by '+gap+'.',
    'Complaint department, open the window. '+b.name+' could legally have started at '+slot+' over '+s.name+' and scored '+gap+' more.',
    'This is a real bench scandal, not fantasy fan fiction: '+b.name+' was eligible for '+s.name+'’s '+slot+' spot and beat him by '+gap+'.',
    b.name+' had a legal path into the '+slot+' slot, '+s.name+' started instead, and '+gap+' points stayed on the wrong side of the lineup screen.'
   ],
   jeff:[
    'Admissible evidence: '+b.name+' qualified for the '+slot+' seat held by '+s.name+' and outscored him by '+gap+'.',
    'The lineup file contains one legal substitution question. '+b.name+' could have occupied '+s.name+'’s '+slot+' spot and finished '+gap+' points ahead.',
    b.name+' survives the eligibility check as a real '+slot+' alternative to '+s.name+', with a '+gap+'-point advantage left on the bench.',
    'One lineup discrepancy clears cross-examination: '+b.name+' was eligible at '+slot+', '+s.name+' started, and the difference was '+gap+'.'
   ]
  };
  const tails={
   nick:[' That one belongs in the notebook. Hindsight is cheap, but a legal lineup alternative is at least a fair question.',' I am not demanding a tribunal. I am merely leaving the clipping on the manager’s chair.',' This is the kind of Monday complaint I will entertain because the rules say the swap was real.',' Nobody needs to be fired over one choice. Somebody does need to remember it.'],
   bart:[' There is your legitimate second-guess, properly dressed and allowed through the front door.',' That is the kind of hindsight worth arguing about because the lineup rules actually permitted it. Revolutionary concept, I know.',' I dislike lazy hindsight; this is not lazy hindsight. It has documentation and everything.',' One may criticize a real alternative without descending into the usual Monday fantasy melodrama. How refreshing.'],
   tilly:[' This is a real lineup choice, not the usual “why didn’t the linebacker start at running back?” nonsense.',' The complaint department is officially open because, for once, the substitute was actually allowed to occupy the chair.',' Sound the tiny siren. We found a bench complaint that survives the rulebook.',' Now the angry font has jurisdiction. Please use it irresponsibly but accurately.'],
   jeff:[' That is admissible evidence: same legal seat, different result. I will not prosecute imaginary cross-position substitutions.',' This one survives cross-examination because the roster rules actually allowed the swap. Into the file it goes.',' Eligibility confirmed, scoring gap confirmed, hindsight complaint admitted. The court hates efficiency but appreciates facts.',' This is a real exhibit, not a hypothetical lineup crime invented after the score arrived.']
  };
  return pick(leads[voice],v)+pick(tails[voice],v+1);
 }
 const rows={
  nick:['I went looking for the obvious bench catastrophe and could not find a legal one. That is good news for management and terrible news for columnists.','The bench produced no clean, position-eligible “you should have started him” scandal. I am reluctantly closing that complaint window for the week.','I checked the bench for a real substitution grievance and came up empty. Sometimes the lineup card simply refuses to give a reporter a villain.','No eligible reserve produced a clean case against the starter in his actual seat. Management may enjoy this rare paperwork-free Monday.'],
  bart:['There is no honest lineup scandal here. A bench player scoring more than a starter does not matter if the rules would never let them trade seats; even fantasy outrage needs table manners.','I inspected the bench for a proper second-guess and found none that survived lineup eligibility. Tragic. I had a devastating paragraph ready.','The bench offered temptation but no legally interchangeable disaster. I refuse to compare chandeliers with soup spoons merely because both have numbers beside them.','No proper substitution complaint survives the seating chart. I had hoped for scandal and received administrative competence.'],
  tilly:['I tried to manufacture a bench scandal and the lineup rules ruined my fun. An IDP cannot simply wander over and steal an RB chair because he scored more.','No legal bench heist this week. The back page refuses to pretend a linebacker could have started at running back merely because the point total is shinier.','The bench has bigger numbers in places, but nobody gets to move an IDP into an RB seat by yelling loudly enough. Believe me, I checked.','I came hunting for lineup malpractice and the eligibility rules confiscated my pitchfork. Different positions still have to use different chairs.'],
  jeff:['The bench audit produced no admissible substitution complaint. Different positions are different positions; even this office has evidentiary standards.','No valid lineup swap clears the threshold. I will not charge management for failing to start a player in a seat he was never eligible to occupy.','The higher bench scores do not create a case unless those players could legally replace the starters in question. This file has no such exhibit.','I checked eligibility before filing charges. No bench player created a clean legal alternative worth prosecuting this week.']
 };
 return pick(rows[voice],v);
}
function valueStory(t,voice,v){
 const d=Number(t?.value_history_week?.delta);
 if(!Number.isFinite(d)){
  const rows={
   nick:['The market desk gets no headline this week. Fine by me; Sunday supplied enough material without inventing a stock ticker.','There is no useful market move to hang on the wall yet. I can survive one week without pretending every roster has become a mutual fund.'],
   bart:['The market page is mercifully quiet. We may discuss football like civilized degenerates for another paragraph.','No market headline this week. I will somehow endure the absence of a tiny arrow telling me how to feel.'],
   tilly:['Value Watch is taking the night off. Good. The game already gave us enough reasons to overreact.','The market desk brought me nothing dramatic, so I have reassigned its font budget to the actual football.'],
   jeff:['The market file has nothing material to add this week. I decline to manufacture evidence merely because the folder looks lonely.','No market movement worth entering as an exhibit. The case survives without decorative paperwork.']
  };
  return pick(rows[voice],v);
 }
 const dir=d>=0?'up':'down',amt=Math.abs(Math.round(d)).toLocaleString();
 const rows={
  nick:[t.team_name+' moved '+dir+' '+amt+' in team value. I notice it; I do not bow to it. Sundays still get the first paragraph.',t.team_name+' is '+dir+' '+amt+' on the market page. Keep the clipping, but do not let the market start coaching the team.'],
  bart:[t.team_name+' moved '+dir+' '+amt+' in value, which is enough to make the market crowd stroke its chin very seriously. I remain available for mockery.',t.team_name+' is '+dir+' '+amt+' on the market. A useful whisper, not a royal decree.'],
  tilly:[t.team_name+' is '+dir+' '+amt+' in the market and people are already acting as though this was ratified by Congress. Please behave worse; it helps circulation.',t.team_name+' moved '+dir+' '+amt+' in value. Somewhere, a manager has turned one green arrow into a TED Talk.'],
  jeff:['Value History moved '+t.team_name+' '+dir+' '+amt+'. I have filed it under “interesting, not dispositive.”',t.team_name+' is '+dir+' '+amt+' in the market. The number gets a folder, not a verdict.']
 };
 return pick(rows[voice],v);
}
function sentimentStory(t,s,voice,v){
 const title=String(s?.title||'Jury Still Out'),score=Number(s?.score),positive=Number.isFinite(score)&&score>=10,negative=Number.isFinite(score)&&score<=-10;
 const intro={
  nick:['The mood around town is officially “'+title+'.”','Around here the fan base has reached “'+title+'.”','The call-in temperature has settled at “'+title+'.”','The city’s football mood can be summarized as “'+title+',” which is probably too calm a phrase for the actual messages I have seen.'],
  bart:['The salons, sports bars and less reputable group chats agree on “'+title+'.”','Public opinion has arrived at the wonderfully dramatic label “'+title+'.”','The social verdict, delivered with very little restraint, is “'+title+'.”','Our patrons have selected “'+title+'” as the emotional dress code for the week.'],
  tilly:['The people have spoken: “'+title+'.”','The city is currently operating at “'+title+'” and absolutely nobody is normal about it.','Public mood: “'+title+'.” I have already ordered the appropriately irresponsible headline font.','The fan base has declared “'+title+',” which sounds official enough to put on a banner and irresponsible enough to print.'],
  jeff:['Public sentiment enters the file as “'+title+'.”','The crowd’s statement for the record is “'+title+'.”','The public has submitted “'+title+'” as its current testimony.','The city’s latest deposition can be summarized as “'+title+'.”']
 };
 const middle={
  nick:positive?['People are allowing themselves to believe a little, which is dangerous but nicer than the alternative.','The old complaints have not vanished, but they are being spoken more softly this week.','You can hear trust creeping back into the conversation one cautious sentence at a time.','The town is smiling without quite admitting it has lowered the guard.']:negative?['The grumbling has become background noise in every football conversation, and management has earned none of the benefit of silence.','Nobody needs a poll to know the patience is thinning; you can hear it in the first thirty seconds of every call-in show.','The town has stopped giving management the easy interpretation, which is what losing eventually does to trust.','Fans are keeping old receipts within arm’s reach, never a healthy sign for a front office.']:['Nobody has chosen a side with conviction yet. That is another way of saying everyone is saving screenshots.','The crowd is split, suspicious and one Sunday away from pretending it was always certain.','Trust and panic are currently sharing the same bar stool. Neither is buying the next round.','The city has not decided whether to believe or complain, so naturally it is doing both.'],
  bart:positive?['Hope has entered the room wearing something expensive and pretending it has always been invited.','The public is rediscovering generosity, a charming quality that tends to appear immediately after wins.','Applause is becoming fashionable again, and I must admit the look suits the place.','The mood has enough sparkle to be dangerous; expectations are beginning to accessorize.']:negative?['The complaint line has acquired the tone of a bad restaurant review written by someone who intends to return tomorrow.','Patience is being served in smaller portions, and the patrons have begun asking to speak with management.','The public has moved from disappointment to critique, which is simply anger with better tailoring.','Every old grievance has been reheated and plated like tonight’s special.']:['The room is undecided, which gives everyone permission to be smug later.','Public opinion is currently a cocktail of hope, suspicion and selective memory.','Nobody has committed to optimism or despair; both remain available by the glass.','The patrons are withholding applause and tomatoes alike until the next course arrives.'],
  tilly:positive?['People are smiling, rivals are muting chats, and somebody has absolutely started a premature parade route. Perfect.','The city is one more good Sunday away from making deeply irresponsible commemorative merchandise.','Optimism is loose in the streets. Hide the confetti budget from anyone with purchasing authority.','The fan base has discovered joy and is immediately abusing the privilege.']:negative?['The boos now have rhythm and at least one unofficial logo. This is how civic nonsense becomes tradition.','Fans are warming up the complaint banners and pretending they were definitely not in storage after the last win.','The city is angry enough to turn a lineup decision into a neighborhood issue. Excellent for circulation, terrible for management.','Every old trade is being reposted like newly discovered evidence, only with more exclamation points.']:['Half the city wants patience; the other half has already designed the protest sign. Balance.','Nobody knows whether to order confetti or angry banners, so I have sensibly priced both.','The fan base is hovering between “trust the plan” and “what plan?” with elite efficiency.','The city has chosen suspense, mostly because nobody gave it a better option.'],
  jeff:positive?['The public is offering management provisional credit. I have marked “provisional” twice.','Trust is accumulating, slowly and under observation, like any asset worth stealing later.','The witnesses are becoming friendlier. I remain professionally suspicious of happiness.','The public record is warming toward management, though no file has been destroyed.']:negative?['The public testimony is getting sharper, and several old exhibits have mysteriously reappeared on social media.','Patience is leaving the building under circumstances this office intends to investigate.','Fans have begun connecting old transactions with new losses, the natural habitat of a conspiracy board.','The crowd is no longer granting innocent explanations for free. Management should note the change in evidentiary climate.']:['The jury remains out and appears to be arguing in the hallway.','Public testimony conflicts wildly, which is normal and therefore admissible.','The file contains equal measures of hope and suspicion. I have separated them with a paper clip.','Nobody has established a convincing public case yet; deliberations continue loudly.']
 };
 const tail={
  nick:[' Fans have long memories when management earns them and photographic memories when it does not.',' One Sunday changes the weather; a month changes the reputation.',' The crowd will remember this week longer than management hopes and shorter than rivals claim.',' Reputation is slow work, the part nobody can fix with one clever waiver claim.'],
  bart:[' Supporters are wonderfully irrational except when they agree with me, at which point they become discerning patrons of the sport.',' The public reserves the right to reverse this position by halftime next week and insist it never held the previous one.',' Nothing ages faster than a fan’s certainty except perhaps my own columns.',' Sentiment is fickle, beautifully dressed and always early for the next argument.'],
  tilly:[' If this keeps improving, I am pricing parade confetti. If it collapses, the same supplier also sells angry banners. Efficient journalism.',' The fan base can go from statue committee to moving company in six days. I respect the versatility.',' Today’s hero becomes next week’s complaint graphic with astonishing production speed.',' The city remembers everything until the next touchdown, at which point history becomes negotiable.'],
  jeff:[' Reputation is cumulative evidence. One Sunday may move the room, but it does not erase the older files.',' The crowd remembers every trade it hated and forgets every waiver claim it mocked. I have copies.',' Public memory is selective; this office maintains backups.',' One result can alter the testimony. It cannot delete the prior exhibits.']
 };
 return pick(intro[voice],v)+' '+pick(middle[voice],v+1)+pick(tail[voice],v+2)+(Number.isFinite(score)&&Math.abs(score)>=55?' The temperature is not subtle.':'');
}
function outlookStory(t,w,voice,v){
 const a=t.next_week_availability||{},name=t.next_opponent_name||'the next opponent',n=t.next_opponent_context||{},r=n.record||{},record=n.record?String(r.wins||0)+'-'+String(r.losses||0)+(Number(r.ties)?'-'+String(r.ties):''):'';
 const byes=a.bye_current_starters||[],inj=a.injury_current_starters||[];
 let personnel='';
 if(a.fantasy_season_complete||Number(w)>=17){
  const rows={
   nick:['There is no next fantasy matchup. The season has finally run out of Sundays.','The schedule ends here. My notebook does not, but the lineup screen mercifully does.','No next opponent remains. The season has reached the part where every old clipping suddenly looks important.','That is the end of the fantasy schedule. Somebody turn off the press-box light when the arguments stop.'],
   bart:['There is no next fantasy appointment. The season has closed the dining room.','The schedule is finished, which feels both civilized and deeply rude.','No next matchup awaits. We have reached the final curtain and I refuse to pretend not to be sentimental.','The fantasy calendar has served its last course. Reviews will continue indefinitely.'],
   tilly:['No next matchup. The season is over and the presses are already demanding a commemorative disaster.','That is it for the fantasy schedule. Somebody either release the confetti or lock it away until next year.','The calendar has no next victim. The back page finds this personally offensive.','No more lineup lock this season. We are now free to exaggerate the entire year in peace.'],
   jeff:['No next matchup remains. The season file is ready for final indexing.','The fantasy schedule is closed. The evidence, naturally, will be cited for years.','There is no next opponent on the docket. The case moves to archives.','The schedule ends here. I have labeled the box and do not trust anyone else to store it.']
  };personnel=pick(rows[voice],v);
 }else if(byes.length||inj.length){
  const bits=[];if(byes.length)bits.push(byes.length+' starter'+(byes.length===1?'':'s')+' on bye');if(inj.length)bits.push(inj.length+' starter'+(inj.length===1?'':'s')+' carrying an injury tag');
  const issue=bits.join(' and ');
  const rows={
   nick:[t.team_name+' has '+issue+' to sort before the next lineup locks.',issue+' is waiting for '+t.team_name+' next week. Depth gets less theoretical now.',t.team_name+' carries '+issue+' into the next Sunday, so the bench is about to earn its rent.',issue+' has landed on the front-office desk for '+t.team_name+'. There is the week’s first homework assignment.'],
   bart:[t.team_name+' arrives at the next engagement with '+issue+', an inelegant accessory but a manageable one.',issue+' complicates the next menu for '+t.team_name+'. Depth, please report to the dining room.',t.team_name+' must account for '+issue+' before lineup lock. Nothing ruins presentation like missing personnel.',issue+' is the next bit of unpleasant housekeeping for '+t.team_name+'. I expect competence and decent lighting.'],
   tilly:[t.team_name+' has '+issue+' staring at the next lineup. Somebody wake the depth chart.',issue+' is headed straight at '+t.team_name+'. The emergency font has been notified.',t.team_name+' brings '+issue+' into next week, which is exactly how calm Tuesdays become stupid Sundays.',issue+' is the next roster problem for '+t.team_name+'. We have preheated the panic index responsibly.'],
   jeff:[t.team_name+' has '+issue+' entered into the next-week personnel file.',issue+' appears on the next docket for '+t.team_name+'. Depth will now be called as a witness.',t.team_name+' carries '+issue+' into the next lineup investigation.',issue+' is already in '+t.team_name+'’s next-week file. Management has advance notice and therefore fewer excuses.']
  };personnel=pick(rows[voice],v);
 }else{
  const rows={
   nick:[t.team_name+' reaches next week with the starting availability board clean. Enjoy the rare quiet while it lasts.',t.team_name+' has no verified starter bye or injury problem waiting next Sunday. I have checked twice because peace makes me nervous.',t.team_name+' gets a clean personnel runway into the next lineup. This sport will surely punish my optimism later.',t.team_name+' carries no verified starter availability headache into next week. Put that small mercy in the notebook.'],
   bart:[t.team_name+' approaches next week without a verified starter bye or injury problem. How refreshingly tidy.',t.team_name+' gets a clean availability card for the next engagement. One hates to waste good health on poor decisions.',t.team_name+' enters the next week with no verified starter availability drama, an almost suspicious level of elegance.',t.team_name+' has the luxury of a clean starter availability board. Please try not to accessorize it with unnecessary panic.'],
   tilly:[t.team_name+' has no verified starter bye or injury mess waiting next week. The panic department is furious about the lack of work.',t.team_name+' enters the next lineup with the starter availability board clean. Somebody knock on wood before I print this.',t.team_name+' gets a week without a verified starter availability fire. I have hidden the extinguisher somewhere memorable.',t.team_name+' has a clean starter availability board for now. The back page hates peace but will tolerate it briefly.'],
   jeff:[t.team_name+' has no verified starter bye or injury issue in the next-week file. Suspiciously clean.',t.team_name+' enters next week with a clean starter availability exhibit. I have photographed it before circumstances change.',t.team_name+' carries no verified starter availability problem into the next lineup. The personnel file remains thin.',t.team_name+' has a clean starter availability record for the next week. No alibi will be required on that front.']
  };personnel=pick(rows[voice],v);
 }
 if(!t.next_opponent_roster_id)return personnel+' The fantasy opponent is not on the board yet; we will save the grudge for somebody with a name.';
 const opp=name+(record?' ('+record+(n?.standings_rank?', '+ordinal(n.standings_rank):'')+')':'');
 const tails={
  nick:[' Next is '+opp+'. I will spend the week telling everyone it is just another matchup and believing none of it.',' '+opp+' is next. Keep the useful parts of this Sunday and burn the rest in a tasteful metal bin.',' '+opp+' waits next. I have already started writing questions nobody will answer until kickoff.',' Next up is '+opp+'. The notebook has a fresh page and, regrettably, so do my expectations.'],
  bart:[' Next comes '+opp+'. I plan to be insufferably specific about what should work and theatrically wounded if none of it does.',' '+opp+' awaits. A new week, a new chance for this roster to make my previous paragraph look wise or ridiculous.',' The next engagement is '+opp+'. I expect something presentable and reserve the right to sigh loudly.',' '+opp+' is next on the social calendar. Please arrive prepared and try not to embarrass the table.'],
  tilly:[' Next victim or problem, depending on editorial mood: '+opp+'. The giant headline is blank and waiting.',' '+opp+' is next. I have prepared both the parade font and the emergency complaint font because professionalism matters.',' Clear space on the back page for '+opp+'. We will decide later whether the ink is celebratory or furious.',' '+opp+' gets the next chance to ruin my weekend. The presses have been warned.'],
  jeff:[' Next on the docket: '+opp+'. New opponent, same file cabinet, fresh opportunity to create or destroy evidence.',' '+opp+' is next. I will be watching the lineup card like it owes me money.',' The next file is labeled '+opp+'. I intend to open it before management starts explaining anything.',' '+opp+' awaits on the next docket. Fresh witnesses, fresh fingerprints, same suspicious reporter.']
 };
 return personnel+pick(tails[voice],v);
}
function closingLine(t,voice,v){
 const won=!!t.won,playoffs=!!t.week_classification?.playoffs,champ=!!t.current_season_champion;
 if(champ){
  const rows={
   nick:['They are champions. I have spent a season rationing optimism and I am cashing every last bit of it tonight. Save the clipping forever.'],
   bart:['Champions. Magnificent, vulgar, indisputable champions. I withdraw every elegant reservation I have made all season and demand something sparkling.'],
   tilly:['They won the whole damn thing. Tear down tomorrow’s front page; we are printing this one until the presses melt.'],
   jeff:['Case closed. Championship secured. The evidence is overwhelming and, for once, I am delighted to lose the argument.']
  };return rows[voice][0];
 }
 const rows={
  nick:won?['Enjoy the win. Football gives you too few clean Sundays to spend one of them apologizing for being happy.','I am keeping this clipping. Not because I trust happiness, but because I have learned to document rare events.','Take the win and sleep well. The sport will resume trying to ruin our mood soon enough.','Good teams bank wins before anyone has time to explain why they were not perfect. Bank this one.']:['I am irritated because I care, which is the ancient and stupid contract between a team and the people who follow it. Fix it next week.','Losses like this hang around the newsroom after everybody leaves. The only cure is making next Sunday less interesting.','I will not romanticize a loss. Put it in the file, learn something useful, and please give me a happier lead next week.','The nice thing about football is another Sunday arrives. The terrible thing is we have to think about this one until then.'],
  bart:won?['A lovely result. I intend to enjoy it with the unbearable composure of a man who will absolutely panic again next Sunday.','Winning is vulgar, addictive and highly recommended. Let us do it again before I develop standards.','I asked for competence and received joy. This is how expectations become dangerous.','A win with enough texture to discuss and enough joy to ruin my objectivity. Perfect.']:['I dislike this result personally and aesthetically. The only acceptable sequel is competence.','There are bad losses and there are losses that offend one’s sense of composition. This one needs a rewrite.','I will spend the week pretending to be measured while privately resenting several roster decisions.','The column ends because the newspaper has a deadline, not because I have run out of complaints.'],
  tilly:won?['We won. The city may behave irresponsibly until breakfast; this newspaper certainly will.','Print the score on the good paper and send a copy to every rival manager with fragile self-esteem.','I have no closing thought beyond “ha.” Sometimes journalism achieves purity.','Victory! Somebody unlock the confetti closet and do not ask whether we have a permit.']:['I hate this and I am professionally obligated to use complete sentences, which feels unfair.','Burn the first draft, save the receipts and tell the team the angry font is already loaded for next week.','This loss stinks. There, sophisticated analysis complete. Now fix it.','The back page is furious, the coffee is worse, and next Sunday cannot arrive quickly enough.'],
  jeff:won?['The defense rests, temporarily. I will reopen the investigation at the first sign of nonsense.','A clean win does not erase suspicion; it merely makes suspicion much more pleasant.','The file closes with a W and several reluctant compliments. Do not make me regret either.','Evidence accepted. Result entered. Cynicism adjourned until next week.']:['The file stays open because of course it does. Please stop giving me evidence.','No acquittal tonight. Management gets seven days to produce a better exhibit.','The loss is entered into evidence. I would very much like next week to make it irrelevant.','I came looking for answers and found additional paperwork. Typical.']
 };
 return pick(rows[voice],v+(playoffs?3:0));
}
function headings(voice,v){
 const all={
  nick:[
   ['Sunday, From the Old Desk','The Names in the Notebook','What Management Owns','Market Page, Briefly','How the Town Feels','Next Sunday Is Already Calling'],
   ['The Clipping We Keep','Who Made It Matter','The Manager’s Chair','The Market in the Margin','Mood Around Town','One Week Forward'],
   ['Press Box Notes, With Feeling','The Men Who Carried It','Front Office Homework','A Word From the Market Desk','The Temperature in Town','What We Carry Into Next Week'],
   ['The Sunday Story','Heroes, Headaches and Everybody Between','Questions for Management','Roster Value, Without the Sermon','Fans Have Opinions','The Next Assignment']
  ],
  bart:[
   ['A Review of Sunday’s Work','The Leading Men','Management, Kindly Explain Yourself','The Market, Since You Insist','Public Opinion, With Snacks','Next Week’s Engagement'],
   ['The Result, Served Hot','Who Deserves the Good China','The Front Office Footnotes','A Brief Visit to the Market','The Crowd Is Being Dramatic','The Next Appointment'],
   ['Sunday’s Critique','The Cast That Mattered','Notes to Management','The Roster Market, Tastefully','What the Patrons Are Saying','On to the Next'],
   ['A Football Match, Allegedly','Stars and Other Necessary People','Front Office Etiquette','Market Gossip','The Public Mood','Next Sunday, Unfortunately']
  ],
  tilly:[
   ['The Back Page Has Feelings','Who Gets the Giant Photo','Management, Please Report to the Principal’s Office','Value Watch, Presented With Unnecessary Drama','What the Fans Are Yelling','Tomorrow’s Problem'],
   ['Stop the Presses','Put These Names in Huge Type','Front Office Shenanigans Department','Market Gossip We Will Abuse Responsibly','The City Has Lost Perspective','Next Week Needs a Headline'],
   ['Today in Responsible Journalism','Heroes, Villains and People on Probation','Explain Yourself, Management','Tiny Arrows, Huge Emotions','Public Nuisance Report','Who Are We Yelling About Next?'],
   ['The Front Page Is Already a Mess','Large Photos and Small Photos','The Managerial Complaint Box','Value Watch: No Adults Present','How Loud Is the City?','Load the Next Edition']
  ],
  jeff:[
   ['The Week’s Evidence','Witnesses for the Record','Front Office Paper Trail','Value History Exhibit','Public Sentiment File','Open Questions for Next Week'],
   ['Scene Report','Cooperative and Uncooperative Witnesses','Management Under Oath','Market Evidence','Statement From the Public','Next Case on the Docket'],
   ['The File Opens Here','People of Interest','The Lineup Card Gets Subpoenaed','Market Appendix','The Crowd Testifies','Unfinished Business'],
   ['Evidence From Sunday','Names Circled in Red','Follow the Paper Trail','What the Market Knows','Public Record','The File Stays Open']
  ]
 };
 return all[voice][v%all[voice].length];
}
export function humanSectionsV19({team:t,week:w,reporter:r,facts,sentiment}){
 const voice=voiceId(r),v=articleVariant(t,w),hs=headings(voice,v),rows=(t.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points)),top=rows[0]||null,second=rows[1]||null,low=rows[rows.length-1]||null,score=one(t.points)+'–'+one(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points)),won=!!t.won,opp=t.opponent_name||'the opponent';
 const mood=won?(margin>=25?'a proper demolition':margin<=5?'the kind of win that leaves fingernail marks on the desk':'a win with enough breathing room to enjoy the last sentence'):(margin>=25?'a loss with smoke coming out of it':margin<=5?'the cruel little kind of loss that makes every earlier decision feel personal':'a loss that never improved when I stared at it longer');
 const ledeRows={
  nick:[t.team_name+' '+(won?'beat ':'lost to ')+opp+', '+score+'. It was '+mood+', and I have the coffee stains to prove I took it personally.',score+' against '+opp+'. '+(won?'Put the result in the good folder.':'Put it in the folder labeled “things I would rather not revisit.”')+' '+t.team_name+' made Sunday feel '+(won?'briefly civilized.':'longer than the calendar advertised.')],
  bart:[t.team_name+' '+(won?'won ':'lost ')+score+' against '+opp+'. '+(won?'Delightful. Irritatingly delightful.':'Ghastly. Not historically ghastly, but certainly enough to spoil the after-dinner mood.') ,score+' versus '+opp+'. I watched '+t.team_name+' turn that into '+mood+', and I have chosen to take it as a personal commentary on my weekend.'],
  tilly:[t.team_name+' '+(won?'won ':'lost ')+score+' against '+opp+'. '+(won?'Find the parade permit.':'Who authorized this experience?')+' We are beginning at the correct emotional volume.',score+'! '+(won?'Victory, chaos, terrible decisions about confetti.':'Defeat, disgust, and a very rude copy deadline.')+' '+t.team_name+' has once again made neutrality impossible.'],
  jeff:[t.team_name+' '+(won?'won ':'lost ')+score+' against '+opp+'. I entered the result into evidence and immediately became suspicious of how much I cared.',score+' is the final against '+opp+'. '+(won?'The defense may smile. Briefly.':'The file has been reopened and several people should avoid eye contact with this desk.')]
 };
 const p1=pick(ledeRows[voice],v);
 const p2=recordSentence(t,w,voice,v)+' '+opponentSentence(t,voice,v);
 const p3=topPlayerSentence(top,voice,v)+' '+supportSentence(second,voice,v);
 const p4=lowSentence(low,voice,v)+' '+trendSentence(top,voice,v);
 const p5=transactionStory(t,facts,voice,v);
 const p6=lineupStory(t,voice,v);
 const p7=valueStory(t,voice,v);
 const p8=pick({
  nick:['I care about roster value because tomorrow matters, but I refuse to let a market chart steal the lead from actual football. That would be malpractice of a different kind.','A market move can tell us where expectations are drifting. It cannot tackle, catch or rescue a bad lineup. Keep it in the margin where it belongs.'],
  bart:['Roster value is gossip wearing a waistcoat. Useful gossip, occasionally excellent gossip, but still not invited to replace the match itself.','The market is a clever dinner guest: worth listening to, unbearable if allowed to dominate the table.'],
  tilly:['A value chart is sports radio with decimals. I love it dearly and trust it exactly until it insults one of my favorite players.','Market value is wonderful because it gives us one more thing to scream about between Sundays. I refuse to waste such a gift.'],
  jeff:['The market can corroborate a story; it does not get to write one. I have seen too many numbers develop motive after the fact.','Value belongs in the file as supporting evidence. Anybody trying to make it the eyewitness should expect cross-examination.']
 }[voice],v+3);
 const p9=sentimentStory(t,sentiment,voice,v);
 const career=t.manager_career||{},titles=Number(career.championships)||0;
 const p10=titles>0?pick({
  nick:['Management has '+titles+' championship'+(titles===1?'':'s')+' on the wall, which buys patience but not immunity. Fans know the difference even when radio callers pretend otherwise.'],
  bart:['There '+(titles===1?'is':'are')+' '+titles+' championship'+(titles===1?'':'s')+' on management’s résumé. Reputation is the one luxury item in this league that actually compounds.'],
  tilly:['Management owns '+titles+' championship'+(titles===1?'':'s')+'. That earns a longer leash, not diplomatic immunity, and this city keeps both the trophies and the pitchfork jokes in the same closet.'],
  jeff:['The file includes '+titles+' championship'+(titles===1?'':'s')+'. Prior good conduct matters; it simply does not seal future records.']
 }[voice],v):pick({
  nick:['This fan base is still building its memory of this version of the team. Every good week adds trust; every bad one gets stapled to the next complaint.','Reputation is earned slowly and spent quickly. That is unfair, but so is most of being a sports fan.'],
  bart:['Supporters are writing the manager’s reputation in ink one Sunday at a time. The handwriting becomes less forgiving after losses.','A manager without a trophy cabinet gets fewer benefit-of-the-doubt coupons. Cruel, perhaps. Also extremely normal.'],
  tilly:['No championship armor here yet. Every Sunday is another chance to become beloved or discover how quickly fans can design a fake eviction notice.','This city has not built the statue. It has, however, identified several convenient places to put one if winning becomes a habit.'],
  jeff:['There is no championship precedent to lean on. Each new result therefore carries slightly more weight in the public record.','Without old titles in the file, management has to earn every inch of trust the tedious way: repeatedly.']
 }[voice],v);
 const p11=outlookStory(t,w,voice,v);
 const p12=closingLine(t,voice,v);
 return[
  {heading:hs[0],kind:'lede',paragraphs:[p1,p2]},
  {heading:hs[1],kind:'players',paragraphs:[p3,p4]},
  {heading:hs[2],kind:'management',paragraphs:[p5,p6]},
  {heading:hs[3],kind:'value',paragraphs:[p7,p8]},
  {heading:hs[4],kind:'sentiment',paragraphs:[p9,p10]},
  {heading:hs[5],kind:'outlook',paragraphs:[p11,p12]}
 ];
}
