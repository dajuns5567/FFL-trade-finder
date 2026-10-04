// Forward-only Fleeced! Inquirer V32 voice layer.
// Week 1/2 remain immutable. V32 wraps the proven V31 engine and sharpens
// Week 3+ reporter interpretation without changing MIDA, Division Board, or data logic.

import {
  applyInquirerEditorialV31,
  evaluateInquirerEditionQuality as evaluateV31EditionQuality
} from './inquirer-editorial-v31.mjs';

export const FORWARD_INQUIRER_VERSION=32;
export const FORWARD_EDITORIAL_REVISION=1;
export const evaluateInquirerEditionQuality=evaluateV31EditionQuality;

const one=v=>Number(v||0).toFixed(1);
const wordCount=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(seed,rows)=>rows[hash(seed)%rows.length];
const reporterId=a=>String(a?.reporter?.id||'walter-mercer');
const section=(a,kind)=>(a?.sections||[]).find(s=>String(s?.kind||'')===kind);
const pluralTeam=name=>/s$/i.test(String(name||'').trim().split(/\s+/).at(-1)||'');
const possessive=name=>pluralTeam(name)?`${name}'`:`${name}'s`;

function splitSentences(value){
  const protectedText=String(value||'')
    .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
    .replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'));
  return protectedText.split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
}

function ordinal(n){
  n=Number(n)||0;const m=n%100;
  if(m>=11&&m<=13)return `${n}th`;
  return `${n}${n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`;
}

function scoreContext(teams){
  const rows=(teams||[]).filter(t=>Number.isFinite(Number(t?.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const avg=rows.length?rows.reduce((n,t)=>n+Number(t.points),0)/rows.length:0;
  const rank=new Map(rows.map((t,i)=>[String(t.roster_id),i+1]));
  return{avg,rank,size:rows.length,high:rows[0]||null,low:rows.at(-1)||null};
}

function scoreBand(t,ctx){
  const pts=Number(t?.points)||0,rank=ctx.rank.get(String(t?.roster_id))||ctx.size,ratio=ctx.avg>0?pts/ctx.avg:1;
  if(rank>=Math.max(1,ctx.size-1)||ratio<=0.62)return'catastrophic';
  if(rank>=Math.max(1,ctx.size-5)||ratio<=0.78)return'awful';
  if(rank>Math.ceil(ctx.size*.7)||ratio<0.9)return'poor';
  if(rank<=4||ratio>=1.22)return'huge';
  if(rank<=Math.ceil(ctx.size*.3)||ratio>=1.08)return'good';
  return'middle';
}

function scoreVerdict(t,a,ctx,week){
  const rid=reporterId(a),team=String(t.team_name||'This team'),opp=String(t.opponent_name||'the opponent'),pts=Number(t.points)||0,
    oppPts=Number(t.opponent_points)||0,rank=ctx.rank.get(String(t.roster_id))||ctx.size,band=scoreBand(t,ctx),won=pts>oppPts,
    delta=Number.isFinite(Number(t.projected))?pts-Number(t.projected):null,rankText=`${ordinal(rank)} of ${ctx.size}`,
    seed=[week,t.roster_id,rid,band].join('|');
  const miss=delta==null?'':Math.abs(delta)>=12?` They finished ${one(Math.abs(delta))} ${delta>0?'above':'below'} projection, and that gap was loud enough to matter.`:'';
  if(band==='catastrophic'){
    const rows={
      'walter-mercer':[
        `${team} scored ${one(pts)}, ${rankText} this week. That is not a bad afternoon; it is a lineup-wide failure that makes you wonder how many starters agreed to disappear at once. ${opp} did not need brilliance to punish it.${miss}`,
        `${one(pts)} points put ${team} at ${rankText}. There is no tactical poetry hiding in that total: too many lineup spots were useless at the same time, and ${opp} merely had to stay upright.${miss}`
      ],
      'tess-delaney':[
        `${team} produced ${one(pts)}, ${rankText}, which is less a fantasy score than an apology with decimal places. ${opp} barely had to raise its voice while the lineup kept finding new ways to embarrass the room.${miss}`,
        `${one(pts)} points from ${team} is the sort of total that should arrive with a handwritten note explaining what happened to the rest of dinner. ${rankText} is dreadful, and ${opp} was delighted not to intervene.${miss}`
      ],
      'mack-hollis':[
        `${team} dropped ${one(pts)} points, ${rankText}. How do you get this many lineup spots together and still make scoring look optional? ${opp} did not beat a juggernaut; it walked past a smoking crater.${miss}`,
        `${one(pts)}. That is the whole ${team} team total. ${rankText}. If you are looking for the bright side, congratulations on finding a hobby because the scoreboard did not provide one.${miss}`
      ],
      'nora-voss':[
        `${team} finished with ${one(pts)}, ${rankText}. I would accuse the lineup of sabotage if incompetence were not already doing such convincing work. ${opp} only had to let the damage continue.${miss}`,
        `${one(pts)} points put ${team} at ${rankText}. At some point “rough week” becomes an insult to rough weeks; this was a coordinated collapse with ${opp} standing nearby to collect the win.${miss}`
      ]
    };
    return pick(seed,rows[rid]||rows['walter-mercer']);
  }
  if(band==='awful'){
    const rows={
      'walter-mercer':[
        `${team} managed ${one(pts)}, ${rankText}. That total is bad enough that one strong starter could not have rescued it by himself; the failure had too many contributors.${miss}`,
        `${one(pts)} left ${team} at ${rankText}. The problem is not one unlucky bounce. A score this low usually requires several lineup spots to underperform together.${miss}`
      ],
      'tess-delaney':[
        `${team} served ${one(pts)}, ${rankText}, and somehow expected the room not to notice. The total is ugly enough that no amount of polish can disguise how many lineup spots came dressed as decorations.${miss}`,
        `${one(pts)} points left ${team} at ${rankText}. That is not tasteful underperformance; that is the fantasy equivalent of arriving late, empty-handed and offended anyone asked where the food went.${miss}`
      ],
      'mack-hollis':[
        `${team} put up ${one(pts)}, ${rankText}. That is the kind of total where the postgame meeting should begin with “seriously, how did we manage that?” and then get less polite.${miss}`,
        `${one(pts)} points landed ${team} at ${rankText}. You do not need a microscope to find the problem; you need a broom.${miss}`
      ],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rankText}. Rivals do not need to manufacture an insult when the lineup volunteers one this complete.${miss}`,
        `${one(pts)} left ${team} at ${rankText}. Skepticism is no longer the aggressive position here; pretending that total was acceptable would be.${miss}`
      ]
    };
    return pick(seed,rows[rid]||rows['walter-mercer']);
  }
  if(band==='poor'){
    const rows={
      'walter-mercer':[
        `${team} finished with ${one(pts)}, ${rankText}. It was not a catastrophe, but it was a losing amount of ordinary unless ${opp} happened to be worse.${miss}`,
        `${one(pts)} put ${team} at ${rankText}. That total leaves very little room for quiet starters and even less room for excuses.${miss}`
      ],
      'tess-delaney':[
        `${team} gave the room ${one(pts)}, ${rankText}. Not scandalous, merely disappointing in the way lukewarm champagne is technically still champagne.${miss}`,
        `${one(pts)} points left ${team} at ${rankText}. Nobody needs to faint, but somebody should certainly stop calling that a pleasant afternoon.${miss}`
      ],
      'mack-hollis':[
        `${team} put up ${one(pts)}, ${rankText}. Not a disaster, just the kind of score that keeps checking the door to see if a better lineup is coming.${miss}`,
        `${one(pts)} landed ${team} at ${rankText}. That is enough to stay in the building and nowhere near enough to start flexing.${miss}`
      ],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rankText}. Rivals can mock it without exaggerating, which is usually the part management should find annoying.${miss}`,
        `${one(pts)} points put ${team} at ${rankText}. There is a defense for it, probably. Unfortunately ${opp} also gets to look at the scoreboard.${miss}`
      ]
    };
    return pick(seed,rows[rid]||rows['walter-mercer']);
  }
  if(band==='huge'){
    const rows={
      'walter-mercer':[
        `${team} posted ${one(pts)}, ${rankText}. That is the kind of score that turns normal lineup mistakes into irrelevant footnotes because the roster kept producing answers faster than ${opp} could find problems.${miss}`,
        `${one(pts)} put ${team} at ${rankText}. When a lineup reaches that level, the opponent usually stops needing a diagnosis and starts needing a miracle.${miss}`
      ],
      'tess-delaney':[
        `${team} arrived with ${one(pts)}, ${rankText}, and behaved like restraint was for other people. ${opp} was invited to admire the performance from a safe distance.${miss}`,
        `${one(pts)} points put ${team} at ${rankText}. Excessive, indecent and exactly what fantasy managers pretend they dislike until it belongs to them.${miss}`
      ],
      'mack-hollis':[
        `${team} detonated for ${one(pts)}, ${rankText}. That is not “a nice week.” That is the kind of score that makes the other matchup totals look like they forgot the second half.${miss}`,
        `${one(pts)} points. ${rankText}. ${team} did not win quietly; it kicked the scoreboard hard enough that ${opp} had to hear the echo.${miss}`
      ],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rankText}. Rivals can call it unsustainable after they finish paying for what it just did to the standings.${miss}`,
        `${one(pts)} left ${team} at ${rankText}. Anyone still dismissing that kind of weekly ceiling is no longer being skeptical; they are volunteering to be surprised again.${miss}`
      ]
    };
    return pick(seed,rows[rid]||rows['walter-mercer']);
  }
  if(band==='good'){
    return pick(seed,[
      `${team} scored ${one(pts)}, ${rankText}. That is a genuinely strong week: enough production to pressure ${opp} without needing one absurd outlier to do all the work.${miss}`,
      `${one(pts)} points put ${team} at ${rankText}. The number is good because it creates margin for normal imperfections instead of demanding a perfect lineup.${miss}`
    ]);
  }
  return pick(seed,[
    `${team} landed at ${one(pts)}, ${rankText}. That is a middle-class fantasy score: respectable if it wins, infuriating if ${opp} clears it, and not important enough to deserve mythology.${miss}`,
    `${one(pts)} left ${team} at ${rankText}. Fine is the right word, which is also why nobody should be throwing a parade or holding a funeral over it.${miss}`
  ]);
}

function installScoreVerdict(t,ctx,week){
  const a=t?.inquirer_article;if(!a)return;
  const lede=section(a,'lede')||(a.sections||[])[0];
  if(!lede)return;
  const verdict=scoreVerdict(t,a,ctx,week);
  const paragraphs=Array.isArray(lede.paragraphs)?lede.paragraphs.slice():[];
  if(paragraphs.length)paragraphs[0]=verdict;else paragraphs.push(verdict);
  lede.paragraphs=paragraphs;
}

function playerNameParts(p){
  const bits=String(p?.name||'').trim().split(/\s+/).filter(Boolean);return [...new Set([String(p?.name||'').trim(),bits[0],bits.at(-1)].filter(x=>x&&x.length>=3))];
}
function sentencePlayer(sentence,team){
  const lower=String(sentence||'').toLowerCase();
  return (team?.starter_details||[]).find(p=>playerNameParts(p).some(n=>lower.includes(n.toLowerCase())))||null;
}
function priorAverage(p){const n=Number(p?.prior_season_avg);return Number.isFinite(n)&&n>0?n:null}
function isHistoryExplainer(sentence,p){
  if(!p||priorAverage(p)==null)return false;
  const s=String(sentence||'');
  return /\b(?:baseline|last season|prior-season|prior season|per game|average|averaged|old standard|old number|year ago)\b/i.test(s);
}

function playerDeltaVerdict(team,a,p,week){
  const rid=reporterId(a),name=String(p.name||'This player'),now=Number(p.points)||0,prior=priorAverage(p),ratio=prior>0?now/prior:1,
    seed=[week,team.roster_id,rid,p.id||name,'history'].join('|'),star=prior>=15;
  if(ratio>=1.7){
    const rows={
      'walter-mercer':[
        `${name} normally lived around ${one(prior)} a game and just dropped ${one(now)} into this matchup. That is not a cute statistical bump; it is the kind of starter explosion that changes who gets to survive Sunday. If the role supports it again, opponents have a new problem.`,
        `${name} turned a ${one(prior)}-point norm into ${one(now)} this week. Fantasy managers do not care that the average moved; they care that one lineup spot suddenly supplied matchup-breaking production.`
      ],
      'tess-delaney':[
        `${name} went from a ${one(prior)}-point norm to ${one(now)}, which is what happens when a perfectly respectable place setting suddenly kicks open the ballroom doors. Lovely for ${team.team_name}; deeply irritating for everyone who had to play against it.`,
        `${one(now)} from ${name} after living around ${one(prior)} is not “encouraging.” It is rude. The only useful question now is whether this was a fabulous one-night outfit or the beginning of a much more expensive wardrobe.`
      ],
      'mack-hollis':[
        `${name} went from roughly ${one(prior)} a game to ${one(now)} and blew a hole through the matchup. Forget admiring the percentage increase; that score is the kind of thing that makes an opponent check whether the rules accidentally changed.`,
        `${one(now)} from ${name}, after a ${one(prior)}-point norm, is not a trend line. It is a siren. If he brings anything close to that again, the rest of the league has to stop treating him like normal background scoring.`
      ],
      'nora-voss':[
        `${name} carried a ${one(prior)}-point norm into the week and walked out with ${one(now)}. Rivals are welcome to call it unsustainable after they finish dealing with the damage. Dismissing that ceiling now is just volunteering to be wrong loudly.`,
        `${one(now)} from ${name} against a ${one(prior)}-point norm changes the fantasy consequence, not merely the average. The next opponent gets to decide whether this was a spike or a new problem; pretending it meant nothing is no longer credible.`
      ]
    };
    return pick(seed,rows[rid]||rows['walter-mercer']);
  }
  if(ratio>=1.25){
    return pick(seed,[
      `${name} beat his usual ${one(prior)}-point neighborhood with ${one(now)} this week. The important part is not the math lesson; it is that ${team.team_name} got a real matchup edge from a spot that normally asks for less attention.`,
      `${one(now)} from ${name} is meaningfully above his usual ${one(prior)}. That extra scoring bought ${team.team_name} actual breathing room, which is far more interesting than congratulating the decimal point.`
    ]);
  }
  if(ratio<=0.45){
    const blame=star?'Starting him was not the mistake; the player performance was. ':' ';
    const rows={
      'walter-mercer':`${name} usually gives you about ${one(prior)} and produced ${one(now)}. ${blame}A starter can survive one crater like that; a fantasy team cannot keep donating an entire lineup spot and call it variance.`,
      'tess-delaney':`${name} normally brings about ${one(prior)} and arrived with ${one(now)}. ${blame}That is not a smaller serving; that is somebody presenting an empty plate and asking why dinner feels tense.`,
      'mack-hollis':`${name} fell from a normal ${one(prior)} neighborhood to ${one(now)}. ${blame}That is the kind of starter score that makes “how is it even possible to be this quiet?” a completely fair football question.`,
      'nora-voss':`${name} usually sits around ${one(prior)} and gave the lineup ${one(now)}. ${blame}Rivals do not have to twist the numbers when the collapse is this cooperative.`
    };
    return rows[rid]||rows['walter-mercer'];
  }
  if(ratio<=0.75){
    const blame=star?'The start was defensible; the output was the problem. ':' ';
    return pick(seed,[
      `${name} came in with a ${one(prior)}-point norm and managed ${one(now)}. ${blame}That shortfall matters because it forced the rest of ${team.team_name} to cover for a lineup spot that was supposed to be helping.`,
      `${one(now)} from ${name} is well below the ${one(prior)} you normally expect. ${blame}One disappointing Sunday is survivable; repeating it turns a dependable slot into weekly damage.`
    ]);
  }
  return null;
}

function rewriteHistoryExplainersInArticle(t,week){
  const a=t?.inquirer_article;if(!a)return;
  for(const s of a.sections||[]){
    s.paragraphs=(s.paragraphs||[]).map(p=>splitSentences(p).map(sentence=>{
      const player=sentencePlayer(sentence,t);if(!player||!isHistoryExplainer(sentence,player))return sentence;
      return playerDeltaVerdict(t,a,player,week)||sentence;
    }).join(' '));
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
}

function genericTeamScoreSentence(sentence,t){
  const score=one(t.points),s=String(sentence||''),team=String(t.team_name||''),mascot=team.trim().split(/\s+/).at(-1)||team;
  if(!new RegExp(`\\b${esc(score)}\\b`).test(s))return false;
  if(!/\b(?:points|score|scored|posted|put up|finished with|total)\b/i.test(s))return false;
  if(!new RegExp(`${esc(team)}|${esc(mascot)}`,'i').test(s))return false;
  if((t.starter_details||[]).some(p=>playerNameParts(p).some(n=>new RegExp(`\\b${esc(n)}\\b`,'i').test(s))))return false;
  return wordCount(s)<=34;
}
function dedupeTeamScoreNarration(t){
  const a=t?.inquirer_article;if(!a)return;
  let seen=false;
  for(const s of a.sections||[]){
    s.paragraphs=(s.paragraphs||[]).map(p=>{
      const out=[];
      for(const sentence of splitSentences(p)){
        if(genericTeamScoreSentence(sentence,t)){
          if(seen)continue;
          seen=true;
        }
        out.push(sentence);
      }
      return out.join(' ');
    }).filter(Boolean);
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
}

function brutalHotSeat(t,ctx,week){
  const a=t?.inquirer_article;if(!a)return;
  const band=scoreBand(t,ctx);if(!['catastrophic','awful'].includes(band))return;
  const hot=section(a,'hot-seat');if(!hot)return;
  const worst=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],rid=reporterId(a),rank=ctx.rank.get(String(t.roster_id))||ctx.size,
    player=worst?`${worst.name} contributed ${one(worst.points)}`:'the bottom of the lineup disappeared',seed=[week,t.roster_id,rid,'hot-seat'].join('|');
  const rows={
    'walter-mercer':[
      `${player}, but pinning a ${ordinal(rank)}-place team score on one player would be generous. Several starters failed together. That is why this was a team performance problem, not one convenient scapegoat.`,
      `${player}. Ugly, yes, but the larger problem is that a bottom-of-the-league total needs multiple weak performances to cooperate. ${t.team_name} managed exactly that.`
    ],
    'tess-delaney':[
      `${player}, and unfortunately there were accomplices. A score this bad requires several people to arrive empty-handed at the same party; blaming one chair would be far too kind.`,
      `${player}. The dreadful part is that this was not even a solo catastrophe. ${t.team_name} found enough bad performances to turn one disappointing seat into an entire miserable table.`
    ],
    'mack-hollis':[
      `${player}. Do not let everybody else hide behind him. A bottom-tier team score is a group project, and ${t.team_name} somehow got full participation.`,
      `${player}, but this mess needed more than one volunteer. When the whole team finishes near the floor, the correct question is “how did this many starters go missing at once?”`
    ],
    'nora-voss':[
      `${player}. Rivals will point there first because it is easy, but a score near the bottom of the league needs more than one culprit. ${t.team_name} supplied a committee.`,
      `${player}, and the rest of the lineup should not treat that as cover. One bad starter can hurt you; this many bad answers at once is how an entire team earns the ridicule.`
    ]
  };
  const line=pick(seed,rows[rid]||rows['walter-mercer']);
  hot.paragraphs=[line,...(hot.paragraphs||[])];
  a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
}

function findPlayerAcrossTeams(teams,name){
  const target=String(name||'').trim().toLowerCase();
  for(const t of teams||[]){
    const p=(t.starter_details||[]).find(x=>String(x.name||'').trim().toLowerCase()===target);
    if(p)return{team:t,player:p};
  }
  return null;
}
function priorWeekPlayer(previousEdition,t,p){
  const priorTeam=(previousEdition?.teams||[]).find(x=>String(x.roster_id)===String(t.roster_id));
  return (priorTeam?.starter_details||[]).find(x=>String(x.id||'')===String(p.id||'')||String(x.name||'').toLowerCase()===String(p.name||'').toLowerCase())||null;
}
function breakoutTake(entry,reporter,previousEdition,week){
  const t=entry.team,p=entry.player,prev=priorWeekPlayer(previousEdition,t,p),rid=String(reporter?.id||'walter-mercer'),now=Number(p.points)||0,
    before=Number(prev?.points),prior=priorAverage(p),team=String(t.team_name||'this team'),seed=[week,t.roster_id,rid,p.id||p.name,'breakout'].join('|'),
    first=Number.isFinite(before)?`${p.name} backed ${one(before)} last week with ${one(now)} this week.`:prior!=null?`${p.name} just put ${one(now)} on top of a ${one(prior)}-point prior-season norm.`:`${p.name} just gave ${team} ${one(now)} points.`;
  const rows={
    'walter-mercer':[
      `${first} Two useful Sundays in a row stop being a cute September spike and start changing lineup expectations. ${team} can treat him as a weekly source of advantage now; the next opponent has to prove that confidence premature.`,
      `${first} The fantasy consequence is simple: this production is now winning real lineup value, not merely inflating an average. If the role holds, ${team} just gained a player opponents have to account for every Sunday.`
    ],
    'tess-delaney':[
      `${first} At some point “pleasant surprise” becomes a refusal to update your opinion, and we are getting awfully close. ${team} has a new toy, everyone else is allowed to be annoyed, and the next Sunday decides whether the price tag keeps rising.`,
      `${first} One sparkling afternoon is charming; two starts becoming expensive for everybody who dismissed him. ${team} gets to enjoy the upgrade while the rest of the league decides how long it wants to keep pretending this is accidental.`
    ],
    'mack-hollis':[
      `${first} That is not background production anymore; it is the kind of scoring that kicks through a matchup and asks who wants to be next. ${team} should keep feeding whatever created it until somebody proves they can stop it.`,
      `${first} Call it a fluke again if you want, but do it loudly enough for the next opponent to hear before he ruins another Sunday. ${team} has a real weapon until the numbers say otherwise.`
    ],
    'nora-voss':[
      `${first} Anyone still dismissing him is no longer being skeptical; they are volunteering to be wrong twice. ${team} has earned the right to expect useful production, and rivals now have to find an actual football reason it should disappear.`,
      `${first} The easy rival joke was that this would fade immediately. It did not. Now the burden shifts to everyone insisting ${team} should treat him like a temporary accident.`
    ]
  };
  return pick(seed,rows[rid]||rows['walter-mercer']);
}

function rewriteBreakout(overview,teams,previousEdition,week){
  for(const take of overview?.hot_takes||[]){
    if(!/breakout player to watch/i.test(String(take?.title||'')))continue;
    const name=String(take.title).replace(/^.*?:\s*/,'').trim(),entry=findPlayerAcrossTeams(teams,name);
    if(!entry)continue;
    take.take=breakoutTake(entry,take.reporter,previousEdition,week);
  }
}

function recapScoreVerdict(ctx,reporter,week){
  const hi=ctx.high,lo=ctx.low;if(!hi||!lo)return null;
  const rid=String(reporter?.id||'walter-mercer'),spread=Number(hi.points)-Number(lo.points),ratio=ctx.avg>0?Number(lo.points)/ctx.avg:1,
    seed=[week,rid,hi.roster_id,lo.roster_id,'league-score'].join('|'),brutal=ratio<0.72;
  const rows={
    'walter-mercer':[
      `${hi.team_name} set the ceiling at ${one(hi.points)} while ${lo.team_name} dragged the floor down to ${one(lo.points)}; the league averaged ${one(ctx.avg)}. A ${one(spread)}-point gap is not a trivia fact. It is the difference between making an opponent chase you and making an opponent check whether you showed up.`,
      `${one(hi.points)} from ${hi.team_name}, ${one(lo.points)} from ${lo.team_name}, ${one(ctx.avg)} on average. The useful interpretation is brutal: one lineup created weekly leverage and the other ${brutal?'made basic competence look ambitious':'spent the week below the league’s working standard'}.`
    ],
    'tess-delaney':[
      `${hi.team_name} arrived with ${one(hi.points)}; ${lo.team_name} answered with ${one(lo.points)} against a ${one(ctx.avg)} league average. That is not a spread, darling, that is two entirely different social classes of fantasy afternoon.`,
      `${one(hi.points)} at the top, ${one(lo.points)} at the bottom, ${one(ctx.avg)} in the middle. ${hi.team_name} brought champagne; ${lo.team_name} ${brutal?'appears to have brought a napkin and good intentions':'brought something technically edible and emotionally disappointing'}.`
    ],
    'mack-hollis':[
      `${hi.team_name} exploded for ${one(hi.points)} and ${lo.team_name} crawled to ${one(lo.points)} while the league averaged ${one(ctx.avg)}. That ${one(spread)}-point canyon is the week in one image: one roster kicked the door in and the other forgot where the building was.`,
      `${one(hi.points)} versus ${one(lo.points)} with a ${one(ctx.avg)} league average. ${hi.team_name} made noise. ${lo.team_name} ${brutal?'made “how is it even possible to score that little?” a legitimate recap question':'made ordinary scoring look unnecessarily difficult'}.`
    ],
    'nora-voss':[
      `${hi.team_name} posted ${one(hi.points)}; ${lo.team_name} posted ${one(lo.points)}; the league sat at ${one(ctx.avg)}. Rivals do not need spin when the distance is ${one(spread)} points. One team created fear and the other created material.`,
      `${one(hi.points)} at one extreme, ${one(lo.points)} at the other, ${one(ctx.avg)} in the middle. The conclusion does not require theatrics: ${hi.team_name} looked dangerous and ${lo.team_name} ${brutal?'looked guilty of wasting a full lineup':'gave rivals a very easy week'}.`
    ]
  };
  return pick(seed,rows[rid]||rows['walter-mercer']);
}
function rewriteRecapScoreParagraph(overview,ctx,week){
  for(const s of overview?.sections||[]){
    if(!Array.isArray(s.paragraphs))continue;
    s.paragraphs=s.paragraphs.map(p=>/league average|league scoring ran from/i.test(String(p||''))?(recapScoreVerdict(ctx,s.reporter,week)||p):p);
  }
}

function rewriteHistoryExplainersInOverview(overview,teams,week){
  const candidates=(teams||[]).flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))).filter(x=>priorAverage(x.p)!=null);
  const rewrite=(text,reporter)=>splitSentences(text).map(sentence=>{
    const lower=sentence.toLowerCase();
    const found=candidates.find(({p})=>playerNameParts(p).some(n=>lower.includes(n.toLowerCase()))&&isHistoryExplainer(sentence,p));
    if(!found)return sentence;
    const pseudoArticle={reporter};return playerDeltaVerdict(found.t,pseudoArticle,found.p,week)||sentence;
  }).join(' ');
  for(const s of overview?.sections||[]){
    s.paragraphs=(s.paragraphs||[]).map(p=>rewrite(p,s.reporter));
    for(const b of s.blocks||[])b.paragraphs=(b.paragraphs||[]).map(p=>rewrite(p,s.reporter));
  }
  for(const take of overview?.hot_takes||[])if(!/breakout player to watch/i.test(String(take?.title||'')))take.take=rewrite(take.take,take.reporter);
}

export function applyInquirerEditorialV32(args={}){
  const week=Number(args.week),base=applyInquirerEditorialV31(args);
  if(!base||week<3)return base;
  const out=structuredClone(base),teams=out?.inquirer?.teams||[],overview=out?.leagueOverview,ctx=scoreContext(teams);
  for(const t of teams){
    installScoreVerdict(t,ctx,week);
    rewriteHistoryExplainersInArticle(t,week);
    brutalHotSeat(t,ctx,week);
    dedupeTeamScoreNarration(t);
  }
  rewriteRecapScoreParagraph(overview,ctx,week);
  rewriteHistoryExplainersInOverview(overview,teams,week);
  rewriteBreakout(overview,teams,args.previousEdition,week);
  return out;
}
