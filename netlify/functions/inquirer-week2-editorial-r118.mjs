import {applyWeek2EditorialR16 as applyR117} from './inquirer-week2-editorial-r117.mjs';

const n=v=>Number(v);
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');
const city=name=>{const bits=String(name||'').trim().split(/\s+/).filter(Boolean);return bits.length>1?bits.slice(0,-1).join(' '):String(name||'Team');};
const divisionLabel=value=>String(value||'').trim().split(/\s+/).filter(Boolean).map((part,i)=>i===0?part.toUpperCase():part.charAt(0).toUpperCase()+part.slice(1).toLowerCase()).join(' ');
const recordText=r=>`${n(r?.wins)||0}-${n(r?.losses)||0}${n(r?.ties)?`-${n(r.ties)}`:''}`;

function refine(team,byRoster){
  const article=team?.inquirer_article;if(!article)return team;
  const outlook=(article.sections||[]).find(s=>String(s?.kind||'')==='outlook');
  if(!outlook||!Array.isArray(outlook.paragraphs)||!outlook.paragraphs.length)return team;

  const opp=String(team?.next_opponent_name||'').trim();
  const div=divisionLabel(team?.next_opponent_division_context?.division_name);
  const oppRec=recordText(team?.next_opponent_context?.record);
  if(opp&&div&&outlook.paragraphs[0]&&String(outlook.paragraphs[0]).toLowerCase()!=='n/a'){
    const original=String(outlook.paragraphs[0]);
    const dot=original.indexOf('.');
    const rest=dot>=0?original.slice(dot+1).trim():'';
    outlook.paragraphs[0]=`${team.team_name} faces ${opp} next. ${city(opp)} enters Week 3 at ${oppRec} in the ${div}.${rest?` ${rest}`:''}`;
  }

  const s=short(team?.team_name);
  if(outlook.paragraphs[1]&&new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} gets one opponent at a time;`,'i').test(String(outlook.paragraphs[1]))){
    outlook.paragraphs[1]=`For ${s}, Week 3 comes first; the later schedule can wait until this matchup is settled.`;
  }

  const ownDiv=divisionLabel(team?.division_context?.division_name);
  const leaders=(team?.division_context?.leaders||[]).filter(x=>x?.team_name||x?.roster_id);
  const selfLeading=leaders.some(x=>String(x?.roster_id||'')===String(team?.roster_id||''));
  const others=leaders.filter(x=>String(x?.roster_id||'')!==String(team?.roster_id||''));
  if(selfLeading&&others.length&&ownDiv){
    const names=others.map(x=>byRoster.get(String(x?.roster_id||''))?.team_name||x?.team_name).filter(Boolean);
    const joined=names.length>1?`${names.slice(0,-1).join(', ')} and ${names.at(-1)}`:names[0];
    if(joined){
      const tie=`${city(team?.team_name)} shares the ${ownDiv} lead with ${joined}.`;
      const idx=Math.min(1,outlook.paragraphs.length-1);
      if(!/\b(?:tied|shares|level)\b/i.test(String(outlook.paragraphs[idx]||'')))outlook.paragraphs[idx]=`${String(outlook.paragraphs[idx]||'').trim()} ${tie}`.trim();
    }
  }

  outlook.paragraphs=outlook.paragraphs.map(p=>String(p||'').replace(/;\s*([^.;!?]+?) gets a clean chance to make that gap look wrong\./gi,'; Week 3 will show whether $1 can make that gap look wrong.'));
  article.paragraphs=(article.sections||[]).flatMap(section=>section?.paragraphs||[]).filter(Boolean);
  article.structure_revision='week2-r118';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR117(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  const byRoster=new Map((out.teams||[]).map(t=>[String(t?.roster_id||''),t]));
  out.teams=(out.teams||[]).map(team=>refine(team,byRoster));
  out.structure_revision='week2-r118';
  if(out.league_overview)out.league_overview.structure_revision='week2-r118';
  return out;
}
export const applyWeek2EditorialR118=applyWeek2EditorialR16;
export const applyWeek2EditorialR117=applyWeek2EditorialR16;
export const applyWeek2EditorialR116=applyWeek2EditorialR16;
export const applyWeek2EditorialR115=applyWeek2EditorialR16;
export const applyWeek2EditorialR114=applyWeek2EditorialR16;
export const applyWeek2EditorialR113=applyWeek2EditorialR16;
export const applyWeek2EditorialR112=applyWeek2EditorialR16;
export const applyWeek2EditorialR111=applyWeek2EditorialR16;
export const applyWeek2EditorialR110=applyWeek2EditorialR16;
export const applyWeek2EditorialR109=applyWeek2EditorialR16;
export const applyWeek2EditorialR108=applyWeek2EditorialR16;
export const applyWeek2EditorialR107=applyWeek2EditorialR16;
export const applyWeek2EditorialR106=applyWeek2EditorialR16;
export const applyWeek2EditorialR105=applyWeek2EditorialR16;
export const applyWeek2EditorialR104=applyWeek2EditorialR16;
export const applyWeek2EditorialR103=applyWeek2EditorialR16;
export const applyWeek2EditorialR102=applyWeek2EditorialR16;
export const applyWeek2EditorialR101=applyWeek2EditorialR16;
export const applyWeek2EditorialR100=applyWeek2EditorialR16;
export const applyWeek2EditorialR99=applyWeek2EditorialR16;
export const applyWeek2EditorialR98=applyWeek2EditorialR16;
export const applyWeek2EditorialR97=applyWeek2EditorialR16;
export const applyWeek2EditorialR96=applyWeek2EditorialR16;
export const applyWeek2EditorialR95=applyWeek2EditorialR16;
export const applyWeek2EditorialR94=applyWeek2EditorialR16;
export const applyWeek2EditorialR93=applyWeek2EditorialR16;
export const applyWeek2EditorialR92=applyWeek2EditorialR16;
export const applyWeek2EditorialR91=applyWeek2EditorialR16;
export const applyWeek2EditorialR90=applyWeek2EditorialR16;
export const applyWeek2EditorialR89=applyWeek2EditorialR16;
export const applyWeek2EditorialR88=applyWeek2EditorialR16;
export const applyWeek2EditorialR87=applyWeek2EditorialR16;
export const applyWeek2EditorialR86=applyWeek2EditorialR16;
export const applyWeek2EditorialR85=applyWeek2EditorialR16;
export const applyWeek2EditorialR84=applyWeek2EditorialR16;
export const applyWeek2EditorialR83=applyWeek2EditorialR16;
export const applyWeek2EditorialR82=applyWeek2EditorialR16;
export const applyWeek2EditorialR81=applyWeek2EditorialR16;
export const applyWeek2EditorialR80=applyWeek2EditorialR16;
export const applyWeek2EditorialR79=applyWeek2EditorialR16;
export const applyWeek2EditorialR78=applyWeek2EditorialR16;
export const applyWeek2EditorialR77=applyWeek2EditorialR16;
export const applyWeek2EditorialR76=applyWeek2EditorialR16;
export const applyWeek2EditorialR75=applyWeek2EditorialR16;
export const applyWeek2EditorialR74=applyWeek2EditorialR16;
export const applyWeek2EditorialR73=applyWeek2EditorialR16;
export const applyWeek2EditorialR72=applyWeek2EditorialR16;
export const applyWeek2EditorialR71=applyWeek2EditorialR16;
export const applyWeek2EditorialR70=applyWeek2EditorialR16;
export const applyWeek2EditorialR69=applyWeek2EditorialR16;
export const applyWeek2EditorialR68=applyWeek2EditorialR16;
export const applyWeek2EditorialR67=applyWeek2EditorialR16;
export const applyWeek2EditorialR66=applyWeek2EditorialR16;
export const applyWeek2EditorialR65=applyWeek2EditorialR16;
export const applyWeek2EditorialR64=applyWeek2EditorialR16;
export const applyWeek2EditorialR63=applyWeek2EditorialR16;
export const applyWeek2EditorialR62=applyWeek2EditorialR16;
export const applyWeek2EditorialR61=applyWeek2EditorialR16;
export const applyWeek2EditorialR60=applyWeek2EditorialR16;
export const applyWeek2EditorialR59=applyWeek2EditorialR16;
export const applyWeek2EditorialR58=applyWeek2EditorialR16;
export const applyWeek2EditorialR57=applyWeek2EditorialR16;
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
