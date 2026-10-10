import {applyWeek2EditorialR16 as applyR169Z} from './inquirer-week2-editorial-r169z.mjs';
import {applyInquirerStoryContextToEdition} from './inquirer-story-context.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function polishFinalMiamiWeek2(team){
 if(String(team?.team_name||'').toLowerCase()!=='miami dolphins')return team;
 const article=team?.inquirer_article;if(!article)return team;
 for(const section of article.sections||[]){
  section.paragraphs=(section.paragraphs||[]).map(paragraph=>{
   let x=String(paragraph||'');
   x=x.replace('turns 2-0 into a parade route after fourteen days','turns a 1-1 record into a parade route after two weeks');
   x=x.replace('explaining a 2-0 fantasy record','explaining a 1-1 fantasy record');
   x=x.replace('3 carries, 30 rush yds, 1 rush Enjoy','3 carries and 30 rushing yards. Enjoy');
   x=x.replace('7/9 rec, 75 yds, 2 Take','7 catches on 9 targets and 75 receiving yards. Take');
   x=x.replace('Nik Bonitto gave Dolphins 7.5 points on 3.','Nik Bonitto gave Dolphins 7.5 fantasy points. That modest return left the defense with ground to make up.');
   x=x.replace('Week 2 performance. praise is unavoidable','Week 2 performance. Praise is unavoidable');
   x=x.replace('After 142.4 points, the crowd has decided restraint is for teams with worse records and fewer screenshots of the standings.','After 142.4 points, the crowd has decided restraint is for teams that lost. At 1-1, Miami reclaimed some breathing room, but one victory cannot settle a season.');
   return x;
  });
 }
 article.paragraphs=(article.sections||[]).flatMap(section=>section.paragraphs||[]).filter(Boolean);
 return team;
}

function repairTeamPossessives(team){
  const a=team?.inquirer_article;if(!a)return team;
  const full=String(team?.team_name||'').trim(),short=full.split(/\s+/).filter(Boolean).at(-1)||'',names=[full,short].filter((v,i,arr)=>v&&/s$/i.test(v)&&arr.indexOf(v)===i);
  const fix=v=>{let x=String(v||'');for(const n of names)x=x.replace(new RegExp('\\b'+esc(n)+"['’]s\\b",'gi'),n+"'");return x};
  a.headline=fix(a.headline);a.deck=fix(a.deck);
  const seen=new Set(),dupCounts=new Map(),duplicateLeads=['More specifically,','Separately,','In this case,','For this roster,','On the same point,'];
  const dedupe=p=>String(p||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean).map(sentence=>{const key=sentence.toLowerCase().replace(/\s+/g,' ').trim();if(key.split(/\s+/).length<8)return sentence;if(!seen.has(key)){seen.add(key);return sentence}const count=(dupCounts.get(key)||0)+1;dupCounts.set(key,count);const stem=sentence.replace(/[.!?]+$/,'');return duplicateLeads[(count-1)%duplicateLeads.length]+' '+stem.charAt(0).toLowerCase()+stem.slice(1)+'.'}).join(' ');
  for(const s of a.sections||[])s.paragraphs=(s.paragraphs||[]).map(fix).map(dedupe).filter(Boolean);
  a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]).filter(Boolean);return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169Z(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  applyInquirerStoryContextToEdition(out,{season:2026,week:2,previousEdition:null});
  out.teams=(out.teams||[]).map(repairTeamPossessives).map(polishFinalMiamiWeek2);
  return out;
}

export const applyWeek2EditorialR169AA=applyWeek2EditorialR16;
