import {applyWeek2EditorialR16 as applyR161} from './inquirer-week2-editorial-r161.mjs';
import {WEEK2_MIDA_2026} from './inquirer-week2-2026-mida-snapshot.mjs';

const midaByName=new Map(WEEK2_MIDA_2026.map(x=>[String(x.name).toLowerCase(),x]));
const teamName=t=>String(t?.team_name||t?.name||'this team');
const mida=t=>midaByName.get(teamName(t).toLowerCase())||null;
const record=t=>{const r=t?.league_context?.record||{};return`${Number(r.wins)||0}-${Number(r.losses)||0}`;};
const score=t=>Number.isFinite(Number(t?.points))?Number(t.points):null;
const pct=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(1)}%`:'n/a';
const style=a=>String(a?.reporter?.name||'Nick Swindell');
const section=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const hash=s=>[...String(s)].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);

function naturalMida(team){
  const a=team?.inquirer_article,m=mida(team);if(!a||!m)return;
  const outlook=(a.sections||[]).find(s=>String(s?.kind||'')==='outlook'||/Week 3|Next Matchup/i.test(String(s?.heading||'')));
  if(!outlook||!Array.isArray(outlook.paragraphs))return;
  outlook.paragraphs=outlook.paragraphs.filter(p=>!/\bMIDA\b/i.test(String(p||'')));
  const rec=record(team),name=teamName(team),po=pct(m.playoff),ttl=pct(m.title),who=style(a);
  let line;
  if(who==='Tilly Fleecer'){
    if(m.playoff>=80)line=`MIDA still likes ${name} at about ${po} to make the playoffs. Lovely. That is permission to feel good, not permission to start engraving anything in September.`;
    else if(m.playoff<=15)line=`MIDA gives ${name} only about a ${po} playoff chance. The model is basically holding the door open on the way out; ${name} can either object on Sunday or accept the insult.`;
    else line=`MIDA has ${name} around ${po} for the playoffs. Useful context, but not enough to make a ${rec} start suddenly glamorous.`;
  }else if(who==='Bartholomew Roycington III'){
    if(m.playoff>=80)line=`MIDA places ${name} near ${po} for the playoffs${Number(m.title)>=5?` and ${ttl} for the title`:''}. Encouraging numbers, certainly; champagne remains an unnecessarily aggressive Week 2 accessory.`;
    else if(m.playoff<=15)line=`MIDA leaves ${name} near ${po} for the playoffs. That is not a death certificate, but it is the sort of number that makes optimism look badly overdressed.`;
    else line=`MIDA keeps ${name} near ${po} for the playoffs. Respectable enough to matter, nowhere near strong enough to settle the argument.`;
  }else if(who==='Jefferson Filch'){
    if(m.playoff>=80)line=`MIDA puts ${name} around ${po} to make the playoffs. That supports the early case, but it also raises the standard: a bad Week 3 will need an explanation, not a shrug.`;
    else if(m.playoff<=15)line=`MIDA has ${name} around ${po} for the playoffs. The season is not over; the burden of proof has simply moved to the roster.`;
    else line=`MIDA puts ${name} around ${po} for the playoffs. The number is useful because it refuses to let the ${rec} record do all the arguing.`;
  }else{
    if(m.playoff>=80)line=`MIDA has ${name} around ${po} to make the playoffs. Good. Now make the number look earned instead of merely flattering.`;
    else if(m.playoff<=15)line=`MIDA has ${name} around ${po} for the playoffs. That is the kind of number that should annoy a locker room more than motivate a eulogy.`;
    else line=`MIDA has ${name} around ${po} for the playoffs. That is context, not cover; Week 3 still has to tell us whether the ${rec} start means anything.`;
  }
  outlook.paragraphs.splice(Math.min(1,outlook.paragraphs.length),0,line);
}

function voiceLine(team,kind){
  const a=team.inquirer_article,name=teamName(team),pts=score(team),who=style(a),rec=record(team),h=hash(name+kind)%3;
  const high=Number.isFinite(pts)&&pts>=100,low=Number.isFinite(pts)&&pts<65;
  if(kind==='management'){
    if(who==='Tilly Fleecer')return h===0?`${name} does not need a motivational poster here; it needs the obvious lineup choice made before Sunday gets funny.`:h===1?`If management has an obvious fix, use it. Fantasy football already supplies enough chaos without ordering extra.`:`The manager gets credit when the choice works and heat when the mistake is avoidable. Revolutionary concept, I know.`;
    if(who==='Bartholomew Roycington III')return h===0?`Management need not perform surgery with a butter knife. Make the obvious correction and allow Sunday to supply the drama.`:h===1?`The roster does not require a philosophical retreat; it requires the sensible choice made on time, which is apparently a luxury item.`:`There is no prize for making a correct lineup decision look complicated. Elegance, in this case, is simply not sabotaging oneself.`;
    if(who==='Jefferson Filch')return h===0?`The management question is narrow: was there an actionable alternative, and was it ignored? If not, blame the player result instead of inventing a crime.`:h===1?`Do not manufacture a management scandal where the roster offered no better answer. Criticism is more useful when it has a decision attached to it.`:`The standard is simple: criticize a choice only when a better choice actually existed. Everything else belongs to player performance.`;
    return h===0?`There is no need to turn this into a seminar. If the better lineup choice was obvious, make it next week and stop donating points.`:h===1?`A manager cannot control every dud. The controllable part is whether the best available answer was sitting on the bench waving.`:`Bad luck is annoying; avoidable lineup mistakes are expensive. Know the difference and fix the one you can actually control.`;
  }
  if(kind==='sentiment'){
    if(who==='Tilly Fleecer')return high?`${name} fans are allowed to enjoy this. I will even permit several unreasonable messages before breakfast.`:low?`${name} supporters watched that scoring total and somehow survived without filing a missing-person report for the offense. Admirable restraint.`:`The fan base has enough evidence to form an opinion and nowhere near enough to become normal about it.`;
    if(who==='Bartholomew Roycington III')return high?`${name} supporters may bask briefly. Please keep the victory lap indoors until Week 3 provides matching furniture.`:low?`${name} supporters are entitled to complain. One can maintain standards without becoming uncivilized, though I see no requirement to make it easy.`:`The public mood is neither celebration nor panic. It is the far less glamorous condition known as paying attention.`;
    if(who==='Jefferson Filch')return high?`${name} gave its supporters a reason to raise expectations. That is useful pressure; the next result now has something to answer to.`:low?`${name} supporters do not need another explanation for the frustration. They need the scoring problem to stop appearing in evidence.`:`The crowd is not confused; it is unconvinced. Another week should either strengthen the case or make the questions louder.`;
    return high?`${name} fans earned the right to be loud for a week. The roster earned exactly one week of not hearing about it.`:low?`${name} fans have every right to be irritated. ${pts} points is not mysterious; it is simply not enough.`:`At ${rec}, nobody needs a parade or a crisis meeting. They need another Sunday with fewer excuses.`;
  }
  return null;
}

function sharpenTeam(team){
  const a=team?.inquirer_article;if(!a||!Array.isArray(a.sections))return team;
  naturalMida(team);
  for(const kind of ['management','sentiment']){
    const s=section(a,kind);if(!s||!Array.isArray(s.paragraphs))continue;
    const line=voiceLine(team,kind);if(line&&!s.paragraphs.some(p=>String(p)===line))s.paragraphs.push(line);
  }
  a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r162';
  return team;
}

function rewriteDivisionBoard(out){
  const o=out?.league_overview;if(!o)return;
  const by=n=>(out.teams||[]).find(t=>teamName(t).toLowerCase()===n.toLowerCase());
  const po=n=>pct(mida(by(n))?.playoff),sc=n=>score(by(n));
  const lines=[
    `AFC EAST — New England is 2-0, but Miami just dropped ${sc('Miami Dolphins')} and MIDA gives the Dolphins a ${po('Miami Dolphins')} playoff chance. The Patriots own first place; Miami owns the division's loudest warning shot. Both facts get to be true.`,
    `AFC NORTH — Baltimore and Cleveland are both unbeaten. MIDA trusts Baltimore at ${po('Baltimore Ravens')} and Cleveland at only ${po('Cleveland Browns')}. Same record, wildly different résumé; the standings are being diplomatic where the model is not.`,
    `AFC SOUTH — Tennessee is 2-0 after scoring ${sc('Tennessee Titans')} in Week 2, while MIDA still sits at ${po('Tennessee Titans')}. First place is real. Calling the offense dominant would require a much stronger imagination.`,
    `AFC WEST — Denver is 2-0 and MIDA is buying it at ${po('Denver Doncos')}; the 1-1 Chargers are still at ${po('Los Angeles Chargers')}. Denver has earned the lead, but the model has not turned the division into a coronation.` ,
    `NFC EAST — Philadelphia and Dallas are both 2-0, yet MIDA has the Eagles at ${po('Philadelphia Eagles')} and Dallas at ${po('Dallas Cowboys')}. Dallas has the same record and considerably less trust. There is your Week 3 chip on the shoulder.` ,
    `NFC NORTH — Minnesota, Detroit and Chicago are all 1-1. Minnesota's ${sc('Minnesota Vikings')}-point Week 2 and ${po('Minnesota Vikings')} MIDA playoff chance are the first real separator. Everyone else is still sharing the same crowded waiting room.` ,
    `NFC SOUTH — New Orleans is 2-0, scored ${sc('New Orleans Aints')} in Week 2 and sits at ${po('New Orleans Aints')} in MIDA. For once, the standings and the model are nodding at each other instead of starting an argument.` ,
    `NFC WEST — Arizona is 2-0 after scoring ${sc('Arizona Cardinals')}, but MIDA has the Cardinals at only ${po('Arizona Cardinals')} while San Francisco remains at ${po('San Francisco 49ers')}. Arizona owns the record; the model is still making them prove they belong at the adult table.`
  ];
  const board=(o.hot_takes||[]).find(x=>/division board/i.test(String(x?.title||'')));
  if(board)board.take=lines.join('\n\n');
  const s=(o.sections||[]).find(x=>/division board/i.test(String(x?.heading||'')));
  if(s)s.paragraphs=lines;
  o.structure_revision='week2-r162';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR161(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(sharpenTeam);
  rewriteDivisionBoard(out);
  out.structure_revision='week2-r162';
  return out;
}

export const applyWeek2EditorialR162=applyWeek2EditorialR16;
export const applyWeek2EditorialR161=applyWeek2EditorialR16;
export const applyWeek2EditorialR160=applyWeek2EditorialR16;
export const applyWeek2EditorialR159=applyWeek2EditorialR16;
export const applyWeek2EditorialR158=applyWeek2EditorialR16;
export const applyWeek2EditorialR157=applyWeek2EditorialR16;
export const applyWeek2EditorialR156=applyWeek2EditorialR16;
export const applyWeek2EditorialR155=applyWeek2EditorialR16;
export const applyWeek2EditorialR154=applyWeek2EditorialR16;
export const applyWeek2EditorialR153=applyWeek2EditorialR16;
