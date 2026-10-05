import {applyWeek2EditorialR16 as applyR169T} from './inquirer-week2-editorial-r169t.mjs';

const HISTORICAL=/\baveraged\s+\d+(?:\.\d+)?\s+fantasy points per game in 2025\b/i;

function depthRead(team,article,index){
  const starters=(team?.starter_details||[]).filter(x=>x?.name),p=starters[index%Math.max(1,starters.length)]||starters[0]||{},name=String(p?.name||'the next starter'),next=String(team?.next_opponent_name||team?.upcoming_opponents?.[0]?.team_name||'the Week 3 opponent'),who=String(article?.reporter?.name||'Nick Swindell'),shape=index%3;
  if(who==='Tilly Fleecer'){
    if(shape===0)return `${name} gets another look against ${next}. If ${name}'s Week 2 role survives, lovely; if it vanishes, everyone who planned that particular parade after one Sunday may return the confetti.`;
    if(shape===1)return `Against ${next}, ${name} has to show the Week 2 opportunity was more than a one-Sunday rental. Otherwise the celebration was less victory parade and more very expensive rehearsal.`;
    return `The Week 3 test belongs to ${name} against ${next}: keep the useful role and the optimism gets to live; lose it immediately and the confetti people can start sweeping.`;
  }
  if(who==='Bartholomew Roycington III'){
    if(shape===0)return `${name} now carries the Week 2 role into ${next}. Repeating ${name}'s useful part would be splendid; discovering it was rented for one afternoon would be considerably less distinguished.`;
    if(shape===1)return `Against ${next}, ${name} must demonstrate that Week 2 was substance rather than decorative flourish. One prefers production that survives travel.`;
    return `The matter for ${name} against ${next} is pleasantly simple: preserve the Week 2 opportunity, or admit the previous performance was dressed better than it traveled.`;
  }
  if(who==='Jefferson Filch'){
    if(shape===0)return `${name} takes the Week 2 role into ${next}. The useful question is whether ${name}'s opportunity survives contact with a new matchup; if it does not, the one-week conclusion gets dismissed for lack of evidence.`;
    if(shape===1)return `Against ${next}, ${name}'s Week 2 opportunity goes back under examination. Repeat it and the case gets stronger; lose it and the dramatic conclusions get thrown out.`;
    return `${name} faces ${next} with one useful burden: prove the Week 2 role was real enough to repeat. A disappearing act would leave the optimistic case embarrassingly thin.`;
  }
  if(shape===0)return `${name} takes the Week 2 role into ${next}. Keep ${name}'s opportunity and the result has teeth; lose it immediately and Week 2 becomes a nice story with lousy follow-through.`;
  if(shape===1)return `Against ${next}, ${name} needs the Week 2 opportunity to show up again. Production without a repeatable role is how fantasy managers end up lying to themselves on Tuesday.`;
  return `The Week 3 check for ${name} comes against ${next}. If the role holds, keep buying the result; if it disappears, stop pretending one good Sunday settled anything.`;
}

function foldHistorical(paragraphs){
  const folded=[];
  let pending=[];
  for(const paragraph of paragraphs||[]){
    const text=String(paragraph||'').trim();
    if(!text)continue;
    if(HISTORICAL.test(text)){
      pending.push(text);
      continue;
    }
    folded.push(pending.length?`${text} ${pending.join(' ')}`:text);
    pending=[];
  }
  if(pending.length&&folded.length)folded[folded.length-1]=`${folded[folded.length-1]} ${pending.join(' ')}`;
  return folded;
}

function normalizedFeatured(text,team){
  let out=String(text||'');
  for(const p of team?.starter_details||[]){
    const name=String(p?.name||'');
    if(name)out=out.split(name).join('[player]');
  }
  return out.toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/\s+/g,' ').trim();
}

function derivedFeaturedRead(team,article,slot){
  const p=(team?.starter_details||[])[slot]||{},name=String(p?.name||'This starter'),pts=Number(p?.points),prior=Number(p?.prior_season_avg),week1=Number(p?.week1_points),opp=String(team?.opponent_name||'the Week 2 opponent'),who=String(article?.reporter?.name||'Nick Swindell');
  const ptxt=Number.isFinite(pts)?pts.toFixed(1):'this result',priorTxt=Number.isFinite(prior)?prior.toFixed(1):null,w1txt=Number.isFinite(week1)?week1.toFixed(1):null;
  const ceiling=Number.isFinite(prior)&&Number.isFinite(pts)&&pts>=prior*1.2;
  const below=Number.isFinite(prior)&&Number.isFinite(pts)&&pts<=prior*.8;
  const rebound=below&&Number.isFinite(week1)&&pts>=week1+4;
  if(who==='Tilly Fleecer'){
    if(ceiling)return `${name}'s ${ptxt} against ${opp} cleared last year's ${priorTxt}-point pace by enough to make the old ceiling look suspicious. One more Sunday like that and 2025 starts looking less like the peak and more like the warm-up.`;
    if(rebound)return `${name} crawled from ${w1txt} in Week 1 to ${ptxt}, which is progress, but last year's ${priorTxt}-point pace is still the adult standard in the room. Call it a rebound, not a coronation; anyone ordering the banner can keep the receipt.`;
    if(below)return `${name}'s ${ptxt} sits well under last year's ${priorTxt}-point pace. That earns a proper booing, not a fantasy séance; until the role changes, the player owns the dud.`;
    return `${name}'s ${ptxt} against ${opp} is useful without being permission to lose your mind. The number is close enough to the established standard that how ${name} earned it matters more than inventing a brand-new identity after one Sunday.`;
  }
  if(who==='Bartholomew Roycington III'){
    if(ceiling)return `${name}'s ${ptxt} against ${opp} surpassed last year's ${priorTxt}-point pace rather impolitely. If that standard repeats, the old ceiling may require renovation rather than reverence.`;
    if(rebound)return `${name} improved from ${w1txt} in Week 1 to ${ptxt}, although last year's ${priorTxt}-point pace remains the more respectable benchmark. A recovery may be applauded; a coronation would be premature and terribly gauche.`;
    if(below)return `${name}'s ${ptxt} fell well beneath last year's ${priorTxt}-point pace. The performance deserves criticism; inventing a vanished role before the evidence arrives would merely make the criticism less intelligent.`;
    return `${name}'s ${ptxt} against ${opp} landed near the established standard. Perfectly respectable, but hardly grounds for commissioning a monument after two weeks.`;
  }
  if(who==='Jefferson Filch'){
    if(ceiling)return `${name}'s ${ptxt} against ${opp} cleared last year's ${priorTxt}-point pace by enough to reopen the ceiling question. Week 3 now has one job: determine whether the old benchmark is outdated or whether Sunday was the outlier.`;
    if(rebound)return `${name} moved from ${w1txt} in Week 1 to ${ptxt}, but last year's ${priorTxt}-point pace is still the relevant benchmark. That is evidence of recovery, not proof the problem is closed.`;
    if(below)return `${name}'s ${ptxt} is materially below last year's ${priorTxt}-point pace. Flag the performance, not an imaginary role crisis; if the opportunity stayed intact, the player is the one on the hook.`;
    return `${name}'s ${ptxt} against ${opp} sits close enough to the established standard that the box score alone does not decide anything. The next useful evidence is whether the same opportunity produces a better answer in Week 3.`;
  }
  if(ceiling)return `${name}'s ${ptxt} against ${opp} beat last year's ${priorTxt}-point pace by enough to make the old ceiling worth questioning. Do it again and 2025 stops looking like the upper bound.`;
  if(rebound)return `${name} climbed from ${w1txt} in Week 1 to ${ptxt}, but last year's ${priorTxt}-point pace is still the benchmark. Better, yes. Fixed, no.`;
  if(below)return `${name}'s ${ptxt} is well below last year's ${priorTxt}-point pace. Bad game. Unless the role changed, do not turn one dud into a management conspiracy.`;
  return `${name}'s ${ptxt} against ${opp} is close enough to the established standard that the total itself is not the story. Keep the opportunity and there is something to trust; lose it and the number ages badly.`;
}

function diversifyFeatured(team,article,paras){
  if(paras.length<6)return;
  const seen=new Set();
  for(let slot=0;slot<3;slot++){
    const i=slot*2+1,key=normalizedFeatured(paras[i],team);
    if(seen.has(key))paras[i]=derivedFeaturedRead(team,article,slot);
    seen.add(normalizedFeatured(paras[i],team));
  }
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169T(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
    if(players&&Array.isArray(players.paragraphs)){
      const paras=foldHistorical(players.paragraphs);
      while(paras.length<6)paras.push(depthRead(team,article,paras.length));
      diversifyFeatured(team,article,paras);
      players.paragraphs=paras;
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169U=applyWeek2EditorialR16;
