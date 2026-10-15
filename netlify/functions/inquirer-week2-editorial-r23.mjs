import {applyWeek2EditorialR16 as applyWeek2EditorialR22Base} from './inquirer-week2-editorial-r22.mjs';

export const WEEK2_EDITORIAL_REVISION=23;

const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const teamName=t=>String(t?.team_name||'This team').trim();
const shortTeam=full=>String(full||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(full||'').trim();
const possessive=name=>/s$/i.test(name)?`${name}'`:`${name}'s`;
const reporterId=t=>String(t?.inquirer_article?.reporter?.id||'walter-mercer');
const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

const CARRY_MOTIF=/\b(?:carry(?:ing|ied|ies)? (?:the |this )?(?:entire |whole )?(?:roster|team|offense)|on (?:his|her|their) (?:back|shoulders)|one[- ]man show|one[- ]player show|one[- ]player magic trick|solo effort|supporting cast|second punch|third scorer|keep(?:ing)? (?:the |this )?(?:roster|team) afloat|hold(?:ing)? (?:the |this )?(?:roster|team) together|can(?:not|'t) do it alone|needs? (?:somebody|someone) else to help|whole roster to repeat|asking the whole roster)\b/i;
const BAD_TAG=/\b(?:Fleeced Signal (?:was|is|says)|the Fleeced Signal|Signal was (?:Breakout Watch|Hot Seat|Cool Throne))\b/i;
const META_METHOD=/\b(?:headline|back page|copy desk|newsroom|typeface|case file|receipts?|scoring app|group chat|notification|screenshot|social media|algorithm|meme|MIDA|probability model|projection creates an expectation|accounting with the game missing|accounting in a cheap costume|scoring quality|market movement and weekly production are answering different questions|identify the decision management should repeat or correct)\b/i;
const EMPTY_TEMPLATES=[
 /found a player who owned the scene/i,
 /Management should resist rewriting the script before the applause stops/i,
 /made Sunday loud enough that triumph and public embarrassment shared the same stage/i,
 /made one lineup decision feel expensive enough to deserve its own orchestra/i,
 /chose the lineup, and the lineup returned the favor by judging management in public/i,
 /have a market number wearing formal clothes/i,
 /moved in the market, and everyone loves a price tag until Sunday arrives with better dialogue/i,
 /The tragedy has been considerate enough to explain itself/i,
 /keeps supplying its own punchlines; nobody needs to help/i,
 /crowd has chosen emotional excess/i,
 /Finally, some sensible decision-making around/i
];

function normalizeSignal(text){
 let x=String(text||'');
 x=x.replace(/([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})(?:'s|’s)\s+Fleeced Signal was\s+([^.;]+)/gi,'$1 entered Week 2 on $2');
 x=x.replace(/The Fleeced Signal for\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s+was\s+([^.;]+)/gi,'$1 entered Week 2 on $2');
 x=x.replace(/\bFleeced Signal was\s+([^.;]+)/gi,'the Week 2 tag was $1');
 x=x.replace(/\bFleeced\s+(Breakout Watch|Hot Seat|Cool Throne|Established Star|Steady Veteran|Young Breakout|Proven Star)\s+signal\b/gi,'$1 tag');
 return x;
}

function cleanupSentence(t,s){
 const full=teamName(t),short=shortTeam(full);
 let x=normalizeSignal(String(s||'').trim());
 if(!x||CARRY_MOTIF.test(x)||EMPTY_TEMPLATES.some(re=>re.test(x)))return'';
 x=x.replace(/\bi\b/g,'I');
 x=x.replace(new RegExp(`The record for ${esc(full)} are\\s+([^.!?]+)`, 'gi'),`${short} are $1`);
 x=x.replace(new RegExp(`My Week 3 request for ${esc(full)} are simple`, 'gi'),`My Week 3 request for ${short} is simple`);
 x=x.replace(new RegExp(`For ${esc(full)},\\s*good\\.?`, 'gi'),'Good.');
 x=x.replace(new RegExp(`${esc(full)}'s\\b`, 'gi'),possessive(short));
 x=x.replace(new RegExp(`${esc(short)}'s\\b`, 'gi'),possessive(short));
 x=x.replace(new RegExp(`With ${esc(full)},\\s*I respect the commitment`, 'gi'),`I respect the commitment from ${short}`);
 x=x.replace(/The projection creates an expectation, but treating it as a result before kickoff is accounting with the game missing\.?/gi,'The forecast is useful, but Sunday still gets the last word.');
 x=x.replace(/Records can brag later; scoring quality already told us which Sunday was actually impressive\.?/gi,'A win can hide a lousy score. The point totals tell us who actually played well.');
 x=x.replace(/Records matter, but letting them impersonate scoring quality is accounting in a cheap costume\.?/gi,'A clean record can still come from an ugly Sunday. Judge the performance before praising the record.');
 x=x.replace(/I refuse to grade the lineup by the record alone; scoring context shows how well it actually performed\.?/gi,'I refuse to praise the record if the lineup played badly. The score still matters.');
 x=x.replace(/Market movement and weekly production are answering different questions; confusing them is how managers buy confidence at retail price\.?/gi,'Roster value moved one way while the lineup moved another. Sunday points still decide the matchup.');
 x=x.replace(/I want one useful takeaway: identify the decision management should repeat or correct next week\.?/gi,'I want one useful takeaway: keep the decisions that worked and fix the ones that cost points.');
 x=x.replace(/MIDA already gives/gi,'The current title odds give');
 x=x.replace(/MIDA still has/gi,'The current playoff outlook has');
 x=x.replace(/\bscoring quality\b/gi,'actual scoring');
 x=x.replace(/\bprobability model\b/gi,'odds');
 return x.replace(/\s+/g,' ').trim();
}

function replaceLaterRefs(text,full,state){
 const short=shortTeam(full);if(!full||full===short)return text;
 const re=new RegExp(`${esc(full)}(?:('s|’s))?`,'gi');
 return String(text||'').replace(re,(m,poss)=>{
  if(!state.seen){state.seen=true;return m}
  return poss?possessive(short):short;
 });
}

function playerNames(t,sections){
 const set=new Set((t?.starter_details||[]).map(p=>String(p?.name||'').trim()).filter(Boolean));
 const patterns=[/^Against .+?,\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+scored\b/i,/^([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+averaged\b/i,/^The prior baseline for\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\b/i];
 for(const s of sections.flatMap(x=>x?.paragraphs||[]).flatMap(sentenceParts))for(const re of patterns){const m=s.match(re);if(m){set.add(m[1]);break}}
 return [...set].sort((a,b)=>b.length-a.length);
}

function namedPlayer(sentence,players){
 const lower=String(sentence||'').toLowerCase();
 return players.find(p=>{const i=lower.indexOf(p.toLowerCase());if(i<0)return false;const before=sentence[i-1]||'',after=sentence[i+p.length]||'';return !/[A-Za-z]/.test(before)&&!/[A-Za-z]/.test(after)})||null;
}

function priorAverageMap(t){
 const map=new Map();for(const p of t?.starter_details||[]){const n=String(p?.name||'').trim(),v=Number(p?.prior_season_avg);if(n&&Number.isFinite(v))map.set(n.toLowerCase(),v)}return map;
}

function isScoreFact(s,p){
 const e=esc(p);
 return /real-football line|\bscored\s+-?\d+(?:\.\d+)?\s+fantasy points|\bgave (?:the lineup|\w+)\s+-?\d+(?:\.\d+)?|\bgets the (?:love|praise) after\s+-?\d|\bears? clean credit at\s+-?\d|\bdropped\s+-?\d+(?:\.\d+)?|\bhad a bad Week 2 at\s+-?\d|\bat\s+-?\d+(?:\.\d+)?\s+is specific enough|\bbeat projection by\s+-?\d|\bposted\s+-?\d+(?:\.\d+)?|\banswered with\s+-?\d+(?:\.\d+)?/i.test(s)||new RegExp(`^${e}\\s+(?:scored|gave|posted|delivered)\\b`,'i').test(s);
}

function rewriteDuplicateScore(s,p,prior){
 if(/entered Week 2 (?:on|tagged)/i.test(s))return s.replace(/\s+and answered with\s+-?\d+(?:\.\d+)?\.?$/i,'.');
 if(/gets the (?:love|praise) after|earns? clean credit at/i.test(s))return `${p} earned the praise. Management should treat the role like something worth keeping.`;
 if(/dropped\s+-?\d/i.test(s)&&/fans/i.test(s))return `${p} gave the fans something real to celebrate, and they are allowed to be loud about the football that earned it.`;
 if(/at\s+-?\d+(?:\.\d+)?\s+is specific enough/i.test(s))return `${p}'s bad Sunday is specific enough for criticism without turning one result into a new identity.`;
 if(/problem with .* is plain/i.test(s)&&Number.isFinite(prior)&&prior>=12)return `${p} had a bad Sunday. The established baseline means the role deserves more patience than the box score did.`;
 return'';
}

function semanticDedupe(t,sections){
 const players=playerNames(t,sections),priors=priorAverageMap(t),scoreSeen=new Set(),baselineSeen=new Set(),usageSeen=new Set(),tagSeen=new Set(),exactSeen=new Set();
 const order=[...sections.keys()].sort((a,b)=>String(sections[a]?.kind||'')==='players'?-1:String(sections[b]?.kind||'')==='players'?1:a-b),out=new Map();
 for(const idx of order){const sec=sections[idx],paras=[];
  for(const p of sec?.paragraphs||[]){const kept=[];
   for(let s of sentenceParts(p)){
    const exact=s.toLowerCase().replace(/\s+/g,' ').trim();if(exact.split(/\s+/).length>=8&&exactSeen.has(exact))continue;if(exact.split(/\s+/).length>=8)exactSeen.add(exact);
    const player=namedPlayer(s,players);if(!player){kept.push(s);continue}
    const key=player.toLowerCase(),prior=priors.get(key);
    if(/prior baseline|prior average|averaged\s+\d+(?:\.\d+)?\s+fantasy points/i.test(s)){if(baselineSeen.has(key))continue;baselineSeen.add(key);kept.push(s);continue}
    if(/snap share|available snaps|played\s+\d+(?:\.\d+)?%/i.test(s)){if(usageSeen.has(key))continue;usageSeen.add(key);kept.push(s);continue}
    if(/Breakout Watch|Hot Seat|Cool Throne|Established Star|Steady Veteran|Young Breakout|Proven Star|entered Week 2 (?:on|tagged)|Week 2 tag/i.test(s)){if(tagSeen.has(key)){s=s.replace(/entered Week 2 (?:on|tagged)\s+[^.;]+[.;]?/i,'').trim();if(!s)continue}else tagSeen.add(key)}
    if(isScoreFact(s,player)){if(scoreSeen.has(key)){const alt=rewriteDuplicateScore(s,player,prior);if(!alt)continue;s=alt}else scoreSeen.add(key)}
    kept.push(s);
   }
   const next=kept.join(' ').replace(/\s+/g,' ').trim();if(next)paras.push(next);
  }
  out.set(idx,{...sec,paragraphs:paras});
 }
 return sections.map((s,i)=>out.get(i)||s);
}

function articleCleanup(t){
 const a=t?.inquirer_article;if(!a)return t;
 let sections=(a.sections||[]).map(sec=>({...sec,paragraphs:(sec?.paragraphs||[]).map(p=>sentenceParts(p).map(s=>cleanupSentence(t,s)).filter(Boolean).join(' ')).filter(Boolean)}));
 sections=semanticDedupe(t,sections);
 sections=sections.map(sec=>{const state={seen:false};return{...sec,paragraphs:(sec?.paragraphs||[]).map(p=>replaceLaterRefs(p,teamName(t),state)).filter(Boolean)}});
 a.sections=sections;a.paragraphs=sections.flatMap(s=>s?.paragraphs||[]).filter(Boolean);a.editorial_revision=23;a.voice_revision='week2-r23';return t;
}

function recapCleanup(overview,teams){
 if(!overview)return overview;const fullNames=(teams||[]).map(t=>teamName(t)).filter(Boolean).sort((a,b)=>b.length-a.length);
 overview.sections=(overview.sections||[]).map(sec=>{const states=new Map(fullNames.map(n=>[n,{seen:false}]));const paragraphs=(sec?.paragraphs||[]).map(p=>{
   let x=sentenceParts(p).map(s=>cleanupSentence({team_name:'the league'},s)).filter(Boolean).join(' ');
   for(const full of fullNames)x=replaceLaterRefs(x,full,states.get(full));
   return x.replace(/\s+/g,' ').trim();
  }).filter(Boolean);return{...sec,heading:String(sec?.heading||'').replace(/\bheadline\b/gi,'result').replace(/\bback page\b/gi,'week').replace(/\breceipts?\b/gi,'results'),paragraphs};});
 overview.editorial_revision=23;overview.voice_revision='week2-r23';return overview;
}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR22Base(raw);if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(articleCleanup);out.league_overview=recapCleanup(out.league_overview,out.teams);out.editorial_revision=23;out.voice_revision='week2-r23';return out;
}

export const applyWeek2EditorialR23=applyWeek2EditorialR16;
export const applyWeek2EditorialR22=applyWeek2EditorialR16;
export const applyWeek2EditorialR21=applyWeek2EditorialR16;
export const applyWeek2EditorialR20=applyWeek2EditorialR16;
export const applyWeek2EditorialR19=applyWeek2EditorialR16;
export const applyWeek2EditorialR15=applyWeek2EditorialR16;
