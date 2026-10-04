import {applyWeek2EditorialR16 as applyR151} from './inquirer-week2-editorial-r151.mjs';
import {WEEK2_MIDA_2026} from './inquirer-week2-2026-mida-snapshot.mjs';

const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const midaByName=new Map(WEEK2_MIDA_2026.map(row=>[norm(row.name),row]));
const getMida=name=>midaByName.get(norm(name))||null;

function attachHistoricalMida(raw){
  const out=structuredClone(raw);
  out.teams=(out.teams||[]).map(team=>{
    const own=getMida(team?.team_name||team?.name);
    const nextName=team?.next_opponent_name||team?.opponent_name||'';
    const next=getMida(nextName);
    const upcoming=(team?.upcoming_opponents||[]).map(item=>({
      ...item,
      mida:item?.mida||getMida(item?.team_name||item?.name||item?.opponent_name)
    }));
    return {...team,mida_outlook:own,next_opponent_mida:next,upcoming_opponents:upcoming};
  });
  out.mida_context={as_of:'2026-09-24T01:01:28Z',selected_week:2,historical:true};
  return out;
}

export function applyWeek2EditorialR16(raw){
  if(!raw||Number(raw.season)!==2026||Number(raw.week)!==2)return applyR151(raw);
  const out=applyR151(attachHistoricalMida(raw));
  if(out.league_overview)out.league_overview.structure_revision='week2-r152';
  out.structure_revision='week2-r152';
  return out;
}

export const applyWeek2EditorialR152=applyWeek2EditorialR16;
export const applyWeek2EditorialR151=applyWeek2EditorialR16;
export const applyWeek2EditorialR150=applyWeek2EditorialR16;
export const applyWeek2EditorialR149=applyWeek2EditorialR16;
export const applyWeek2EditorialR148=applyWeek2EditorialR16;
export const applyWeek2EditorialR147=applyWeek2EditorialR16;
export const applyWeek2EditorialR146=applyWeek2EditorialR16;
export const applyWeek2EditorialR145=applyWeek2EditorialR16;
export const applyWeek2EditorialR144=applyWeek2EditorialR16;
export const applyWeek2EditorialR143=applyWeek2EditorialR16;
export const applyWeek2EditorialR142=applyWeek2EditorialR16;
export const applyWeek2EditorialR141=applyWeek2EditorialR16;
export const applyWeek2EditorialR140=applyWeek2EditorialR16;
export const applyWeek2EditorialR139=applyWeek2EditorialR16;
export const applyWeek2EditorialR138=applyWeek2EditorialR16;
export const applyWeek2EditorialR137=applyWeek2EditorialR16;
export const applyWeek2EditorialR136=applyWeek2EditorialR16;
export const applyWeek2EditorialR135=applyWeek2EditorialR16;
export const applyWeek2EditorialR134=applyWeek2EditorialR16;
export const applyWeek2EditorialR133=applyWeek2EditorialR16;
export const applyWeek2EditorialR132=applyWeek2EditorialR16;
export const applyWeek2EditorialR131=applyWeek2EditorialR16;
export const applyWeek2EditorialR130=applyWeek2EditorialR16;
