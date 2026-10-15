import {applyWeek2EditorialR16 as applyR63} from './inquirer-week2-editorial-r63.mjs';

function playerNameFromStat(text){
  const s=String(text||'').trim();
  const m=s.match(/^(.+?)\s+scored\s+\d/i);
  return m?.[1]?.trim()||'';
}

function cleanTeam(team){
  const article=team?.inquirer_article;if(!article)return team;
  const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
  if(players&&Array.isArray(players.paragraphs)){
    players.paragraphs=players.paragraphs.map((p,i)=>{
      let text=String(p||'');
      if(text.includes('The production deserves criticism; it does not create a management mistake by itself.')){
        const name=playerNameFromStat(players.paragraphs[i-1]);
        const subject=name?`${name}'s production`:'This production';
        text=text.replace('The production deserves criticism; it does not create a management mistake by itself.',`${subject} deserves criticism; it does not create a management mistake by itself.`);
      }
      return text;
    });
  }
  const cool=(article.sections||[]).find(s=>String(s?.kind||'')==='cool-throne');
  if(cool&&Array.isArray(cool.paragraphs)){
    cool.paragraphs=cool.paragraphs.map(p=>String(p||'').replace(/received real production from more than one place instead of asking one player to rescue the entire afternoon\./gi,'received real production from several lineup spots, giving Week 3 more than one trustworthy option.'));
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r64';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR63(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(cleanTeam);
  out.structure_revision='week2-r64';
  if(out.league_overview)out.league_overview.structure_revision='week2-r64';
  return out;
}
export const applyWeek2EditorialR64=applyWeek2EditorialR16;
export const applyWeek2EditorialR63=applyWeek2EditorialR16;
export const applyWeek2EditorialR62=applyWeek2EditorialR16;
export const applyWeek2EditorialR61=applyWeek2EditorialR16;
export const applyWeek2EditorialR60=applyWeek2EditorialR16;
export const applyWeek2EditorialR59=applyWeek2EditorialR16;
export const applyWeek2EditorialR58=applyWeek2EditorialR16;
export const applyWeek2EditorialR57=applyWeek2EditorialR16;
export const applyWeek2EditorialR56=applyWeek2EditorialR16;
export const applyWeek2EditorialR55=applyWeek2EditorialR16;
export const applyWeek2EditorialR54=applyWeek2EditorialR16;
export const applyWeek2EditorialR53=applyWeek2EditorialR16;
export const applyWeek2EditorialR52=applyWeek2EditorialR16;
export const applyWeek2EditorialR51=applyWeek2EditorialR16;
export const applyWeek2EditorialR50=applyWeek2EditorialR16;
export const applyWeek2EditorialR49=applyWeek2EditorialR16;
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
