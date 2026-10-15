import {applyWeek2EditorialR16 as applyR149} from './inquirer-week2-editorial-r149.mjs';

const teamName=t=>String(t?.team_name||t?.name||t?.mida_outlook?.name||'this team');
const mascot=n=>String(n||'team').trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const SCHEDULE_DIFFICULTY=/\b(?:stiffen|rougher|difficult stretch|hard part|hard stretch|hardens|gauntlet|resistance|heavy part|friendlier|friendly part|softer|manageable|forgiving|breathing room|favorable|mercy|soft landing|lowering the volume|mixed|split schedule|split the|uneven|difficulty level|lands in the middle|split screen)\b/i;
const lowerLead=s=>/^[A-Z][a-z]/.test(s)?s[0].toLowerCase()+s.slice(1):s;

function deTemplate(teams){
  const uses=new Map();
  for(const team of teams){
    const full=teamName(team),article=team?.inquirer_article;
    if(!article)continue;
    for(const section of article.sections||[]){
      for(const paragraph of section?.paragraphs||[]){
        for(const sentence of sentences(paragraph)){
          if(words(sentence)<8||SCHEDULE_DIFFICULTY.test(sentence))continue;
          const key=sentence.toLowerCase().replace(/\s+/g,' ').trim();
          const rows=uses.get(key)||[];rows.push(full);uses.set(key,rows);
        }
      }
    }
  }
  const shared=new Set([...uses.entries()].filter(([,names])=>new Set(names).size>=3).map(([key])=>key));
  if(!shared.size)return teams;
  for(const team of teams){
    const article=team?.inquirer_article;if(!article)continue;
    const short=mascot(teamName(team));
    for(const section of article.sections||[]){
      if(!Array.isArray(section?.paragraphs))continue;
      section.paragraphs=section.paragraphs.map(paragraph=>sentences(paragraph).map(sentence=>{
        const key=sentence.toLowerCase().replace(/\s+/g,' ').trim();
        return shared.has(key)?`For ${short}, ${lowerLead(sentence)}`:sentence;
      }).join(' '));
    }
    article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
    article.structure_revision='week2-r150';
  }
  return teams;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR149(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=deTemplate(out.teams||[]);
  if(out.league_overview)out.league_overview.structure_revision='week2-r150';
  out.structure_revision='week2-r150';
  return out;
}

export const applyWeek2EditorialR150=applyWeek2EditorialR16;
export const applyWeek2EditorialR149=applyWeek2EditorialR16;
export const applyWeek2EditorialR148=applyWeek2EditorialR16;
export const applyWeek2EditorialR147=applyWeek2EditorialR16;
export const applyWeek2EditorialR146=applyWeek2EditorialR16;
export const applyWeek2EditorialR145=applyWeek2EditorialR16;
export const applyWeek2EditorialR144=applyWeek2EditorialR16;
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
