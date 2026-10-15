import {applyWeek2EditorialR16 as applyR47} from './inquirer-week2-editorial-r47.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function eligibleCoolPlayers(team){
 return (team?.starter_details||[]).filter(p=>{
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),proj=Number(p?.projected),delta=Number.isFinite(proj)?pts-proj:null;
  return Number.isFinite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
 }).sort((a,b)=>Number(b?.points)-Number(a?.points)).slice(0,2);
}

function expandCoolThroneNames(team){
 const article=team?.inquirer_article;if(!article)return team;
 const cool=(article.sections||[]).find(s=>String(s?.kind||'')==='cool-throne');
 if(!cool||!Array.isArray(cool.paragraphs))return team;
 const eligible=eligibleCoolPlayers(team);
 if(eligible.length<2)return team;
 for(const player of eligible){
  const full=String(player?.name||'').trim();if(!full)continue;
  const current=cool.paragraphs.join(' ');
  if(current.toLowerCase().includes(full.toLowerCase()))continue;
  const last=full.split(/\s+/).filter(Boolean).at(-1)||'';if(last.length<3)continue;
  const re=new RegExp(`(^|\\W)${esc(last)}(?=$|\\W)`,'i');
  for(let i=0;i<cool.paragraphs.length;i++){
   if(!re.test(String(cool.paragraphs[i]||'')))continue;
   cool.paragraphs[i]=String(cool.paragraphs[i]).replace(re,(m,prefix)=>`${prefix}${full}`);
   break;
  }
 }
 article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r48';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR47(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(expandCoolThroneNames);
 out.structure_revision='week2-r48';
 if(out.league_overview)out.league_overview.structure_revision='week2-r48';
 return out;
}

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
