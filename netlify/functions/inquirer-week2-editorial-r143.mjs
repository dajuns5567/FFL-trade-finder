import {applyWeek2EditorialR16 as applyR142} from './inquirer-week2-editorial-r142.mjs';

const pct=n=>Number.isFinite(Number(n))?`${Number(n).toFixed(1)}%`:'n/a';
const wins=n=>Number.isFinite(Number(n))?Number(n).toFixed(1):'n/a';
const reporterStyle=article=>{
  const n=String(article?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'bartholomew';
  if(n==='Jefferson Filch')return'jefferson';
  return'nick';
};
const mascot=name=>String(name||'team').trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const actualOutlook=heading=>/^(?:Week 3\b|The Next Matchup\b)/i.test(String(heading||'').trim());

function ordinal(n){
  const x=Number(n);
  if(!Number.isFinite(x))return String(n);
  const mod100=x%100;
  if(mod100>=11&&mod100<=13)return `${x}th`;
  if(x%10===1)return `${x}st`;
  if(x%10===2)return `${x}nd`;
  if(x%10===3)return `${x}rd`;
  return `${x}th`;
}

function naturalMida(team,style){
  const own=team?.mida_outlook,opp=team?.next_opponent_mida;
  if(!own||!opp||!Number.isFinite(Number(own.playoff))||!Number.isFinite(Number(opp.playoff)))return null;
  const ownName=String(own.name||team?.team_name||team?.name||'this team');
  const ownShort=mascot(ownName);
  const oppName=String(opp.name||'the next opponent');
  const ownP=pct(own.playoff),oppP=pct(opp.playoff),ownW=wins(own.expected_wins),oppW=wins(opp.expected_wins);
  if(style==='tilly')return `MIDA has ${ownName} at ${ownP} playoff odds and ${ownW} expected wins, against ${oppName} at ${oppP} and ${oppW}. Those numbers are already talking trash; ${ownShort} gets Sunday to decide whether they were obnoxious or merely early.`;
  if(style==='bartholomew')return `MIDA has ${ownName} at ${ownP} playoff odds and ${ownW} expected wins, against ${oppName} at ${oppP} and ${oppW}. A gap that impolite does not need formalwear; ${ownShort} can either embarrass the numbers on Sunday or spend another week explaining them.`;
  if(style==='jefferson')return `MIDA puts ${ownName} at ${ownP} playoff odds and ${ownW} expected wins, compared with ${oppName} at ${oppP} and ${oppW}. That is not destiny, but it does make the stakes wonderfully uneven: ${ownShort} either validates the cushion or finds out how quickly it can disappear.`;
  return `MIDA has ${ownName} at ${ownP} playoff odds and ${ownW} expected wins, against ${oppName} at ${oppP} and ${oppW}. That is a real gap; ${ownShort} can make it look silly on Sunday or spend the week confirming the insult.`;
}

function polishTeam(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return team;
  const style=reporterStyle(article);
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'').replace(/\b(\d+)(?:st|nd|rd|th) in Week 2 scoring\b/g,(_,n)=>`${ordinal(n)} in Week 2 scoring`));
    if(actualOutlook(section.heading)){
      const fresh=naturalMida(team,style);
      let inserted=false;
      section.paragraphs=section.paragraphs.map(p=>{
        if(/\bMIDA\b/i.test(String(p||''))){
          if(!inserted&&fresh){inserted=true;return fresh;}
          return null;
        }
        return p;
      }).filter(Boolean);
      if(fresh&&!inserted)section.paragraphs.splice(Math.min(1,section.paragraphs.length),0,fresh);
    }
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r143';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR142(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(polishTeam);
  if(out.league_overview)out.league_overview.structure_revision='week2-r143';
  out.structure_revision='week2-r143';
  return out;
}

export const applyWeek2EditorialR143=applyWeek2EditorialR16;
export const applyWeek2EditorialR142=applyWeek2EditorialR16;
export const applyWeek2EditorialR141=applyWeek2EditorialR16;
export const applyWeek2EditorialR140=applyWeek2EditorialR16;
export const applyWeek2EditorialR139=applyWeek2EditorialR16;
export const applyWeek2EditorialR138=applyWeek2EditorialR16;
export const applyWeek2EditorialR137=applyWeek2EditorialR16;
export const applyWeek2EditorialR136=applyWeek2EditorialR16;
export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
