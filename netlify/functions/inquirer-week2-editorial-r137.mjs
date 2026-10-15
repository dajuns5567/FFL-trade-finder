import {applyWeek2EditorialR16 as applyR136} from './inquirer-week2-editorial-r136.mjs';

const splitSentences=text=>String(text||'').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
const fullName=team=>String(team?.name||team?.team_name||team?.mida_outlook?.name||'this team');
const shortName=name=>String(name||'team').replace(/^(New England|New York|Los Angeles|Las Vegas|San Francisco|Kansas City|New Orleans|Tampa Bay)\s+/,'').trim();

const ADDED_VOICE=/(?:Week 2 scoring with|real bench answer|genuine alternative available|playable answer on the bench|fake lineup scandal|offers no proper lineup scandal|did not leave an obvious better answer on the bench|fans for patience|supporters are entitled to impatience|fans are not overreacting|fans are allowed to be irritated|fans have earned the right|supporters may enjoy themselves|fans can celebrate|fans have earned some swagger|fans are at 1-1|supporters sit at 1-1|\bMIDA\b)/i;

function personalizeParagraph(paragraph,team){
  if(!ADDED_VOICE.test(String(paragraph||'')))return paragraph;
  const full=fullName(team),short=shortName(full);
  const ss=splitSentences(paragraph);
  return ss.map((s,i)=>{
    if(i===0)return s;
    if(new RegExp(`\\b${String(short).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(s))return s;
    return `For ${short}, ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
  }).join(' ');
}

function personalizeTeam(team){
  const article=team?.inquirer_article;
  if(!article||!Array.isArray(article.sections))return team;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>personalizeParagraph(p,team));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r137';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR136(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(personalizeTeam);
  if(out.league_overview)out.league_overview.structure_revision='week2-r137';
  out.structure_revision='week2-r137';
  return out;
}

export const applyWeek2EditorialR137=applyWeek2EditorialR16;
export const applyWeek2EditorialR136=applyWeek2EditorialR16;
export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
