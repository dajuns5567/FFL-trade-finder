import {applyWeek2EditorialR16 as applyR61} from './inquirer-week2-editorial-r61.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';
const pct=v=>finite(v)?`${(n(v)*100).toFixed(0)}%`:'n/a';
const section=(a,k)=>(a?.sections||[]).find(s=>String(s?.kind||'')===k);
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'Team');

function addUnique(s,text){
  if(!s||!Array.isArray(s.paragraphs)||!text)return;
  const key=String(text).toLowerCase().replace(/\s+/g,' ').trim();
  const existing=s.paragraphs.map(x=>String(x).toLowerCase().replace(/\s+/g,' ').trim());
  if(!existing.includes(key))s.paragraphs.push(text);
}

function enrichTeam(team){
  const a=team?.inquirer_article;if(!a)return team;
  const lede=section(a,'lede'),players=section(a,'players'),value=section(a,'value'),management=section(a,'management'),hot=section(a,'hot-seat'),outlook=section(a,'outlook');
  const teamProj=n(team.projected),actual=n(team.points),expected=teamProj;
  if(finite(expected)){
    const d=actual-expected;
    addUnique(lede,`${short(team.team_name)} finished ${one(Math.abs(d))} points ${d>=0?'above':'below'} its Week 2 projection. That gap matters because it separates a result the lineup merely survived from one it materially outperformed or underperformed.`);
  }

  const starters=[...(team.starter_details||[])].filter(p=>p?.name&&finite(p?.points)).sort((x,y)=>n(y.points)-n(x.points));
  const fourth=starters[3]||starters[2];
  if(fourth){
    const cur=n(fourth.current_snap_pct),prior=n(fourth.prior_season_snap_pct);
    const role=finite(cur)?`Week 2 snap share was ${pct(cur)}${finite(prior)?`, compared with ${pct(prior)} last season`:''}`:'The role was not materially different from the available usage evidence';
    addUnique(players,`${fourth.name} is the next name worth keeping in view. ${role}; that makes the Week 3 question about role stability rather than inventing another conclusion from the same three stars.`);
  }

  const movers=team?.value_history_player_movers||{},r2=(movers.risers||[])[1],f2=(movers.fallers||[])[1];
  if(r2||f2){
    const bits=[];
    if(r2)bits.push(`${r2.player_name} also rose ${one(r2.delta)} (${one(r2.pct)}%)`);
    if(f2)bits.push(`${f2.player_name} also fell ${one(f2.delta)} (${one(f2.pct)}%)`);
    addUnique(value,`${bits.join(', while ')}. Those secondary moves matter because the roster’s week was not defined by a single price change.`);
  }

  const starterNames=new Set(starters.map(p=>String(p.name)));
  const acq=(team.trade_acquisitions||[]).find(x=>starterNames.has(String(x?.player_name||'')))||(team.trade_acquisitions||[])[0];
  if(acq?.player_name){
    const cp=(acq.counterpart_names||[]).filter(Boolean).join(' and ');
    const started=starterNames.has(String(acq.player_name));
    addUnique(management,`${acq.player_name} remains relevant after arriving by trade${cp?` from ${cp}`:''}. ${started?'That acquisition reached the Week 2 starting lineup, so its production belongs in the management evaluation.':'The player did not define the Week 2 starting lineup, so the trade should not be blamed or praised for decisions it did not affect.'}`);
  }else{
    addUnique(management,`No trade acquisition needs to be forced into the Week 2 explanation. The lineup should be judged on the decisions that actually reached Sunday.`);
  }

  const w=team?.worst_starter;
  if(w?.name){
    const cur=n(w.current_snap_pct),season=n(w.season_avg),prior=n(w.prior_season_avg);
    const parts=[];
    if(finite(cur))parts.push(`${w.name} played ${pct(cur)} of the available snaps`);
    if(finite(season))parts.push(`the current-season average is ${one(season)} points`);
    if(finite(prior)&&prior>0)parts.push(`last season’s average was ${one(prior)}`);
    if(parts.length)addUnique(hot,`${parts.join('; ')}. That usage context is the reason to watch the next game before turning one weak fantasy total into a role crisis.`);
  }

  const nc=team?.next_opponent_context||{};
  if(team.next_opponent_name&&finite(nc.recent_avg_points)){
    addUnique(outlook,`${team.next_opponent_name} has averaged ${one(nc.recent_avg_points)} points through the first two weeks and currently sits ${Number(nc.standings_rank)||'outside the top'} of 32 in the standings. That recent form gives Week 3 context beyond the projection line.`);
  }
  const later=(team.upcoming_opponents||[]).slice().sort((x,y)=>n(x.week)-n(y.week)).slice(1,3);
  if(later.length===2){
    const fmt=x=>`${x.team_name}${x?.context?.record?` (${Number(x.context.record.wins)||0}-${Number(x.context.record.losses)||0})`:''}`;
    addUnique(outlook,`After Week 3, the next two opponents are ${fmt(later[0])} and ${fmt(later[1])}. That is enough schedule context to plan around without pretending future matchups have already been played.`);
  }

  a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);
  a.structure_revision='week2-r62';
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR61(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(enrichTeam);
  out.structure_revision='week2-r62';
  if(out.league_overview)out.league_overview.structure_revision='week2-r62';
  return out;
}
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
