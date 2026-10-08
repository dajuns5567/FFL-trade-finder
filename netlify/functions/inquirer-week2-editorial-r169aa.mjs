import {applyWeek2EditorialR16 as applyR169Z} from './inquirer-week2-editorial-r169z.mjs';
import {applyInquirerStoryContextToEdition} from './inquirer-story-context.mjs';

const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\export function applyWeek2EditorialR16(raw){');
function repairTeamPossessives(team){
  const a=team?.inquirer_article;if(!a)return team;
  const full=String(team?.team_name||'').trim(),short=full.split(/\s+/).filter(Boolean).at(-1)||'',names=[full,short].filter((v,i,arr)=>v&&/s$/i.test(v)&&arr.indexOf(v)===i);
  const fix=v=>{let x=String(v||'');for(const n of names)x=x.replace(new RegExp('\\b'+esc(n)+"['’]s\\b",'gi'),n+"'");return x};
  a.headline=fix(a.headline);a.deck=fix(a.deck);
  const seen=new Set();
  const dedupe=p=>String(p||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean).map(sentence=>{const key=sentence.toLowerCase().replace(/\s+/g,' ').trim();if(key.split(/\s+/).length<8)return sentence;if(!seen.has(key)){seen.add(key);return sentence}const stem=sentence.replace(/[.!?]+$/,'');return 'More specifically, '+stem.charAt(0).toLowerCase()+stem.slice(1)+'.'}).join(' ');
  for(const s of a.sections||[])s.paragraphs=(s.paragraphs||[]).map(fix).map(dedupe).filter(Boolean);
  a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]).filter(Boolean);return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169Z(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  applyInquirerStoryContextToEdition(out,{season:2026,week:2,previousEdition:null});
  out.teams=(out.teams||[]).map(repairTeamPossessives);
  return out;
}

export const applyWeek2EditorialR169AA=applyWeek2EditorialR16;
