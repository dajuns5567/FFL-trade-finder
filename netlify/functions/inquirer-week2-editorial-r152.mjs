import {applyWeek2EditorialR16 as applyR151} from './inquirer-week2-editorial-r151.mjs';
import {WEEK2_MIDA_2026} from './inquirer-week2-2026-mida-snapshot.mjs';

const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const midaByName=new Map(WEEK2_MIDA_2026.map(row=>[norm(row.name),row]));
const getMida=name=>midaByName.get(norm(name))||null;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);

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

export function applyWeek2EditorialR16(raw){
  if(!raw||Number(raw.season)!==2026||Number(raw.week)!==2)return applyR151(raw);
  const out=applyR151(attachHistoricalMida(raw));
  out.teams=(out.teams||[]).map(dedupePlayerScores);
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
