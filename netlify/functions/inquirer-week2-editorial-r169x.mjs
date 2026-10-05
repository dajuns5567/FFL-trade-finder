import {applyWeek2EditorialR16 as applyR169W} from './inquirer-week2-editorial-r169w.mjs';

const CANNED=/That is dominance from the top and a warning label for everybody beneath it:\s*three people should not have to carry the grocery bags, the couch, and the fantasy team at the same time([.;])/g;

function rewriteTopHeavyScoring(text,team,article){
  const club=String(team?.team_name||'this team'),short=club.split(/\s+/).filter(Boolean).at(-1)||club,who=String(article?.reporter?.name||'Nick Swindell'),poss=/s$/i.test(short)?`${short}'`:`${short}'s`;
  return String(text||'').replace(CANNED,(_match,punctuation)=>{
    let replacement;
    if(who==='Tilly Fleecer')replacement=`${short} got the expensive seats right and left the rest of the lineup looking like it wandered in after intermission. Wonderful for the stars; mildly humiliating for everyone underneath them`;
    else if(who==='Bartholomew Roycington III')replacement=`${poss} best performers handled the aristocratic burden splendidly, while the lower order supplied enough mediocrity to keep the household from becoming unbearably pleased with itself`;
    else if(who==='Jefferson Filch')replacement=`${poss} top-end production did the heavy lifting. The rest of the lineup now has to contribute enough that the stars are not required to win the case by themselves every week`;
    else replacement=`${poss} best players did their jobs. The rest of the lineup owns the obvious problem: stop making the top of the roster cover for everybody else`;
    return replacement+punctuation;
  });
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169W(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[]){
    const article=team?.inquirer_article;
    if(!article)continue;
    for(const section of article.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(paragraph=>rewriteTopHeavyScoring(paragraph,team,article)).filter(Boolean);
    }
    article.paragraphs=article.sections.flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  }
  return out;
}

export const applyWeek2EditorialR169X=applyWeek2EditorialR16;
