import {applyWeek2EditorialR16 as applyR169C} from './inquirer-week2-editorial-r169c.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const wordCount=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentenceParts=text=>clean(text).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
const shortRef=team=>String(team?.team_name||team?.name||'this team').trim().split(/\s+/).filter(Boolean).at(-1)||'this team';

function replacement(team,index){
  const ref=shortRef(team);
  const rows=[
    `${ref} has already supplied that point once. The useful consequence now is whether Week 3 gives the roster a better answer instead of another version of the same problem.`,
    `${ref} does not need the same conclusion twice. What matters from here is whether the role, decision or matchup actually changes what happens next.`,
    `${ref} has already established that part of the case. The next useful read is whether the same ingredients create a different fantasy result in Week 3.`,
    `${ref} can leave that point in the record and move on. The next game has to show whether it was a temporary warning or something the roster keeps repeating.`
  ];
  return rows[index%rows.length];
}

function rewriteDuplicates(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return;
  const seen=new Map();
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(raw=>{
      const out=[];
      for(const sentence of sentenceParts(raw)){
        const key=sentence.toLowerCase();
        const count=seen.get(key)||0;
        seen.set(key,count+1);
        if(wordCount(sentence)>=8&&count>0)out.push(replacement(team,count-1));
        else out.push(sentence);
      }
      return clean(out.join(' '));
    }).filter(Boolean);
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169C(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[])rewriteDuplicates(team);
  return out;
}

export const applyWeek2EditorialR169E=applyWeek2EditorialR16;
