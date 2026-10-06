import {applyWeek2EditorialR16 as applyR169Y} from './inquirer-week2-editorial-r169y.mjs';

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function bits(team){
  const full=String(team?.team_name||'this team').trim();
  const short=full.split(/\s+/).filter(Boolean).at(-1)||full;
  return{full,short};
}

function voice(article){
  const n=String(article?.reporter?.name||'Nick Swindell');
  if(n==='Tilly Fleecer')return'tilly';
  if(n==='Bartholomew Roycington III')return'roycington';
  if(n==='Jefferson Filch')return'filch';
  return'nick';
}

function matchup(article){
  const rows=(article?.sections||[]).flatMap(s=>s?.paragraphs||[]).map(norm);
  for(const p of rows){
    let m=p.match(/(.+?) beat (.+?) (-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)/i);
    if(m)return{won:true,opp:m[2],pf:+m[3],pa:+m[4],margin:Math.abs(+m[3]-+m[4])};
    m=p.match(/(.+?) lost to (.+?) (-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)/i);
    if(m)return{won:false,opp:m[2],pf:+m[3],pa:+m[4],margin:Math.abs(+m[3]-+m[4])};
  }
  return null;
}

const META=/\b(?:evidence|proof|investigat(?:e|ion)|verdict|case|witness|testimony|argument|conclusion|question|answer|whether (?:that|the|this)|whether .*?(?:real|repeats?|survives?)|role (?:case|argument|repeats?|survives?)|peer review|seminar on whether|new piece of proof|recycled conclusion|old expectation|ceiling was misidentified|ceiling still applies|trend beginning|one-week witness|sample size|data point|hostile questioning|assumptions? worth testing|treating one Sunday like gospel|Week 2 gets to argue with it|watch as actual growth|hot box score|survive hostile questioning|waiting to contradict it|theory; they are the annoying part everyone can count)\b/i;

function splitSentences(text){
  return norm(text).split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/).map(norm).filter(Boolean);
}

function cleanMeta(text){
  const kept=splitSentences(text).filter(s=>!META.test(s));
  return kept.join(' ').replace(/\s+([,.!?])/g,'$1').trim();
}

function rawStat(row){
  return row.match(/^([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3}) scored (-?\d+(?:\.\d+)?) fantasy points in Week 2(?: with|:| on)?\s*(.*)$/i);
}

function statComment(name,pts,tail,team,article,ctx){
  const {short}=bits(team),v=voice(article),n=Number(pts),detail=norm(tail).replace(/^with\s+/i,'');
  const line=detail?`${name} gave ${short} ${n} points (${detail.replace(/[.]$/,'')}).`:`${name} gave ${short} ${n} points.`;
  if(ctx?.won){
    if(n<6)return `${line} In a ${ctx.margin.toFixed(1)}-point win, that is the sort of dud the stars can cover once without sending an invoice.`;
    if(n>=20)return `${line} ${ctx.opp} had enough problems already; ${name.split(/\s+/).at(-1)} made sure one of them had a name.`;
    return `${line} Not the headline, but useful enough that ${short} did not need every point from the stars.`;
  }
  if(ctx&&!ctx.won){
    if(n<6)return `${line} In a loss, that is less “quiet contribution” and more “missing-person report.”`;
    if(n>=20)return `${line} A number like that deserved a win; the rest of the lineup failed to cooperate.`;
    return `${line} Fine on its own. The problem is that ${short} needed more help somewhere else.`;
  }
  if(v==='tilly')return `${line} Not scandalous, not glamorous, and therefore unlikely to get invited back onto the front page.`;
  if(v==='roycington')return `${line} Respectable enough to remain in the room, not impressive enough to own it.`;
  if(v==='filch')return `${line} Useful, but not enough by itself to change the result.`;
  return `${line} Fine. Fantasy football has seen worse and charged admission.`;
}

function cleanPlayerRows(rows,team,article,ctx){
  const out=[];
  for(const raw of rows){
    const row=norm(raw);
    if(/\bgot about \d+% of (?:its|their) scoring from three players\b/i.test(row))continue;
    if(/\bsupplied [\d.]+ points, about \d+% of .*Week 2 total\b/i.test(row))continue;
    if(/\baveraged [\d.]+ fantasy points per game in 2025\b/i.test(row)&&/\b(?:Week 2 gets to argue|actual growth|hot box score|ceiling)\b/i.test(row))continue;
    const m=rawStat(row);
    if(m){out.push(statComment(m[1],m[2],m[3],team,article,ctx));continue}
    const cleaned=cleanMeta(row);
    if(!cleaned)continue;
    if(/^([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){0,3}) (?:scored|had|posted) -?\d+(?:\.\d+)?(?: fantasy)? points?(?: against [^.]+)?\.?$/i.test(cleaned))continue;
    out.push(cleaned);
  }
  return out;
}

function cleanMarketRows(rows,team){
  const {short}=bits(team),out=[];
  for(const raw of rows){
    const row=cleanMeta(raw);if(!row)continue;
    if(/\bled the roster's value gains\b/i.test(row)||/\bled the losses\b/i.test(row))continue;
    if(/\badded \d+ in value; .* dropped \d+\b/i.test(row))continue;
    if(/^Useful market movement\.?$/i.test(row))continue;
    if(/roster value (?:rose|fell) from \d+ to \d+/i.test(row)){
      const delta=(row.match(/a ([\d,]+)-point move \(([-+]?\d+(?:\.\d+)?)%\)/i)||[]);
      if(delta)out.push(`${short}'s roster value moved ${delta[1]} points (${delta[2]}%). Fine. Prices moved; Sunday already told us more.`);
      else out.push(row);
      continue;
    }
    out.push(row);
  }
  return out;
}

function cleanGenericRows(rows){
  const out=[];
  for(const raw of rows){
    let row=cleanMeta(raw);
    if(!row)continue;
    row=row.replace(/\bFor ([A-Z][A-Za-z'’.-]+),?\s*/g,'');
    row=row.replace(/\bthe record narrows the question, but it does not answer it\.?/gi,'');
    row=row.replace(/\bNext week gets to break the tie instead of merely adding another footnote to it\.?/gi,'');
    row=row.replace(/\s+([,.!?])/g,'$1').replace(/\s{2,}/g,' ').trim();
    if(row)out.push(row);
  }
  return out;
}

function sectionIsPlayers(section){
  const h=String(section?.heading||'').toLowerCase();
  return /names rivals|moved the game|made the noise|made the afternoon|people who made|who actually/.test(h);
}
function sectionIsMarket(section){return /market|roster price|price moved/i.test(String(section?.heading||''));}

function rewriteArticle(team){
  const article=team?.inquirer_article;if(!article)return;
  const ctx=matchup(article);
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    if(/what survived inspection/i.test(String(section.heading||'')))section.heading='Who Actually Earned It';
    section.paragraphs=sectionIsPlayers(section)?cleanPlayerRows(section.paragraphs,team,article,ctx):sectionIsMarket(section)?cleanMarketRows(section.paragraphs,team):cleanGenericRows(section.paragraphs);
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169Y(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[])rewriteArticle(team);
  return out;
}

export const applyWeek2EditorialR169Z=applyWeek2EditorialR16;
