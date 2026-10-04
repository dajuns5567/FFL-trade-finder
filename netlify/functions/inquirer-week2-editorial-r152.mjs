import {applyWeek2EditorialR16 as applyR151} from './inquirer-week2-editorial-r151.mjs';
import {WEEK2_MIDA_2026} from './inquirer-week2-2026-mida-snapshot.mjs';

const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const midaByName=new Map(WEEK2_MIDA_2026.map(row=>[norm(row.name),row]));
const getMida=name=>midaByName.get(norm(name))||null;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const difficulty=/\b(?:stiffen|rougher|difficult stretch|hard part|hard stretch|hardens|gauntlet|resistance|heavy part|friendlier|friendly part|softer|manageable|forgiving|breathing room|favorable|mercy|soft landing|lowering the volume|mixed|split schedule|split the|uneven|difficulty level|lands in the middle|split screen)\b/i;

function attachHistoricalMida(raw){
  const out=structuredClone(raw);
  out.teams=(out.teams||[]).map(team=>{
    const own=getMida(team?.team_name||team?.name);
    const nextName=team?.next_opponent_name||team?.opponent_name||'';
    const next=getMida(nextName);
    const upcoming=(team?.upcoming_opponents||[]).map(item=>({
      ...item,
      mida:item?.mida||getMida(item?.team_name||item?.name||item?.opponent_name)
    }));
    return {...team,mida_outlook:own,next_opponent_mida:next,upcoming_opponents:upcoming};
  });
  out.mida_context={as_of:'2026-09-24T01:01:28Z',selected_week:2,historical:true};
  return out;
}

function dedupePlayerScores(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const players=(team?.starter_details||[]).filter(p=>String(p?.name||'').trim()&&Number.isFinite(Number(p?.points)));
  for(const player of players){
    const name=String(player.name).trim(),score=Number(player.points).toFixed(1);
    const nameRe=new RegExp(esc(name),'i');
    const scoreRe=new RegExp(`\\b${esc(score)}(?:-point|\\s+(?:fantasy\\s+)?points?)?\\b`,'i');
    let seen=false;
    for(const section of article.sections){
      if(!Array.isArray(section?.paragraphs))continue;
      section.paragraphs=section.paragraphs.map(paragraph=>sentences(paragraph).map(sentence=>{
        if(!nameRe.test(sentence)||!scoreRe.test(sentence))return sentence;
        if(!seen){seen=true;return sentence;}
        return sentence
          .replace(new RegExp(`after\\s+${esc(score)}\\s+(?:fantasy\\s+)?points?`,'i'),'after that Week 2 performance')
          .replace(new RegExp(`with\\s+${esc(score)}\\s+(?:fantasy\\s+)?points?`,'i'),'with that Week 2 production')
          .replace(new RegExp(`${esc(score)}-point`,'i'),'Week 2')
          .replace(new RegExp(`${esc(score)}\\s+(?:fantasy\\s+)?points?`,'i'),'that Week 2 production')
          .replace(new RegExp(`\\b${esc(score)}\\b`,'i'),'that Week 2 result');
      }).join(' '));
    }
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r152';
  return team;
}

function scheduleStretchLine(team,later){
  const article=team?.inquirer_article||{},reporter=String(article?.reporter?.name||'Nick Swindell');
  const names=later.map(x=>String(x?.team_name||x?.name||'')).filter(Boolean);
  const own=Number(team?.mida_outlook?.playoff);
  const vals=later.map(x=>Number(x?.mida?.playoff)).filter(Number.isFinite);
  const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  const relation=Number.isFinite(own)&&Number.isFinite(avg)?(avg>own+10?'rougher':avg<own-10?'friendlier':'mixed'):'mixed';
  const pair=names.length>1?`${names[0]} and ${names[1]}`:names[0];
  if(reporter==='Tilly Fleecer'){
    if(relation==='friendlier')return `Handle Week 3 and ${pair} make the next stretch friendlier on paper. That is not mercy, but it is close enough that nobody gets to blame the road if the scoring disappears.`;
    if(relation==='rougher')return `Handle Week 3 because ${pair} make the next stretch rougher on paper. Save the victory lap; the schedule has already booked a sequel.`;
    return `Handle Week 3 and ${pair} leave a mixed stretch behind it. Some breathing room, some resistance, and absolutely no excuse to sleepwalk through either one.`;
  }
  if(reporter==='Bartholomew Roycington III'){
    if(relation==='friendlier')return `A Week 3 win would send them toward ${pair}, a friendlier stretch by the numbers. One should bank the advantage before asking the schedule for another favor.`;
    if(relation==='rougher')return `Week 3 matters because ${pair} make the road rougher immediately afterward. Better to bank the result now than negotiate with the gauntlet later.`;
    return `Week 3 leads into ${pair}, a mixed stretch rather than a ceremonial procession. Win first; then decide which part of the schedule deserves the expensive optimism.`;
  }
  if(reporter==='Jefferson Filch'){
    if(relation==='friendlier')return `Bank Week 3 and ${pair} make the next stretch friendlier by the current MIDA outlook. That is useful leverage, not permission to manufacture certainty.`;
    if(relation==='rougher')return `Week 3 is the result to bank before ${pair} make the next stretch rougher by the current MIDA outlook. The schedule is about to ask harder questions.`;
    return `Week 3 comes before ${pair}, and the MIDA outlook reads the stretch as mixed. Win now and the later uncertainty is easier to investigate without inventing a crisis.`;
  }
  if(relation==='friendlier')return `Win Week 3 and ${pair} make the next stretch friendlier on paper. Bank the result now; favorable roads have a habit of looking obvious only after somebody wastes them.`;
  if(relation==='rougher')return `Week 3 is the one to bank before ${pair} make the next stretch rougher. The schedule is about to stop accepting vague answers.`;
  return `Week 3 sits in front of ${pair}, a mixed stretch with both breathing room and resistance. Win now and there is less reason to make the later schedule dramatic.`;
}

function restoreScheduleStretch(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const up=(team?.upcoming_opponents||[]).slice().sort((a,b)=>Number(a.week)-Number(b.week));
  const later=up.slice(1,3);if(!later.length)return team;
  const outlook=article.sections.find(s=>String(s?.kind||'')==='outlook');
  if(!outlook||!Array.isArray(outlook.paragraphs))return team;
  const names=later.map(x=>String(x?.team_name||'').toLowerCase()).filter(Boolean);
  let idx=outlook.paragraphs.findIndex(p=>difficulty.test(String(p||''))&&names.every(n=>String(p||'').toLowerCase().includes(n)));
  let road;
  if(idx>=0)road=outlook.paragraphs.splice(idx,1)[0];
  else road=scheduleStretchLine(team,later);
  if(road){
    const target=Math.max(0,outlook.paragraphs.length-1);
    outlook.paragraphs.splice(target,0,road);
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  return team;
}

function normalizeDivisionBoard(out){
  const board=(out?.league_overview?.hot_takes||[]).find(x=>/division board/i.test(String(x?.title||'')));
  if(!board||typeof board.take!=='string')return;
  const lines=board.take.split('\n');
  board.take=lines.map(line=>{
    if(/^AFC EAST:/i.test(line))return line.replace(/^AFC EAST:\s*The standings say New England at\s*(\d+-\d+);\s*/i,'AFC EAST: New England Patriots ($1) — ');
    if(/^AFC NORTH:/i.test(line))return line.replace(/^AFC NORTH:\s*Baltimore and Cleveland are both\s*(\d+-\d+),\s*/i,'AFC NORTH: Baltimore Ravens ($1) — Cleveland is also $1; ');
    if(/^AFC SOUTH:/i.test(line))return line.replace(/^AFC SOUTH:\s*Tennessee is\s*(\d+-\d+)\s*/i,'AFC SOUTH: Tennessee Titans ($1) — ');
    if(/^AFC WEST:/i.test(line))return line.replace(/^AFC WEST:\s*Denver is\s*(\d+-\d+)\s*/i,'AFC WEST: Denver Doncos ($1) — ');
    if(/^NFC EAST:/i.test(line))return line.replace(/^NFC EAST:\s*Philadelphia and Dallas are both\s*(\d+-\d+)\.\s*/i,'NFC EAST: Philadelphia Eagles ($1) — Dallas is also $1. ');
    if(/^NFC NORTH:/i.test(line))return line.replace(/^NFC NORTH:\s*Nobody gets to hide behind a perfect record because Minnesota, Detroit and Chicago are all\s*(\d+-\d+)\.\s*/i,'NFC NORTH: Minnesota Vikings ($1) — Detroit and Chicago are also $1. ');
    if(/^NFC SOUTH:/i.test(line))return line.replace(/^NFC SOUTH:\s*New Orleans is\s*(\d+-\d+),\s*/i,'NFC SOUTH: New Orleans Aints ($1) — ');
    if(/^NFC WEST:/i.test(line))return line.replace(/^NFC WEST:\s*Arizona is\s*(\d+-\d+)\s*/i,'NFC WEST: Arizona Cardinals ($1) — ');
    return line;
  }).join('\n');
}

export function applyWeek2EditorialR16(raw){
  if(!raw||Number(raw.season)!==2026||Number(raw.week)!==2)return applyR151(raw);
  const out=applyR151(attachHistoricalMida(raw));
  out.teams=(out.teams||[]).map(dedupePlayerScores).map(restoreScheduleStretch);
  normalizeDivisionBoard(out);
  if(out.league_overview)out.league_overview.structure_revision='week2-r152';
  out.structure_revision='week2-r152';
  return out;
}

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
