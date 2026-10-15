import {applyWeek2EditorialR16 as applyR169I} from './inquirer-week2-editorial-r169i.mjs';

function deserving(team){
  return (team?.starter_details||[]).filter(p=>{
    const pts=Number(p?.points),prior=Number(p?.prior_season_avg),proj=Number(p?.projected),delta=Number.isFinite(proj)?pts-proj:null;
    return Number.isFinite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
  }).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2);
}

function secondHonor(article,p){
  const name=String(p?.name||'The second standout'),who=String(article?.reporter?.name||'Nick Swindell');
  if(who==='Tilly Fleecer')return `${name} belongs on the Cool Throne too. One good answer was not enough for this section, and leaving the second one out would be needlessly stingy.`;
  if(who==='Bartholomew Roycington III')return `${name} also merits Cool Throne recognition. Excellence need not arrive alone, and this performance deserves acknowledgment without turning the compliment into a ceremony.`;
  if(who==='Jefferson Filch')return `${name} also clears the Cool Throne standard. The evidence supports a second name here, so the recognition should follow the performance instead of stopping after the easiest choice.`;
  return `${name} belongs on the Cool Throne as well. Two players produced enough to earn recognition, so there is no reason to pretend the honor has room for only one.`;
}

function restoreCoolThrone(team){
  const article=team?.inquirer_article,cool=(article?.sections||[]).find(s=>String(s?.kind||'')==='cool-throne'),eligible=deserving(team);
  if(!article||!cool||!Array.isArray(cool.paragraphs)||!cool.paragraphs.length||String(cool.paragraphs[0]).trim().toLowerCase()==='n/a'||eligible.length<2)return;
  let copy=cool.paragraphs.join(' ').toLowerCase();
  for(const p of eligible){
    const name=String(p?.name||'');
    if(!name||copy.includes(name.toLowerCase()))continue;
    cool.paragraphs.push(secondHonor(article,p));
    copy=cool.paragraphs.join(' ').toLowerCase();
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169I(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[])restoreCoolThrone(team);
  return out;
}

export const applyWeek2EditorialR169J=applyWeek2EditorialR16;
