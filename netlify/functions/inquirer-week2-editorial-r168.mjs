import {applyWeek2EditorialR16 as applyR167} from './inquirer-week2-editorial-r167.mjs';

function cleanMeta(team){
  const article=team?.inquirer_article;if(!article||!Array.isArray(article.sections))return team;
  for(const section of article.sections){
    if(!Array.isArray(section?.paragraphs))continue;
    section.paragraphs=section.paragraphs.map(p=>String(p||'')
      .replace(/keep receipts for Week 3/gi,'save some skepticism for Week 3')
      .replace(/the evidence is being inconvenient/gi,'the facts are being inconvenient')
      .replace(/hiding in the evidence/gi,'hiding on the bench')
      .replace(/match the evidence/gi,'match the results')
      .replace(/Two weeks is not evidence of destiny, but it is plenty of evidence for shouting/gi,'Two weeks does not prove destiny, but it is plenty of reason for shouting')
      .replace(/useful evidence of expectation/gi,'a useful measure of expectation')
      .replace(/enough evidence for an opinion/gi,'enough results for an opinion')
      .replace(/There is no evidence of an obvious management error here/gi,'There is no obvious management error here')
      .replace(/attached to the evidence/gi,'attached to what actually happened')
      .replace(/close the file/gi,'move on')
      .replace(/The useful finding is narrow/gi,'The useful point is narrow')
      .replace(/Management is not the finding/gi,'Management is not the issue')
      .replace(/declaring the case closed/gi,'declaring the argument settled')
      .replace(/strengthen the case/gi,'make the argument stronger')
    );
  }
  article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r168';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR167(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(cleanMeta);
  if(out.league_overview)out.league_overview.structure_revision='week2-r168';
  out.structure_revision='week2-r168';
  return out;
}

export const applyWeek2EditorialR168=applyWeek2EditorialR16;
