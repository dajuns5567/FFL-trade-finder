import {applyWeek2EditorialR16 as applyR164} from './inquirer-week2-editorial-r164.mjs';

const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const shortRef=team=>String(team?.team_name||team?.name||'team').trim().split(/\s+/).filter(Boolean).at(-1)||'team';
const addedVoice=/\bMIDA\b|motivational poster|supplies enough chaos|Revolutionary concept|butter knife|philosophical retreat|making a correct lineup decision|management question is narrow|management scandal|standard is simple: criticize|turn this into a seminar|controllable part|Bad luck is annoying|unreasonable messages|missing-person report|fan base has enough evidence|victory lap indoors|maintain standards without becoming uncivilized|public mood is neither|useful pressure|scoring problem to stop|crowd is not confused|fans can be loud for a week|fans have every right to be irritated|parade or a crisis meeting/i;

function lowerFirst(s){return s?`${s.charAt(0).toLowerCase()}${s.slice(1)}`:s;}

function anchorTeamVoice(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  const ref=shortRef(team),refRe=new RegExp(`\\b${ref.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}\\b`,'i');
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>{
      const text=String(p||'').trim();if(!addedVoice.test(text))return text;
      return sentences(text).map((s,i)=>{
        if(refRe.test(s)||/^[A-Z][A-Za-z .'-]+(?:fans|supporters)\b/.test(s))return s;
        if(i===0&&/^[A-Z][A-Za-z .'-]+\b/.test(s)&&!/^The\b/.test(s))return s;
        return `For ${ref}, ${lowerFirst(s)}`;
      }).join(' ');
    });
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r165';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR164(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(anchorTeamVoice);
  if(out.league_overview)out.league_overview.structure_revision='week2-r165';
  out.structure_revision='week2-r165';
  return out;
}

export const applyWeek2EditorialR165=applyWeek2EditorialR16;
