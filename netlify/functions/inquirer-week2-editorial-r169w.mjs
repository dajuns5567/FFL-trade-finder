import {applyWeek2EditorialR16 as applyR169V} from './inquirer-week2-editorial-r169v.mjs';

const PLAYER='([A-Z][A-Za-z’\'.-]+(?:\\s+[A-Z][A-Za-z’\'.-]+){0,3})';
const escapeRe=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function anchorGenericFollowups(text,team){
  let out=String(text||''),club=String(team?.team_name||'this team'),short=club.split(/\s+/).filter(Boolean).at(-1)||club;
  out=out.replace(/from one In 2025, Sunday\./g,'from one Sunday. In 2025,');
  out=out.replace(new RegExp(`Last season, ${PLAYER} averaged (\\d+(?:\\.\\d+)?) fantasy points per game\\. That is the benchmark, not a ceiling by law\\.`,'g'),(_m,name,avg)=>`Last season, ${name} averaged ${avg} fantasy points per game; ${name}'s 2025 rate is the benchmark, not a ceiling by law.`);
  out=out.replace(new RegExp(`The 2025 baseline for ${PLAYER} was (\\d+(?:\\.\\d+)?) fantasy points per game; that is prior evidence, not a verdict\\.`,'g'),(_m,name,avg)=>`${name} averaged ${avg} fantasy points per game in 2025; useful history, but Week 2 gets to argue with it.`);
  out=out.replace(new RegExp(`${PLAYER} beat projection by (\\d+(?:\\.\\d+)?) points\\. At that point the projection is less forecast and more public apology\\.`,'g'),(_m,name,delta)=>`${name} beat projection by ${delta} points; for ${name}, the old projection now reads more like a public apology than a forecast.`);
  out=out.replace(new RegExp(`${PLAYER} landed near expectation, which is perfectly useful and catastrophically boring\\. The role matters more than inventing a revelation\\.`,'g'),(_m,name)=>`${name} landed near expectation, which is perfectly useful and catastrophically boring; ${name}'s role matters more than inventing a revelation.`);
  out=out.replace(new RegExp(`${PLAYER} landed near expectation\\. Fine\\. The useful question is whether the role repeats\\.`,'g'),(_m,name)=>`${name} landed near expectation. Fine. The useful question for ${name} is whether the role repeats.`);
  out=out.replace(new RegExp(`${PLAYER} mattered this week\\. Good\\. That still is not permission to pretend one Sunday settled the season\\.`,'g'),(_m,name)=>`${name} mattered this week. Good. That still is not permission to pretend ${name}'s season was settled in one Sunday.`);
  out=out.replace(new RegExp(`${PLAYER} may have shown last year's ceiling was actually a very low chandelier\\. One more week like that and somebody needs a ladder\\.`,'g'),(_m,name)=>`${name} may have shown last year's ceiling was actually a very low chandelier. One more week like that from ${name} and somebody needs a ladder.`);
  out=out.replace(/The standings are not a theory; they are the annoying part we can count\./g,`For ${short}, the standings are not a theory; they are the annoying part everyone can count.`);
  out=out.replace(/Useful: a new opponent means a new piece of evidence\./g,`For ${short}, a new opponent means a new piece of evidence instead of another recycled conclusion.`);
  out=out.replace(/Sunday may now decide whether the spreadsheet deserves flowers or tomatoes\./g,`For ${short}, Sunday gets to decide whether that projection deserves flowers or tomatoes.`);
  out=out.replace(/Numbers may wear evening clothes; they still have to survive Sunday\./g,`${short} can dress the numbers in evening clothes; they still have to survive Sunday.`);
  out=out.replace(/Treat that as a claim awaiting evidence, not a result\./g,`For ${short}, treat that projection as a claim awaiting evidence, not a result.`);
  out=out.replace(/The repeatable opportunity is the evidence that matters\./g,`For ${short}, repeatable opportunity is the evidence that matters.`);
  out=out.replace(/That is the point, not the comparison itself\./g,`For ${short}, that is the point; the comparison itself is just context.`);
  out=out.replace(/That is not a rounding error; it changes the expectation\./g,`For ${short}, that gap is not a rounding error; it changes what Week 3 should reasonably expect.`);
  out=out.replace(/Repetition would make the old limit look terribly quaint\./g,`For ${short}, one repeat would make the old limit look terribly quaint.`);
  out=out.replace(/The Week 3 line rather grandly favors (.+?) (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?) over (.+?)\./g,(_m,fav,a,b,dog)=>`The Week 3 line makes ${fav} the favored side, ${a} to ${b} over ${dog}.`);
  out=out.replace(/The current Week 3 projection puts (.+?) ahead of (.+?), (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)\./g,(_m,fav,dog,a,b)=>`The current Week 3 projection gives ${fav} the edge over ${dog}, ${a} to ${b}.`);
  out=out.replace(/The projection, in its infinite confidence, has (.+?) beating (.+?) (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)\./g,(_m,fav,dog,a,b)=>`The projection, in its infinite confidence, makes ${fav} the favorite over ${dog}, ${a} to ${b}.`);
  out=out.replace(/Week 3's number is (.+?) (\d+(?:\.\d+)?), (.+?) (\d+(?:\.\d+)?)\./g,(_m,fav,a,dog,b)=>`Week 3's projection favorite is ${fav}, ${a} to ${b} over ${dog}.`);
  return out;
}

function pluralAliasGrammar(text,team){
  let out=String(text||'');
  const full=String(team?.team_name||'').trim(),short=full.split(/\s+/).filter(Boolean).at(-1)||'';
  if(!short||!/s$/i.test(short))return out;
  const verbs={is:'are',has:'have',gets:'get',holds:'hold',brings:'bring',turns:'turn',sits:'sit'};
  const re=new RegExp(`\\b${escapeRe(short)}\\s+(is|has|gets|holds|brings|turns|sits)\\b`,'gi');
  return out.replace(re,(_all,verb)=>`${short} ${verbs[String(verb).toLowerCase()]||verb}`);
}

function hasHistoricalContext(article,p){
  const name=String(p?.name||''),bits=name.split(/\s+/).filter(Boolean),refs=[name,bits[0],bits.at(-1)].filter(x=>String(x||'').length>=4),context=/\b(?:2025|last season|last year|prior-season)\b/i;
  return (article?.sections||[]).flatMap(section=>section?.paragraphs||[]).some(paragraph=>context.test(String(paragraph||''))&&refs.some(ref=>String(paragraph||'').toLowerCase().includes(String(ref).toLowerCase())));
}

function historicalMeaning(p,article,slot){
  const name=String(p?.name||'This player'),avg=Number(p?.prior_season_avg).toFixed(1),pts=Number(p?.points),prior=Number(p?.prior_season_avg),who=String(article?.reporter?.name||'Nick Swindell'),up=pts>prior;
  if(who==='Jefferson Filch'){
    if(up&&slot===0)return `${name} averaged ${avg} fantasy points per game in 2025; Week 2 cleared that history by enough to reopen the ceiling question, while Week 3 still has to prove the old limit was actually wrong.`;
    if(up&&slot===1)return `${name} averaged ${avg} fantasy points per game in 2025; Week 2 made that old rate look conservative enough to investigate, not worship.`;
    if(up)return `${name} averaged ${avg} fantasy points per game in 2025; the jump is evidence that the old expectation may be stale, with Week 3 serving as the obvious cross-check.`;
    return `${name} averaged ${avg} fantasy points per game in 2025; Week 2 fell far enough below that history to flag the performance without inventing a role crisis.`;
  }
  if(who==='Tilly Fleecer')return up?`${name} averaged ${avg} fantasy points per game in 2025; Week 2 made that old number look underdressed, so the ceiling argument is officially allowed one week of unreasonable excitement.`:`${name} averaged ${avg} fantasy points per game in 2025; Week 2 came in well below that, which earns tomatoes before it earns a funeral.`;
  if(who==='Bartholomew Roycington III')return up?`${name} averaged ${avg} fantasy points per game in 2025; Week 2 exceeded that standard impolitely enough to make the old ceiling look due for renovation.`:`${name} averaged ${avg} fantasy points per game in 2025; Week 2 fell beneath that standard badly enough to deserve criticism without commissioning a role inquest.`;
  return up?`${name} averaged ${avg} fantasy points per game in 2025; Week 2 beat that history by enough to question the old ceiling instead of merely noting a better score.`:`${name} averaged ${avg} fantasy points per game in 2025; Week 2 missed that history badly enough to call it a dud, not automatically a new role.`;
}

function ensureHistoricalContext(team,article){
  const players=(article?.sections||[]).find(section=>String(section?.kind||'')==='players');
  if(!players||!Array.isArray(players.paragraphs))return;
  const top=(team?.starter_details||[]).slice(0,3);
  for(let slot=0;slot<top.length;slot++){
    const p=top[slot],prior=Number(p?.prior_season_avg),pts=Number(p?.points),games=Number(p?.prior_season_games)||0;
    if(!Number.isFinite(prior)||prior<=0||!Number.isFinite(pts)||games<6||Math.abs(pts-prior)<Math.max(4,prior*.3)||hasHistoricalContext(article,p))continue;
    const name=String(p?.name||''),idx=players.paragraphs.findIndex(paragraph=>String(paragraph||'').includes(name));
    const context=historicalMeaning(p,article,slot);
    if(idx>=0)players.paragraphs[idx]=`${players.paragraphs[idx]} ${context}`;
    else players.paragraphs.push(context);
  }
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169V(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    for(const section of article.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(paragraph=>pluralAliasGrammar(anchorGenericFollowups(paragraph,team),team)).filter(Boolean);
    }
    ensureHistoricalContext(team,article);
    for(const section of article.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(paragraph=>pluralAliasGrammar(paragraph,team));
    }
    article.paragraphs=article.sections.flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169W=applyWeek2EditorialR16;
