import {applyWeek2EditorialR16 as applyR169V} from './inquirer-week2-editorial-r169v.mjs';

const PLAYER='([A-Z][A-Za-z’\'.-]+(?:\\s+[A-Z][A-Za-z’\'.-]+){0,3})';

function anchorGenericFollowups(text,team){
  let out=String(text||''),club=String(team?.team_name||'this team'),short=club.split(/\s+/).filter(Boolean).at(-1)||club;
  out=out.replace(new RegExp(`Last season, ${PLAYER} averaged (\\d+(?:\\.\\d+)?) fantasy points per game\\. That is the benchmark, not a ceiling by law\\.`,'g'),(_m,name,avg)=>`Last season, ${name} averaged ${avg} fantasy points per game; ${name}'s 2025 rate is the benchmark, not a ceiling by law.`);
  out=out.replace(new RegExp(`The 2025 baseline for ${PLAYER} was (\\d+(?:\\.\\d+)?) fantasy points per game; that is prior evidence, not a verdict\\.`,'g'),(_m,name,avg)=>`In 2025, ${name} averaged ${avg} fantasy points per game; useful history, but Week 2 gets to argue with it.`);
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
  return out;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169V(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    for(const section of article.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(paragraph=>anchorGenericFollowups(paragraph,team)).filter(Boolean);
    }
    article.paragraphs=article.sections.flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169W=applyWeek2EditorialR16;
