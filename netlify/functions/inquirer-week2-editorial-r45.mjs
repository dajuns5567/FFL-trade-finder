import {applyWeek2EditorialR16 as applyR44} from './inquirer-week2-editorial-r44.mjs';

function roleAngle(player){
 const pos=String(player?.position||'').toUpperCase(),line=String(player?.real_stat_line||'').toLowerCase();
 if(pos==='QB')return /carr|rush/.test(line)?'passing work with a rushing component':'the passing game';
 if(pos==='RB'||pos==='FB')return /rec/.test(line)?'carries plus receiving involvement':'the ground-game workload';
 if(pos==='WR'||pos==='TE')return /rec|target/.test(line)?'target-and-catch involvement':'the receiving role';
 const parts=[];
 if(/sack|qb hit|pressure/.test(line))parts.push('backfield pressure');
 if(/tackle|\bsolo\b|assist|tfl/.test(line))parts.push('tackle production');
 if(/interception|forced fumble|\bff\b|pass breakup|pbu/.test(line))parts.push('a splash play');
 return parts.length?parts.join(' plus '):'defensive involvement';
}

function lastName(player){
 const bits=String(player?.name||'').trim().split(/\s+/).filter(Boolean);
 return bits.at(-1)||String(player?.name||'').trim();
}

function reporterFollowThrough(rid,player,slot){
 const last=lastName(player);
 const variants={
  'walter-mercer':[
   `For ${last}, that kind of work is a much better reason to trust the result than getting cute with one Sunday.`,
   `${last} had an actual role underneath the fantasy result, so management can judge the usage before chasing the noise.`,
   `If ${last} keeps seeing work like that, I would rather follow the role than invent a problem that is not there.`
  ],
  'tess-delaney':[
   `${last} had enough real work attached to the performance that I can postpone the melodrama for another week.`,
   `For ${last}, volume may not be glamorous, but it wears a lot better than a fluke.`,
   `${last} gave the performance a real football spine, which is wonderfully inconvenient for anyone hoping to dismiss it as theater.`
  ],
  'mack-hollis':[
   `${last} had a role with actual substance underneath the shine, and that is the part I would carry into the next lineup decision.`,
   `For ${last}, the workload did more talking than the decoration, which is usually where I stop rolling my eyes.`,
   `${last} gave us football work to evaluate instead of a lucky ornament hanging off the final score.`
  ],
  'nora-voss':[
   `For ${last}, that role shape gives the performance a football reason to hold up instead of asking the point total for an alibi.`,
   `${last} supplied enough underlying work that I would judge the next result against the role, not against wishful thinking.`,
   `With ${last}, the important clue is that the production had a repeatable job underneath it rather than appearing from nowhere.`
  ]
 };
 const list=variants[rid]||variants['walter-mercer'];
 return list[slot%list.length];
}

function analysisParagraph(team,player,slot){
 const name=String(player?.name||'').trim(),opp=String(team?.opponent_name||'the opponent').trim(),rid=String(team?.inquirer_article?.reporter?.id||'');
 return `Against ${opp}, ${name}'s role showed up through ${roleAngle(player)}. ${reporterFollowThrough(rid,player,slot)}`;
}

function restorePlayerDepth(team){
 const article=team?.inquirer_article;if(!article)return team;
 const players=(article.sections||[]).find(s=>String(s?.kind||'')==='players');
 if(!players)return team;
 const starters=(team?.starter_details||[]).slice(0,3).filter(p=>String(p?.name||'').trim());
 if(!starters.length)return team;
 let slot=0;
 while((players.paragraphs||[]).length<6){
  const p=starters[slot%starters.length];
  players.paragraphs=[...(players.paragraphs||[]),analysisParagraph(team,p,slot)];
  slot++;
 }
 article.paragraphs=(article.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
 article.structure_revision='week2-r45';
 return team;
}

export function applyWeek2EditorialR16(raw){
 const out=applyR44(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 out.teams=(out.teams||[]).map(restorePlayerDepth);
 out.structure_revision='week2-r45';
 if(out.league_overview)out.league_overview.structure_revision='week2-r45';
 return out;
}

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
