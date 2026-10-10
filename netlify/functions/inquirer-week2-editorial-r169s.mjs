import {applyWeek2EditorialR16 as applyR169R} from './inquirer-week2-editorial-r169r.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const sentences=s=>clean(s).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fmt=n=>{const x=Number(n);return Number.isFinite(x)?(Math.abs(x-Math.round(x))<1e-9?String(Math.round(x)):x.toFixed(1).replace(/0+$/,'').replace(/\.$/,'')):''};

function enforceCanonicalPlayerScore(team,name){
  const article=team?.inquirer_article,player=(team?.starter_details||[]).find(p=>String(p?.name||'').toLowerCase()===name.toLowerCase());
  if(!article||!player)return;
  const score=fmt(player.points);if(!score)return;
  const nameRe=new RegExp(`\\b${esc(name)}\\b`,'i'),scoreRe=new RegExp(`(^|[^0-9.])${esc(score)}(?![0-9]|\\.[0-9])`);
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>sentences(paragraph).filter(sentence=>!(nameRe.test(sentence)&&scoreRe.test(sentence))).join(' ')).filter(Boolean);
  }
  const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
  if(players){
    if(!Array.isArray(players.paragraphs))players.paragraphs=[];
    const football=String(player.real_stat_line||'').trim();
    players.paragraphs.unshift(`${name} scored ${score} fantasy points in Week 2${football?` with ${football}`:''}.`);
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169R(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  const aints=(out.teams||[]).find(t=>/new orleans aints/i.test(String(t?.team_name||'')));
  if(aints){
    enforceCanonicalPlayerScore(aints,'Jaxon Smith-Njigba');
    enforceCanonicalPlayerScore(aints,'Maxx Crosby');
  }
  return out;
}

export const applyWeek2EditorialR169S=applyWeek2EditorialR16;
