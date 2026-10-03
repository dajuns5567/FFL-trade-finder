import {applyWeek2EditorialR16 as applyR35} from './inquirer-week2-editorial-r35.mjs';

const splitSentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const clean=s=>String(s||'').replace(/\s+/g,' ').replace(/\s+([,.;!?])/g,'$1').trim();
const pct=n=>`${(Number(n)*100).toFixed(1)}%`;

const ROLE_TEMPLATE=/^(.+?)'s Week 2 role was (?:larger than it was last season|smaller than it was last season|worth noting, but the fantasy result still matters more)\.$/i;
const PRAISE_TEMPLATE=/^(.+?) earned the praise this week\.$/i;

function roleSentence(reporterId,p){
 const name=String(p?.name||'').trim();
 const current=Number(p?.current_snap_pct),prior=Number(p?.prior_season_snap_pct),count=Number(p?.current_snap_count);
 if(!name||!Number.isFinite(current)||!Number.isFinite(prior))return '';
 if(current===0||count===0){
  if(reporterId==='walter-mercer')return `${name} logged no Week 2 snaps; last season's share was ${pct(prior)}.`;
  if(reporterId==='tess-delaney')return `${name} never logged a Week 2 snap; last season's share was ${pct(prior)}.`;
  if(reporterId==='mack-hollis')return `${name} had no Week 2 snaps after carrying a ${pct(prior)} share last season.`;
  return `${name} logged no Week 2 snaps, down from a ${pct(prior)} share last season.`;
 }
 if(reporterId==='walter-mercer')return `${name} played ${pct(current)} of the snaps in Week 2 after a ${pct(prior)} share last season.`;
 if(reporterId==='tess-delaney')return `${name} was on the field for ${pct(current)} of the snaps in Week 2; last season's share was ${pct(prior)}.`;
 if(reporterId==='mack-hollis')return `${name} logged a ${pct(current)} Week 2 snap share, compared with ${pct(prior)} last season.`;
 return `${name}'s Week 2 snap share was ${pct(current)}, versus ${pct(prior)} last season.`;
}

function coolThroneSentence(reporterId,names){
 const joined=names.length>1?`${names.slice(0,-1).join(', ')} and ${names.at(-1)}`:(names[0]||'This group');
 if(reporterId==='walter-mercer')return `${joined} gave me the cleanest reason to stop complaining for a minute.`;
 if(reporterId==='tess-delaney')return `${joined} can have the applause; I will resume being difficult shortly.`;
 if(reporterId==='mack-hollis')return `${joined} get the flowers before I discover a reason to throw the vase.`;
 return `${joined} did enough to earn credit without turning this into a ceremony.`;
}

function reviseTeam(team){
 const article=team?.inquirer_article;if(!article)return team;
 const reporterId=String(article?.reporter?.id||'');
 const players=new Map((team?.starter_details||[]).map(p=>[String(p?.name||'').toLowerCase(),p]));
 article.sections=(article.sections||[]).map(sec=>{
  const isPlayers=String(sec?.kind||'')==='players';
  const isCool=String(sec?.kind||'')==='cool-throne';
  const paragraphs=(sec?.paragraphs||[]).map(raw=>{
   const out=[];
   for(const s of splitSentences(raw)){
    if(isPlayers&&ROLE_TEMPLATE.test(s)){
     const m=s.match(ROLE_TEMPLATE),p=players.get(String(m?.[1]||'').toLowerCase());
     const replacement=roleSentence(reporterId,p);
     if(replacement)out.push(replacement);
     continue;
    }
    if(isCool&&PRAISE_TEMPLATE.test(s)){
     const m=s.match(PRAISE_TEMPLATE),rawNames=String(m?.[1]||'').trim();
     const names=rawNames.split(/\s+and\s+/i).map(x=>x.trim()).filter(Boolean);
     out.push(coolThroneSentence(reporterId,names));
     continue;
    }
    out.push(s);
   }
   return clean(out.join(' '));
  }).filter(Boolean);
  return {...sec,paragraphs};
 });
 article.paragraphs=article.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR35(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(reviseTeam);
 out.structure_revision='week2-r36';
 for(const t of out.teams||[])if(t?.inquirer_article)t.inquirer_article.structure_revision='week2-r36';
 if(out.league_overview)out.league_overview.structure_revision='week2-r36';
 return out;
}

export const applyWeek2EditorialR36=applyWeek2EditorialR16;
export const applyWeek2EditorialR35=applyWeek2EditorialR16;
export const applyWeek2EditorialR34=applyWeek2EditorialR16;
export const applyWeek2EditorialR33=applyWeek2EditorialR16;
export const applyWeek2EditorialR32=applyWeek2EditorialR16;
export const applyWeek2EditorialR31=applyWeek2EditorialR16;
export const applyWeek2EditorialR30=applyWeek2EditorialR16;
export const applyWeek2EditorialR29=applyWeek2EditorialR16;
export const applyWeek2EditorialR28=applyWeek2EditorialR16;
