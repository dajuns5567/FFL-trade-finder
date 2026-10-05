import {applyWeek2EditorialR16 as applyR169T} from './inquirer-week2-editorial-r169t.mjs';

const HISTORICAL=/\baveraged\s+\d+(?:\.\d+)?\s+fantasy points per game in 2025\b/i;

export function applyWeek2EditorialR16(raw){
  const out=applyR169T(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
    if(players&&Array.isArray(players.paragraphs)){
      const paras=players.paragraphs.slice();
      for(let i=0;i<paras.length;i++){
        if(!HISTORICAL.test(String(paras[i]||'')))continue;
        const historical=String(paras[i]);
        const target=i+1<paras.length?i+1:i-1;
        if(target>=0){
          paras[target]=`${String(paras[target]||'').trim()} ${historical}`.trim();
          paras.splice(i,1);
          i--;
        }
      }
      players.paragraphs=paras;
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169U=applyWeek2EditorialR16;
