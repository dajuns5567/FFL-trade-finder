import {applyWeek2EditorialR16 as applyR41} from './inquirer-week2-editorial-r41.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function hasHistoricalContext(article,p){
 const name=String(p?.name||''),bits=name.split(/\s+/).filter(Boolean),first=bits[0]||'',last=bits.at(-1)||'';
 const refs=[name,first.length>=4?first:'',last.length>=4?last:''].filter(Boolean);
 const context=/\b(?:2025|last season|last year|prior-season)\b/i;
 return (article?.sections||[]).flatMap(s=>s?.paragraphs||[]).some(raw=>{
  const text=String(raw||'');
  return context.test(text)&&refs.some(ref=>new RegExp('(?:^|\\W)'+esc(ref)+'(?:$|\\W)','i').test(text));
 });
}

function materialTopThree(team){
 return (team?.starter_details||[]).slice(0,3).filter(p=>{
  const prior=Number(p?.prior_season_avg),pts=Number(p?.points),games=Number(p?.prior_season_games)||0;
  return Number.isFinite(prior)&&prior>0&&Number.isFinite(pts)&&games>=6&&Math.abs(pts-prior)>=Math.max(4,prior*.3);
 });
}

function contextParagraph(rid,players){
 const items=players.map(p=>`${p.name} at ${Number(p.prior_season_avg).toFixed(1)} per game`).join(players.length>2?', ':players.length===2?' and ': ');
 if(rid==='tess-delaney')return `For scale, the 2025 averages had ${items}; those old numbers make the Week 2 swings loud enough without another speech.`;
 if(rid==='mack-hollis')return `The 2025 averages offer an inconvenient little comparison: ${items}; those are the numbers that make this Sunday worth judging differently.`;
 if(rid==='nora-voss')return `The 2025 averages narrow the issue: ${items}; each Week 2 result moved far enough from that history to warrant specific attention.`;
 return `The 2025 averages set the scale: ${items}; each Week 2 result moved far enough from that history to matter.`;
}

function restoreMaterialContext(team){
 const article=team?.inquirer_article;if(!article)return team;
 const missing=materialTopThree(team).filter(p=>!hasHistoricalContext(article,p));
 if(!missing.length)return team;
 const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players')||article.sections?.[0];
 if(players)players.paragraphs=[...(players.paragraphs||[]),contextParagraph(String(article?.reporter?.id||''),missing)];
 article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r42';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR41(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(restoreMaterialContext);
 out.structure_revision='week2-r42';
 if(out.league_overview)out.league_overview.structure_revision='week2-r42';
 return out;
}

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
