import {applyWeek2EditorialR16 as applyR110} from './inquirer-week2-editorial-r110.mjs';

const punctuate=s=>/[.!?]["'’”)]?$/.test(String(s||'').trim())?String(s):`${String(s||'').trim()}.`;
const grammar=s=>String(s||'')
  .replace(/\b1 carries\b/gi,'1 carry')
  .replace(/\b1 catches\b/gi,'1 catch')
  .replace(/\b1 targets\b/gi,'1 target')
  .replace(/\b1 solo tackles\b/gi,'1 solo tackle')
  .replace(/\b1 assists\b/gi,'1 assist')
  .replace(/\b1 attempts\b/gi,'1 attempt')
  .replace(/\b1 rushing yards\b/gi,'1 rushing yard')
  .replace(/\b1 receiving yards\b/gi,'1 receiving yard')
  .replace(/\b1 passing yards\b/gi,'1 passing yard')
  .replace(/\b1 rush yds\b/gi,'1 rush yd')
  .replace(/\b1 rec yds\b/gi,'1 rec yd');
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');

function rewriteHotSeat(team,section){
  if(!section||!Array.isArray(section.paragraphs))return;
  const reporter=String(team?.inquirer_article?.reporter?.id||'');
  section.paragraphs=section.paragraphs.map(p=>{
    const text=grammar(String(p||''));
    const m=text.match(/^(.+?) gets the harder player-level review after ([+-]?\d+(?:\.\d+)?) points\.(?: The Week 2 role included (.+?)\.)? His 2025 average was ([+-]?\d+(?:\.\d+)?), so the drop is large enough to monitor\.$/i);
    if(!m)return text;
    const [,name,points,role,avg]=m;
    if(reporter==='walter-mercer')return `${name} scored ${points} after averaging ${avg} in 2025.${role?` He still logged ${role}.`:''} The bad result is real; one Sunday is not enough to pretend the role disappeared.`;
    if(reporter==='tess-delaney')return `${name} managed ${points} after a ${avg}-point 2025 average.${role?` The workload still included ${role}.`:''} That number stinks, but I need another week before calling the role broken.`;
    if(reporter==='mack-hollis')return `${name} posted ${points} against a ${avg}-point 2025 average.${role?` The role itself still showed ${role}.`:''} An ugly afternoon gets noticed; it does not get a funeral procession after one week.`;
    return `${name} fell to ${points} after averaging ${avg} in 2025.${role?` The usage still showed ${role}.`:''} The miss is real, but one bad week is not permission to invent a larger crisis.`;
  });
}

function fixTillyLede(team,section){
  if(!section||!Array.isArray(section.paragraphs)||String(team?.inquirer_article?.reporter?.id||'')!=='tess-delaney')return;
  const s=short(team?.team_name);
  section.paragraphs=section.paragraphs.map(p=>{
    let x=String(p||'');
    x=x.replace(/^The scoreboard already brought enough personality\. the ([^.]+) won and backed the result with top-quarter scoring\.$/i,`${s} won with top-quarter scoring. No extra theory needed.`);
    x=x.replace(/^The scoreboard already brought enough personality\. the ([^.]+) landed in the league's middle scoring band, so the result matters more than any sweeping identity statement\.$/i,`${s} landed in the league's middle scoring band, so the result matters more than any grand identity claim.`);
    x=x.replace(/^The scoreboard already brought enough personality\. the ([^.]+) lost with bottom-quarter scoring, which makes the weak production impossible to hide behind the final margin\.$/i,`${s} lost with bottom-quarter scoring; there is nowhere to hide that production.`);
    x=x.replace(/^The scoreboard already brought enough personality\. the ([^.]+) lost despite a top-quarter score, so the offense is not the obvious place to start the blame\.$/i,`${s} lost despite a top-quarter score, so the offense is not where I start the blame.`);
    return x;
  });
}

function refineTeam(team){
  const a=team?.inquirer_article;if(!a)return team;
  for(const section of a.sections||[]){
    rewriteHotSeat(team,String(section?.kind||'')==='hot-seat'?section:null);
    fixTillyLede(team,String(section?.kind||'')==='lede'?section:null);
    if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(p=>punctuate(grammar(p)));
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r111';
  return team;
}

function refineRecap(out){
  for(const section of out?.league_overview?.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'')
      .replace(/one compatible lineup choice can matter/gi,'one start/sit call can swing it')
      .replace(/provide supporting evidence/gi,'actually back it up')
      .replace(/lineup decisions that survive inspection/gi,'lineup decisions that still look smart on Monday')
      .replace(/the standings and the lineup quality are not saying exactly the same thing/gi,'the record and the scoring are telling different stories')
      .replace(/test the roles, lineup corrections and scoring trends we can actually see/gi,'watch whether the same roles, lineup changes and scoring trends show up again'));
  }
}

export function applyWeek2EditorialR16(raw){
  const out=applyR110(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refineTeam);
  refineRecap(out);
  out.structure_revision='week2-r111';
  if(out.league_overview)out.league_overview.structure_revision='week2-r111';
  return out;
}
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
