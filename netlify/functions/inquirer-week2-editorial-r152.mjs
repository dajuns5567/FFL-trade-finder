import {applyWeek2EditorialR16 as applyR151} from './inquirer-week2-editorial-r151.mjs';
import {WEEK2_MIDA_2026} from './inquirer-week2-2026-mida-snapshot.mjs';

const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const midaByName=new Map(WEEK2_MIDA_2026.map(row=>[norm(row.name),row]));
const getMida=name=>midaByName.get(norm(name))||null;
const shortName=n=>String(n||'team').replace(/^(New England|New York|Los Angeles|Las Vegas|San Francisco|Kansas City|New Orleans|Tampa Bay)\s+/,'').trim();
const possessive=n=>/s$/i.test(String(n||''))?`${n}'`:`${n}'s`;
const styleOf=a=>{
  const n=String(a?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'bartholomew';
  if(n==='Jefferson Filch')return'jefferson';
  return'nick';
};

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

function facts(article){
  const text=(article?.sections?.[0]?.paragraphs||[]).join(' ');
  const score=text.match(/scored\s+(-?\d+(?:\.\d+)?)\s+in Week 2/i);
  const rank=text.match(/ranking\s+(\d+)(?:st|nd|rd|th)?\s+among 32/i);
  return {score:score?Number(score[1]):null,rank:rank?Number(rank[1]):null};
}

function voicePunch(team){
  const a=team?.inquirer_article;if(!a)return null;
  const style=styleOf(a),f=facts(a),name=team?.team_name||team?.name||'this team',short=shortName(name);
  const top=(team?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).sort((x,y)=>Number(y.points)-Number(x.points))[0];
  const rank=Number(f.rank),score=Number(f.score),won=Boolean(team?.won);
  if(!Number.isFinite(rank)||!Number.isFinite(score))return null;
  const topName=String(top?.name||'the top scorer'),topPts=Number.isFinite(Number(top?.points))?Number(top.points).toFixed(1):null;
  if(style==='tilly'){
    if(rank<=8&&won)return `${short} finished ${rank}${rank===1?'st':rank===2?'nd':rank===3?'rd':'th'} in Week 2 scoring with ${score.toFixed(1)}. Very rude of the scoreboard to make the optimism reasonable${topPts?`; ${topName}'s ${topPts} points supplied the loudest excuse`:''}.`;
    if(rank>=25)return `${short} finished ${rank}th in scoring with ${score.toFixed(1)}. If the lineup wanted subtle criticism, it should have tried subtle failure.`;
    return `${short} landed ${rank}th with ${score.toFixed(1)}. Perfectly legal fantasy football, but nobody should be charging admission to the victory lap yet.`;
  }
  if(style==='bartholomew'){
    if(rank<=8&&won)return `${possessive(short)} ${rank}${rank===1?'st':rank===2?'nd':rank===3?'rd':'th'}-place Week 2 score of ${score.toFixed(1)} is the sort of arithmetic even I am willing to applaud. One must occasionally let competence into the drawing room.`;
    if(rank>=25)return `${short} placed ${rank}th with ${score.toFixed(1)} points. We may dress the result for dinner, but the scoring total will still arrive wearing work boots.`;
    return `${short} finished ${rank}th with ${score.toFixed(1)} points, a thoroughly middle-class scoring afternoon. Respectable, certainly; intimidating, let us not become unserious.`;
  }
  if(style==='jefferson'){
    if(rank<=8&&won)return `${short} ranked ${rank}${rank===1?'st':rank===2?'nd':rank===3?'rd':'th'} with ${score.toFixed(1)} points. That is actual support for the optimism, which is inconvenient for anyone hoping to prosecute the win as a fluke.`;
    if(rank>=25)return `${short} ranked ${rank}th with ${score.toFixed(1)} points. The record can be entered into evidence; so can the fact that the scoring was bad.`;
    return `${short} ranked ${rank}th with ${score.toFixed(1)} points. The result gets credit, but the scoring does not get diplomatic immunity.`;
  }
  if(rank<=8&&won)return `${short} ranked ${rank}${rank===1?'st':rank===2?'nd':rank===3?'rd':'th'} with ${score.toFixed(1)} points. Good. I have seen enough September coronations to keep the confetti in the box.`;
  if(rank>=25)return `${short} ranked ${rank}th with ${score.toFixed(1)} points. That is not a hidden warning sign; it is the warning sign standing in the driveway.`;
  return `${short} ranked ${rank}th with ${score.toFixed(1)} points. Fine is fine. Fine also has a terrible record of winning fantasy leagues by itself.`;
}

function boostVoice(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const lede=article.sections[0];
  if(!Array.isArray(lede?.paragraphs))return team;
  const punch=voicePunch(team);
  if(punch&&!lede.paragraphs.includes(punch))lede.paragraphs.push(punch);
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r152';
  return team;
}

export function applyWeek2EditorialR16(raw){
  if(!raw||Number(raw.season)!==2026||Number(raw.week)!==2)return applyR151(raw);
  const enriched=attachHistoricalMida(raw);
  const out=applyR151(enriched);
  out.teams=(out.teams||[]).map(boostVoice);
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
