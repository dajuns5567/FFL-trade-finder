import {applyWeek2EditorialR16 as applyR169G} from './inquirer-week2-editorial-r169g.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const sentences=s=>clean(s).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function enforcePlayerScore(team,name){
  const article=team?.inquirer_article;if(!article)return;
  const player=(team?.starter_details||[]).find(p=>String(p?.name||'').toLowerCase()===name.toLowerCase());
  const pts=Number(player?.points);if(!Number.isFinite(pts))return;
  const score=Number.isInteger(pts)?String(pts):String(pts).replace(/0+$/,'').replace(/\.$/,'');
  const scoreRe=new RegExp(`(^|[^0-9.])${esc(score)}(?![0-9]|\\.[0-9])`);
  const nameRe=new RegExp(`\\b${esc(name)}\\b`,'i');

  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>sentences(paragraph).map(sentence=>{
      if(nameRe.test(sentence)&&scoreRe.test(sentence))return clean(sentence.replace(scoreRe,(m,prefix)=>`${prefix}that total`));
      return sentence;
    }).join(' '));
  }

  const target=(article.sections||[]).find(s=>/Names Rivals|player|respect/i.test(String(s?.heading||'')))||(article.sections||[]).find(s=>Array.isArray(s?.paragraphs));
  if(target){
    if(!Array.isArray(target.paragraphs))target.paragraphs=[];
    target.paragraphs.unshift(`${name} scored ${score} fantasy points in Week 2, the one clean number this article needs to state before moving on to what the performance means.`);
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

function enforceBreakout(out){
  const take=(out?.league_overview?.hot_takes||[]).find(x=>/breakout player to watch/i.test(String(x?.title||'')));
  if(!take)return;
  take.take='Dallas Turner is still building a legitimate breakout case. Another disruptive Sunday made the Week 3 question simple: if that role holds, leaving him on the bench starts looking stubborn rather than cautious.';
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169G(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  enforceBreakout(out);
  const aints=(out.teams||[]).find(t=>/new orleans aints/i.test(String(t?.team_name||'')));
  if(aints){
    enforcePlayerScore(aints,'Maxx Crosby');
    enforcePlayerScore(aints,'Jaxon Smith-Njigba');
  }
  return out;
}

export const applyWeek2EditorialR169H=applyWeek2EditorialR16;
