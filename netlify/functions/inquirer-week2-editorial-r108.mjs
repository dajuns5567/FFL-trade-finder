import {applyWeek2EditorialR16 as applyR107} from './inquirer-week2-editorial-r107.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');

function fixOutlookProjection(team){
  const outlook=(team?.inquirer_article?.sections||[]).find(s=>String(s?.kind||'')==='outlook');
  if(!outlook||!Array.isArray(outlook.paragraphs)||!finite(team?.next_projected)||!finite(team?.next_opponent_projected))return;
  const own=n(team.next_projected),opp=n(team.next_opponent_projected),gap=Math.abs(own-opp),full=String(team.team_name||''),next=String(team.next_opponent_name||''),ownShort=short(full),nextShort=short(next);
  const replacement=gap<0.5
    ? `Week 3 projects ${full} at ${one(own)} and ${next} at ${one(opp)}, leaving the matchup nearly dead even with only ${one(gap)} points between them.`
    : `Week 3 projects ${full} at ${one(own)} and ${next} at ${one(opp)}, making ${own>opp?ownShort:nextShort} the projection favorite by ${one(gap)}; ${own>opp?nextShort:ownShort} gets a clean chance to make that gap look wrong.`;
  const idx=outlook.paragraphs.findIndex(p=>/Week 3 projects /i.test(String(p||'')));
  if(idx>=0)outlook.paragraphs[idx]=replacement;
}

function fixFilchLead(out){
  const section=(out?.league_overview?.sections||[]).find(s=>String(s?.reporter?.id||'')==='nora-voss');
  if(!section||!Array.isArray(section.paragraphs)||!section.paragraphs.length)return;
  const byRoster=new Map((out?.teams||[]).map(t=>[String(t?.roster_id||''),t]));
  const seen=new Set(),pairs=[];
  for(const team of out?.teams||[]){
    const opp=byRoster.get(String(team?.next_opponent_roster_id||''));
    if(!opp||String(opp?.next_opponent_roster_id||'')!==String(team?.roster_id||''))continue;
    if(!finite(team?.next_projected)||!finite(opp?.next_projected))continue;
    const key=[String(team.roster_id),String(opp.roster_id)].sort().join(':');
    if(seen.has(key))continue;seen.add(key);
    pairs.push({a:team,b:opp,gap:Math.abs(n(team.next_projected)-n(opp.next_projected))});
  }
  const pick=pairs.sort((x,y)=>y.gap-x.gap)[0];
  if(!pick)return;
  const fav=n(pick.a.next_projected)>=n(pick.b.next_projected)?pick.a:pick.b,dog=fav===pick.a?pick.b:pick.a;
  section.paragraphs[0]=`${fav.team_name} and ${dog.team_name} are a verified Week 3 matchup, projected at ${one(fav.next_projected)} and ${one(dog.next_projected)} respectively—a ${one(pick.gap)}-point gap. ${short(fav.team_name)} is the projection favorite; Week 3 will show whether ${short(dog.team_name)} can make the early number look foolish.`;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR107(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(team=>{fixOutlookProjection(team);const a=team?.inquirer_article;if(a){a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);a.structure_revision='week2-r108';}return team;});
  fixFilchLead(out);
  out.structure_revision='week2-r108';
  if(out.league_overview)out.league_overview.structure_revision='week2-r108';
  return out;
}
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
