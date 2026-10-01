import week1Preload2026 from './inquirer-week1-2026-preload.mjs';
import {applyWeek2EditorialR16 as applyWeek2EditorialR19} from './inquirer-week2-editorial-r19.mjs';

export const WEEK2_EDITORIAL_REVISION=20;

const one=v=>Number.isFinite(Number(v))?Number(v).toFixed(1):'0.0';
const sentenceParts=s=>String(s||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const wordCount=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const teamName=t=>String(t?.team_name||'This team');
const reporterId=t=>String(t?.inquirer_article?.reporter?.id||'walter-mercer');
const won=t=>Number(t?.points)>Number(t?.opponent_points);
const record=t=>{const r=t?.league_context?.record||{};return `${Number(r.wins)||0}-${Number(r.losses)||0}${Number(r.ties)?'-'+Number(r.ties):''}`};

const week1Teams=(week1Preload2026?.teams||[]).filter(t=>Number.isFinite(Number(t?.points)));
const week1ByRoster=new Map(week1Teams.map(t=>[String(t?.roster_id),Number(t.points)]));
const week1ByName=new Map(week1Teams.map(t=>[String(t?.team_name||'').toLowerCase(),Number(t.points)]));
const week1Scores=week1Teams.map(t=>Number(t.points));

function rankDesc(value,values){
 const n=Number(value);if(!Number.isFinite(n))return null;
 const sorted=(values||[]).filter(v=>Number.isFinite(Number(v))).map(Number).sort((a,b)=>b-a);
 const idx=sorted.findIndex(v=>v<=n+1e-9);
 return idx<0?sorted.length:idx+1;
}
function median(values){
 const a=(values||[]).filter(v=>Number.isFinite(Number(v))).map(Number).sort((x,y)=>x-y);
 if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function priorScore(t){
 const byRoster=week1ByRoster.get(String(t?.roster_id));
 if(Number.isFinite(byRoster))return byRoster;
 const byName=week1ByName.get(String(t?.team_name||'').toLowerCase());
 return Number.isFinite(byName)?byName:null;
}
function opponentRow(t,teams){
 const name=String(t?.opponent_name||'').toLowerCase();
 if(!name)return null;
 return (teams||[]).find(x=>String(x?.team_name||'').toLowerCase()===name)||null;
}
function contextRows(teams){
 const currentScores=(teams||[]).map(t=>Number(t?.points)).filter(Number.isFinite);
 const rows=(teams||[]).map(t=>{
  const current=Number(t?.points),prior=priorScore(t),avg=Number.isFinite(prior)?(current+prior)/2:current;
  return{t,current,prior,avg};
 });
 const avgScores=rows.map(r=>r.avg).filter(Number.isFinite);
 return{teams,currentScores,avgScores,rows,median:median(currentScores)};
}
function qualityFor(t,ctx){
 const current=Number(t?.points),prior=priorScore(t),avg=Number.isFinite(prior)?(current+prior)/2:current;
 const op=opponentRow(t,ctx.teams),oppCurrent=Number(t?.opponent_points),oppPrior=op?priorScore(op):null;
 const rank=rankDesc(current,ctx.currentScores),priorRank=rankDesc(prior,week1Scores),avgRank=rankDesc(avg,ctx.avgScores),oppRank=rankDesc(oppCurrent,ctx.currentScores),oppPriorRank=rankDesc(oppPrior,week1Scores);
 const bottomNow=rank!=null&&rank>Math.floor(ctx.currentScores.length*.75);
 const bottomPrior=priorRank!=null&&priorRank>Math.floor(week1Scores.length*.75);
 const topNow=rank!=null&&rank<=Math.ceil(ctx.currentScores.length*.25);
 const topOpp=oppRank!=null&&oppRank<=Math.ceil(ctx.currentScores.length*.25);
 const lowOpp=oppRank!=null&&oppRank>Math.floor(ctx.currentScores.length*.75);
 const opponentDip=Number.isFinite(oppPrior)&&Number.isFinite(oppCurrent)&&oppPrior-oppCurrent>=20&&lowOpp;
 let category='middle';
 if(won(t)&&bottomNow&&bottomPrior)category='hollow-consistent';
 else if(won(t)&&opponentDip)category='opponent-dip-win';
 else if(won(t)&&bottomNow&&lowOpp)category='hollow-win';
 else if(won(t)&&topNow)category='strong-win';
 else if(won(t)&&rank!=null&&rank>Math.ceil(ctx.currentScores.length*.5))category='soft-win';
 else if(!won(t)&&topNow&&topOpp)category='strong-loss';
 else if(!won(t)&&bottomNow)category='poor-loss';
 return{t,op,current,prior,avg,oppCurrent,oppPrior,rank,priorRank,avgRank,oppRank,oppPriorRank,category};
}

function qualityReaction(id,q){
 const n=teamName(q.t),op=String(q.t?.opponent_name||'the opponent');
 const banks={
  'walter-mercer':{
   'hollow-consistent':`${n} gets the win, but two straight bottom-quarter scoring weeks are not a strength. The record can smile; the offense still owes us something better.`,
   'opponent-dip-win':`${n} gets credit for taking the win. I am not handing out medals for catching ${op} on a scoring collapse and surviving it.`,
   'hollow-win':`${n} survived a low-scoring game. Survival counts in the standings and almost nowhere else.`,
   'strong-win':`${n} actually scored like a strong team, so the compliment is earned instead of borrowed from the opponent’s misery.`,
   'soft-win':`${n} won without producing a top-half score. Take the result, absolutely; just do not confuse it with proof that the scoring problem is solved.`,
   'strong-loss':`${n} scored well and still lost because the matchup was brutal. I can criticize a loss without pretending the offense was the culprit.`,
   'poor-loss':`${n} lost and the scoring rank says the problem was not bad luck. Low output remains low output even when the explanation is interesting.`,
   middle:`${n} landed in the league’s middle scoring tier. That earns perspective, not a parade and not a funeral.`
  },
  'tess-delaney':{
   'hollow-consistent':`${n} won, which is adorable. Two straight bottom-quarter scoring weeks are considerably less adorable, and I refuse to let the record put lipstick on that.`,
   'opponent-dip-win':`${n} took the gift ${op} left on the porch. Good manners require saying thank you, not pretending you baked it yourself.`,
   'hollow-win':`${n} escaped a low-scoring mud fight. The win is real; the glamour is fictional.`,
   'strong-win':`${n} produced a genuinely strong total, so I am temporarily suspending my instinct to ruin the celebration with a footnote.`,
   'soft-win':`${n} won with a bottom-half score. Enjoy the confetti, but maybe keep the receipt.`,
   'strong-loss':`${n} scored well and still got run over by an even bigger total. That is a loss with actual grounds for complaint, which is my favorite kind of complaint.`,
   'poor-loss':`${n} paired a loss with bottom-quarter scoring. At least the scoreboard had the decency to make the diagnosis obvious.`,
   middle:`${n} scored like a middle-of-the-pack team. Appropriate applause level: one polite clap and no fireworks.`
  },
  'mack-hollis':{
   'hollow-consistent':`${n} has dressed a second low-scoring week in a winner’s coat. Lovely tailoring; I can still see the numbers underneath.`,
   'opponent-dip-win':`${n} accepted ${op}’s collapse with admirable theatrical timing. Call it a victory, just not a coronation.`,
   'hollow-win':`${n} won a game where both scoreboards looked embarrassed to be involved. The curtain may fall before anyone mistakes this for dominance.`,
   'strong-win':`${n} brought an actual strong scoring total to the stage. At last, applause that does not require creative accounting.`,
   'soft-win':`${n} won with a bottom-half score. The result gets roses; the performance gets a note from the director.`,
   'strong-loss':`${n} put up a strong number and still lost to a louder performance. Sometimes the villain is simply the other scoreboard.`,
   'poor-loss':`${n} gave us bottom-quarter scoring and a loss. The tragedy has been considerate enough to explain itself.`,
   middle:`${n} delivered middle-tier scoring: respectable, unspectacular, and absolutely begging for somebody to make the next act more interesting.`
  },
  'nora-voss':{
   'hollow-consistent':`${n} is winning more convincingly than it is scoring. Two bottom-quarter weeks make that a warning, not a compliment.`,
   'opponent-dip-win':`${n} benefited from ${op} falling hard from its Week 1 level. Bank the win, but management should not mistake opponent failure for roster validation.`,
   'hollow-win':`${n} won a low-output game. The result is useful; the scoring profile still needs work.`,
   'strong-win':`${n} combined the win with a top-quarter score. That is the kind of result that actually supports confidence.`,
   'soft-win':`${n} won with a bottom-half score. Management gets the standings bump without permission to pretend the offense looked strong.`,
   'strong-loss':`${n} posted a top-quarter score and lost to another top-quarter total. The record takes the hit; the offense does not deserve the same criticism.`,
   'poor-loss':`${n} lost with bottom-quarter scoring. There is no reason to dress that up as matchup variance.`,
   middle:`${n} finished around the middle of the league in scoring. That is useful context before anybody turns one result into a personality.`
  }
 };
 return banks[id]?.[q.category]||banks['walter-mercer'][q.category]||banks['walter-mercer'].middle;
}
function qualityParagraph(t,ctx){
 const q=qualityFor(t,ctx),n=teamName(t),parts=[];
 const w1=Number.isFinite(q.prior)&&q.priorRank!=null?` Week 1 was ${one(q.prior)}, ranked ${q.priorRank} of ${week1Scores.length}.`:'';
 parts.push(`${n} scored ${one(q.current)} in Week 2, ranked ${q.rank} of ${ctx.currentScores.length}.${w1} Its two-week scoring average ranks ${q.avgRank} of ${ctx.avgScores.length}.`);
 if(q.category==='opponent-dip-win'&&q.opponentDip!==false&&Number.isFinite(q.oppPrior)&&q.oppPriorRank!=null){
  parts.push(`${String(t?.opponent_name||'The opponent')} fell from ${one(q.oppPrior)} in Week 1 (${q.oppPriorRank} of ${week1Scores.length}) to ${one(q.oppCurrent)} this week (${q.oppRank} of ${ctx.currentScores.length}).`);
 }
 parts.push(qualityReaction(reporterId(t),q));
 return parts.join(' ');
}
function insertQualityIntoLede(t,ctx){
 const a=t?.inquirer_article;if(!a)return;
 const sec=(a.sections||[]).find(s=>String(s?.kind||'')==='lede');if(!sec)return;
 const ps=[...(sec.paragraphs||[])];
 const line=qualityParagraph(t,ctx);
 const resultTokenA=`${one(t.points)}–${one(t.opponent_points)}`,resultTokenB=`${one(t.opponent_points)}–${one(t.points)}`;
 const resultIndex=Math.max(0,ps.findIndex(p=>String(p).includes(resultTokenA)||String(p).includes(resultTokenB)));
 if(ps.length>=6){
  let drop=-1;
  for(let i=ps.length-1;i>=0;i--){
   if(i===resultIndex)continue;
   const p=String(ps[i]||'');
   if(!/\d/.test(p)&&!/Breakout Watch/i.test(p)){drop=i;break;}
  }
  if(drop<0)drop=ps.length-1===resultIndex?ps.length-2:ps.length-1;
  ps.splice(drop,1);
 }
 const freshResultIndex=Math.max(0,ps.findIndex(p=>String(p).includes(resultTokenA)||String(p).includes(resultTokenB)));
 ps.splice(Math.min(freshResultIndex+1,ps.length),0,line);
 sec.paragraphs=ps.slice(0,6);
}

function reviseTeam(t,ctx){
 const a=t?.inquirer_article;if(!a)return t;
 insertQualityIntoLede(t,ctx);
 a.paragraphs=(a.sections||[]).flatMap(s=>(s?.paragraphs||[]).filter(Boolean));
 a.editorial_revision=WEEK2_EDITORIAL_REVISION;
 a.voice_revision='week2-r20';
 return t;
}

function metricRows(ctx){
 return ctx.rows.map(r=>{
  const q=qualityFor(r.t,ctx),rec=r.t?.league_context?.record||{};
  return{...r,...q,name:teamName(r.t),w:Number(rec.wins)||0,l:Number(rec.losses)||0,delta:Number(r.t?.value_history_week?.delta),next:Number(r.t?.next_projected),nextOpp:Number(r.t?.next_opponent_projected)};
 });
}
function first(rows,pred=()=>true){return(rows||[]).find(pred)||null}
function by(rows,fn,dir='desc'){
 return(rows||[]).filter(Boolean).slice().sort((a,b)=>dir==='desc'?fn(b)-fn(a):fn(a)-fn(b));
}
function games(ctx){
 const seen=new Set(),out=[];
 for(const t of ctx.teams){
  const op=opponentRow(t,ctx.teams);if(!op)continue;
  const key=[teamName(t),teamName(op)].sort().join('|');if(seen.has(key))continue;seen.add(key);
  const a=Number(t.points),b=Number(op.points);out.push({a:t,b:op,total:a+b,margin:Math.abs(a-b)});
 }
 return out;
}
function recapStats(ctx){
 const rows=metricRows(ctx),gs=games(ctx),winners=rows.filter(r=>won(r.t)),losers=rows.filter(r=>!won(r.t));
 const current=by(rows,r=>r.current),avg=by(rows,r=>r.avg),rise=by(rows,r=>Number.isFinite(r.prior)?r.current-r.prior:-Infinity),drop=by(rows,r=>Number.isFinite(r.prior)?r.current-r.prior:Infinity,'asc');
 const twoZero=rows.filter(r=>r.w===2&&r.l===0),zeroTwo=rows.filter(r=>r.w===0&&r.l===2);
 const opponentDip=by(winners,r=>Number.isFinite(r.oppPrior)?r.oppPrior-r.oppCurrent:-Infinity);
 const market=by(rows.filter(r=>Number.isFinite(r.delta)),r=>Math.abs(r.delta));
 const next=by(rows.filter(r=>Number.isFinite(r.next)&&Number.isFinite(r.nextOpp)),r=>Math.abs(r.next-r.nextOpp));
 return{
  rows,current,avg,
  top:current[0],bottom:current[current.length-1],lowWin:by(winners,r=>r.current,'asc')[0],highLoss:by(losers,r=>r.current)[0],
  consistentHigh:first(avg,r=>r.rank<=8&&r.priorRank!=null&&r.priorRank<=8),consistentLow:first([...avg].reverse(),r=>r.rank>24&&r.priorRank!=null&&r.priorRank>24),
  rise:rise[0],drop:drop[0],opponentDip:opponentDip[0],
  paperTiger:by(twoZero,r=>r.avg,'asc')[0],unlucky:by(zeroTwo,r=>r.avg)[0],
  highGame:by(gs,g=>g.total)[0],lowGame:by(gs,g=>g.total,'asc')[0],wideGame:by(gs,g=>g.margin)[0],closeGame:by(gs,g=>g.margin,'asc')[0],
  market:market[0],next:next[0]
 };
}
function same(a,b){return a&&b&&String(a?.t?.roster_id||a?.roster_id||'')===String(b?.t?.roster_id||b?.roster_id||'')}
function p(...parts){return parts.filter(Boolean).join(' ')}
function recapBanks(ctx){
 const s=recapStats(ctx),count=ctx.currentScores.length,med=one(ctx.median);
 const nick=[
  p(`Week 2’s median team score was ${med}. ${s.top?.name||'The top scorer'} led the league at ${one(s.top?.current)}, while ${s.bottom?.name||'the bottom scorer'} finished at ${one(s.bottom?.current)}.`,`That spread is why a win by itself tells you almost nothing about whether the offense was actually good.`),
  s.lowWin&&s.highLoss?p(`${s.lowWin.name} was the lowest-scoring winner at ${one(s.lowWin.current)}; ${s.highLoss.name} was the highest-scoring loser at ${one(s.highLoss.current)}.`,`One record improved and the other did not, but the scoring quality points in the opposite direction. Fantasy football remains deeply committed to making simple conclusions look stupid.`):'',
  s.consistentHigh&&s.consistentLow?p(`${s.consistentHigh.name} has been top-quarter in scoring in both weeks, while ${s.consistentLow.name} has been bottom-quarter in both.`,`Two games is early, but repeating the same scoring neighborhood twice is more useful than pretending every 1-1 or 2-0 record was built the same way.`):p(`The league has ${count} teams and only two weeks of results, so consistency is still scarce.`,`That makes repeated scoring quality more valuable than early-season bragging.`)
 ];
 const tilly=[
  s.rise?p(`${s.rise.name} made the week’s biggest scoring jump, moving from ${one(s.rise.prior)} in Week 1 to ${one(s.rise.current)} in Week 2.`,`That is the sort of improvement that makes last week’s complaints look overdressed. I support this level of inconvenience.`):'',
  s.drop?p(`${s.drop.name} had the sharpest scoring fall, sliding from ${one(s.drop.prior)} to ${one(s.drop.current)}.`,`A one-week collapse does not erase the opener, but it does give optimism a very rude hangover.`):'',
  s.opponentDip&&Number.isFinite(s.opponentDip.oppPrior)&&s.opponentDip.oppPrior-s.opponentDip.oppCurrent>=20?p(`${s.opponentDip.name} won while ${String(s.opponentDip.t?.opponent_name||'its opponent')} dropped from ${one(s.opponentDip.oppPrior)} in Week 1 to ${one(s.opponentDip.oppCurrent)} in Week 2.`,`Take the win, absolutely. Just do not put on a cape because the other side tripped over its own furniture.`):s.closeGame?p(`${teamName(s.closeGame.a)} and ${teamName(s.closeGame.b)} produced the closest matchup at a ${one(s.closeGame.margin)}-point margin.`,`Nothing says “healthy hobby” like losing several hours of your life to one decimal place.`):''
 ];
 const mack=[
  s.highGame?p(`${teamName(s.highGame.a)} and ${teamName(s.highGame.b)} combined for ${one(s.highGame.total)} points, the week’s highest-scoring matchup.`,`That game did not knock on the door; it arrived with brass instruments.`):'',
  s.lowGame?p(`${teamName(s.lowGame.a)} and ${teamName(s.lowGame.b)} combined for ${one(s.lowGame.total)} points, the lowest-scoring matchup of Week 2.`,`Some games are chess. This one was two people arguing over who had to touch the ball next.`):'',
  s.wideGame?p(`${teamName(s.wideGame.a)} and ${teamName(s.wideGame.b)} finished ${one(s.wideGame.margin)} points apart, the largest margin of the week.`,`That was less a finish than one side leaving the stage while the other was still bowing.`):''
 ];
 const nora=[
  s.paperTiger&&s.unlucky&&!same(s.paperTiger,s.unlucky)?p(`${s.paperTiger.name} is 2-0 but owns the weakest two-week scoring average among undefeated teams at ${one(s.paperTiger.avg)}. ${s.unlucky.name} is 0-2 yet has the strongest two-week scoring average among winless teams at ${one(s.unlucky.avg)}.`,`Records matter. They also do not get permission to impersonate scoring quality.`):p(`Through two weeks, early records and scoring quality are already diverging for several teams.`,`Management should know which part is signal before celebrating or panicking.`),
  s.market?p(`${s.market.name} had the week’s largest absolute roster-value move at ${Math.abs(Number(s.market.delta)).toFixed(0)} points while its Week 2 scoring rank was ${s.market.rank} of ${count}.`,`Market movement and weekly production are answering different questions; confusing them is how managers buy confidence at retail price.`):'',
  s.next?p(`${s.next.name} carries the largest Week 3 projection gap at ${Math.abs(s.next-s.nextOpp).toFixed(1)} points after ranking ${s.next.rank} of ${count} in Week 2 scoring.`,`The projection creates an expectation. The last two Sundays decide how much trust that expectation deserves.`):''
 ];
 return{'walter-mercer':nick.filter(Boolean),'tess-delaney':tilly.filter(Boolean),'mack-hollis':mack.filter(Boolean),'nora-voss':nora.filter(Boolean)};
}

function splitLongParagraph(text,maxWords=85){
 const p=String(text||'').trim();if(!p||wordCount(p)<=maxWords)return p?[p]:[];
 const out=[];let cur=[];
 for(const s of sentenceParts(p)){
  const candidate=[...cur,s].join(' ');
  if(cur.length&&wordCount(candidate)>maxWords){out.push(cur.join(' '));cur=[s];}else cur.push(s);
 }
 if(cur.length)out.push(cur.join(' '));
 return out.filter(Boolean);
}
function reviseOverview(o,ctx){
 if(!o)return o;
 const banks=recapBanks(ctx),sections=o.sections||[],totals={};
 for(const s of sections){const id=String(s?.reporter?.id||'');totals[id]=(totals[id]||0)+1}
 const used={};
 o.sections=sections.map(sec=>{
  const id=String(sec?.reporter?.id||''),all=banks[id]||[],count=totals[id]||1,idx=used[id]||0;used[id]=idx+1;
  const assigned=count===1?all:all.filter((_,i)=>i%count===idx);
  const paragraphs=(assigned.length?assigned:(sec?.paragraphs||[])).flatMap(x=>splitLongParagraph(x,85)).filter(Boolean);
  return{...sec,paragraphs};
 });
 o.editorial_revision=WEEK2_EDITORIAL_REVISION;
 o.voice_revision='week2-r20';
 return o;
}

export function applyWeek2EditorialR16(raw){
 const out=applyWeek2EditorialR19(raw);
 if(!out||Number(out.season)!==2026||Number(out.week)!==2)return out;
 const ctx=contextRows(out.teams||[]);
 out.teams=(out.teams||[]).map(t=>reviseTeam(t,ctx));
 out.league_overview=reviseOverview(out.league_overview,ctx);
 out.editorial_revision=WEEK2_EDITORIAL_REVISION;
 out.voice_revision='week2-r20';
 return out;
}

export const applyWeek2EditorialR20=applyWeek2EditorialR16;
export const applyWeek2EditorialR19=applyWeek2EditorialR16;
export const applyWeek2EditorialR15=applyWeek2EditorialR16;
