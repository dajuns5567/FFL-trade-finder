import {applyWeek2EditorialR16 as applyR124} from './inquirer-week2-editorial-r124.mjs';

const num=v=>Number(v);
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');
const city=name=>{const bits=String(name||'').trim().split(/\s+/).filter(Boolean);return bits.length>1?bits.slice(0,-1).join(' '):String(name||'Team');};
const fmt=v=>{const x=num(v);if(!Number.isFinite(x))return '';return Math.abs(x-Math.round(x))<1e-9?String(Math.round(x)):x.toFixed(1).replace(/\.0$/,'');};
const signed=v=>{const x=num(v);return Number.isFinite(x)?`${x>0?'+':''}${fmt(x)}`:'';};
const pct=v=>{const x=num(v);return Number.isFinite(x)?`${x>0?'+':''}${x.toFixed(1)}%`:'';};
const ordinal=n=>{const x=Math.trunc(num(n));if(!Number.isFinite(x))return '';const mod100=x%100;if(mod100>=11&&mod100<=13)return `${x}th`;return `${x}${x%10===1?'st':x%10===2?'nd':x%10===3?'rd':'th'}`;};
const titleDivision=value=>String(value||'').trim().split(/\s+/).filter(Boolean).map((p,i)=>i===0?p.toUpperCase():p.charAt(0).toUpperCase()+p.slice(1).toLowerCase()).join(' ');

function cleanPlayerParagraph(p){
  const sentences=String(p||'').split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.filter(s=>!/2025 average was .*usual 2025 level to deserve attention/i.test(s)).join(' ').trim();
}

function rewriteValue(team,section){
  const week=team?.value_history_week||{},movers=team?.value_history_player_movers||{},s=short(team?.team_name);
  const value=num(week?.value),base=num(week?.baseline_value),delta=num(week?.delta),changePct=num(week?.pct);
  if(!Number.isFinite(value)||!Number.isFinite(base)||!Number.isFinite(delta))return;
  const direction=delta>0?'rose':delta<0?'fell':'held steady';
  const magnitude=Math.abs(delta);
  const first=delta===0
    ? `${s}' roster value held steady at ${fmt(value)} this week.`
    : `${s}' roster value ${direction} from ${fmt(base)} to ${fmt(value)} this week, a ${magnitude}-point move (${pct(changePct)}).`;
  const risers=Array.isArray(movers?.risers)?movers.risers:[],fallers=Array.isArray(movers?.fallers)?movers.fallers:[];
  const topUp=risers[0],topDown=fallers[0];
  const paragraphs=[first];
  if(topUp||topDown){
    let second='';
    if(topUp&&topDown)second=`${topUp.player_name} had the largest gain at ${signed(topUp.delta)} (${pct(topUp.pct)}), while ${topDown.player_name} had the largest decline at ${signed(topDown.delta)} (${pct(topDown.pct)}).`;
    else if(topUp)second=`${topUp.player_name} had the largest gain at ${signed(topUp.delta)} (${pct(topUp.pct)}).`;
    else second=`${topDown.player_name} had the largest decline at ${signed(topDown.delta)} (${pct(topDown.pct)}).`;
    second+=` Those moves matter to ${s}' roster value, but they do not grade what happened on Sunday.`;
    paragraphs.push(second);
  }
  const secondUp=risers[1],secondDown=fallers[1];
  if(secondUp||secondDown){
    if(secondUp&&secondDown)paragraphs.push(`${secondUp.player_name} also gained ${Math.abs(num(secondUp.delta))}, while ${secondDown.player_name} lost ${Math.abs(num(secondDown.delta))}.`);
    else if(secondUp)paragraphs.push(`${secondUp.player_name} also gained ${Math.abs(num(secondUp.delta))}.`);
    else paragraphs.push(`${secondDown.player_name} also lost ${Math.abs(num(secondDown.delta))}.`);
  }
  section.paragraphs=paragraphs;
}

function rewriteLede(team,lede){
  if(!lede||!Array.isArray(lede.paragraphs))return;
  const s=short(team?.team_name),division=titleDivision(team?.division_name||team?.division),rank=num(team?.league_context?.week_rank||team?.league_context?.weekly_rank||team?.league_context?.score_rank),divRank=num(team?.division_context?.rank||team?.division_context?.standing_rank);
  lede.paragraphs=lede.paragraphs.map(p=>{
    let text=String(p||'').replace(/\.\s+the\s+([A-Z][A-Za-z'’-]*)\b/g,'. The $1');
    text=text.replace(new RegExp(`${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} scored ([+-]?\\d+(?:\\.\\d+)?), (\\d+) of 32 this week, after ([+-]?\\d+(?:\\.\\d+)?) in Week 1\\. The change was ([+-]?\\d+(?:\\.\\d+)?) points?\\. ${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} changed the scoring picture, but two games are still too early to call that a new normal\\.`,'i'),(_m,score,r,w1,chg)=>`${s} scored ${score} in Week 2, ranking ${ordinal(r)} among 32 teams after ${w1} in Week 1. That was a ${chg}-point change from the opener.`);
    text=text.replace(new RegExp(`In the [A-Z ]+, ${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} sits (?:first|No\\. (\\d+)) after two weeks\\.`,'i'),(_m,captured)=>captured?`${s} are No. ${captured} in the ${division} after two weeks.`:`${s} lead the ${division} after two weeks.`);
    text=text.replace(new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}'?s? fantasy result finished ([^.]+?) its Week 2 projection\\.`,'i'),`${s}' fantasy result finished $1 their Week 2 projection.`);
    return text;
  });
}

function rewriteOutlook(team,outlook){
  if(!outlook||!Array.isArray(outlook.paragraphs)||!outlook.paragraphs.length)return;
  const full=String(team?.team_name||''),s=short(full),opp=String(team?.next_opponent_name||'');
  outlook.paragraphs=outlook.paragraphs.map(p=>String(p||'').replace(new RegExp(`^${full.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} faces ${opp.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} next\\.`),`${s} face ${opp} next.`));
}

function scorePairGrammar(article){
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>{
      let text=String(p||'');
      text=text.replace(/(-?\d+(?:\.\d+)?)–(-\d+(?:\.\d+)?)/g,'$1 to $2');
      text=text.replace(/(-\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)/g,'$1 to $2');
      text=text.replace(/^A (8\d(?:\.\d+)?–\d)/,'An $1');
      return text;
    });
  }
}

function refineTeam(team){
  const article=team?.inquirer_article;if(!article)return team;
  const lede=(article.sections||[]).find(s=>s?.kind==='lede');
  const players=(article.sections||[]).find(s=>s?.kind==='players');
  const value=(article.sections||[]).find(s=>s?.kind==='value');
  const outlook=(article.sections||[]).find(s=>s?.kind==='outlook');
  rewriteLede(team,lede);
  if(players&&Array.isArray(players.paragraphs))players.paragraphs=players.paragraphs.map(cleanPlayerParagraph).filter(Boolean);
  if(value)rewriteValue(team,value);
  rewriteOutlook(team,outlook);
  scorePairGrammar(article);
  article.paragraphs=(article.sections||[]).flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r125';
  return team;
}

function polishOverview(overview){
  if(!overview)return;
  const sections=overview.sections||[];
  for(const section of sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'')
      .replace('New Orleans Aints owns the strongest two-week scoring average','New Orleans Aints own the strongest two-week scoring average')
      .replace('Washington Commanders has the strongest two-week scoring average','Washington Commanders have the strongest two-week scoring average')
      .replace('Washington Commanders is the highest-scoring winless team','Washington Commanders are the highest-scoring winless team')
      .replace('Chargers is the projection favorite; Week 3 will show whether Raiders can make the early number look foolish.','The Chargers are the projection favorite; Week 3 will show whether the Raiders can make the early number look foolish.')
      .replace('move above that baseline','move above that mark'));
  }
  for(const take of overview.hot_takes||[]){
    if(!take?.take)continue;
    take.take=String(take.take)
      .replace('New Orleans Aints has the league\'s strongest','New Orleans Aints have the league\'s strongest')
      .replace('Cleveland Browns is unbeaten','Cleveland Browns are unbeaten')
      .replace(/Miami Dolphins projects for ([\d.]+) against Buffalo Billiards's ([\d.]+) in Week 3, a ([\d.]+)-point edge\. Projections are not points already scored, but that gap makes this the clearest early expectation test of Week 3\./,'Miami Dolphins are projected for $1 against Buffalo at $2 in Week 3, a $3-point gap. That is a large early number; the matchup still has to prove it on Sunday.')
      .replace(/^The division board after two weeks:\n\n[\s\S]*$/m,
`The division board after two weeks:\n\nAFC EAST: New England Patriots (2-0) — The Patriots scored 73 in Week 2; Miami Dolphins are the nearest chaser at 1-1.\nAFC NORTH: Baltimore Ravens (2-0) and Cleveland Browns (2-0) — The Ravens led the tied pair in Week 2 scoring at 69.4.\nAFC SOUTH: Tennessee Titans (2-0) — The Titans scored 56 in Week 2; Indianapolis Colts are the nearest chaser at 1-1.\nAFC WEST: Denver Doncos (2-0) — The Doncos scored 88.7 in Week 2; Los Angeles Chargers are the nearest chaser at 1-1.\nNFC EAST: Philadelphia Eagles (2-0) and Dallas Cowboys (2-0) — The Eagles led the tied pair in Week 2 scoring at 100.\nNFC NORTH: Minnesota Vikings (1-1), Detroit Lions (1-1), and Chicago Bears (1-1) — The Vikings led the tied trio in Week 2 scoring at 121.1.\nNFC SOUTH: New Orleans Aints (2-0) — The Aints scored 115.8 in Week 2; Atlanta Falcons are the nearest chaser at 1-1.\nNFC WEST: Arizona Cardinals (2-0) — The Cardinals scored 123.6 in Week 2; Los Angeles Rams are the nearest chaser at 1-1.`);
  }
  overview.structure_revision='week2-r125';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR124(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refineTeam);
  polishOverview(out.league_overview);
  out.structure_revision='week2-r125';
  return out;
}
export const applyWeek2EditorialR125=applyWeek2EditorialR16;
export const applyWeek2EditorialR124=applyWeek2EditorialR16;
export const applyWeek2EditorialR123=applyWeek2EditorialR16;
export const applyWeek2EditorialR122=applyWeek2EditorialR16;
export const applyWeek2EditorialR121=applyWeek2EditorialR16;
export const applyWeek2EditorialR120=applyWeek2EditorialR16;
export const applyWeek2EditorialR119=applyWeek2EditorialR16;
export const applyWeek2EditorialR118=applyWeek2EditorialR16;
export const applyWeek2EditorialR117=applyWeek2EditorialR16;
export const applyWeek2EditorialR116=applyWeek2EditorialR16;
export const applyWeek2EditorialR115=applyWeek2EditorialR16;
export const applyWeek2EditorialR114=applyWeek2EditorialR16;
export const applyWeek2EditorialR113=applyWeek2EditorialR16;
export const applyWeek2EditorialR112=applyWeek2EditorialR16;
export const applyWeek2EditorialR111=applyWeek2EditorialR16;
export const applyWeek2EditorialR110=applyWeek2EditorialR16;
export const applyWeek2EditorialR109=applyWeek2EditorialR16;
export const applyWeek2EditorialR108=applyWeek2EditorialR16;
export const applyWeek2EditorialR107=applyWeek2EditorialR16;
export const applyWeek2EditorialR106=applyWeek2EditorialR16;
export const applyWeek2EditorialR105=applyWeek2EditorialR16;
export const applyWeek2EditorialR104=applyWeek2EditorialR16;
export const applyWeek2EditorialR103=applyWeek2EditorialR16;
export const applyWeek2EditorialR102=applyWeek2EditorialR16;
export const applyWeek2EditorialR101=applyWeek2EditorialR16;
export const applyWeek2EditorialR100=applyWeek2EditorialR16;
export const applyWeek2EditorialR99=applyWeek2EditorialR16;
export const applyWeek2EditorialR98=applyWeek2EditorialR16;
export const applyWeek2EditorialR97=applyWeek2EditorialR16;
export const applyWeek2EditorialR96=applyWeek2EditorialR16;
export const applyWeek2EditorialR95=applyWeek2EditorialR16;
export const applyWeek2EditorialR94=applyWeek2EditorialR16;
export const applyWeek2EditorialR93=applyWeek2EditorialR16;
export const applyWeek2EditorialR92=applyWeek2EditorialR16;
export const applyWeek2EditorialR91=applyWeek2EditorialR16;
export const applyWeek2EditorialR90=applyWeek2EditorialR16;
export const applyWeek2EditorialR89=applyWeek2EditorialR16;
export const applyWeek2EditorialR88=applyWeek2EditorialR16;
export const applyWeek2EditorialR87=applyWeek2EditorialR16;
export const applyWeek2EditorialR86=applyWeek2EditorialR16;
export const applyWeek2EditorialR85=applyWeek2EditorialR16;
export const applyWeek2EditorialR84=applyWeek2EditorialR16;
export const applyWeek2EditorialR83=applyWeek2EditorialR16;
export const applyWeek2EditorialR82=applyWeek2EditorialR16;
export const applyWeek2EditorialR81=applyWeek2EditorialR16;
export const applyWeek2EditorialR80=applyWeek2EditorialR16;
export const applyWeek2EditorialR79=applyWeek2EditorialR16;
export const applyWeek2EditorialR78=applyWeek2EditorialR16;
export const applyWeek2EditorialR77=applyWeek2EditorialR16;
export const applyWeek2EditorialR76=applyWeek2EditorialR16;
export const applyWeek2EditorialR75=applyWeek2EditorialR16;
export const applyWeek2EditorialR74=applyWeek2EditorialR16;
export const applyWeek2EditorialR73=applyWeek2EditorialR16;
export const applyWeek2EditorialR72=applyWeek2EditorialR16;
export const applyWeek2EditorialR71=applyWeek2EditorialR16;
export const applyWeek2EditorialR70=applyWeek2EditorialR16;
export const applyWeek2EditorialR69=applyWeek2EditorialR16;
export const applyWeek2EditorialR68=applyWeek2EditorialR16;
export const applyWeek2EditorialR67=applyWeek2EditorialR16;
export const applyWeek2EditorialR66=applyWeek2EditorialR16;
export const applyWeek2EditorialR65=applyWeek2EditorialR16;
export const applyWeek2EditorialR64=applyWeek2EditorialR16;
export const applyWeek2EditorialR63=applyWeek2EditorialR16;
export const applyWeek2EditorialR62=applyWeek2EditorialR16;
export const applyWeek2EditorialR61=applyWeek2EditorialR16;
export const applyWeek2EditorialR60=applyWeek2EditorialR16;
export const applyWeek2EditorialR59=applyWeek2EditorialR16;
export const applyWeek2EditorialR58=applyWeek2EditorialR16;
export const applyWeek2EditorialR57=applyWeek2EditorialR16;
export const applyWeek2EditorialR56=applyWeek2EditorialR16;
export const applyWeek2EditorialR55=applyWeek2EditorialR16;
export const applyWeek2EditorialR54=applyWeek2EditorialR16;
export const applyWeek2EditorialR53=applyWeek2EditorialR16;
export const applyWeek2EditorialR52=applyWeek2EditorialR16;
export const applyWeek2EditorialR51=applyWeek2EditorialR16;
export const applyWeek2EditorialR50=applyWeek2EditorialR16;
export const applyWeek2EditorialR49=applyWeek2EditorialR16;
export const applyWeek2EditorialR48=applyWeek2EditorialR16;
export const applyWeek2EditorialR47=applyWeek2EditorialR16;
export const applyWeek2EditorialR46=applyWeek2EditorialR16;
export const applyWeek2EditorialR45=applyWeek2EditorialR16;
export const applyWeek2EditorialR44=applyWeek2EditorialR16;
export const applyWeek2EditorialR43=applyWeek2EditorialR16;
export const applyWeek2EditorialR42=applyWeek2EditorialR16;
export const applyWeek2EditorialR41=applyWeek2EditorialR16;
export const applyWeek2EditorialR40=applyWeek2EditorialR16;
export const applyWeek2EditorialR39=applyWeek2EditorialR16;
export const applyWeek2EditorialR38=applyWeek2EditorialR16;
export const applyWeek2EditorialR37=applyWeek2EditorialR16;
export const applyWeek2EditorialR36=applyWeek2EditorialR16;
export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
