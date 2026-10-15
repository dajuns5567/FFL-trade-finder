import {applyWeek2EditorialR16 as applyR134} from './inquirer-week2-editorial-r134.mjs';

const teamName=team=>String(team?.name||team?.team_name||team?.mida_outlook?.name||'this team');
const shortName=name=>String(name||'team').replace(/^(New England|New York|Los Angeles|Las Vegas|San Francisco|Kansas City|New Orleans|Tampa Bay)\s+/,'').trim();
const pct=n=>Number.isFinite(Number(n))?`${Number(n).toFixed(1)}%`:'n/a';
const wins=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'n/a';
const reporterStyle=article=>{
  const n=String(article?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'bartholomew';
  if(n==='Jefferson Filch')return'jefferson';
  return'nick';
};
const isManagement=h=>/management|decisions that survived/i.test(String(h||''));
const isFan=h=>/crowd|public emotion/i.test(String(h||''));
const isOutlook=h=>/week 3|next matchup/i.test(String(h||''));

function week2Facts(article){
  const lede=(article?.sections?.[0]?.paragraphs||[]).join(' ');
  const score=lede.match(/scored\s+(-?\d+(?:\.\d+)?)\s+in Week 2/i);
  const rank=lede.match(/ranking\s+(\d+)(?:st|nd|rd|th)?\s+among 32/i);
  const record=lede.match(/(?:record(?: now)? (?:sits at|is)|leaves them|left .*? at)\s*(\d+-\d+)/i);
  return {score:score?Number(score[1]):null,rank:rank?Number(rank[1]):null,record:record?.[1]||null};
}

function ledeVoice(team,style){
  const name=teamName(team),short=shortName(name),f=week2Facts(team.inquirer_article);
  if(!Number.isFinite(f.rank)||!Number.isFinite(f.score))return null;
  if(f.rank<=8){
    if(style==='tilly')return `${short} finished ${f.rank}th in Week 2 scoring with ${f.score}. That is the sort of Sunday that lets a manager act smug for six days, which is frankly more than most of them deserve.`;
    if(style==='bartholomew')return `${short} finished ${f.rank}th in Week 2 scoring with ${f.score}. One may call that excellent work without commissioning a statue; the marble can wait until the roster repeats it.`;
    if(style==='jefferson')return `${short} finished ${f.rank}th in Week 2 scoring with ${f.score}. Good teams are allowed to enjoy good numbers, although apparently they must first survive everyone declaring the season solved.`;
    return `${short} finished ${f.rank}th in Week 2 scoring with ${f.score}. That is a good Sunday. Enjoy it without turning two weeks of fantasy football into a documentary about destiny.`;
  }
  if(f.rank>=25){
    if(style==='tilly')return `${short} finished ${f.rank}th in Week 2 scoring with ${f.score}. At that point the box score is not asking for analysis; it is banging pots together until somebody fixes something.`;
    if(style==='bartholomew')return `${short} finished ${f.rank}th in Week 2 scoring with ${f.score}. A gentleman can dress that number in a fine jacket, but it remains an alarming number wearing borrowed clothes.`;
    if(style==='jefferson')return `${short} finished ${f.rank}th in Week 2 scoring with ${f.score}. There are subtle warning signs, and then there is finishing in the bottom eight and asking everyone to admire the nuance.`;
    return `${short} finished ${f.rank}th in Week 2 scoring with ${f.score}. The box score is not being mysterious here; it is holding up a sign and asking the roster to read it.`;
  }
  if(style==='tilly')return `${short} landed ${f.rank}th in Week 2 scoring with ${f.score}. Perfectly survivable, deeply unglamorous, and not nearly good enough to start acting like the league has been conquered.`;
  if(style==='bartholomew')return `${short} landed ${f.rank}th in Week 2 scoring with ${f.score}. Respectable is a pleasant adjective and a dreadful long-term ambition.`;
  if(style==='jefferson')return `${short} landed ${f.rank}th in Week 2 scoring with ${f.score}. Middle-of-the-pack production is not a crisis; it is merely a very efficient way to avoid learning whether the roster is actually good.`;
  return `${short} landed ${f.rank}th in Week 2 scoring with ${f.score}. That is survivable. It is also the fantasy equivalent of answering "fine" when somebody asks how things are going.`;
}

function managementVoice(team,style,section){
  const name=teamName(team),short=shortName(name),text=(section.paragraphs||[]).join(' ');
  const obvious=/outscored .*? by \d|management mistake|actual alternative on the bench/i.test(text);
  if(obvious){
    if(style==='tilly')return `${short} had a real bench answer and ignored it. That is not bad luck; that is stepping on the rake and then demanding a weather report.`;
    if(style==='bartholomew')return `${short} had a genuine alternative available. We may call the mistake unfortunate, but etiquette does not require us to call it mysterious.`;
    if(style==='jefferson')return `${short} had a playable answer on the bench and chose otherwise. At some point "variance" has to stop getting blamed for decisions it did not make.`;
    return `${short} had a real alternative on the bench. That is the useful criticism: specific, fixable, and much harder to hide behind the word luck.`;
  }
  if(style==='tilly')return `${short} does not get a fake lineup scandal just because outrage is more entertaining. The manager is excused; the players can explain the body-shaped dent in the box score.`;
  if(style==='bartholomew')return `${short} offers no proper lineup scandal this week. Management may leave the room with its dignity intact while the players remain to explain the unpleasant arithmetic.`;
  if(style==='jefferson')return `${short} did not leave an obvious better answer on the bench. Management is acquitted for lack of evidence; the production still has several questions to answer.`;
  return `${short} did not leave an obvious better answer on the bench. The manager gets out of this one; the players do not get to send bad luck in as their attorney.`;
}

function fanVoice(team,style){
  const name=teamName(team),short=shortName(name),f=week2Facts(team.inquirer_article),record=f.record||'';
  if(/^0-2$/.test(record)){
    if(style==='tilly')return `At 0-2, asking ${short} fans for patience is basically asking a smoke alarm to use its indoor voice.`;
    if(style==='bartholomew')return `At 0-2, ${short} supporters are entitled to impatience. One cannot serve two losses and then complain that the guests have become difficult.`;
    if(style==='jefferson')return `At 0-2, ${short} fans are not overreacting by noticing the zero. The standings placed it there without consulting their feelings.`;
    return `At 0-2, ${short} fans are allowed to be irritated. Two losses is not a character test; it is a record that needs fixing.`;
  }
  if(/^2-0$/.test(record)){
    if(style==='tilly')return `At 2-0, ${short} fans have earned the right to be obnoxiously pleased for a week. Somebody else can be the adult until Sunday.`;
    if(style==='bartholomew')return `At 2-0, ${short} supporters may enjoy themselves. Restraint is admirable, but so is knowing when the champagne flute has a legitimate purpose.`;
    if(style==='jefferson')return `At 2-0, ${short} fans can celebrate without submitting a disclaimer. The record is real even if Week 3 eventually introduces consequences.`;
    return `At 2-0, ${short} fans have earned some swagger. Just keep enough of it in reserve for the first Sunday that refuses to cooperate.`;
  }
  if(style==='tilly')return `${short} fans are at 1-1, the perfect record for turning every Week 3 opinion into either a coronation or a hostage note.`;
  if(style==='bartholomew')return `${short} supporters sit at 1-1, a record that permits optimism and panic in equal measure. Naturally, everyone will choose whichever emotion is least dignified.`;
  if(style==='jefferson')return `${short} fans are at 1-1. This is the portion of the season where one more result will be treated as a personality diagnosis, because moderation has apparently been canceled.`;
  return `${short} fans are at 1-1, which means Week 3 is about to be treated as either proof of life or the beginning of civilization's collapse. Fantasy football remains normal.`;
}

function midaVoice(team,style){
  const own=team?.mida_outlook,opp=team?.next_opponent_mida;
  if(!own||!opp||!Number.isFinite(Number(own.playoff))||!Number.isFinite(Number(opp.playoff)))return null;
  const name=teamName(team),short=shortName(name),opponent=String(opp.name||'the next opponent');
  const ownP=pct(own.playoff),oppP=pct(opp.playoff),ownW=wins(own.expected_wins),oppW=wins(opp.expected_wins);
  if(style==='tilly')return `MIDA has ${short} at ${ownP} playoff odds and ${ownW} expected wins, versus ${opponent} at ${oppP} and ${oppW}. So yes, the numbers already have an opinion about Week 3, because apparently waiting politely for Sunday was too much to ask.`;
  if(style==='bartholomew')return `MIDA gives ${short} ${ownP} playoff odds and ${ownW} expected wins; ${opponent} sits at ${oppP} and ${oppW}. The model has shown its hand rather early, which at least gives Sunday something specific to embarrass or confirm.`;
  if(style==='jefferson')return `MIDA sees ${short} at ${ownP} playoff odds and ${ownW} expected wins, compared with ${opponent} at ${oppP} and ${oppW}. Those numbers are not destiny; they are simply a useful way to know which side has more explaining to do if Week 3 goes sideways.`;
  return `MIDA has ${short} at ${ownP} playoff odds and ${ownW} expected wins, against ${opponent} at ${oppP} and ${oppW}. It is not a prophecy. It is a very specific reminder that one of these teams has a lot more margin for nonsense than the other.`;
}

function addVoice(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const style=reporterStyle(article);
  const lede=ledeVoice(team,style);
  if(lede&&!article.sections[0].paragraphs.some(p=>p===lede))article.sections[0].paragraphs.push(lede);
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    if(isManagement(section.heading)){
      const line=managementVoice(team,style,section);
      if(line&&!section.paragraphs.includes(line))section.paragraphs.push(line);
    }
    if(isFan(section.heading)){
      const line=fanVoice(team,style);
      if(line&&!section.paragraphs.includes(line))section.paragraphs.push(line);
    }
    if(isOutlook(section.heading)){
      const line=midaVoice(team,style);
      if(line&&!section.paragraphs.some(p=>/\bMIDA\b/i.test(p)))section.paragraphs.splice(Math.min(1,section.paragraphs.length),0,line);
    }
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r135';
  return team;
}

function fixRenderedDivisionBoard(overview){
  if(!Array.isArray(overview?.hot_takes))return;
  const board=overview.hot_takes.find(x=>/division board/i.test(String(x?.title||'')));
  if(!board)return;
  board.take=`The division board after two weeks:\n\nAFC EAST: New England Patriots are 2-0, but Miami just detonated a 142.4-point Week 2. New England owns the record; Miami owns the score that makes the rest of the division stare at the ceiling for a minute.\nAFC NORTH: Baltimore Ravens and Cleveland Browns are both 2-0 after scoring 69.4 and 54.5 in Week 2. Two perfect records, neither of which should be mistaken for an offensive parade.\nAFC SOUTH: Tennessee Titans are 2-0 after a 56-point Week 2, with Indianapolis at 1-1. Tennessee has the lead and a scoring total that politely asks everyone not to get carried away.\nAFC WEST: Denver Doncos are 2-0 after 88.7 in Week 2, while the Chargers sit 1-1. Denver has earned first place; the division has not yet agreed to become boring.\nNFC EAST: Philadelphia Eagles and Dallas Cowboys are both 2-0. Philadelphia scored 100 and Dallas won by 65.8, so at least this pair of perfect records arrived with enough muscle to avoid an immediate cross-examination.\nNFC NORTH: Minnesota, Detroit and Chicago are all 1-1. Minnesota's 121.1 was the best Week 2 score of the three, which is currently the closest thing this division has to somebody grabbing the steering wheel.\nNFC SOUTH: New Orleans Aints are 2-0 after 115.8 in Week 2 and carry the strongest two-week scoring case among the division leaders. Atlanta is 1-1; right now the Aints have the record and the better argument.\nNFC WEST: Arizona Cardinals are 2-0 after 123.6 in Week 2, with the Rams at 1-1. Arizona has a clean record plus a real scoring flex, which is considerably more convincing than simply being undefeated and hoping nobody checks the math.`;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR134(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(addVoice);
  fixRenderedDivisionBoard(out.league_overview);
  if(out.league_overview)out.league_overview.structure_revision='week2-r135';
  out.structure_revision='week2-r135';
  return out;
}

export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
