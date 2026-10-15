import {applyWeek2EditorialR16 as applyR169F} from './inquirer-week2-editorial-r169f.mjs';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentences=s=>clean(s).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
const shortRef=team=>String(team?.team_name||team?.name||'this team').trim().split(/\s+/).filter(Boolean).at(-1)||'Team';

function crossTeamRepeats(teams){
  const map=new Map();
  for(const team of teams||[]){
    const full=String(team?.team_name||''),article=team?.inquirer_article;
    for(const section of article?.sections||[]){
      for(const paragraph of section?.paragraphs||[]){
        for(const sentence of sentences(paragraph)){
          if(words(sentence)<8)continue;
          const key=sentence.toLowerCase();
          const row=map.get(key)||{sentence,teams:new Set()};
          row.teams.add(full);map.set(key,row);
        }
      }
    }
  }
  return new Set([...map.entries()].filter(([,row])=>row.teams.size>=3).map(([key])=>key));
}

function personalize(team,repeatKeys){
  const article=team?.inquirer_article;if(!article)return;
  const ref=shortRef(team);
  for(const section of article.sections||[]){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>sentences(paragraph).map(sentence=>{
      if(!repeatKeys.has(sentence.toLowerCase()))return sentence;
      return `${ref}: ${sentence}`;
    }).join(' '));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169F(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  const repeats=crossTeamRepeats(out.teams||[]);
  if(repeats.size)for(const team of out.teams||[])personalize(team,repeats);
  return out;
}

export const applyWeek2EditorialR169G=applyWeek2EditorialR16;
