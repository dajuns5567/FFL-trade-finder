import {applyWeek2EditorialR16 as applyR169T} from './inquirer-week2-editorial-r169t.mjs';

const HISTORICAL=/\baveraged\s+\d+(?:\.\d+)?\s+fantasy points per game in 2025\b/i;

function depthRead(team,article,index){
  const starters=(team?.starter_details||[]).filter(x=>x?.name),p=starters[index%Math.max(1,starters.length)]||starters[0]||{},name=String(p?.name||'the next starter'),next=String(team?.next_opponent_name||team?.upcoming_opponents?.[0]?.team_name||'the Week 3 opponent'),who=String(article?.reporter?.name||'Nick Swindell');
  if(who==='Tilly Fleecer')return `${name} gets another look against ${next}. If ${name}'s Week 2 role survives, lovely; if it vanishes, everyone who planned that particular parade after one Sunday may return the confetti.`;
  if(who==='Bartholomew Roycington III')return `${name} now carries the Week 2 role into ${next}. Repeating ${name}'s useful part would be splendid; discovering it was rented for one afternoon would be considerably less distinguished.`;
  if(who==='Jefferson Filch')return `${name} takes the Week 2 role into ${next}. The useful question is whether ${name}'s opportunity survives contact with a new matchup; if it does not, the one-week conclusion gets dismissed for lack of evidence.`;
  return `${name} takes the Week 2 role into ${next}. Keep ${name}'s opportunity and the result has teeth; lose it immediately and Week 2 becomes a nice story with lousy follow-through.`;
}

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
      while(paras.length<6)paras.push(depthRead(team,article,paras.length));
      players.paragraphs=paras;
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169U=applyWeek2EditorialR16;
