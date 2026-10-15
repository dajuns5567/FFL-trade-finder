import {applyWeek2EditorialR16 as applyR152} from './inquirer-week2-editorial-r152.mjs';

const num=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'n/a';
const pct=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(1)}%`:'n/a';
const shortName=n=>String(n||'team').replace(/^(New England|New York|Los Angeles|Las Vegas|San Francisco|Kansas City|New Orleans|Tampa Bay)\s+/,'').trim();
const teamName=t=>String(t?.team_name||t?.name||t?.mida_outlook?.name||'this team');
const record=t=>{const r=t?.league_context?.record||{};return{w:Number(r.wins)||0,l:Number(r.losses)||0,t:Number(r.ties)||0};};
const recordText=t=>{const r=record(t);return`${r.w}-${r.l}${r.t?`-${r.t}`:''}`;};
const styleOf=a=>{
  const n=String(a?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'bartholomew';
  if(n==='Jefferson Filch')return'jefferson';
  return'nick';
};
const sectionByKind=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const isOutlook=s=>String(s?.kind||'')==='outlook'||/^(?:Week 3\b|The Next Matchup\b)/i.test(String(s?.heading||'').trim());
const articleFacts=a=>{
  const lead=(a?.sections?.[0]?.paragraphs||[]).join(' ');
  const score=lead.match(/scored\s+(-?\d+(?:\.\d+)?)\s+in Week 2/i);
  const rank=lead.match(/ranking\s+(\d+)(?:st|nd|rd|th)?\s+among 32/i);
  return{score:score?Number(score[1]):null,rank:rank?Number(rank[1]):null};
};
const topStarter=t=>(t?.starter_details||[]).slice().filter(p=>Number.isFinite(Number(p?.points))).sort((a,b)=>Number(b.points)-Number(a.points))[0]||null;

function midaMeaningful(t){
  const own=Number(t?.mida_outlook?.playoff),other=Number(t?.next_opponent_mida?.playoff),title=Number(t?.mida_outlook?.title)||0,r=record(t);
  if(!Number.isFinite(own))return false;
  return own>=85||own<=15||title>=10||(r.w>=2&&own<55)||(r.l>=2&&own>35)||(Number.isFinite(other)&&Math.abs(own-other)>=35);
}

function midaLine(t,style){
  if(!midaMeaningful(t))return null;
  const m=t.mida_outlook||{},opp=t.next_opponent_mida||{},short=shortName(teamName(t)),oppName=shortName(opp?.name||t?.next_opponent_name||'the opponent');
  const own=Number(m.playoff),other=Number(opp.playoff),title=Number(m.title)||0,r=record(t),rec=recordText(t);
  if(r.w>=2&&own<55){
    if(style==='tilly')return `MIDA is still side-eyeing ${short}: ${rec} on the page, only about ${pct(own)} to make the playoffs in the model. Rude. Keep winning and make the spreadsheet apologize.`;
    if(style==='bartholomew')return `MIDA remains unmoved by ${short}'s ${rec} start, leaving the playoff chance around ${pct(own)}. An undefeated team being asked for identification is wonderfully impolite.`;
    if(style==='jefferson')return `MIDA still puts ${short} around ${pct(own)} to make the playoffs despite the ${rec} record. That disagreement is useful: the wins are real, and the model is still asking what they prove.`;
    return `MIDA still has ${short} around ${pct(own)} to make the playoffs despite the ${rec} start. The record says relax; the model says earn another week of it.`;
  }
  if(r.l>=2&&own>35){
    if(style==='tilly')return `MIDA still gives ${short} about a ${pct(own)} playoff chance at ${rec}. Apparently the model has more patience than the fan base. Adorable.`;
    if(style==='bartholomew')return `MIDA still gives ${short} roughly a ${pct(own)} playoff chance despite the ${rec} start. The model is displaying a level of restraint the supporters are under no obligation to imitate.`;
    if(style==='jefferson')return `MIDA keeps ${short} around ${pct(own)} for the playoffs despite the ${rec} record. The season is not dead; the argument that nothing is wrong is.`;
    return `MIDA still puts ${short} around ${pct(own)} to make the playoffs at ${rec}. That is enough reason not to panic and nowhere near enough reason to like the start.`;
  }
  if(Number.isFinite(other)&&Math.abs(own-other)>=35){
    const favored=own>other;
    if(style==='tilly')return `MIDA has ${short} around ${pct(own)} for the playoffs and ${oppName} around ${pct(other)}. ${favored?'Lovely. Now avoid becoming the punch line.':'Those numbers are ugly, which at least makes ruining them more fun.'}`;
    if(style==='bartholomew')return `MIDA has ${short} near ${pct(own)} playoff odds against ${oppName}'s ${pct(other)}. ${favored?'The model has supplied confidence; Sunday may now decide whether it was tasteful.':'A gap that rude gives the underdog something satisfying to vandalize.'}`;
    if(style==='jefferson')return `MIDA puts ${short} around ${pct(own)} for the playoffs and ${oppName} around ${pct(other)}. ${favored?'That makes a loss harder to explain, not impossible.':'The gap is real; so is the chance to make it look premature.'}`;
    return `MIDA has ${short} around ${pct(own)} for the playoffs and ${oppName} around ${pct(other)}. ${favored?'That makes Week 3 a chance to confirm the edge instead of merely quoting it.':'The model dislikes the matchup; the useful response is to make the model look stupid.'}`;
  }
  if(title>=10){
    if(style==='tilly')return `MIDA has ${short} around ${pct(own)} for the playoffs and ${pct(title)} for the title. September is apparently already flirting with dangerous levels of confidence.`;
    if(style==='bartholomew')return `MIDA gives ${short} roughly ${pct(own)} playoff odds and ${pct(title)} title odds. That is enough optimism to become socially hazardous if Week 3 cooperates.`;
    if(style==='jefferson')return `MIDA has ${short} around ${pct(own)} for the playoffs and ${pct(title)} for the title. Those are serious numbers; Week 3 gets to test whether the roster deserves serious treatment.`;
    return `MIDA has ${short} around ${pct(own)} for the playoffs and ${pct(title)} for the title. Meaningful context, yes. Permission to hang a September banner, no.`;
  }
  if(own>=85||own<=15){
    if(style==='tilly')return `MIDA has ${short} around ${pct(own)} to make the playoffs. The number is loud enough to mention and still not loud enough to play the games for them.`;
    if(style==='bartholomew')return `MIDA places ${short} around ${pct(own)} for the playoffs. A number that emphatic deserves attention, though not yet champagne.`;
    if(style==='jefferson')return `MIDA puts ${short} around ${pct(own)} to make the playoffs. That is strong context, not a verdict; Week 3 still gets cross-examination.`;
    return `MIDA has ${short} around ${pct(own)} to make the playoffs. Strong signal, not a finished season.`;
  }
  return null;
}

function ledeAside(t,style){
  const a=t?.inquirer_article,f=articleFacts(a),short=shortName(teamName(t));
  if(!Number.isFinite(f.score)||!Number.isFinite(f.rank))return null;
  if(style==='tilly'){
    if(f.rank<=8)return `${short} finished top eight in scoring, so yes, the confidence is allowed. Try not to laminate it after two weeks.`;
    if(f.rank>=25)return `${short} finished bottom eight in scoring. If that was the plan, the plan deserves a refund.`;
    return `${short} landed in the middle of the league. Perfectly legal fantasy football, and about as thrilling as beige carpet.`;
  }
  if(style==='bartholomew'){
    if(f.rank<=8)return `${short} finished top eight in scoring. The good glassware may come out; the family silver should remain locked until Week 3.`;
    if(f.rank>=25)return `${short} finished bottom eight in scoring. One could dress that up, but eventually the tailoring becomes fraud.`;
    return `${short} landed in the middle tier. Respectable is a pleasant adjective and a miserable long-term ambition.`;
  }
  if(style==='jefferson'){
    if(f.rank<=8)return `${short} finished top eight in scoring. That is evidence, not immunity from follow-up questions.`;
    if(f.rank>=25)return `${short} finished bottom eight in scoring. The number has already entered the complaint into the record.`;
    return `${short} landed in the middle. Efficiently inconclusive; Week 3 still has work to do.`;
  }
  if(f.rank<=8)return `${short} finished top eight in scoring. Good. Keep the parade permit in the drawer until the sample size stops being adorable.`;
  if(f.rank>=25)return `${short} finished bottom eight in scoring. The box score has already done most of the insulting.`;
  return `${short} landed in the middle. Fine. “Fine” is what people say when they would prefer no follow-up questions.`;
}

function playerAside(t,style){
  const a=t?.inquirer_article,f=articleFacts(a),p=topStarter(t),short=shortName(teamName(t));
  if(!p||!Number.isFinite(f.score)||!f.score)return null;
  const share=Math.abs(Number(p.points)/f.score*100);
  if(!Number.isFinite(share))return null;
  const name=String(p.name||'The top scorer'),pts=num(p.points),sh=num(share,0);
  if(style==='tilly')return `${name} supplied ${pts}, about ${sh}% of ${short}'s Week 2 points. Useful, yes. Also a friendly reminder that hoping the same person saves dinner every Sunday is not meal planning.`;
  if(style==='bartholomew')return `${name} supplied ${pts}, roughly ${sh}% of ${short}'s Week 2 total. Dependable brilliance is welcome; dependence disguised as a compliment is less charming.`;
  if(style==='jefferson')return `${name} produced ${pts}, about ${sh}% of ${short}'s Week 2 scoring. That concentration matters: praise the result, then ask whether the rest of the lineup can reduce the burden.`;
  return `${name} produced ${pts}, about ${sh}% of ${short}'s Week 2 points. Great line. It also tells the rest of the lineup exactly how much work remains.`;
}

function restoreJetsCousinsHistory(t){
  if(String(t?.team_name||'')!=='New York Jets')return;
  const a=t?.inquirer_article,players=sectionByKind(a,'players');if(!players?.paragraphs)return;
  players.paragraphs=players.paragraphs.map(p=>{
    const text=String(p||'');
    if(!/Kirk Cousins/i.test(text)||/2025/i.test(text))return text;
    return `${text} Cousins averaged 9.1 fantasy points across 10 games in 2025; his 18.82 in Week 2 was a real jump from that baseline, not just a louder version of normal.`;
  });
}

function sharpenTeam(t){
  const a=t?.inquirer_article;if(!a||!Array.isArray(a.sections))return t;
  const style=styleOf(a),lede=a.sections[0],players=sectionByKind(a,'players');
  if(Array.isArray(lede?.paragraphs)){
    const aside=ledeAside(t,style);
    if(aside&&!lede.paragraphs.some(p=>String(p).includes(aside)))lede.paragraphs.push(aside);
  }
  if(Array.isArray(players?.paragraphs)){
    const aside=playerAside(t,style);
    if(aside&&!players.paragraphs.some(p=>String(p).includes(aside)))players.paragraphs.push(aside);
  }
  restoreJetsCousinsHistory(t);
  for(const s of a.sections){
    if(!isOutlook(s)||!Array.isArray(s.paragraphs))continue;
    s.paragraphs=s.paragraphs.filter(p=>!/^MIDA\b/i.test(String(p||'').trim())&&!/\bMIDA (?:still|has|puts|keeps|remains|gives|likes|places)\b/i.test(String(p||'')));
    const m=midaLine(t,style);if(m)s.paragraphs.splice(Math.min(1,s.paragraphs.length),0,m);
  }
  a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r153';
  return t;
}

function rewriteDivisionBoard(out){
  const overview=out?.league_overview,teams=out?.teams||[];
  if(!Array.isArray(overview?.hot_takes))return;
  const board=overview.hot_takes.find(x=>/division board/i.test(String(x?.title||'')));if(!board)return;
  const by=n=>teams.find(t=>String(t?.team_name||'')===n);
  const po=n=>pct(by(n)?.mida_outlook?.playoff),title=n=>pct(by(n)?.mida_outlook?.title),score=n=>num(by(n)?.points),rec=n=>recordText(by(n));
  board.take=[
    `AFC EAST: New England owns the ${rec('New England Patriots')} record, but MIDA has Miami around ${po('Miami Dolphins')} for the playoffs after a ${score('Miami Dolphins')}-point Week 2. The Patriots have the standings; Miami has the model pounding on the door. Nice little argument already.`,
    `AFC NORTH: Baltimore and Cleveland each sit ${rec('Baltimore Ravens')}, but MIDA separates them at roughly ${po('Baltimore Ravens')} and ${po('Cleveland Browns')} playoff odds. Same record, very different level of trust. September loves paperwork like this.`,
    `AFC SOUTH: Tennessee is ${rec('Tennessee Titans')} after only ${score('Tennessee Titans')} points in Week 2, and MIDA still has the Titans around ${po('Tennessee Titans')} for the playoffs. First place is real; dominance is a much funnier claim.`,
    `AFC WEST: Denver is ${rec('Denver Doncos')} with MIDA around ${po('Denver Doncos')}, while the ${rec('Los Angeles Chargers')} Chargers still sit near ${po('Los Angeles Chargers')}. Denver owns the clean record; the division has not agreed to become simple.`,
    `NFC EAST: Philadelphia and Dallas are both ${rec('Philadelphia Eagles')}, yet MIDA has the Eagles around ${po('Philadelphia Eagles')} and Dallas around ${po('Dallas Cowboys')}. Same record, different résumé. Dallas can complain to the spreadsheet after it wins again.`,
    `NFC NORTH: Minnesota, Detroit and Chicago are all ${rec('Minnesota Vikings')}. Minnesota's ${score('Minnesota Vikings')}-point Week 2 plus ${po('Minnesota Vikings')} MIDA playoff odds gives the Vikings the first real separator; everyone else still gets to argue because nobody has earned silence.`,
    `NFC SOUTH: New Orleans is ${rec('New Orleans Aints')}, scored ${score('New Orleans Aints')} in Week 2 and carries about ${po('New Orleans Aints')} playoff odds with ${title('New Orleans Aints')} title odds. The Aints have the rare early luxury of the standings and MIDA telling the same story.`,
    `NFC WEST: Arizona is ${rec('Arizona Cardinals')} after a ${score('Arizona Cardinals')}-point Week 2, but MIDA still has the Cardinals around ${po('Arizona Cardinals')} while San Francisco sits near ${po('San Francisco 49ers')}. Arizona owns September; the model is still making the 49ers show identification before surrendering the long view.`
  ].join('\n');
  const section=(overview.sections||[]).find(s=>/division board/i.test(String(s?.heading||'')));
  if(section) section.paragraphs=board.take.split(/\n/).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR152(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(sharpenTeam);
  rewriteDivisionBoard(out);
  if(out.league_overview)out.league_overview.structure_revision='week2-r153';
  out.structure_revision='week2-r153';
  return out;
}

export const applyWeek2EditorialR153=applyWeek2EditorialR16;
export const applyWeek2EditorialR152=applyWeek2EditorialR16;
export const applyWeek2EditorialR151=applyWeek2EditorialR16;
export const applyWeek2EditorialR150=applyWeek2EditorialR16;
export const applyWeek2EditorialR149=applyWeek2EditorialR16;
export const applyWeek2EditorialR148=applyWeek2EditorialR16;
export const applyWeek2EditorialR147=applyWeek2EditorialR16;
export const applyWeek2EditorialR146=applyWeek2EditorialR16;
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
