import {applyWeek2EditorialR16 as applyR169K} from './inquirer-week2-editorial-r169k.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const fmt=n=>{const x=Number(n);return Number.isFinite(x)?(Math.abs(x-Math.round(x))<1e-9?String(Math.round(x)):x.toFixed(1).replace(/0+$/,'').replace(/\.$/,'')):'n/a'};
const reporter=a=>String(a?.reporter?.name||'Nick Swindell');
const seed=t=>[...String(t?.team_name||'')].reduce((n,c)=>n+c.charCodeAt(0),0);
const alias=t=>String(t?.team_name||'this team').trim().split(/\s+/).filter(Boolean).at(-1)||'this team';
const win=t=>Number(t?.points)>=Number(t?.opponent_points);

function meaningLine(t,a,p,i){
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),proj=Number(p?.projected),name=String(p?.name||'This player'),who=reporter(a),s=seed(t)+i;
  const ratio=Number.isFinite(prior)&&prior>0?pts/prior:null, delta=Number.isFinite(proj)?pts-proj:null;
  const up=ratio!=null&&ratio>=1.35, down=ratio!=null&&ratio<=0.65;
  const star=Number(p?.prior_season_games)>=8&&Number.isFinite(prior)&&prior>=11;
  const ceiling=up&&star;
  const bank=[
    ceiling?`${name} may have shown that last season was not the ceiling so much as the lobby. One game does not rewrite a career, but it can make the old expectations look suspiciously conservative.`:
    up?`${name} did more than beat last year's pace; the performance changed what a reasonable Week 3 expectation looks like. That is how a hot week becomes a role worth taking seriously.`:
    down&&star?`${name} was miles below the standard already on the résumé. That is a bad Sunday from a proven player, not permission to invent a crisis because patience is apparently illegal after Week 2.`:
    down?`${name} gave fantasy managers the sort of return that makes a lineup screen feel personally insulting. The role gets another look, but the production has to stop asking for charitable interpretation.`:
    `${name} landed close enough to established expectations that the important part is how the production was earned, not whether the box score can be stretched into a dramatic new identity.`,
    delta!=null&&delta>=8?`${name} obliterated projection by ${fmt(delta)} points. Projections are not commandments, but beating one that badly is the statistical equivalent of returning the menu and ordering something much more expensive.`:
    delta!=null&&delta<=-8?`${name} missed projection by ${fmt(Math.abs(delta))} points. That is not a rounding error; that is the sort of hole the rest of a lineup notices immediately.`:
    `${name} did enough to matter without giving anyone a license to hallucinate a season-long certainty from one Sunday.`
  ];
  const tone=who==='Tilly Fleecer'
    ? `Tilly's verdict: ${bank[s%bank.length]}`
    : who==='Bartholomew Roycington III'
    ? `Bartholomew's ruling, with all due ceremony: ${bank[s%bank.length]}`
    : who==='Jefferson Filch'
    ? `Filch's read: ${bank[s%bank.length]}`
    : `Nick's read: ${bank[s%bank.length]}`;
  return tone;
}

function rewriteLede(t,a){
  const s=(a.sections||[]).find(x=>x.kind==='lede'); if(!s)return;
  const who=reporter(a), won=win(t), rec=t?.division_context?.record||{}, rank=Number(t?.weekly_rank), proj=Number(t?.projected), pts=Number(t?.points), diff=Number.isFinite(proj)?pts-proj:null;
  const result=`${t.team_name} ${won?'beat':'lost to'} ${t.opponent_name} ${fmt(t.points)}–${fmt(t.opponent_points)} and moved to ${Number(rec.wins)||0}-${Number(rec.losses)||0}.`;
  const rankLine=Number.isFinite(rank)?`${fmt(pts)} points ranked ${t.team_name} ${rank}${rank===1?'st':rank===2?'nd':rank===3?'rd':'th'} among 32 teams. ${won?'Winning with that output buys confidence; it does not buy immunity from making fun of whatever almost ruined it.':'That is a loss with enough numerical detail to confirm the misery was professionally measured.'}`:`${t.team_name} scored ${fmt(pts)} in Week 2.`;
  const projLine=Number.isFinite(diff)?(diff>=0?`${t.team_name} cleared projection by ${fmt(diff)} points. Nice. Projections do not award trophies, but making them look timid is still preferable to making them look charitable.`:`${t.team_name} missed projection by ${fmt(Math.abs(diff))} points. The model did not sabotage the lineup; it merely had the bad manners to remember what was expected.`):'';
  const div=String(t?.division_context?.division_name||t?.division_name||t?.division||'the division');
  const divLine=`In the ${div}, ${t.team_name} sits ${Number(t?.division_context?.division_rank)||'somewhere'} of ${Number(t?.division_context?.division_size)||4}. Two weeks is early, but standings are already old enough to annoy somebody.`;
  const voice=who==='Tilly Fleecer'
    ? `${won?'Tilly will allow the celebration, provided nobody turns 2-0 into a parade route after fourteen days.':'Tilly recommends keeping the panic theatrical but at least loosely tethered to the actual problem.'}`
    : who==='Bartholomew Roycington III'
    ? `${won?'Bartholomew acknowledges the victory with restrained applause and an immediate inspection for ugly furniture hiding behind the curtains.':'Bartholomew regrets to report that the result was not merely vulgar; it was also avoidable-looking.'}`
    : who==='Jefferson Filch'
    ? `${won?'Filch is less interested in the win than in which parts of it can survive hostile questioning next Sunday.':'Filch has seen enough bad losses blamed on “variance” to ask who actually failed before accepting the alibi.'}`
    : `${won?'Nick likes wins. Nick also likes not pretending every win was beautiful. Both thoughts can fit in the same paragraph.':'Nick has no interest in polishing a loss until it looks philosophical. Find the failure and fix it.'}`;
  const depth=who==='Tilly Fleecer'
    ? `${t.team_name} now gets the less glamorous assignment: prove the loud parts of Week 2 were repeatable and the stupid parts were optional. Tilly has seen enough September coronations to know confetti is cheap and lineup depth is not.`
    : who==='Bartholomew Roycington III'
    ? `${t.team_name} may keep the result, but Bartholomew would like the performance examined for structural integrity before anyone commissions a portrait. September has produced many fine statues with feet made entirely of waiver wire dust.`
    : who==='Jefferson Filch'
    ? `${t.team_name} has a result worth keeping and several assumptions worth testing. Filch is not asking for pessimism; he is asking everyone to stop treating one Sunday like sworn testimony when Week 3 is already waiting to contradict it.`
    : `${t.team_name} can enjoy the result without turning it into mythology. Nick wants the useful parts repeated, the dumb parts removed, and absolutely nobody pretending two weeks has solved fantasy football.`;
  const depth2=who==='Tilly Fleecer'
    ? `${t.team_name} also needs somebody outside the obvious stars to make Week 3 less dramatic. The glamorous answer is “trust the studs.” The useful answer is “please make sure the rest of the lineup remembers the game starts at the same time.”`
    : who==='Bartholomew Roycington III'
    ? `${t.team_name} would benefit from a touch more support from the less celebrated names. A roster cannot spend every Sunday asking its best players to arrive in formalwear while everyone else wanders in carrying folding chairs.`
    : who==='Jefferson Filch'
    ? `${t.team_name}'s next test is whether the secondary contributors can reduce the pressure on the obvious stars. Filch has no objection to a hero; he objects when the roster starts treating heroism as the weekly operating plan.`
    : `${t.team_name} needs the middle of the lineup to be less decorative next week. Stars can win you Sundays, but if three players have to drag everybody else across the finish line, eventually somebody lets go.`;
  s.paragraphs=[result,rankLine,projLine,divLine,voice,depth,depth2].filter(Boolean);
}

function rewritePlayers(t,a){
  const s=(a.sections||[]).find(x=>x.kind==='players'); if(!s)return;
  const ps=(t?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).slice().sort((x,y)=>Number(y.points)-Number(x.points)).slice(0,3);
  const paras=[];
  ps.forEach((p,i)=>{
    const stat=p?.real_stat_line?`${p.name} scored ${fmt(p.points)} fantasy points against ${t.opponent_name}: ${p.real_stat_line}.`:`${p.name} scored ${fmt(p.points)} fantasy points against ${t.opponent_name}.`;
    paras.push(stat);
    paras.push(meaningLine(t,a,p,i));
  });
  if(ps.length){
    const total=ps.reduce((n,p)=>n+Number(p.points||0),0), share=Number(t.points)?Math.round(total/Number(t.points)*100):0;
    paras.push(`${ps.map(p=>p.name).join(', ')} supplied ${fmt(total)} points, about ${share}% of ${t.team_name}'s Week 2 total. ${share>=65?'That is dominance from the top and a warning label for everybody beneath it: three people should not have to carry the grocery bags, the couch, and the fantasy team at the same time.':'The production was spread well enough that one bad starter did not automatically become a crime scene.'}`);
  }
  s.paragraphs=paras;
}

function rewriteSentiment(t,a){
  const s=(a.sections||[]).find(x=>x.kind==='sentiment'); if(!s)return;
  const fans=alias(t), won=win(t), who=reporter(a), pts=fmt(t.points), rec=t?.division_context?.record||{}, r=`${Number(rec.wins)||0}-${Number(rec.losses)||0}`;
  const winLines={
    'Nick Swindell':[
      `${fans} fans are ${r} and already speaking about Week 2 with the calm restraint of people pricing February flights. It has been two games. Naturally, the dynasty documentary is in pre-production.`,
      `${pts} points has the crowd treating every waiver claim like evidence of superior breeding. One ugly quarter in Week 3 will turn half of them back into constitutional scholars demanding accountability.`,
      `The funniest part of winning early is how quickly fans forget they spent August threatening to trade half the roster. Victory is apparently an excellent memory suppressant.`
    ],
    'Tilly Fleecer':[
      `${fans} supporters have upgraded from optimism to pageantry. Somewhere, an adult is absolutely explaining a 2-0 fantasy record to a spouse who did not ask.`,
      `After ${pts} points, the crowd has decided restraint is for teams with worse records and fewer screenshots of the standings. Gorgeous behavior. Completely normal.`,
      `One more win and somebody is going to use the phrase “team of destiny” without irony. Tilly requests that person be monitored for their own safety.`
    ],
    'Bartholomew Roycington III':[
      `${fans} supporters are behaving as though ${r} confers hereditary peerage. Two victories have apparently transformed a fantasy lineup into an ancestral estate.`,
      `${pts} points has inspired a level of self-satisfaction normally reserved for people who pronounce “schedule” with extra syllables.`,
      `The crowd would like everyone to know the rebuild is over, the vision was correct, and all preseason criticism has been expunged from the royal archive. Convenient.`
    ],
    'Jefferson Filch':[
      `${fans} fans have moved from hopeful to suspiciously confident. Filch has begun preserving their loudest declarations for the inevitable week when the same people deny ever making them.`,
      `${pts} points has produced witnesses who now claim they “always knew” this roster was dangerous. The preseason record shows several of them wanted everyone traded.`,
      `The current fan theory is that ${r} proves competence. It proves two wins. Filch will allow the celebration while remembering exactly who said what.`
    ]
  };
  const lossLines={
    'Nick Swindell':[
      `${fans} fans reacted to the loss with admirable proportionality: several are mentally firing players they do not employ and benching men they cannot contact.`,
      `${pts} points has turned the fan base into a volunteer audit committee. Nobody has credentials, everybody has a suspect.`,
      `By Tuesday, at least one supporter will insist the season is over and then spend forty minutes researching waiver claims. Grief is complicated.`
    ],
    'Tilly Fleecer':[
      `${fans} supporters have reached the bargaining stage and skipped directly to public theater. Benches are being imagined, trades are being demanded, and dignity has left through a side door.`,
      `${pts} points was enough to make the crowd speak about lineup decisions like a minor constitutional crisis. Tilly respects the commitment to melodrama.`,
      `The fans do not want patience. They want one benching, two apologies, and preferably a culprit wearing a name tag.`
    ],
    'Bartholomew Roycington III':[
      `${fans} supporters have responded to defeat by convening an unofficial tribunal in the drawing room. The evidence is mostly vibes, but the sentencing recommendations are severe.`,
      `${pts} points has caused several patrons to question the competence of everyone except themselves, which is the oldest tradition in fantasy sports.`,
      `The crowd remains loyal in the specific aristocratic sense of demanding immediate reform while insisting it has always supported the crown.`
    ],
    'Jefferson Filch':[
      `${fans} fans are not merely angry; they are reconstructing the loss frame by frame as though a commission has subpoena power.`,
      `${pts} points has produced three popular suspects, six conspiracy theories, and zero people volunteering to admit they liked the lineup on Sunday morning.`,
      `Filch notes the fan base has already reached a verdict. Evidence will now be gathered in whatever order best supports it.`
    ]
  };
  s.paragraphs=(won?winLines:lossLines)[who]||(won?winLines['Nick Swindell']:lossLines['Nick Swindell']);
}

function rewriteHotSeat(t,a){
  const s=(a.sections||[]).find(x=>x.kind==='hot-seat'); if(!s)return;
  const candidates=(t?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).map(p=>{
    const proj=Number(p?.projected),prior=Number(p?.prior_season_avg),pts=Number(p.points);
    const miss=Number.isFinite(proj)?pts-proj:(Number.isFinite(prior)?pts-prior:0); return {...p,miss};
  }).sort((x,y)=>x.miss-y.miss);
  const p=candidates[0]; if(!p)return;
  const established=Number(p.prior_season_games)>=8&&Number(p.prior_season_avg)>=11;
  s.paragraphs=[
    `${p.name} scored ${fmt(p.points)} in Week 2${p.real_stat_line?`: ${p.real_stat_line}`:'.'}`,
    established?`${p.name} has enough history that one rotten Sunday does not become a role crisis. It does, however, become extremely mockable, and fantasy managers paid for the right to complain.`:`${p.name} gave the lineup less than it needed and does not have a mountain of established production to wave around as a defense. Week 3 needs a better answer.`
  ];
}

function rewriteOutlook(t,a){
  const s=(a.sections||[]).find(x=>x.kind==='outlook'); if(!s)return;
  const next=String(t?.next_opponent_name||'the next opponent'), rec=t?.next_opponent_context?.record||{}, nr=`${Number(rec.wins)||0}-${Number(rec.losses)||0}`, div=String(t?.next_opponent_division_context?.division_name||'its division');
  const po=Number(t?.mida_outlook?.playoff), tp=Number(t?.next_opponent_projected), self=Number(t?.projected), who=reporter(a);
  const mida=Number.isFinite(po)?`${t.team_name}'s playoff estimate sits at ${fmt(po)}%. ${po>=70?'That is permission to feel good, not permission to start engraving anything.':po<=30?'The number is ugly enough to deserve attention, but Week 3 still has a pulse and therefore a chance to make it less embarrassing.':'The number is squarely in “interesting, not sacred” territory.'}`:'';
  const matchup=`${next} is next at ${nr} from the ${div}. ${who==='Tilly Fleecer'?'A record is useful context; it is not a hall pass, a tiara, or an excuse for another ugly lineup.':who==='Bartholomew Roycington III'?'One must resist the vulgar temptation to confuse an opponent record with destiny; the lineup still has to perform.':who==='Jefferson Filch'?'The record narrows the question, but it does not answer it. Week 3 gets to cross-check the optimism.':'Records tell you where the opponent has been. They do not score a single point for you next week.'}`;
  const projection=Number.isFinite(self)&&Number.isFinite(tp)?`${t.team_name} projects at ${fmt(self)} against ${fmt(tp)} for ${next}. ${self>=tp?'Being favored is pleasant right up until Sunday turns the spreadsheet into a witness against you.':'An underdog projection is not a death sentence; it is simply the market politely lowering expectations before kickoff.'}`:'';
  const later=(t?.upcoming_opponents||[]).slice(1,3).map(x=>`${x.team_name} (${Number(x?.context?.record?.wins)||0}-${Number(x?.context?.record?.losses)||0})`);
  const road=later.length?`After Week 3 come ${later.join(' and ')}. The schedule does not care whether Week 2 felt encouraging or traumatic, which is rude but operationally useful.`:'';
  s.paragraphs=[mida,matchup,projection,road].filter(Boolean);
}

function scrubRemaining(a){
  for(const s of a.sections||[]){
    if(['lede','players','sentiment','hot-seat','outlook'].includes(String(s.kind||'')))continue;
    if(!Array.isArray(s.paragraphs))continue;
    s.paragraphs=s.paragraphs.map(p=>clean(String(p||'')
      .replace(/\bthe number has cleared the burden of proof\b/gi,'that performance was too loud to ignore')
      .replace(/\bclears? the Cool Throne standard\b/gi,'earned a Cool Throne seat')
      .replace(/\bthe evidence supports\b/gi,'the performance supports')
      .replace(/\bunder review\b/gi,'worth complaining about')
      .replace(/\bthis particular hearing\b/gi,'this particular mess')
      .replace(/\bthe case\b/gi,'the argument')
      .replace(/\bverdict\b/gi,'result')
      .replace(/\bdocumented\b/gi,'obvious')
      .replace(/\binvestigation\b/gi,'attention')
      .replace(/\barticle\b/gi,'week')
      .replace(/\bcopy\b/gi,'')));
  }
}

function rewriteBreakout(out){
  const take=(out?.league_overview?.hot_takes||[]).find(x=>/breakout player to watch/i.test(String(x?.title||''))); if(!take)return;
  let p=null;
  for(const t of out.teams||[]){p=(t.starter_details||[]).find(x=>String(x?.name||'').toLowerCase()==='dallas turner');if(p)break;}
  if(!p)return;
  take.take=`Dallas Turner scored ${fmt(p.points)} fantasy points in Week 2 with ${String(p.real_stat_line||'a disruptive defensive line')}. He averaged ${fmt(p.prior_season_avg)} per game last season, so this was not a polite little step forward; it was the sort of jump that makes last year's role look like a warm-up. If the snap and pressure volume stick, “breakout” stops being a cute label and starts becoming the obvious description.`;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169K(raw); if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  rewriteBreakout(out);
  for(const t of out.teams||[]){
    const a=t?.inquirer_article;if(!a)continue;
    rewriteLede(t,a); rewritePlayers(t,a); rewriteSentiment(t,a); rewriteHotSeat(t,a); rewriteOutlook(t,a); scrubRemaining(a);
    a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}
export const applyWeek2EditorialR169L=applyWeek2EditorialR16;
