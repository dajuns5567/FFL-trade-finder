// Fleeced! Inquirer forward reporter engine V34.
// Week 1/2 remain immutable. V34 starts from the proven V31 core and applies
// reusable Week 3+ voice logic: interpretation over stat narration, sharper
// team-score judgment, brutal low-score commentary, and meta-free recap copy.

import {
  applyInquirerEditorialV31 as applyCore,
  evaluateInquirerEditionQuality as evaluateCore
} from './inquirer-editorial-v31-core.mjs';

export const FORWARD_INQUIRER_VERSION=34;
export const FORWARD_EDITORIAL_REVISION=1;
export const evaluateInquirerEditionQuality=evaluateCore;

const one=v=>Number(v||0).toFixed(1);
const wc=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const esc=s=>String(s||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const pick=(seed,rows)=>rows[hash(seed)%rows.length];
const rid=a=>String(a?.reporter?.id||'walter-mercer');
const sec=(a,kind)=>(a?.sections||[]).find(s=>String(s?.kind||'')===kind);
const sentences=value=>String(value||'').replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const playerParts=p=>{const n=String(p?.name||'').trim(),b=n.split(/\s+/).filter(x=>x.length>=3);return[...new Set([n,...b].filter(Boolean))]};
const namedPlayer=(text,t)=>{const x=String(text||'').toLowerCase();return(t?.starter_details||[]).find(p=>playerParts(p).some(n=>x.includes(n.toLowerCase())))||null};
const prior=p=>{const n=Number(p?.prior_season_avg);return Number.isFinite(n)&&n>0?n:null};

function context(teams){
  const rows=(teams||[]).filter(t=>Number.isFinite(Number(t?.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  return{rows,avg:rows.length?rows.reduce((n,t)=>n+Number(t.points),0)/rows.length:0,rank:new Map(rows.map((t,i)=>[String(t.roster_id),i+1])),size:rows.length,high:rows[0]||null,low:rows.at(-1)||null};
}
function band(t,c){
  const p=Number(t?.points)||0,r=c.rank.get(String(t?.roster_id))||c.size,q=c.avg?p/c.avg:1;
  if(r>=Math.max(1,c.size-1)||q<=.62)return'catastrophic';
  if(r>=Math.max(1,c.size-5)||q<=.78)return'awful';
  if(r>Math.ceil(c.size*.7)||q<.9)return'poor';
  if(r<=4||q>=1.22)return'huge';
  if(r<=Math.ceil(c.size*.3)||q>=1.08)return'good';
  return'middle';
}
function ordinal(n){n=Number(n)||0;const m=n%100;if(m>=11&&m<=13)return`${n}th`;return`${n}${n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`}

function scoreVerdict(t,a,c,week){
  const reporter=rid(a),team=String(t.team_name||'This team'),opp=String(t.opponent_name||'the opponent'),pts=Number(t.points)||0,r=c.rank.get(String(t.roster_id))||c.size,b=band(t,c),rank=`${ordinal(r)} of ${c.size}`,seed=[week,t.roster_id,reporter,b].join('|');
  const banks={
    catastrophic:{
      'walter-mercer':[
        `${team} scored ${one(pts)}, ${rank}. That is not a bad afternoon; it is a lineup-wide failure. Too many starters disappeared at once, and ${opp} did not need brilliance to punish it.`,
        `${one(pts)} put ${team} at ${rank}. There is no tactical poetry hiding in that total: several lineup spots were useless together, and ${opp} merely had to stay upright.`],
      'tess-delaney':[
        `${team} produced ${one(pts)}, ${rank}, which is less a fantasy score than an apology with decimal places. The lineup kept finding new ways to embarrass itself while ${opp} enjoyed the view.`,
        `${one(pts)} from ${team}, ${rank}. Even generous people run out of euphemisms eventually; this was a full-roster humiliation with ${opp} conveniently nearby.`],
      'mack-hollis':[
        `${team} dropped ${one(pts)}, ${rank}. How do you get this many lineup spots together and still make scoring look optional? ${opp} did not beat a juggernaut; it walked past a smoking crater.`,
        `${one(pts)}. That is the entire ${team} total. ${rank}. If you are looking for the bright side, congratulations on finding a hobby because the scoreboard did not provide one.`],
      'nora-voss':[
        `${team} finished with ${one(pts)}, ${rank}. I would accuse the lineup of sabotage if incompetence were not already doing such convincing work. ${opp} only had to let the damage continue.`,
        `${one(pts)} put ${team} at ${rank}. At some point “rough week” becomes an insult to rough weeks; this was a coordinated collapse and ${opp} collected the benefit.`]
    },
    awful:{
      'walter-mercer':[
        `${team} managed ${one(pts)}, ${rank}. One strong starter cannot rescue a total this low; the failure had too many contributors.`,
        `${one(pts)} left ${team} at ${rank}. A score this low usually requires several lineup spots to underperform together, which is exactly the problem.`],
      'tess-delaney':[
        `${team} gave us ${one(pts)}, ${rank}, and somehow expected discretion. No amount of polish disguises how many lineup spots arrived merely to occupy space.`,
        `${one(pts)} left ${team} at ${rank}. Not catastrophic enough for folklore, just dreadful enough that everybody involved should be embarrassed.`],
      'mack-hollis':[
        `${team} put up ${one(pts)}, ${rank}. The postgame meeting should begin with “seriously, how did we manage that?” and then get less polite.`,
        `${one(pts)} landed ${team} at ${rank}. You do not need a microscope to find the problem; you need a broom.`],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rank}. Rivals do not need to manufacture an insult when the lineup volunteers one this complete.`,
        `${one(pts)} left ${team} at ${rank}. Pretending that total was acceptable would require more imagination than criticizing it.`]
    },
    poor:{
      'walter-mercer':[
        `${team} finished with ${one(pts)}, ${rank}. Not a catastrophe, just a losing amount of ordinary unless ${opp} happened to be worse.`,
        `${one(pts)} put ${team} at ${rank}. That leaves very little room for quiet starters and even less room for excuses.`],
      'tess-delaney':[
        `${team} offered ${one(pts)}, ${rank}. Nobody needs to faint, but somebody should stop describing that as a pleasant Sunday.`,
        `${one(pts)} left ${team} at ${rank}. It was not scandalous; it was the more irritating kind of disappointment that keeps insisting it was almost fine.`],
      'mack-hollis':[
        `${team} put up ${one(pts)}, ${rank}. Not a disaster, just the kind of score that keeps checking the door to see whether a better lineup is coming.`,
        `${one(pts)} landed ${team} at ${rank}. Enough to avoid a public inquiry, nowhere near enough to start flexing.`],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rank}. Rivals can mock it without exaggerating, which is usually the part management should find annoying.`,
        `${one(pts)} put ${team} at ${rank}. There is probably a defense for it. Unfortunately ${opp} also gets to look at the scoreboard.`]
    },
    huge:{
      'walter-mercer':[
        `${team} posted ${one(pts)}, ${rank}. That kind of score makes ordinary lineup mistakes irrelevant because the roster kept producing answers faster than ${opp} found problems.`,
        `${one(pts)} put ${team} at ${rank}. When a lineup reaches that level, the opponent stops needing a diagnosis and starts needing a miracle.`],
      'tess-delaney':[
        `${team} arrived with ${one(pts)}, ${rank}, and behaved like restraint was somebody else’s problem. Excessive, indecent and extremely useful.`,
        `${one(pts)} put ${team} at ${rank}. Fantasy managers pretend to value moderation right up until their own roster starts doing this.`],
      'mack-hollis':[
        `${team} detonated for ${one(pts)}, ${rank}. That is not “a nice week.” That is the kind of score that makes the other totals look like they forgot the second half.`,
        `${one(pts)}. ${rank}. ${team} did not win quietly; it kicked the scoreboard hard enough that ${opp} had to hear the echo.`],
      'nora-voss':[
        `${team} scored ${one(pts)}, ${rank}. Rivals can call it unsustainable after they finish paying for what it just did to the standings.`,
        `${one(pts)} left ${team} at ${rank}. Anyone dismissing that ceiling is no longer being skeptical; they are volunteering to be surprised again.`]
    },
    good:{
      'walter-mercer':[` ${team} scored ${one(pts)}, ${rank}. Strong week. The value is the margin it created for normal mistakes elsewhere in the lineup.`],
      'tess-delaney':[` ${team} posted ${one(pts)}, ${rank}. Genuinely good, annoyingly competent and just restrained enough to avoid becoming vulgar.`],
      'mack-hollis':[` ${team} hit ${one(pts)}, ${rank}. Good enough to make ${opp} chase instead of dictate, which is exactly where a fantasy lineup wants the fight.`],
      'nora-voss':[` ${team} scored ${one(pts)}, ${rank}. Rivals can question the ceiling later; this week the total created real leverage and that part is not debatable.`]
    },
    middle:{
      'walter-mercer':[` ${team} landed at ${one(pts)}, ${rank}. Fine. If it wins, bank it; if ${opp} clears it, the ordinary score becomes the first thing everyone resents.`],
      'tess-delaney':[` ${one(pts)} left ${team} at ${rank}. Perfectly respectable, which is another way of saying nobody should become emotionally attached to it.`],
      'mack-hollis':[` ${team} scored ${one(pts)}, ${rank}. Enough to stay in the building, nowhere near enough to kick the door in.`],
      'nora-voss':[` ${one(pts)} put ${team} at ${rank}. It has not earned panic or swagger; anyone supplying either is adding emotion the score did not.`]
    }
  };
  const rows=banks[b]?.[reporter]||banks[b]?.['walter-mercer']||banks.middle['walter-mercer'];return pick(seed,rows).trim();
}

function installScoreVerdict(t,c,week){
  const a=t?.inquirer_article;if(!a)return;const lede=sec(a,'lede')||(a.sections||[])[0];if(!lede)return;
  const p=Array.isArray(lede.paragraphs)?lede.paragraphs.slice():[];const v=scoreVerdict(t,a,c,week);if(p.length)p[0]=v;else p.push(v);lede.paragraphs=p;
}

function historyInterpretation(t,a,p,week){
  const old=prior(p),now=Number(p?.points)||0;if(old==null)return null;const ratio=old?now/old:1,name=String(p.name||'This player'),team=String(t.team_name||'this team'),reporter=rid(a),won=t?.won===true,seed=[week,t.roster_id,reporter,p.id||name,ratio.toFixed(2)].join('|');
  if(ratio>=1.7){
    const rows={
      'walter-mercer':won?[`${name} did more than beat his normal range; he gave ${team} a real matchup advantage. The useful consequence is that one lineup spot suddenly created margin for everybody else.`]:[`${name} delivered far more than this lineup spot usually supplies and ${team} still lost. That turns a great individual Sunday into an indictment of the help around him.`],
      'tess-delaney':won?[`${name} wildly overdelivered and ${team} actually used the gift. Lovely for them, deeply irritating for everybody who had to play against it.`]:[`${name} dramatically overdelivered and ${team} still found a way to lose. Imagine receiving that kind of gift and converting it into disappointment.`],
      'mack-hollis':won?[`${name} kicked the matchup hard enough to change its shape. ${team} should keep leaning on that advantage until somebody proves the explosion was a one-week accident.`]:[`${name} handed ${team} an oversized advantage and the roster still wasted it. How many extra points does a lineup need before everybody else agrees to participate?`],
      'nora-voss':won?[`${name} gave ${team} more than rivals had any reasonable right to expect. Skeptics can call it temporary after they explain why it just mattered to a real win.`]:[`${name} supplied a genuine scoring windfall and ${team} still lost. The more embarrassing question is what everybody else did with the help.`]
    };return pick(seed,rows[reporter]||rows['walter-mercer']);
  }
  if(ratio>=1.25){
    const rows={
      'walter-mercer':`${name} gave ${team} more than this spot normally provides. That extra margin mattered to the matchup; the decimal comparison is secondary.`,
      'tess-delaney':`${name} slipped extra scoring into ${team}’s pocket. The interesting part is whether the roster spent it well, not whether the old average feels jealous.`,
      'mack-hollis':`${name} produced enough extra scoring to change the pressure on the rest of ${team}. That is lineup leverage, not spreadsheet trivia.`,
      'nora-voss':`${name} gave ${team} a real edge from a normally quieter source. Rivals can dismiss the bump after they explain away the fantasy consequence.`
    };return rows[reporter]||rows['walter-mercer'];
  }
  if(ratio<=.45){
    const star=old>=15?`Starting ${name} was defensible; the performance was the failure. `:'';
    const rows={
      'walter-mercer':`${star}${name} gave ${team} almost nothing from a spot that normally matters. One crater is survivable; donating an entire lineup slot repeatedly is not.`,
      'tess-delaney':`${star}${name} all but vanished. That is not a modest disappointment; that is a lineup spot leaving everybody else to explain the missing points.`,
      'mack-hollis':`${star}${name} was so quiet that “how is it even possible to get this little from that spot?” becomes a completely fair football question.`,
      'nora-voss':`${star}${name} disappeared at exactly the moment ${team} needed normal production. Rivals do not have to twist the numbers when the collapse is this cooperative.`
    };return rows[reporter]||rows['walter-mercer'];
  }
  if(ratio<=.75){
    const star=old>=15?`The start was defensible; the output was the problem. `:'';
    const rows={
      'walter-mercer':`${star}${name} underdelivered enough to force the rest of ${team} to cover for a lineup spot that was supposed to help.`,
      'tess-delaney':`${star}${name} offered a disappointing return and left ${team} asking other starters to clean up the social disaster.`,
      'mack-hollis':`${star}${name} came in as a normal source of points and turned into dead weight. One week is forgivable; repeating it gets loud fast.`,
      'nora-voss':`${star}${name} fell short enough to change the burden on the rest of ${team}. That is the consequence; the old average is merely the reason expectations were higher.`
    };return rows[reporter]||rows['walter-mercer'];
  }
  return null;
}

function isDryHistory(s,p){return prior(p)!=null&&/\b(?:baseline|last season|prior-season|prior season|per game|average|averaged|old standard|old number|year ago|usual|norm)\b/i.test(String(s||''))}
function rewriteHistory(text,t,a,week){return sentences(text).map(s=>{const p=namedPlayer(s,t);if(!p||!isDryHistory(s,p))return s;return historyInterpretation(t,a,p,week)||s}).join(' ')}

function genericScoreSentence(sentence,t){
  const score=one(t.points),s=String(sentence||''),team=String(t.team_name||''),mascot=team.trim().split(/\s+/).at(-1)||team;
  if(!new RegExp(`\\b${esc(score)}\\b`).test(s)||!/\b(?:points|score|scored|posted|put up|finished with|total)\b/i.test(s)||!new RegExp(`${esc(team)}|${esc(mascot)}`,'i').test(s))return false;
  if((t.starter_details||[]).some(p=>playerParts(p).some(n=>new RegExp(`\\b${esc(n)}\\b`,'i').test(s))))return false;
  return wc(s)<=34;
}
function dedupeScore(t){
  const a=t?.inquirer_article;if(!a)return;let seen=false;
  for(const s of a.sections||[])s.paragraphs=(s.paragraphs||[]).map(p=>{const out=[];for(const x of sentences(p)){if(genericScoreSentence(x,t)){if(seen)continue;seen=true}out.push(x)}return out.join(' ')}).filter(Boolean);
}
function brutalHotSeat(t,c,week){
  const a=t?.inquirer_article,b=band(t,c);if(!a||!['catastrophic','awful'].includes(b))return;const hot=sec(a,'hot-seat');if(!hot)return;
  const worst=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],reporter=rid(a),name=worst?.name||'The quietest starter',pts=worst?one(worst.points):'almost nothing',seed=[week,t.roster_id,reporter,'brutal'].join('|');
  const rows={
    'walter-mercer':`${name} gave them ${pts}, but blaming one player would be generous. A team total this low needs several starters to fail together.`,
    'tess-delaney':`${name} gave them ${pts}, and unfortunately there were accomplices. A score this ugly is a group effort, not one convenient villain.`,
    'mack-hollis':`${name} gave them ${pts}. Do not let everybody else hide behind him. A bottom-tier score is a group project and this lineup somehow got full participation.`,
    'nora-voss':`${name} gave them ${pts}. Rivals will point there first because it is easy, but a score near the floor requires a committee of bad answers.`
  };hot.paragraphs=[rows[reporter]||rows['walter-mercer'],...(hot.paragraphs||[])];
}

function scrubMeta(text){
  return String(text||'')
    .replace(/\bthe back[- ]page\b/gi,'the league conversation')
    .replace(/\bgroup chat\b/gi,'rival managers')
    .replace(/\brival chat\b/gi,'rivals')
    .replace(/\bscreenshot(?:s|ting)?\b/gi,'talking point')
    .replace(/\bcopy desk\b/gi,'league')
    .replace(/\bnewspaper\b/gi,'week')
    .replace(/\barticle\b/gi,'week')
    .replace(/\bheadline\b/gi,'result')
    .replace(/\bfile\b/gi,'read')
    .replace(/\bevidence\b/gi,'proof')
    .replace(/\bexhibit\b/gi,'example')
    .replace(/\breceipts?\b/gi,'reminder')
    .replace(/\bspreadsheet trivia\b/gi,'empty arithmetic')
    .replace(/\bspreadsheet has finished its argument\b/gi,'projection has said all it can')
    .replace(/\bMonday’s emergency broadcast\b/gi,'Monday excuses')
    .replace(/\bplace setting|ballroom doors|wardrobe|empty plate|dining room|silverware|china|tablecloth|linen|chair|chairs\b/gi,'lineup')
    .replace(/\s{2,}/g,' ').trim();
}

function breakout(overview,teams,previousEdition,week){
  for(const take of overview?.hot_takes||[]){
    if(!/breakout player to watch/i.test(String(take?.title||'')))continue;
    const name=String(take.title).replace(/^.*?:\s*/,'').trim().toLowerCase();let hit=null;
    for(const t of teams||[]){const p=(t.starter_details||[]).find(x=>String(x.name||'').trim().toLowerCase()===name);if(p){hit={t,p};break}}
    if(!hit)continue;
    const {t,p}=hit,reporter=String(take?.reporter?.id||'walter-mercer'),prev=(previousEdition?.teams||[]).find(x=>String(x.roster_id)===String(t.roster_id)),pp=(prev?.starter_details||[]).find(x=>String(x.id||'')===String(p.id||'')),first=pp?`${p.name} followed ${one(pp.points)} last week with ${one(p.points)} this week.`:`${p.name} just gave ${t.team_name} ${one(p.points)} points.`,seed=[week,t.roster_id,reporter,p.id||p.name].join('|');
    const rows={
      'walter-mercer':`${first} Two useful Sundays stop looking like a cute spike and start changing lineup expectations. ${t.team_name} can treat him as a weekly source of advantage until the role says otherwise.`,
      'tess-delaney':`${first} “Pleasant surprise” has an expiration date, and we are getting close. ${t.team_name} gets to enjoy the upgrade while everybody else decides how long it wants to keep pretending this is accidental.`,
      'mack-hollis':`${first} Call it a fluke again if you want, but do it loudly enough for the next opponent to hear before he ruins another Sunday. ${t.team_name} has a real weapon until somebody stops it.`,
      'nora-voss':`${first} Anyone still dismissing him is no longer being skeptical; they are volunteering to be wrong twice. Rivals now need an actual football reason the production should disappear.`
    };take.take=rows[reporter]||rows['walter-mercer'];
  }
}

function recapScore(overview,c,week){
  if(!c.high||!c.low)return;for(const s of overview?.sections||[]){
    s.paragraphs=(s.paragraphs||[]).map(p=>{
      if(!/league average|league scoring ran from/i.test(String(p||'')))return p;const reporter=rid({reporter:s.reporter}),hi=c.high,lo=c.low,spread=Number(hi.points)-Number(lo.points),brutal=Number(lo.points)<c.avg*.72,seed=[week,reporter,hi.roster_id,lo.roster_id].join('|');
      const rows={
        'walter-mercer':`${hi.team_name} set the ceiling at ${one(hi.points)} while ${lo.team_name} dragged the floor to ${one(lo.points)} against a ${one(c.avg)} league average. That ${one(spread)}-point gap is the difference between making an opponent chase you and making an opponent wonder whether you showed up.`,
        'tess-delaney':`${hi.team_name} arrived with ${one(hi.points)}; ${lo.team_name} answered with ${one(lo.points)} against a ${one(c.avg)} league average. Two entirely different classes of fantasy afternoon, and only one of them should be discussed in public without wincing.`,
        'mack-hollis':`${hi.team_name} exploded for ${one(hi.points)} and ${lo.team_name} crawled to ${one(lo.points)} while the league averaged ${one(c.avg)}. ${brutal?'How is it even possible to score that little with a full lineup?':'One roster kicked the door in and the other made ordinary scoring look unnecessarily difficult.'}`,
        'nora-voss':`${hi.team_name} posted ${one(hi.points)}; ${lo.team_name} posted ${one(lo.points)}; the league sat at ${one(c.avg)}. One team created fear. The other created material for every rival it plays next.`
      };return pick(seed,[rows[reporter]||rows['walter-mercer']]);
    });
  }
}

function ensurePostseason(out,weekClassification){
  if(!weekClassification?.playoffs)return;const teams=out?.inquirer?.teams||[],overview=out?.leagueOverview,eliminated=teams.filter(t=>t?.playoff_context?.eliminated_this_week),advanced=teams.filter(t=>t?.playoff_context?.advanced_this_week);
  for(const t of eliminated){const a=t?.inquirer_article;if(!a)continue;if(!/eliminated from championship contention/i.test((a.paragraphs||[]).join(' '))){const lede=sec(a,'lede')||(a.sections||[])[0];if(lede?.paragraphs)lede.paragraphs.unshift(`${t.team_name} was eliminated from championship contention in ${t.playoff_context?.current_round||weekClassification.round||'this playoff round'}. There is no softer fantasy interpretation: the title path ended here.`);a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[])}}
  for(const t of advanced){const a=t?.inquirer_article;if(!a)continue;const next=String(t.playoff_context?.next_round||'the next round');if(!new RegExp(`advances to ${esc(next)}`,'i').test((a.paragraphs||[]).join(' '))){const o=sec(a,'outlook')||(a.sections||[]).at(-1);if(o?.paragraphs)o.paragraphs.push(`${t.team_name} advances to ${next}. Surviving the bracket is the only argument that matters now.`);a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[])}}
  const ps=(overview?.sections||[]).find(s=>/Who Advanced and Who Went Home|Super Bowl/i.test(String(s?.heading||'')));if(ps){const copy=(ps.paragraphs||[]).join(' ');if(eliminated.length&&!/eliminated from championship contention/i.test(copy))ps.paragraphs.push(`${eliminated.map(t=>t.team_name).join(', ')} ${eliminated.length===1?'was':'were'} eliminated from championship contention.`);if(advanced.length&&!/advances to .*Divisional Round/i.test(copy)){const next=advanced[0]?.playoff_context?.next_round||'the next round';ps.paragraphs.push(`${advanced.map(t=>t.team_name).join(', ')} ${advanced.length===1?'advances':'advance'} to ${next}.`)}}
}

function rewriteArticle(t,c,week){
  const a=t?.inquirer_article;if(!a)return;installScoreVerdict(t,c,week);
  for(const s of a.sections||[])s.paragraphs=(s.paragraphs||[]).map(p=>scrubMeta(rewriteHistory(p,t,a,week))).filter(Boolean);
  brutalHotSeat(t,c,week);dedupeScore(t);a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]).filter(Boolean);
}
function rewriteOverview(overview,teams,c,previousEdition,week){
  const refine=(text,reporter)=>{let x=String(text||'');for(const t of teams||[]){const names=[t.team_name,...(t.starter_details||[]).map(p=>p.name)].filter(Boolean);if(names.some(n=>x.toLowerCase().includes(String(n).toLowerCase()))){x=rewriteHistory(x,t,{reporter},week);break}}return scrubMeta(x)};
  for(const s of overview?.sections||[]){s.paragraphs=(s.paragraphs||[]).map(p=>refine(p,s.reporter));for(const b of s.blocks||[])b.paragraphs=(b.paragraphs||[]).map(p=>refine(p,s.reporter))}
  for(const t of overview?.hot_takes||[])t.take=refine(t.take,t.reporter);recapScore(overview,c,week);breakout(overview,teams,previousEdition,week);
  overview.deck=scrubMeta(overview.deck);
}

export function applyInquirerEditorialV34(args={}){
  const base=applyCore(args);if(!base||Number(args.week)<3)return base;const out=structuredClone(base),teams=out?.inquirer?.teams||[],c=context(teams);
  for(const t of teams)rewriteArticle(t,c,Number(args.week));
  rewriteOverview(out?.leagueOverview,teams,c,args.previousEdition,Number(args.week));
  ensurePostseason(out,args.weekClassification);
  return out;
}
