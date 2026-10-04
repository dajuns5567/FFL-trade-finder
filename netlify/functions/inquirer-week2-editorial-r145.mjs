import {applyWeek2EditorialR16 as applyR144} from './inquirer-week2-editorial-r144.mjs';

const num=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'n/a';
const pct=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(1)}%`:'n/a';
const teamName=t=>String(t?.team_name||t?.name||t?.mida_outlook?.name||'this team');
const shortName=n=>String(n||'team').replace(/^(New England|New York|Los Angeles|Las Vegas|San Francisco|Kansas City|New Orleans|Tampa Bay)\s+/,'').trim();
const styleOf=a=>{
  const n=String(a?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'bartholomew';
  if(n==='Jefferson Filch')return'jefferson';
  return'nick';
};
const recordOf=t=>{
  const r=t?.league_context?.record||{};
  return {wins:Number(r.wins)||0,losses:Number(r.losses)||0,ties:Number(r.ties)||0};
};
const recordText=t=>{const r=recordOf(t);return `${r.wins}-${r.losses}${r.ties?`-${r.ties}`:''}`;};
const sectionByKind=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const actualOutlook=s=>String(s?.kind||'')==='outlook'||/^(?:Week 3\b|The Next Matchup\b)/i.test(String(s?.heading||'').trim());
const articleFacts=a=>{
  const lead=(a?.sections?.[0]?.paragraphs||[]).join(' ');
  const score=lead.match(/scored\s+(-?\d+(?:\.\d+)?)\s+in Week 2/i);
  const rank=lead.match(/ranking\s+(\d+)(?:st|nd|rd|th)?\s+among 32/i);
  return {score:score?Number(score[1]):null,rank:rank?Number(rank[1]):null};
};
const topStarters=t=>(t?.starter_details||[]).slice().filter(p=>Number.isFinite(Number(p?.points))).sort((a,b)=>Number(b.points)-Number(a.points));

function ledePunch(t,style){
  const a=t.inquirer_article,f=articleFacts(a),name=teamName(t),short=shortName(name),opp=String(t?.opponent_name||'the opponent');
  if(!Number.isFinite(f.score)||!Number.isFinite(f.rank))return null;
  const won=Boolean(t?.won);
  if(won&&f.rank<=8){
    if(style==='tilly')return `${short} put up ${num(f.score)} and won. That is permission to strut for a week, not permission to start measuring the parade route.`;
    if(style==='bartholomew')return `${short} scored ${num(f.score)} and won, which is the rare occasion when confidence and arithmetic arrive together. Enjoy the triumph; sainthood remains unavailable after two Sundays.`;
    if(style==='jefferson')return `${short} won with ${num(f.score)}, a top-eight score that makes the result harder to dismiss. Good. Now Week 3 gets to test whether the evidence survives a different opponent.`;
    return `${short} scored ${num(f.score)} and won. Good Sunday. Nobody needs to turn two weeks of fantasy football into a documentary about destiny.`;
  }
  if(!won&&f.rank<=8){
    if(style==='tilly')return `${short} scored ${num(f.score)} and still lost to ${opp}. That is the fantasy equivalent of bringing fireworks to your own eviction.`;
    if(style==='bartholomew')return `${short} produced ${num(f.score)} and still lost to ${opp}. One can admire the scoring while also noting that losing beautifully remains, regrettably, losing.`;
    if(style==='jefferson')return `${short} scored ${num(f.score)} and still lost to ${opp}. The offense has an alibi; the result does not.`;
    return `${short} scored ${num(f.score)} and lost anyway. That is impressive production attached to a result nobody wants framed.`;
  }
  if(f.rank>=25){
    if(style==='tilly')return `${short} finished in the bottom eight with ${num(f.score)}. The box score is not whispering here; it is kicking the door and asking who plans to fix this.`;
    if(style==='bartholomew')return `${short} managed ${num(f.score)}, a bottom-eight total. There is no elegant phrasing that turns poor scoring into hidden sophistication, so I shall not insult either of us by trying.`;
    if(style==='jefferson')return `${short} finished in the bottom eight with ${num(f.score)}. There are subtle warning signs, and then there is the score placing the warning sign directly on the lawn.`;
    return `${short} scored ${num(f.score)} and landed in the bottom eight. The box score has already done the sarcasm for me.`;
  }
  if(style==='tilly')return `${short} landed in the league's middle with ${num(f.score)}. Perfectly survivable, aggressively unglamorous, and nowhere near enough to start acting invincible.`;
  if(style==='bartholomew')return `${short} finished in the middle tier with ${num(f.score)}. Respectable is a pleasant adjective and a dreadful long-term ambition.`;
  if(style==='jefferson')return `${short} landed in the middle with ${num(f.score)}. That is not a crisis; it is simply a very efficient way to postpone learning how good this roster actually is.`;
  return `${short} scored ${num(f.score)} and landed in the middle. Fine. “Fine” is also what people say when they do not want a follow-up question.`;
}

function managementPunch(t,style,section){
  const short=shortName(teamName(t)),text=(section?.paragraphs||[]).join(' ');
  const mistake=/outscored .*? compatible bench spot|actual alternative on the bench|real alternative on the bench|management mistake/i.test(text);
  if(mistake){
    if(style==='tilly')return `${short} had a real bench answer and left it sitting there. That is not the fantasy gods being cruel; that is stepping on the rake and blaming the weather.`;
    if(style==='bartholomew')return `${short} had a genuine alternative available and chose otherwise. We may call the mistake unfortunate, but good manners do not require us to call it mysterious.`;
    if(style==='jefferson')return `${short} had a playable answer on the bench and chose otherwise. “Variance” is dismissed from this particular hearing; the decision managed the damage on its own.`;
    return `${short} had a real alternative on the bench. Specific mistake, specific fix; bad luck does not get to sign the paperwork for this one.`;
  }
  if(style==='tilly')return `No, I am not inventing a ${short} manager scandal just because yelling is fun. The lineup choice was defensible; the players are the ones who left the mess.`;
  if(style==='bartholomew')return `${short} offers no honest lineup scandal this week. Management may keep its dignity while the players remain behind to explain the arithmetic.`;
  if(style==='jefferson')return `${short} did not leave an obvious better answer on the bench. Management is acquitted; the production is very much still under questioning.`;
  return `${short} did not leave an obvious better answer on the bench. The manager gets out of this one; the players do not get to send “bad luck” as counsel.`;
}

function fanParagraphs(t,style){
  const short=shortName(teamName(t)),r=recordOf(t),next=shortName(t?.next_opponent_name||'Week 3'),won=Boolean(t?.won);
  if(r.wins===0&&r.losses>=2){
    if(style==='tilly')return [`At ${recordText(t)}, ${short} fans are done being told it is early. The tailgate question has moved from “what went wrong?” to “who are we blaming before lunch?”`,`${next} is next, and another loss will turn annoyance into a full-volume sport. A win buys relief; nobody is asking for poetry anymore.`];
    if(style==='bartholomew')return [`At ${recordText(t)}, ${short} supporters have exhausted the polite portion of the program. Two losses have a marvelous way of making patience sound like a request from the guilty party.`,`${next} now arrives with the fan base ready to cheer, boo or perform both in the same quarter. Victory would restore manners; defeat will not.`];
    if(style==='jefferson')return [`At ${recordText(t)}, ${short} fans are not overreacting by noticing the zero in the win column. The standings placed it there without consulting anyone's feelings.`,`${next} is the next hearing. Win and the noise drops; lose and every weak spot from the first two weeks gets called back to testify.`];
    return [`At ${recordText(t)}, ${short} fans are irritated because the team has given them two reasons to be. This is not a psychological mystery.`,`${next} is next. A win changes the temperature; a loss makes “it is still early” sound increasingly like a hostage negotiation.`];
  }
  if(r.wins>=2&&r.losses===0){
    if(style==='tilly')return [`At ${recordText(t)}, ${short} fans have earned the right to be obnoxiously pleased for a week. Somebody else can be the adult until Sunday.`,`${next} is where the swagger gets inspected. Win again and the noise gets louder; lose and everyone suddenly remembers they own brakes.`];
    if(style==='bartholomew')return [`At ${recordText(t)}, ${short} supporters may enjoy themselves without submitting an apology. Restraint is admirable, but so is knowing when the record has earned a little vanity.`,`${next} now has the privilege of trying to spoil the mood. Until then, the undefeated crowd may behave exactly as insufferably as success permits.`];
    if(style==='jefferson')return [`At ${recordText(t)}, ${short} fans have evidence for the confidence now. Two wins are not a championship, but they are considerably more persuasive than preseason optimism.`,`${next} gets the next chance to challenge the case. Another win strengthens it; a loss merely gives the skeptics fresh material.`];
    return [`At ${recordText(t)}, ${short} fans have earned some swagger. The record is real even if September is not a sworn affidavit.`,`${next} is next. Win and the confidence gets evidence; lose and fantasy football resumes its favorite hobby of declaring everything fraudulent.`];
  }
  if(style==='tilly')return [`At ${recordText(t)}, ${short} fans have one hand on celebration and the other hovering over panic. A very healthy way to spend September.`,`${next} gets to decide which hand wins. If ${short} looks good, the confidence gets loud; if not, the complaints will arrive preheated.`];
  if(style==='bartholomew')return [`At ${recordText(t)}, ${short} supporters are permitted optimism and panic in equal measure. Naturally, many will choose whichever emotion is least dignified.`,`${next} is the tiebreaker for the mood. A convincing win buys elegance; another stumble brings the boos out of storage.`];
  if(style==='jefferson')return [`At ${recordText(t)}, ${short} fans have exactly enough evidence to argue either side and nowhere near enough to settle it. This has not stopped anyone.`,`${next} should clarify the case. The fan base wants a reason to believe, not another Sunday that requires twelve competing explanations.`];
  return [`At ${recordText(t)}, ${short} fans can build a convincing argument for optimism or panic, which means most will attempt both before kickoff.`,`${next} is next. A clean win simplifies the conversation; another messy result guarantees nobody will let it stay simple.`];
}

function hotSeatPunch(t,style){
  const short=shortName(teamName(t)),p=t?.worst_starter,name=String(p?.name||'the starter'),points=Number(p?.points);
  const pts=Number.isFinite(points)?num(points):'a dud';
  if(style==='tilly')return `${name} gets one bad Sunday at ${pts} points, not witness protection. Do it again and ${short} will run out of patience before the excuses run out of adjectives.`;
  if(style==='bartholomew')return `${name} may call ${pts} points an unfortunate afternoon. A second one and the euphemisms begin to look more cowardly than charitable.`;
  if(style==='jefferson')return `${name}'s ${pts}-point result is the problem under review. One dud is a data point; another starts looking like a pattern with a name attached.`;
  return `${name} gave ${short} ${pts} points. One bad week gets context; two starts to look like a problem nobody can sarcasm away.`;
}

function playerPunch(t,style){
  const top=topStarters(t)[0];if(!top)return null;
  const short=shortName(teamName(t)),name=String(top.name||'the top scorer'),pts=num(top.points);
  if(style==='tilly')return `${name} gave ${short} ${pts}. That is the kind of line that makes the rest of the roster look competent by association. Very convenient.`;
  if(style==='bartholomew')return `${name}'s ${pts} did the civilized thing and made the rest of ${short}'s Sunday easier to explain. Excellence is terribly useful when everybody else would prefer fewer questions.`;
  if(style==='jefferson')return `${name}'s ${pts} is the part opponents have to take seriously. Everything behind that number still has to survive Week 3 without borrowing its credibility.`;
  return `${name} scored ${pts} for ${short}. That earns praise without requiring anyone to turn Week 2 into prophecy.`;
}

function coolThrone(t,style){
  const [a,b]=topStarters(t);if(!a||!b)return null;
  const short=shortName(teamName(t)),ap=num(a.points),bp=num(b.points);
  if(style==='tilly')return [`${a.name} gets the first Cool Throne nod after ${ap} points. Praise is unavoidable, which is irritating but fair.`,`${b.name} gets the second after ${bp}. Two players earning compliments on the same Sunday; ${short} is getting greedy.`];
  if(style==='bartholomew')return [`${a.name} earns the first Cool Throne honor with ${ap} points. Even a columnist with standards must occasionally surrender to the obvious.`,`${b.name} follows with ${bp}. ${short} managed two performances worth praising, a vulgar display of competence I am prepared to tolerate.`];
  if(style==='jefferson')return [`${a.name} gets the first Cool Throne spot after ${ap} points; the number has cleared the burden of proof.`,`${b.name} gets the second with ${bp}. Two separate reasons for optimism is better evidence than one star doing all the talking.`];
  return [`${a.name} gets the first Cool Throne spot after ${ap} points. That is enough to praise without a footnote.`,`${b.name} gets the second after ${bp}. ${short} had two answers worth keeping; fantasy football occasionally allows nice things.`];
}

function shouldMentionMida(t){
  const m=t?.mida_outlook||{},opp=t?.next_opponent_mida||{};
  const own=Number(m.playoff),other=Number(opp.playoff),title=Number(m.title)||0,r=recordOf(t);
  if(!Number.isFinite(own)||!Number.isFinite(other))return false;
  return own>=90||own<=10||Math.abs(own-other)>=45||title>=15||(r.wins>=2&&own<45)||(r.losses>=2&&own>45);
}

function naturalMida(t,style){
  if(!shouldMentionMida(t))return null;
  const m=t.mida_outlook,opp=t.next_opponent_mida,short=shortName(teamName(t)),oppName=shortName(opp?.name||t?.next_opponent_name||'the opponent');
  const own=Number(m.playoff),other=Number(opp.playoff),title=Number(m.title)||0,r=recordOf(t);
  if(r.wins>=2&&own<45){
    if(style==='tilly')return `MIDA is still side-eyeing ${short}: a ${recordText(t)} record, but only about a ${pct(own)} playoff chance. Fine. The record can shut the model up one Sunday at a time.`;
    if(style==='bartholomew')return `MIDA remains unconvinced by ${short}'s ${recordText(t)} start, putting the playoff chance around ${pct(own)}. An undefeated record being asked for identification is deliciously rude.`;
    if(style==='jefferson')return `MIDA still has ${short} around ${pct(own)} to make the playoffs despite the ${recordText(t)} record. That contradiction is more useful than blind praise: Week 3 can start resolving it.`;
    return `MIDA still has ${short} around ${pct(own)} to make the playoffs despite the ${recordText(t)} start. The record and the long view disagree; Week 3 gets another vote.`;
  }
  if(r.losses>=2&&own>45){
    if(style==='tilly')return `MIDA still gives ${short} about a ${pct(own)} playoff chance at ${recordText(t)}. Apparently the numbers have more patience than the fans. Charming.`;
    if(style==='bartholomew')return `MIDA still gives ${short} roughly a ${pct(own)} playoff chance despite the ${recordText(t)} start. The model is showing more restraint than the supporters, which is not difficult.`;
    if(style==='jefferson')return `MIDA keeps ${short} around ${pct(own)} for the playoffs despite the ${recordText(t)} record. The season is not dead; the margin for pretending nothing is wrong is.`;
    return `MIDA still puts ${short} around ${pct(own)} to make the playoffs at ${recordText(t)}. That is enough reason not to panic, and nowhere near enough reason to like the start.`;
  }
  if(own>=90||other<=10){
    if(style==='tilly')return `MIDA likes ${short} a lot more than ${oppName} right now: about ${pct(own)} playoff odds versus ${pct(other)}. Great. Now ${short} gets to avoid becoming the joke.`;
    if(style==='bartholomew')return `MIDA rather impolitely prefers ${short} here, roughly ${pct(own)} playoff odds to ${oppName}'s ${pct(other)}. The numbers have spoken early; Sunday is free to embarrass them.`;
    if(style==='jefferson')return `MIDA has ${short} around ${pct(own)} to make the playoffs and ${oppName} around ${pct(other)}. That does not decide Week 3; it does make a ${short} loss considerably harder to explain.`;
    return `MIDA has ${short} around ${pct(own)} for the playoffs and ${oppName} around ${pct(other)}. Not a prophecy; just context for why the favorite has more to lose than excuses to use.`;
  }
  if(own<=10||other>=90){
    if(style==='tilly')return `MIDA has ${short} around ${pct(own)} to make the playoffs while ${oppName} sits near ${pct(other)}. That is less a prediction than a dare with decimal places.`;
    if(style==='bartholomew')return `MIDA gives ${short} roughly ${pct(own)} playoff odds against ${oppName}'s ${pct(other)}. A gap that rude at least gives the underdog something satisfying to ruin.`;
    if(style==='jefferson')return `MIDA puts ${short} near ${pct(own)} playoff odds and ${oppName} near ${pct(other)}. The gap is real; so is the opportunity to make it look premature.`;
    return `MIDA has ${short} around ${pct(own)} to make the playoffs and ${oppName} around ${pct(other)}. The numbers are ugly. Fortunately, the game is still played before the obituary.`;
  }
  if(title>=15){
    if(style==='tilly')return `MIDA has ${short} at roughly ${pct(own)} for the playoffs and ${pct(title)} for the title. September is apparently already flirting with dangerous levels of confidence.`;
    if(style==='bartholomew')return `MIDA has ${short} around ${pct(own)} for the playoffs and ${pct(title)} for the title. That is enough optimism to become socially hazardous if Week 3 cooperates.`;
    if(style==='jefferson')return `MIDA has ${short} around ${pct(own)} for the playoffs and ${pct(title)} for the title. Those are serious numbers; Week 3 now tests whether the roster deserves serious treatment.`;
    return `MIDA has ${short} around ${pct(own)} for the playoffs and ${pct(title)} for the title. That is meaningful context, not permission to hang a banner in September.`;
  }
  return null;
}

function outlookPunch(t,style){
  const short=shortName(teamName(t)),opp=shortName(t?.next_opponent_name||'the next opponent');
  if(style==='tilly')return `${opp} is next. ${short} can either make the Week 3 argument on the field or spend another week listening to everybody else make it louder.`;
  if(style==='bartholomew')return `${opp} is next, and ${short} now gets the wonderfully simple task of making the analysis look clever or ridiculous by Sunday night.`;
  if(style==='jefferson')return `${opp} is next. The useful question is no longer what Week 2 meant; it is which part of that performance survives cross-examination in Week 3.`;
  return `${opp} is next. ${short} can answer the football question there; the schedule does not need to become an alibi in advance.`;
}

function strengthenTeam(t){
  const a=t?.inquirer_article;if(!a||!Array.isArray(a.sections))return t;
  const style=styleOf(a),lede=a.sections[0];
  if(Array.isArray(lede?.paragraphs)){
    lede.paragraphs=lede.paragraphs.filter(p=>!/(?:finished|landed) \d+(?:st|nd|rd|th) in Week 2 scoring with/i.test(String(p||'')));
    const punch=ledePunch(t,style);if(punch)lede.paragraphs.push(punch);
  }
  const players=sectionByKind(a,'players');
  if(players?.paragraphs){
    const punch=playerPunch(t,style);
    if(punch&&!players.paragraphs.includes(punch))players.paragraphs.push(punch);
  }
  const mgmt=sectionByKind(a,'management');
  if(mgmt?.paragraphs){
    const fact=mgmt.paragraphs.filter(p=>/outscored .* compatible bench spot|no compatible bench swap/i.test(String(p||''))).slice(0,1);
    const contextual=mgmt.paragraphs.filter(p=>!/outscored .* compatible bench spot|no compatible bench swap/i.test(String(p||''))).slice(0,1);
    mgmt.paragraphs=[...fact,...contextual,managementPunch(t,style,mgmt)].filter(Boolean);
  }
  const sentiment=sectionByKind(a,'sentiment');
  if(sentiment)sentiment.paragraphs=fanParagraphs(t,style);
  const hot=sectionByKind(a,'hot-seat');
  if(hot?.paragraphs?.length)hot.paragraphs=[hot.paragraphs[0],hotSeatPunch(t,style)].filter(Boolean);
  const cool=sectionByKind(a,'cool-throne');
  const coolCopy=coolThrone(t,style);if(cool&&coolCopy)cool.paragraphs=coolCopy;
  for(const s of a.sections){
    if(!actualOutlook(s)||!Array.isArray(s.paragraphs))continue;
    s.paragraphs=s.paragraphs.filter(p=>!(/\bMIDA\b/i.test(String(p||'')))&&!/^(?:Handle .*Week 3|Week 3 comes first|For .*Week 3 comes first|I want .*Week 3 game|.*next result should answer)/i.test(String(p||'').trim()));
    const m=naturalMida(t,style);if(m)s.paragraphs.splice(Math.min(1,s.paragraphs.length),0,m);
    s.paragraphs.splice(Math.min(2,s.paragraphs.length),0,outlookPunch(t,style));
  }
  a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r145';
  return t;
}

function rewriteDivisionBoard(out){
  const overview=out?.league_overview,teams=out?.teams||[];
  if(!Array.isArray(overview?.hot_takes))return;
  const board=overview.hot_takes.find(x=>/division board/i.test(String(x?.title||'')));if(!board)return;
  const by=n=>teams.find(t=>String(t?.team_name||'')===n);
  const po=n=>pct(by(n)?.mida_outlook?.playoff),ti=n=>pct(by(n)?.mida_outlook?.title),sc=n=>num(by(n)?.points),rec=n=>recordText(by(n));
  board.take=`The division board after two weeks:\n\nAFC EAST: The standings say New England at ${rec('New England Patriots')}; MIDA is much more impressed by Miami, with about ${po('Miami Dolphins')} playoff odds to New England's ${po('New England Patriots')}. Miami also just dropped ${sc('Miami Dolphins')} points. One team owns first place; the other is kicking the door.\nAFC NORTH: Baltimore and Cleveland are both ${rec('Baltimore Ravens')}, which gets less tidy the moment anybody looks underneath. MIDA has Baltimore around ${po('Baltimore Ravens')} for the playoffs and Cleveland around ${po('Cleveland Browns')}, while Pittsburgh just scored ${sc('Pittsburgh Steelers')} in a loss. This division is already arguing with its own standings.\nAFC SOUTH: Tennessee is ${rec('Tennessee Titans')} after scoring ${sc('Tennessee Titans')}, and MIDA still gives the Titans about ${po('Tennessee Titans')} playoff odds. Houston sits around ${po('Houston Texans')} and Indianapolis around ${po('Indianapolis Colts')}. Tennessee has control; nobody else has supplied a convincing rebuttal.\nAFC WEST: Denver is ${rec('Denver Doncos')} and MIDA is nearly as loud as the record at ${po('Denver Doncos')} playoff odds. The Chargers sit ${rec('Los Angeles Chargers')} but still carry ${po('Los Angeles Chargers')}. Kansas City and Las Vegas are both ${rec('Kansas City Chiefs')} and barely register in the playoff numbers. This race already has a top tier and a basement.\nNFC EAST: Philadelphia and Dallas are both ${rec('Philadelphia Eagles')}. MIDA does not consider that a tie at all: Eagles ${po('Philadelphia Eagles')}, Cowboys ${po('Dallas Cowboys')}. Dallas owns the same record; Philadelphia owns the much stronger long-view argument. That is exactly the kind of disagreement Week 3 is for.\nNFC NORTH: Nobody gets to hide behind a perfect record because Minnesota, Detroit and Chicago are all ${rec('Minnesota Vikings')}. Minnesota's ${sc('Minnesota Vikings')}-point Week 2 plus ${po('Minnesota Vikings')} playoff odds gives the Vikings the best early case; Detroit at ${po('Detroit Lions')} and Chicago at ${po('Chicago Bears')} are close enough to keep the door open.\nNFC SOUTH: New Orleans is ${rec('New Orleans Aints')}, scored ${sc('New Orleans Aints')} in Week 2 and sits around ${po('New Orleans Aints')} for the playoffs with ${ti('New Orleans Aints')} title odds. Atlanta is ${rec('Atlanta Falcons')} but only around ${po('Atlanta Falcons')}. The Aints are not just leading the division; they are the first team here with a record and a model outlook telling the same story.\nNFC WEST: Arizona is ${rec('Arizona Cardinals')} after a ${sc('Arizona Cardinals')}-point Week 2, yet MIDA still has the Cardinals around ${po('Arizona Cardinals')} for the playoffs. San Francisco is only ${rec('San Francisco 49ers')} but sits at ${po('San Francisco 49ers')}. That is the division's best contradiction: Arizona owns September, while the long view is still betting on the 49ers.`;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR144(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(strengthenTeam);
  rewriteDivisionBoard(out);
  if(out.league_overview)out.league_overview.structure_revision='week2-r145';
  out.structure_revision='week2-r145';
  return out;
}

export const applyWeek2EditorialR145=applyWeek2EditorialR16;
export const applyWeek2EditorialR144=applyWeek2EditorialR16;
export const applyWeek2EditorialR143=applyWeek2EditorialR16;
export const applyWeek2EditorialR142=applyWeek2EditorialR16;
export const applyWeek2EditorialR141=applyWeek2EditorialR16;
export const applyWeek2EditorialR140=applyWeek2EditorialR16;
export const applyWeek2EditorialR139=applyWeek2EditorialR16;
export const applyWeek2EditorialR138=applyWeek2EditorialR16;
export const applyWeek2EditorialR137=applyWeek2EditorialR16;
export const applyWeek2EditorialR136=applyWeek2EditorialR16;
export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
