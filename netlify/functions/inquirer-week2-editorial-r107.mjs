import {applyWeek2EditorialR16 as applyR106} from './inquirer-week2-editorial-r106.mjs';

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const one=v=>finite(v)?n(v).toFixed(1).replace(/\.0$/,''):'n/a';
const short=name=>String(name||'').trim().split(/\s+/).filter(Boolean).at(-1)||String(name||'team');
const record=r=>`${n(r?.wins)||0}-${n(r?.losses)||0}${n(r?.ties)?`-${n(r.ties)}`:''}`;
const scheduleDifficulty=/stiffen|rougher|difficult stretch|hard part|hard stretch|hardens|gauntlet|resistance|heavy part|friendlier|friendly part|softer|manageable|forgiving|breathing room|favorable|mercy|soft landing|lowering the volume|mixed|split schedule|split the|uneven|difficulty level|lands in the middle|split screen/i;

function tidyArticleLanguage(team){
  const a=team?.inquirer_article;if(!a)return;
  const lede=(a.sections||[]).find(s=>String(s?.kind||'')==='lede');
  if(lede&&Array.isArray(lede.paragraphs)){
    lede.paragraphs=lede.paragraphs.map(p=>String(p||'')
      .replace(/The change was ([^,]+), which is useful context without pretending two games have settled the season\./i,'The change was $1. That swing matters, but two games are still too early to call it a new normal.')
      .replace(/^The useful point is that the ([A-Z0-9].*)$/,'The $1')
      .replace(/division position is useful Week 3 context, not permission to treat a two-game table as permanent\./i,'division position raises the Week 3 stakes without pretending a two-game table is permanent.')
      .replace(/; useful, but not enough to erase the result\./i,'; a small positive, but not enough to erase the result.')
      .replace(/useful confirmation without changing/i,'a modest positive without changing'));
  }
  const players=(a.sections||[]).find(s=>String(s?.kind||'')==='players');
  if(players&&Array.isArray(players.paragraphs))players.paragraphs=players.paragraphs.map(p=>String(p||'').replace(/helps show whether useful scoring depth existed beyond the four leaders\./i,'shows what scoring was left after the four leaders.'));
  const cool=(a.sections||[]).find(s=>String(s?.kind||'')==='cool-throne');
  if(cool&&Array.isArray(cool.paragraphs))cool.paragraphs=cool.paragraphs.map(p=>String(p||'').replace(/which is more useful than forcing another conclusion out of the same star\./i,'giving the roster two names worth tracking into Week 3.'));
}

function projectionParagraph(team){
  if(!finite(team?.next_projected)||!finite(team?.next_opponent_projected))return null;
  const own=n(team.next_projected),opp=n(team.next_opponent_projected),gap=Math.abs(own-opp),full=String(team?.team_name||''),next=String(team?.next_opponent_name||'the Week 3 opponent');
  if(gap<0.5)return `Week 3 projects ${full} at ${one(own)} and ${next} at ${one(opp)}, leaving the matchup nearly dead even with only ${one(gap)} points between them.`;
  const favorite=own>opp?full:next,underdog=own>opp?short(next):short(full);
  return `Week 3 projects ${full} at ${one(own)} and ${next} at ${one(opp)}, making ${favorite} the projection favorite by ${one(gap)}; ${underdog} gets a clean chance to make that gap look wrong.`;
}

function rebuildOutlook(team){
  const a=team?.inquirer_article,outlook=(a?.sections||[]).find(s=>String(s?.kind||'')==='outlook');
  if(!outlook||!Array.isArray(outlook.paragraphs))return;
  let ps=outlook.paragraphs.map(String);
  const upcoming=[...(team?.upcoming_opponents||[])].sort((a,b)=>n(a?.week)-n(b?.week));
  const first=upcoming[0],later=upcoming.slice(1,3),s=short(team?.team_name),won=n(team?.points)>n(team?.opponent_points);
  if(first){
    const nextRecord=record(first?.context?.record||{});
    ps[0]=won
      ? `${team.team_name} gets ${first.team_name} (${nextRecord}) next. ${s} won in Week 2, but Week 3 still has to show that the strongest parts of the lineup travel.`
      : `${team.team_name} gets ${first.team_name} (${nextRecord}) next. ${s} lost in Week 2, so the immediate job is a cleaner lineup result before the record gets harder to repair.`;
  }
  const laterNames=later.map(x=>String(x?.team_name||'')).filter(Boolean);
  const roadIndex=ps.findIndex(p=>scheduleDifficulty.test(p)&&(laterNames.length<2||laterNames.every(name=>String(p).toLowerCase().includes(name.toLowerCase()))));
  const road=roadIndex>=0?ps.splice(roadIndex,1)[0]:null;
  const proj=projectionParagraph(team);
  if(proj){
    if(ps.length)ps[ps.length-1]=proj;else ps.push(proj);
  }
  if(road){
    const target=Math.max(0,ps.length-1);
    ps.splice(target,0,road);
  }
  outlook.paragraphs=ps.filter(Boolean);
}

function fixBreakoutTake(out){
  const hot=out?.league_overview?.hot_takes;if(!Array.isArray(hot))return;
  const x=hot.find(h=>/breakout watch|breakout player to watch/i.test(String(h?.title||'')));
  if(!x)return;
  x.title=String(x.title||'').replace(/Breakout watch/i,'Breakout Player to Watch');
  const name=String(x.title).split(':').slice(1).join(':').trim();
  if(name&&/followed .*Week 1 with .*Week 2/i.test(String(x.take||''))&&!/\bbreakout\b/i.test(String(x.take||''))){
    x.take=String(x.take).replace(/Two games are not a season, but the role has earned another week of attention\./i,'The breakout case is still only two games old, but the role has earned another week of attention.');
  }
}

function rebuildFilchLead(out){
  const overview=out?.league_overview;if(!overview)return;
  const section=(overview.sections||[]).find(s=>String(s?.reporter?.id||'')==='nora-voss');
  if(!section||!Array.isArray(section.paragraphs)||!section.paragraphs.length)return;
  const byRoster=new Map((out?.teams||[]).map(t=>[String(t?.roster_id||''),t]));
  const seen=new Set(),pairs=[];
  for(const team of out?.teams||[]){
    const opp=byRoster.get(String(team?.next_opponent_roster_id||''));
    if(!opp||String(opp?.next_opponent_roster_id||'')!==String(team?.roster_id||''))continue;
    if(!finite(team?.next_projected)||!finite(opp?.next_projected))continue;
    const key=[String(team.roster_id),String(opp.roster_id)].sort().join(':');
    if(seen.has(key))continue;seen.add(key);
    const a=n(team.next_projected),b=n(opp.next_projected);pairs.push({a:team,b:opp,gap:Math.abs(a-b)});
  }
  const pick=pairs.sort((x,y)=>y.gap-x.gap)[0];
  if(!pick){section.paragraphs[0]='The Week 3 projection board is not clean enough to manufacture a matchup comparison, so this desk is leaving that claim alone.';return;}
  const fav=n(pick.a.next_projected)>=n(pick.b.next_projected)?pick.a:pick.b,dog=fav===pick.a?pick.b:pick.a;
  section.paragraphs[0]=`${fav.team_name} and ${dog.team_name} are a verified Week 3 matchup. ${fav.team_name} projects for ${one(fav.next_projected)} against ${dog.team_name}'s ${one(dog.next_projected)}, a ${one(pick.gap)}-point gap. That makes ${fav.team_name} the projection favorite; Week 3 will show whether ${short(dog.team_name)} can make the early number look foolish.`;
}

function refineTeam(team){
  tidyArticleLanguage(team);
  rebuildOutlook(team);
  const a=team?.inquirer_article;if(a){a.paragraphs=(a.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean);a.structure_revision='week2-r107';}
  return team;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR106(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  out.teams=(out.teams||[]).map(refineTeam);
  fixBreakoutTake(out);
  rebuildFilchLead(out);
  out.structure_revision='week2-r107';
  if(out.league_overview)out.league_overview.structure_revision='week2-r107';
  return out;
}
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
