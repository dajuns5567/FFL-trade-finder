import {applyWeek2EditorialR16 as applyWeek2EditorialR23Base} from './inquirer-week2-editorial-r23.mjs';

export const WEEK2_EDITORIAL_REVISION=24;

const sentences=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const teamName=t=>String(t?.team_name||'').trim();
const shortTeam=n=>String(n||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(n||'').trim();
const possessive=n=>/s$/i.test(n)?`${n}'`:`${n}'s`;
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function grammar(t,s){
 const full=teamName(t),short=shortTeam(full);let x=String(s||'').trim();
 x=x.replace(/\bi\b/g,'I');
 x=x.replace(/\bFor ([A-Z][A-Za-z'.-]+),\s*good\.?/g,'Good.');
 x=x.replace(/\bThe record for ([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3}) are\s+([^.!?]+)/gi,'$1 are $2');
 x=x.replace(/\bMy Week 3 request for ([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3}) are simple\b/gi,'My Week 3 request for $1 is simple');
 if(short){x=x.replace(new RegExp(`\\b${esc(short)}'s\\b`,'g'),possessive(short))}
 if(full&&short&&full!==short){x=x.replace(new RegExp(`\\b${esc(full)}'s\\b`,'g'),possessive(short))}
 return x.replace(/\s+/g,' ').trim();
}

function reviseTeam(t){
 const a=t?.inquirer_article;if(!a)return t;
 a.sections=(a.sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>sentences(p).map(s=>grammar(t,s)).filter(Boolean).join(' ')).filter(Boolean)}));
 a.paragraphs=a.sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);a.editorial_revision=24;a.voice_revision='week2-r24';return t;
}
function reviseOverview(o){if(!o)return o;o.editorial_revision=24;o.voice_revision='week2-r24';return o}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR23Base(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(reviseTeam);out.league_overview=reviseOverview(out.league_overview);out.editorial_revision=24;out.voice_revision='week2-r24';return out;
}

export const applyWeek2EditorialR24=applyWeek2EditorialR16;
export const applyWeek2EditorialR23=applyWeek2EditorialR16;
export const applyWeek2EditorialR22=applyWeek2EditorialR16;
