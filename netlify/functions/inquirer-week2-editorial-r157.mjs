import {applyWeek2EditorialR16 as applyR156} from './inquirer-week2-editorial-r156.mjs';

const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const shortRef=team=>String(team?.team_name||team?.name||'team').trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const addedContext=/\bMIDA\b|finished top eight in scoring|finished bottom eight in scoring|landed in the middle(?: tier| of the league)?|\b(?:about|roughly)\s+\d+(?:\.\d+)?%\s+of\b/i;

function lowerFirst(s){return s?`${s.charAt(0).toLowerCase()}${s.slice(1)}`:s;}

function anchorAddedVoice(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const ref=shortRef(team);
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>{
      const text=String(p||'').trim();
      if(!addedContext.test(text))return text;
      const ss=sentences(text);
      if(ss.length<2)return text;
      return ss.map((s,i)=>{
        if(i===0||words(s)<8||new RegExp(`^For ${ref}\\b`,'i').test(s))return s;
        return `For ${ref}, ${lowerFirst(s)}`;
      }).join(' ');
    });
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r157';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR156(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(anchorAddedVoice);
  if(out.league_overview)out.league_overview.structure_revision='week2-r157';
  out.structure_revision='week2-r157';
  return out;
}

export const applyWeek2EditorialR157=applyWeek2EditorialR16;
export const applyWeek2EditorialR156=applyWeek2EditorialR16;
export const applyWeek2EditorialR155=applyWeek2EditorialR16;
export const applyWeek2EditorialR154=applyWeek2EditorialR16;
export const applyWeek2EditorialR153=applyWeek2EditorialR16;
export const applyWeek2EditorialR152=applyWeek2EditorialR16;
export const applyWeek2EditorialR151=applyWeek2EditorialR16;
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
