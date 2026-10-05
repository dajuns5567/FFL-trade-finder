import {applyWeek2EditorialR16 as applyR169G} from './inquirer-week2-editorial-r169g.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const sentences=s=>clean(s).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function rebuild(article){
  if(article&&Array.isArray(article.sections))article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

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
  rebuild(article);
}

function hasHistoricalContext(article,p){
  const name=String(p?.name||''),parts=name.split(/\s+/).filter(Boolean),first=parts[0]||'',last=parts.at(-1)||'',prior=Number(p?.prior_season_avg);
  if(!name||!Number.isFinite(prior))return true;
  const refs=[name,first.length>=4?first:'',last.length>=4?last:''].filter(Boolean);
  const paragraphs=(article?.sections||[]).flatMap(s=>s?.paragraphs||[]).map(String);
  const historical=paragraph=>/\b(?:2025|last season|last year|prior-season)\b/i.test(String(paragraph||''))||(String(paragraph||'').includes(prior.toFixed(1))&&/\b(?:average|per game|prior|last)\b/i.test(String(paragraph||'')));
  return paragraphs.some(paragraph=>historical(paragraph)&&refs.some(ref=>new RegExp(`(?:^|\\W)${esc(ref)}(?:$|\\W)`,'i').test(paragraph)))||paragraphs.some((paragraph,i)=>paragraph.includes(name)&&historical(paragraphs[i+1]||''));
}

function historicalLine(article,p){
  const name=String(p?.name||'That player'),prior=Number(p?.prior_season_avg),pts=Number(p?.points),avg=prior.toFixed(1),above=pts>prior,who=String(article?.reporter?.name||'Nick Swindell');
  if(who==='Tilly Fleecer')return above?`${name} averaged ${avg} fantasy points per game last season, so this jump is worth enjoying without pretending one Sunday rewrote the résumé.`:`${name} averaged ${avg} per game last season. That makes the Week 2 dip notable, not a reason to stage a funeral for the role.`;
  if(who==='Bartholomew Roycington III')return above?`${name} averaged ${avg} fantasy points per game last season, which gives this brighter Week 2 showing some genuinely useful contrast.`:`${name} averaged ${avg} per game last season; Week 2 fell well below that standard, an indignity worth noting without declaring the entire enterprise ruined.`;
  if(who==='Jefferson Filch')return above?`${name} averaged ${avg} fantasy points per game last season. Week 2 cleared that mark by enough to merit attention; the next question is whether the change has evidence behind it.`:`${name} averaged ${avg} per game last season. Week 2 landed far enough below that history to raise a question, not to manufacture a verdict.`;
  return above?`${name} averaged ${avg} fantasy points per game last season. Week 2 beat that history by enough to matter, but one game still has to earn the right to become a trend.`:`${name} averaged ${avg} per game last season. Week 2 missed that level by enough to notice, while the established history still argues against overreacting to one result.`;
}

function restoreHistoricalContext(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return;
  for(const p of (team?.starter_details||[]).slice(0,3)){
    const prior=Number(p?.prior_season_avg),pts=Number(p?.points),games=Number(p?.prior_season_games)||0;
    if(!Number.isFinite(prior)||prior<=0||!Number.isFinite(pts)||games<6||Math.abs(pts-prior)<Math.max(4,prior*.3)||hasHistoricalContext(article,p))continue;
    const target=article.sections.find(s=>/player|Names Rivals|respect|performance/i.test(String(s?.heading||'')))||article.sections.find(s=>Array.isArray(s?.paragraphs)&&s.paragraphs.length)||article.sections[0];
    if(!target)continue;
    if(!Array.isArray(target.paragraphs))target.paragraphs=[];
    target.paragraphs.push(historicalLine(article,p));
    rebuild(article);
  }
}

function restoreOpponentContext(team){
  const article=team?.inquirer_article,outlook=(article?.sections||[]).find(s=>String(s?.kind||'')==='outlook');
  const ctx=team?.next_opponent_division_context,nctx=team?.next_opponent_context,division=String(ctx?.division_name||'').trim(),next=String(team?.next_opponent_name||team?.next_opponent||'').trim();
  if(!article||!outlook||!Array.isArray(outlook.paragraphs)||!outlook.paragraphs.length||outlook.paragraphs[0]==='n/a'||!division||!next)return;
  const wins=Number(nctx?.record?.wins)||0,losses=Number(nctx?.record?.losses)||0,record=`${wins}-${losses}`,copy=outlook.paragraphs.join(' ');
  if(copy.toLowerCase().includes(division.toLowerCase())&&copy.includes(record))return;
  outlook.paragraphs[0]=`${clean(outlook.paragraphs[0])} ${next} enters from the ${division} at ${record}.`;
  rebuild(article);
}

function sentimentLines(team){
  const article=team?.inquirer_article,who=String(article?.reporter?.name||'Nick Swindell'),ref=String(team?.team_name||'this team').trim().split(/\s+/).filter(Boolean).at(-1)||'this team';
  if(who==='Tilly Fleecer')return [
    `${ref} fans are booing with purpose now, and frankly the commitment is admirable. They are not asking for elegance; they are asking for one Sunday that does not turn into free comedy for everybody else.`,
    `Rivals are enjoying this far too much, which is exactly why the supporters want a response before the joke starts feeling permanent.`
  ];
  if(who==='Bartholomew Roycington III')return [
    `${ref} supporters have lodged a complaint, and for once the indignation is entirely justified. They would like a Sunday that treats basic competence as something more than an optional accessory.`,
    `The crowd is not demanding perfection; it is demanding enough resistance to keep rival fans from treating the result like a civic holiday.`
  ];
  if(who==='Jefferson Filch')return [
    `${ref} fans are arguing about cause now, not whether the result was ugly. That distinction matters because frustration is turning into suspicion about which assumptions deserve another week.`,
    `The call-in crowd wants evidence in Week 3, not reassurance. Another bad Sunday will make the complaints sound less emotional and more like a pattern.`
  ];
  return [
    `${ref} fans are past pretending this was fine. The complaint is simple: they want a lineup that gives Sunday fewer obvious reasons for regret.`,
    `The call-in crowd is still arguing about whether Week 2 was an outlier or the start of a habit, and Week 3 gets to settle some of that noise.`
  ];
}

function restoreFanSentiment(team){
  const article=team?.inquirer_article,sentiment=(article?.sections||[]).find(s=>String(s?.kind||'')==='sentiment');
  if(!article||!sentiment)return;
  if(!Array.isArray(sentiment.paragraphs))sentiment.paragraphs=[];
  const existing=new Set(sentiment.paragraphs.map(p=>clean(p).toLowerCase()).filter(Boolean));
  for(const line of sentimentLines(team)){
    if(sentiment.paragraphs.length>=2)break;
    const key=clean(line).toLowerCase();
    if(!existing.has(key)){sentiment.paragraphs.push(line);existing.add(key)}
  }
  rebuild(article);
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
  for(const team of out.teams||[]){
    restoreHistoricalContext(team);
    restoreOpponentContext(team);
    restoreFanSentiment(team);
  }
  const aints=(out.teams||[]).find(t=>/new orleans aints/i.test(String(t?.team_name||'')));
  if(aints){
    enforcePlayerScore(aints,'Maxx Crosby');
    enforcePlayerScore(aints,'Jaxon Smith-Njigba');
  }
  return out;
}

export const applyWeek2EditorialR169H=applyWeek2EditorialR16;
