import {applyWeek2EditorialR16 as applyR127} from './inquirer-week2-editorial-r127.mjs';

const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');
const styleOf=article=>{
  const name=String(article?.reporter?.name||'Nick Swindell');
  if(name==='Tilly Fleecer')return 'tilly';
  if(name==='Bartholomew Roycington III')return 'bartholomew';
  if(name==='Jefferson Filch')return 'jefferson';
  return 'nick';
};

function rewriteSentence(text,team,style){
  const s=short(team?.team_name);
  let m;
  if((m=text.match(/^That was a ([+-]?\d+(?:\.\d+)?)-point change from the opener\.$/))){
    const d=m[1];
    if(style==='tilly')return `${s}' Week 2 score moved ${d} points from the opener.`;
    if(style==='bartholomew')return `From Week 1 to Week 2, ${s} changed by ${d} points.`;
    if(style==='jefferson')return `Compared with the opener, ${s} moved ${d} points in Week 2.`;
    return `${s} changed by ${d} points from Week 1.`;
  }
  if((m=text.match(/^(.+?) had the largest gain at ([+-]?\d+(?:\.\d+)?) \(([+-]?\d+(?:\.\d+)?)%\), while (.+?) had the largest decline at ([+-]?\d+(?:\.\d+)?) \(([+-]?\d+(?:\.\d+)?)%\)\.$/))){
    const [,up,upVal,upPct,down,downVal,downPct]=m;
    if(style==='tilly')return `${up} made the biggest value jump at ${upVal} (${upPct}%); ${down} took the biggest hit at ${downVal} (${downPct}%).`;
    if(style==='bartholomew')return `The strongest value gain belonged to ${up} at ${upVal} (${upPct}%); the steepest decline belonged to ${down} at ${downVal} (${downPct}%).`;
    if(style==='jefferson')return `${up} led the roster's value gains at ${upVal} (${upPct}%); ${down} led the losses at ${downVal} (${downPct}%).`;
    return `${up} posted the largest value increase at ${upVal} (${upPct}%); ${down} posted the largest decrease at ${downVal} (${downPct}%).`;
  }
  if((m=text.match(/^(.+?) also gained (\d+(?:\.\d+)?), while (.+?) lost (\d+(?:\.\d+)?)\.$/))){
    const [,up,upVal,down,downVal]=m;
    if(style==='tilly')return `${up} picked up ${upVal} more value points; ${down} gave back ${downVal}.`;
    if(style==='bartholomew')return `Among the secondary moves, ${up} gained ${upVal} and ${down} declined ${downVal}.`;
    if(style==='jefferson')return `${up} added ${upVal} in value; ${down} dropped ${downVal}.`;
    return `The next pair moved opposite ways: ${up} gained ${upVal}, while ${down} lost ${downVal}.`;
  }
  if((m=text.match(/^(.+?) had the largest gain at ([+-]?\d+(?:\.\d+)?) \(([+-]?\d+(?:\.\d+)?)%\)\.$/))){
    const [,up,val,p]=m;
    if(style==='tilly')return `${up} made the roster's biggest value jump at ${val} (${p}%).`;
    if(style==='bartholomew')return `The strongest value gain belonged to ${up}: ${val} (${p}%).`;
    if(style==='jefferson')return `${up} led the roster's value gains at ${val} (${p}%).`;
    return `${up} posted the largest value increase at ${val} (${p}%).`;
  }
  if((m=text.match(/^(.+?) had the largest decline at ([+-]?\d+(?:\.\d+)?) \(([+-]?\d+(?:\.\d+)?)%\)\.$/))){
    const [,down,val,p]=m;
    if(style==='tilly')return `${down} took the roster's biggest value hit at ${val} (${p}%).`;
    if(style==='bartholomew')return `The steepest value decline belonged to ${down}: ${val} (${p}%).`;
    if(style==='jefferson')return `${down} led the roster's value losses at ${val} (${p}%).`;
    return `${down} posted the largest value decrease at ${val} (${p}%).`;
  }
  return text;
}

function refine(team){
  const article=team?.inquirer_article;if(!article)return team;
  const style=styleOf(article);
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').split(/(?<=[.!?])\s+/).map(sentence=>rewriteSentence(sentence,team,style)).join(' '));
  }
  article.paragraphs=(article.sections||[]).flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r128';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR127(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refine);
  out.structure_revision='week2-r128';
  if(out.league_overview)out.league_overview.structure_revision='week2-r128';
  return out;
}
export const applyWeek2EditorialR128=applyWeek2EditorialR16;
export const applyWeek2EditorialR127=applyWeek2EditorialR16;
export const applyWeek2EditorialR126=applyWeek2EditorialR16;
export const applyWeek2EditorialR125=applyWeek2EditorialR16;
export const applyWeek2EditorialR124=applyWeek2EditorialR16;
export const applyWeek2EditorialR123=applyWeek2EditorialR16;
export const applyWeek2EditorialR122=applyWeek2EditorialR16;
export const applyWeek2EditorialR121=applyWeek2EditorialR16;
export const applyWeek2EditorialR120=applyWeek2EditorialR16;
export const applyWeek2EditorialR119=applyWeek2EditorialR16;
export const applyWeek2EditorialR118=applyWeek2EditorialR16;
export const applyWeek2EditorialR117=applyWeek2EditorialR16;
export const applyWeek2EditorialR116=applyWeek2EditorialR16;
export const applyWeek2EditorialR115=applyWeek2EditorialR16;
export const applyWeek2EditorialR114=applyWeek2EditorialR16;
export const applyWeek2EditorialR113=applyWeek2EditorialR16;
export const applyWeek2EditorialR112=applyWeek2EditorialR16;
export const applyWeek2EditorialR111=applyWeek2EditorialR16;
export const applyWeek2EditorialR110=applyWeek2EditorialR16;
export const applyWeek2EditorialR109=applyWeek2EditorialR16;
export const applyWeek2EditorialR108=applyWeek2EditorialR16;
export const applyWeek2EditorialR107=applyWeek2EditorialR16;
export const applyWeek2EditorialR106=applyWeek2EditorialR16;
export const applyWeek2EditorialR105=applyWeek2EditorialR16;
export const applyWeek2EditorialR104=applyWeek2EditorialR16;
export const applyWeek2EditorialR103=applyWeek2EditorialR16;
export const applyWeek2EditorialR102=applyWeek2EditorialR16;
export const applyWeek2EditorialR101=applyWeek2EditorialR16;
export const applyWeek2EditorialR100=applyWeek2EditorialR16;
export const applyWeek2EditorialR99=applyWeek2EditorialR16;
export const applyWeek2EditorialR98=applyWeek2EditorialR16;
export const applyWeek2EditorialR97=applyWeek2EditorialR16;
export const applyWeek2EditorialR96=applyWeek2EditorialR16;
export const applyWeek2EditorialR95=applyWeek2EditorialR16;
export const applyWeek2EditorialR94=applyWeek2EditorialR16;
export const applyWeek2EditorialR93=applyWeek2EditorialR16;
export const applyWeek2EditorialR92=applyWeek2EditorialR16;
export const applyWeek2EditorialR91=applyWeek2EditorialR16;
export const applyWeek2EditorialR90=applyWeek2EditorialR16;
export const applyWeek2EditorialR89=applyWeek2EditorialR16;
export const applyWeek2EditorialR88=applyWeek2EditorialR16;
export const applyWeek2EditorialR87=applyWeek2EditorialR16;
export const applyWeek2EditorialR86=applyWeek2EditorialR16;
export const applyWeek2EditorialR85=applyWeek2EditorialR16;
export const applyWeek2EditorialR84=applyWeek2EditorialR16;
export const applyWeek2EditorialR83=applyWeek2EditorialR16;
export const applyWeek2EditorialR82=applyWeek2EditorialR16;
export const applyWeek2EditorialR81=applyWeek2EditorialR16;
export const applyWeek2EditorialR80=applyWeek2EditorialR16;
export const applyWeek2EditorialR79=applyWeek2EditorialR16;
export const applyWeek2EditorialR78=applyWeek2EditorialR16;
export const applyWeek2EditorialR77=applyWeek2EditorialR16;
export const applyWeek2EditorialR76=applyWeek2EditorialR16;
export const applyWeek2EditorialR75=applyWeek2EditorialR16;
export const applyWeek2EditorialR74=applyWeek2EditorialR16;
export const applyWeek2EditorialR73=applyWeek2EditorialR16;
export const applyWeek2EditorialR72=applyWeek2EditorialR16;
export const applyWeek2EditorialR71=applyWeek2EditorialR16;
export const applyWeek2EditorialR70=applyWeek2EditorialR16;
export const applyWeek2EditorialR69=applyWeek2EditorialR16;
export const applyWeek2EditorialR68=applyWeek2EditorialR16;
export const applyWeek2EditorialR67=applyWeek2EditorialR16;
export const applyWeek2EditorialR66=applyWeek2EditorialR16;
export const applyWeek2EditorialR65=applyWeek2EditorialR16;
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
