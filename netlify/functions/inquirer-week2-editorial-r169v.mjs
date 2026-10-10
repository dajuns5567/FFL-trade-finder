import {applyWeek2EditorialR16 as applyR169U} from './inquirer-week2-editorial-r169u.mjs';

const RECEIVING_FAMILY=/\b([A-Z][A-Za-z'’.-]+)(?:'s)?\s+(?:takes that\s+)?target and receiving volume\b[^.]*\./g;
const PLAYER='([A-Z][A-Za-z’\'.-]+(?:\\s+[A-Z][A-Za-z’\'.-]+){0,3})';
const escapeRe=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function receivingVariation(rawLast,opponent,count,sentence){
  const last=String(rawLast||'').replace(/['’]s$/i,'');
  if(count===0)return sentence;
  if(count===1)return `${last}'s receiving workload gets one useful Week 3 test against ${opponent}: repeat the volume and the role deserves more trust; lose it and one loud Sunday starts looking like a cameo.`;
  return '';
}

function diversifyRepeatedReceivingRead(article,team){
  const seen=new Map(),opponent=String(team?.next_opponent_name||team?.upcoming_opponents?.[0]?.team_name||'the Week 3 opponent');
  for(const section of article?.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>String(paragraph||'').replace(RECEIVING_FAMILY,(sentence,rawLast)=>{
      const last=String(rawLast||'').replace(/['’]s$/i,''),key=last.toLowerCase(),count=seen.get(key)||0;
      seen.set(key,count+1);
      return receivingVariation(rawLast,opponent,count,sentence);
    }).replace(/\s{2,}/g,' ').trim()).filter(Boolean);
  }
}

function voiceKey(article){
  const who=String(article?.reporter?.name||'');
  if(who==='Tilly Fleecer')return 'tilly';
  if(who==='Bartholomew Roycington III')return 'bart';
  if(who==='Jefferson Filch')return 'filch';
  return 'nick';
}

function pluralTeamGrammar(text,allTeams){
  let out=String(text||'');
  const verbs={has:'have',is:'are',gets:'get',holds:'hold',brings:'bring',turns:'turn',sits:'sit'};
  const plural=(allTeams||[]).map(t=>String(t?.team_name||'').trim()).filter(Boolean).filter(name=>/s$/i.test(name.split(/\s+/).at(-1)||''));
  if(!plural.length)return out;
  const names=plural.sort((a,b)=>b.length-a.length).map(escapeRe).join('|');
  const re=new RegExp(`(^|[.!?,;:]\\s+)(${names})\\s+(has|is|gets|holds|brings|turns|sits)\\b`,'gi');
  return out.replace(re,(_all,prefix,name,verb)=>`${prefix}${name} ${verbs[String(verb).toLowerCase()]||verb}`);
}

function voiceDiversify(text,team,article,allTeams){
  let out=String(text||''),voice=voiceKey(article),club=String(team?.team_name||'This team');
  const resultPrefix={nick:'No varnish:',tilly:'The week\'s little comedy:',bart:'The vulgar arithmetic:',filch:'The record is annoyingly clear:'}[voice];
  out=out.replace(new RegExp(`\\b${escapeRe(club)} (lost to|beat) ([^.]+?) (\\d+(?:\\.\\d+)?)–(\\d+(?:\\.\\d+)?) and moved to (\\d+)-(\\d+)\\.`,'g'),(_m,verb,opp,a,b,w,l)=>`${resultPrefix} ${club} ${verb} ${opp} ${a}–${b} and moved to ${w}-${l}.`);

  out=out.replace(new RegExp(`In the ((?:AFC|NFC) [A-Z]+), ${escapeRe(club)} sits (\\d+) of (\\d+)\\.`,'g'),(_m,division,rank,total)=>{
    if(voice==='tilly')return `Because the standings enjoy public humiliation, ${club} sits ${rank} of ${total} in the ${division}.`;
    if(voice==='bart')return `The ${division} ledger places ${club} ${rank} of ${total}, which is a number with very little interest in dignity.`;
    if(voice==='filch')return `The ${division} evidence currently puts ${club} ${rank} of ${total}. The standings are not a theory; they are the annoying part we can count.`;
    return `${division} reality: ${club} sits ${rank} of ${total}. No speech fixes that.`;
  });

  out=out.replace(new RegExp(`${PLAYER} averaged (\\d+(?:\\.\\d+)?) fantasy points per game in 2025\\.`,'g'),(_m,name,avg)=>{
    if(voice==='tilly')return `For context, ${name} averaged ${avg} fantasy points per game in 2025; useful history, not holy scripture.`;
    if(voice==='bart')return `The 2025 ledger had ${name} at ${avg} fantasy points per game, a respectable benchmark rather than a family heirloom.`;
    if(voice==='filch')return `The 2025 baseline for ${name} was ${avg} fantasy points per game; that is prior evidence, not a verdict.`;
    return `Last season, ${name} averaged ${avg} fantasy points per game. That is the benchmark, not a ceiling by law.`;
  });

  out=out.replace(new RegExp(`${PLAYER} scored (\\d+(?:\\.\\d+)?) fantasy points against ([^:]+): ([^.]+)\\.`,'g'),(_m,name,pts,opp,line)=>{
    if(voice==='tilly')return `${name} put ${pts} fantasy points on ${opp}: ${line}. ${name} has now earned one week of completely unreasonable celebration.`;
    if(voice==='bart')return `${name} contributed ${pts} fantasy points against ${opp}: ${line}. ${name}'s production may enter the record without commissioning a trumpet procession.`;
    if(voice==='filch')return `${name}'s Week 2 evidence against ${opp}: ${pts} fantasy points from ${line}. ${name}'s stat line matters only if the role explains it.`;
    return `${name}: ${pts} fantasy points against ${opp}, built from ${line}. ${name} gave us a good line; Week 3 decides whether it repeats.`;
  });

  const teamNames=(allTeams||[]).map(t=>String(t?.team_name||'').trim()).filter(Boolean).sort((a,b)=>b.length-a.length);
  if(teamNames.length){
    const teamAlt=teamNames.map(escapeRe).join('|');
    out=out.replace(new RegExp(`\\b(${teamAlt}) is next at (\\d+-\\d+) from the ((?:AFC|NFC) [A-Z]+)\\.`,'g'),(_m,next,record,division)=>{
      if(voice==='tilly')return `Next comes ${next} at ${record} from the ${division}, because apparently the schedule would like another public reaction.`;
      if(voice==='bart')return `The next appointment is ${next}, currently ${record} in the ${division}; one hopes the occasion is less vulgar than the previous Sunday.`;
      if(voice==='filch')return `The next test is ${next} at ${record} from the ${division}. Useful: a new opponent means a new piece of evidence.`;
      return `Next up: ${next}, ${record} in the ${division}. Simple assignment. Win it.`;
    });
    out=out.replace(new RegExp(`The Week 3 projection has (${teamAlt}) favored (\\d+(?:\\.\\d+)?) to (\\d+(?:\\.\\d+)?) over (${teamAlt})\\.`,'g'),(_m,fav,a,b,dog)=>{
      if(voice==='tilly')return `The projection, in its infinite confidence, has ${fav} beating ${dog} ${a} to ${b}. Lovely. Sunday may now decide whether the spreadsheet deserves flowers or tomatoes.`;
      if(voice==='bart')return `The Week 3 line rather grandly favors ${fav} ${a} to ${b} over ${dog}. Numbers may wear evening clothes; they still have to survive Sunday.`;
      if(voice==='filch')return `The current Week 3 projection puts ${fav} ahead of ${dog}, ${a} to ${b}. Treat that as a claim awaiting evidence, not a result.`;
      return `Week 3's number is ${fav} ${a}, ${dog} ${b}. Useful expectation. Still not a final score.`;
    });
  }

  out=out.replace(new RegExp(`${PLAYER}'s one game does not rewrite a career, but it does make the old expectations look suspiciously conservative\\.`,'g'),(_m,name)=>{
    if(voice==='tilly')return `One Sunday does not crown ${name}, but it did make the old expectation look like it showed up underdressed.`;
    if(voice==='bart')return `${name} has not rewritten a career in one afternoon; the old expectation has merely been made to look embarrassingly modest.`;
    if(voice==='filch')return `${name} has not closed the case, but the old expectation is now weak evidence.`;
    return `${name} did not rewrite a career in one Sunday, but the old expectation now looks low enough to question.`;
  });

  out=out.replace(new RegExp(`${PLAYER} turned the projection into the statistical equivalent of returning the menu and ordering something much more expensive\\.`,'g'),(_m,name)=>{
    if(voice==='tilly')return `${name} treated the projection like an insult and returned it with interest. Charming behavior.`;
    if(voice==='bart')return `${name} exceeded the projection so thoroughly that the original number now looks like an accounting embarrassment.`;
    if(voice==='filch')return `${name} beat the projection hard enough that Week 3 now has to test whether the model was wrong or Sunday was weird.`;
    return `${name} beat the projection badly enough that the number now looks stale, not unlucky.`;
  });

  out=out.replace(new RegExp(`(?:My read:\\s*)?${PLAYER} obliterated projection by (\\d+(?:\\.\\d+)?) points\\.`,'g'),(_m,name,delta)=>{
    if(voice==='tilly')return `${name} beat projection by ${delta} points. At that point the projection is less forecast and more public apology.`;
    if(voice==='bart')return `${name} cleared projection by ${delta} points, an excess large enough to make the original estimate look provincial.`;
    if(voice==='filch')return `${name} beat projection by ${delta} points; that is enough separation to investigate, not dismiss as noise.`;
    return `${name} beat projection by ${delta} points. That is not a rounding error; it changes the expectation.`;
  });

  out=out.replace(new RegExp(`(?:My read:\\s*)?${PLAYER} landed close enough to established expectations that the important part is how the production was earned, not whether the box score can be stretched into a dramatic new identity\\.`,'g'),(_m,name)=>{
    if(voice==='tilly')return `${name} landed near expectation, which is perfectly useful and catastrophically boring. The role matters more than inventing a revelation.`;
    if(voice==='bart')return `${name} landed near expectation; respectable, certainly, but hardly grounds for commissioning statuary.`;
    if(voice==='filch')return `${name} landed near expectation, so the box score does not settle anything. The repeatable opportunity is the evidence that matters.`;
    return `${name} landed near expectation. Fine. The useful question is whether the role repeats.`;
  });

  out=out.replace(new RegExp(`(?:My read:\\s*)?${PLAYER} did enough to matter without giving anyone a license to hallucinate a season-long certainty from one Sunday\\.`,'g'),(_m,name)=>{
    if(voice==='tilly')return `${name} mattered this week, and naturally somebody will now plan a parade. Cancel it until the role repeats.`;
    if(voice==='bart')return `${name} mattered this week; applause is permitted, canonization remains vulgar.`;
    if(voice==='filch')return `${name} mattered this week, but one result is a lead, not a verdict.`;
    return `${name} mattered this week. Good. That still is not permission to pretend one Sunday settled the season.`;
  });

  out=out.replace(new RegExp(`(?:My read:\\s*)?${PLAYER} did more than beat last year's pace; the performance changed what a reasonable Week 3 expectation looks like\\.`,'g'),(_m,name)=>{
    if(voice==='tilly')return `${name} did more than beat last year's pace; the old benchmark now looks like it forgot to update its résumé. Week 3 gets the encore.`;
    if(voice==='bart')return `${name} surpassed last year's pace by enough to raise the standard for Week 3; the old benchmark no longer deserves ceremonial protection.`;
    if(voice==='filch')return `${name} beat last year's pace by enough to change the Week 3 prior. Repeat it and the ceiling case gets stronger.`;
    return `${name} beat last year's pace badly enough to reset the Week 3 expectation. That is the point, not the comparison itself.`;
  });

  out=out.replace(new RegExp(`${PLAYER} made that hot week look like a role worth taking seriously\\.`,'g'),(_m,name)=>{
    if(voice==='tilly')return `${name}'s hot week looked attached to a real role, which is inconveniently encouraging.`;
    if(voice==='bart')return `${name}'s hot week carried enough substance to merit attention beyond the box score.`;
    if(voice==='filch')return `${name}'s hot week came with role evidence worth preserving; Week 3 decides whether it holds.`;
    return `${name}'s hot week came with enough role to matter. Now repeat it.`;
  });

  out=out.replace(new RegExp(`(?:My read:\\s*)?${PLAYER} may have shown that last season was not the ceiling so much as the lobby\\.`,'g'),(_m,name)=>{
    if(voice==='tilly')return `${name} may have shown last year's ceiling was actually a very low chandelier. One more week like that and somebody needs a ladder.`;
    if(voice==='bart')return `${name} may have demonstrated that last year's ceiling was merely the foyer. Repetition would make the old limit look terribly quaint.`;
    if(voice==='filch')return `${name} may have shown the old ceiling was misidentified. Week 3 now has to confirm whether that was signal or one-week noise.`;
    return `${name} may have shown last year was not the ceiling at all. Do it again and the old benchmark is dead.`;
  });

  const historyEnding={nick:' has enough history to call this a bad Sunday before calling it a role problem.',tilly:' has enough history that one stinker earns tomatoes, not a career funeral.',bart:' has enough pedigree to survive one undignified Sunday without a role inquest.',filch:' has enough prior evidence that one dud is a performance issue, not yet a role case.'}[voice];
  out=out.replace(/ has enough history that one rotten Sunday does not become a role crisis\./g,historyEnding);

  out=out.replace(/\bMy read:\s*/g,'').replace(/\bMy verdict:\s*/g,'').replace(/\bMy ruling, with all due ceremony:\s*/g,'');
  out=pluralTeamGrammar(out,allTeams);
  return out.replace(/\s{2,}/g,' ').trim();
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169U(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  const allTeams=out.teams||[];
  for(const team of allTeams){
    const article=team?.inquirer_article;
    if(!article)continue;
    diversifyRepeatedReceivingRead(article,team);
    for(const section of article.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(paragraph=>voiceDiversify(paragraph,team,article,allTeams)).filter(Boolean);
    }
    article.paragraphs=article.sections.flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169V=applyWeek2EditorialR16;
