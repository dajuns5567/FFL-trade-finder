import {applyWeek2EditorialR16 as applyR169H} from './inquirer-week2-editorial-r169h.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const agreement={is:'are',has:'have',gets:'get',holds:'hold',brings:'bring',turns:'turn'};

function fixPluralTeamAgreement(team){
  const article=team?.inquirer_article,full=String(team?.team_name||'').trim(),mascot=full.split(/\s+/).filter(Boolean).at(-1)||'';
  if(!article||!Array.isArray(article.sections)||!mascot||!/s$/i.test(mascot))return;
  const aliases=[full,mascot].filter(Boolean).sort((a,b)=>b.length-a.length).map(esc).join('|');
  const re=new RegExp(`(^|[.!?]\\s+)(${aliases})(\\s+)(is|has|gets|holds|brings|turns)\\b`,'gi');
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(paragraph=>String(paragraph||'').replace(re,(match,prefix,subject,space,verb)=>`${prefix}${subject}${space}${agreement[String(verb).toLowerCase()]||verb}`));
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169H(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  for(const team of out.teams||[])fixPluralTeamAgreement(team);
  return out;
}

export const applyWeek2EditorialR169I=applyWeek2EditorialR16;
