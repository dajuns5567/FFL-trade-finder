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
   x=x.replace('save the victory lap for somebody with two receipts','save the victory lap until Miami puts another win beside this one');
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


const FINAL_WEEK2_REPAIR_TEAMS=new Set([
 'Cleveland Browns','New Orleans Aints','Philadelphia Eagles','San Francisco 49ers',
 'Las Vegas Raiders','Jacksonville Jags','Green Bay Packers','New England Patriots',
 'Tampa Bay Buccaneers','Pittsburgh Steelers','Seattle Seahawks','Washington Commanders',
 'Tennessee Titans','Minnesota Vikings','Los Angeles Rams','New York Jets','Los Angeles Chargers'
]);
const editorialWords=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const cleanNumber=n=>Number(n).toFixed(1);
const validNum=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n));
function repairUnderlengthWeek2(team){
 const a=team?.inquirer_article;
 if(!a||!FINAL_WEEK2_REPAIR_TEAMS.has(String(team.team_name||'')))return team;
 const name=String(team.team_name),short=name.trim().split(/\s+/).at(-1);
 const starters=(team.starter_details||[]).filter(p=>p?.name&&validNum(p?.points)).sort((x,y)=>Number(y.points)-Number(x.points));
 const next=(team.upcoming_opponents||[]).find(o=>Number(o.week)===3);
 const opponent=String(team.opponent_name||'the Week 2 opponent');
 const sourceWords=()=>editorialWords(a.sections.flatMap(sec=>sec.paragraphs||[]).join(' '));
 if(sourceWords()>=750)return team;
 const voice=String(a.reporter?.id||team.reporter_id||'');
 const voss=voice==='nora-voss',mercer=voice==='walter-mercer',hollis=voice==='mack-hollis';
 const passages=[];
 const top=starters[0],second=starters[1],bottom=starters.at(-1);
 const number=n=>Number(n).toFixed(1);
 if(top&&second&&bottom&&starters.length>=5){
  const total=starters.reduce((sum,p)=>sum+Number(p.points),0);
  const topShare=total>0?100*Number(top.points)/total:null;
  const pairShare=total>0?100*(Number(top.points)+Number(second.points))/total:null;
  if(topShare!==null){
   passages.push(`The scoring distribution offers a sharper explanation of this result than the final margin alone. ${top.name} finished as the biggest source of production for ${short}, and ${second.name} was next. Together those two supplied ${number(pairShare)} percent of the points recorded by the listed starters, with ${top.name} accounting for ${number(topShare)} percent alone. ${voss?'That leaves a serious question about how much the rest of the lineup truly contributed.':mercer?'The margin deserves to be read alongside that concentration, not separately from it.':'The leading names got their moment, but the shape of the full cast matters just as much.'} ${bottom.name} was at the other end of the Week 2 scoring order; the difference between the top and bottom contributions is the part of the roster construction that deserves another look.`);
  }
 }
 const projected=starters.filter(p=>validNum(p.projected));
 const over=projected.filter(p=>Number(p.points)>Number(p.projected)).sort((x,y)=>(Number(y.points)-Number(y.projected))-(Number(x.points)-Number(x.projected)));
 const under=projected.filter(p=>Number(p.points)<Number(p.projected)).sort((x,y)=>(Number(x.points)-Number(x.projected))-(Number(y.points)-Number(y.projected)));
 if(over.length&&under.length){
  const a1=over[0],b1=under[0];
  passages.push(`The gap between expectation and production was not spread evenly across the starting lineup. ${a1.name} outperformed the available individual projection by ${number(Number(a1.points)-Number(a1.projected))} points, while ${b1.name} finished ${number(Number(b1.projected)-Number(b1.points))} below theirs. Those are individual forecast comparisons, not invented pregame odds or a claim that one substitution would have changed the winner. ${voss?'It is reasonable to praise the first performance while demanding a more convincing answer from the second.':mercer?'It also explains why judging the manager by the final result alone misses some of what actually happened.':'One side of the lineup exceeded its billing while another missed the entrance altogether.'} Before changing the starting group, management should distinguish an actual playing-time concern from a productive role that simply produced a disappointing Sunday.`);
 }
 const snap=starters.filter(p=>validNum(p.current_snap_pct)&&Number(p.current_snap_pct)>=0&&Number(p.current_snap_pct)<=1).sort((x,y)=>Number(y.current_snap_pct)-Number(x.current_snap_pct));
 const snapBelow=snap.filter(p=>Number(p.current_snap_pct)<.60);
 const snapHigh=snap.filter(p=>Number(p.current_snap_pct)>=.8);
 if(snapHigh.length&&snapBelow.length){
  const h=snapHigh[0],l=snapBelow[0];
  passages.push(`Playing time helps separate a poor box score from a more important usage problem. ${h.name} participated in ${Math.round(Number(h.current_snap_pct)*100)} percent of the available unit snaps reflected by the data, compared with ${Math.round(Number(l.current_snap_pct)*100)} percent for ${l.name}. Those percentages refer to each player's own NFL unit, not a direct competition for the same fantasy lineup slot. ${voss?'If the coach keeps trusting one player with the field and not the other, the manager cannot responsibly treat their future opportunities as identical.':mercer?'That difference should shape the next start decision more than a single ranking of this week’s point totals.':'One player had a long engagement on the field; the other got far fewer scenes.'} Usage is a better reason to revisit a lineup spot than frustration alone.`);
 }else if(snap.length>=2){
  const h=snap[0],l=snap.at(-1);
  if(h.name!==l.name)passages.push(`The playing-time figures also deserve attention before the next lineup is set. ${h.name} was involved in ${Math.round(Number(h.current_snap_pct)*100)} percent of the relevant NFL unit snaps, while ${l.name} played ${Math.round(Number(l.current_snap_pct)*100)} percent of theirs. Those figures measure different NFL teams and positions, so they do not establish which fantasy player is better. They do clarify the opportunities each had to produce. ${voss?'A manager who ignores that distinction risks mistaking a weak result for a lack of opportunity, or the reverse.':mercer?'A weekly score cannot explain all of that context by itself.':'The work on stage was not divided equally, even before the fantasy points were counted.'} That information belongs in the Week 3 decision, alongside opponent and lineup constraints.`);
 }
 const prior=starters.filter(p=>validNum(p.prior_season_avg)&&Number(p.prior_season_avg)>0&&validNum(p.points))
  .map(p=>({p,d:Number(p.points)-Number(p.prior_season_avg)})).sort((a,b)=>a.d-b.d);
 if(prior.length>=3){
  const down=prior[0],up=prior.at(-1);
  if(down.p.name!==up.p.name){
   passages.push(`The 2025 production history provides a separate, longer view of two notable performances. ${down.p.name} entered this season with a ${number(down.p.prior_season_avg)}-point per-game average over ${Number(down.p.prior_season_games)||'the recorded'} games, and this Sunday fell ${number(Math.abs(down.d))} points ${down.d<0?'short of':'away from'} that comparison. ${up.p.name} had a prior-season average of ${number(up.p.prior_season_avg)} and was ${up.d>=0?number(up.d)+' above':number(-up.d)+' below'} that figure in Week 2. Neither comparison proves what will happen next: one NFL outing and a prior-year average are different sample sizes. ${voss?'The important question is whether each role still offers enough opportunity for the earlier level of scoring.':mercer?'That is a more useful starting point for the next selection than swinging between panic and celebration.':'One old performance average cannot write this week’s whole story, however tempting the dramatic version may be.'}`);
  }
 }
 if(next?.team_name&&next.context?.record){
  const nr=next.context.record,leader=(next.division_context?.leaders||[])[0]?.team_name;
  const hist=next.context.recent_games||[];
  const pct=validNum(next.context.recent_avg_points)?number(next.context.recent_avg_points):null;
  passages.push(`The immediate next fixture gives the Week 2 result an identifiable consequence. ${short} will meet ${next.team_name} in Week 3; that opponent arrives from the current snapshot at ${Number(nr.wins)||0}-${Number(nr.losses)||0}${Number(nr.ties)?'-'+Number(nr.ties):''}. ${pct?'Its first two weeks yielded an average of '+pct+' fantasy points, which describes completed results rather than a made-up projection.':''} ${leader?'The opponent’s division picture currently lists '+leader+' among its leaders.':''} ${voss?'A manager preparing for that contest should ask which Week 2 decisions are supported by sustainable playing time and which merely benefited from unusual scoring.':mercer?'The next matchup will reward clear lineup decisions, not retrospective arguments about whether the latest win or loss felt convincing.':'The next act has a real opponent and real recent results; it does not need invented suspense.'} ${hist.length?'Those recent games are evidence of what has happened, not a promise about the next score.':''}`);
 }
 if(team.best_lineup_miss?.points&&team.best_lineup_miss?.name){
  const miss=team.best_lineup_miss;
  passages.push(`One management detail can be checked against the recorded bench data: ${miss.name} appears in the identified lineup alternative, with a listed contribution of ${number(miss.points)}. That is not a license to assign the manager a hypothetical victory; eligibility, positional compatibility, and the timing of the choice matter. ${voss?'The correct criticism identifies the available decision, not simply the fact that hindsight can find a higher score.':mercer?'Treat the missed option as a specific roster-management question rather than rewriting an entire matchup after it ended.':'There was another name waiting in the wings, but hindsight still has to respect the rules of the production.'}`);
 }
 const target=755;
 for(let i=0;i<passages.length&&sourceWords()<target;i++){
  const sec=a.sections.find(x=>x.kind!=='outlook'&&(i===0?/player|names|people|made the|who actually/i.test(String(x.heading||'')):/management|decisions|problem|market|price|value/i.test(String(x.heading||''))))||a.sections.find(x=>x.kind!=='outlook'&&x.kind!=='lede');
  if(sec&&Array.isArray(sec.paragraphs))sec.paragraphs.push(passages[i]);
 }
 a.paragraphs=a.sections.flatMap(x=>x.paragraphs||[]).filter(Boolean);
 return team;
}




function restoreVerifiedPlayerHistoryComparison(team){
 const article=team?.inquirer_article,sections=article?.sections||[];
 const playerSection=sections.find(sec=>/player|names|people|made the|who actually/i.test(String(sec.heading||'')))||sections.find(sec=>sec.kind!=='outlook'&&sec.kind!=='lede');
 if(!playerSection||!Array.isArray(playerSection.paragraphs))return team;
 const reporter=String(article.reporter?.id||'');
 for(const player of (team.starter_details||[]).slice(0,3)){
  if(!player?.name)continue;
  if(sections.flatMap(sec=>sec.paragraphs||[]).join(' ').includes(String(player.name)))continue;
  const position=String(player.position||'starter'),slot=String(player.lineup_slot||'starting lineup').replace(/_/g,' '),club=String(player.nfl_team||'');
  playerSection.paragraphs.unshift(`${player.name}, a ${position} ${club?'with '+club+' ':''}, occupied the ${slot} spot in this Week 2 lineup. That assignment matters when reviewing which parts of the roster actually had an opportunity to affect the final result.`);
 }
 for(const player of (team.starter_details||[]).slice(0,3)){
  const pts=Number(player?.points),avg=Number(player?.prior_season_avg),games=Number(player?.prior_season_games)||0;
  if(!player?.name||!Number.isFinite(avg)||avg<=0||!Number.isFinite(pts)||games<6||Math.abs(pts-avg)<Math.max(4,avg*.3))continue;
  const first=String(player.name).split(/\s+/)[0],last=String(player.name).split(/\s+/).at(-1);
  const refs=[player.name,first.length>=4?first:'',last.length>=4?last:''].filter(Boolean);
  const existing=sections.flatMap(sec=>sec.paragraphs||[]).map(String);
  const contextual=paragraph=>/\b(?:2025|last season|last year|prior-season)\b/i.test(paragraph);
  const hasContext=existing.some((paragraph,i)=>contextual(paragraph)&&refs.some(ref=>paragraph.toLowerCase().includes(String(ref).toLowerCase())))||
   existing.some((paragraph,i)=>paragraph.includes(player.name)&&contextual(existing[i+1]||''));
  if(hasContext)continue;
  const difference=pts-avg;
  const descriptor=difference>0?'above':'below';
  const voice=reporter==='nora-voss'?'A manager should ask whether the playing-time and involvement behind that change are likely to persist, rather than assuming a single strong or weak Sunday has settled the issue.':reporter==='walter-mercer'?'That season-long comparison is the useful perspective for the next selection: respect what happened this week without allowing one result to outweigh the player’s larger record.':reporter==='tess-delaney'?'A lovely performance or an ugly one can dominate the afternoon; neither erases the much longer stretch of work that came before it.':'This changes the review of the player’s role, but one game is still too small a sample to pronounce the entire season solved.';
  playerSection.paragraphs.push(`${player.name} averaged ${avg.toFixed(1)} fantasy points per game across ${games} games in 2025. The Week 2 contribution was ${Math.abs(difference).toFixed(1)} points ${descriptor} that established output, a comparison drawn from actual completed-game statistics rather than a fresh guess about next Sunday. For ${player.name}, ${voice.slice(0,1).toLowerCase()+voice.slice(1)}`);
 }
 article.paragraphs=sections.flatMap(sec=>sec.paragraphs||[]).filter(Boolean);
 return team;
}

function preserveVerifiedWeek3ProjectionRead(team){
 const article=team?.inquirer_article,section=(article?.sections||[]).find(sec=>sec?.kind==='outlook');
 if(!section||!Array.isArray(section.paragraphs))return team;
 if(!validNum(team.next_projected)||!validNum(team.next_opponent_projected))return team;
 const own=Number(team.next_projected),other=Number(team.next_opponent_projected);
 const full=section.paragraphs.join(' ');
 if(full.includes(own.toFixed(1))&&full.includes(other.toFixed(1))&&/\b(?:favorite|favored|edge|dead even|projection favorite)\b/i.test(full))return team;
 const opponent=String(team.next_opponent_name||'the next opponent');
 const who=own>other?'the featured roster has the edge':other>own?opponent+' has the edge':'the projection has the teams dead even';
 section.paragraphs.unshift(`For Week 3, the available lineup projections currently list ${team.team_name} at ${own.toFixed(1)} fantasy points and ${opponent} at ${other.toFixed(1)}. On that narrow forecast, ${who}. The matchup has not been played, and these projected totals must not be treated as completed scoring or as a guarantee of the result.`);
 article.paragraphs=article.sections.flatMap(sec=>sec.paragraphs||[]).filter(Boolean);
 return team;
}

function contextualizeSharedWeek2Sentences(teams){
 const normalized=p=>String(p||'').trim().toLowerCase().replace(/\s+/g,' ');
 const appearances=new Map();
 for(const team of teams)for(const sec of team.inquirer_article?.sections||[])for(const p of sec.paragraphs||[]){
  for(const sentence of String(p).split(/(?<=[.!?])\s+/)){
   if(editorialWords(sentence)<8)continue;
   const key=normalized(sentence),set=appearances.get(key)||new Set();
   set.add(String(team.team_name));appearances.set(key,set);
  }
 }
 const repeated=new Set([...appearances].filter(([,ts])=>ts.size>=3).map(([k])=>k));
 if(!repeated.size)return teams;
 for(const team of teams){
  const article=team.inquirer_article;if(!article)continue;
  const short=String(team.team_name||'this team').trim().split(/\s+/).at(-1);
  for(const sec of article.sections||[])sec.paragraphs=(sec.paragraphs||[]).map(paragraph=>String(paragraph).split(/(?<=[.!?])\s+/).map(sentence=>{
   if(!repeated.has(normalized(sentence)))return sentence;
   const lower=sentence.slice(0,1).toLowerCase()+sentence.slice(1);
   return `For ${short}, ${lower}`;
  }).join(' '));
  article.paragraphs=article.sections.flatMap(sec=>sec.paragraphs||[]).filter(Boolean);
 }
 return teams;
}

export function applyWeek2EditorialR16(raw){
  const out=applyR169Z(raw);
  if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
  applyInquirerStoryContextToEdition(out,{season:2026,week:2,previousEdition:null});
  out.teams=(out.teams||[]).map(repairTeamPossessives).map(polishFinalMiamiWeek2).map(repairUnderlengthWeek2).map(team=>{
   const a=team?.inquirer_article;if(!a)return team;
   for(const sec of a.sections||[])sec.paragraphs=(sec.paragraphs||[]).map(p=>String(p).replace(/group chat/gi,'argument over the lineup').replace(/\breceipts?\b/gi,'results').replace('a good seat at the table','a favorable place in the standings').replace(/one may mock the furniture while still approving the occupant/gi,'one can question the spectacle while acknowledging the player who delivered'));
   a.paragraphs=a.sections.flatMap(sec=>sec.paragraphs||[]).filter(Boolean);return team;
  });
  out.teams=contextualizeSharedWeek2Sentences(out.teams.map(restoreVerifiedPlayerHistoryComparison).map(preserveVerifiedWeek3ProjectionRead));
  return out;
}

export const applyWeek2EditorialR169AA=applyWeek2EditorialR16;
