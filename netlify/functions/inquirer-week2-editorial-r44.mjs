import {applyWeek2EditorialR16 as applyR43} from './inquirer-week2-editorial-r43.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function articleCopy(article){
 return (article?.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' ');
}

function hasShortReference(article,top){
 const copy=articleCopy(article);
 return top.some(p=>{
  const name=String(p?.name||'').trim();
  if(!name)return false;
  const bits=name.split(/\s+/).filter(Boolean),first=bits[0]||'',last=bits.at(-1)||'';
  const withoutFull=copy.split(name).join(' ');
  return [first,last].filter(x=>x&&x.length>=4).some(token=>new RegExp('(?:^|\\W)'+esc(token)+'(?:$|\\W)','i').test(withoutFull));
 });
}

function shortenExistingRepeat(team){
 const article=team?.inquirer_article;if(!article)return team;
 const top=(team?.starter_details||[]).slice(0,3);
 if(hasShortReference(article,top))return team;
 const copy=articleCopy(article);
 for(const p of top){
  const name=String(p?.name||'').trim(),bits=name.split(/\s+/).filter(Boolean),last=bits.at(-1)||'';
  if(!name||last.length<4||last===name||copy.split(name).length-1<2)continue;
  const sections=article.sections||[];
  let changed=false;
  for(let si=sections.length-1;si>=0&&!changed;si--){
   const paragraphs=sections[si]?.paragraphs||[];
   for(let pi=paragraphs.length-1;pi>=0;pi--){
    const text=String(paragraphs[pi]||''),idx=text.lastIndexOf(name);
    if(idx<0)continue;
    paragraphs[pi]=text.slice(0,idx)+last+text.slice(idx+name.length);
    changed=true;
    break;
   }
  }
  if(changed){
   article.paragraphs=sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
   article.structure_revision='week2-r44';
   return team;
  }
 }
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR43(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(shortenExistingRepeat);
 out.structure_revision='week2-r44';
 if(out.league_overview)out.league_overview.structure_revision='week2-r44';
 return out;
}

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
