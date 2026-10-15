import {applyWeek2EditorialR16 as applyR33} from './inquirer-week2-editorial-r33.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();

function hasHistoricalContext(article,name){
 const paragraphs=(article?.sections||[]).flatMap(s=>s?.paragraphs||[]).map(String);
 const bits=String(name||'').split(/\s+/).filter(Boolean),first=bits[0]||'',last=bits.at(-1)||'';
 const refs=[name,first.length>=4?first:'',last.length>=4?last:''].filter(Boolean);
 return paragraphs.some(p=>/\b(?:2025|last season|last year|prior-season)\b/i.test(p)&&refs.some(ref=>p.toLowerCase().includes(String(ref).toLowerCase())));
}

function addHistoricalContext(team){
 const article=team?.inquirer_article;if(!article)return team;
 const top=(team?.starter_details||[]).slice(0,3);
 const missing=[];
 for(const p of top){
  const name=String(p?.name||'').trim(),prior=Number(p?.prior_season_avg),pts=Number(p?.points),games=Number(p?.prior_season_games)||0;
  if(!name||!Number.isFinite(prior)||prior<=0||!Number.isFinite(pts)||games<6||Math.abs(pts-prior)<Math.max(4,prior*.3))continue;
  if(hasHistoricalContext(article,name))continue;
  const sentence=pts>prior
    ?`${name} finished well above what he usually delivered in 2025, so the Week 2 jump is worth noticing.`
    :`${name} finished well below what he usually delivered in 2025. One bad Sunday is a player-performance problem, not automatically a management problem.`;
  missing.push({name,sentence});
 }
 if(!missing.length)return team;
 const playerSection=(article.sections||[]).find(sec=>/players?|names|people|thing everybody saw|rivals have to respect/i.test(String(sec?.kind||'')+' '+String(sec?.heading||'')))||(article.sections||[])[0];
 if(playerSection){
  playerSection.paragraphs=[...(playerSection.paragraphs||[]),...missing.map(x=>clean(x.sentence))];
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 }
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR33(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(addHistoricalContext);
 out.structure_revision='week2-r34';
 for(const t of out.teams||[])if(t?.inquirer_article)t.inquirer_article.structure_revision='week2-r34';
 if(out.league_overview)out.league_overview.structure_revision='week2-r34';
 return out;
}

export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
