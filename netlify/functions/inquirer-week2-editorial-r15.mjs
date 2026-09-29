export const WEEK2_EDITORIAL_REVISION=15;

const clone=x=>JSON.parse(JSON.stringify(x));
const one=v=>Number.isFinite(Number(v))?Number(v).toFixed(1):'0.0';
const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(rows,seed)=>rows[hash(seed)%rows.length];
const sentences=s=>String(s||'').replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const record=t=>{const r=t?.league_context?.record||{};return String(Number(r.wins)||0)+'-'+String(Number(r.losses)||0)+(Number(r.ties)?'-'+String(Number(r.ties)):'')};
const rid=t=>String(t?.inquirer_article?.reporter?.id||'walter-mercer');
const key=t=>String(t?.roster_id||t?.team_name||'team');
const strongest=t=>(t?.starter_details||[]).slice().sort((a,b)=>Number(b?.points)-Number(a?.points))[0]||null;
const weakest=t=>(t?.starter_details||[]).slice().sort((a,b)=>Number(a?.points)-Number(b?.points))[0]||null;
const miss=t=>{const m=t?.best_lineup_miss;return m&&m.reserve&&m.starter&&Number(m.gap)>0?m:null};

const SUPPORT_RE=/\b(?:supporting cast|supporting score|supporting production|secondary scoring|second real scorer|second dependable foothold|second useful jolt|second punch|second answer|third score|third reason|one more working outlet|another usable starter|rest of (?:the )?(?:lineup|roster)|whole lineup|one[- ]man|one[- ]guest|solo effort|lonely haymaker|did not have to .* alone|didn't have to .* alone|kept .* from (?:becoming|being) (?:a )?(?:one[- ]man|solo)|top[- ]heavy|more than one emergency|another meaningful score)\b/i;

function lede(t,id){
 const tm=String(t.team_name||'This team'),op=String(t.opponent_name||'the opponent'),pts=one(t.points),opp=one(t.opponent_points),rec=record(t),won=!!t.won,seed=key(t)+'|lede|'+id;
 const b={
  'walter-mercer':won?[
   'Good. '+tm+' won '+pts+'–'+opp+' and moved to '+rec+'. I am allowing myself one satisfied nod before remembering that September has made fools of more confident people than me.',
   tm+' banked the win over '+op+'. Fine by me. I have lowered the blood pressure, not the standard.',
   'A win is a win, and '+tm+' has '+rec+' to prove it. I am still hiding the parade route.'
  ]:[
   tm+' lost '+pts+'–'+opp+', which is a wonderful way to make every quiet starter feel personally insulting by Monday morning.',
   'There is no tasteful version of '+tm+' taking the loss to '+op+'. The score is already annoying enough.',
   tm+' is '+rec+' after losing to '+op+'. Fans generally prefer lessons that do not charge them a full Sunday.'
  ],
  'tess-delaney':won?[
   tm+' has earned the vulgar pleasure of a win, and I intend to enjoy it before statistical adulthood returns to ruin the mood.',
   'The final score is flattering, the record is '+rec+', and for one gloriously irresponsible evening I am choosing joy over restraint.',
   tm+' beat '+op+' and now expects us to behave sensibly about it. Absolutely not.'
  ]:[
   tm+' lost to '+op+', and I regret to report that dignity has once again been asked to survive a fantasy lineup behaving like this.',
   'The score says loss; my mood says the lineup should apologize in writing.',
   tm+' leaves Week 2 at '+rec+', which is less a crisis than an invitation to spend six days dramatically resenting the exact same quiet spots.'
  ],
  'mack-hollis':won?[
   tm+' won. Print it, screenshot it, send it to the rival chat and become unbearable until kickoff.',
   pts+' points, a win over '+op+', and permission to talk reckless for seven days.',
   tm+' gets the good headline this week. Enjoy it loudly.'
  ]:[
   tm+' lost, so congratulations to every rival manager who had the meme drafted before the fourth quarter.',
   'Bad headline. Worse mood. '+tm+' handed '+op+' the win and now the group chat gets to behave like it discovered comedy.',
   tm+' took the loss and the screenshot is already circulating.'
  ],
  'nora-voss':won?[
   tm+' won, which means the rival thread has temporarily misplaced its favorite punch line. I saved the screenshot.',
   'The '+rec+' record is real. Rivals are free to call it luck; the standings remain stubbornly unimpressed.',
   tm+' beat '+op+'. That removes one easy rival joke and creates three new ways for supporters to become overconfident.'
  ]:[
   tm+' lost, and rivals did not need to manufacture the material. The final score arrived pre-highlighted.',
   'I saved the '+pts+'–'+opp+' screenshot before management could call the loss complicated.',
   tm+' is '+rec+' after the loss. Rivals have the receipt; the useful response is making it boring by next week.'
  ]
 };
 return pick(b[id]||b['walter-mercer'],seed)
}

function players(t,id){
 const hi=strongest(t),lo=weakest(t);if(!hi||!lo)return'';
 const hp=one(hi.points),lp=one(lo.points),seed=key(t)+'|players|'+id;
 const b={
  'walter-mercer':[
   hi.name+' can keep the game ball after '+hp+'. I am looking at '+lo.name+' and '+lp+' instead, because fandom is the art of locating the next thing that can ruin your afternoon.',
   hp+' from '+hi.name+' deserves the credit. '+lp+' from '+lo.name+' deserves the uncomfortable silence right after it.',
   hi.name+' gave them '+hp+'. Good. '+lo.name+' gave them '+lp+'. Less good. Praise in one pocket, aspirin in the other.'
  ],
  'tess-delaney':[
   hi.name+' produced '+hp+' and looked marvelous doing it. '+lo.name+' answered with '+lp+', which turns admiration into a very theatrical sigh.',
   'I adore '+hp+' from '+hi.name+'. I am considerably less enchanted by '+lo.name+' at '+lp+'.',
   hi.name+' supplied glamour at '+hp+'. '+lo.name+' supplied '+lp+' and reminded everybody why joy requires supervision.'
  ],
  'mack-hollis':[
   hi.name+' gets the headline for '+hp+'. '+lo.name+' gets the screenshot for '+lp+'. Everybody contributed to content.',
   hp+' from '+hi.name+' is the fun part. '+lp+' from '+lo.name+' is the reaction image.',
   hi.name+' put up '+hp+' and deserves noise. '+lo.name+' put up '+lp+' and deserves a much angrier kind.'
  ],
  'nora-voss':[
   hi.name+' gave rivals less to say with '+hp+'. '+lo.name+' gave them the entire next paragraph at '+lp+'.',
   hp+' from '+hi.name+' survives scrutiny. '+lp+' from '+lo.name+' is where the rival thread will keep zooming in.',
   hi.name+' posted '+hp+' and closed one complaint. '+lo.name+' posted '+lp+' and opened another.'
  ]
 };
 return pick(b[id]||b['walter-mercer'],seed)
}

function management(t,id){
 const m=miss(t),seed=key(t)+'|management|'+id;
 if(m){
  const gap=one(m.gap),r=String(m.reserve.name||'the reserve'),s=String(m.starter.name||'the starter');
  const b={
   'walter-mercer':[
    r+' outscored '+s+' by '+gap+' from the bench. I checked twice because I hoped the first look was me being cranky. It was not.',
    'A '+gap+'-point bench miss between '+r+' and '+s+' is not a conspiracy; it is just the lineup card volunteering to ruin Monday morning.'
   ],
   'tess-delaney':[
    r+' had '+gap+' more than '+s+' on the bench, a detail so needlessly irritating it practically arrives with its own dramatic sigh.',
    'The '+gap+'-point gap between '+r+' and '+s+' is how a calm Tuesday becomes a six-hour argument about one lineup button.'
   ],
   'mack-hollis':[
    r+' beat '+s+' by '+gap+' from the bench. Print the screenshot. Circle it. No caption needed.',
    'A '+gap+'-point bench miss? Beautiful. Rival managers will live on '+r+' over '+s+' until somebody gives them a newer joke.'
   ],
   'nora-voss':[
    'The bench receipt says '+r+' beat '+s+' by '+gap+'. Management gets to explain why the useful points were wearing sweatpants.',
    r+' over '+s+' by '+gap+' is the sort of detail rivals bookmark because it is both petty and measurable.'
   ]
  };
  return pick(b[id]||b['walter-mercer'],seed)
 }
 const b={
  'walter-mercer':['I checked the bench before complaining. There was no clean rescue hiding there. Irritatingly straightforward.','No obvious bench miracle was available. Fine. Judge the lineup that actually played.'],
  'tess-delaney':['There was no obvious bench savior waiting to make management look foolish, which is almost disappointing.','No clean bench rescue existed. How terribly inconvenient for hindsight.'],
  'mack-hollis':['No bench superhero was waiting to make management look stupid. Shame.','I checked for the easy bench outrage. It was not there. We will have to yell about the starters.'],
  'nora-voss':['The bench offered no clean rescue, so management escapes that allegation. Rivals will move to the next complaint.','No obvious bench alternative changes the story. That closes one file and leaves the starters exposed.']
 };
 return pick(b[id]||b['walter-mercer'],seed)
}

function sentiment(t,id){
 const won=!!t.won,seed=key(t)+'|sentiment|'+id;
 const b={
  'walter-mercer':won?['The fan base has reached the dangerous stage where “maybe” is being said out loud. I remain suspicious.','Optimism is back in circulation. Wonderful. Somebody label it fragile.']:['The fans are annoyed, I am annoyed, and the quiet starters should consider that a fair weather report.','Nobody is rioting. Yet. Every weak lineup spot has become a personal grievance.'],
  'tess-delaney':won?['Supporters are euphoric enough to mistake two weeks for destiny, and I refuse to spoil the party yet.','Hope has become fashionable again, which is usually when this sport begins preparing something rude.']:['Supporters are offended, dramatically and with cause.','There is enough frustration here to power several unnecessary arguments, which at least means nobody is emotionally detached.'],
  'mack-hollis':won?['Fans are loud, the memes are positive, and rival chats are being entered without permission. Correct behavior.','The fan base has one volume setting after this result: obnoxious. I support it.']:['The memes are hostile now. Good luck to every quiet starter opening social media.','The group chat is furious and productive, so the jokes are improving faster than the roster mood.'],
  'nora-voss':won?['Supporters are weaponizing the record in rival chats. I support this use of evidence.','The fan base has screenshots, receipts and temporary confidence. Keep copies.']:['Supporters have the screenshot saved and the complaint memorized.','Rivals have the joke, supporters have the grievance, and management has one week to make both stale.']
 };
 return pick(b[id]||b['walter-mercer'],seed)
}

function outlook(t,id){
 const tm=String(t.team_name||'This team'),next=String(t.next_opponent_name||'the next opponent'),rec=record(t),seed=key(t)+'|outlook|'+id;
 const b={
  'walter-mercer':[next+' is next. Beat them and I may permit one more week of optimism. Lose and I am reopening every complaint we just closed.',tm+' takes '+rec+' into '+next+'. I do not need perfection; I need the same obvious problem to stop introducing itself every Sunday.'],
  'tess-delaney':[next+' gets the next appointment. Win and we become unbearable; lose and every elegant theory gets thrown into the complaint pile.',tm+' carries '+rec+' into '+next+'. I would prefer a convincing answer, but this sport makes a living selling suspense.'],
  'mack-hollis':[next+' is next. Win and the headline gets bigger. Lose and the back page becomes a hostile workplace.',tm+' takes '+rec+' into '+next+'. Fix the weak spot, score points, ruin somebody else’s group chat.'],
  'nora-voss':[next+' gets the next look. If the same flaw survives, rivals no longer have a joke; they have a recurring feature.',tm+' carries '+rec+' into '+next+'. Management has one week to make the obvious Week 2 complaint boring.']
 };
 return pick(b[id]||b['walter-mercer'],seed)
}

function rewriteStock(s,t,id){
 let out=String(s||''),tm=String(t.team_name||'this team');
 if(/There is one roster-memory note worth keeping beside the Week 2 stars:/i.test(out)){
  const p={'walter-mercer':'One management receipt still belongs in this story:','tess-delaney':'Before management gets drunk on Sunday’s score, one old transaction still wants a word:','mack-hollis':'Do not let the scoreboard bury this roster receipt:','nora-voss':'I kept one transaction receipt on the desk:'}[id]||'One management receipt still belongs in this story:';
  out=out.replace(/There is one roster-memory note worth keeping beside the Week 2 stars:/i,p)
 }
 out=out.replace(/that history matters for [^.]+ because management chose this version of the roster, not merely the lineup that happened to score Sunday\./i,{
  'walter-mercer':'That deal remains part of the roster management has to live with, good Sundays included.',
  'tess-delaney':'A good Sunday does not erase the invoice; management still owns the bargain it made.',
  'mack-hollis':'Win or lose, that receipt belongs to management. No hiding it behind a shiny Week 2 score.',
  'nora-voss':'The trade stays attached to the roster; every useful Sunday either improves the receipt or makes it harder to defend.'
 }[id]||'That deal remains part of the roster management chose.');
 if(/there is nowhere to hide a September result/i.test(out)){
  out=out.replace(/there is nowhere to hide a September result/i,{
   'walter-mercer':'September is early, not consequence-free, and this division is already keeping receipts',
   'tess-delaney':'September may be young, but the division has already developed the impolite habit of counting everything',
   'mack-hollis':'September counts. Annoying, I know. The standings refuse to wait for everybody to feel ready',
   'nora-voss':'The calendar says September; the division ledger still refuses to mark any result “practice”'
  }[id]||'September still counts')
 }
 return out
}

function reviseParas(ps,t,id,state){
 const out=[];
 for(const raw of ps||[]){
  if(!String(raw||'').trim()||String(raw).trim().toLowerCase()==='n/a'){out.push(raw);continue}
  const keep=[];
  for(let s of sentences(raw)){
   s=rewriteStock(s,t,id);
   if(SUPPORT_RE.test(s)){
    state.support++;
    if(state.support>1&&!/\d/.test(s))continue
   }
   keep.push(s)
  }
  if(keep.length)out.push(keep.join(' '))
 }
 return out
}
function add(sections,kind,text){const s=(sections||[]).find(x=>String(x?.kind||'')===kind);if(!s||!Array.isArray(s.paragraphs)||!text)return;if(kind==='outlook')s.paragraphs.unshift(text);else s.paragraphs.push(text)}

function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;
 const id=rid(t),state={support:0},sections=(a.sections||[]).map(s=>({...s,paragraphs:reviseParas(s.paragraphs,t,id,state)}));
 add(sections,'lede',lede(t,id));
 add(sections,'players',players(t,id));
 add(sections,'management',management(t,id));
 add(sections,'sentiment',sentiment(t,id));
 add(sections,'outlook',outlook(t,id));
 a.sections=sections;a.editorial_revision=WEEK2_EDITORIAL_REVISION;a.voice_revision='week2-r15';
 return t
}

function recapReaction(id,i){
 const b={
  'walter-mercer':['Two weeks in, I have seen enough to be interested and nowhere near enough to be comfortable. This league remains allergic to clean conclusions.','The standings have started talking. I am listening reluctantly.'],
  'tess-delaney':['Week 2 supplied just enough competence to make optimism fashionable again, which is how this sport lures respectable people into reckless conclusions.','The league is acquiring a shape, and I resent how attractive several premature conclusions already look.'],
  'mack-hollis':['Two weeks, several disasters, and at least one rival chat already behaving like the trophy has been engraved. Perfect.','The free sample of patience has expired. Week 3 gets the full-volume version of every good start and embarrassing excuse.'],
  'nora-voss':['I saved the screenshots. Teams insisting their problems are temporary get one more Sunday to make that claim less funny.','Patterns are forming, which is bad news for every manager whose preferred defense remains “small sample.”']
 };
 const rows=b[id]||b['walter-mercer'];return rows[i%rows.length]
}
function reviseOverview(o){
 if(!o)return o;
 let perf=0,trade=0;
 o.sections=(o.sections||[]).map((s,i)=>{
  const id=String(s?.reporter?.id||'');
  const ps=(s.paragraphs||[]).map(raw=>{
   let x=String(raw||'');
   if(/current-player side an early performance problem to answer/i.test(x)){
    x=x.replace(/the current-player side an early performance problem to answer/i,[ 'the player return has already given management something uncomfortable to explain','the player return is already a Week 3 question instead of a victory lap' ][perf++%2])
   }
   if(/so the trade is attached to a roster that is still actively chasing something/i.test(x)){
    x=x.replace(/so the trade is attached to a roster that is still actively chasing something/i,[ 'so that receipt belongs to a live roster and cannot be filed away as ancient history','so this is not a museum-piece transaction; the return still has to justify itself while the season is moving' ][trade++%2])
   }
   return x
  });
  if(id&&ps.length)ps.push(recapReaction(id,i));
  return{...s,paragraphs:ps}
 });
 o.editorial_revision=WEEK2_EDITORIAL_REVISION;o.voice_revision='week2-r15';return o
}

export function applyWeek2EditorialR15(raw){
 if(!raw||Number(raw.season)!==2026||Number(raw.week)!==2)return raw;
 const out=clone(raw);
 out.teams=(out.teams||[]).map(reviseTeam);
 out.league_overview=reviseOverview(out.league_overview);
 out.editorial_revision=WEEK2_EDITORIAL_REVISION;
 out.voice_revision='week2-r15';
 return out
}
