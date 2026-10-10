import {applyWeek2EditorialR16 as applyR55} from './inquirer-week2-editorial-r55.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function hasHistoricalContext(paragraphs,player){
 const name=String(player?.name||'').trim();
 if(!name)return true;
 const bits=name.split(/\s+/).filter(Boolean),first=bits[0]||'',last=bits.at(-1)||'',prior=Number(player?.prior_season_avg),priorText=Number.isFinite(prior)?prior.toFixed(1):'',refs=[name,first.length>=4?first:'',last.length>=4?last:''].filter(Boolean);
 const hist=p=>/\b(?:2025|last season|last year|prior-season)\b/i.test(String(p||''))||(priorText&&String(p||'').includes(priorText)&&/\b(?:average|baseline|per game|prior|last)\b/i.test(String(p||'')));
 return (paragraphs||[]).some(p=>hist(p)&&refs.some(ref=>new RegExp(`(?:^|\\W)${esc(ref)}(?:$|\\W)`,'i').test(String(p||''))));
}

function baselineSentence(team,player,index){
 const name=String(player?.name||'').trim(),last=name.split(/\s+/).filter(Boolean).at(-1)||name,prior=Number(player?.prior_season_avg),voice=String(team?.inquirer_article?.reporter?.name||''),avg=prior.toFixed(1);
 const variants={
  'Nick Swindell':[
   `${last} carried a ${avg}-point 2025 average into Week 2; this result moved far enough from that baseline to matter.`,
   `The useful comparison on ${name} is the ${avg}-point 2025 average, because Week 2 departed enough from it to change the expectation.`
  ],
  'Tilly Fleecer':[
   `${last}'s 2025 average was ${avg} points per game; Week 2 moved far enough from that number to earn the extra attention.`,
   `${name} entered Week 2 with a ${avg}-point 2025 average, and this performance wandered far enough from it to deserve the spotlight.`
  ],
  'Bartholomew Roycington III':[
   `${last} brought a ${avg}-point 2025 average into Week 2; the new result was different enough to deserve notice without extra decoration.`,
   `For scale, ${name} averaged ${avg} points in 2025; Week 2 strayed far enough from that baseline to make the comparison useful.`
  ],
  'Jefferson Filch':[
   `The 2025 baseline on ${name} was ${avg} points per game; Week 2 departed enough from it to warrant inspection.`,
   `${last}'s prior-season average was ${avg}; the Week 2 result moved far enough away to qualify as a real change in the evidence.`
  ]
 };
 const list=variants[voice]||variants['Nick Swindell'];return list[index%list.length];
}

function restoreMissingHistory(team){
 const article=team?.inquirer_article;if(!article)return team;
 const section=(article.sections||[]).find(s=>String(s?.kind||'')==='players');if(!section)return team;
 const top=(team?.starter_details||[]).slice(0,3),paragraphs=[...(section.paragraphs||[])];
 let added=0;
 for(let i=0;i<top.length;i++){
  const p=top[i],prior=Number(p?.prior_season_avg),pts=Number(p?.points),games=Number(p?.prior_season_games)||0;
  if(!Number.isFinite(prior)||prior<=0||!Number.isFinite(pts)||games<6||Math.abs(pts-prior)<Math.max(4,prior*.3))continue;
  if(hasHistoricalContext(paragraphs,p))continue;
  const name=String(p?.name||'').trim(),last=name.split(/\s+/).filter(Boolean).at(-1)||name,re=new RegExp(`(?:^|\\W)(?:${esc(name)}|${esc(last)})(?:$|\\W)`,'i');
  const idx=paragraphs.findIndex(x=>re.test(String(x||'')));
  const sentence=baselineSentence(team,p,i+added);
  if(idx>=0)paragraphs[idx]=`${String(paragraphs[idx]||'').trim()} ${sentence}`.trim();
  else paragraphs.push(sentence);
  added++;
 }
 section.paragraphs=paragraphs;
 article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r56';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR55(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(restoreMissingHistory);
 out.structure_revision='week2-r56';
 if(out.league_overview)out.league_overview.structure_revision='week2-r56';
 return out;
}
export const applyWeek2EditorialR56=applyWeek2EditorialR16;
export const applyWeek2EditorialR55=applyWeek2EditorialR16;
export const applyWeek2EditorialR54=applyWeek2EditorialR16;
export const applyWeek2EditorialR53=applyWeek2EditorialR16;
export const applyWeek2EditorialR52=applyWeek2EditorialR16;
export const applyWeek2EditorialR51=applyWeek2EditorialR16;
export const applyWeek2EditorialR50=applyWeek2EditorialR16;
export const applyWeek2EditorialR49=applyWeek2EditorialR16;
export const applyWeek2EditorialR48=applyWeek2EditorialR16;
export const applyWeek2EditorialR47=applyWeek2EditorialR16;
export const applyWeek2EditorialR46=applyWeek2EditorialR16;
export const applyWeek2EditorialR45=applyWeek2EditorialR16;
export const applyWeek2EditorialR44=applyWeek2EditorialR16;
export const applyWeek2EditorialR43=applyWeek2EditorialR16;
export const applyWeek2EditorialR42=applyWeek2EditorialR16;
export const applyWeek2EditorialR41=applyWeek2EditorialR16;
export const applyWeek2EditorialR40=applyWeek2EditorialR16;
export const applyWeek2EditorialR39=applyWeek2EditorialR16;
export const applyWeek2EditorialR38=applyWeek2EditorialR16;
export const applyWeek2EditorialR37=applyWeek2EditorialR16;
export const applyWeek2EditorialR36=applyWeek2EditorialR16;
export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
