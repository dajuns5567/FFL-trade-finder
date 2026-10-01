import {applyWeek2EditorialR16 as applyWeek2EditorialR18} from './inquirer-week2-editorial-r15.mjs';

export const WEEK2_EDITORIAL_REVISION=19;

const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const upper=s=>s?String(s).charAt(0).toUpperCase()+String(s).slice(1):'';
const reporterId=t=>String(t?.inquirer_article?.reporter?.id||'');
const teamName=t=>String(t?.team_name||'This team');
const nextOpponent=t=>String(t?.next_opponent_name||'the next opponent');
const didWin=t=>Number(t?.points)>Number(t?.opponent_points);

function slot(kind,index){
 if(kind==='lede')return [1,3].includes(index)?Math.floor(index/2):-1;
 if(kind==='players')return [0,2,4,6,8,10].includes(index)?Math.floor(index/2):-1;
 if(kind==='management')return index<2?index:-1;
 if(kind==='sentiment')return [0,2,4].includes(index)?Math.floor(index/2):-1;
 if(kind==='outlook')return [0,2].includes(index)?Math.floor(index/2):-1;
 if(['hot-seat','cool-throne','value'].includes(kind))return index===0?0:-1;
 return -1;
}

function teamVoiceBank(t,id,kind){
 const n=teamName(t),op=nextOpponent(t),win=didWin(t);
 const voices={
  'walter-mercer':{
   lede:[
    win?n+' won, so the manager gets the result and none of my silence. Winning does not cancel criticism.':n+' lost, and I am not sanding the rough edges off that Sunday. Bad Sundays should feel bad.',
    n+' has a week of actual football to live with before the next kickoff. I suggest living with all of it.',
    win?'The win belongs to '+n+'. So does every ugly decision hiding underneath it.':'The loss belongs to '+n+'. Nobody needs a motivational speech before admitting that.'
   ],
   players:[
    n+' can enjoy that player line for a day. September compliments expire fast around here.',
    'I will give '+n+' the credit it earned here and criticism everywhere else; charity is not a roster strategy.',
    n+' has enough talent that a weak line deserves criticism, not a weather report.',
    'A good Sunday earns praise. It does not buy '+n+' a month of immunity from me.',
    n+' should remember exactly who delivered when the matchup got uncomfortable. That is useful memory, not nostalgia.',
    'If '+n+' gets this version of the player again, wonderful. If not, Monday will get loud in a hurry.'
   ],
   management:[
    n+' can call it a lesson only if next week’s lineup looks like somebody learned it.',
    'I have seen managers survive worse than this. I have also seen them repeat it, which is how the jokes get mean.',
    'Management around '+n+' had a full week to make the decision. Sunday gets to grade it without mercy.'
   ],
   sentiment:[
    n+' supporters are entitled to be loud; the roster volunteered for this mood.',
    'Patience is easier to request than to earn, and '+n+' has fans checking the balance.',
    n+' fans can smell a bad lineup decision from three states away. Managers should stop acting surprised.'
   ],
   outlook:[
    'Week 3 can settle this the old-fashioned way: '+n+' either handles '+op+' or spends Monday explaining why it did not.',
    n+' does not need a speech before '+op+'. It needs the right lineup and enough points.',
    'I am giving '+n+' exactly one more Sunday before today’s optimism or irritation gets upgraded.'
   ],
   value:[n+' can move in the market all week. I still grade Sundays in points and wins.'],
   'hot-seat':['If '+n+' wants this criticism gone, score enough next week to make me look foolish. I can live with that.'],
   'cool-throne':['Credit where it is due: '+n+' earned a quiet minute. I doubt the quiet lasts.']
  },
  'tess-delaney':{
   lede:[
    win?n+' won and now gets to be insufferable for several business days. I support this limited license.':n+' lost, which means all the cute explanations are competing for second place behind the score.',
    n+' gave us enough material for admiration, mockery, or both. My favorite Sundays refuse to choose.',
    win?'The result is pretty. '+n+' should enjoy it before management touches anything else.':'The result is ugly. '+n+' can dress it up, but I will still recognize it.'
   ],
   players:[
    'That part of '+n+'’s Sunday deserves applause. Please enjoy it before the next lineup decision ruins the mood.',
    'I adore a useful stat line. I adore it more when '+n+' does not immediately waste it.',
    n+' has enough talent to make a dud look personally insulting. I am choosing to take it that way.',
    'Praise has been issued to '+n+'. Nobody get comfortable; I have more numbers.',
    n+' got something worth celebrating here, which is inconvenient for anyone committed to complaining full-time.',
    'A player doing his job this loudly is beautiful. '+n+' should try the concept again next Sunday.'
   ],
   management:[
    'Management had seven days to avoid looking silly. '+n+' somehow made the deadline exciting.',
    n+' can blame chaos if it wants. I prefer blaming the person who chose the lineup.',
    'If management wanted privacy, fantasy football was a terrible hobby to choose.'
   ],
   sentiment:[
    n+' fans have chosen volume over perspective. At last, a decision I can endorse.',
    'The '+n+' crowd is either planning a parade or sharpening complaints. Moderation has left the building.',
    'Supporters around '+n+' have earned the right to be dramatic. The roster keeps paying for the costumes.'
   ],
   outlook:[
    n+' gets '+op+' next, and I would like the matchup to be every bit as rude as the buildup deserves.',
    'Week 3 has expectations now. If '+n+' trips over them, I will not be gentle about the landing.',
    n+' can make all of this look smart against '+op+'. How convenient that football scheduled a test.'
   ],
   value:[n+' can flirt with the market all week. Sunday remains the jealous part of this relationship.'],
   'hot-seat':[n+' has officially earned the kind of attention managers pretend they do not notice. Delicious.'],
   'cool-throne':['Fine, '+n+', enjoy the applause. I am capable of generosity in carefully rationed doses.']
  },
  'mack-hollis':{
   lede:[
    win?n+' won with enough flourish to make subtlety feel unemployed. I respect the commitment.':n+' lost with the confidence of a team that expected the curtain to fall before anyone noticed.',
    n+' made Sunday loud. Whether that was triumph or public embarrassment is exactly why I kept watching.',
    win?'The win gives '+n+' the stage for a week. Try not to trip over the furniture.':'The loss gives '+n+' one very bright spotlight and nowhere tasteful to stand.'
   ],
   players:[
    n+' produced a number with entrance music. If it vanishes next week, I reserve the right to boo the encore.',
    'A stat line this useful deserves a little swagger. '+n+' should resist turning swagger into a hostage situation.',
    n+' got real production here. The tasteful response is applause; naturally, I prefer louder applause.',
    'That player gave '+n+' something worth admiring instead of explaining. What a luxurious change of pace.',
    n+' can put that performance in formalwear if it likes. It still has to survive another Sunday.',
    'If this is the version '+n+' gets again, the league may begin developing very ugly feelings.'
   ],
   management:[
    n+' chose the lineup. The lineup responded by judging management in public.',
    'A manager can make one ugly choice. Repeating it turns '+n+' into a touring comedy.',
    'Management wanted drama and '+n+' supplied it at full volume. Everybody involved should own the production.'
   ],
   sentiment:[
    n+' supporters are reacting with the restraint of people handed free champagne near an open flame.',
    'The '+n+' crowd has decided emotional excess is a civic duty. I admire the discipline.',
    n+' fans are not asking for calm. They are asking management to stop giving them material.'
   ],
   outlook:[
    n+' meets '+op+' with the lights already too bright. Splendid; pressure improves the scenery.',
    'Week 3 has handed '+n+' an encore. The only rude thing left would be forgetting the performance.',
    n+' can make the whole room louder against '+op+'. A flop will be equally audible.'
   ],
   value:[n+' has a market number wearing formal clothes. Sunday still gets to decide whether the outfit fits.'],
   'hot-seat':[n+' has reached the portion of the program where management hears every cough from the audience.'],
   'cool-throne':['Give '+n+' the applause while it is warm. Fantasy football has dreadful manners about keeping praise fresh.']
  },
  'nora-voss':{
   lede:[
    win?n+' won. Good. The score also left management a few things it should be embarrassed to repeat.':n+' lost, and the score already made the problem plain. Management can fix it or keep pretending numbers are rude.',
    n+' has enough real Week 2 information to stop hiding behind first impressions.',
    win?'The win buys '+n+' confidence, not immunity from obvious mistakes.':'The loss gives '+n+' a simple assignment: stop repeating the choices that helped create it.'
   ],
   players:[
    n+' can stop negotiating with that number. The number already happened.',
    'Management has enough information to make a better choice next week; repeating the same mistake would be stubbornness.',
    n+' got the production. Now management has to prove it knows what to do with it.',
    n+' should reward what worked and stop protecting what did not. There is no mystery in that.',
    'If '+n+' wants patience, it can buy some with points next Sunday.',
    'That performance deserves a reaction stronger than a polite nod. '+n+' needed it and got it.'
   ],
   management:[
    'The manager can call it variance once. Call it twice and '+n+' fans can call it a habit.',
    n+' does not need another explanation for the lineup. It needs a better lineup.',
    'Management made the choice. The score made the consequences difficult to ignore.'
   ],
   sentiment:[
    n+' supporters already know what bothered them. Management should assume they noticed the same Sunday.',
    'Fans around '+n+' are short on patience because the scoreboard keeps sending them itemized reasons.',
    n+' supporters can handle bad luck. Repeated bad choices are where the mood gets expensive.'
   ],
   outlook:[
    n+' gets '+op+' next. The opponent does not care about this week’s explanation.',
    'Week 3 gives '+n+' a clean chance to make the obvious corrections before they become habits.',
    n+' can quiet the criticism against '+op+' by doing the revolutionary thing: making the better decisions.'
   ],
   value:[n+' moved in the market. Management should know why before it starts chasing the movement.'],
   'hot-seat':[n+' has reached the point where another bad Sunday will sound less like bad luck and more like a pattern.'],
   'cool-throne':['Credit to '+n+'. Something worked well enough that criticism can take a minute off.']
  }
 };
 return voices[id]?.[kind]||[];
}

function cleanClinical(t,text){
 const n=teamName(t);
 return String(text||'')
  .replace(/Strong production deserves to be stated plainly\./gi,n+' earned the praise. I am done whispering it.')
  .replace(/Now the role has to sustain it\./gi,'Do it again before '+n+' gets comfortable.')
  .replace(/The next question is what underlying player changes caused it\./gi,n+' should know exactly what caused the move before management chases the next one.')
  .replace(/The movement matters; the cause matters more\./gi,'The move has our attention. '+n+' still has to know what created it.')
  .replace(/That is enough movement to track without pretending it settles the roster[’']s quality\./gi,n+' moved enough to get attention; nobody gets to call the roster fixed.')
  .replace(/The expectation is clear; the result will tell us whether it was useful\./gi,'If '+n+' wastes that edge on Sunday, the projection gets mocked and management gets the harder questions.')
  .replace(/That creates a concrete benchmark without pretending the game is settled\./gi,'That gives '+n+' a number everybody can laugh at if Sunday goes sideways.')
  .replace(/That is the standard the actual result will be measured against\./gi,'If '+n+' misses that number badly, the excuses can start immediately.')
  .replace(/The next game should tell us which Week 2 traits are structural and which were matchup noise\./gi,'Week 3 can make this simple for '+n+': repeat what worked and quit feeding what did not.')
  .replace(/The useful question is which parts are likely to happen again\./gi,n+' should care about one thing now: do the useful parts again.')
  .replace(/There is enough information to move beyond first impressions\./gi,n+' has enough information to stop hiding behind first impressions.');
}

const CONTRAST=/\b(?:that|this|it)\s+(?:is|was)\s+not\s+([^.!?;,]{1,90})(?:;|,)\s*(?:it|that|this)\s+(?:is|was)\s+([^.!?]+)([.!?])/i;
function limitContrast(text,state){
 return sentenceParts(text).map(sentence=>{
  if(!CONTRAST.test(sentence))return sentence;
  state.count++;
  if(state.count===1)return sentence;
  return sentence.replace(CONTRAST,(_,a,b,punct)=>'Forget '+String(a).trim()+'. '+upper(String(b).trim())+punct);
 }).join(' ');
}

function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;
 const id=reporterId(t),contrast={count:0};
 a.sections=(a.sections||[]).map(sec=>{
  const kind=String(sec?.kind||'');
  const paragraphs=(sec?.paragraphs||[]).map((p,index)=>{
   let x=limitContrast(cleanClinical(t,p),contrast);
   const s=slot(kind,index),bank=teamVoiceBank(t,id,kind),line=s>=0&&bank.length?bank[s%bank.length]:'';
   if(line&&!x.includes(line))x=(x+' '+line).trim();
   return x;
  }).filter(Boolean);
  return {...sec,paragraphs};
 });
 a.paragraphs=a.sections.flatMap(sec=>(sec?.paragraphs||[]).filter(Boolean));
 a.editorial_revision=WEEK2_EDITORIAL_REVISION;
 a.voice_revision='week2-r19';
 return t;
}

function recapContext(text){
 const x=String(text||'');
 if(/\b(?:bench|lineup|start-sit|manager|management)\b/i.test(x))return'management';
 if(/\b(?:value|market|roster-value)\b/i.test(x))return'value';
 if(/\b(?:trade|received|pick)\b/i.test(x))return'trade';
 if(/\b(?:projected|projection|Week 3)\b/i.test(x))return'outlook';
 if(/\b(?:2-0|0-2|standings|record)\b/i.test(x))return'standings';
 return'general';
}

function recapVoice(id,context){
 const voices={
  'walter-mercer':{
   management:['Bench points are always louder on Monday. Managers pretend otherwise because dignity is cheaper than admitting the mistake.','One bad lineup call is survivable. Making the same one twice is how a manager becomes the league’s weekly entertainment.','I have seen enough benches to know regret scores beautifully after the games are over.'],
   value:['Market value can strut all week. Sunday still charges admission in points.','A rising number is pleasant. It cannot set a lineup or win a matchup.','The market loves optimism; I prefer a roster that earns it twice.'],
   trade:['A trade victory lap before the next kickoff is how managers tempt fate for free.','A good deal followed by a bad lineup is still an embarrassing Sunday.','Managers can celebrate the trade after the players finish proving it was worth celebrating.'],
   outlook:['Week 3 will be rude to somebody’s confidence. That is the only projection I trust completely.','A favorite still has to play the game; decimals have never made a tackle.','The next Sunday is where every September theory gets charged rent.'],
   standings:['Two weeks is enough for bragging and nowhere near enough for wisdom. Naturally, the league chose bragging.','The unbeaten teams may enjoy the view. The winless teams have officially lost the right to call everything noise.','September standings are old enough to start arguments and young enough to make several of them look stupid later.'],
   general:['I have watched enough fantasy football to know dignity usually leaves before the first waiver claim.','Every quiet Sunday eventually finds a manager to embarrass. This league remains extremely efficient.','The league has supplied plenty of reasons to complain and just enough reasons to keep watching.']
  },
  'tess-delaney':{
   management:['A bench mistake this obvious does not need sympathy; it needs better taste next Sunday.','Management had all week to avoid the joke and still walked directly into it. Gorgeous commitment.','I support second chances. I support them less when they involve starting the same wrong player again.'],
   value:['The market is flirting again. I approve of the energy and distrust the relationship.','Value moved, everyone gasped, and Sunday remained aggressively unimpressed.','A prettier roster number is lovely. Points remain the accessory that actually matters.'],
   trade:['Every manager wins a trade in the first five minutes. Sunday is such a rude second opinion.','A deal should improve the roster or at least improve the gossip. Anything less is poor hospitality.','The trade celebration may begin after the players provide transportation.'],
   outlook:['A projection this confident is practically begging football to spill a drink on it.','Week 3 has expectations now. I hope somebody trips over them spectacularly.','Favorites are adorable right up until kickoff gives them responsibilities.'],
   standings:['Two weeks has given everyone exactly enough information to become irresponsibly confident. Delicious.','The unbeaten teams may strut and the winless teams may sulk. The 1-1 crowd is pretending ambiguity is a personality.','September has barely begun and several managers are already acting like the trophy knows their address.'],
   general:['The league keeps serving beauty and stupidity on the same plate. I continue to order seconds.','Restraint had an opportunity. The managers rejected it unanimously.','Somebody somewhere is calling this a long season. I call it an excellent excuse with terrible timing.']
  },
  'mack-hollis':{
   management:['One lineup mistake can be forgiven. Two starts looking like a touring production.','Management wanted suspense and accidentally cast itself as the villain.','A bench gap this ugly should come with an intermission so the manager can reconsider the plot.'],
   value:['The market put on formalwear for numbers that still have to survive Sunday.','A roster-value swing is financial theater with shoulder pads waiting nearby.','The market may bow. The scoreboard has not agreed to applaud.'],
   trade:['Every trade is a love story until one side checks the next box score.','A manager celebrating a trade early is basically asking Sunday for a dramatic entrance.','The deal can take a bow after the roster stops giving the audience reasons to boo.'],
   outlook:['The projection has entered under a spotlight. Football is already reaching for the dimmer switch.','Week 3 has encore energy: everybody expects more and somebody will forget the lyrics.','A favorite under bright lights is either glamorous or one mistake away from slapstick.'],
   standings:['The standings are young, loud and overdressed. I could not be happier.','A 2-0 team walks differently in September. An 0-2 team checks the exits.','The 1-1 crowd has achieved perfect dramatic tension by accomplishing almost nothing definitive.'],
   general:['This league has once again mistaken restraint for a character flaw. Splendid.','Fantasy football remains theater for people who insist they are simply checking scores.','The week had heroes, disasters and several managers auditioning for both roles.']
  },
  'nora-voss':{
   management:['Management had all week to avoid the lineup mistake. Monday has been assigned to explaining it.','One bad choice can happen. Repeating it gives fans permission to stop calling it an accident.','Bench regret is useful only when the next lineup proves the manager noticed.'],
   value:['The market moved. Nobody on the roster learned to score because of the movement alone.','Value can create options, but management still has to use those options intelligently.','A rising number is useful leverage. It is also a terrible substitute for winning.'],
   trade:['Managers love declaring a trade won early. Sunday enjoys making those declarations expensive.','A trade gets credit when the roster gets better, not when the manager feels clever.','The deal can keep its victory lap until the new roster actually earns one.'],
   outlook:['A projection can create expectations. It cannot rescue a bad lineup after kickoff.','Week 3 gives every manager another chance to make the obvious correction before it becomes a habit.','The favorite gets the advantage on paper and the responsibility everywhere else.'],
   standings:['Two weeks is plenty of time for confidence to become annoying. The league is right on schedule.','The standings are early. The bragging is already fully grown.','At 0-2, patience gets expensive. At 2-0, humility apparently becomes optional.'],
   general:['Several managers have requested patience. The scoreboard has declined to participate.','The league keeps creating obvious problems and then acting surprised when fans notice them.','A manager can blame variance for almost anything once. The second time needs better material.']
  }
 };
 return voices[id]?.[context]||voices[id]?.general||[];
}

function dedupeRecap(sections){
 const seen=new Set();
 return (sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>{
  const kept=[];
  for(const sentence of sentenceParts(p)){
   const key=sentence.replace(/\s+/g,' ').trim().toLowerCase();
   if(key.split(/\s+/).length>=8&&seen.has(key))continue;
   if(key.split(/\s+/).length>=8)seen.add(key);
   kept.push(sentence);
  }
  return kept.join(' ').trim();
 }).filter(Boolean)}));
}

function reviseOverview(o){
 if(!o)return o;
 o.sections=(o.sections||[]).map(sec=>{
  const id=String(sec?.reporter?.id||'');
  const paragraphs=(sec?.paragraphs||[]).map((p,index)=>{
   let x=cleanClinical({team_name:'the league'},p);
   if(index<3){
    const bank=recapVoice(id,recapContext(x)),line=bank.length?bank[index%bank.length]:'';
    if(line&&!x.includes(line))x=(x+' '+line).trim();
   }
   return x;
  }).filter(Boolean);
  return {...sec,paragraphs};
 });
 o.sections=dedupeRecap(o.sections);
 o.editorial_revision=WEEK2_EDITORIAL_REVISION;
 o.voice_revision='week2-r19';
 return o;
}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR18(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(reviseTeam);
 out.league_overview=reviseOverview(out.league_overview);
 out.editorial_revision=WEEK2_EDITORIAL_REVISION;
 out.voice_revision='week2-r19';
 return out;
}

export const applyWeek2EditorialR19=applyWeek2EditorialR16;
export const applyWeek2EditorialR15=applyWeek2EditorialR16;
