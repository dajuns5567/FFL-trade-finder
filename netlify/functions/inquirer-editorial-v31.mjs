// Reusable Fleeced! Inquirer V31 editorial layer.
// Derived from the locked Week 2 V31 newsroom logic.
// Week 1/2 preloads remain immutable; Week 3+ runs this layer with week-aware
// variation, prior-edition continuity, playoff-race context and postseason rounds.
import {inspectInquirerFormatContract} from './inquirer-format-contract.mjs';
import {curateForwardTeamNarrative,inspectNarrativeArchitecture,restoreForwardPlayerFact,restoreForwardArticleDepth} from './inquirer-narrative-architecture.mjs';

export const FORWARD_INQUIRER_VERSION=31;
// Bump on any material editorial contract change so an earlier held draft
// cannot suppress the next scheduled regeneration for the same NFL week.
export const FORWARD_EDITORIAL_REVISION=51;

const deepStrings=(value,fn)=>{
  if(typeof value==='string')return fn(value);
  if(Array.isArray(value))return value.map(x=>deepStrings(x,fn));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,deepStrings(v,fn)]));
  return value;
};

export function adaptWeekLanguage(value,week,classification){
  let s=String(value||'');
  if(Number(week)<=2)return s;
  const prev=Math.max(1,Number(week)-1),next=Number(week)+1;
  const P0='__FLEECED_PREV_WEEK__',P1='__FLEECED_CURRENT_WEEK__',P2='__FLEECED_NEXT_WEEK__';
  s=s.replace(/\bWeek 1\b/g,P0).replace(/\bWeek 2\b/g,P1).replace(/\bWeek 3\b/g,P2);
  s=s.replaceAll(P0,'Week '+prev).replaceAll(P1,'Week '+Number(week)).replaceAll(P2,'Week '+next);
  s=s.replace(/\bthe opener\b/gi,'Week '+prev)
     .replace(/\bthat opener\b/gi,'that Week '+prev+' result')
     .replace(/\bthe opening result\b/gi,'the Week '+prev+' result')
     .replace(/\bopener\b/gi,'previous result')
     .replace(/\bopening week\b/gi,'Week '+prev)
     .replace(/\ban opening (win|loss)\b/gi,(_,kind)=>'a '+kind+' the previous week')
     .replace(/\bopening (win|loss)\b/gi,'$1 the previous week')
     .replace(/\bthe opening (win|loss)\b/gi,'the $1 from the previous week')
     .replace(/\bthe second Sunday\b/gi,'this Sunday')
     .replace(/\bsecond Sunday\b/gi,'this Sunday')
     .replace(/\bSecond Sunday\b/g,'This Sunday')
     .replace(/\bthrough two weeks\b/gi,'across the last two weeks')
     .replace(/\bacross both weeks\b/gi,'across the last two weeks')
     .replace(/\bTwo weeks\b/g,'The last two weeks')
     .replace(/\btwo weeks\b/g,'the last two weeks')
     .replace(/\bTwo Sundays\b/g,'The last two Sundays')
     .replace(/\btwo Sundays\b/g,'the last two Sundays')
     .replace(/\bthe two-week sample\b/gi,'the recent two-week sample')
     .replace(/What Two Weeks Are Starting to Say/g,'What the Last Two Weeks Are Starting to Say')
     .replace(/\bAt (2-0|0-2|1-1),/g,'Across the last two games ($1),')
     .replace(/\bthe first the last two (weeks|Sundays)\b/gi,(_,unit)=>'the last two '+unit)
     .replace(/\b(?:the last\s+){2,}two (weeks|Sundays)\b/gi,(match,unit)=>
       (/^[A-Z]/.test(match)?'The':'the')+' last two '+unit);
  if(Number(week)>=5)s=s
    .replace(/Week \d+ was a first impression; Week \d+ is where/gi,
      'Week '+prev+' supplied the comparison; Week '+Number(week)+' is where')
    .replace(/Good starts have to survive a third opponent/gi,
      'Good starts have to survive the next opponent');
  if(classification?.playoffs)s=s.replace(/Week \d+ • Regular Season/g,String(classification.label||('Week '+week+' • Playoffs')));
  return s;
}

function forwardRecordText(t){
  const r=t?.league_context?.record||{};
  return String(Number(r.wins)||0)+'-'+String(Number(r.losses)||0)+(Number(r.ties)?'-'+String(Number(r.ties)):'');
}
function forwardOne(v){return Number(v||0).toFixed(1)}
function forwardList(rows){const a=(rows||[]).filter(Boolean);return a.length<=1?(a[0]||''):a.length===2?a[0]+' and '+a[1]:a.slice(0,-1).join(', ')+', and '+a.at(-1)}

function forwardTrajectoryParagraphs(teams,week){
  const rows=(teams||[]).slice().sort((a,b)=>Number(a?.league_context?.standings_rank||999)-Number(b?.league_context?.standings_rank||999));
  const leaders=rows.slice(0,4),bottom=rows.slice(-4).reverse();
  const bubble=rows.filter(t=>Number.isFinite(Number(t?.league_context?.playoff_seed)))
    .sort((a,b)=>Math.abs(Number(a.league_context.playoff_seed)-Number(a.league_context.playoff_teams_per_conference||8))-Math.abs(Number(b.league_context.playoff_seed)-Number(b.league_context.playoff_teams_per_conference||8))).slice(0,4);
  const avg=rows.length?rows.reduce((n,t)=>n+Number(t.points||0),0)/rows.length:0;
  const high=rows.slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],low=rows.slice().sort((a,b)=>Number(a.points)-Number(b.points))[0];
  const gamesLeft=Math.max(0,13-Number(week));
  const p1=leaders.length
    ?'The top of the table now starts with '+forwardList(leaders.map(t=>t.team_name+' ('+forwardRecordText(t)+')'))+'. By Week '+week+', records are no longer opening-week decoration; the teams still winning have started charging rent for the benefit of the doubt.'
    :'The top of the table is too incomplete for a responsible league-wide read.';
  const p2=bottom.length
    ?'At the other end, '+forwardList(bottom.map(t=>t.team_name+' ('+forwardRecordText(t)+')'))+' have reached the part of the season where “small sample” needs a better lawyer. Nobody is mathematically buried by a newspaper sentence, but the standings have stopped accepting vibes as payment.'
    :'The bottom of the table is too incomplete for a responsible league-wide read.';
  const p3=Number(week)>=8&&bubble.length
    ?'The playoff race is now an actual weekly story with '+gamesLeft+' regular-season game'+(gamesLeft===1?'':'s')+' left. Around the current conference cut lines sit '+forwardList(bubble.map(t=>t.team_name+' (#'+String(t.league_context.playoff_seed||'?')+' seed)'))+'. From here on, a division result can move a team and damage the exact rival it is trying to catch.'
    :'The middle of the league still has enough traffic to punish anyone who treats one good Sunday like permanent clearance. The last two weeks matter because repeatable scoring is beginning to separate useful form from one-night theater.';
  const p4=(high&&low)
    ?[
      high.team_name+' led the league at '+forwardOne(high.points)+', '+forwardOne(Number(high.points)-avg)+' above the '+forwardOne(avg)+'-point average. '+low.team_name+' finished at '+forwardOne(low.points)+', '+forwardOne(avg-Number(low.points))+' below it. The scoreboard has already filed the complaint.',
      'The '+forwardOne(Number(high.points)-Number(low.points))+'-point distance between '+high.team_name+' ('+forwardOne(high.points)+') and '+low.team_name+' ('+forwardOne(low.points)+') is the week’s widest argument. The league average was '+forwardOne(avg)+'; neither end of that spread needs a fictional locker-room quote.',
      high.team_name+' set this week’s ceiling at '+forwardOne(high.points)+', and '+low.team_name+' set the floor at '+forwardOne(low.points)+'. Against the '+forwardOne(avg)+'-point league mean, that is a '+forwardOne(Number(high.points)-Number(low.points))+'-point reminder that the starting cards, not the pregame speeches, count.',
      'The weekly range runs from '+high.team_name+' at '+forwardOne(high.points)+' to '+low.team_name+' at '+forwardOne(low.points)+', with '+forwardOne(avg)+' as the 32-team average. A '+forwardOne(Number(high.points)-Number(low.points))+'-point gap leaves little room for the losing end to hide behind “it was close.”'
    ][Math.abs(Number(week)||0)%4]
    :'The league-wide scoring sample is incomplete, so the larger trend stays on hold instead of being invented.';
  return[p1,p2,p3,p4];
}

// A season record is never a two-game record. Keep all streak labels tied to
// the actual completed games being discussed, including after Week 2.
function forwardRecentResults(team,week,count=2){
  const games=(team?.league_context?.recent_games||[]).filter(g=>Number(g.week)<=Number(week))
    .sort((a,b)=>Number(b.week)-Number(a.week)).slice(0,count);
  return games.length===count?games.map(g=>String(g.result||'').toUpperCase()):[];
}
function forwardRecentGroup(teams,week,result){
  return (teams||[]).filter(t=>{
    const recent=forwardRecentResults(t,week);
    return recent.length===2&&recent.every(r=>r===result);
  });
}

function playoffTeamLine(team,classification){
  const p=team?.playoff_context;if(!p||!classification?.playoffs)return'';
  const round=String(classification.round||'the playoff round'),next=String(p.next_round||'the next round'),name=String(team.team_name||'This team');
  if(p.champion)return name+' won the Super Bowl. There is no next-round qualifier hiding in the copy; the bracket is finished and the trophy belongs here.';
  if(p.runner_up)return name+' reached the Super Bowl and lost the final. That is not a regular-season disappointment wearing nicer clothes; it is the last loss available on the championship path.';
  if(p.eliminated_this_week)return name+' was eliminated from championship contention in the '+round+'. The season can keep producing placement scores, but the title path ended here and the article should say so plainly.';
  if(p.advanced_this_week)return name+' survived the '+round+' and advances to '+next+'. The margin can be debated all week; the bracket only records that the season is still alive.';
  if(p.made_playoffs&&p.eliminated)return name+' entered the playoff field but was eliminated in Week '+String(p.eliminated_week||'?')+'. Any game now is a placement game, not a disguised return to the title race.';
  if(p.made_playoffs)return name+' remains alive in the '+round+'. At this point every lineup decision belongs to the bracket, because one loss ends the championship run.';
  return name+' is outside the championship bracket. The weekly score still belongs in the archive, but this is no longer a playoff-race article pretending otherwise.';
}

function playoffOverviewSection(teams,classification,reporter){
  if(!classification?.playoffs)return null;
  const rows=(teams||[]),advanced=rows.filter(t=>t?.playoff_context?.advanced_this_week),gone=rows.filter(t=>t?.playoff_context?.eliminated_this_week),champ=rows.find(t=>t?.playoff_context?.champion),runner=rows.find(t=>t?.playoff_context?.runner_up);
  const round=String(classification.round||'Playoffs'),paragraphs=[];
  if(champ)paragraphs.push(champ.team_name+' is the Fleeced! champion after the Super Bowl, with '+forwardOne(champ.points)+' points in the final. '+(runner?runner.team_name+' is the runner-up, and there is no softer verb that changes the bracket.':'The runner-up line was unavailable, so no opponent will be invented.'));
  else{
    if(advanced.length)paragraphs.push('The '+round+' sent '+forwardList(advanced.map(t=>t.team_name))+' forward. Surviving is the whole job now; style points do not receive a bracket slot.');
    if(gone.length)paragraphs.push('Championship contention ended this round for '+forwardList(gone.map(t=>t.team_name))+'. Those teams can still appear in placement matchups, but the Inquirer will not describe those games as if the title path remains open.');
  }
  if(!paragraphs.length)paragraphs.push('The '+round+' is active, but Sleeper has not resolved enough of the championship bracket to publish an elimination or advancement that is not yet real.');
  return{reporter,heading:champ?'Super Bowl: The Bracket Is Finished':round+': Who Advanced and Who Went Home',paragraphs};
}

function regularPlayoffRaceSection(teams,week,classification,reporter){
  if(classification?.playoffs||Number(week)<8)return null;
  const rows=(teams||[]).filter(t=>Number.isFinite(Number(t?.league_context?.playoff_seed)));
  if(!rows.length)return null;
  const slots=Math.max(1,Number(rows[0]?.league_context?.playoff_teams_per_conference)||8);
  const inside=rows.filter(t=>t.league_context.inside_playoff_line).sort((a,b)=>Number(b.league_context.playoff_seed)-Number(a.league_context.playoff_seed)).slice(0,4);
  const outside=rows.filter(t=>!t.league_context.inside_playoff_line).sort((a,b)=>Number(a.league_context.playoff_seed)-Number(b.league_context.playoff_seed)).slice(0,4);
  const divLeaders=rows.filter(t=>t.league_context.division_leader).sort((a,b)=>Number(a.league_context.playoff_seed)-Number(b.league_context.playoff_seed));
  const left=Math.max(0,13-Number(week));
  const paragraphs=[
    'The playoff race has stopped being background scenery. There are '+left+' regular-season game'+(left===1?'':'s')+' left before the Week 14 Wildcard Round, and every division winner still carries an automatic route into the field.',
    divLeaders.length?'Current division leaders: '+forwardList(divLeaders.map(t=>t.team_name+' (#'+t.league_context.playoff_seed+' '+String(t.conference||'')+' seed)'))+'. The standings can still move, but these are the teams currently holding the cleanest path.':'Sleeper has not supplied enough division context for a clean division-leader list.',
    (inside.length||outside.length)?'The conference cut line is #'+slots+'. Last teams currently inside: '+(inside.length?forwardList(inside.map(t=>t.team_name+' (#'+t.league_context.playoff_seed+')')):'none verified')+'. First teams currently outside: '+(outside.length?forwardList(outside.map(t=>t.team_name+' (#'+t.league_context.playoff_seed+')')):'none verified')+'.':'The conference cut line is not complete enough to publish responsibly.'
  ];
  return{reporter,heading:'The Playoff Race Is No Longer Background Noise',paragraphs};
}


function evolutionHash(value){
  let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;
}
const EVOLUTION_INTROS={
  // Short, distinct desk cues. Longer boilerplate prefatory clauses were
  // repeated across teams and read like automated copy rather than Week 4.
  'walter-mercer':[
    'Look at the personnel:','The margin asks more:','Follow the scoring:','The numbers resist spin:','Forget the excuses:','Sunday left a clue:','The box score settles this:','Carry this into Monday:'
  ],
  'tess-delaney':[
    'The unromantic version:','Spare me the excuses:','The football is plain:','Read the final score first:','Nicely put, but:','After the applause:','The lineup still answers:','Cut through the commotion:'
  ],
  'mack-hollis':[
    'Here is the noise:','Put this onscreen:','Back-page material:','Forget the preamble:','Turn it up:','Screenshot this:','No fine print:','The game tape will answer:'
  ],
  'nora-voss':[
    'Rivals noticed:','Across the sideline:','Nothing mysterious here:','File that under obvious:','The irritating part:','The lineup explains why:','One lineup detail:','Next week remembers:'
  ]
};
const EVOLUTION_TAILS={
  'walter-mercer':['That is the part worth carrying forward.','The next matchup gets to test whether it travels.','That belongs in the season ledger now.','The following Sunday gets the rebuttal.','That is enough to change the next conversation.','The point is useful precisely because it can be tested again.','The season has another data point to answer now.','Keep that in the notebook when the next lineup locks.'],
  'tess-delaney':['Elegant or not, the score keeps the receipt.','The next opponent is allowed to object.','Good manners do not make the point less true.','The following Sunday can improve the presentation.','That is the version I am willing to keep.','The next matchup can either polish it or ruin it.','There is plenty of time for the season to make this look foolish.','For now, the football has earned the sentence.'],
  'mack-hollis':['Nobody needs a committee meeting to understand it.','Next Sunday can answer.','Save the screenshot; the next game gets a vote.','That one is going straight into the group chat.','The next opponent can file the complaint.','If it repeats, the headline gets bigger.','If it disappears, we will happily print the correction.','Either way, the next Sunday is already booked.'],
  'nora-voss':['Rivals will remember it even if management would rather they did not.','The next matchup gets first chance to dispute it.','That is enough material for the rival chat.','The next Sunday decides whether this becomes a pattern.','Opponents now know exactly where to look.','Management gets one week to make the note boring.','Rivals do not need a second invitation to test it.','The season will either confirm the note or embarrass it.']
};
const EVOLUTION_LEXICON=[
  [/\bthe result\b/gi,['the final score','Sunday’s outcome','the settled outcome','the scoreboard answer']],
  [/\bthe lineup\b/gi,['the starting group','the lineup card','the starters','the weekly lineup']],
  [/\bthe roster\b/gi,['the squad','the roster construction','the team','the full roster']],
  [/\bthe scoreboard\b/gi,['the score','the scoring column','the final tally','the board']],
  [/\bthis week\b/gi,['this Sunday','the current week','this round of games','the latest Sunday']],
  [/\bnext week\b/gi,['the next matchup','the coming week','next Sunday','the following game']],
  [/\bscored\b/gi,['posted','put up','finished with','produced']],
  [/\bsupplied\b/gi,['provided','delivered','added','produced']],
  [/\bfinished\b/gi,['ended up','closed the week','came in','landed']],
  [/\bquiet\b/gi,['muted','low-output','soft','subdued']],
  [/\buseful\b/gi,['usable','valuable','helpful','repeatable']],
  [/\bthe top of the lineup\b/gi,['the front of the lineup','the leading scorers','the lineup’s top end','the first names on the scoring sheet']],
  [/\bthe bottom of the lineup\b/gi,['the low end of the lineup','the quiet end of the starters','the lineup’s bottom end','the last few scoring spots']],
  [/\bthe next opponent\b/gi,['the upcoming opponent','next week’s opponent','the other side next','the next team on the schedule']],
  [/\ba loss\b/gi,['a defeat','a losing Sunday','a dropped matchup','a loss']],
  [/\bthe loss\b/gi,['the defeat','the losing result','the dropped matchup','the loss']],
  [/\ba win\b/gi,['a victory','a winning Sunday','a banked result','a win']],
  [/\bthe win\b/gi,['the victory','the winning result','the banked result','the win']],
  [/\bthe week-over-week\b/gi,['the one-week change','the latest weekly shift','the change from last week','the week-to-week']],
  [/\bmanagement\b/gi,['the manager','the front office','the decision-makers','management']]
];
const CROSS_REPORTER_WORDS={
  'walter-mercer':[
    [/\bheadline\b/gi,'story'],[/\bargument\b/gi,'read'],[/\bresponse\b/gi,'answer'],[/\bpanic\b/gi,'pressure'],[/\bsiren\b/gi,'warning'],[/\bevidence\b/gi,'proof'],[/\broom\b/gi,'margin'],[/\bparade\b/gi,'celebration'],[/\bvolume\b/gi,'noise'],[/\bexplanation\b/gi,'excuse'],[/\bflexibility\b/gi,'options']
  ],
  'tess-delaney':[
    [/\bheadline\b/gi,'storyline'],[/\bargument\b/gi,'debate'],[/\bresponse\b/gi,'correction'],[/\bpanic\b/gi,'nerves'],[/\bsiren\b/gi,'alarm'],[/\bevidence\b/gi,'support'],[/\broom\b/gi,'breathing space'],[/\bparade\b/gi,'victory lap'],[/\bvolume\b/gi,'noise level'],[/\bexplanation\b/gi,'defense'],[/\bflexibility\b/gi,'maneuvering room']
  ],
  'mack-hollis':[
    [/\bheadline\b/gi,'banner'],[/\bargument\b/gi,'fight'],[/\bresponse\b/gi,'counterpunch'],[/\bpanic\b/gi,'alarm'],[/\bsiren\b/gi,'fire alarm'],[/\bevidence\b/gi,'proof'],[/\broom\b/gi,'space'],[/\bparade\b/gi,'victory parade'],[/\bvolume\b/gi,'decibels'],[/\bexplanation\b/gi,'alibi'],[/\bflexibility\b/gi,'wiggle room']
  ],
  'nora-voss':[
    [/\bheadline\b/gi,'talking point'],[/\bargument\b/gi,'rival case'],[/\bresponse\b/gi,'rebuttal'],[/\bpanic\b/gi,'rival excitement'],[/\bsiren\b/gi,'warning light'],[/\bevidence\b/gi,'material'],[/\broom\b/gi,'space'],[/\bparade\b/gi,'celebration'],[/\bvolume\b/gi,'noise'],[/\bexplanation\b/gi,'excuse'],[/\bflexibility\b/gi,'options']
  ]
};
function evolveCrossReporterSentence(sentence,reporterId,seed){
  let out=String(sentence||''),rid=CROSS_REPORTER_WORDS[reporterId]?reporterId:'walter-mercer',
    rows=CROSS_REPORTER_WORDS[rid],h=evolutionHash(seed+'|cross-reporter');
  let changed=0;
  for(let i=0;i<rows.length;i++){
    const [re,repl]=rows[(i+h)%rows.length];re.lastIndex=0;
    if(re.test(out)){re.lastIndex=0;out=out.replace(re,repl);changed++}
    if(changed>=3)break;
  }
  if(!changed){
    const tails={
      'walter-mercer':' The next week gets to test that read.',
      'tess-delaney':' Sunday gets the rebuttal.',
      'mack-hollis':' Next Sunday gets a vote.',
      'nora-voss':' The next opponent will have a fresh box score to examine.'
    };
    out=out.replace(/[.!?]?$/,'.')+(rid==='nora-voss'?[' The next matchup supplies the evidence.',' The opponent will test that inference.',' Another Sunday may alter the verdict.',' The current numbers invite further scrutiny.',' One more result could overturn that finding.',' The following box score must settle it.',' The next lineup will face its own audit.',' A fresh opponent means fresh evidence.'][h%8]:tails[rid]);
  }
  return out;
}
function evolveSentence(sentence,reporterId,seed){
  let out=String(sentence||'').trim();if(!out)return out;
  const h=evolutionHash(seed),rid=EVOLUTION_INTROS[reporterId]?reporterId:'walter-mercer';
  for(let i=0;i<EVOLUTION_LEXICON.length;i++){
    const [re,choices]=EVOLUTION_LEXICON[i];if(!re.test(out)){re.lastIndex=0;continue}re.lastIndex=0;
    const choice=choices[(h+i*7)%choices.length];out=out.replace(re,choice);
  }
  out=out.trim();if(out)out=out[0].toUpperCase()+out.slice(1);
  const intro=EVOLUTION_INTROS[rid][h%EVOLUTION_INTROS[rid].length];
  // Never stack a prefatory cue on copy that already has one; that produced
  // "The box score settles this: Look at the personnel: ..." in Week 5.
  const existingPrefaces=Object.values(EVOLUTION_INTROS).flat();
  const priorCue=existingPrefaces.find(prefix=>out.toLowerCase().startsWith(prefix.toLowerCase()));
  if(priorCue){
    // Existing newsroom cues must EVOLVE, not freeze unchanged merely because
    // the previous edition already used one. Replace, never stack, the cue.
    const variants=EVOLUTION_INTROS[rid].filter(prefix=>prefix.toLowerCase()!==priorCue.toLowerCase());
    const replacement=variants[h%variants.length]||intro;
    out=replacement+' '+out.slice(priorCue.length).trim();
  }else out=intro+' '+out;
  if(!/[.!?]$/.test(out))out+='.';
  return out;
}
function paragraphSentenceRows(paragraph){
  return forwardSentenceParts(paragraph).map(sentence=>({sentence,norm:forwardNormSentence(sentence,[]),words:forwardWordCount(sentence)}));
}
const FORWARD_CROSS_REPORTER_STYLE=/\b(?:room|table|chair|seating|rearrang\w*|headline|screenshot|joke|punchline|megaphone|receipt|reservation|silverware|china|wardrobe|decorative|parade|siren|menu|dinner|bill|gossip|guest list|repair|spiral|standard|unanswered|pressure|urgency|runway|rubble|identity|rebuttal|warning|panic|collapse|argument|response)\b/i;
function forwardEditorialPhraseKeys(sentence,entities,width=9,styleRequired=true){
  const raw=String(sentence||''),numeric=(raw.match(/\b\d+(?:\.\d+)?%?\b/g)||[]).length,
    factual=/\b(?:fantasy points?|solo tackles?|assisted tackles?|tackle for loss|qb hits?|passes?|targets?|receptions?|rushing yards?|receiving yards?|touchdowns?|carries|projection|projected)\b/i;
  if(numeric>=2&&factual.test(raw))return[];
  const norm=forwardNormSentence(raw,entities).replace(/[^a-z0-9#\[\]’'-]+/g,' ').replace(/\s+/g,' ').trim(),
    ws=norm.split(/\s+/).filter(Boolean),out=[];
  for(let i=0;i+width<=ws.length;i++){
    const gram=ws.slice(i,i+width).join(' ');
    if(!styleRequired||FORWARD_CROSS_REPORTER_STYLE.test(gram))out.push(gram);
  }
  return[...new Set(out)];
}
function forwardCrossReporterPhraseOffenders(teams,entities){
  const placements=new Map();
  for(const t of teams||[]){
    const rid=String(t?.inquirer_article?.reporter?.id||''),seen=new Set();
    for(const sentence of forwardArticleSentences(t)){
      for(const gram of forwardEditorialPhraseKeys(sentence,entities)){
        if(seen.has(gram))continue;seen.add(gram);
        const rows=placements.get(gram)||[];rows.push({team:String(t.team_name||''),reporter:rid});placements.set(gram,rows);
      }
    }
  }
  return new Map([...placements.entries()].filter(([,rows])=>rows.length>1&&new Set(rows.map(x=>x.reporter)).size>1));
}
// Catch copied editorial clauses even when their sentence openings or reporters
// differ. A shared 10-word rhetorical run in three articles is not fresh copy.
function forwardCrossTeamClauseOffenders(teams,entities,{width=12,minOwners=3,maxPlaceholders=1}={}){
  const placement=new Map();
  for(const t of teams||[]){
    const seen=new Set();
    for(const sentence of forwardArticleSentences(t))for(const gram of forwardEditorialPhraseKeys(sentence,entities,width,false)){
      if((gram.match(/\[(?:entity|#)\]/g)||[]).length<=maxPlaceholders)seen.add(gram);
    }
    for(const gram of seen){const rows=placement.get(gram)||[];rows.push(String(t.team_name||''));placement.set(gram,rows)}
  }
  return new Map([...placement].filter(([,owners])=>owners.length>=minOwners));
}
const forwardPairedNarrativeOffenders=(teams,entities)=>forwardCrossTeamClauseOffenders(teams,entities,{width:16,minOwners:2,maxPlaceholders:0});
function evolveForwardTeams(teams,previousEdition,week,salt){
  const currentEntities=forwardEntities({teams}),previousEntities=forwardEntities(previousEdition),entities=[...currentEntities,...previousEntities],
    priorByRoster=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),new Set(forwardArticleSentences(t).map(s=>forwardNormSentence(s,entities)))])),
    currentCounts=new Map();
  for(const t of teams||[])for(const s of forwardArticleSentences(t)){const n=forwardNormSentence(s,entities);currentCounts.set(n,(currentCounts.get(n)||0)+1)}
  const clauseOffenders=forwardCrossTeamClauseOffenders(teams,entities);
  const pairedOffenders=forwardPairedNarrativeOffenders(teams,entities);
  const phraseOffenders=new Set([...forwardCrossReporterPhraseOffenders(teams,entities).keys(),...clauseOffenders.keys(),...pairedOffenders.keys()]);
  return (teams||[]).map(t=>{
    const a=t?.inquirer_article;if(!a)return t;const rid=String(a?.reporter?.id||'walter-mercer'),prior=priorByRoster.get(String(t.roster_id))||new Set();
    const sections=(a.sections||[]).map((section,si)=>({...section,paragraphs:(section.paragraphs||[]).map((p,pi)=>{
      const rows=forwardSentenceParts(p);return rows.map((sentence,sj)=>{
        const n=forwardNormSentence(sentence,entities),phraseCollision=forwardEditorialPhraseKeys(sentence,entities).some(x=>phraseOffenders.has(x))||
          forwardEditorialPhraseKeys(sentence,entities,12,false).some(x=>clauseOffenders.has(x))||
          forwardEditorialPhraseKeys(sentence,entities,16,false).some(x=>pairedOffenders.has(x)),
          offender=forwardWordCount(sentence)>=10&&(prior.has(n)||(currentCounts.get(n)||0)>3||phraseCollision),
          seed=[week,salt,t.roster_id,section.kind||section.heading,si,pi,sj,n].join('|');
        if(!offender)return sentence;
        const targetedClause=forwardEditorialPhraseKeys(sentence,entities,12,false).some(gram=>(clauseOffenders.get(gram)||[]).indexOf(t.team_name)>=1)||
          forwardEditorialPhraseKeys(sentence,entities,16,false).some(gram=>(pairedOffenders.get(gram)||[]).indexOf(t.team_name)>=1);
        if(targetedClause)return '';
        const evolved=evolveSentence(sentence,rid,seed);
        return phraseCollision?evolveCrossReporterSentence(evolved,rid,seed):evolved;
      }).filter(Boolean).join(' ');
    }).filter(Boolean)}));
    return{...t,inquirer_article:{...a,sections,paragraphs:sections.flatMap(s=>s.paragraphs||[])}};
  });
}
function enforceRecapEvolution(overview,previousOverview,week,salt,entities=[]){
  if(!overview)return overview;
  const prior=new Set(),addPrior=value=>{
    for(const sentence of forwardSentenceParts(String(value||''))){
      if(forwardWordCount(sentence)>=6)prior.add(forwardNormSentence(sentence,entities));
    }
  };
  for(const section of previousOverview?.sections||[]){
    for(const p of section?.paragraphs||[])addPrior(p);
    for(const block of section?.blocks||[])for(const p of block?.paragraphs||[])addPrior(p);
  }
  for(const take of previousOverview?.hot_takes||[]){addPrior(take?.title);addPrior(take?.take)}
  const seen=new Set();
  const rewrite=(value,rid,seedBase)=>{
    const parts=forwardSentenceParts(String(value||''));
    return parts.map((sentence,i)=>{
      const n=forwardNormSentence(sentence,entities),longEnough=forwardWordCount(sentence)>=6,
        collision=longEnough&&(prior.has(n)||seen.has(n));
      let out=collision?evolveSentence(sentence,rid,[week,salt,'enforce',seedBase,i,n].join('|')):sentence;
      let outNorm=forwardNormSentence(out,entities);
      // A lexical rewrite can theoretically normalize back to the same sentence. Prefix once more with a
      // different deterministic seed rather than allowing a copy-forward sentence through.
      if(collision&&(prior.has(outNorm)||seen.has(outNorm))){
        out=evolveSentence(out,rid,[week,salt,'enforce-second-pass',seedBase,i,n].join('|'));
        outNorm=forwardNormSentence(out,entities);
      }
      if(collision&&(prior.has(outNorm)||seen.has(outNorm))){
        const tails=EVOLUTION_TAILS[rid]||EVOLUTION_TAILS['walter-mercer'];
        const qualification=tails[evolutionHash([week,salt,seedBase,i,'fresh-tail'].join('|'))%tails.length];
        out=out.replace(/[.!?]?$/,', and '+qualification.charAt(0).toLowerCase()+qualification.slice(1));
        outNorm=forwardNormSentence(out,entities);
      }
      if(longEnough)seen.add(outNorm);
      return out;
    }).join(' ').replace(/\b(?:The box score settles this|Sunday left a clue|Carry this into Monday|Look at the personnel|Forget the excuses|The numbers resist spin):\s*/gi,((seen)=>match=>seen++?'':match)(0));
  };
  const sections=(overview.sections||[]).map((section,si)=>{
    const rid=String(section?.reporter?.id||'walter-mercer');
    if(Array.isArray(section?.blocks)&&section.blocks.length){
      const blocks=section.blocks.map((block,bi)=>({...block,paragraphs:(block.paragraphs||[]).map((p,pi)=>rewrite(p,rid,['block',si,bi,pi].join('|')))}));
      return{...section,blocks,paragraphs:blocks.flatMap(b=>b.paragraphs||[])};
    }
    return{...section,paragraphs:(section.paragraphs||[]).map((p,pi)=>rewrite(p,rid,['section',si,pi].join('|')))};
  });
  // Hot-take bodies are deliberately evolved every forward week. Their segment labels may recur as a
  // newspaper convention, but the actual commentary must not be the prior week's copy with names/numbers swapped.
  const hot_takes=(overview.hot_takes||[]).map((take,i)=>{
    const rid=String(take?.reporter?.id||'walter-mercer'),body=String(take?.take||''),
      evolvedBody=body?evolveSentence(body,rid,[week,salt,'hot-body',i,forwardNormSentence(body,entities)].join('|')):body;
    return{...take,take:evolvedBody};
  });
  return{...overview,sections,hot_takes};
}
function rejectRecapCopyForward(overview,previousOverview,week,entities){
  if(!previousOverview)return overview;
  const previous={league_overview:previousOverview};
  const prior=new Set(forwardRecapSentences(previous).map(s=>forwardNormSentence(s,entities)));
  const rewrite=paragraph=>forwardSentenceParts(paragraph).map(sentence=>{
    if(forwardWordCount(sentence)<10||!prior.has(forwardNormSentence(sentence,entities)))return sentence;
    return 'By Week '+week+', '+sentence.charAt(0).toLowerCase()+sentence.slice(1).replace(/[.!?]?$/,'—and managers no longer get to call that a surprise.');
  }).join(' ');
  const sections=(overview.sections||[]).map(section=>{
    if(section.blocks?.length){const blocks=section.blocks.map(b=>({...b,paragraphs:(b.paragraphs||[]).map(rewrite)}));return{...section,blocks,paragraphs:blocks.flatMap(b=>b.paragraphs||[])}}
    return{...section,paragraphs:(section.paragraphs||[]).map(rewrite)};
  });
  return{...overview,sections};
}
function evolveForwardOverview(overview,previousOverview,week,salt,entities=[]){
  if(!overview)return overview;
  const sectionParagraphs=section=>Array.isArray(section?.blocks)&&section.blocks.length
    ?section.blocks.flatMap(b=>b?.paragraphs||[])
    :(section?.paragraphs||[]);
  const priorText=[
    ...(previousOverview?.sections||[]).flatMap(sectionParagraphs),
    ...(previousOverview?.hot_takes||[]).flatMap(x=>[x?.title,x?.take]).filter(Boolean)
  ].join(' ');
  const currentText=[
    ...(overview?.sections||[]).flatMap(sectionParagraphs),
    ...(overview?.hot_takes||[]).flatMap(x=>[x?.title,x?.take]).filter(Boolean)
  ].join(' ');
  const priorSentences=new Set(forwardSentenceParts(priorText).filter(s=>forwardWordCount(s)>=10).map(s=>forwardNormSentence(s,entities))),
    counts=new Map();
  for(const s of forwardSentenceParts(currentText).filter(s=>forwardWordCount(s)>=10)){const n=forwardNormSentence(s,entities);counts.set(n,(counts.get(n)||0)+1)}
  const evolveParagraph=(p,rid,seedBase)=>forwardSentenceParts(p).map((sentence,sj)=>{
    const n=forwardNormSentence(sentence,entities),offender=forwardWordCount(sentence)>=6&&(priorSentences.has(n)||(counts.get(n)||0)>1);
    return offender?evolveSentence(sentence,rid,[week,salt,seedBase,sj,n].join('|')):sentence;
  }).join(' ');
  const sections=(overview.sections||[]).map((section,si)=>{
    const rid=String(section?.reporter?.id||'walter-mercer');
    if(Array.isArray(section?.blocks)&&section.blocks.length){
      const blocks=section.blocks.map((block,bi)=>({...block,paragraphs:(block.paragraphs||[]).map((p,pi)=>evolveParagraph(p,rid,['recap-block',section.heading,si,block.heading||block.title,bi,pi].join('|')))}));
      return{...section,blocks,paragraphs:blocks.flatMap(b=>b.paragraphs||[])};
    }
    return{...section,paragraphs:(section.paragraphs||[]).map((p,pi)=>evolveParagraph(p,rid,['recap-section',section.heading,si,pi].join('|')))};
  });
  const hot_takes=(overview.hot_takes||[]).map((take,i)=>{
    const rid=String(take?.reporter?.id||'walter-mercer'),title=String(take?.title||''),body=String(take?.take||'');
    return{...take,title:evolveParagraph(title,rid,['hot-title',i].join('|')),take:evolveParagraph(body,rid,['hot-take',i].join('|'))};
  });
  return{...overview,sections,hot_takes};
}
// Refresh recurrent Week 2-derived idioms against live forward-week facts.
// This is deliberately confined to Week 3+; preloaded editions remain untouched.
export function polishForwardTeamCopy(teams,week,salt){
 const byRoster=new Map((teams||[]).map(t=>[String(t.roster_id),t]));
 const pick=(team,key,options)=>options[evolutionHash([week,salt,team.roster_id,key].join('|'))%options.length];
 return (teams||[]).map(t=>{
  const article=t?.inquirer_article;if(!article)return t;
  const team=String(t.team_name||'the team'),record=forwardRecordText(t),
    top=(t.starter_details||[])[0],weak=(t.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],
    next=String(t.next_opponent_name||'the next opponent'),opponent=byRoster.get(String(t.next_opponent_roster_id)),
    partial=[{name:team,points:Number(t.next_projected),coverage:Number(t.next_projection_coverage)},
      {name:next,points:Number(t.next_opponent_projected),coverage:Number(opponent?.next_projection_coverage)}]
      .filter(x=>Number.isFinite(x.points)&&x.points<15&&Number.isFinite(x.coverage)&&x.coverage<6);
  const rewrite=(value,kind='')=>{
   let s=String(value||'');
   // Numeric adjective starts with a consonant sound for nine (e.g. a 9.5-point week).
   // Apply before other copy transformations so all forward weeks share the repair.
   s=s.replace(/\ban (?=9(?:\.\d+)?-point\b)/gi,'a ').replace(/\ba (?=8(?:\.\d+)?-point\b)/gi,'an ');
   if(kind==='outlook'&&partial.length&&/\b(?:projection|forecast|pregame screenshot|favorite|Week \d+ board|model)\b/i.test(s)){
    const gaps=partial.map(x=>x.name+' ('+x.coverage+' projected starters)').join(' and ');
    // Rotate short factual clauses by roster identity. Shared notices must not
    // become the same long cross-team newspaper sentence.
    const variant=Math.abs(Number(t.roster_id)||0)%16;
    const lead=[
      'This forecast carries a warning:',
      'Treat next Sunday’s spread skeptically:',
      'The projection math needs context:',
      'Here is the missing piece:'
    ][variant%4];
    const evidence=[
      gaps+' have gaps in starter projections;',
      gaps+' do not represent full-lineup estimates;',
      'coverage remains thin for '+gaps+';',
      gaps+' have not reached a complete forecast;'
    ][Math.floor(variant/4)%4];
    const consequence=[
      'calling a favorite now would be a guess.',
      'the press box can wait for better numbers.',
      'rival managers should save their victory laps.',
      'not every decimal deserves a headline.'
    ][(variant+Math.floor(variant/4))%4];
    return lead+' '+evidence+' '+consequence;
   }
   s=s.replace(/\bthe first the last two weeks\b/gi,'the last two weeks')
    .replace(/\bare 2-0\b/gi,'have won their last two games')
    .replace(/\bare 0-2\b/gi,'have lost their last two games')
    .replace(/\bcrowd is 0-2\b/gi,'crowd has watched two straight losses');
   // Remove phrase banks that only changed a team/player name. Freshness is
   // measured across the whole 32-team issue, not within one reporter desk.
   s=s.replace(/the next Sunday changes the season sample; it does not simply photocopy the first conclusion\./gi,
     pick(t,'season-sample',[`Week ${week} changes the ledger; the manager still owns ${forwardOne(t.points)} points.`,
       `That ${forwardOne(t.points)}-point Sunday must be judged alongside the previous result, not mistaken for the whole season.`,
       `The season record is ${record}; the next game against ${next} will test which part is repeatable.`,
       `One more score belongs in the archive, and ${team} cannot edit the earlier one out.`]));
   s=s.replace(/same stars are fine; same emergency dependence is not\./gi,
     pick(t,'emergency-dependence',[`Against ${next}, ${team} needs more than one rescuer.`,
       `The next opponent will happily let the rest of the lineup disappear again.`,
       `Against ${next}, ${team} needs more than one producer after scoring ${Number(t.points||0).toFixed(1)} points last Sunday.`,
       `After ${Number(t.points||0).toFixed(1)} points, ${team} needs its quiet starters to take a larger share against ${next}.`]));
   s=s.replace(/that headliner shift made the second scoreboard louder\./gi,
     pick(t,'headliner-shift',[`The week-to-week scoring jump is real; the next defense will have the scouting report.`,
       `The new total raised expectations, a punishment reserved for players who actually produce.`,
       `The measurable change matters more than any highlight clip.`,
       `Somebody in the rival chat just retired last week's joke.`]));
   s=s.replace(/the third score turned the Week \d+ volume up\./gi,
     pick(t,'third-score',[`The supporting points matter because the matchup is scored beyond its biggest star.`,
       `That swing improved the lineup's floor, which is more useful than another solo highlight.`,
       `The difference belongs on the manager's Week ${week} report card.`,
       `Those points change the matchup without requiring a podium for every starter.`]));
   s=s.replace(/kicked the door in and ([^.]+?) actually followed through it\./gi,
     pick(t,'door',[`gave ${team} a decisive start, and the ${forwardOne(t.points)}-point total backed it up.`,
       `made the opposing lineup pay attention; ${team} supplied the rest of the argument.`,
       `put a real number behind the week's bravado.`,
       `did the headline work while ${team} handled the final score.`]));
   s=s.replace(/kicked the door in and the rest of ([^.]+?) still managed to lose the building\./gi,
     pick(t,'door-loss',[`gave ${team} a score to be proud of, only for the final margin to ruin the party.`,
       `did enough to deserve a win while the rest of the lineup filed its excuses.`,
       `put the opposition under pressure but did not get enough company on the scoring sheet.`,
       `left ${team} with one bright line and a much less flattering final score.`]));
   s=s.replace(/kicked the door in and the ([^.]+?) made sure the rest of the lineup followed him through it\./gi,
     pick(t,'door-support',[`set the tone, and ${team} finished the argument with ${forwardOne(t.points)} points.`,
       `made the first statement; the supporting starters made it count.`,
       `put up the headline number while the roster supplied enough answers behind it.`,
       `earned top billing without requiring the rest of the lineup to disappear.`]));
   s=s.replace(/kicked the door in and [^.]+\./gi,
     pick(t,'door-any',[`made the scorer's contribution impossible to ignore in a ${forwardOne(t.points)}-point team result.`,
       `supplied a headline that the rest of ${team} had to earn.`,
       `made the difference visible on the final score, for better or worse.`,
       `gave the manager one answer and several more lineup questions.`]));
   s=s.replace(/kept the middle of the scoreboard from going dark\./gi,
     pick(t,'middle-score',[`added points the manager could not afford to lose.`,
       `kept the supporting cast relevant to the result.`,
       `made the score less dependent on one star.`,
       `made the quieter lineup slots look a little less guilty.`]));
   s=s.replace(/followed its opening victory with a loss to /gi,pick(t,'reversal',[
    'could not follow last week’s win with another against ',
    'carried a victory into this matchup but fell to ',
    'won the previous week, then came up short against ',
    'saw its winning momentum end against '
   ]));
   s=s.replace(/Rivals can enjoy the reversal; management has to explain the missing points\./g,pick(t,'reversal-read',[
    'The drop in production is the manager’s immediate problem, regardless of how loudly the rivals celebrate.',
    'That swing demands a closer look at the starters, especially '+String(weak?.name||'the lowest scorer')+' at '+forwardOne(weak?.points)+' points.',
    'A week ago the result offered cover; now the '+forwardOne(t.points)+'-point total needs explaining.',
    'The previous victory does not erase Sunday’s weaker output, and '+next+' is already on the schedule.'
   ]));
   s=s.replace(/The ([A-Z][A-Z ]+) picture has ([^.]+?) in the middle of a live race\./g,(_,division)=>pick(t,'division-open',[
    team+' sits in a competitive '+division+' picture at '+record+'.',
    'The '+division+' standings leave '+team+' with a '+record+' record and plenty to settle.',
    'At '+record+', '+team+' has immediate work in '+division+'.',
    division+' remains tightly contested around '+team+' ('+record+').',
    'A '+record+' mark puts '+team+' in the thick of the '+division+' argument.',
    'There is no comfortable lane for '+team+' in '+division+' at '+record+'.'
   ]));
   s=s.replace(/The division includes /g,pick(t,'division-list',[
    'The other clubs in that division are ','The teams across the table are ',
    'That race also features ','The direct competition includes ',
    'Sharing the same division are ','Its nearby rivals on the standings page are '
   ]));
   s=s.replace(/The rivals are /g,pick(t,'division-rivals',[
    'The immediate challengers are ','The teams to track are ','That group consists of ',
    'Across the division sit ','The standings also involve ','The opposition in the group includes '
   ]));
   s=s.replace(/one Sunday can reorder the whole group\./gi,pick(t,'division-close',[
    'a head-to-head result could change the order quickly.',
    'the next standings update may have a very different shape.',
    'no club has earned a permanent place in that order.',
    'each divisional contest now changes two teams’ arguments at once.',
    'the schedule still offers plenty of ways to move.',
    'that makes the next matchup a meaningful standings test.'
   ]));
   s=s.replace(/A silent box score from the new arrivals makes the actual starters responsible for Sunday’s result\./g,pick(t,'inactive-adds',[
    'The additions were not in the scoring lineup; the '+forwardOne(t.points)+' points belong to the players who started.',
    'None of those newcomers supplied Sunday’s points. The starters, led by '+String(top?.name||'the top scorer')+', own this result.',
    'Those transactions changed the roster, but not the lineup responsible for the final score.',
    'A new name on the wire is not a point on the board; Sunday’s starters still have to answer for '+forwardOne(t.points)+'.',
    'The acquisitions stayed outside the starting group, leaving the actual lineup to explain the margin.',
    'Until an addition enters the lineup, the scoring responsibility remains with the players already starting.'
   ]));
   s=s.replace(/Rivals can skip the transaction joke and look at /g,pick(t,'quiet-wire',[
    'Without a completed move to blame, the scrutiny falls on ',
    'The roster wire offers no diversion from ',
    'The more useful criticism starts with ',
    'A quiet transaction log puts the focus directly on ',
    'Instead of inventing a trade controversy, study ',
    'The rival chat has an easier target in '
   ]));
   s=s.replace(/Fix the part everybody saw and rivals have to find new material\./g,pick(t,'repair-close',[
    'The next lineup against '+next+' will show whether management addressed that weakness.',
    'A response begins with better scoring from the quietest starter, not another explanation.',
    'Sunday identified the problem; the next opponent will test the correction.',
    'Improvement needs to appear in the box score before the rival jokes lose their force.',
    'The only persuasive answer is a lineup that makes the same complaint obsolete.',
    'The next result has to offer stronger evidence than this scoring line.'
   ]));
   return s;
  };
  const headline=String(article.headline||'')
    .replace(/\bBanks Another Sunday and Raises the Standard\b/g,'Bank Another Sunday and Raise the Standard')
    .replace(/\bExposed Its Own Weak Spot\b/g,'Exposed Their Own Weak Spot')
    .replace(/\bMade Week (\d+) Much Funnier for Its Rivals\b/g,'Made Week $1 Much Funnier for Their Rivals')
    .replace(/\bMake this Sunday\b/g,'Make This Sunday');
  const sections=(article.sections||[]).map(section=>({...section,paragraphs:(section.paragraphs||[]).map(p=>rewrite(p,section.kind))}));
  return {...t,inquirer_article:{...article,headline,sections,paragraphs:sections.flatMap(s=>s.paragraphs||[])}};
 });
}
export function applyInquirerEditorialV31({season,week,rawInquirer,rawOverview,previousEdition=null,weekClassification=null,variationSalt=0}={}){
  season=Number(season);week=Number(week);variationSalt=Number(variationSalt)||0;
  if(!rawInquirer||!Array.isArray(rawInquirer.teams))throw new Error('V31 forward editorial layer requires raw team articles');
  const historicalSeasonYear=season-1;
  const previousByRoster=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t]));
  const playerNameById=new Map(),playerMetaById=new Map();
  for(const t of rawInquirer.teams||[]){
    const pools=[
      ...(t?.starter_details||[]),
      ...(t?.opponent_roster?.players||[]),
      ...(t?.opponent_roster?.starters||[]),
      ...(t?.next_opponent_roster?.players||[]),
      ...(t?.next_opponent_roster?.starters||[]),
      ...Object.values(t?.transaction_player_facts||{})
    ];
    for(const p of pools)if(p?.id&&p?.name){
      const id=String(p.id),prior=playerMetaById.get(id)||{},merged={...prior};
      for(const [k,v] of Object.entries(p))if(v!=null&&v!=="")merged[k]=v;
      playerMetaById.set(id,merged);playerNameById.set(id,String(p.name));
    }
    for(const a of t?.trade_acquisitions||[]){
      if(a?.player_id&&a?.player_name)playerNameById.set(String(a.player_id),String(a.player_name));
      for(let i=0;i<(a?.outgoing_player_ids||[]).length;i++)if(a?.outgoing_player_names?.[i])playerNameById.set(String(a.outgoing_player_ids[i]),String(a.outgoing_player_names[i]));
    }
  }
  const pname=id=>playerNameById.get(String(id))||String(id||''),pmeta=id=>playerMetaById.get(String(id))||null;
function w2One(v){return Number(v||0).toFixed(1)}
function w2Record(t){const r=t?.league_context?.record||{};return String(Number(r.wins)||0)+"-"+String(Number(r.losses)||0)+(Number(r.ties)?"-"+String(Number(r.ties)):"")}
function w2Alias(t){const full=String(t?.team_name||"Team").trim(),bits=full.split(/\s+/).filter(Boolean);return{full,city:bits.length>1?bits.slice(0,-1).join(" "):full,mascot:bits.length>1?bits.at(-1):full}}
function w2Cohort(t){return (Math.floor(Math.max(0,(Number(t?.roster_id)||1)-1)/4)+Math.max(0,Number(week)-2)+Math.max(0,Number(variationSalt)||0))%8}
function w2Hash(s){let h=2166136261;for(const ch of String(season)+"|"+String(week)+"|"+String(variationSalt)+"|"+String(s||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function w2Sentence(body){
  const s=String(body||"").trim();
  return s?s[0].toUpperCase()+s.slice(1):s;
}
function w2S(t,r,key,body){return w2TeamGrammar(t,w2Sentence(body))}
function w2Natural(xs){const a=(xs||[]).filter(Boolean);return a.length<=1?(a[0]||""):a.length===2?a[0]+" and "+a[1]:a.slice(0,-1).join(", ")+", and "+a.at(-1)}
function w2Stat(p){const real=String(p?.real_stat_line||"").trim();return real?real.replaceAll(" • ",", ").replace(/\b1 carries\b/g,'1 carry').replace(/\b1 rush yds\b/g,'1 rush yd'):""}
function w2StatClause(p){const stat=w2Stat(p);return stat?"; "+w2StatKind(p)+": "+stat:""}
function w2PrevPlayer(prev,id){return (prev?.starter_details||[]).find(p=>String(p?.id)===String(id))||null}
function w2SlotLabel(slot){return String(slot||"lineup spot").replaceAll("_"," ").toLowerCase().replace(/^idp /,"IDP ")}

function w2DisplayTeam(name){const raw=String(name||"").trim(),s=raw.replace(/\s+\(\d+-\d+(?:-\d+)?\)$/,"");return s&&s===s.toLowerCase()?s.replace(/\b[a-z]/g,m=>m.toUpperCase()):s}
function w2PluralTeamName(name){const mascot=w2Alias({team_name:w2DisplayTeam(name)}).mascot;return /s$/i.test(String(mascot||""))}
function w2TeamVerb(name,singular,plural){return w2PluralTeamName(name)?plural:singular}
function w2EscRe(s){return [...String(s||"")].map(ch=>".*+?^$(){}|[]".includes(ch)||ch.charCodeAt(0)===92?"\\"+ch:ch).join("")}
function w2TeamGrammar(t,body){
  let out=String(body||"");
  const names=[t?.team_name,t?.opponent_name,t?.next_opponent_name].filter(Boolean).map(w2DisplayTeam);
  for(const name of names){
    if(!name||!w2PluralTeamName(name))continue;
    const e=w2EscRe(name);
    out=out.replace(new RegExp(e+" is\\b","g"),name+" are")
      .replace(new RegExp(e+" has\\b","g"),name+" have")
      .replace(new RegExp(e+" shares\\b","g"),name+" share")
      .replace(new RegExp(e+" was\\b","g"),(match,offset,input)=>/\b(?:on|of|for|with|against|from|after|before)\s$/i.test(input.slice(0,offset))?match:name+" were")
      .replace(new RegExp(e+" gets\\b","g"),name+" get")
      .replace(new RegExp(e+" leaves\\b","g"),name+" leave")
      .replace(new RegExp(e+" goes\\b","g"),name+" go")
      .replace(new RegExp(e+" takes\\b","g"),name+" take")
      .replace(new RegExp(e+" needs\\b","g"),name+" need")
      .replace(new RegExp(e+" answers\\b","g"),name+" answer")
      .replace(new RegExp(e+" keeps\\b","g"),name+" keep")
      .replace(new RegExp(e+" turns\\b","g"),name+" turn")
      .replace(new RegExp(e+" wins\\b","g"),name+" win")
      .replace(new RegExp(e+" loses\\b","g"),name+" lose")
      .replace(new RegExp(e+" falls\\b","g"),name+" fall")
      .replace(new RegExp(e+" makes\\b","g"),name+" make")
      .replace(new RegExp(e+" starts\\b","g"),name+" start")
      .replace(new RegExp(e+" lands\\b","g"),name+" land")
      .replace(new RegExp(e+" shifts\\b","g"),name+" shift")
      .replace(new RegExp(e+" changes\\b","g"),name+" change")
      .replace(new RegExp(e+" supplies\\b","g"),name+" supply")
      .replace(new RegExp(e+" owns\\b","g"),name+" own")
      .replace(new RegExp(e+" wants\\b","g"),name+" want")
      .replace(new RegExp(e+" gives\\b","g"),name+" give")
      .replace(new RegExp(e+" moves\\b","g"),name+" move")
      .replace(new RegExp(e+" puts\\b","g"),name+" put")
      .replace(new RegExp(e+" spills\\b","g"),name+" spill")
      .replace(new RegExp(e+" earns\\b","g"),name+" earn")
      .replace(new RegExp(e+" exposes\\b","g"),name+" expose")
      .replace(new RegExp(e+" hands\\b","g"),name+" hand")
      .replace(new RegExp(e+" raises\\b","g"),name+" raise")
      .replace(new RegExp(e+" banks\\b","g"),name+" bank")
      .replace(new RegExp(e+" looks\\b","g"),name+" look")
      .replace(new RegExp(e+" reaches\\b","g"),name+" reach")
      .replace(new RegExp(e+" brings\\b","g"),name+" bring")
      .replace(new RegExp(e+" enters\\b","g"),name+" enter")
      .replace(new RegExp(e+" carries\\b","g"),name+" carry")
      .replace(new RegExp(e+" meets\\b","g"),name+" meet")
      .replace(new RegExp(e+" holds\\b","g"),name+" hold")
      .replace(new RegExp(e+"’s\\b","g"),name+"’")
      .replace(new RegExp(e+"'s\\b","g"),name+"’");
  }
  return out
}
function w2DeltaPhrase(delta){const d=Number(delta);if(!Number.isFinite(d)||Math.abs(d)<0.05)return"essentially the same as";return d>0?w2One(Math.abs(d))+" points more than":w2One(Math.abs(d))+" points fewer than"}
function w2PlayerAngle(t,r,p,pp,i,opp){
  const a=w2Alias(t),pts=Number(p?.points)||0,prior=Number(pp?.points),delta=Number.isFinite(prior)?pts-prior:null,pos=String(p?.position||"").toUpperCase(),
    def=/^(DL|DE|DT|LB|DB|CB|S|EDGE|IDP)$/.test(pos),rid=String(r?.id||""),won=Number(t.points)>Number(t.opponent_points),
    team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(opp),v=w2Hash(team+"|"+String(p?.id||p?.name)+"|"+i+"|"+rid)%4;
  if(i===2&&pts<8){
    const low={
      "walter-mercer":[
        p.name+" was third on the "+a.mascot+" scoring list at only "+w2One(pts)+" points. That exposes the lack of depth behind the top two.",
        "Third-highest for "+a.mascot+" was "+p.name+" at "+w2One(pts)+". The ranking sounds better than the production.",
        p.name+" finished as the third scorer with "+w2One(pts)+", which is more warning about the roster’s depth than praise for the line.",
        "The "+a.mascot+" third scoring slot belonged to "+p.name+" at "+w2One(pts)+" points. That is too low to sell as meaningful support."
      ],
      "tess-delaney":[
        p.name+" was the third-highest "+a.mascot+" scorer at only "+w2One(pts)+" points. That is not supporting elegance; the table leaned too heavily on the names above him.",
        "The third chair at the "+a.mascot+" table went to "+p.name+" with "+w2One(pts)+" points. That is a seating chart problem, not a compliment.",
        p.name+" ranked third for "+a.mascot+" at "+w2One(pts)+". A polished roster should not need to call that a supporting performance.",
        "The "+a.mascot+" reached their third scorer at "+p.name+" and "+w2One(pts)+" points. The good china is doing too much work at the top of the table."
      ],
      "mack-hollis":[
        p.name+" ranked third for "+a.mascot+" with just "+w2One(pts)+" points. That is the top of the lineup dragging a couch uphill.",
        "Third place on the "+a.mascot+" scoring board was "+p.name+" at "+w2One(pts)+". Do not put confetti on that.",
        p.name+" was the third scorer at "+w2One(pts)+". If that is the support line, the stars need overtime pay.",
        "The "+a.mascot+" third-best score was "+w2One(pts)+" from "+p.name+". That is not depth; that is a warning siren."
      ],
      "nora-voss":[
        p.name+" was third on the "+a.mascot+" scoring list with "+w2One(pts)+" points. Rivals do not need a joke there; the number already says top-heavy.",
        "The third "+a.mascot+" scorer was "+p.name+" at "+w2One(pts)+". Rivals can save their creativity because the depth chart wrote the punch line.",
        p.name+" landed third with "+w2One(pts)+" points. That is a very convenient number for anyone mocking the support behind the stars.",
        "At "+w2One(pts)+" points, "+p.name+" was still third for "+a.mascot+". The top-heavy joke does not need editing."
      ]
    };
    return (low[rid]||low["walter-mercer"])[v];
  }
  if(rid==="walter-mercer"){
    if(i===0){
      const rows=def?[
        p.name+" gave "+team+" "+w2One(pts)+" IDP points, a premium defensive score that "+(won?"helped create the margin over ":"kept the loss to ")+foe+" from becoming worse.",
        team+" got "+w2One(pts)+" IDP points from "+p.name+". "+(won?"That defensive production materially helped the winning total against ":"Without it, the deficit to ")+foe+(won?".":" would have been larger."),
        p.name+" produced "+w2One(pts)+" from an IDP slot for "+team+", the kind of positional edge that "+(won?"matters in a win over ":"keeps a loss to ")+foe+" in context.",
        "An IDP led "+team+": "+p.name+" scored "+w2One(pts)+". "+(won?"That is a real source of separation in the win.":"The rest of the lineup did not supply enough around it.")
      ]:[
        p.name+" gave "+team+" "+w2One(pts)+" points at the top of the lineup; "+(won?"that production supplied the foundation for the win over ":"even that centerpiece score was not enough to catch ")+foe+".",
        team+" got its best Week 2 score from "+p.name+" at "+w2One(pts)+". "+(won?"The rest of the roster did enough to turn it into a win.":"The total around him was not enough to reach "+foe+"."),
        p.name+" led "+team+" with "+w2One(pts)+" points. "+(won?"That is centerpiece production attached to a useful result.":"It became wasted top-end production in the loss."),
        "The top "+team+" line was "+p.name+" at "+w2One(pts)+". "+(won?"That gave the lineup a foundation.":"That foundation needed more help.")
      ];
      return rows[v];
    }
    if(i===1){
      if(delta!=null&&Math.abs(delta)>=8){
        const rows=[
          p.name+" moved "+w2One(Math.abs(delta))+" points "+(delta>0?"up":"down")+" from Week 1, materially changing the support behind "+team+"’s leading scorer.",
          "Week over week, "+p.name+" shifted by "+w2One(Math.abs(delta))+" points "+(delta>0?"higher":"lower")+". That altered the second layer of "+team+"’s scoring.",
          p.name+" changed his contribution by "+w2One(Math.abs(delta))+" points from the opener. "+(delta>0?"The jump gave ":"The drop cost ")+team+" meaningful secondary production.",
          "The second-scoring story is the swing: "+p.name+" moved "+w2One(Math.abs(delta))+" points "+(delta>0?"above":"below")+" his Week 1 total."
        ];
        return rows[v];
      }
      const rows=[
        p.name+" gave "+team+" "+w2One(pts)+" as its second-highest score, a useful layer behind the weekly leader.",
        team+" got "+w2One(pts)+" from second scorer "+p.name+". That kept the top line from standing alone.",
        "Behind the leader, "+p.name+" supplied "+w2One(pts)+" for "+team+". That is the sort of secondary total a lineup can use.",
        p.name+" checked in second for "+team+" at "+w2One(pts)+" points. The value is in giving the roster another meaningful score."
      ];
      return rows[v];
    }
    const rows=/TD/i.test(String(p?.real_stat_line||""))?[
      p.name+" converted scoring chances into "+w2One(pts)+" fantasy points; the touchdowns mattered more than raw yardage to "+team+"’s total.",
      "Touchdowns carried "+p.name+" to "+w2One(pts)+" for "+team+", which is the fantasy value of the line even without gaudy yardage.",
      p.name+" reached "+w2One(pts)+" through scoring plays. For "+team+", conversion mattered more than volume.",
      "The third-scoring contribution from "+p.name+" was "+w2One(pts)+", with touchdowns doing most of the fantasy work."
    ]:[
      p.name+" added "+w2One(pts)+" behind the top two, enough to matter without pretending the third score carried the matchup.",
      "Third on the "+team+" scoring list was "+p.name+" at "+w2One(pts)+". That is support, not centerpiece production.",
      team+" got "+w2One(pts)+" from "+p.name+" in the third slot, a useful contribution that belongs in context.",
      p.name+" supplied the third "+team+" score at "+w2One(pts)+". It helped the total without defining it."
    ];
    return rows[v];
  }
  if(rid==="tess-delaney"){
    if(i===0){
      const rows=def?[
        p.name+" brought "+w2One(pts)+" IDP points to the table. "+(won?"That defensive luxury helped the winning lineup look composed.":"It was one of the pieces worth keeping on display after the loss."),
        "The "+a.mascot+" centerpiece came from IDP: "+p.name+" delivered "+w2One(pts)+". "+(won?"That is tasteful excess in a win.":"The result failed to match the quality of the piece."),
        p.name+" supplied "+w2One(pts)+" from a defensive slot, an unusually valuable centerpiece for "+a.mascot+".",
        "At "+w2One(pts)+" points, "+p.name+" turned an IDP slot into one of the "+a.mascot+" best pieces on the table."
      ]:[
        p.name+" was the "+a.mascot+" centerpiece with "+w2One(pts)+" points. "+(won?"The supporting cast did enough to make the performance useful.":"The performance was lovely; the result around it was not."),
        "The good china belonged to "+p.name+" after "+w2One(pts)+" points for "+a.mascot+". "+(won?"The result matched the presentation.":"The rest of the evening did not."),
        p.name+" received top billing for "+a.mascot+" at "+w2One(pts)+" points. "+(won?"That centerpiece had enough company.":"That centerpiece deserved better company."),
        "A "+w2One(pts)+"-point line from "+p.name+" anchored the "+a.mascot+" table. "+(won?"The win made it worth displaying.":"The loss made it wasted elegance.")
      ];
      return rows[v];
    }
    if(i===1){
      if(delta!=null&&delta>6){
        const rows=[
          p.name+" improved by "+w2One(delta)+" points from the opener, giving "+a.mascot+" materially more support behind the headline scorer.",
          "The supporting cast got louder through "+p.name+", who added "+w2One(delta)+" points over Week 1.",
          p.name+" moved "+w2One(delta)+" points above his opener total, the kind of improvement that gives the centerpiece room to breathe.",
          "Compared with Week 1, "+p.name+" added "+w2One(delta)+" points. That is an upgrade in the second chair, not decorative movement."
        ];
        return rows[v];
      }
      const rows=[
        p.name+" supplied "+w2One(pts)+" as the second scorer, useful support rather than another centerpiece pretending to be one.",
        "Second billing went to "+p.name+" at "+w2One(pts)+" points, enough support to keep the table from becoming a solo act.",
        p.name+" gave "+a.mascot+" "+w2One(pts)+" from the second scoring chair. That is supporting work, properly labeled.",
        "The "+a.mascot+" second scorer was "+p.name+" with "+w2One(pts)+". A good supporting piece does not need to impersonate the centerpiece."
      ];
      return rows[v];
    }
    const rows=[
      p.name+" added "+w2One(pts)+" as the third scorer. That belongs in the supporting cast, not the starring role.",
      "Third billing belonged to "+p.name+" at "+w2One(pts)+" points. Useful company for the stars, not a new leading role.",
      p.name+" supplied "+w2One(pts)+" from the third chair. That is enough to help the table without stealing the centerpiece.",
      "The "+a.mascot+" third scorer was "+p.name+" at "+w2One(pts)+". Call it support and leave the top billing elsewhere."
    ];
    return rows[v];
  }
  if(rid==="mack-hollis"){
    if(i===0){
      const rows=won?[
        p.name+" dropped "+w2One(pts)+" for "+a.mascot+". That is a headline score because it helped win the week.",
        a.mascot+" got "+w2One(pts)+" from "+p.name+" at the top. Put that on the front page of a win.",
        p.name+" led the "+a.mascot+" with "+w2One(pts)+". Big score, winning result, no need to whisper.",
        "The loudest "+a.mascot+" number was "+w2One(pts)+" from "+p.name+". That one belongs in the headline."
      ]:[
        p.name+" dropped "+w2One(pts)+" for "+a.mascot+", a headline score trapped inside a loss.",
        a.mascot+" got "+w2One(pts)+" from "+p.name+" and still lost. That is exactly how a good performance becomes an angry headline.",
        p.name+" led the "+a.mascot+" with "+w2One(pts)+", then had to watch the rest of the total fall short.",
        "The loudest "+a.mascot+" number was "+w2One(pts)+" from "+p.name+". The loss turned it into wasted noise."
      ];
      return rows[v];
    }
    if(i===1){
      if(delta!=null&&delta>8){
        const rows=[
          p.name+" jumped "+w2One(delta)+" points from Week 1 and gave "+a.mascot+" a real second source of scoring.",
          "The Week 1-to-Week 2 jump for "+p.name+" was "+w2One(delta)+" points. That is how a second scorer gets loud.",
          p.name+" added "+w2One(delta)+" points over his opener line, giving "+a.mascot+" a much better second punch.",
          "Second-scorer volume went up through "+p.name+", whose total improved by "+w2One(delta)+" points from Week 1."
        ];
        return rows[v];
      }
      const rows=[
        p.name+" gave "+a.mascot+" "+w2One(pts)+" behind the leader. That is enough to keep the star from shouting into an empty room.",
        "Behind the headline, "+p.name+" put up "+w2One(pts)+" for "+a.mascot+". That is the useful kind of second noise.",
        p.name+" supplied "+w2One(pts)+" as the second "+a.mascot+" score. No confetti needed; it did its job.",
        "The "+a.mascot+" second punch was "+p.name+" at "+w2One(pts)+" points. That keeps the second chair from looking ornamental."
      ];
      return rows[v];
    }
    if(/TD/i.test(String(p?.real_stat_line||""))){const rows=[
      p.name+" reached "+w2One(pts)+" through scoring plays. The touchdowns did the fantasy work even if the yardage line was ordinary.",
      p.name+" turned end-zone work into "+w2One(pts)+" points. That is the part of the performance worth yelling about.",
      p.name+" got to "+w2One(pts)+" because scoring plays carried the line. Fantasy points do not award style bonuses for prettier yardage.",
      p.name+" produced "+w2One(pts)+" with touchdowns doing the heavy lifting. That is useful third-scorer noise, not a new centerpiece."
    ];return rows[v]}
    {const rows=[
      p.name+" supplied "+w2One(pts)+" in the third slot. Useful, yes; something I am building a parade around, no.",
      p.name+" checked in at "+w2One(pts)+" as the third scorer. That helps the total without stealing the headline.",
      p.name+" added "+w2One(pts)+" behind the two louder names. Call it support, not spectacle.",
      p.name+" gave "+a.mascot+" "+w2One(pts)+" from the third scoring spot. That is enough to matter and not enough to hijack the page."
    ];return rows[v]}
  }
  if(i===0){
    const rows=won?[
      p.name+" put up "+w2One(pts)+" for "+a.mascot+". Rivals can complain about the rest, but the top line was loud.",
      "The "+a.mascot+" leader was "+p.name+" at "+w2One(pts)+". Harder to mock the top of a winning lineup after that.",
      p.name+" gave "+a.mascot+" "+w2One(pts)+" at the top. The win makes that an inconvenient fact for rivals.",
      "Rivals wanted a quiet centerpiece; "+p.name+" answered with "+w2One(pts)+" for "+a.mascot+"."
    ]:[
      p.name+" put up "+w2One(pts)+" for "+a.mascot+", and rivals still get the joke because the score ended up in a loss.",
      "The "+a.mascot+" leader was "+p.name+" at "+w2One(pts)+". Nice number; ugly place to waste it.",
      p.name+" gave "+a.mascot+" "+w2One(pts)+" at the top, which only makes the loss more annoying.",
      "Rivals cannot mock "+p.name+"’s "+w2One(pts)+" points; they can mock the fact that "+a.mascot+" still lost."
    ];
    return rows[v];
  }
  if(i===1){
    if(delta!=null&&delta< -8){
      const rows=[
        p.name+" fell "+w2One(Math.abs(delta))+" points from Week 1. "+team+" still got "+w2One(pts)+" from him, but the drop increased the burden elsewhere.",
        "Week over week, "+p.name+" lost "+w2One(Math.abs(delta))+" points of production. Rivals will notice the missing secondary volume.",
        p.name+" came in "+w2One(Math.abs(delta))+" points below his opener total, making the second scoring slot less comfortable for "+a.mascot+".",
        "The "+a.mascot+" second scorer slipped through "+p.name+", down "+w2One(Math.abs(delta))+" points from Week 1."
      ];
      return rows[v];
    }
    const rows=[
      p.name+" gave "+a.mascot+" "+w2One(pts)+" as the second scorer, enough to make the lineup more than a one-name headline.",
      "Second on the "+a.mascot+" board was "+p.name+" at "+w2One(pts)+". Rivals have to account for more than the weekly leader when that holds.",
      p.name+" supplied "+w2One(pts)+" behind the leader. That keeps the "+a.mascot+" from becoming a one-name punch line.",
      "The "+a.mascot+" got "+w2One(pts)+" from second scorer "+p.name+". That is enough secondary production to complicate the cheap joke."
    ];
    return rows[v];
  }
  const rows=[
    p.name+" added "+w2One(pts)+" behind the top two. Rivals should care whether that third score is repeatable.",
    "Third on the "+a.mascot+" board was "+p.name+" at "+w2One(pts)+". The only useful joke is whether he can do it again.",
    p.name+" supplied "+w2One(pts)+" from the third scoring slot. Repeatability is the real rival question.",
    "The "+a.mascot+" third score came from "+p.name+" at "+w2One(pts)+". That is where the next round of heckling or respect gets decided."
  ];
  return rows[v];
}

function w2BenchRead(t,r,miss,gap,won,margin){
  const reserve=miss.reserve.name,starter=miss.starter.name,slot=w2SlotLabel(miss.slot||miss.starter?.lineup_slot);
  const points=w2One(gap),team=w2DisplayTeam(t.team_name),marginText=w2One(margin);
  const choice=w2Hash(team+"|"+reserve+"|"+starter+"|bench-journalism")%12;
  const facts=[
    reserve+" managed "+points+" more than "+starter+", who got the "+slot+" start.",
    starter+" kept the "+slot+" job while "+reserve+" scored "+points+" extra points from the bench.",
    reserve+"'s "+points+"-point edge over "+starter+" makes that "+slot+" choice sting.",
    "Management chose "+starter+" for "+slot+"; "+reserve+" answered with "+points+" more points.",
    "The missed "+String(slot).toUpperCase()+" call: "+reserve+" beat "+starter+" by "+points+".",
    reserve+" supplied "+points+" more than "+starter+" without getting the "+slot+" start.",
    "A "+points+"-point advantage for "+reserve+" over starter "+starter+" did "+team+" no good from the sideline.",
    starter+" got the nod at "+slot+"; "+reserve+"'s extra "+points+" points stayed unused.",
    reserve+" beat "+starter+" by "+points+". "+reserve+" stayed on the bench.",
    "One roster choice aged poorly: "+starter+" started over "+reserve+", whose return was "+points+" points better.",
    reserve+" scored "+points+" more than "+starter+" from the bench while "+slot+" was occupied.",
    "Reserve "+reserve+" finished "+points+" ahead of "+starter+" despite the latter occupying "+slot+"."
  ];
  const judgment=won?[
    team+" keeps the win, but "+reserve+"'s "+points+"-point advantage over "+starter+" will still come up in lineup review.",
    "The result belongs to "+team+"; the unused "+reserve+" points belong in the manager's notes.",
    reserve+" outscored "+starter+" without even taking the "+slot+" start.",
    "The result stands; "+team+" still needs to explain why those "+points+" unused points stayed on the bench."
  ]:[
    reserve+" outscored "+starter+" during a "+marginText+"-point loss. That hurts.",
    "Those unused points will be much louder at the next lineup meeting.",
    starter+" started at "+slot+". "+reserve+" beat that choice by "+points+".",
    "A losing week is a rough time to discover the bench had a better answer."
  ];
  return facts[choice]+" "+judgment[w2Hash(team+"|bench-verdict")%judgment.length];
}
function w2StatKind(p){
  const pos=String(p?.position||"").toUpperCase();
  if(/^(QB)$/.test(pos))return"passing";
  if(/^(RB|FB)$/.test(pos))return"rushing and receiving";
  if(/^(WR|TE)$/.test(pos))return"receiving / receptions";
  return"defensive";
}
function w2LedeShape(t,r,won,margin,opp,top){
  const a=w2Alias(t),star=top?.[0]?.name||t.team_name,close=margin<=6,wide=margin>=20,k=w2Hash(String(t.roster_id)+"|lede|"+String(r?.id||""))%6,team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(opp);
  const second=top?.[1],support=Number(second?.points)||0;
  if(!won&&Number(top?.[0]?.points||0)===0&&Number(t.points||0)===0)
    return team+" scored exactly 0.0, including 0.0 from "+star+". It takes commitment to submit a whole starting lineup and bring home absolutely nothing; "+foe+" only needed to show up on the scoreboard.";
  if(won){
    const rows=[
      close?star+" supplied the biggest "+a.mascot+" score, and a "+w2One(margin)+"-point finish means the supporting points behind him were every bit as important.":star+" set the pace, while "+team+" got enough additional scoring to finish ahead of "+foe+" without relying on one line alone.",
      wide?team+" won by "+w2One(margin)+" because the top of the lineup produced and the rest did not leave much for "+foe+" to erase on the scoreboard.":team+" finished ahead of "+foe+" with "+w2One(support)+" points from its second scorer, a healthier shape than a one-player carry.",
      star+" earned the "+a.mascot+" headline; "+(second?.name||"the support cast")+" supplied the part that made "+foe+" reachable.",
      close?"A "+w2One(margin)+"-point win makes every useful score count. "+team+" got enough behind "+star+" that no single quiet slot decided the result.":"The final score favored "+team+" because the roster produced in more than one place instead of asking "+star+" to cover every gap.",
      ([
        star+" was the loudest "+a.mascot+" reason for the win, but the supporting points behind him are what kept the result from becoming a one-player carry.",
        star+" owned the headline for "+a.mascot+"; the quieter story is that enough secondary scoring showed up to make the top line useful.",
        "The "+a.mascot+" got the star turn from "+star+" and enough production elsewhere to turn that performance into a win.",
        star+" led the "+a.mascot+" scoring, while the rest of the lineup supplied enough points to keep the result from depending on one name."
      ])[w2Hash(team+"|lede-depth")%4],
      star+" led "+team+", with "+(second?.name||"another starter")+" adding what "+team+" needed against "+foe+"."
    ];return rows[k];
  }
  const rows=[
    close?foe+" won by only "+w2One(margin)+", which puts ordinary lineup decisions and missing secondary points under a microscope for "+team+".":team+" lost by "+w2One(margin)+", and the gap came from too little scoring beyond "+star+", not from one mysterious football adjustment.",
    wide?"A "+w2One(margin)+"-point loss means "+team+" needed help in several lineup spots; "+star+" alone was nowhere near enough to match "+foe+".":team+" got a usable top score from "+star+", but "+foe+" finished with more total production across the matchup.",
    "The "+a.mascot+" got something from "+star+", but the lineup behind him did not produce enough to reach "+foe+"’s total.",
    close?"This was close enough to make every bench and lineup choice hurt. "+team+" finished "+w2One(margin)+" short, so the missing support behind "+star+" is concrete rather than theoretical.":star+" gave "+team+" a focal point, but the "+w2One(margin)+"-point gap to "+foe+" survived the best individual performance.",
    team+" lost to "+foe+" by "+w2One(margin)+". "+star+" supplied the anchor, but "+(second?.name||"the next starter")+" could not turn the result.",
    star+" gave the "+a.mascot+" something to build around, but the rest of the lineup did not supply enough points to overcome "+foe+"."
  ];return rows[k];
}

function w2HistoricalColor(p,r,t=null,slot=0,ref=""){
  const pts=Number(p?.points),prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0,name=ref||String(p?.name||"this player");
  if(!Number.isFinite(pts)||!Number.isFinite(prior)||prior<=0||games<6)return "";
  const delta=pts-prior;if(Math.abs(delta)<Math.max(4,prior*.3))return "";
  const rid=String(r?.id||""),up=delta>0,year=Number(p?.prior_season_year)||historicalSeasonYear,
    v=t?(w2Cohort(t)+(Number(slot)||0)*3)%8:w2Hash(String(p?.id||p?.name)+"|history|"+rid)%8,
    old=w2One(prior),now=w2One(pts);
  const rows={
    "walter-mercer":up?[
      name+" averaged "+old+" fantasy points in "+year+"; "+now+" this week is enough of a jump to make that old baseline worth reopening.",
      "In "+year+", "+name+" lived at "+old+" per game; Week 2 reached "+now+", which is a real departure from the established level.",
      "The "+year+" book on "+name+" says "+old+" per game, while this Sunday says "+now+"; that is a spike worth remembering before anybody calls it normal.",
      name+" came out of "+year+" with a "+old+"-point average; a "+now+"-point Week 2 moved far enough above it to earn a second look next Sunday.",
      "Last season’s average for "+name+" was "+old+"; this week’s "+now+" cleared that bar by enough that the role deserves fresh attention.",
      name+" spent "+year+" around "+old+" a game; landing at "+now+" in Week 2 is the sort of jump that changes what the next box score is allowed to tell us.",
      "Use "+old+" as the "+year+" baseline for "+name+"; Week 2 answered with "+now+", a gain large enough to matter beyond one happy decimal.",
      "The prior-season marker for "+name+" was "+old+" per game in "+year+"; "+now+" this week put genuine daylight between the old expectation and Sunday."
    ]:[
      name+" averaged "+old+" fantasy points in "+year+"; "+now+" this week fell far enough below that baseline to deserve attention.",
      "In "+year+", "+name+" lived at "+old+" per game; Week 2 stopped at "+now+", which is a real miss against the established level.",
      "The "+year+" book on "+name+" says "+old+" per game, while this Sunday says "+now+"; that drop is too large to wave away as routine noise.",
      name+" came out of "+year+" with a "+old+"-point average; a "+now+"-point Week 2 landed far enough below it to make the next usage report interesting.",
      "Last season’s average for "+name+" was "+old+"; this week’s "+now+" missed that bar by enough that the quiet Sunday deserves its own note.",
      name+" spent "+year+" around "+old+" a game; landing at "+now+" in Week 2 is the kind of dip that makes one check the role before blaming luck.",
      "Use "+old+" as the "+year+" baseline for "+name+"; Week 2 answered with "+now+", a decline large enough to matter beyond one bad bounce.",
      "The prior-season marker for "+name+" was "+old+" per game in "+year+"; "+now+" this week left real daylight on the wrong side of that standard."
    ],
    "tess-delaney":up?[
      "Last season, "+name+" averaged "+old+"; Week 2 arrived at "+now+" wearing considerably more jewelry.",
      name+" brought a "+year+" average of "+old+" into this season, then served "+now+" in Week 2 as if the old portion size had offended him.",
      "The "+year+" place card for "+name+" read "+old+" per game; this Sunday’s "+now+" required a larger table.",
      name+" spent last season around "+old+" a game, and "+now+" this week was the statistical equivalent of arriving in evening wear to brunch.",
      "A "+old+" average followed "+name+" out of "+year+"; Week 2’s "+now+" was not subtle, tasteful, or remotely interested in matching it.",
      name+" carried a "+year+" baseline of "+old+"; Sunday answered with "+now+", and suddenly the centerpiece needed more room.",
      "The "+year+" usual serving for "+name+" was "+old+" points; Week 2 brought "+now+" and asked whether anyone had ordered the larger platter.",
      "The old average beside "+name+" was "+old+" in "+year+"; a "+now+"-point Week 2 turned that baseline into background décor."
    ]:[
      "Last season, "+name+" averaged "+old+"; Week 2 offered "+now+", which is less a variation than a missing course.",
      name+" brought a "+year+" average of "+old+" into this season, then served only "+now+" in Week 2; the table noticed.",
      "The "+year+" place card for "+name+" read "+old+" per game; this Sunday’s "+now+" looked conspicuously underdressed beside it.",
      name+" spent last season around "+old+" a game, and "+now+" this week was the statistical equivalent of leaving before the entrée.",
      "A "+old+" average followed "+name+" out of "+year+"; Week 2’s "+now+" made that old standard look rather painfully well-fed.",
      name+" carried a "+year+" baseline of "+old+"; Sunday answered with "+now+", and no amount of good china makes the portion larger.",
      "The "+year+" usual serving for "+name+" was "+old+" points; Week 2 brought "+now+" and left everyone staring at the empty side of the plate.",
      "The old average beside "+name+" was "+old+" in "+year+"; a "+now+"-point Week 2 made the baseline feel less like décor and more like a complaint."
    ],
    "mack-hollis":up?[
      name+" averaged "+old+" last season; "+now+" in Week 2 did not beat that number so much as kick the door off it.",
      ([
        name+" put up "+now+" where the "+year+" baseline had been "+old+".",
        "The old figure for "+name+" was "+old+" in "+year+". Sunday brought "+now+".",
        name+"'s "+now+" barely resembles the "+old+" average from "+year+".",
        "Put "+old+" beside "+now+" for "+name+". That is the difference from "+year+".",
        "A "+year+" average of "+old+" did not predict "+name+"'s "+now+".",
        name+" moved from a "+old+" benchmark in "+year+" to "+now+" this week.",
        "Last year "+name+" was a "+old+"-point player. The new mark is "+now+".",
        name+" turned the "+year+" baseline of "+old+" into a "+now+"-point Sunday."
       ])[w2Hash(String(p?.id||name)+"|historical-angle")%8],
      name+" lived around "+old+" a game in "+year+"; Sunday’s "+now+" moved the number to a different ZIP code.",
      "Last season gave "+name+" a "+old+"-point average; Week 2 gave us "+now+" and a perfectly good reason to use the big headline.",
      "Put "+old+" next to "+name+" as the "+year+" norm; now put "+now+" next to Week 2 and try pretending nothing changed.",
      name+" carried a "+old+" average out of last season; "+now+" this week is the kind of jump that makes the desk phone start ringing.",
      "The old number for "+name+" was "+old+" per game in "+year+"; Week 2 screamed "+now+" and made the old number look shy.",
      name+" spent "+year+" at "+old+" a game; the "+now+" that followed in Week 2 is how a performance steals tomorrow’s back page."
    ]:[
      name+" averaged "+old+" last season; "+now+" in Week 2 is the kind of drop that gets booed before breakfast.",
      "The "+year+" baseline for "+name+" was "+old+"; Week 2 showed up at "+now+" and somebody immediately reached for the complaint box.",
      name+" lived around "+old+" a game in "+year+"; Sunday’s "+now+" moved the number to the wrong neighborhood.",
      "Last season gave "+name+" a "+old+"-point average; Week 2 gave us "+now+" and an excellent reason to ask where the rest went.",
      "Put "+old+" next to "+name+" as the "+year+" norm; now put "+now+" beside Week 2 and tell me the missing points are not loud.",
      name+" carried a "+old+" average out of last season; "+now+" this week is the kind of dip that makes the desk phone start ringing.",
      "The old number for "+name+" was "+old+" per game in "+year+"; Week 2 muttered "+now+" and left everybody else to do the yelling.",
      name+" spent "+year+" at "+old+" a game; the "+now+" that followed in Week 2 is how a performance volunteers for Monday criticism."
    ],
    "nora-voss":up?[
      "Rivals knew "+name+" as roughly a "+old+"-point player last season; Week 2 dropped "+now+" on the table and ruined the easy joke.",
      name+" averaged "+old+" in "+year+"; after "+now+" this week, rival managers may need a different script.",
      "The "+year+" number on "+name+" was "+old+" per game; Week 2 answered with "+now+", which is rude to anyone who had already written the punch line.",
      name+" spent last season around "+old+"; a "+now+"-point Week 2 made the usual rival heckling look badly under-researched.",
      "A "+old+" average followed "+name+" out of "+year+"; Sunday’s "+now+" forced rivals to delete at least one prewritten insult.",
      name+" carried a "+year+" baseline of "+old+" into this season; "+now+" this week made that old target considerably harder to mock.",
      "Last season gave rivals a "+old+"-point expectation for "+name+"; Week 2 gave them "+now+" and an inconvenient shortage of material.",
      "The old rival shorthand for "+name+" was "+old+" a game in "+year+"; "+now+" this Sunday spoiled the shorthand."
    ]:[
      "Rivals knew "+name+" as roughly a "+old+"-point player last season; Week 2 coughed up "+now+", so the heckling has a receipt.",
      name+" averaged "+old+" in "+year+"; a "+now+"-point Week 2 is exactly the sort of drop rival managers refuse to forget.",
      "The "+year+" number on "+name+" was "+old+" per game; Week 2 answered with "+now+", and rivals did not have to invent the joke.",
      name+" spent last season around "+old+"; a "+now+"-point Week 2 handed the rival section material with the tags still on it.",
      "A "+old+" average followed "+name+" out of "+year+"; Sunday’s "+now+" made the old standard an annoyingly convenient comparison.",
      name+" carried a "+year+" baseline of "+old+" into this season; "+now+" this week gave every rival manager the same smug screenshot.",
      "Last season gave rivals a "+old+"-point expectation for "+name+"; Week 2 gave them "+now+" and far too much confidence.",
      "The old rival shorthand for "+name+" was "+old+" a game in "+year+"; "+now+" this Sunday made the shorthand look generous."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}



const w2PlayerStatusVariantsUsed=new Map();
function w2PlayerStatusVariant(t,r,status,count){
  const rid=String(r?.id||"walter-mercer"),key=rid+"|"+status,used=w2PlayerStatusVariantsUsed.get(key)||new Set(),
    base=w2Hash(String(t?.team_name||"")+"|"+String(status)+"|"+rid+"|status")%count;
  let pick=base;
  for(let step=0;step<count;step++){const candidate=(base+step)%count;if(!used.has(candidate)){pick=candidate;break}}
  used.add(pick);w2PlayerStatusVariantsUsed.set(key,used);return pick
}

function w2PlayerStatusProfile(p,slot=0,pp=null){
  const pts=Number(p?.points),week1=Number(pp?.points),prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0,
    seasonAvg=Number(p?.season_avg),age=Number(p?.age),years=Number(p?.years_exp),
    pos=String(p?.position||"").toUpperCase(),role=Number(slot)||0,
    snaps=p?.current_snap_count==null?null:Number(p.current_snap_count),priorSnapPg=p?.prior_season_snaps_per_game==null?null:Number(p.prior_season_snaps_per_game),
    snapPct=p?.current_snap_pct==null?null:Number(p.current_snap_pct),
    defensive=/^(DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT|EDGE|IDP)$/.test(pos),
    starThreshold=pos==="QB"?18:pos==="RB"?14:pos==="WR"?14:pos==="TE"?11:defensive?11:13,
    rookie=(Number.isFinite(years)&&years===0)||(games===0&&Number.isFinite(age)&&age<=23),
    young=(Number.isFinite(age)&&age<=25)||(Number.isFinite(years)&&years<=2),
    earlyCareer=(Number.isFinite(years)&&years<=2)||(Number.isFinite(age)&&age<=24&&(!Number.isFinite(years)||years<=3)),
    veteran=(Number.isFinite(years)&&years>=5)||(Number.isFinite(age)&&age>=28),
    hasTwoWeeks=Number.isFinite(pts)&&Number.isFinite(week1),
    established=Number.isFinite(prior)&&games>=8&&(prior>=starThreshold*1.2||(prior>=starThreshold&&(!Number.isFinite(years)||years>=1))),
    roleLift=(Number.isFinite(snapPct)&&snapPct>=0.55)||
      (Number.isFinite(snaps)&&Number.isFinite(priorSnapPg)&&priorSnapPg>0&&snaps>=Math.max(20,priorSnapPg*1.1))||
      (Number.isFinite(snaps)&&snaps>=(defensive?32:35)),
    twoWeekRise=hasTwoWeeks&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&
      seasonAvg>=Math.max(prior*1.25,prior+2,starThreshold*.75)&&
      Math.min(pts,week1)>=Math.max(prior*.8,starThreshold*.5),
    strongTwoWeekRise=hasTwoWeeks&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&
      seasonAvg>=Math.max(prior*1.4,prior+3,starThreshold*.9)&&
      Math.min(pts,week1)>=Math.max(prior*.9,starThreshold*.6),
    twoWeekDrop=hasTwoWeeks&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&
      seasonAvg<=prior*.75&&Math.max(pts,week1)<=prior*.85,
    steady=hasTwoWeeks&&games>=8&&Number.isFinite(seasonAvg)&&Number.isFinite(prior)&&prior>0&&
      Math.abs(seasonAvg-prior)<=Math.max(1.5,prior*.18)&&
      Math.min(pts,week1)>=prior*.6&&Math.max(pts,week1)<=prior*1.4,
    developmentalBreakout=earlyCareer&&games>=6&&Number.isFinite(prior)&&prior>0&&prior<starThreshold*1.4&&strongTwoWeekRise&&roleLift;
  let status="";
  if(!Number.isFinite(pts))return{status:"",starThreshold,rookie,young,earlyCareer,veteran,established,roleLift,hasTwoWeeks,twoWeekRise,strongTwoWeekRise,twoWeekDrop,steady,developmentalBreakout};
  if(developmentalBreakout)status="breakout";
  else if(established&&veteran&&twoWeekDrop)status="declining-veteran";
  else if(established&&twoWeekDrop)status="struggling-star";
  else if(established)status="established-star";
  else if(!established&&young&&games>=6&&strongTwoWeekRise&&roleLift)status="breakout";
  else if(!established&&(young||earlyCareer)&&games>=6&&twoWeekRise)status="emerging";
  else if(veteran&&twoWeekDrop)status="declining-veteran";
  else if(games>=6&&Number.isFinite(prior)&&prior>=Math.max(7,starThreshold*.65)&&twoWeekDrop)status="struggling";
  else if(steady)status=veteran?"reliable-veteran":"reliable";
  else if(role===0&&pts>=starThreshold*1.6)status="star-level";
  else if(rookie&&hasTwoWeeks&&roleLift)status="rookie";
  else if(young&&hasTwoWeeks&&roleLift)status="young-player";
  else if(veteran&&pts>=Math.max(5,starThreshold*.5))status="veteran";
  const lift=Number.isFinite(seasonAvg)&&Number.isFinite(prior)?seasonAvg-prior:null,
    breakoutScore=(status==="breakout"?100:status==="emerging"?60:0)+(young?18:0)+(roleLift?18:0)+(Number.isFinite(lift)?Math.max(0,lift):0);
  return{status,starThreshold,rookie,young,earlyCareer,veteran,established,roleLift,hasTwoWeeks,twoWeekRise,strongTwoWeekRise,twoWeekDrop,steady,developmentalBreakout,breakoutScore,age,years,snaps,priorSnapPg,snapPct,seasonAvg,prior,week1,pts};
}
function w2PlayerNameParts(p){
  const full=String(p?.name||"this player").trim(),bits=full.split(/\s+/).filter(Boolean);
  return{full,first:bits[0]||full,last:bits.length>1?bits.at(-1):full}
}
function w2PlayerPositionNoun(p){
  const pos=String(p?.position||"").toUpperCase();
  return({QB:"quarterback",RB:"back",FB:"back",WR:"receiver",TE:"tight end",DL:"lineman",DE:"edge rusher",DT:"tackle",LB:"linebacker",ILB:"linebacker",OLB:"linebacker",EDGE:"edge rusher",DB:"defender",CB:"corner",S:"safety",FS:"safety",SS:"safety",IDP:"defender"})[pos]||"player"
}
function w2ShortPlayerName(t,r,p,seed=""){
  const n=w2PlayerNameParts(p),choices=[n.last,n.first].filter((x,i,a)=>x&&a.indexOf(x)===i);
  return choices[w2Hash(String(t?.team_name||"")+"|"+String(r?.id||"")+"|"+String(p?.id||n.full)+"|"+seed)%choices.length]||n.full
}
function w2PlayerCategoryReference(p,profile){
  const noun=w2PlayerPositionNoun(p),status=String(profile?.status||"");
  return status==="breakout"?"the breakout "+noun:
    status==="emerging"?"the emerging "+noun:
    status==="established-star"?"the star "+noun:
    status==="struggling-star"?"the struggling star":
    status==="reliable-veteran"?"the reliable veteran "+noun:
    status==="declining-veteran"?"the struggling veteran "+noun:
    status==="veteran"?"the veteran "+noun:
    status==="rookie"?"the rookie "+noun:
    status==="young-player"?"the young "+noun:
    status==="reliable"?"the reliable "+noun:
    status==="star-level"?"the high-end "+noun:""
}
function w2PlayerReference(t,r,p,profile,slot=0){
  const n=w2PlayerNameParts(p),short=w2ShortPlayerName(t,r,p,"ref-"+slot),descriptive=w2PlayerCategoryReference(p,profile),
    choices=[short,n.first!==short?n.first:"",n.last!==short?n.last:"",descriptive].filter((x,i,a)=>x&&a.indexOf(x)===i);
  return choices[w2Hash(String(t?.team_name||"")+"|"+String(r?.id||"")+"|"+String(p?.id||n.full)+"|reference|"+slot)%choices.length]||n.full
}
function w2BreakoutContext(p,profile,ref=""){
  if(!profile||profile.status!=="breakout"||!profile.hasTwoWeeks)return"";
  const clauses=[];
  if(Number.isFinite(profile.age)&&profile.age<=25)clauses.push("only "+Math.round(profile.age));
  else if(Number.isFinite(profile.years)&&profile.years<=2)clauses.push("still early in his NFL career");
  const snapShare=Number.isFinite(profile.snapPct)&&profile.snapPct>0?Math.round(profile.snapPct*100):null,
    snapCount=Number.isFinite(profile.snaps)?Math.round(profile.snaps):null;
  if(snapCount!=null&&Number.isFinite(profile.priorSnapPg)&&profile.priorSnapPg>0&&profile.snaps>=profile.priorSnapPg*1.1){
    clauses.push("his Week 2 role was "+snapCount+" snaps"+(snapShare!=null?" ("+snapShare+"% of the team’s unit snaps)":"")+", up from "+profile.priorSnapPg.toFixed(1)+" snaps per game last season");
  }else if(snapCount!=null&&profile.roleLift){
    clauses.push("the current opportunity is already substantial at "+snapCount+" snaps"+(snapShare!=null?" ("+snapShare+"% of the team’s unit snaps)":""));
  }
  if(Number.isFinite(profile.seasonAvg)&&Number.isFinite(profile.prior)&&profile.prior>0){
    clauses.push("his two-week average is "+w2One(profile.seasonAvg)+" fantasy points after "+w2One(profile.prior)+" per game last season");
  }
  if(!clauses.length)return"";
  const first=clauses.shift();
  return (ref||p.name)+" is "+first+(clauses.length?", "+w2Natural(clauses):"")+"."
}
function w2PlayerTrajectoryContext(t,r,p,pp,slot=0,ref=""){
  const profile=w2PlayerStatusProfile(p,slot,pp),status=profile.status,
    trendStatuses=new Set(["breakout","emerging","declining-veteran","struggling-star","struggling"]);
  if(!profile.hasTwoWeeks||!trendStatuses.has(status)||!Number.isFinite(profile.seasonAvg)||!Number.isFinite(profile.prior)||profile.prior<=0)return"";
  const who=ref||w2PlayerReference(t,r,p,profile,slot),avg=w2One(profile.seasonAvg),prior=w2One(profile.prior),
    rid=String(r?.id||"walter-mercer"),v=w2Hash(String(t?.team_name||"")+"|"+String(p?.id||p?.name)+"|trajectory|"+rid)%4;
  if(status==="breakout"||status==="emerging"){
    const rows={
      "walter-mercer":[
        "Two Sundays now have "+who+" at "+avg+" per game after "+prior+" last season, enough evidence to treat the early jump as more than one hot box score.",
        who+" is averaging "+avg+" through two weeks after "+prior+" last year; paired with the larger opportunity, the rise has earned another week of serious attention.",
        "The two-week number is "+avg+" for "+who+" versus "+prior+" last season, which gives the early role growth something sturdier than one Sunday underneath it.",
        "At "+avg+" per game across both weeks after "+prior+" last year, "+who+" has moved beyond the one-game-flier stage without pretending the season is settled."
      ],
      "tess-delaney":[
        "Two Sundays at "+avg+" per game after "+prior+" last season give "+who+" enough substance that the larger role no longer looks like decorative optimism.",
        who+" has served "+avg+" per game across two weeks after "+prior+" last year, and the extra opportunity is beginning to look like part of the arrangement.",
        "The early table has "+who+" at "+avg+" a game versus "+prior+" last season; two servings make the rise worth noticing without ordering a coronation.",
        "Across both weeks, "+who+" is at "+avg+" after "+prior+" last year, which is enough runway to treat the bigger role as something more than one flashy course."
      ],
      "mack-hollis":[
        who+" has averaged "+avg+" over the recent two games, against "+prior+" last season. That is a change worth tracking.",
        who+" is sitting at "+avg+" through two games after "+prior+" last year; with the workload up too, the early surge has real voltage behind it.",
        "The two-week average is "+avg+" for "+who+" versus "+prior+" last season, enough repeated noise to stop treating the jump like one lucky blast.",
        "Both Sundays have pushed "+who+" to "+avg+" per game after "+prior+" last year, which makes the larger role worth tracking instead of screaming about one box score."
      ],
      "nora-voss":[
        "Two weeks at "+avg+" per game after "+prior+" last season give "+who+" a rise rivals actually have to account for, not one inconvenient screenshot.",
        who+" is averaging "+avg+" through two Sundays after "+prior+" last year; that is enough repetition to make the larger role harder to laugh off.",
        "The early average sits at "+avg+" for "+who+" versus "+prior+" last season, so rivals now need more than 'one good game' if they want to dismiss the change.",
        "Across both weeks, "+who+" has reached "+avg+" per game after "+prior+" last year, which is annoyingly real enough to keep on the radar."
      ]
    };
    return (rows[rid]||rows["walter-mercer"])[v]
  }
  const rows={
    "walter-mercer":[
      who+" is at "+avg+" per game through two weeks after "+prior+" last season, so the slow start has enough repetition to monitor without pretending the résumé disappeared.",
      "Two quiet Sundays have pulled "+who+" to "+avg+" per game from a "+prior+" baseline; that turns the concern into a trend worth checking again next week.",
      "The two-week average is "+avg+" for "+who+" after "+prior+" last year. One bad Sunday is noise; two in the same direction deserve a note.",
      who+" has opened at "+avg+" per game across both weeks after "+prior+" last season, enough of a repeated drop to make Week 3 matter."
    ],
    "tess-delaney":[
      "Two weeks at "+avg+" per game after "+prior+" last season leave "+who+" with a smaller early serving than the old table expected.",
      who+" has managed "+avg+" per game across both Sundays after "+prior+" last year; the smaller portion has repeated often enough to notice.",
      "The early table has "+who+" at "+avg+" a game versus "+prior+" last season. One thin course is manners; two starts to look like a pattern.",
      "Across both weeks, "+who+" sits at "+avg+" after a "+prior+" baseline, enough repeated shrinkage to make the next serving matter."
    ],
    "mack-hollis":[
      "Two weeks at "+avg+" per game after "+prior+" last season have turned "+who+" from one quiet Sunday into a real early signal.",
      who+" is averaging "+avg+" across both games after "+prior+" last year; the volume has stayed low long enough to put Week 3 under the spotlight.",
      "The two-week number is "+avg+" for "+who+" versus "+prior+" last season, and repeated silence is harder to blame on one busted afternoon.",
      "Both Sundays have "+who+" at "+avg+" per game after "+prior+" last year, enough of a repeated drop to keep the alarm on low."
    ],
    "nora-voss":[
      "Two weeks at "+avg+" per game after "+prior+" last season give rivals an actual slow-start trend on "+who+", not one cherry-picked bad Sunday.",
      who+" is sitting at "+avg+" across both games after "+prior+" last year; the dip has repeated enough that supporters need a better answer than 'small sample.'",
      "The early average is "+avg+" for "+who+" versus "+prior+" last season. One bad screenshot is cheap; two in the same direction are harder to wave away.",
      "Across both Sundays, "+who+" has averaged "+avg+" after "+prior+" last year, enough of a repeated drop to make the next game matter."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2Week1DeltaRead(t,r,p,pp,role){
  const rid=String(r?.id||""),prior=w2One(pp?.points),now=w2One(p?.points),rise=Number(p?.points)>Number(pp?.points),v=w2Cohort(t)%4,
    roleNames={
      "walter-mercer":["lead score","second scorer","third scorer"],
      "tess-delaney":["centerpiece","second setting","third setting"],
      "mack-hollis":["headliner","second punch","third score"],
      "nora-voss":["top rival target","second scorer","third scorer"]
    },
    label=(roleNames[rid]||roleNames["walter-mercer"])[Math.min(2,Number(role)||0)],
    up={
      "walter-mercer":["put a brighter number on the second Sunday","scored more than in the opener","made the week-over-week jump easy to see","turned Week 2 into the louder of the two"],
      "tess-delaney":["served a fuller second Sunday","gave Week 2 a larger portion","made the week-over-week jump visible","brought more to the second setting"],
      "mack-hollis":["turned the Week 2 volume up","made the second scoreboard louder","put a bigger number on Sunday","gave Week 2 the stronger jolt"],
      "nora-voss":["gave supporters a better second screenshot","put more on the board in Week 2","forced rivals to acknowledge the bigger number","made the second Sunday harder to mock"]
    },
    down={
      "walter-mercer":["put a quieter number on the second Sunday","finished below the opener","gave Week 3 a question about whether the lower score repeats","made the week-over-week drop easy to see"],
      "tess-delaney":["served a smaller second Sunday","left Week 2 with the thinner portion","made the second setting less convincing","brought less to the table than in the opener"],
      "mack-hollis":["turned the Week 2 volume down","made the second scoreboard quieter","put a smaller number on Sunday","gave Week 3 a question instead of a verdict"],
      "nora-voss":["handed rivals an easier second screenshot","put less on the board in Week 2","gave rivals a cleaner week-over-week comparison","made the second Sunday easier to mock"]
    },
    phrase=(rise?(up[rid]||up["walter-mercer"]):(down[rid]||down["walter-mercer"]))[v];
  const rows=[
    p.name+" changed from "+prior+" in Week 1 to "+now+" in Week 2; the "+label+" "+phrase+".",
    p.name+" had "+prior+" last Sunday and "+now+" now. That "+label+" shift "+phrase+".",
    "For "+p.name+", "+prior+" became "+now+" the following week. The "+label+" "+phrase+".",
    "After a "+prior+"-point Week 1, the "+label+" reached "+now+" and "+phrase+"."
  ];
  return rows[v]
}

function w2PlayerColumnRead(t,r,p,pp,i,opp,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),foe=w2DisplayTeam(opp),pts=w2One(p.points),
    delta=pp?Number(p.points)-Number(pp.points):null,role=Math.min(2,Number(i)||0),v=w2Cohort(t)%4,
    profile=w2PlayerStatusProfile(p,role,pp),categoryRef=w2PlayerCategoryReference(p,profile),
    categoryPriority=new Set(["breakout","emerging","established-star","struggling-star","declining-veteran"]),
    useCategory=!!categoryRef&&(categoryPriority.has(profile.status)||role===0||w2Hash(String(t?.team_name||"")+"|"+String(p?.id||p?.name)+"|category-ref|"+role)%2===0),
    name=useCategory?categoryRef:w2PlayerReference(t,r,p,profile,role);
  if(Number(p?.points)<=1.5){
    const low={
      "walter-mercer":[
        name+" gave "+team+" only "+pts+" points. That is not support behind the leader; it is the lineup spot management has to solve first.",
        pts+" from "+name+" left "+team+" effectively playing a scorer short. The fair question is replacement or role, not whether to praise the ranking.",
        name+" reached "+pts+" for "+team+". A contribution that small belongs in the Week 3 correction plan, not the credit column.",
        "At "+pts+" points, "+name+" was a quiet starter for "+team+". The lineup needs a real answer there before the same hole decides a closer game."
      ],
      "tess-delaney":[
        name+" brought "+pts+" points to the "+a.mascot+" table. That is less a second course than an empty plate with excellent posture.",
        "The "+a.mascot+" received "+pts+" from "+name+". I have seen decorative napkins contribute more to an evening.",
        name+" produced "+pts+" points, which means this chair is being saved by the people seated around it. That arrangement gets expensive quickly.",
        pts+" from "+name+" is the place setting everybody politely pretends not to stare at. Week 3 is where the room either replaces it or owns it."
      ],
      "mack-hollis":[
        name+" scored "+pts+". That is not a second punch; that is somebody holding the coat while the lineup gets into a fight.",
        pts+" from "+name+" is not a live wire. It is the outlet everybody keeps smacking because nothing came on.",
        name+" gave the "+a.mascot+" "+pts+" points. Put the confetti away and find a Week 3 answer.",
        "The scoreboard got "+pts+" from "+name+". Calling that support would be an insult to support."
      ],
      "nora-voss":[
        name+" gave "+team+" "+pts+" points. Rivals do not need to invent a joke when the number arrives prewritten.",
        pts+" from "+name+" is the easiest target on the "+a.mascot+" roster, and pretending otherwise only saves rivals the trouble of pointing.",
        name+" finished at "+pts+". That is not useful support; it is exactly where the rival thread is putting the red circle.",
        "The "+a.mascot+" got "+pts+" from "+name+". If supporters want one obvious Week 3 correction, rivals have already highlighted it for them."
      ]
    };
    let out=(low[rid]||low["walter-mercer"])[(v+role)%4];
    const trajectory=w2PlayerTrajectoryContext(t,r,p,pp,role,name);
    if(trajectory)out+=" "+trajectory;
    else if(pp&&Number.isFinite(delta)&&Math.abs(delta)>=5)out+=" "+w2Week1DeltaRead(t,r,p,pp,role);
    return out.replace(/\.+$/,"")+"."
  }
  const rows={
    "walter-mercer":[
      [
        won?name+" did the heavy lifting for "+team+"; the rest of the lineup finally treated the star performance like something worth protecting.":name+" gave "+team+" a performance good enough to deserve a better result; the loss belongs farther down the lineup.",
        won?name+" supplied the anchor and let "+team+" play normal football around it.":name+" supplied the anchor, which makes the quieter starters harder to excuse.",
        won?name+" gave "+team+" a top-end answer that held up all afternoon.":name+" produced the kind of top-line score that usually keeps a team out of trouble, and the roster wasted it.",
        won?name+" set the level for "+team+" and made the rest of the winning score easier to trust.":name+" set a winning level for "+team+" even though the final result refused to cooperate."
      ],
      [
        won?name+" mattered because "+foe+" had to deal with a second real scorer instead of spending the whole day chasing the leader.":name+" gave "+team+" a legitimate second answer, so the defeat cannot be filed under 'no help.'",
        won?name+" turned the top of the lineup into a two-player problem for "+foe+".":name+" kept the loss from becoming a one-star rescue attempt; the trouble started after the first two names.",
        won?name+" was the supporting score that kept "+team+" from becoming predictable.":name+" did enough secondary work that the postgame questions belong elsewhere.",
        won?name+" gave the lineup a second dependable foothold.":name+" supplied usable support, which makes the remaining quiet slots more important than another excuse."
      ],
      [
        name+" was the third score that made the lineup feel complete rather than top-heavy.",
        name+" did not need the headline; the value was giving "+team+" another place where Sunday did not break.",
        name+" filled in the middle of the box score with exactly the kind of production winning lineups keep finding.",
        name+" gave "+team+" another usable starter instead of another problem to solve."
      ]
    ],
    "tess-delaney":[
      [
        won?name+" was the centerpiece and, for once, the rest of "+team+" remembered a centerpiece needs a table around it.":name+" brought the centerpiece to a dinner that still ended with "+team+" holding the check.",
        won?name+" gave the "+a.mascot+" the expensive-looking performance the room had been waiting for.":name+" dressed the afternoon properly; the result was the guest who ruined it.",
        won?name+" arrived as the centerpiece and left with the win to match.":name+" looked magnificent in the middle of an evening the "+a.mascot+" otherwise mishandled.",
        won?name+" gave "+team+" one performance nobody needed to explain away after the fact.":name+" was the one part of the room nobody should blame for how the evening ended."
      ],
      [
        won?name+" gave the "+a.mascot+" a second proper setting, which kept the centerpiece from looking lonely.":name+" provided respectable support; the empty chairs were elsewhere.",
        won?name+" made the table feel balanced instead of merely expensive at one end.":name+" did enough to avoid the bill for this loss.",
        won?name+" supplied the second course the lineup actually needed.":name+" brought useful support to a table with other, much louder problems.",
        won?name+" kept the winning arrangement from becoming a one-guest performance.":name+" was useful enough that the postgame seating complaints need another target."
      ],
      [
        name+" did the quiet work that keeps the table from looking unfinished.",
        name+" was not the centerpiece, but the room looked considerably cheaper without this contribution.",
        name+" gave the "+a.mascot+" a useful third setting and asked for no unnecessary applause.",
        name+" handled the supporting role cleanly enough that the room can complain somewhere else."
      ]
    ],
    "mack-hollis":[
      [
        won?name+" kicked the door in and "+team+" actually followed through it.":name+" kicked the door in and the rest of "+team+" still managed to lose the building.",
        won?name+" supplied the big number and got a win instead of a sympathy card.":name+" supplied the big number and got paid back with a loss. Somebody owes him flowers.",
        won?name+" gave the "+a.mascot+" the kind of line that makes the scoreboard start yelling first.":name+" gave the "+a.mascot+" a headline score inside a result nobody wants framed.",
        won?name+" brought the fireworks and the rest of the lineup remembered to light something too.":name+" brought the fireworks; too many teammates showed up holding wet matches."
      ],
      [
        won?name+" gave "+team+" a second punch and made "+foe+" defend more than one emergency.":name+" supplied another live wire, which means the loss belongs to the dead outlets around him.",
        won?name+" kept the scoreboard loud after the first star had already made noise.":name+" was not the problem; if anything, the score makes the silent starters look louder.",
        won?name+" turned a good top score into actual pressure.":name+" gave the "+a.mascot+" a second useful jolt and still watched the rest of the circuit fail.",
        won?name+" made sure the leader did not have to win the bar fight alone.":name+" threw a second punch; too many teammates responded by holding the coat."
      ],
      [
        name+" kept the middle of the scoreboard from going dark.",
        name+" did enough useful work that this name stays off the angry list.",
        name+" was the third reason the lineup still had a pulse after the stars.",
        name+" gave "+team+" one more working outlet on a Sunday that needed all of them."
      ]
    ],
    "nora-voss":[
      [
        won?name+" gave rivals a big number and no final score to hide behind.":name+" contributed "+w2One(Number(p.points||0))+" points for "+team+"; the final score against "+String(t.opponent_name||"the opponent")+" does not erase that work.",
        won?name+" made the top of the "+a.mascot+" lineup difficult to mock.":name+" gave "+team+" one performance rivals have to skip past on the way to the joke.",
        won?name+" supplied the kind of line that makes the rival complaint department change subjects.":name+" did enough individually that the rival joke has to start somewhere else.",
        won?name+" put up the number that forces rivals to argue about somebody else.":name+" gave supporters one clean rebuttal even though the scoreboard gave rivals the last word."
      ],
      [
        won?name+" gave "+team+" a second reason rival managers had to keep quiet for a few hours.":name+" removed the easy 'no help' excuse from the "+team+" loss.",
        won?name+" made the lineup harder to dismiss because the second answer was real.":name+" supplied enough help that rivals have to attack deeper than the first two names.",
        won?name+" kept the leader from becoming a one-player magic trick.":name+" did enough support work to make the quieter starters fair game.",
        won?name+" gave the "+a.mascot+" another score worth respecting.":name+" kept the loss from becoming a simple story about one star being abandoned."
      ],
      [
        name+" was useful enough that rival managers need to keep scrolling for an easier target.",
        name+" did the kind of quiet damage that ruins a lazy rival punch line.",
        name+" gave "+team+" another respectable name in a lineup that still had softer places to attack.",
        name+" contributed enough that the rival jokes belong somewhere else."
      ]
    ]
  };
  let out=(rows[rid]||rows["walter-mercer"])[role][v];
  const trajectory=w2PlayerTrajectoryContext(t,r,p,pp,role,name);
  if(trajectory)out+=" "+trajectory;
  else{
    if(pp&&Number.isFinite(delta)&&Math.abs(delta)>=5)out+=" "+w2Week1DeltaRead(t,r,p,pp,role);
    const history=w2HistoricalColor(p,r,t,role,w2ShortPlayerName(t,r,p,"history-"+role));if(history)out+=" "+history;
  }
  return out.replace(/\.+$/,"")+"."
}
function w2WeakSpotRead(t,r,weak,won,margin){
  if(!weak)return "The bottom of the lineup was not distinct enough to single out without inventing a villain.";
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),pts=Number(weak.points)||0,score=w2One(pts),
    stat=weak.real_stat_line?"; "+w2Stat(weak):"",nearZero=pts<=1.5,tight=margin<=6,v=w2Hash(team+"|weak|"+weak.name+"|"+rid)%4;
  const rows={
    "walter-mercer":[
      weak.name+" finished at "+score+" for "+team+stat+"; "+(nearZero?"that is the sort of line that has a manager opening waivers before the coffee cools.":tight?"in a close game, an ordinary Sunday from that slot could have changed the postgame conversation.":won?"the win gives management time to ask for more without overreacting.":"the loss had other causes, but this is the cleanest correction on the page."),
      team+" got only "+score+" from "+weak.name+stat+"; "+(nearZero?"the number is small enough that pretending not to notice would be more dramatic than criticizing it.":won?"the result survived it, which is different from approving it.":tight?"a margin this narrow makes the quiet score matter more than it usually would.":"the defeat was broader than one starter, but this starter still has homework."),
      weak.name+" is the starter "+team+" will want back above "+score+" next week"+stat+"; "+(won?"there is no emergency because the standings point is already banked.":tight?"the loss was close enough to make that request feel urgent.":"the loss was not caused by one name, but this is where a practical improvement can begin."),
      "The quiet end of "+team+" belonged to "+weak.name+" at "+score+stat+"; "+(nearZero?"a near-empty line like that is a roster question, not background scenery.":won?"victory keeps the question from becoming a crisis.":"defeat means the question follows management into Week 3.")
    ],
    "tess-delaney":[
      weak.name+" gave the "+a.mascot+" "+score+" points"+stat+"; "+(nearZero?"that is less a quiet dinner guest than someone who checked the coat and went home.":won?"the plate was modest, but victory is a forgiving host.":tight?"in a loss this close, even the bread course gets audited.":"the table had bigger problems, though this setting hardly improved the room."),
      "The "+a.mascot+" received "+score+" from "+weak.name+stat+"; "+(nearZero?"I have seen decorative napkins contribute more atmosphere.":won?"we can tease the setting because the check was paid with a win.":tight?"one more useful bite there might have changed the evening.":"the loss was a full-table affair, but this chair remains conspicuously bare."),
      weak.name+" brought "+score+" to the "+team+" table"+stat+"; "+(won?"the win turns that into an etiquette note instead of a scandal.":nearZero?"that is an RSVP without an arrival.":tight?"a close loss makes the missing course feel especially expensive.":"the room did not collapse because of one plate, yet nobody should call this one satisfying."),
      "At "+score+" points, "+weak.name+" was the least convincing place setting for "+team+stat+"; "+(won?"fortunately, the centerpiece covered the blemish.":tight?"unfortunately, the final margin was small enough to make every crumb count.":"the defeat had several stains, and this was simply the easiest one to see.")
    ],
    "mack-hollis":[
      weak.name+" posted "+score+" for the "+a.mascot+stat+"; "+(nearZero?"that is not a quiet line, that is a cameo with no dialogue.":won?"winning keeps the siren off, but somebody still needs to check that outlet.":tight?"lose this close and "+score+" starts flashing like a warning light.":"the loss was bigger than one starter, but this number still gets angry font."),
      "The "+a.mascot+" got "+score+" from "+weak.name+stat+"; "+(nearZero?"the scoreboard practically had to file a missing-person report.":won?"the win saves this from becoming the lead story.":tight?"the margin was too small for that score to hide anywhere.":"nobody gets sole blame, but nobody gets to call that useful either."),
      weak.name+" handed "+team+" "+score+" points"+stat+"; "+(won?"the rest of the lineup covered the tab.":nearZero?"that is the fantasy equivalent of showing up, waving, and leaving.":tight?"one normal contribution there would have made Monday much quieter.":"the team lost in several places, and this was one of the loudest silent ones."),
      score+" points from "+weak.name+" left the "+a.mascot+" asking for more"+stat+"; "+(won?"fine—ask politely while holding the win.":tight?"after a close loss, politeness has already left the building.":nearZero?"that number barely made it through the door.":"the correction is obvious even if the whole loss is not.")
    ],
    "nora-voss":[
      weak.name+" left "+team+" with "+score+" points"+stat+"; "+(nearZero?"rivals did not need to write the joke because Sunday delivered it preassembled.":won?"the win takes enough oxygen out of the heckling to keep this minor.":tight?"the margin makes the heckling irritatingly relevant.":"the loss was bigger than one player, but rival managers are not known for nuance."),
      "Rivals are going to circle "+weak.name+" at "+score+" for "+team+stat+"; "+(nearZero?"the circle may need more ink than the number.":won?"they can circle all they want because the win still counts.":tight?"this is one of those annoying weeks where the heckler also has arithmetic.":"it is not the whole problem with the lineup, merely the easiest target."),
      weak.name+" produced "+score+" for the "+a.mascot+stat+"; "+(won?"rivals can laugh, but they still have to write the final score underneath it.":nearZero?"that number arrived gift-wrapped for anyone already rooting against this roster.":tight?"a close loss turns easy mockery into a legitimate lineup question.":"the roster has larger problems, but none with a cleaner punch line."),
      team+" got its softest Week 2 number from "+weak.name+" at "+score+stat+"; "+(won?"the standings point prevents a full roast.":tight?"the tiny margin gives rivals permission to be insufferably specific.":nearZero?"the number practically heckles itself.":"the loss does not belong to one starter, though this one supplied the easiest material.")
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2RecapHook(g,wName,lName,i){
  const v=(Number(i)||0)%4,score=w2One(g.winner.points)+"–"+w2One(g.loser.points);
  if(g.combined>=240)return[
    wName+" and "+lName+" spent Week 2 playing fantasy football with the volume knob snapped off. "+wName+" escaped "+score+", and every IDP manager who thought one quiet tackle total would be harmless learned otherwise.",
    "The scoreboard between "+wName+" and "+lName+" needed a second cup of coffee. "+wName+" won "+score+", which is less a normal matchup than two lineups throwing furniture at each other.",
    wName+" beat "+lName+" "+score+" in the kind of shootout that turns a comfortable lead into a rumor every five minutes.",
    "Nobody brought a brake pedal to "+wName+" versus "+lName+". The final was "+score+" for "+wName+", and "+w2One(g.loser.points)+" points somehow became the losing side of the story."
  ][v];
  if(g.upset&&g.margin<=6)return[
    wName+" walked into Week 2 as the underdog and left with "+lName+"’s lunch money, "+score+". A "+w2One(g.margin)+"-point escape is exactly how a favorite spends Monday muttering.",
    lName+" brought the favorite’s badge; "+wName+" brought the better Sunday. The upset landed "+score+" and the margin was only "+w2One(g.margin)+".",
    "This was supposed to tilt toward "+lName+". Instead, "+wName+" stole it "+score+" and left only "+w2One(g.margin)+" points between confidence and embarrassment.",
    wName+" treated the projection like junk mail and beat "+lName+" "+score+". With only "+w2One(g.margin)+" points between them, every lineup choice now has an alibi to prepare."
  ][v];
  if(g.upset)return[
    wName+" took the favorite label off "+lName+" and stuck it under the table, winning "+score+".",
    lName+" arrived with the safer forecast and left with a "+score+" loss to "+wName+". Somebody is deleting a screenshot.",
    wName+" made the pregame favorite look like a bad forecast, beating "+lName+" "+score+".",
    "The upset belonged to "+wName+", "+score+" over "+lName+". The favorite had the expectation; the underdog had the useful Sunday."
  ][v];
  if(g.margin>=25)return[
    wName+" did not beat "+lName+" so much as repossess the matchup, "+score+". By the end, the comeback plan was mostly decorative.",
    "The final says "+score+" for "+wName+" over "+lName+". The polite word is blowout; the impolite words are probably in the league chat.",
    wName+" buried "+lName+" "+score+" and spent the fourth quarter of the fantasy day watching the margin become a personality trait.",
    lName+" needed a rescue operation and got a "+score+" loss instead. "+wName+" owned this one early and kept the deed."
  ][v];
  if(g.margin<=6)return[
    wName+" and "+lName+" turned Week 2 into a knife fight with calculators. "+wName+" escaped "+score+", and nobody gets to pretend the last lineup slot was background decoration.",
    "The final was "+score+" for "+wName+" over "+lName+", a game close enough to make one bench decision feel like a personal attack.",
    wName+" beat "+lName+" "+score+" with only "+w2One(g.margin)+" points of oxygen left in the room.",
    "If anybody in "+wName+"–"+lName+" slept comfortably, they were not watching the fantasy scoreboard. "+wName+" survived "+score+"."
  ][v];
  return[
    wName+" beat "+lName+" "+score+" and made the middle of the lineup do enough work that no single miracle had to carry the paper.",
    "The final went "+score+" to "+wName+". Not a miracle, not a massacre—just more useful Sunday football than "+lName+" could answer.",
    wName+" handled "+lName+" "+score+" by stacking enough good scores that the opponent never found one clean place to attack.",
    "Week 2 gave "+wName+" a "+score+" win over "+lName+". The interesting part was who kept showing up after the stars."
  ][v]
}
function w2NextWeekGames(teams){
  const by=new Map((teams||[]).map(t=>[String(t.roster_id),t])),seen=new Set(),out=[];
  for(const t of teams||[]){
    const oid=String(t?.next_opponent_roster_id||""),o=by.get(oid);
    if(!oid||!o)continue;
    const k=[String(t.roster_id),oid].sort().join("|");
    if(seen.has(k))continue;seen.add(k);
    // Only accept reciprocal pairings. If the packet is inconsistent, omit the
    // game rather than manufacturing a matchup from one-sided data.
    if(String(o?.next_opponent_roster_id||"")!==String(t.roster_id))continue;
    const aProj=Number(t.next_projected),bProj=Number(o.next_projected);
    out.push({a:t,b:o,gap:Number.isFinite(aProj)&&Number.isFinite(bProj)?Math.abs(aProj-bProj):null})
  }
  return out
}

function w2RecapStatLead(g,i){
  const rows=g.combined>=240?["The arson report starts with: ","The people responsible for all that smoke: ","Three names kept the scoreboard overheated: ","The loudest stat lines in the room: "]:
    g.upset?["The upset had accomplices: ","Circle these names before blaming the projection: ","The names who actually bent Sunday: ","Start the upset autopsy here: "]:
    g.margin>=25?["The damage report starts with: ","The blowout had fingerprints everywhere: ","Three names explain why this got ugly: ","The box score’s loudest witnesses: "]:
    g.margin<=6?["The margin was tiny; these names were not: ","If you are replaying the close one, start here: ","The people who made every point feel expensive: ","Three stat lines kept this thing on a wire: "]:
    ["The names worth circling: ","The box score’s main characters: ","Three lines that moved the afternoon: ","Start with the players who made the score make sense: "];
  return rows[w2Hash(String(i)+"|"+g.winner.team_name+"|statlead")%rows.length]
}
function w2RecapBenchTurn(l,g,miss){
  const lName=w2DisplayTeam(l.team_name),gap=Number(miss?.gap)||0,margin=Number(g.margin)||0;
  if(gap>=margin)return miss.reserve.name+" outscored "+miss.starter.name+" by "+w2One(gap)+". "+lName+" lost by "+w2One(margin)+". Somewhere, that lineup card is spending Tuesday avoiding eye contact with everyone.";
  return miss.reserve.name+" outscored "+miss.starter.name+" by "+w2One(gap)+". It would not have stolen the win for "+lName+", but it would have made the last stretch a lot less comfortable and the postgame meeting a lot less quiet.";
}
function w2RecapUpsetTurn(w,l,wStar,lWeak){
  const wName=w2DisplayTeam(w.team_name),lName=w2DisplayTeam(l.team_name);
  if(lWeak&&Number(lWeak.points)<6)return(wStar?wStar.name+" gave "+wName+" "+w2One(wStar.points)+" at the top. ":"")+lWeak.name+" answered with "+w2One(lWeak.points)+" for "+lName+(lWeak.real_stat_line?"; "+w2Stat(lWeak):"")+". That is not the whole loss, but it is the first quiet starter a favorite has to explain after losing.";
  return(wStar?wStar.name+" gave "+wName+" "+w2One(wStar.points)+" and made the upset possible. ":"")+lName+" kept waiting for the safer-looking lineup to become the better one. Sunday never signed that agreement.";
}
function w2RecapUpsetColumn(w,l,lStar){
  const wName=w2DisplayTeam(w.team_name),lName=w2DisplayTeam(l.team_name);
  if(lStar&&Number(lStar.points)>=20)return lStar.name+" gave "+lName+" "+w2One(lStar.points)+" and still watched the favorite lose. The star did the job; the supporting cast left the favorite badge sitting on the curb, and "+wName+" was happy to pick it up.";
  return lName+" came in with the expectation and left with "+w2One(l.points)+" points. "+wName+" did not need mythology; it needed the favorite to keep producing ordinary answers while the underdog found one or two good ones.";
}
function w2DivisionBoardTake(flags,reporter,subject){
  const rid=String(reporter?.id||"");
  const intro={
    "walter-mercer":"Two weeks have put shape around eight different races. Some leaders have company, some have a one-game cushion that barely qualifies as personal space, and a few MIDA numbers are already arguing with the standings.",
    "tess-delaney":"Eight divisions have finally stopped looking like the same empty ballroom. Some tables have one clear host, some have three people reaching for the same chair, and the MIDA place cards are not always honoring the current seating chart.",
    "mack-hollis":"The eight division races already look different: clean starts, crowded pileups, one-game cushions pretending to be real estate and a few probability models heckling the standings.",
    "nora-voss":"The division races have developed enough personality to become properly annoying. A few leaders own real leverage; a few are renting first place by the week; and MIDA has already given rival managers numbers to throw at one another."
  }[rid]||"Eight divisions have eight different problems now, which is a welcome improvement over pretending every early leader owns the same kind of advantage.";
  const line=y=>{
    const rows=(y.rows||[]).slice(),leaders=y.leaders||[],leaderIds=new Set(leaders.map(t=>String(t.roster_id))),
      leaderNames=w2Natural(leaders.map(t=>w2DisplayTeam(t.team_name))),chasers=rows.filter(t=>!leaderIds.has(String(t.roster_id))),
      closest=chasers[0]||null,nextChaser=chasers[1]||null,
      closestName=closest?w2DisplayTeam(closest.team_name):"nobody",closestRec=closest?w2Record(closest):"n/a",
      nextName=nextChaser?w2DisplayTeam(nextChaser.team_name):null,nextRec=nextChaser?w2Record(nextChaser):null,
      midaRows=rows.filter(t=>Number.isFinite(Number(t?.mida_outlook?.division))&&Number(t.mida_outlook.division)>0).slice().sort((a,b)=>Number(b.mida_outlook.division)-Number(a.mida_outlook.division)),
      midaFav=midaRows[0]||null,midaPct=midaFav?w2MidaPositivePct(midaFav.mida_outlook.division):null,
      titleRows=rows.filter(t=>Number.isFinite(Number(t?.mida_outlook?.title))&&Number(t.mida_outlook.title)>0).slice().sort((a,b)=>Number(b.mida_outlook.title)-Number(a.mida_outlook.title)),
      titleFav=titleRows[0]||null,titlePct=titleFav?w2MidaPositivePct(titleFav.mida_outlook.title):null,
      leadOne=leaders.length===1?w2DisplayTeam(leaders[0].team_name):null,
      leadSubject=leadOne||leaderNames,
      leadVerb=(singular,plural)=>leadOne?w2TeamVerb(leadOne,singular,plural):plural,
      divKey=String(y.d).toUpperCase(),
      midaPhrases={
        "AFC EAST":midaFav&&midaPct?(" The probability sheet prefers "+w2DisplayTeam(midaFav.team_name)+" at "+midaPct+" for the division."):"",
        "AFC NORTH":midaFav&&midaPct?(" MIDA puts "+w2DisplayTeam(midaFav.team_name)+" highest here at "+midaPct+", so the tied record does not make the longer view perfectly even."):"",
        "AFC SOUTH":midaFav&&midaPct?(" The strongest MIDA division chance belongs to "+w2DisplayTeam(midaFav.team_name)+" at "+midaPct+"."):"",
        "AFC WEST":midaFav&&midaPct?(" The forecast still likes "+w2DisplayTeam(midaFav.team_name)+" most at "+midaPct+" to take the division."):"",
        "NFC EAST":midaFav&&midaPct?(" "+w2DisplayTeam(midaFav.team_name)+" "+w2TeamVerb(midaFav.team_name,"leads","lead")+" the MIDA division outlook at "+midaPct+"."):"",
        "NFC NORTH":midaFav&&midaPct?(" The standings are level, but MIDA is not: "+w2DisplayTeam(midaFav.team_name)+" "+w2TeamVerb(midaFav.team_name,"sits","sit")+" highest at "+midaPct+"."):"",
        "NFC SOUTH":midaFav&&midaPct?(" MIDA’s current favorite is "+w2DisplayTeam(midaFav.team_name)+" at "+midaPct+"."):"",
        "NFC WEST":midaFav&&midaPct?(" "+w2DisplayTeam(midaFav.team_name)+" "+w2TeamVerb(midaFav.team_name,"owns","own")+" the best MIDA division number at "+midaPct+"."):""
      },
      titlePhrases={
        "AFC EAST":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" "+w2DisplayTeam(titleFav.team_name)+" also "+w2TeamVerb(titleFav.team_name,"carries","carry")+" a "+titlePct+" title outlook, so the race reaches beyond local bragging rights."):"",
        "AFC NORTH":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" The best championship number in the division belongs to "+w2DisplayTeam(titleFav.team_name)+" at "+titlePct+"."):"",
        "AFC SOUTH":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" "+w2DisplayTeam(titleFav.team_name)+" "+w2TeamVerb(titleFav.team_name,"is","are")+" also the division’s strongest title bet at "+titlePct+"."):"",
        "AFC WEST":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" The championship board gives "+w2DisplayTeam(titleFav.team_name)+" the best local number at "+titlePct+"."):"",
        "NFC EAST":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" For the bigger prize, "+w2DisplayTeam(titleFav.team_name)+" "+w2TeamVerb(titleFav.team_name,"has","have")+" the top title outlook here at "+titlePct+"."):"",
        "NFC NORTH":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" "+w2DisplayTeam(titleFav.team_name)+" "+w2TeamVerb(titleFav.team_name,"carries","carry")+" the strongest championship probability at "+titlePct+"."):"",
        "NFC SOUTH":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" The title model’s favorite from this group is "+w2DisplayTeam(titleFav.team_name)+" at "+titlePct+"."):"",
        "NFC WEST":titleFav&&titlePct&&Number(titleFav.mida_outlook.title)>=10?(" "+w2DisplayTeam(titleFav.team_name)+" also "+w2TeamVerb(titleFav.team_name,"has","have")+" the division’s best title number at "+titlePct+"."):""
      },
      midaNote=midaPhrases[divKey]||"",titleNote=titlePhrases[divKey]||"",
      chasePair=closest?(closestName+" ("+closestRec+")"+(nextName?" and "+nextName+" ("+nextRec+")":"")):"the field",
      chasePlural=Boolean(closest&&nextName),chaseBe=chasePlural?"are":"is",chaseHave=chasePlural?"have":"has",chaseVerb=chasePlural?"keep":"keeps";
    let context;
    switch(String(y.d).toUpperCase()){
      case "AFC EAST":
        context=leaders.length===1
          ?leadOne+" "+w2TeamVerb(leadOne,"owns","own")+" the early edge at "+y.record+", but "+chasePair+" "+chaseVerb+" the chase tight enough that nobody gets a velvet rope yet."+midaNote+titleNote
          :leaderNames+" share the top at "+y.record+", while "+chasePair+" still have ground to make up before this becomes a fight for first place."+midaNote+titleNote;
        break;
      case "AFC NORTH":
        context=leaders.length>1
          ?leaderNames+" are level at "+y.record+", which means neither has bought even a week of separation. "+closestName+" ("+closestRec+") is the first team waiting for one of them to blink."+midaNote+titleNote
          :leadOne+" "+w2TeamVerb(leadOne,"has","have")+" the cleanest record at "+y.record+", but "+chasePair+" "+chaseVerb+" this from becoming a solo act."+midaNote+titleNote;
        break;
      case "AFC SOUTH":
        context=leadSubject+" "+leadVerb("sits","sit")+" on "+y.record+" while "+chasePair+" "+(chasePlural?"form":"forms")+" the first chase pack. The cushion is one result, not a moat, so the leader is ahead without being gone."+midaNote+titleNote;
        break;
      case "AFC WEST":
        context=leadSubject+" "+leadVerb("has","have")+" the best record at "+y.record+"; "+chasePair+" "+chaseBe+" the immediate chase, and the bottom of the division is already trying not to let two losses become a season-long tax."+midaNote+titleNote;
        break;
      case "NFC EAST":
        context=leaders.length>1
          ?leaderNames+" share "+y.record+" and therefore share the privilege of annoying everybody else. "+chasePair+" "+chaseHave+" no margin to donate in the chase while the top two keep matching receipts."+midaNote+titleNote
          :leadOne+" "+w2TeamVerb(leadOne,"controls","control")+" the early record at "+y.record+", with "+chasePair+" close enough to make the lead provisional rather than ceremonial."+midaNote+titleNote;
        break;
      case "NFC NORTH":
        context=leaders.length>=3
          ?leaderNames+" are all "+y.record+", so the standings currently resemble three people trying to leave an elevator at once. "+closestName+" ("+closestRec+") is not far enough away to create meaningful separation."+midaNote+titleNote
          :(leaders.length===1?leadOne+" "+w2TeamVerb(leadOne,"holds","hold"):leaderNames+" hold")+" the top line at "+y.record+", but "+chasePair+" "+chaseVerb+" the race packed tightly enough that nobody can hide behind the calendar."+midaNote+titleNote;
        break;
      case "NFC SOUTH":
        context=leadSubject+" "+leadVerb("owns","own")+" "+y.record+", with "+chasePair+" providing the nearest pressure. The chase remains possible, but a single stumble will not erase a multi-game lead."+midaNote+titleNote;
        break;
      case "NFC WEST":
        context=leadSubject+" "+leadVerb("has","have")+" banked "+y.record+", while "+chasePair+" "+chaseVerb+" the chase from becoming a postcard. The leader has daylight, not distance."+midaNote+titleNote;
        break;
      default:
        context=(leaders.length===1?leadOne+" "+w2TeamVerb(leadOne,"leads","lead"):leaderNames+" lead")+" at "+y.record+" with "+chasePair+" nearest."+midaNote+titleNote;
    }
    return y.d+": "+leaderNames+" ("+y.record+") — "+context
  };
  return intro+"\n\n"+flags.map(line).join("\n")
}
function w2HotTrend(t,r,weak,weakPrev){
  const a=w2Alias(t),cur=Number(weak.points)||0,old=Number(weakPrev.points)||0,delta=cur-old,k=w2Hash(String(t.roster_id)+"|hot|"+String(r?.id||""))%6;
  if(cur<3&&Math.abs(delta)<0.05)return weak.name+" scored "+w2One(cur)+" in both Week 1 and Week 2. "+a.mascot+" need a different answer from "+weak.name+".";
  if(cur<3&&Math.abs(delta)<4){
    const rows=[
      weak.name+" went from "+w2One(old)+" in Week 1 to "+w2One(cur)+" in Week 2. Calling that progress would be generous; the "+a.mascot+" still need useful points from the spot.",
      "The two-week line for "+weak.name+" is "+w2One(old)+" then "+w2One(cur)+". The numbers are different, but neither week gave "+t.team_name+" enough production to celebrate.",
      weak.name+" technically moved from "+w2One(old)+" to "+w2One(cur)+", but the "+a.mascot+" should care more about the low level than the direction.",
      "Week 2 changed the number for "+weak.name+" without changing the problem. "+w2One(cur)+" points is still a quiet lineup spot.",
      weak.name+" gave "+t.team_name+" "+w2One(cur)+" this week after "+w2One(old)+" in the opener. That is the same problem twice, not progress.",
      "The arrow barely matters when both endpoints are this low: "+w2One(old)+" then "+w2One(cur)+" for "+weak.name+". The "+a.mascot+" need substance, not another scoring shortfall."
    ];return rows[k];
  }
  const up=delta>0;
  const rowsUp=[
    weak.name+" improved from "+w2One(old)+" in Week 1 to "+w2One(cur)+" in Week 2. The "+a.mascot+" can call that progress because the change was large enough to matter.",
    "The two-week line for "+weak.name+" is "+w2One(old)+" then "+w2One(cur)+". Better is welcome; useful again in Week 3 is the next standard.",
    weak.name+" added "+w2One(delta)+" points over the opener, a real improvement even if the lineup spot still has room to grow.",
    "Week 2 was a meaningful step forward for "+weak.name+" after "+w2One(old)+" in the opener. The "+a.mascot+" now need that step to hold.",
    weak.name+" gave "+t.team_name+" materially more than in Week 1. The next question is whether the improvement survives another Sunday.",
    "The arrow for "+weak.name+" points up from "+w2One(old)+" to "+w2One(cur)+". This time the change is large enough to deserve the arrow."
  ];
  const rowsDown=[
    weak.name+" fell from "+w2One(old)+" in Week 1 to "+w2One(cur)+" in Week 2. The "+w2One(Math.abs(delta))+"-point reduction leaves "+t.team_name+" needing a specific plan for "+weak.name+" next Sunday.",
    "The two-week line for "+weak.name+" went the wrong way: "+w2One(old)+" to "+w2One(cur)+". The rest of the lineup cannot keep absorbing that drop.",
    weak.name+" followed "+w2One(old)+" in the opener with "+w2One(cur)+" this week; the "+a.mascot+" now have a real downward trend to watch.",
    "For "+a.mascot+", Week 2 made the "+weak.name+" problem harder to dismiss after a better opener; panic is unnecessary, but "+w2One(cur)+" cannot be the answer again.",
    weak.name+" lost "+w2One(Math.abs(delta))+" points from Week 1, and "+t.team_name+" now has a two-game reason to inspect the role.",
    "The opener gave "+weak.name+" more than Week 2 did. After "+w2One(cur)+" this time, the "+a.mascot+" should treat the role as a Week 3 question, not a coincidence."
  ];
  return (up?rowsUp:rowsDown)[k];
}

function w2CoolRead(t,r,coolNames,won,margin){
  const a=w2Alias(t),names=coolNames.length?w2Natural(coolNames):t.team_name,k=w2Hash(String(t.roster_id)+"|cool|"+String(r?.id||""))%6;
  const winRows=[
    names+" get the Week 2 applause because a "+w2One(margin)+"-point win left no room for empty calories; their production actually moved the result.",
    "The credit line belongs to "+names+". In a win by "+w2One(margin)+", the win forced the opponent to survive more than the obvious top scorer.",
    names+" did more than decorate a winning box score; the "+a.mascot+" needed that production to keep the matchup from collapsing onto one star.",
    "A winning Sunday gives "+names+" the good headline, and the "+w2One(margin)+"-point margin explains why: those points were part of the outcome, not an appendix.",
    names+" earned the clean part of the story. The "+a.mascot+" can ask for the same pressure next week without pretending the exact performance will repeat.",
    "The "+a.mascot+" won, and "+names+" are why the praise can be specific instead of generic. Their Week 2 work changed what the opponent had to defend."
  ];
  const lossRows=[
    names+" still deserve the Week 2 credit in a "+w2One(margin)+"-point loss; "+t.team_name+" needs to give that production enough help that it stops becoming wasted work.",
    "A loss does not erase "+names+". Keep that production; replace the empty space around it before the good work becomes another wasted Sunday.",
    names+" gave "+t.team_name+" something worth carrying forward even in defeat. Week 3 is about building enough around it to change the final line.",
    "The good part of the loss belongs to "+names+". The "+a.mascot+" do not need them to be louder next week; they need more teammates to join them.",
    names+" are the reason the postgame review is not entirely negative. Their production held up; the rest of the lineup has to make it matter.",
    "Keep "+names+" on the "+a.mascot+" credit side of the ledger; a "+w2One(margin)+"-point loss asks for help around them, not a rewrite of what already worked."
  ];
  return (won?winRows:lossRows)[k];
}
function w2DivisionRead(t,r,divisionPeerLine,selfLead,otherLeaders){
  const a=w2Alias(t),div=String(t.division_context?.division_name||"the division"),peers=w2Natural(divisionPeerLine),k=w2Hash(String(t.roster_id)+"|division|"+String(r?.id||""))%8,lead=selfLead&&otherLeaders.length;
  const leadNames=w2Natural([t.team_name,...otherLeaders.map(x=>x.team_name)]);
  const rows=[
    (lead?"At the top of "+div+", "+leadNames+" are tied. ":"In "+div+", "+t.team_name+" is still fighting for position. ")+(peers?"The other contenders are "+peers+". "+a.mascot+" will notice.":"Week 3 can move the order immediately."),
    (lead?leadNames+" are tied for the "+div+" lead. ":"The "+div+" standings give "+a.mascot+" no reason to relax. ")+(peers?"The "+div+" chase includes "+peers+". "+a.mascot+" have to make their own case next.":"The next result has direct standings weight."),
    (lead?"The "+div+" has no solo leader because "+leadNames+" are level. ":"The "+a.mascot+" are not alone in a crowded "+div+" race. ")+(peers?"Within "+div+", the immediate competition is "+peers+". No one gets a free pass.":"Week 3 can create separation."),
    (lead?t.team_name+" is tied atop "+div+" with "+w2Natural(otherLeaders.map(x=>x.team_name))+". ":"The "+div+" race around "+t.team_name+" is already compressed. ")+(peers?"The rivals are "+peers+"; one Sunday can reorder the whole group.":"One Sunday can reorder the group."),
    (lead?"At the top of "+div+", "+leadNames+" are tied. ":"The "+a.mascot+" enter Week 3 with division leverage still available. ")+(peers?"Behind and around them are "+peers+", so every clean result carries immediate value.":"Every clean result carries immediate value."),
    (lead?leadNames+" are tied for first in "+div+". ":"Nobody around "+t.team_name+" has made "+div+" comfortable yet. ")+(peers?a.mascot+" share "+div+" with "+peers+". Next comes the test.":"Week 3 gets first crack at breaking the cluster."),
    (lead?"First place in "+div+" has "+leadNames+" tied. ":"The "+div+" table gives "+a.mascot+" no reason to coast. ")+(peers?"For the "+a.mascot+", the other division names are "+peers+"; the "+div+" schedule offers no free results.":"The next result is part of the race."),
    (lead?t.team_name+" enters Week 3 level for the "+div+" lead with "+w2Natural(otherLeaders.map(x=>x.team_name))+". ":"The "+div+" picture has "+t.team_name+" in the middle of a live race. ")+(peers?"The division includes "+peers+". "+a.mascot+" need this one.":"That is enough context to make Week 3 matter immediately.")
  ];
  return rows[k];
}
function w2NextStarRead(t,r,next,nextStar){
  const a=w2Alias(t),pts=w2One(nextStar?.points||nextStar?.season_avg||0),pos=String(nextStar?.position||"").toUpperCase(),
    k=(Math.max(1,Number(t.roster_id)||1)-1)%12;
  const rows=[
    nextStar.name+" is the first Week 3 name to circle after "+pts+" fantasy points; if "+a.mascot+" repeat a quiet lineup spot, "+next+" already has top-end scoring to punish the margin.",
    "The Week 3 benchmark starts with "+nextStar.name+" ("+pos+"), fresh off "+pts+" fantasy points. "+t.team_name+" needs enough production across its own lineup to keep pace.",
    "Latest-game scoring puts "+nextStar.name+" at "+pts+" points for "+next+". That raises the bar for "+a.mascot+" if their weak Week 2 slot stays quiet.",
    "The "+a.mascot+" circle "+nextStar.name+" because "+pts+" latest-game points give "+next+" a proven source of scoring entering Week 3.",
    next+" carries a "+pts+"-point latest-game line from "+nextStar.name+" into Week 3. That is the concrete scoring benchmark for "+a.mascot+".",
    "For "+a.mascot+", "+nextStar.name+" represents "+pts+" points of recent production on the "+next+" side. The "+a.mascot+" lineup has to answer that level.",
    "A "+pts+"-point latest game from "+nextStar.name+" is the first number in the Week 3 comparison with "+next+".",
    nextStar.name+" posted "+pts+" most recently, giving "+next+" a clear high-end reference point before facing "+a.mascot+".",
    "Week 3 puts the "+a.mascot+" opposite a "+next+" roster that just got "+pts+" from "+nextStar.name+", making that production the first matchup problem the "+a.mascot+" lineup has to answer.",
    "Recent form gives "+nextStar.name+" a "+pts+"-point line entering the "+a.mascot+" matchup. That is enough to shrink the margin for another quiet "+a.mascot+" slot.",
    "The "+next+" side enters Week 3 with "+nextStar.name+" coming off "+pts+" points. "+a.mascot+" need their own secondary scoring to match that kind of top-end output.",
    ([
      nextStar.name+" is the clearest Week 3 scoring reference after "+pts+" latest-game points for "+next+"; the "+a.mascot+" need more from their own quiet slots to keep pace.",
      "A "+pts+"-point latest game from "+nextStar.name+" gives "+next+" the clearest Week 3 benchmark; "+a.mascot+" cannot afford another empty scoring slot.",
      next+" enters Week 3 with "+pts+" recent points from "+nextStar.name+". For "+a.mascot+", that makes secondary production more important than repeating any one star’s exact total.",
      "The "+a.mascot+" get a concrete Week 3 comparison in "+nextStar.name+" at "+pts+" latest-game points for "+next+"; the answer has to come from better scoring depth."
    ])[w2Hash(String(t.roster_id)+"|nextstar-12")%4]
  ];
  return rows[k];
}



function w2SameDivisionNext(t){
  return String(t?.division_context?.division_name||"").trim()&&String(t?.division_context?.division_name||"").trim()===String(t?.next_opponent_division_context?.division_name||"").trim()
}
function w2MidaPct(v){return Number.isFinite(Number(v))?Number(v).toFixed(1)+"%":null}
function w2MidaPositivePct(v){return Number.isFinite(Number(v))&&Number(v)>0?Number(v).toFixed(1)+"%":null}
function w2DivisionalOutlook(t,r,next,nrecord,ndiv){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),own=w2Record(t),
    ownM=w2MidaPositivePct(t?.mida_outlook?.division),oppM=w2MidaPositivePct(t?.next_opponent_mida?.division),
    leaders=(t?.division_context?.leaders||[]).filter(x=>x?.team_name),lead=leaders.some(x=>String(x.roster_id)===String(t.roster_id)),
    v=w2Cohort(t)%4,article=/^[AEIOU]/i.test(ndiv)?"an":"a",
    mida=ownM&&oppM?("MIDA has the division race at "+ownM+" for "+team+" and "+oppM+" for "+next+". "):"",
    leverage=lead
      ?team+" can make "+next+" rethink the "+ndiv+" chase after their head-to-head result."
      :({
        "walter-mercer":team+" can improve its "+ndiv+" position directly against "+next+".",
        "tess-delaney":"I would rather see "+team+" settle the "+ndiv+" argument on the field against "+next+".",
        "mack-hollis":"Put "+team+" opposite "+next+" in the "+ndiv+" spotlight. That is the game.",
        "nora-voss":"The "+ndiv+" rivals will be watching "+team+" against "+next+". They have a reason."
       }[rid]||team+" gets a direct division test against "+next+".");
  const rows={
    "walter-mercer":[
      "Week 3 brings "+article+" "+ndiv+" head-to-head: "+team+" ("+own+") against "+next+" ("+nrecord+"). These games are scarce, and in this league the division winner owns a playoff berth, so "+leverage+" "+mida+"That is real leverage, not just a louder label on the schedule.",
      team+" gets "+next+" inside "+ndiv+" in Week 3. A result against a direct division rival changes both sides of the race at once, and the division crown carries a playoff spot here. "+mida+"For "+a.mascot+", this is one of the Sundays where the standings swing is larger than one win.",
      "The next opponent is not just "+next+"; it is "+next+" inside "+ndiv+". Head-to-head division chances are limited, the winner of the division goes to the playoffs, and "+leverage+" "+mida+"That combination makes Week 3 materially different from a random cross-division game.",
      team+" and "+next+" share the same "+ndiv+" route to the postseason. Because the division title guarantees a playoff berth, this head-to-head can create separation that cannot be recovered by beating some unrelated team later. "+mida+leverage
    ],
    "tess-delaney":[
      next+" is not merely the next reservation; it is a "+ndiv+" table fight with "+team+". There are only so many head-to-head chances to move a direct rival, and the division winner gets a playoff seat automatically. "+mida+"This is one of the appointments where stealing the chair matters.",
      "Week 3 seats "+team+" and "+next+" at the same "+ndiv+" table. A division win helps the "+a.mascot+" while handing the rival the opposite result, and the eventual division crown comes with a playoff invitation. "+mida+"That is a considerably more expensive dinner than the schedule usually serves.",
      "The room should circle "+next+" for one reason above all: "+ndiv+" is their shared route to an automatic playoff berth. Head-to-head chances are limited, so "+leverage+" "+mida+"Nobody should confuse that with decorative schedule drama.",
      team+" gets a direct "+ndiv+" rival in "+next+". The division title buys a playoff seat, which means one result can improve the "+a.mascot+" position and damage the rival’s at the same time. "+mida+"That is the kind of reservation worth wearing the good suit for."
    ],
    "mack-hollis":[
      "Week 3 is "+team+" versus "+next+" inside "+ndiv+". The 'just one game' excuse can leave the building: winning "+ndiv+" sends "+team+" to the playoffs, and beating "+next+" takes a swing at both sides of that particular argument. "+mida+leverage,
      next+" is a direct "+ndiv+" rival, which makes Week 3 a two-sided punch: "+team+" can add a win and hand the same race a loss. The division crown punches a playoff ticket in this league. "+mida+"That is why this one gets the megaphone.",
      "The schedule gives "+team+" "+article+" "+ndiv+" game against "+next+". There are not many direct swings like this, and the prize for winning the division is a playoff berth. "+mida+"Beat "+next+" and the "+a.mascot+" bank a win while handing a division rival a loss; the standings rarely offer such a convenient two-for-one insult.",
      team+" and "+next+" are fighting for the same "+ndiv+" door, and that door opens straight into the playoffs for the division winner. Head-to-head chances are limited. "+mida+"The "+a.mascot+" can stop begging the schedule for a favor by beating "+next+" in the game that actually controls their division arithmetic."
    ],
    "nora-voss":[
      next+" shares "+ndiv+" with "+team+", which means the rival chat finally gets a game with actual teeth. A division result helps one side and hurts the other in the same race, and the division winner gets a playoff berth. "+mida+"That is much harder to laugh away than a random regular-season loss.",
      "Week 3 gives "+team+" a direct "+ndiv+" rival in "+next+". There are only so many head-to-head shots, and the division crown carries a playoff spot, so "+leverage+" "+mida+"Rivals can joke afterward; first they have to survive the leverage.",
      "The pressure in "+team+"–"+next+" comes from both teams spending the same limited head-to-head opportunity in a race whose winner reaches the playoffs. "+mida+"Somebody leaves with a better argument and somebody leaves with less room.",
      team+" meets "+next+" inside "+ndiv+", where the schedule does not hand out unlimited rematches. The division winner gets a playoff berth, so every direct result changes the path for both sides. "+mida+"That is the kind of joke that shows up in the standings."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}

function w2OutlookLead(t,r,next,nrecord,nctx,ndiv){
  if(w2SameDivisionNext(t))return w2DivisionalOutlook(t,r,next,nrecord,ndiv);
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),rank=Number(nctx?.standings_rank),rankText=rank?"No. "+String(rank)+" overall":"outside the current ranked snapshot",v=w2Cohort(t)%4;
  const rows={
    "walter-mercer":[
      "Week 3 sends "+team+" to "+next+", currently "+nrecord+" and "+rankText+". Now the Week 2 strengths have to travel against a team sitting in a different part of the league order.",
      next+" is next for "+team+" at "+nrecord+" ("+rankText+"). That matchup gives the "+a.mascot+" a chance to test whether the first two weeks describe a repeatable lineup rather than a favorable start.",
      "The Week 3 opponent is "+next+", carrying a "+nrecord+" record and "+rankText+". For "+team+", the assignment is to make the same useful players matter without needing the same exact Sunday.",
      team+" gets "+next+" in Week 3, with "+next+" sitting "+nrecord+" and "+rankText+". For "+team+", the next test is to follow "+w2One(Number(t.points||0))+" points against "+String(t.opponent_name||"the previous rival")+" with a real answer to "+next+"."
    ],
    "tess-delaney":[
      next+" arrives for Week 3 at "+nrecord+" and "+rankText+". The "+a.mascot+" have another appointment to prove the current outfit travels.",
      "The next reservation belongs to "+next+", currently "+nrecord+" and "+rankText+". "+team+" can keep the good china out only if the parts that actually worked in Week 2 survive a different guest.",
      "Week 3 puts "+next+" on the "+a.mascot+" guest list at "+nrecord+" ("+rankText+"). The next result asks whether the room has style or merely had a nice evening.",
      next+" is the Week 3 appointment, carrying "+nrecord+" and "+rankText+". The "+a.mascot+" get a fresh room to prove this version of themselves is portable."
    ],
    "mack-hollis":[
      next+" is next at "+nrecord+" and "+rankText+". The "+a.mascot+" get another Sunday to prove the Week 2 noise came from a real speaker and not somebody dropping a pan.",
      "Week 3 throws "+team+" at "+next+", sitting "+nrecord+" and "+rankText+". Same stars are fine; same emergency dependence is not.",
      "The next target is "+next+": "+nrecord+" and "+rankText+". The "+a.mascot+" need the loud part of Week 2 to bring backup this time.",
      team+" gets "+next+" in Week 3, and "+next+" brings a "+nrecord+" record plus "+rankText+". There is enough resistance here to tell us whether the Week 2 headline has a sequel."
    ],
    "nora-voss":[
      next+" is waiting in Week 3 at "+nrecord+" and "+rankText+". After "+w2One(Number(t.points||0))+" points against "+String(t.opponent_name||"the opponent")+", "+team+" must show its scoring is repeatable against "+next+".",
      "The next rival is "+next+", carrying "+nrecord+" and "+rankText+". The "+a.mascot+" can improve their argument by making the same flaw disappear against somebody new.",
      "Week 3 brings "+next+" with a "+nrecord+" record and "+rankText+". If the same weak spot survives the opponent change, rivals will not have to invent new material.",
      team+" meets "+next+" next, and "+next+" enters at "+nrecord+" ("+rankText+"). Somebody’s early talking point is going to get more annoying."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2OpponentScheduleGrade(x){
  const rank=Number(x?.context?.standings_rank),playoff=Number(x?.mida?.playoff),rec=x?.context?.record||{},
    wins=Number(rec.wins),losses=Number(rec.losses),played=(Number.isFinite(wins)?wins:0)+(Number.isFinite(losses)?losses:0);
  let score=0,weight=0;
  if(Number.isFinite(rank)&&rank>=1&&rank<=32){score+=((33-rank)/32)*0.55;weight+=0.55}
  if(Number.isFinite(playoff)){score+=(Math.max(0,Math.min(100,playoff))/100)*0.30;weight+=0.30}
  if(played>0){score+=((Number.isFinite(wins)?wins:0)/played)*0.15;weight+=0.15}
  const strength=weight?score/weight:0.5;
  return{strength,label:strength>=0.62?"hard":strength<=0.38?"soft":"middle"}
}
function w2ScheduleOpponentLabel(x){
  const name=w2DisplayTeam(x?.team_name||"opponent"),rec=x?.context?.record||{},wins=Number(rec.wins),losses=Number(rec.losses),
    rank=Number(x?.context?.standings_rank),parts=[];
  if(Number.isFinite(wins)&&Number.isFinite(losses))parts.push(String(wins)+"-"+String(losses));
  if(Number.isFinite(rank)&&rank>=1&&rank<=32)parts.push("No. "+String(rank));
  return name+(parts.length?" ("+parts.join(", ")+")":"")
}
function w2ScheduleStretchRead(t,r,next,later){
  const rid=String(r?.id||"walter-mercer"),team=w2DisplayTeam(t.team_name),a=w2Alias(t),
    graded=(later||[]).map(x=>({...x,...w2OpponentScheduleGrade(x)})),
    hard=graded.filter(x=>x.label==="hard"),soft=graded.filter(x=>x.label==="soft"),
    avg=graded.length?graded.reduce((n,x)=>n+x.strength,0)/graded.length:0.5,
    profile=hard.length===graded.length||avg>=0.61?"hard":soft.length===graded.length||avg<=0.39?"soft":"mixed",
    detail=w2Natural(graded.map(w2ScheduleOpponentLabel)),first=w2DisplayTeam(graded[0]?.team_name||"the following opponent"),
    v=w2Hash(team+"|schedule-stretch|"+rid+"|"+profile)%4;
  const rows={
    "walter-mercer":{
      hard:[
        "The schedule stiffens after "+next+": "+detail+". That makes Week 3 especially valuable. Bank it now and "+a.mascot+" enter the hard part from strength instead of asking the hard part to rescue them.",
        "Behind "+next+" sits the rougher part of the road: "+detail+". A Week 3 win buys "+team+" margin before that resistance arrives; a loss turns "+first+" into an immediate recovery assignment.",
        detail+" are waiting after "+next+", and the numbers grade that as a difficult stretch. Week 3 is the clean place to build a cushion before the schedule starts charging more for mistakes.",
        "The road does not get friendlier after "+next+"; it runs through "+detail+". Winning Week 3 matters because "+team+" would rather carry momentum into that stretch than ask it for a bailout."
      ],
      soft:[
        "The schedule loosens after "+next+": "+detail+". That makes Week 3 useful in a different way—win it and "+a.mascot+" can turn the softer stretch into runway; lose it and a favorable patch starts with unnecessary repair work.",
        "There is some breathing room behind "+next+" in "+detail+". Bank Week 3 and "+team+" gets a chance to stack wins against the more manageable part of the schedule instead of using it to undo a mistake.",
        detail+" make the road after "+next+" more forgiving than frightening. A Week 3 win could turn that softer patch into momentum; a loss would waste the cleanest chance to build before it.",
        "After "+next+", "+team+" gets the more manageable pairing of "+detail+". Week 3 is not desperation; it is the chance to reach that softer stretch already moving forward."
      ],
      mixed:[
        "The road after "+next+" is mixed: "+detail+". One part offers breathing room and another can punish it, so Week 3 matters because a win lets "+team+" enter the uneven stretch without manufacturing urgency.",
        detail+" give "+team+" a split schedule behind "+next+" rather than a clean gauntlet or soft landing. Bank Week 3 and the "+a.mascot+" can take those games on their own terms; lose and the harder half gets louder.",
        "After "+next+" comes an uneven pair in "+detail+". For "+team+", one side offers breathing room and the other brings resistance. Week 3 decides whether "+team+" reaches that stretch with room to choose or with points already owed.",
        "The next two after "+next+" refuse to pick one difficulty level: "+detail+". That makes Week 3 the hinge—win and the mixed stretch stays manageable; lose and the tougher side starts dictating the conversation."
      ]
    },
    "tess-delaney":{
      hard:[
        "The schedule gets considerably less polite after "+next+": "+detail+". Week 3 is the result to bank before the difficult stretch starts asking for perfect manners and better lineups.",
        detail+" sit behind "+next+", which turns the next two games into the hard part of the route. Win Week 3 and "+team+" meets that stretch with leverage; lose and the schedule immediately starts collecting interest.",
        "There is no soft landing behind "+next+" because "+detail+" are waiting. That makes Week 3 especially important: take the win now before the road begins charging full price for every lineup flaw.",
        "After "+next+", the resistance rises through "+detail+". A Week 3 win gives "+a.mascot+" room to absorb a difficult stretch; a loss hands that same stretch permission to become a problem."
      ],
      soft:[
        "The schedule offers some mercy after "+next+" with "+detail+". Win Week 3 and "+team+" can carry momentum into the softer patch; lose it and the friendlier part of the road gets demoted to cleanup duty.",
        detail+" make the stretch behind "+next+" noticeably more manageable. Week 3 is a chance to arrive there with a win already banked instead of asking the easier games to repair the record.",
        "There is a softer landing after "+next+": "+detail+". That does not make Week 3 disposable; it makes a win more valuable because "+a.mascot+" could turn the following stretch into actual momentum.",
        "Behind "+next+" sits the friendlier pairing of "+detail+". Handle Week 3 and "+team+" gets to attack that stretch; drop it and a comfortable-looking schedule suddenly has chores."
      ],
      mixed:[
        "The schedule behind "+next+" is deliberately unhelpful: "+detail+". One game offers room, the other brings real resistance. A Week 3 win keeps that mixed stretch from choosing the terms for "+team+".",
        detail+" split the road after "+next+" between opportunity and trouble. Bank Week 3 and "+a.mascot+" can treat the uneven stretch calmly; lose and the harder half starts looking much larger.",
        "After "+next+", the schedule lands in the middle with "+detail+". There is no clean gauntlet and no vacation either, which makes Week 3 the useful result to secure before the road starts changing moods.",
        "The next two after "+next+" are a mixed assignment in "+detail+". Win now and "+team+" has room for the tougher half; lose and even the softer half starts feeling like something that must be recovered."
      ]
    },
    "mack-hollis":{
      hard:[
        "Then the schedule puts on shoulder pads: "+detail+" are waiting after "+next+". Win Week 3 and "+a.mascot+" hit that wall with momentum; lose and the wall gets to introduce itself while everybody is already yelling.",
        "The heavy part comes after "+next+": "+detail+". Bank Week 3 before that stretch arrives, because asking those games to fix a loss is how the schedule starts sounding like an emergency broadcast.",
        detail+" are next behind "+next+", and that is a real gauntlet. Week 3 is the one to grab before the schedule turns the resistance up and starts charging extra for every bad lineup call.",
        "After "+next+", "+team+" runs into "+detail+". That is the hard stretch, full stop. Win now and attack it; lose now and the next two games show up carrying a much louder problem."
      ],
      soft:[
        "The road actually gets friendlier after "+next+": "+detail+". Win Week 3 and the schedule starts looking like runway; lose and "+a.mascot+" have somehow turned the soft part into an apology tour.",
        detail+" are waiting behind "+next+", which is the schedule offering "+team+" a little oxygen. Bank Week 3 and use it. Drop Week 3 and suddenly the easier stretch is doing repair work instead of building anything.",
        "After "+next+" come "+detail+", and that is about as close as the schedule gets to lowering the volume. Win now and "+a.mascot+" can stack momentum; lose and they waste the friendly part paying off the mistake.",
        "The schedule takes its foot off the gas after "+next+" with "+detail+". Week 3 is the chance to hit that softer stretch moving forward instead of dragging a problem into games that should be opportunities."
      ],
      mixed:[
        "The schedule after "+next+" is a split screen: "+detail+". One game looks like oxygen, the other looks like work. Win Week 3 and "+a.mascot+" choose the volume; lose and the harder half gets the microphone.",
        detail+" give the road behind "+next+" one soft edge and one sharp one. Bank Week 3 and "+team+" can take the mixed stretch as it comes; lose and the difficult half immediately feels twice as loud.",
        "After "+next+" comes the uneven pair of "+detail+". It is not a gauntlet and it is definitely not a vacation. Week 3 decides whether "+a.mascot+" enter that mix with momentum or with a repair bill.",
        "The next two after "+next+" split the difference: "+detail+". Win now and the favorable half feels useful; lose and the tougher half starts looming before anybody has earned the panic."
      ]
    },
    "nora-voss":{
      hard:[
        "Rivals looking ahead can see the problem: "+detail+" wait after "+next+". That is the hard stretch. Beat "+next+" first and "+team+" carries a cushion into it; lose and opponents get to watch the schedule apply the pressure for them.",
        detail+" are sitting behind "+next+", which is exactly the stretch rivals would choose if they were allowed to write the schedule. Week 3 matters because "+a.mascot+" should bank the win before the road starts helping everybody else.",
        "The next two after "+next+" are "+detail+", and the difficulty jumps. Win Week 3 and "+team+" makes rivals chase through the gauntlet; lose and the gauntlet gets to do their heckling for them.",
        "After "+next+", the road hardens through "+detail+". A Week 3 win is especially valuable because "+a.mascot+" would rather enter that stretch with leverage than become everybody’s favorite rebound target."
      ],
      soft:[
        "Rivals will hate the schedule behind "+next+": "+detail+" make the next two look considerably softer. Bank Week 3 and "+team+" gets a real chance to stack wins; lose and opponents get to laugh at a gift returned unopened.",
        detail+" give "+a.mascot+" a friendlier road after "+next+". That makes Week 3 less desperate but more useful—win it and the softer stretch becomes runway instead of recovery.",
        "After "+next+", the schedule relaxes into "+detail+". A Week 3 win could send "+team+" into the manageable part already rolling; a loss would turn two opportunities into an embarrassing repair kit.",
        "The road behind "+next+" is favorable: "+detail+". Handle Week 3 and rivals have to watch "+a.mascot+" attack a softer stretch from strength; drop it and they get to enjoy the waste."
      ],
      mixed:[
        "Rivals get one comfortable name and one problem after "+next+": "+detail+". That mixed stretch makes Week 3 the hinge. Win and "+team+" controls the mood; lose and the difficult half suddenly owns the conversation.",
        detail+" split the schedule behind "+next+" between opportunity and resistance. Bank Week 3 and "+a.mascot+" can make rivals wait for the hard game; lose and everybody skips straight to circling it.",
        "After "+next+", the road is mixed through "+detail+". One game can help and one can bite. A Week 3 win keeps "+team+" from letting the tougher half dictate the whole stretch.",
        "The next two after "+next+" refuse to cooperate: "+detail+". There is a softer side and a harder side, which makes Week 3 the cleanest chance for "+a.mascot+" to keep rivals from choosing which one matters most."
      ]
    }
  },bank=(rows[rid]||rows["walter-mercer"])[profile]||rows["walter-mercer"][profile];
  return bank[v]
}
function w2RoadRead(t,r,next,later){return w2ScheduleStretchRead(t,r,next,later)}
function w2PlayerName(t,id){const sid=String(id||"");const pools=[...(t?.starter_details||[]),...(t?.opponent_roster?.players||[]),...(t?.next_opponent_roster?.players||[]),...Object.values(t?.transaction_player_facts||{})];const p=pools.find(x=>String(x?.id)===sid);if(p?.name)return p.name;for(const a of t?.trade_acquisitions||[]){if(String(a?.player_id)===sid&&a?.player_name)return a.player_name;const i=(a?.outgoing_player_ids||[]).map(String).indexOf(sid);if(i>=0&&a?.outgoing_player_names?.[i])return a.outgoing_player_names[i]}return""}

function w2TradeThenValue(side){
  const playerIds=side?.player_ids||[],picks=side?.picks||[],
    playersOk=playerIds.length===0||side?.then_players_complete===true,
    picksOk=picks.length===0||side?.then_picks_complete===true;
  if(!playersOk||!picksOk)return null;
  return (Number(side?.then_player_total)||0)+(Number(side?.then_pick_total)||0)
}
function w2TradeValueRead(t,r,own,other,otherName,ownAssets,otherAssets){
  const ownValue=w2TradeThenValue(own),otherValue=w2TradeThenValue(other);
  if(!Number.isFinite(ownValue)||!Number.isFinite(otherValue))return null;
  const team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(otherName),edge=Math.round(Math.abs(ownValue-otherValue)),
    winner=ownValue>=otherValue?team:foe,loser=ownValue>=otherValue?foe:team,
    exchange=w2Natural(ownAssets)+" for "+w2Natural(otherAssets),rid=String(r?.id||"");
  if(edge<100)return "At the trade snapshot, the deal priced almost even: "+team+" received "+Math.round(ownValue).toLocaleString("en-US")+" value points to "+Math.round(otherValue).toLocaleString("en-US")+" for "+foe+". "+exchange+" was a fit bet, not a value mugging.";
  const rows={
    "walter-mercer":winner+" came out "+edge.toLocaleString("en-US")+" value points ahead at the trade snapshot when "+exchange+" changed hands. On price, "+loser+" got fleeced by "+edge.toLocaleString("en-US")+" points; Sunday can change the players’ trajectories, but it cannot rewrite what the receipt said that day.",
    "tess-delaney":"The receipt was not subtle: "+winner+" held a "+edge.toLocaleString("en-US")+"-point value edge when "+exchange+" changed hands. That leaves "+loser+" wearing the word 'fleeced' by "+edge.toLocaleString("en-US")+" points, which is an awfully expensive accessory.",
    "mack-hollis":winner+" was "+edge.toLocaleString("en-US")+" value points ahead at the snapshot when "+exchange+" was made. That leaves "+loser+" on the wrong side of a "+edge.toLocaleString("en-US")+"-point fleece by the market’s recorded price.",
    "nora-voss":"Rival managers do not need to invent the punch line here. "+winner+" held a "+edge.toLocaleString("en-US")+"-point value edge when "+exchange+" changed hands, so "+loser+" got fleeced by "+edge.toLocaleString("en-US")+" points on the recorded price."
  };
  return rows[rid]||rows["walter-mercer"]
}

function w2TradeAssets(t,side){const out=[];for(const id of side?.player_ids||[]){const n=w2PlayerName(t,id);if(n)out.push(n)}for(const p of side?.picks||[])out.push(String(p?.season||"Future")+" Round "+String(p?.round||"?")+" pick");return out}
function w2Headline(t,r){
  const team=t.team_name,opp=t.opponent_name||"the opponent",star=(t.starter_details||[])[0]?.name||team,v=w2Cohort(t),won=Number(t.points)>Number(t.opponent_points);
  const win={
    "walter-mercer":[team+" Has Two Weeks of Proof Now",team+" Banks Another Sunday and Raises the Standard",star+" Gives "+team+" a Week 2 Answer Worth Keeping",team+" Leaves Week 2 With Less to Explain",team+" Turns the Second Sunday Into Something Useful",team+" Had More Week 2 Firepower Than "+opp,team+" Makes the Opening Week Look Less Accidental",team+" Wins Again, Which Is How Expectations Get Expensive"],
    "tess-delaney":[team+" Makes the Second Sunday Look Less Accidental",star+" Gives "+team+" Another Reason to Get Loud",team+" Wins Week 2 and the Confidence Is Spreading","A Second Sunday Worth Talking About for "+team,team+" Has Earned a Little More Swagger",team+" Wins, and I Regret to Report the Confidence Is Spreading",team+" Left "+opp+" With the Smaller Scorecard",team+" Turns Week 2 Into a Very Attractive Problem"],
    "mack-hollis":[team+" Wins Week 2 and the Volume Goes Up",star+" Just Gave "+team+" Another Headline",team+" Makes It Two Sundays Worth Talking About",team+" Put More on the Board and Took the Win",team+" Keeps Winning and the Rival Managers Hate the Trend",team+" Put Week 2 on the Front Door","The Second Sunday Belongs to "+team,team+" Is Starting to Look Annoyingly Real"],
    "nora-voss":[team+" Wins Again and the Joke Is Getting Harder to Make",star+" Gave "+team+" a Week 2 Performance Rivals Will Remember",team+" Got the Win; Everybody Else Gets the Annoying Part",team+" Scored Enough to Make "+opp+"’s Total Irrelevant",team+" Is Two Weeks Into Making This Look Real",team+" Won Week 2 and I Am Running Out of Polite Doubt",team+" Put Another Result on the Board and Made It Loud",team+" Is Starting to Become Somebody Else’s Problem"]
  };
  const loss={
    "walter-mercer":["Week 2 Leaves "+team+" With a Problem to Fix",team+" Gets the Second Sunday Wrong",opp+" Hands "+team+" a Week 2 Lesson It Did Not Want",team+" Has Two Weeks of Tape and One Fresh Complaint",team+" Falls in Week 2 and the Margin for Excuses Shrinks",star+" Could Not Keep "+team+" Out of Trouble",team+" Turns the Second Sunday Into a Longer Week",team+" Has Work to Do Before This Becomes a Habit"],
    "tess-delaney":[team+" Spills Week 2 All Over the Scoreboard",opp+" Ruins "+team+"’s Second Sunday",team+" Loses, and the Polish Cannot Save It",team+" Makes Week 2 Needlessly Dramatic",team+" Has a Second-Sunday Problem With Nowhere to Hide","A Less Civilized Week 2 for "+team,team+" Falls and the Excuses Get Smaller",team+" Gives the Rest of Us an Uncomfortably Useful Warning"],
    "mack-hollis":[team+" Loses Week 2 and the Excuses Get Smaller",opp+" Just Put "+team+" on the Wrong Side of the Headline",team+" Takes a Week 2 Hit and Everybody Saw It",team+" Made the Second Sunday Ugly",team+" Has Two Weeks of Results and One Big Problem",star+" Needed More Help; "+team+" Did Not Find It",team+" Lost, So the Rival Managers Get Their Joke","A Better Answer Is Needed From "+team+" Before Next Sunday"],
    "nora-voss":[team+" Lost Week 2 and the Punch Line Is Too Easy",team+" Exposed Its Own Weak Spot in a Week 2 Loss",team+" Has a Week 2 Mess That Needs Fixing",team+" Lost, and No Amount of Polite Language Improves It",team+" Put an Obvious Weak Number on the Week 2 Page",star+" Could Not Drag "+team+" Out of the Trouble",team+" Took the Hit; Now Fix the Part Everybody Saw",team+" Made Week 2 Much Funnier for Its Rivals"]
  };
  const bank=won?win:loss,arr=bank[r?.id]||bank["walter-mercer"];return w2TeamGrammar(t,arr[v])
}
function w2EligibleCool(t){return (t.starter_details||[]).filter(p=>{const pts=Number(p.points),prior=Number(p.prior_season_avg),proj=Number(p.projected),d=Number.isFinite(proj)?pts-proj:null;return Number.isFinite(pts)&&(pts>=15||(d!=null&&d>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2))}).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2)}
function w2CoolPairRead(t,r,eligible,won){
  const a=w2Alias(t),names=w2Natural(eligible.map(p=>p.name)),sum=w2One(eligible.reduce((n,p)=>n+(Number(p.points)||0),0)),rid=String(r?.id||""),v=w2Hash(String(t.roster_id)+"|coolpair|"+rid)%4;
  const rows={
    "walter-mercer":[
      names+" combined for "+sum+" points, giving "+w2DisplayTeam(t.team_name)+" two legitimate high-end contributors in the same lineup.",
      "Two "+a.mascot+" starters earned real credit: "+names+" combined for "+sum+" points, which is a stronger signal than one isolated spike.",
      names+" supplied "+sum+" combined points. For "+a.mascot+", that means the top-end production came from a pair rather than one player carrying the entire week.",
      "The credit belongs to "+names+" together. Their "+sum+" combined points gave "+w2DisplayTeam(t.team_name)+" a two-player foundation worth carrying forward."
    ],
    "tess-delaney":[
      "The good china belongs to "+names+" after "+sum+" combined points; one centerpiece is lovely, two is a much better room.",
      names+" share the polished part of the Week 2 story, combining for "+sum+" points and keeping the "+a.mascot+" from becoming a one-name production.",
      "I am setting two places at the good table: "+names+" combined for "+sum+" points, enough production to deserve equal billing.",
      names+" gave the "+a.mascot+" "+sum+" combined points, the kind of paired performance that makes the rest of the table look less precarious."
    ],
    "mack-hollis":[
      "Put "+names+" together and you get "+sum+" points—two actual headline scores instead of one star screaming into the void.",
      names+" combined for "+sum+" and both earned the loud part of the Week 2 praise. "+a.mascot+" had two players worth yelling about, not one.",
      "The loud part comes in stereo: "+names+" gave "+a.mascot+" "+sum+" combined points.",
      names+" piled up "+sum+" together. If you want the clean Week 2 credit line, there it is."
    ],
    "nora-voss":[
      "Rivals can complain about plenty, but "+names+" combined for "+sum+" points and both earned protection from the easy jokes.",
      names+" gave "+a.mascot+" "+sum+" combined points. That is two real contributors, which ruins the lazy one-player-roster punch line.",
      "The credit list needs two names: "+names+" combined for "+sum+" and made the top of the "+a.mascot+" lineup legitimately dangerous.",
      names+" combined for "+sum+" points. Even rivals have to admit both performances belong on the positive side of the ledger."
    ]
  };
  const base=(rows[rid]||rows["walter-mercer"])[v];
  return base.replace(/[.!?]$/,"")+(won?"; for "+a.mascot+", the win converted that pair into a useful result.":"; for "+a.mascot+", the loss left that pair without enough support.")
}
function w2SectionHead(r,kind){
  const h={
    "walter-mercer":{lede:"What Week 2 Changed",players:"Who Actually Moved the Game",identity:"What This Team Is Starting to Look Like",management:"The Decisions That Survived Sunday",value:"What the Market Said After Two Weeks","hot-seat":"The Problem That Cannot Follow Them Into Week 3","cool-throne":"Credit Where It Is Actually Due",sentiment:"What the Crowd Believes Now",outlook:"Week 3 Is Already Asking Questions"},
    "tess-delaney":{lede:"The Second Sunday, Properly Dressed",players:"The People Who Made the Afternoon Interesting",identity:"What Kind of Team Is This, Exactly?",management:"Management, Vanity and the Cost of Choices",value:"The Market Has Opinions, Naturally","hot-seat":"The Problem Everybody Can See","cool-throne":"Credit, With Appropriate Drama",sentiment:"Public Emotion, Without Restraint",outlook:"The Next Matchup With Consequence"},
    "mack-hollis":{lede:"Week 2: The Part Everybody Will Quote",players:"Who Made the Noise",identity:"Okay, So What Are We Looking At Here?",management:"Management Has to Wear This One",value:"The Price Tag Moved","hot-seat":"Somebody Own the Bad Part","cool-throne":"Give Them the Good Headline",sentiment:"The Crowd Has Decided, Temporarily",outlook:"Week 3: No Hiding Now"},
    "nora-voss":{lede:"Week 2 Was Not Subtle",players:"The Names Rivals Have to Respect",identity:"The Part Rivals Will Actually Remember",management:"Fix It Before It Becomes a Bit",value:"The Roster Price Moved, Fine","hot-seat":"The Thing Everybody Saw","cool-throne":"Yes, Somebody Deserves Credit",sentiment:"The Crowd Is Already Too Loud",outlook:"Week 3 Gets the Same Weak Spot First"}
  };
  return h[r?.id]?.[kind]||kind
}
function w2IdentityRead(t,prev,r,top,opp){
  const pts=Number(t.points)||0,prevPts=Number(prev?.points),delta=Number.isFinite(prevPts)?pts-prevPts:null,
    topPts=(top||[]).reduce((n,p)=>n+(Number(p?.points)||0),0),share=pts>0?Math.round(topPts/pts*100):0,
    names=(top||[]).filter(Boolean).map((p,i)=>w2ShortPlayerName(t,r,p,"identity-"+i)),rid=String(r?.id||""),v=w2Hash(t.team_name+"|identity")%4,
    team=w2DisplayTeam(t.team_name),out=[];
  if(names.length>=3&&share>=80){
    const rows={
      "walter-mercer":[
        w2Natural(names)+" accounted for "+share+"% of "+team+"’s points. That is concentrated enough to matter because almost nothing survived outside those three scores.",
        "This is one of the few weeks where scoring concentration deserves its own line: "+w2Natural(names)+" produced "+w2One(topPts)+" of "+w2One(pts)+" points for "+team+".",
        team+" leaned unusually hard on "+w2Natural(names)+", who combined for "+share+"% of the Week 2 total. The issue is not the stars; it is how little was left underneath them.",
        w2Natural(names)+" supplied "+w2One(topPts)+" of "+w2One(pts)+" points. At "+share+"%, that trio was not just the headline for "+team+"; it was nearly the whole scoring story."
      ],
      "tess-delaney":[
        w2Natural(names)+" handled "+share+"% of the "+w2Alias(t).mascot+" scoring. Even the finest centerpiece looks lonely when three settings account for almost the entire table.",
        "I will allow one distribution number because this one is rude: "+w2Natural(names)+" combined for "+w2One(topPts)+" of "+w2One(pts)+" "+w2Alias(t).mascot+" points.",
        "The table really was that top-heavy: "+w2Natural(names)+" owned "+share+"% of "+team+"’s total. The room below them barely joined dinner.",
        w2Natural(names)+" produced "+w2One(topPts)+" of "+w2One(pts)+" points. At "+share+"%, the supporting cast cannot hide behind the centerpiece."
      ],
      "mack-hollis":[
        "Here is the one concentration number worth yelling about: "+w2Natural(names)+" scored "+share+"% of "+team+"’s Week 2 points. Everybody else barely got into the story.",
        w2Natural(names)+" put up "+w2One(topPts)+" of "+w2One(pts)+" points. That is "+share+"% from three names, which is too extreme to bury in the agate.",
        "Three names nearly swallowed the box score: "+w2Natural(names)+" combined for "+share+"% of "+team+"’s total. That is a headline, not a routine depth note.",
        team+" got "+w2One(topPts)+" of "+w2One(pts)+" points from "+w2Natural(names)+". At "+share+"%, the stars were doing emergency overtime."
      ],
      "nora-voss":[
        "Rivals get one concentration joke because the number earned it: "+w2Natural(names)+" produced "+share+"% of "+team+"’s Week 2 scoring.",
        w2Natural(names)+" combined for "+w2One(topPts)+" of "+w2One(pts)+" points. At "+share+"%, nobody needs to invent a top-heavy punch line.",
        "The easy rival read actually fits this time: "+w2Natural(names)+" owned "+share+"% of "+team+"’s scoring, leaving almost no room for a fourth name in the argument.",
        team+" handed rivals a real number to use: "+w2Natural(names)+" supplied "+w2One(topPts)+" of "+w2One(pts)+" points, or "+share+"% of the total."
      ]
    };
    out.push((rows[rid]||rows["walter-mercer"])[v]);
  }
  if(delta!=null&&Math.abs(delta)>=20){
    const d=w2One(Math.abs(delta)),dir=delta>0?"higher":"lower",changeRows={
      "walter-mercer":[
        team+" moved "+d+" points "+dir+" than its Week 1 total. A swing that large changes the two-week read more than a routine depth statistic would.",
        "The team total shifted by "+d+" points from the opener, "+dir+" in Week 2. That is large enough to treat as a real change in output.",
        "Week 2 finished "+d+" points "+dir+" than Week 1 for "+team+". That is the week-over-week number worth keeping.",
        team+" changed its scoring level by "+d+" points from the opener. At that size, the move belongs in the story."
      ],
      "tess-delaney":[
        "The "+w2Alias(t).mascot+" changed the room by "+d+" points from the opener, finishing "+dir+" this time. That is too large a swing to call decorative.",
        "Week 2 moved "+d+" points "+dir+" than Week 1 for "+team+". Even the tablecloth notices a change that large.",
        "The scoreboard shifted "+d+" points from the opener. For the "+w2Alias(t).mascot+", that is a new silhouette rather than a wrinkle.",
        team+" landed "+d+" points "+dir+" than a week ago. The room genuinely changed shape."
      ],
      "mack-hollis":[
        team+" swung "+d+" points "+dir+" from Week 1. That is large enough to change the argument about what this lineup can produce.",
        "A "+d+"-point move from the opener is the week-over-week number that matters for "+team+". The scoreboard got materially "+dir+".",
        "Week 2 shifted "+team+" by "+d+" points from its opener. That is loud enough to make the trend page.",
        team+" changed its weekly output by "+d+" points. That is the swing worth shouting about."
      ],
      "nora-voss":[
        team+" moved "+d+" points "+dir+" from Week 1. Rivals do not need a fake trend when the scoreboard already changed that much.",
        "The two-week scoring gap is "+d+" points for "+team+". That is real movement, not a punch line built from rounding error.",
        "Week 2 landed "+d+" points "+dir+" than the opener. That gives "+team+" an actual trend to argue about.",
        team+" shifted "+d+" points from Week 1. The result changed, but so did the scoring level enough to matter."
      ]
    };
    out.push((changeRows[rid]||changeRows["walter-mercer"])[v]);
  }
  return out.slice(0,1)
}
const w2OpeningVariantsUsed=new Map();
function w2OpeningVariant(t,r,count){
  const rid=String(r?.id||"walter-mercer"),key=rid+"|"+String(count),used=w2OpeningVariantsUsed.get(key)||new Set(),
    base=w2Hash(String(t?.team_name||"")+"|"+rid+"|opening")%count;
  let pick=base;
  for(let step=0;step<count;step++){const candidate=(base+step)%count;if(!used.has(candidate)){pick=candidate;break}}
  used.add(pick);w2OpeningVariantsUsed.set(key,used);return pick
}
function w2OpeningHook(t,r,won,margin,opp,top){
  const a=w2Alias(t),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(opp),star=top?.[0]?.name||team,
    rid=String(r?.id||"walter-mercer"),tight=margin<=6,wide=margin>=25;
  const rows={
    "walter-mercer":[
      won?star+" gave "+team+" the performance it needed, and the rest of the lineup supplied enough answers to make it count.":foe+" found the part of "+team+" that still needs fixing, and a "+w2One(margin)+"-point loss made the flaw impossible to hide.",
      won?(tight?team+" survived a Week 2 finish with no room for decorative points; every useful starter had to matter.":team+" controlled enough of Sunday that the final margin never needed a rescue mission."):team+" spent too much of Week 2 chasing "+foe+" instead of forcing the matchup onto its own terms.",
      won?team+" finally looked like a roster whose useful pieces know how to arrive on the same Sunday.":team+" did not need a miracle to beat "+foe+"; it needed more ordinary production in too many ordinary places.",
      won?"The "+a.mascot+" beat "+foe+" without asking one player to impersonate the entire roster.":"The "+a.mascot+" leave Week 2 with a problem specific enough to fix and visible enough that pretending otherwise would be expensive.",
      won?(wide?team+" turned Week 2 into an afternoon where the only suspense was how rude the margin would become.":star+" set the pace and "+team+" found just enough company behind him to keep "+foe+" from stealing it."):wide?foe+" did not expose one crack in "+team+"; it found enough of them to make the final margin look like an inspection report.":team+" stayed close enough to "+foe+" that every quiet starter now has a Monday appointment.",
      won?team+" put together the kind of Sunday that makes roster construction look smarter in retrospect.":team+" has useful pieces, but Week 2 showed how quickly a few quiet slots can turn those pieces into wasted decoration.",
      won?"Week 2 gave "+team+" a result worth trusting a little more because the win came from multiple useful answers, not one emergency flare.":foe+" made "+team+" pay for every lineup spot that tried to disappear into the wallpaper.",
      won?"The "+a.mascot+" left Sunday with a win and, more importantly, a lineup shape that did not require an alibi.":"The "+a.mascot+" have a clean Week 3 assignment now: keep the parts that worked and stop subsidizing the ones that did not."
    ],
    "tess-delaney":[
      won?"The "+a.mascot+" finally gave the room something worth applauding without asking the waiter for qualifications.":foe+" arrived, disturbed the table setting and left the "+a.mascot+" with a stain that will not come out by complimenting the linen.",
      won?star+" was the centerpiece, but the "+a.mascot+" won because the rest of the table did not collapse around him.":"There was nothing elegant about this loss, which at least means the cleanup instructions can fit on one card.",
      won?"For one Sunday, the "+a.mascot+" looked expensive in the flattering way.":"The good china can stay in the cabinet; the "+a.mascot+" have football work to do before appearances matter again.",
      won?"Week 2 fit the "+a.mascot+" considerably better than the opener, and nobody had to tug at the seams.":"Week 2 was an ill-fitting afternoon for the "+a.mascot+", and "+foe+" had the good manners to point out every seam.",
      won?(wide?"The "+a.mascot+" did not host a football game so much as a private demonstration of who owned the dining room.":"The "+a.mascot+" got through dinner with the silverware still on the table and the better number on the bill."):tight?"The "+a.mascot+" lost a dinner check by "+w2One(margin)+" points, which is how every small mistake suddenly becomes the expensive bottle nobody remembers ordering.":"The "+a.mascot+" spent Sunday serving courses "+foe+" was much happier to eat.",
      won?"The room finally matched the wardrobe: enough polish, enough substance, and a final score that did not ruin the photograph.":"The "+a.mascot+" dressed for a better evening than the one "+foe+" actually gave them.",
      won?star+" brought the centerpiece and, shockingly, several teammates remembered dinner requires more than one plate.":foe+" left the "+a.mascot+" staring at a table where too many chairs had technically been occupied and practically been empty.",
      won?"The "+a.mascot+" earned dessert this week. The next question can wait until somebody clears the glasses.":"The bill is already paid: "+foe+" won, and the "+a.mascot+" now get a week to decide which place settings were decorative."
    ],
    "mack-hollis":[
      won?star+" kicked the door in and the "+a.mascot+" made sure the rest of the lineup followed him through it.":foe+" put the "+a.mascot+" on the wrong side of the headline, and there is no quiet font for a "+w2One(margin)+"-point loss.",
      won?"The "+a.mascot+" finally gave us the loud Sunday this roster keeps threatening to have.":"The "+a.mascot+" got exposed in enough places that Week 3 does not need a mystery—just a toolbox.",
      won?"This is the kind of win that makes the league chat scroll back up and check what just happened.":"Everybody saw where the "+a.mascot+" cracked, including managers who were not even trying to scout them.",
      won?"The scoreboard got loud early enough that "+foe+" spent the afternoon answering the "+a.mascot+" instead of writing the script.":"The worst part for the "+a.mascot+" is not the loss; it is how many weak spots volunteered for the headline.",
      won?(wide?team+" hit Week 2 like somebody had taped the accelerator down.":team+" found just enough live wires to keep "+foe+" from cutting the power."):tight?team+" lost close enough that every quiet starter can hear the replay machine warming up.":foe+" kept landing punches while "+team+" waited for too many lineup spots to swing back.",
      won?team+" put together a Sunday with enough noise from enough directions that nobody could mute the whole thing.":team+" had some useful noise, but "+foe+" found the dead outlets and charged rent.",
      won?"The "+a.mascot+" got a win without asking the same hero to save every paragraph of the box score.":"The "+a.mascot+" do not need an autopsy montage; the bad numbers are already standing under bright lights.",
      won?"Week 2 gave "+team+" a headline it can actually hang on the wall.":"Week 2 ended with "+team+" behind "+foe+" by "+w2One(margin)+" fantasy points; the margin is the argument management must answer."
    ],
    "nora-voss":[
      won?"Week 2 made the "+a.mascot+" considerably harder to dismiss than anyone waiting on a quick collapse had planned.":"The "+a.mascot+" made the loss easy to criticize before the final whistle had even finished the paperwork.",
      won?star+" made the loudest argument, and the rest of the "+a.mascot+" kept the win from becoming a one-man rescue mission.":foe+" found the same soft spot every rival chat will now circle without being asked.",
      won?"Rival managers wanted a reason to call the "+a.mascot+" fake; Week 2 made them work for the screenshot.":"Rival managers do not need creativity this week—the "+a.mascot+" left the material sitting on the counter.",
      won?"The "+a.mascot+" won the game and stole a week of easy criticism.":"The "+a.mascot+" lost, and the annoying part is that the explanation does not require a conspiracy thread.",
      won?(wide?team+" won loudly enough that the rival chat had to change subjects before halftime was metaphorically over.":team+" left "+foe+" just enough room to talk and then took the final score away from them."):tight?team+" lost by "+w2One(margin)+", which means every rival with a calculator suddenly thinks it has a journalism degree.":foe+" gave the rival thread a final score and "+team+" supplied the captions.",
      won?team+" put enough useful performances on the page that rivals had to scroll for softer material.":team+" gave rivals a few respectable lines to ignore and several much easier targets to enjoy.",
      won?"The "+a.mascot+" made Week 2 deeply inconvenient for anyone waiting on a collapse; the final score gave them nothing useful.":"The "+a.mascot+" spent Week 2 supplying rival ammunition at wholesale prices.",
      won?"The rival receipts are less funny when the "+a.mascot+" are the ones holding the win.":"The "+a.mascot+" leave Sunday with a loss and a week of notifications they should probably mute on purpose."
    ]
  };
  const bank=rows[rid]||rows["walter-mercer"],v=w2OpeningVariant(t,r,bank.length);
  return bank[v]
}
function w2SentimentRead(t,prev,r,fs,prevSent,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),record=w2Record(t),
    star=(t.starter_details||[])[0],weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],
    miss=t.best_lineup_miss,gap=Number(miss?.gap)||0,margin=Math.abs(Number(t.points)-Number(t.opponent_points)),
    benchIssue=miss?.reserve&&miss?.starter&&gap>=Math.max(4,margin*.5),v=w2Cohort(t)%4,
    wins=Number(t?.league_context?.record?.wins)||0,losses=Number(t?.league_context?.record?.losses)||0,
    focus=benchIssue
      ?miss.reserve.name+" sitting behind "+miss.starter.name+" despite a "+w2One(gap)+"-point edge"
      :weak?weak.name+" giving the lineup only "+w2One(weak.points)
      :star?star.name+" carrying the loudest Week 2 score"
      :"the Week 2 lineup";
  const lastTwo=(t?.league_context?.recent_games||[]).slice(-2),lastWins=lastTwo.filter(g=>g.result==='W').length,lastLosses=lastTwo.filter(g=>g.result==='L').length;
  const state=lastTwo.length===2&&lastWins===2?"rolling":lastTwo.length===2&&lastLosses===2?"sinking":won?"rebounding":"split";
  const rows={
    "walter-mercer":{
      rolling:[
        "At 2-0, "+team+" fans have graduated from cautious optimism to screenshotting the standings. The sober argument underneath the victory laps is "+focus+"; supporters want the weak spot fixed before a better opponent finds it.",
        "The "+a.mascot+" crowd is already treating 2-0 like permission to raise expectations. Jerseys are getting worn a little louder, but the lineup debate still circles "+focus+".",
        "Two wins have "+team+" supporters comparing playoff paths instead of survival plans. The one item keeping the celebration useful is "+focus+", because good records make preventable holes less charming.",
        "The "+a.mascot+" fan forum has moved from 'nice start' to irresponsible levels of confidence. Even the optimists keep returning to "+focus+" before they start printing anything resembling parade routes."
      ],
      sinking:[
        "At 0-2, "+team+" fans are no longer submitting polite suggestions. The message boards have reached mock-pitchfork status, panic memes are circulating, and bench demands have acquired the confidence of official policy over "+focus+". Another repeat would turn lineup criticism into a weekly ritual.",
        "The "+a.mascot+" crowd is 0-2 and already holding imaginary emergency meetings. "+focus+" is the motion on the floor, with patience losing the vote by a landslide.",
        "Two losses have supporters replaying lineup screenshots like security footage while the fan forum stages a small panic parade. The recurring argument is "+focus+", and Week 3 is where management either changes it or hears about it all week.",
        "At 0-2, nobody around "+team+" is asking for inspirational quotes. Fans are demanding a visible answer to "+focus+" before the complaint becomes the franchise hobby."
      ],
      rebounding:[
        "The win has "+team+" fans deleting at least a few Week 1 complaints, though nobody deleted the receipts. "+focus+" is still the argument supporters are carrying into Week 3.",
        "The "+a.mascot+" crowd responded to the rebound by upgrading from panic to cautious swagger. The remaining lineup war is about "+focus+".",
        "One win after the opener has fans taking victory laps with an asterisk-sized memory. Supporters are celebrating the response while still circling "+focus+" in next week’s lineup.",
        "The Week 2 win cooled the "+team+" complaint line, not the entire building. Fans are keeping "+focus+" on the agenda in case the problem tries to return."
      ],
      split:[
        "At 1-1, "+team+" fans have entered the most dangerous phase of fandom: everybody has one week of evidence for whatever they already believed. The loudest lineup argument is "+focus+".",
        "The "+a.mascot+" crowd is split enough to turn every lineup screenshot into a referendum. "+focus+" is where the optimists and doom merchants keep colliding.",
        "One win and one loss have supporters running dueling victory laps and autopsies. Both sides keep landing on "+focus+" as the Week 3 pressure point.",
        "At 1-1, the fan base has not chosen between parade planning and furniture burning jokes. The practical argument is "+focus+", which at least gives the noise a football point."
      ]
    },
    "tess-delaney":{
      rolling:[
        "The 2-0 "+a.mascot+" room has started making reservations under 'contender,' which is adorable this early. Between toasts, supporters keep arguing over which names deserve the expensive chairs around "+focus+".",
        "Two wins have the "+a.mascot+" public wearing confidence like it was tailored. The one loose thread everybody keeps tugging is "+focus+".",
        "The "+a.mascot+" room is already polishing glasses for a 2-0 toast, but even the happy table keeps gossiping about "+focus+".",
        "At 2-0, supporters have put the good china out without being asked, victory screenshots are making the rounds, celebratory memes are multiplying, and lineup polls have already become a minor civic institution. The only chair still getting side-eye belongs to "+focus+"."
      ],
      sinking:[
        "The 0-2 "+a.mascot+" room has stopped pretending this is a tasteful inconvenience. Supporters are already demanding a different table around "+focus+", and somebody is about to lose a chair.",
        "Two losses have stripped the room of its indoor voice. "+focus+" is the seating dispute everyone is bringing to the Week 3 reservation.",
        "At 0-2, the good china is back in storage and the complaint cards are multiplying. Most of them somehow mention "+focus+".",
        "The "+a.mascot+" public is one bad Sunday from replacing the seating chart with a fire-exit map. "+focus+" is the problem nobody can leave at coat check."
      ],
      rebounding:[
        "A response win has the "+a.mascot+" room accepting apologies it never formally requested. Supporters are toasting the rebound while quietly moving "+focus+" to a different chair.",
        "The win restored manners around "+team+", temporarily. The remaining dinner-table argument is "+focus+".",
        "Week 2 let the "+a.mascot+" public put the tablecloth back on. Fans still keep checking whether "+focus+" is about to spill something on it.",
        "The room is enjoying the rebound without forgiving the opener entirely. "+focus+" remains the topic that keeps surviving dessert."
      ],
      split:[
        "At 1-1, the "+a.mascot+" room cannot decide whether to order champagne or ask for the check. Naturally, everybody agrees to argue about "+focus+" instead.",
        "One win and one loss have supporters swapping seats between optimism and suspicion. "+focus+" is the place setting nobody can stop adjusting.",
        "The "+a.mascot+" public is perfectly divided and therefore twice as loud. The argument over "+focus+" has become the table’s centerpiece.",
        "At 1-1, nobody has earned the right to be smug, which has not stopped the room from trying. "+focus+" is where the manners disappear first."
      ]
    },
    "mack-hollis":{
      rolling:[
        "The "+a.mascot+" are 2-0 and the fan base has discovered the caps-lock key. Victory memes are multiplying, but the call-in show still keeps hammering "+focus+".",
        "Two wins have "+team+" fans yelling 'we are so back' at medically inadvisable volume. Then somebody posts the lineup screenshot and the argument goes straight to "+focus+".",
        "At 2-0, the "+a.mascot+" crowd is already doing playoff math with two weeks of evidence and zero shame. "+focus+" is the only thing keeping the speakers from blowing out completely.",
        "The victory laps are getting reckless around "+team+". Fans are happy, loud and still demanding an answer to "+focus+" before Week 3 ruins the party."
      ],
      sinking:[
        "The "+a.mascot+" are 0-2 and the complaint line has melted through the desk. Fans are yelling about "+focus+" like the lineup card personally keyed their car.",
        "Two losses have "+team+" supporters in full mock-riot mode: memes, bench demands, and enough caps lock to qualify as weather. "+focus+" is the loudest target.",
        "At 0-2, nobody wants another speech. The fan base wants "+focus+" fixed, benched, moved or launched into the sun metaphorically before Week 3.",
        "The "+a.mascot+" crowd has gone from concern to sirens. "+focus+" is the part of the lineup everybody is pointing at while management pretends not to hear the megaphone."
      ],
      rebounding:[
        "The win turned the volume from emergency siren to obnoxious victory song. Fans are celebrating and still yelling about "+focus+" because apparently joy needs a side argument.",
        team+" won, so half the angry posts got deleted before breakfast. The surviving screenshots all seem to circle "+focus+".",
        "The response win bought the "+a.mascot+" crowd one week of swagger. It did not buy "+focus+" immunity from the call-in show.",
        "Week 2 gave supporters something to celebrate and something to keep screaming about. Naturally, the second thing is "+focus+"."
      ],
      split:[
        "At 1-1, the "+a.mascot+" crowd is running simultaneous parade and panic channels. Both somehow end up yelling about "+focus+".",
        "One win, one loss, and absolutely no shortage of opinions. The lineup screenshot getting passed around has "+focus+" circled hard enough to dent the screen.",
        "The fan base is split, which means twice the podcasts and none of the certainty. "+focus+" is the one argument everybody keeps recycling.",
        "At 1-1, "+team+" supporters have enough evidence to fight each other but not enough to settle anything. "+focus+" is the current shouting match."
      ]
    },
    "nora-voss":{
      rolling:[
        "At 2-0, "+a.mascot+" supporters are collecting rival receipts like coupons. The annoying part for them is "+focus+" still gives the other side one joke worth keeping.",
        "Two wins have fans weaponizing screenshots in every rival chat they can find. Then somebody mentions "+focus+" and the swagger develops a small limp.",
        "The "+a.mascot+" are 2-0, so supporters have become professionally unbearable on schedule. "+focus+" is the only rival punch line still surviving quality control.",
        "The victory receipts are flying around the rival thread. Fans are enjoying them, while quietly hoping "+focus+" does not give rivals a sequel."
      ],
      sinking:[
        "At 0-2, the rival chats are doing free comedy and "+a.mascot+" fans are replying with increasingly desperate lineup edits. Most of them start with "+focus+".",
        "Two losses have supporters muting rival notifications, posting increasingly desperate lineup screenshots, and unmuting the bench debate. "+focus+" is the joke they are desperate to retire before Week 3.",
        "The "+a.mascot+" crowd has reached the stage where every rival meme feels personally researched. "+focus+" is the easiest punch line and fans know it.",
        "At 0-2, supporters are fighting on two fronts: the lineup and everybody else’s timeline; rival memes are piling up while bench demands arrive like junk mail. "+focus+" is losing both battles."
      ],
      rebounding:[
        "The win gave "+a.mascot+" fans a fresh screenshot to throw at rivals. They are using it enthusiastically while pretending "+focus+" has disappeared.",
        "Supporters finally got a rebuttal worth posting. The problem is rivals can still answer with "+focus+", so the argument is not finished.",
        "The response win has fans chirping again, which is healthier than hiding. "+focus+" remains the one reply they do not have a clean answer for.",
        "The "+a.mascot+" crowd is back in rival chats after the win. "+focus+" is the tab they hope nobody else opens."
      ],
      split:[
        "At 1-1, supporters and rivals can each cherry-pick a Sunday and feel brilliant. "+focus+" is the one argument neither side has managed to kill.",
        "The "+a.mascot+" crowd is split between swagger and damage control. Rivals keep steering both conversations back to "+focus+".",
        "One win and one loss have produced equal parts receipts and ammunition. "+focus+" is where the rival jokes still find oxygen.",
        "At 1-1, nobody owns the argument. That has not stopped supporters and rivals from treating "+focus+" like the deciding exhibit in the rival thread."
      ]
    }
  };
  return ((rows[rid]||rows["walter-mercer"])[state]||rows["walter-mercer"].split)[v]
}
function w2SentimentFollowup(t,prev,r,fs,prevSent,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),
    star=(t.starter_details||[])[0],weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],
    miss=t.best_lineup_miss,gap=Number(miss?.gap)||0,v=(w2Cohort(t)+1)%4,
    subject=miss?.reserve&&miss?.starter&&gap>=5
      ?miss.reserve.name+" sitting behind "+miss.starter.name
      :won?(star?.name||"the top of the lineup"):(weak?.name||"the quietest starter");
  const rows={
    "walter-mercer":[
      "Supporters have moved from the final score to screenshots of "+subject+". The optimists call it fixable; the pessimists are saving the image in case they need it next Sunday.",
      "The fan reaction has settled into two camps: people celebrating what worked and people asking why "+subject+" survived the lineup review. Neither side appears interested in lowering its voice.",
      "The message boards are treating "+subject+" as the week’s referendum. The jokes are cheap after a win and considerably more researched after a loss.",
      "Fans are already rewriting their preferred lineup around "+subject+". The calm version is a suggestion. The louder version has somehow acquired bullet points."
    ],
    "tess-delaney":[
      "The room has moved on from the final score and started arguing about who still deserves a chair beside "+subject+". Half the table calls it housekeeping; the other half is already asking for the manager.",
      "Supporters are passing the seating chart around like a menu with one item circled in red: "+subject+". The room would like proof that somebody learned something from Sunday.",
      "The complaint cards all seem to mention "+subject+". Even the happy tables have started folding them neatly beside the silverware.",
      "Fans have turned "+subject+" into the room’s favorite piece of gossip. It is funny now; another Sunday of the same thing and somebody starts moving furniture."
    ],
    "mack-hollis":[
      "The fan base has screenshots, memes and exactly one volume setting about "+subject+". Nobody needs a siren yet, but the siren has been located.",
      "Supporters are doing what supporters do best: turning "+subject+" into twelve different lineup arguments and one extremely loud thread.",
      "The call-in crowd has "+subject+" circled so hard the screen may file a complaint. Some of it is comedy. Some of it is management getting free advice at dangerous volume.",
      "The memes are already built around "+subject+". If the issue disappears, everybody laughs and moves on. If it stays, the joke gets a season ticket.",
      "A rival account is auctioning screenshots of "+subject+" as evidence of managerial negligence. Bidding is brisk because complaining remains free.",
      "The group chat has called a mock emergency meeting over "+subject+". Minutes were taken in all caps; the decision was to yell again next Sunday.",
      "Fans have submitted "+subject+" to the Department of Extremely Avoidable Sundays. The paperwork is fictional. The embarrassment is on the scoreboard.",
      "Somebody printed "+subject+" on a protest placard. Management may want a better lineup before supporters invest in matching shirts.",
      "The call-in show is running a public inquiry into "+subject+". Nobody has subpoena power, but everyone has a screenshot and a microphone.",
      "There is a neighborhood petition to retire "+subject+" as a recurring joke. The signatures are mostly from people who started the joke.",
      "The fan base wants "+subject+" explained on a giant video board. Apparently the 30-person group chat did not offer enough public humiliation.",
      "The crowd has a fresh nickname for "+subject+" and management will not enjoy hearing it shouted from rival sections."
    ],
    "nora-voss":[
      "Rival chats keep returning to "+subject+" because it is the easiest material available. Supporters are responding with lineup screenshots, excuses and the occasional respectable counterargument.",
      "Fans have started hoarding receipts around "+subject+". If the choice works next time, those receipts become weapons; if it does not, rivals get free recycling.",
      "The rival thread has "+subject+" bookmarked. Supporters know exactly which joke they are tired of hearing, which is usually how a lineup debate graduates into a weekly ritual.",
      "Supporters are trying to retire the joke around "+subject+" before rivals turn it into a franchise logo. The internet, as always, is showing admirable restraint by showing none."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[rid==='mack-hollis'?(Math.max(1,Number(t.roster_id)||1)+Number(week)+Number(variationSalt||0))%12:v]
}
// Forward editions use independently selected fan scenes.  The Week 2 bank
// remains untouched for locked editions; bench screenshots are one possible
// subject, not the mandatory premise of every fan reaction.
function forwardFanScenes(t,won,week,variationSalt){
 const name=w2DisplayTeam(t.team_name),a=w2Alias(t),leader=(t.starter_details||[]).slice().sort((x,y)=>Number(y.points||0)-Number(x.points||0))[0],
  low=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],
  miss=t.best_lineup_miss,record=w2Record(t),points=w2One(t.points),
  opponent=w2DisplayTeam(t.opponent_name||'the opposition'),next=w2DisplayTeam(t.next_opponent_name||'the next opponent'),
  star=leader?.name||'the leading scorer',starPts=w2One(leader?.points),
  danger=low?.name||'the quietest starter',dangerPts=w2One(low?.points),
  gap=w2One(miss?.gap),choice=miss?.reserve&&miss?.starter&&Number(miss.gap)>=7
   ?miss.reserve.name+' outscoring the selected '+miss.starter.name+' by '+gap+' points'
   :null;
 const celebration=won?'celebrating a '+points+'-point victory':'trying to explain a '+points+'-point loss';
 const scenes=[
  ["The "+a.mascot+" faithful are "+celebration+" with the restraint of a marching band in a library. "+star+" put up "+starPts+"; that number is doing more work than any slogan on the merchandise.","A few supporters have already designed the parade route. Others want to see what happens against "+next+" before renting the bus. For once, both camps can point to an actual box score."],
  ["The supporters' call-in show has been promoted to a three-hour civic emergency over "+name+" at "+record+". The first caller cited "+danger+" and "+dangerPts+" points; the second demanded a different microphone because that one sounded too optimistic.","The front office can ignore the volume. It cannot ignore the weekly result against "+opponent+", which is why the callers have another six days of material."],
  ["Someone in the "+a.mascot+" section brought a homemade trophy to the game. "+(won?'After the win, nobody asked for the receipt.':'After the loss, it became an extremely expensive drink holder.')+" "+star+" and "+starPts+" points are the part of the story fans can actually defend.","The real argument is whether the rest of the lineup can back that performance up against "+next+". The props department has already done its share."],
  ["Fans are holding an imaginary town-hall meeting about a "+points+"-point Sunday. "+(won?'The motion to declare a dynasty passed unanimously and was immediately challenged.':'The motion to replace the entire lineup was ruled financially irresponsible.')+" Nobody has stopped arguing about "+danger+" at "+dangerPts+".","Rival supporters are delighted to offer advice without offering a single roster spot. The next result will decide whether this meeting gets adjourned or televised."],
  ["The "+a.mascot+" group chat has switched from game updates to absurdly elaborate weather forecasts: "+(won?'sunshine, confetti, and a chance of irrational confidence.':'storm clouds, emergency umbrellas, and a high probability of yelling at the television.')+" The actual forecast is "+record+" in the standings.","That record is more stubborn than the memes. "+star+" supplied "+starPts+" points; somebody still has to turn the rest of the roster into a convincing reply next week."],
  ["The stadium concession stand could sell "+(won?'champagne by the gallon':'stress balls by the truckload')+" after what "+name+" just put on the scoreboard. "+(won?'A victory tends to make even bad hot dogs taste heroic.':'The only thing moving faster than the complaint line is the refund fantasy.') ,"The joke has a football target: "+danger+" managed "+dangerPts+" while the team finished at "+points+". A new menu will not repair that gap."],
  ["The neighborhood fan club has made "+name+"'s "+record+" record the subject of a completely unnecessary public referendum. "+(won?'The optimists are already printing victory posters.':'The pessimists brought pitchforks made of cardboard and very real questions.')+" "+star+" gave them "+starPts+" points of evidence.","The loudest argument is still about how the other lineup spots will answer "+next+". At least the ballot can be settled by playing the game."],
  ["Fans spent Monday treating "+name+"'s result like a family wedding: "+(won?'everybody danced, nobody agreed on who deserved the microphone.':'the speeches were awkward and somebody blamed the seating arrangement.')+" "+points+" points against "+opponent+" is the one detail nobody can edit out of the photographs.","The useful conversation starts with "+star+" scoring "+starPts+" and ends with what has to change before "+next+". Everything between is catering criticism."],
  (Number(week)<5?["The supporters have sent "+(won?'a thank-you card the size of a billboard':'a complaint letter with its own table of contents')+" to the "+a.mascot+" headquarters. "+danger+" at "+dangerPts+" is the figure underlined in red ink.","The office does not owe anybody a theatrical apology. It owes the next opponent a lineup that is harder to ridicule than this one."]:["Supporters watched "+star+" score "+starPts+" for "+name+" while "+danger+" delivered "+dangerPts+". "+star+" took the applause, and "+danger+" gave the same crowd a reason to keep asking lineup questions.",([
    star+" delivered "+starPts+"; "+danger+" spectacularly underdelivered "+dangerPts+".",
    star+" contributed "+starPts+"; "+danger+" conspicuously managed "+dangerPts+".",
    star+" produced "+starPts+"; "+danger+" painfully supplied "+dangerPts+".",
    star+" registered "+starPts+"; "+danger+" awkwardly returned "+dangerPts+".",
    star+" posted "+starPts+"; "+danger+" disappointingly contributed "+dangerPts+".",
    star+" finished "+starPts+"; "+danger+" conspicuously finished "+dangerPts+".",
    star+" contributed "+starPts+"; "+danger+" embarrassingly supplied "+dangerPts+".",
    star+" posted "+starPts+"; "+danger+" ominously managed "+dangerPts+"."
  ][Number(t.roster_id)%8])]),
  ["The victory-or-panic meter in the "+a.mascot+" bars has broken its needle "+(won?'on the happy side':'on the unhappy side')+". With "+record+" in the season ledger, pretending this is all one unlucky bounce is becoming a risky business model.","A realistic fan can applaud "+star+" for "+starPts+" and still ask what "+next+" might exploit. That is analysis; the rest of the bar is providing percussion."],
  ["The "+a.mascot+" faithful have invented a mock holiday to commemorate this game. "+(won?'Fireworks were proposed before anyone checked the permit situation.':'The invitation says black attire and includes a diagram of the weakest lineup slot.')+" "+points+" points is the number on the invitation.","The celebration or mourning cannot substitute for "+star+' at '+starPts+". The team gets "+next+" next, and the fireworks budget will be revised accordingly."],
  ["The radio station covering "+name+" has declared its phone lines a public utility after that "+points+"-point showing. "+(won?'The callers are competing to invent the grandest compliment.':'The callers are competing to invent the most expensive possible solution.')+" "+star+" at "+starPts+" remains the one indisputable contribution.","The station can turn the volume down for "+next+". The lineup cannot afford to."],
  ["The "+a.mascot+" fan club has opened a mock museum for this week's result. "+(won?'The first exhibit is a victory banner made from old predictions.':'The first exhibit is an empty display marked Where Were the Points?')+" "+record+" is printed at the entrance for context.","Visitors are arguing over "+danger+" at "+dangerPts+" rather than the gift shop. Even an imaginary museum cannot curate the weak spots away."],
  ["A supporter has commissioned a giant cake in the shape of "+name+"'s scoreboard. "+(won?'Nobody objects to dessert after a win.':'Nobody is sure whether to serve it or throw it at a screen.')+" "+points+" is written in frosting and remains the real number.","The next opponent, "+next+", has no obligation to follow the recipe. The fans can bake; the team has to score."],
  ["The "+a.mascot+" supporters have started an unofficial noise competition with the rival fans. "+(won?'A win gave them a head start nobody can buy.':'The other side has the scoreboard and therefore the cruelest microphone.')+" "+star+" scored "+starPts+", which is louder than the merchandise slogans.","This crowd can keep shouting, but "+record+" is the season record that will travel with them to "+next+"."],
  ["Someone is organizing a mock victory parade or protest march for "+name+", depending on which side of the "+points+"-point result they remember first. The permit request reportedly lists "+danger+" at "+dangerPts+" as the official reason for concern.","That is ridiculous civic theater, but the starter's score is real. The next matchup with "+next+" will reveal whether it deserves a sequel."]
 ];
 // Every roster must have its own scene in a 32-team issue. A 16-scene
 // bank repeated exactly twice per issue and the normalization audit caught it.
 // These additional independent scenes are anchored in the current scoreboard.
 scenes.push(
  ["Outside the "+a.mascot+" supporters' club, the chalkboard has only two numbers: "+points+" and "+dangerPts+". Somebody added a third column labeled patience, but nobody could agree what belonged there.","The first argument was about "+danger+". The second was whether "+next+" will be generous enough to allow the same mistake. Nobody volunteered to test that theory."],
  ["The neighborhood watch has politely declined jurisdiction over "+name+"'s starting decisions. "+star+"'s "+starPts+" points are evidence of what worked, while the rest of the scoreboard is a less convincing witness.","Fans are not asking for a criminal inquiry. They are asking the next lineup to look like somebody reviewed the last one."],
  ["The "+a.mascot+" train platform has become an unofficial postgame press conference. Riders can recite "+points+" without checking their phones, and "+dangerPts+" has become a number people mutter at the timetable.","The trip to the next matchup with "+next+" is not getting shorter. Supporters would settle for the lineup making it less unpleasant."],
  ["An imaginary "+a.mascot+" civic budget has allocated every available dollar to explaining "+danger+"'s "+dangerPts+" points. The treasury department insists no actual taxpayer funds were harmed.","People can laugh at the accounting until "+next+" arrives. A repeat will be less amusing, and considerably harder to defend."],
  ["The fan podcast opened with ten seconds of silence for "+name+"'s weakest position. That was followed by thirty minutes on "+star+"'s "+starPts+" points and an argument over who gets to call that progress.","The hosts disagree about almost everything. Even they know the next opponent will care more about the starting lineup than the episode title."],
  ["At the "+a.mascot+" tailgate, one group raised a toast to "+points+" points while another kept asking about "+danger+" and "+dangerPts+". The two circles have agreed to share the grill but not their conclusions.","The peace treaty lasts until "+next+" appears on the schedule. Fans are already reserving the louder picnic table."],
  ["A fan-made "+a.mascot+" scoreboard mural now shows "+star+" on one side and "+danger+" on the other. The artist gave each the same amount of wall space, which is more equality than their "+starPts+" and "+dangerPts+" points earned.","The debate is artistic only in the loosest sense. The manager gets another Sunday to make the picture less lopsided."],
  ["The "+a.mascot+" supporters called a mock zoning hearing to decide whether "+points+" points qualifies as a safe structure. "+(won?"Approval was granted with a noisy parade clause.":"Inspectors demanded that the weakest starter be reinforced immediately."),"Nobody has filed actual paperwork, but "+next+" will conduct the next inspection for free."],
  ["The team's unofficial fan librarian has placed "+name+"'s latest result in the reference section, right beside the volume nobody wants checked out: "+danger+"'s "+dangerPts+" points.","The club can argue over the classification system all week. The upcoming game with "+next+" will add a new chapter regardless."],
  ["Somebody at the "+a.mascot+" gathering issued a commemorative stamp for "+star+"'s "+starPts+" points. The same committee refused to print one for the rest of the lineup.","A postage stamp cannot carry a roster. Supporters know the next envelope addressed to "+next+" needs considerably more than one scorer."],
  (Number(week)<5?["A mock "+a.mascot+" weather bureau called the "+points+"-point finish a pressure system. Fans are divided over whether "+danger+"'s "+dangerPts+" counts as a passing shower or a recurring climate problem.","The forecast for "+next+" requires no professional meteorologist: the manager must actually change something if the cloud follows the same starter."]:["Fans of "+name+" watched "+danger+" finish on "+dangerPts+" while "+star+" posted "+starPts+". That gap is why "+danger+" keeps appearing in the postgame conversation instead of the victory montage.",star+" cannot score "+danger+"\'s points against "+next+". "+name+" needs a lineup decision rather than a weather forecast."]),
  ["The "+a.mascot+" crowd drew a seating chart for the weekly argument and put "+star+"'s "+starPts+" points at the head. "+danger+"'s "+dangerPts+" received a folding chair near the exit.","The chart is fiction. The scoring is not, and the upcoming matchup with "+next+" does not care where anybody sits."],
  ["One supporter has started a tiny "+a.mascot+" roadside attraction called The "+points+"-Point Sunday. Admission is free if visitors promise not to ask why "+danger+" finished on "+dangerPts+".","That rule lasted four minutes. The manager will have a harder time controlling the questions when "+next+" shows up."],
  ["The "+a.mascot+" block association voted to rename Monday after "+star+"'s "+starPts+" points. The motion stalled when the committee got to "+danger+" and discovered "+dangerPts+" points waiting in the minutes.","There is no ordinance to solve this. The next lineup is the only document anybody actually needs signed."],
  ["After "+name+"'s latest game, fans proposed an exhibit of useful excuses and found the display case almost empty. "+points+" points were on the board; "+danger+" contributed "+dangerPts+" to them.","That is the appeal of a box score: it does not accept a request for a better caption before the next game against "+next+"."],
  ["The "+a.mascot+" fan orchestra has a new conductor: "+star+" and "+starPts+" points. The rest of the musicians are being asked to rehearse after "+danger+" played a "+dangerPts+"-point solo nobody ordered.","Supporters will tolerate one rehearsal disaster. A second one against "+next+" gets reviewed by the entire neighborhood."]
 );
 // Alternate a full slate of football-first takes with the theatrical fan
 // scenes. This breaks the issue-wide habit of inventing a new mock public
 // institution for every team's reaction while retaining reporter sarcasm.
 if(Number(week)>=5&&Number(t.roster_id)%2===0){
  const footballAngles=[
   [name+' posted '+points+' points; '+record+' is where '+name+' stands after the final score, regardless of the spin.',star+' delivered '+starPts+'. Against '+next+', this roster needs a second answer with numbers rather than applause.'],
   [danger+' registered '+dangerPts+' for '+name+'. That is a score, not a clever excuse in search of a writer.','The first lineup question against '+next+' belongs to the manager. The box score has already submitted its testimony.'],
   [name+' and '+opponent+' finished their game. '+(won?'The win deserves credit, not instant sainthood.':'The defeat deserves scrutiny, not a documentary about bad luck.'),star+' produced '+starPts+' while '+danger+' supplied '+dangerPts+'. A manager who sees identical performances deserves the next result.'],
   ['At '+record+', '+name+' has a league position rather than a personality test. The scoreboard shows '+points+'.','The '+dangerPts+' from '+danger+' gives '+name+' a specific lineup question to resolve against '+next+'; '+danger+' needs a different answer than the scoreboard supplied.'],
   [star+' came through with '+starPts+' fantasy points for '+name+'. Compliments are free, but the number is earned.','The rest of the debate starts with '+danger+' at '+dangerPts+'. '+next+' is unlikely to hand out partial credit for good intentions.'],
   ['The line on '+name+' this week is '+points+' points against '+opponent+'. There is no appeals court for fantasy scores.','Supporters can debate the lineup all week; against '+next+' the only persuasive rebuttal will arrive in the scoring column.'],
   ['There is a difference between being optimistic about '+name+' and ignoring '+danger+' at '+dangerPts+'. The latter is an expensive hobby.',star+' did bring '+starPts+' to the argument. The task against '+next+' is to make that contribution less lonely.'],
   ['For '+name+', the record reads '+record+' and the latest total reads '+points+'. Those figures have never responded to a motivational speech.','If the same starting decisions travel to '+next+', the manager had better be prepared to defend them with a new result.'],
   [star+' supplied '+starPts+' on a '+points+'-point Sunday for '+name+'. That is the sort of labor a headline can fairly reward.',danger+' added '+dangerPts+'. There is a reason '+next+' will study both parts of the lineup, not only the flattering one.'],
   ['The optimism around '+name+' is understandable only to the extent that '+points+' and '+record+' support it.','A skeptic can cite '+danger+' at '+dangerPts+'; a believer can cite '+star+' at '+starPts+'. Next week provides the referee.'],
   ['Against '+opponent+', '+name+' earned the scoreboard figure '+points+'. Calling it destiny would be a terrible use of a calculator.',star+' and '+danger+' were separated by real production; '+next+' gets a chance to discover whether the manager noticed.'],
   ['The '+record+' line beside '+name+' is not a mood. It is a cumulative account of finished games.','The '+starPts+' from '+star+' belong on the positive side. The '+dangerPts+' from '+danger+' still demand a place in the manager’s next decision.'],
   ['There were '+points+' fantasy points on the '+name+' board. Anyone promising to fix the result retroactively should begin by inventing time travel.','The '+danger+' assignment now belongs to '+name+'\'s staff before '+next+'. A '+dangerPts+'-point output deserves a football explanation, not another press conference.'],
   [name+' has one useful advantage in the debate over '+opponent+': the game has already been scored at '+points+'.','The next opponent, '+next+', will not accept a better narrative in place of improved production from the starting lineup.'],
   ['For '+name+', '+star+' and '+starPts+' handed '+name+' a scoring highlight the staff will want to display.','The accompanying footnote is '+danger+' at '+dangerPts+'. Against '+next+', the footnote could become the headline if nothing changes.'],
   ['A supporter of '+name+' can cheer '+(won?'the victory':'the effort')+' without pretending '+record+' is a secret code for perfection.','The actual evidence is '+points+' against '+opponent+'. The next test against '+next+' is better suited to football than fortune-telling.']
  ];
  return footballAngles[Math.max(0,Math.floor((Number(t.roster_id)-2)/2))%footballAngles.length];
 }
 const index=(Math.max(0,Number(t.roster_id)||1)+Number(week)*7+Number(variationSalt||0))%(Number(week)<5?16:scenes.length);
 return scenes[index];
}

function w2RecapTradeParagraphs(teams,r){
  const seen=new Set(),trades=[];
  for(const t of teams||[])for(const tr of t.trade_history||[]){const id=String(tr?.id||"");if(!id||seen.has(id))continue;seen.add(id);trades.push(tr)}
  return trades.map((tr,i)=>{
    const sides=(tr?.sides||[]).map(side=>{
      const team=(teams||[]).find(t=>String(t.roster_id)===String(side.roster_id)),
        name=w2DisplayTeam(tr?.team_names?.[String(side.roster_id)]||team?.team_name||("Roster "+side.roster_id)),
        assets=team?w2TradeAssets(team,side):[],players=assets.filter(x=>!/\bpick$/i.test(x)),
        starters=team?.starter_details||[],
        scored=players.map(name=>starters.find(p=>p?.name===name)).filter(Boolean).sort((a,b)=>Number(b.points)-Number(a.points));
      return{name,team,side,assets,players,scored}
    }).filter(x=>x.assets.length);
    if(sides.length<2)return null;
    const [left,right]=sides,
      anchor=left.team||right.team||teams[0],
      terms=left.name+" received "+w2Natural(left.assets)+"; "+right.name+" received "+w2Natural(right.assets)+".",
      valueRead=w2TradeValueRead(anchor,r,left.side,right.side,right.name,left.assets,right.assets),
      immediate=sides.map(x=>{
        const hit=x.scored[0],score=hit?Number(hit.points):null;
        if(!Number.isFinite(score))return null;
        if(score>=12)return x.name+" already got "+w2One(score)+" Week 2 points from "+hit.name+", so the player side of the receipt produced immediately.";
        if(score>=6)return x.name+" got "+w2One(score)+" from "+hit.name+" in Week 2; useful enough to affect the first review, not enough to erase the price paid.";
        return x.name+" got only "+w2One(score)+" from "+hit.name+" this week, which gives the current-player side an early performance problem to answer.";
      }).filter(Boolean),
      context=sides.map(x=>{
        if(!x.team)return null;
        const rank=Number(x.team?.league_context?.standings_rank),m=x.team?.mida_outlook||{},play=Number(m.playoff);
        if(Number.isFinite(play))return x.name+" sits "+w2Record(x.team)+" with a "+w2MidaPct(play)+" MIDA playoff outlook, so the trade is attached to a roster that is still actively chasing something.";
        return x.name+" sits "+w2Record(x.team)+(rank?" at No. "+rank+" overall":"")+", so the price has to be judged against what that roster is trying to win now.";
      }).filter(Boolean);
    const body=[terms,valueRead,...immediate,context[i%Math.max(1,context.length)]].filter(Boolean).join(" ");
    return w2S(anchor,r,"recap-trade-detail-"+i,body)
  }).filter(Boolean)
}
function w2TransactionMoveDetails(t){
  return (t.transactions||[]).map(tx=>{
    const adds=(tx.adds||[]).map(id=>pname(String(id))).filter(Boolean),drops=(tx.drops||[]).map(id=>pname(String(id))).filter(Boolean),type=String(tx.type||"").toLowerCase();
    if(type==="trade"){
      const tr=(t.trade_history||[]).find(x=>String(x?.id||"")===String(tx?.id||""));
      if(tr){
        const own=(tr.sides||[]).find(x=>String(x?.roster_id)===String(t.roster_id)),other=(tr.sides||[]).find(x=>String(x?.roster_id)!==String(t.roster_id)),
          received=w2TradeAssets(t,own),sent=w2TradeAssets(t,other),otherName=w2DisplayTeam(tr?.team_names?.[String(other?.roster_id)]||"the other team");
        if(received.length&&sent.length)return "received "+w2Natural(received)+" in a trade with "+otherName+", sending "+w2Natural(sent)+" the other way";
        if(received.length)return "received "+w2Natural(received)+" in a trade with "+otherName;
      }
      if(adds.length&&drops.length)return "acquired "+w2Natural(adds)+" by trade and sent "+w2Natural(drops)+" the other way";
      if(adds.length)return "acquired "+w2Natural(adds)+" by trade";
      if(drops.length)return "moved "+w2Natural(drops)+" in a trade";
    }
    if(adds.length&&drops.length)return "added "+w2Natural(adds)+" and dropped "+w2Natural(drops);
    if(adds.length)return "added "+w2Natural(adds);
    if(drops.length)return "dropped "+w2Natural(drops);
    return null
  }).filter(Boolean)
}

function w2ValueMoverMethod(t,row){
  const id=String(row?.player_id||""),txs=(t.transactions||[]).filter(tx=>!tx?.status||String(tx.status).toLowerCase()==="complete");
  for(const tx of txs){
    const adds=(tx.adds||[]).map(String),drops=(tx.drops||[]).map(String),added=adds.includes(id),dropped=drops.includes(id);
    if(!added&&!dropped)continue;
    const type=String(tx.type||"").toLowerCase();
    if(type==="trade")return added
      ?{key:"trade-in-"+week,one:"after arriving in a Week "+week+" trade",many:"after arriving in Week "+week+" trades"}
      :{key:"trade-out-"+week,one:"after leaving in a Week "+week+" trade",many:"after leaving in Week "+week+" trades"};
    if(added&&type.includes("waiver"))return{key:"waiver-"+week,one:"after a Week "+week+" waiver claim",many:"after Week "+week+" waiver claims"};
    if(added&&type.includes("free"))return{key:"free-"+week,one:"after a Week "+week+" free-agent add",many:"after Week "+week+" free-agent adds"};
    if(added)return{key:"add-"+week,one:"after a Week "+week+" add",many:"after Week "+week+" adds"};
    return{key:"drop-"+week,one:"after being dropped in Week "+week,many:"after being dropped in Week "+week};
  }
  const acquired=(t.trade_acquisitions||[]).find(a=>String(a?.player_id||"")===id);
  if(acquired){
    const when=acquired?.season&&acquired?.week?"Week "+String(acquired.week)+" of "+String(acquired.season):"an earlier week";
    return{key:"old-trade-in-"+when,one:"since "+String(pmeta(id)?.name||id)+" came over in "+when,many:"since the trade for "+String(pmeta(id)?.name||id)+" in "+when};
  }
  const sent=(t.trade_acquisitions||[]).find(a=>(a?.outgoing_player_ids||[]).map(String).includes(id));
  if(sent){
    const when=sent?.season&&sent?.week?"Week "+String(sent.week)+" of "+String(sent.season):"an earlier week";
    return{key:"old-trade-out-"+when,one:"after leaving by trade in "+when,many:"after leaving by trade in "+when};
  }
  return{key:"hold",one:"",many:""};
}
function w2ValueMoverTag(row){
  const p=pmeta(row?.player_id);if(!p)return"";
  const profile=w2PlayerStatusProfile(p,1,null),status=String(profile?.status||"");
  if(status==="breakout")return"breakout";
  if(status==="emerging")return"emerging";
  if(status==="established-star"||status==="star-level")return"star";
  if(profile?.rookie)return"rookie";
  if(status==="reliable-veteran")return"reliable veteran";
  if(status==="veteran"||status==="declining-veteran"||profile?.veteran)return"veteran";
  return"";
}
function w2ValueMoverSentence(t,r,rows,rising){
  const groups=new Map(),rid=String(r?.id||"walter-mercer"),
    verbsUp={ "walter-mercer":["gained","climbed","rose"],"tess-delaney":["rose","gained","climbed"],"mack-hollis":["jumped","climbed","gained"],"nora-voss":["rose","gained","climbed"]},
    verbsDown={ "walter-mercer":["fell","lost","slipped"],"tess-delaney":["fell","slipped","lost"],"mack-hollis":["dropped","slid","lost"],"nora-voss":["fell","lost","slipped"]},
    verbs=(rising?verbsUp:verbsDown)[rid]||(rising?verbsUp["walter-mercer"]:verbsDown["walter-mercer"]);
  for(let i=0;i<(rows||[]).length;i++){
    const x=rows[i],method=w2ValueMoverMethod(t,x),rawName=String(x?.player_name||x?.player_id||"Unknown player"),
      tag=method.key==="hold"?w2ValueMoverTag(x):"",name=tag?tag+" "+rawName:rawName,
      amount=Math.abs(Math.round(Number(x.delta))).toLocaleString("en-US"),verb=verbs[(w2Hash(rawName+"|value-move")+i)%verbs.length],
      move=name+" "+verb+" "+amount+" point"+(Math.abs(Math.round(Number(x.delta)))===1?"":"s");
    if(!groups.has(method.key))groups.set(method.key,{method,moves:[]});
    groups.get(method.key).moves.push(move);
  }
  return [...groups.values()].map((g,gi)=>{const suffix=g.moves.length===1?g.method.one:g.method.many,line=w2Natural(g.moves)+(suffix?" "+suffix:"");return gi===0?w2Sentence(line):line}).join("; ")+".";
}
function w2ValueMarketRead(t,r,d,pct){
  const team=w2DisplayTeam(t.team_name),amount=Math.abs(Math.round(d)).toLocaleString("en-US"),
    pctText=Number.isFinite(pct)?" ("+w2One(pct)+"%)":"",rid=String(r?.id||"walter-mercer"),q=w2Hash(t.team_name+"|value-voice")%4,
    rows={
      "walter-mercer":{
        up:[
          team+" gained "+amount+" points of roster value over the tracked window"+pctText+". Useful leverage, yes; the standings still refuse to accept a spreadsheet as payment.",
          team+" climbed "+amount+" points in roster value"+pctText+". That is worth having, provided nobody mistakes a better price tag for a completed Sunday.",
          team+" added "+amount+" points of roster value"+pctText+". Nice week for the market page; the lineup still has to earn the rest.",
          team+" moved up "+amount+" points in roster value"+pctText+". Management gets more options, not immunity from the next matchup."
        ],
        down:[
          team+" lost "+amount+" points of roster value over the tracked window"+pctText+". One red week is not a fire drill, but it is enough to make the next move worth watching.",
          team+" slid "+amount+" points in roster value"+pctText+". Nobody needs panic; somebody should still read the number before making the next decision.",
          team+" dropped "+amount+" points of roster value"+pctText+". The roster is not on fire, but the smoke detector has earned one glance.",
          team+" moved down "+amount+" points in roster value"+pctText+". That is context, not catastrophe, and pretending otherwise in either direction would be lazy."
        ]
      },
      "tess-delaney":{
        up:[
          team+" gained "+amount+" points of roster value"+pctText+". That buys flexibility, not forgiveness; the next lineup still has to play football.",
          team+" climbed "+amount+" points on the market"+pctText+". Pleasant leverage. Now make the football justify it.",
          team+" added "+amount+" points of roster value"+pctText+". The market can compliment the roster; the next opponent is under no obligation.",
          team+" moved up "+amount+" points in roster value"+pctText+". A rising price is useful. A useful lineup remains mandatory."
        ],
        down:[
          team+" lost "+amount+" points of roster value"+pctText+". A roster can survive that; it should not volunteer for a sequel.",
          team+" fell "+amount+" points on the market"+pctText+". That does not ruin the roster, but it does remove a little room for careless decisions.",
          team+" gave back "+amount+" points of roster value"+pctText+". The useful response is football, not pretending the number never happened.",
          team+" moved down "+amount+" points in roster value"+pctText+". The market has filed a complaint in plain English: make the next week better."
        ]
      },
      "mack-hollis":{
        up:[
          team+" gained "+amount+" points of roster value"+pctText+". The market handed the back page a green arrow; now the roster has to avoid wasting it.",
          team+" jumped "+amount+" points in roster value"+pctText+". Good news, large font. The standings remain annoyingly unmoved by typography.",
          team+" climbed "+amount+" points on the market"+pctText+". Lovely. Keep the screenshot, then make Sunday worthy of it.",
          team+" added "+amount+" points of roster value"+pctText+". The price tag got louder. The lineup still has to say something useful."
        ],
        down:[
          team+" lost "+amount+" points of roster value"+pctText+". The market handed the back page a red arrow and, mercifully, not a eulogy.",
          team+" dropped "+amount+" points in roster value"+pctText+". Bad news, readable font. Nobody needs a siren yet.",
          team+" slid "+amount+" points on the market"+pctText+". The league thread has a screenshot now; management gets the next move.",
          team+" coughed up "+amount+" points of roster value"+pctText+". Red ink is not a funeral, but it does ruin a perfectly good attempt to ignore the market."
        ]
      },
      "nora-voss":{
        up:[
          team+" gained "+amount+" points of roster value"+pctText+". Rivals can call it inflation; management can call it leverage until Sunday asks for proof.",
          team+" climbed "+amount+" points on the market"+pctText+". Opponents are welcome to dislike the number. They are not allowed to make it disappear.",
          team+" added "+amount+" points of roster value"+pctText+". Rivals will complain about the market right up until they ask what a trade costs.",
          team+" moved up "+amount+" points in roster value"+pctText+". The gain is real enough for rivals to mock and useful enough for management to keep."
        ],
        down:[
          team+" lost "+amount+" points of roster value"+pctText+". Rivals will enjoy the number. Management should be more interested in the names underneath it.",
          team+" fell "+amount+" points on the market"+pctText+". Opponents did not cause the decline; they will simply be unbearable about noticing it.",
          team+" watched "+amount+" points come off the roster price"+pctText+". Rivals have a fresh screenshot. Management has the more difficult job of making it age badly.",
          team+" moved down "+amount+" points in roster value"+pctText+". The market supplied rivals with material and management with a reason to look closer."
        ]
      }
    },bank=rows[rid]||rows["walter-mercer"];
  return (d>=0?bank.up:bank.down)[q];
}
function w2ValueMoverReads(t,r){
  const movers=t.value_history_player_movers||{},risers=(movers.risers||[]).filter(x=>Number.isFinite(Number(x?.delta))&&Number(x.delta)>0).slice(0,3),
    fallers=(movers.fallers||[]).filter(x=>Number.isFinite(Number(x?.delta))&&Number(x.delta)<0).slice(0,3),
    rid=String(r?.id||"walter-mercer"),q=w2Hash(t.team_name+"|value-voice")%4,
    voice={
      "walter-mercer":{
        riseLead:["The green side of the player board has actual names. ","The team gain was not one anonymous blob. ","The roster-value bump came from real player movement. ","Under the team total, the useful names were easy to find. "],
        riseTail:["Nice work by the spreadsheet; Sunday still gets veto power.","Useful leverage, not a parade route.","Management can enjoy the number right up until the next lineup locks.","That is value worth having, provided nobody mistakes it for a win."],
        fallLead:["The red side deserves the same honesty. ","The losses were just as specific. ","The team total also has a debit column. ","Not everybody rode the market upward. "],
        fallTail:["One bad market week is a warning, not a funeral.","No panic button yet; ignoring it would be lazier than fixing it.","The next week gets to decide whether that was noise or the start of a habit.","Red ink is context, not destiny, but it still belongs in the notebook."]
      },
      "tess-delaney":{
        riseLead:["The player-level move is cleaner than the headline number. ","The useful part of the market story sits underneath the team total. ","The gain came from identifiable players, not magic. ","There is football substance under the value jump. "],
        riseTail:["That buys options; it does not buy a pass on Sunday.","Good leverage. Now make the lineup justify it.","The market can compliment the roster; the next opponent is under no obligation.","A rising price is pleasant. A useful lineup remains mandatory."],
        fallLead:["The player-level decline is where the useful answer lives. ","The team drop has identifiable sources. ","The market did not mark the whole roster down by magic. ","The red side of the board has names worth remembering. "],
        fallTail:["A roster can survive that; it should not volunteer for a sequel.","The useful correction is better football, not a prettier explanation.","Those losses are manageable until they become repeat customers.","The next week gets to decide whether the decline was temporary or contagious."]
      },
      "mack-hollis":{
        riseLead:["Now for the names behind the green arrow. ","The team number moved, but the back page wants culprits. ","A green week is more fun when somebody can be named. ","The market made noise; these players supplied the volume. "],
        riseTail:["Wonderful. Frame the screenshot after somebody wins with it.","The market handed out applause; Sunday still controls the encore.","Good news, large font. The standings remain annoyingly unimpressed.","Enjoy the green arrows before the next kickoff starts charging rent."],
        fallLead:["And now the part management would prefer cropped out of the screenshot. ","Red arrows also come with names. How thoughtful. ","The market did not only bring confetti. ","Somebody had to feed the red side of the chart. "],
        fallTail:["No siren yet, but the league thread has definitely found the image.","That is enough red ink to earn a stare, not a eulogy.","The market has spoken loudly enough. Management may now answer with football.","Nobody is calling the morgue. Somebody should still check the damage."]
      },
      "nora-voss":{
        riseLead:["Rivals looking for the source of the gain do not need binoculars. ","The team number has names underneath it. ","The rise did not happen by rumor. ","Rivals can stop blaming the spreadsheet and look at the players. "],
        riseTail:["Opponents may call it inflation. The roster still gets to keep the value.","Rivals can dislike the number without making it disappear.","The market gave management leverage; opponents get Sunday to argue back.","That is the sort of gain rivals remember right before proposing a bad trade."],
        fallLead:["Rivals will also enjoy the names on the red side. ","The drop was not anonymous either. ","The market left a few names circled in red. ","Opponents looking for weak spots received a short list. "],
        fallTail:["Rivals did not cause the decline. They will simply be unbearable about it.","Management owns the problem; rivals merely own the screenshots.","The red arrows are not a scandal. Repeating them would be convenient for everybody else.","Opponents will remember the slide until the numbers give them something newer to mock."]
      }
    },bank=voice[rid]||voice["walter-mercer"],out=[];
  if(risers.length)out.push(w2S(t,r,"value-risers",bank.riseLead[q]+w2ValueMoverSentence(t,r,risers,true)+" "+bank.riseTail[q]));
  if(fallers.length)out.push(w2S(t,r,"value-fallers",bank.fallLead[(q+1)%4]+w2ValueMoverSentence(t,r,fallers,false)+" "+bank.fallTail[(q+1)%4]));
  // No player-level attribution means there is no player mover story to invent.
  return out;
}

function w2ManagementMoveRead(t,r,won,margin){
  const moves=w2TransactionMoveDetails(t),rid=String(r?.id||""),v=(Number(t.roster_id)||0)%2,team=w2DisplayTeam(t.team_name),
    weak=(t.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],miss=t.best_lineup_miss,q=w2Hash(team+"|management-template")%4;
  if(!moves.length){
    const rows={
      "walter-mercer":[
        t.manager_name+" made no completed Week 2 transaction. "+(q===0?((weak?weak.name+" at "+w2One(weak.points)+" points":"The quiet end of the lineup")+" remains the management problem already on the roster."):q===1?("With no new arrival to credit, "+(weak?weak.name+" and a "+w2One(weak.points)+"-point return":"the existing starters")+" stay at the center of the Week 2 review."):q===2?("The relevant management issue is therefore "+(weak?weak.name+" producing "+w2One(weak.points)+" points":"the lineup already in place")+", not a transaction that never happened."):("No acquisition changed Sunday, which puts the focus back on "+(weak?weak.name+" at "+w2One(weak.points):"the roster that actually started")+".")),
        "No new move rescued "+t.manager_name+" on Sunday. "+(miss?.reserve&&miss?.starter?"The selection of "+miss.starter.name+" over "+miss.reserve.name+" still asks for a defense.":team+" must make its existing starters earn their places.")
      ],
      "tess-delaney":[
        t.manager_name+" did not remake the roster during Week 2. The management conversation stays with "+(weak?weak.name+" and the "+w2One(weak.points)+"-point quiet spot":"the existing table")+" rather than an imaginary new guest.",
        (q===0?("No completed add, drop or trade appears for "+t.manager_name+" this week."):q===1?(t.manager_name+" left the Week 2 guest list unchanged."):q===2?("The "+w2Alias(t).mascot+" transaction ledger shows no completed Week 2 move from "+t.manager_name+"."):("No Week 2 roster invitation or departure was completed by "+t.manager_name+"."))+" "+(miss?.reserve&&miss?.starter?"The more interesting seating choice is "+miss.reserve.name+" behind "+miss.starter.name+".":"Sunday belongs to the roster already seated at the table.")
      ],
      "mack-hollis":[
        t.manager_name+" stayed off the Week 2 transaction wire. That means "+(weak?weak.name+" at "+w2One(weak.points)+" is":"the current lineup is")+" the management headline, not a move count.",
        (q===0?t.manager_name+" left the Week 2 transaction sheet alone. ":q===1?"The "+w2DisplayTeam(t.team_name)+" bench got no help from a completed Week 2 move. ":q===2?"No completed transaction changed "+t.manager_name+"\u0027s roster this week. ":"The Week 2 personnel log stayed unchanged for "+t.manager_name+". ")+(miss?.reserve&&miss?.starter?"The live decision was "+miss.reserve.name+" remaining behind "+miss.starter.name+".":"The starting lineup, not an imaginary acquisition, supplied the score.")
      ],
      "nora-voss":[
        t.manager_name+" made no completed Week 2 move. Rivals can skip the transaction joke and look at "+(weak?weak.name+" at "+w2One(weak.points):"the lineup that actually played")+" instead.",
        (q===0?("The wire is quiet for "+t.manager_name+" this week."):q===1?(t.manager_name+" completed no Week 2 roster move, so rivals can skip the transaction angle."):q===2?("There is no completed Week 2 add, drop or trade to pin on "+t.manager_name+"."):("Week 2 produced no completed roster transaction for "+t.manager_name+"."))+" "+(miss?.reserve&&miss?.starter?miss.reserve.name+" sitting behind "+miss.starter.name+" gives management a real choice to answer.":"No roster-move alibi belongs in the Week 2 result.")
      ]
    };
    return (rows[rid]||rows["walter-mercer"])[v]
  }
  const addedIds=new Set((t.transactions||[]).flatMap(tx=>tx.adds||[]).map(String)),starters=(t.starter_details||[]).filter(p=>addedIds.has(String(p.id))).sort((x,y)=>Number(y.points)-Number(x.points)),hit=starters[0],
    leadRows={
      "walter-mercer":[t.manager_name+"’s Week 2 roster work: "+moves.join("; ")+".",t.manager_name+" changed the roster this week by "+moves.join("; ")+"."] ,
      "tess-delaney":[t.manager_name+" changed the Week 2 table: "+moves.join("; ")+".",t.manager_name+" adjusted the guest list this week by "+moves.join("; ")+"."],
      "mack-hollis":[t.manager_name+" hit the Week 2 wire and "+moves.join("; ")+".",t.manager_name+" made the roster headline concrete: "+moves.join("; ")+"."],
      "nora-voss":[t.manager_name+" changed the Week 2 roster: "+moves.join("; ")+".",t.manager_name+" gave rivals actual transaction terms to discuss: "+moves.join("; ")+"."]
    },lead=(leadRows[rid]||leadRows["walter-mercer"])[v];
  let impact;
  if(hit){
    const impactRows={
      "walter-mercer":[hit.name+" went straight into the lineup and produced "+w2One(hit.points)+" points, giving that acquisition an immediate Week 2 result.",hit.name+" started immediately after the move and scored "+w2One(hit.points)+"; that is present production management can evaluate now."],
      "tess-delaney":[hit.name+" received a starting chair immediately and returned "+w2One(hit.points)+" points. The new arrival already touched the Week 2 table.",hit.name+" was seated in the lineup at once and produced "+w2One(hit.points)+" points, so this was not merely decorative roster work."],
      "mack-hollis":[q===0?(hit.name+" was not just a transaction line: he entered the Week 2 lineup and scored "+w2One(hit.points)+" points."):q===1?(hit.name+" went from transaction log to starter immediately, returning "+w2One(hit.points)+" points in Week 2."):q===2?("The move reached the lineup right away when "+hit.name+" started and produced "+w2One(hit.points)+" points."):("Management put "+hit.name+" straight into the Week 2 starting card, where he scored "+w2One(hit.points)+" points."),hit.name+" cracked the starting card right away and put up "+w2One(hit.points)+". That move already has a Sunday number attached."],
      "nora-voss":[hit.name+" made the starting lineup immediately and scored "+w2One(hit.points)+" points. Rivals can judge the move on real Sunday production now.",hit.name+" went from transaction to starter and delivered "+w2One(hit.points)+" points. That is enough to move the discussion beyond the wire itself."]
    };
    impact=(impactRows[rid]||impactRows["walter-mercer"])[v];
  }else{
    const tails={
      "walter-mercer":[w2Hash(team+"|walter-nonstarter-adds")%2===0?("None of the additions started for "+team+" in Week 2, so the roster changed while Sunday’s scoring lineup stayed intact."):("The incoming players stayed outside "+team+"’s Week 2 starters; those moves altered the roster, not the lineup that produced this result."),"Those additions did not reach the Week 2 starters, which makes them roster work rather than an explanation for Sunday."],
      "tess-delaney":["None of the new arrivals reached the Week 2 starting table, so the room changed without changing Sunday’s place settings.","The new guests did not make the Week 2 starting table for "+team+"; Sunday still belongs to the starters who were already seated."],
      "mack-hollis":["A silent box score from the new arrivals makes the actual starters responsible for Sunday’s result.","The additions stayed off the Week 2 starting card. That is roster churn, not a scoring explanation."],
      "nora-voss":["None of the additions made the Week 2 starting lineup for "+t.team_name+". The "+w2One(Number(t.points||0))+"-point result against "+String(t.opponent_name||"the opponent")+" therefore belongs to the starters, not to these transactions.","The new names stayed outside the Week 2 starters. That keeps the move jokes on hold until somebody actually enters the lineup."]
    };
    impact=(tails[rid]||tails["walter-mercer"])[v]
  }
  return lead+" "+impact
}
function w2InjuryOutlookRead(t,r,x,next){
  const rid=String(r?.id||""),v=(Number(t.roster_id)||0)%2,d=String(x?.designation||"an injury").toLowerCase(),name=String(x?.name||"A starter"),foe=w2DisplayTeam(next);
  const hard=/^(?:out|ir|doubtful|pup)$/.test(d),rows={
    "walter-mercer":hard?[name+" is listed "+d+" entering Week 3, so "+w2DisplayTeam(t.team_name)+" may need a replacement before facing "+foe+".",name+" is listed "+d+" for the "+foe+" matchup; availability could force a real lineup change before Sunday."]
      :[name+" is "+d+" for Week 3, making his availability a lineup variable before "+w2DisplayTeam(t.team_name)+" faces "+foe+".",name+" brings a "+d+" tag into the "+foe+" game. That status matters because it can change who actually starts for "+w2DisplayTeam(t.team_name)+"."],
    "tess-delaney":hard?[name+" arrives at Week 3 listed "+d+", which may force the "+w2Alias(t).mascot+" to reset a place before "+foe+" enters the room.",name+" is "+d+" for the next appointment. The "+w2Alias(t).mascot+" may need a different place setting against "+foe+"."]
      :[name+" has a "+d+" tag for Week 3, so the "+w2Alias(t).mascot+" cannot finish the seating chart for "+foe+" just yet.",name+" reaches the "+foe+" appointment as "+d+". The room should care because one starting chair remains unsettled."],
    "mack-hollis":hard?[name+" is "+d+" for Week 3. If he cannot go, the "+w2Alias(t).mascot+" need a replacement before "+foe+" and that is a bigger story than another depth percentage.",name+" has "+d+" next to his name for the "+foe+" game, which could change the actual starting card before anybody starts yelling about trends."]
      :[name+" is carrying a "+d+" tag into Week 3, so the "+w2Alias(t).mascot+" have a real availability question before "+foe+".",name+" is "+d+" ahead of "+foe+". Put that on the Week 3 board because it may change the lineup, not just the pregame chatter."],
    "nora-voss":hard?[name+" is "+d+" heading toward "+foe+", giving rivals a concrete lineup uncertainty to watch before Week 3.",name+" carries "+d+" status into the "+foe+" matchup. If "+name+" needs relief, the "+w2Alias(t).mascot+" must reshape the depth chart before "+foe+" gets to write the punchline."]
      :[name+" is "+d+" for the "+foe+" game, and rivals will notice whether that tag changes the "+w2Alias(t).mascot+" starting lineup.",name+" takes a "+d+" designation into Week 3 against "+foe+". The designation matters because it may force the "+w2Alias(t).mascot+" to change starters before kickoff."]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2ClosingRead(t,r,won,margin,top,weak,next){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(next||t.next_opponent_name||"the Week 3 opponent"),rec=w2Record(t),
    key=rec==="2-0"?"unbeaten":rec==="0-2"?"winless":margin<=5?"close":won?"win":"loss",
    rows={
      "walter-mercer":{
        unbeaten:team+" takes a 2-0 record into "+foe+". Week 3 is about proving the first two wins can survive a new opponent without leaning on the same explanation.",
        winless:team+" goes to "+foe+" at 0-2. For "+team+", the Week 2 weakness has to be corrected before the standings gap widens and panic starts filling out the lineup card in permanent marker.",
        close:"After a "+w2One(margin)+"-point decision, "+team+" meets "+foe+" with very little separating a reassuring trend from another week of second-guessing.",
        win:"The Week 2 win moves "+team+" to "+rec+" before "+foe+". The next test is whether the lineup can keep the useful production and trim the quiet spots.",
        loss:"The loss leaves "+team+" at "+rec+" with "+foe+" next. Week 3 needs a roster response to the weakness Sunday already identified."
      },
      "tess-delaney":{
        unbeaten:"A 2-0 "+w2Alias(t).mascot+" room has earned the right to enjoy itself before "+foe+" arrives, but the next appointment still demands a complete table.",
        winless:"At 0-2, the "+w2Alias(t).mascot+" cannot solve Week 2 by polishing the silver. "+foe+" gets the next reservation, and the weak place setting needs an actual replacement.",
        close:"A "+w2One(margin)+"-point result leaves the "+w2Alias(t).mascot+" little room for decorative excuses. "+foe+" is next, and one cleaner place setting could change the entire evening.",
        win:"The win leaves the "+w2Alias(t).mascot+" at "+rec+" before "+foe+" enters the room. Keep the good china nearby, but make the next performance earn it.",
        loss:"The "+w2Alias(t).mascot+" leave the loss at "+rec+" with "+foe+" next. The response has to be a better table; the stain already has enough witnesses."
      },
      "mack-hollis":{
        unbeaten:team+" is 2-0 and "+foe+" is next. The headline gets louder only if the supporting lineup stops making the stars do all the shouting.",
        winless:"The "+w2Alias(t).mascot+" are 0-2 with "+foe+" next. Enough autopsy—Week 3 needs a different lineup story, not a third version of the same complaint.",
        close:"A "+w2One(margin)+"-point Week 2 decision puts every ordinary lineup choice under the lights before "+team+" meets "+foe+".",
        win:team+" takes a "+rec+" record into "+foe+" after the win. Now make the good part repeat loudly enough that this week’s weak spot becomes old news.",
        loss:w2Hash(team+"|mack-close-loss")%2===0?(team+" is "+rec+" after the loss with "+foe+" next. The quiet end of "+team+"’s lineup now has to produce before the same weakness becomes a Week 3 headline."):(foe+" gets "+team+" next after this loss dropped the "+w2Alias(t).mascot+" to "+rec+". The low-scoring spots owe the roster a response before another explanation starts sounding like a subscription service.")
      },
      "nora-voss":{
        unbeaten:w2Hash(team+"|filch-unbeaten-close")%2===0?("Rivals have to work around a 2-0 "+w2Alias(t).mascot+" record before "+foe+". Cleaning up "+team+"’s visible Week 2 weak spot would take away the easiest remaining rival material."):("The "+w2Alias(t).mascot+" carry 2-0 into "+foe+", so rivals are already short on ammunition. A cleaner bottom half of the lineup would make the next punch line even harder to find."),
        winless:"At 0-2, "+team+" has already supplied rivals enough material. "+foe+" is next, and changing the obvious Week 2 problem is the fastest way to retire the joke.",
        close:"A "+w2One(margin)+"-point decision means the punch line could have changed with one ordinary score. "+foe+" gets the next look at whether "+team+" learned anything from it.",
        win:"The win puts "+team+" at "+rec+" before "+foe+". The next lineup needs more from "+(weak?.name||"its weakest starter")+" after a "+w2One(weak?.points||0)+"-point Week 2; "+foe+" gets to test whether that slot improves.",
        loss:"The loss leaves "+team+" at "+rec+" with "+foe+" next. Fix the part everybody saw and rivals have to find new material."
      }
    };
  return (rows[rid]||rows["walter-mercer"])[key]
}
function w2PerformanceDepthRead(t,r,top,weak,won,margin){
  const rid=String(r?.id||""),a=w2Alias(t),team=w2DisplayTeam(t.team_name),star=top?.[0]?.name||"the top scorer",
    support=top?.[1]?.name||"the next-best starter",low=weak?.name||"the quiet end of the lineup",
    lowPts=w2One(weak?.points),tight=margin<=6,wide=margin>=20,v=w2Cohort(t)%4;
  const result=won?"win":"loss";
  const rows={
    "walter-mercer":[
      star+" gave "+team+" the headline, "+support+" kept it from becoming a one-man column, and "+low+" finished at "+lowPts+"; after a "+result+" like this, the useful Monday question is whether that quiet spot can become ordinary help instead of recurring copy.",
      "The box score starts with "+star+" and "+support+", but "+low+" at "+lowPts+" is the part "+team+" cannot file away; "+(tight?"a margin this small turns one soft starter into a week-long conversation.":won?"the win gives management room to fix it without panic.":"the loss gives management no reason to pretend it was harmless."),
      star+" and "+support+" did enough to give "+team+" a real top of the lineup, while "+low+" supplied "+lowPts+"; "+(wide?"the wide margin keeps one weak slot from becoming the whole story, but it still belongs in the notebook.":tight?"the narrow margin makes that weak slot expensive.":"the result was decided by more than one player, but the correction is easy to identify."),
      team+" got the sort of work it needed from "+star+" and "+support+", then watched "+low+" stop at "+lowPts+"; "+(won?"winning lets the manager circle that problem in pencil.":"losing turns the same circle into ink.")+" For "+team+", Week 3 will tell whether that note was actually read."
    ],
    "tess-delaney":[
      star+" brought the centerpiece, "+support+" remembered the silverware, and "+low+" arrived with "+lowPts+" points; "+(won?"the "+a.mascot+" can laugh about that empty-looking chair for one evening.":"the "+a.mascot+" cannot send the whole bill to one chair, but nobody is asking it back for dessert."),
      "The "+a.mascot+" table looked convincing around "+star+" and "+support+" until "+low+" placed "+lowPts+" on the linen; "+(tight?"in a finish this close, that is less a decorative flaw than a spilled glass beside the scorecard.":won?"the win keeps the maître d’ calm.":"the loss makes the stain considerably harder to ignore."),
      star+" and "+support+" gave "+team+" enough sparkle to deserve a better room, while "+low+" managed "+lowPts+"; "+(wide?"the margin was too large to blame one setting.":"one ordinary serving there would have made the evening feel very different.") ,
      "There was proper work from "+star+" and "+support+", then "+low+" supplied "+lowPts+" and tested everybody’s manners; "+(won?"fortunately for "+team+", victory is excellent upholstery.":"unfortunately for "+team+", defeat makes every bare cushion visible.")
    ],
    "mack-hollis":[
      star+" brought the fireworks, "+support+" kept the fuse lit, and "+low+" answered with "+lowPts+"; "+(won?"the "+a.mascot+" won anyway, so the complaint can wait until after breakfast.":"the "+a.mascot+" lost, so yes, the complaint is already on the front porch."),
      "The "+a.mascot+" got noise from "+star+" and "+support+" but only "+lowPts+" from "+low+"; "+(tight?"lose this close and that quiet slot starts sounding like a fire alarm.":wide?"the margin was too big for one culprit, but this is still the first name underlined.":"that is how a useful top end winds up dragging a dead battery."),
      star+" and "+support+" kept the scoreboard alive for "+team+", while "+low+" showed up with "+lowPts+"; "+(won?"winning buys that spot one week of witness protection.":"losing means the disguise is off and everybody knows where the bad number came from."),
      team+" had "+star+" and "+support+" throwing punches, then "+low+" produced "+lowPts+" and reached for the towel; "+(tight?"a close game makes that impossible to shrug off.":won?"the win keeps it funny.":"the loss turns it into Monday’s loudest roster question.")
    ],
    "nora-voss":[
      star+" and "+support+" gave "+team+" enough ammunition to keep rivals busy, while "+low+" offered "+lowPts+"; "+(won?"the win removes most of the sting, not the ugly number.":"the loss gives every rival manager one very easy place to point."),
      "Rivals have to work around what "+star+" and "+support+" did, but they can walk straight through "+low+" at "+lowPts+"; "+(tight?"with a margin this small, that joke unfortunately has football value.":won?"the final score keeps the joke cheap.":"the final score makes it annoyingly relevant."),
      team+" can defend the work from "+star+" and "+support+" without defending "+low+" at "+lowPts+"; "+(won?"a win means the weak spot is merely embarrassing.":"a loss means every obnoxious rival gets to drag that weak spot back into the conversation."),
      "The rival version of this story skips past "+star+" and "+support+" and circles "+low+" at "+lowPts+"; "+(wide?"that is not the whole result by any sane reading.":tight?"in a game this close, sanity does not save the lineup card.":"it is still the easiest soft spot to heckle.")
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2ManagementDepthRead(t,r,weak,next){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(next||t.next_opponent_name||"the Week 3 opponent"),
    low=weak?.name||"the weakest starter",miss=t.best_lineup_miss,reserve=miss?.reserve?.name,starter=miss?.starter?.name,
    decision=reserve&&starter?reserve+" over "+starter:low+" in the current starting spot",v=w2Cohort(t)%4;
  const rows={
    "walter-mercer":[
      "The next management decision is "+decision+". Against "+foe+", selection or performance has to supply the answer before the score becomes another postgame explanation.",
      team+" has one practical lineup question to settle: "+decision+". "+foe+" gets the next look, so management has a week to decide whether Sunday earned a change.",
      "Management leaves Week 2 with "+decision+" circled. The "+foe+" matchup turns that from a review note into an actual lineup choice.",
      "The roster question now is "+decision+". "+foe+" supplies the next test, and the decision has to be made before the result provides the hindsight."
    ],
    "tess-delaney":[
      "The Week 3 seating decision is "+decision+". "+foe+" gets the next reservation, so management has to decide whether that chair changes before dinner starts.",
      decision+" is the chair management has to inspect before "+foe+" arrives. The table can keep its personality; the seating chart still has to make sense.",
      "The guest-list question is no longer theoretical: "+decision+". With "+foe+" due next, management either moves the chair or serves the same arrangement again.",
      "Before "+foe+" enters the room, the practical seating issue is "+decision+". Somebody has to own that place card before the first course."
    ],
    "mack-hollis":[
      "The Week 3 decision is "+decision+". "+foe+" is next, which gives management one clean chance to change the lineup before the same complaint reaches the megaphone again.",
      decision+" is the switch management gets to throw before "+foe+". Leave it alone and the same circuit gets another chance to spark.",
      "The lineup button flashing now is "+decision+". "+foe+" shows up next, so management can either press it or explain why it ignored the light.",
      "Management has one loud question before "+foe+": "+decision+". The answer belongs on the starting card, not in Monday’s emergency broadcast."
    ],
    "nora-voss":[
      "The next lineup argument is "+decision+". "+foe+" gets first chance to test it, and rivals will not need fresh material if the same choice survives unchanged.",
      decision+" is the choice rivals have already bookmarked. "+foe+" gets the next screenshot, so management can retire the joke or renew it.",
      "The Week 3 receipt starts with "+decision+". Against "+foe+", the easiest rival punch line disappears only if the lineup choice changes or the production does.",
      "Rivals are already circling "+decision+" before "+foe+". Management gets one week to make that screenshot age badly."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2PlayerRoomClose(t,r,top,weak,opp,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),foe=w2DisplayTeam(opp),v=w2Cohort(t)%4,
    starName=top?.[0]?.name||"the lead scorer",secondName=top?.[1]?.name||"the supporting scorer",
    weakName=weak?.name||"the quietest starter",weakPts=weak?w2One(weak.points):"a quiet total";
  const rows={
    "walter-mercer":[
      starName+" gave "+team+" the headline performance, but "+secondName+" mattered because "+foe+" had to defend more than one real problem. That is the kind of support that makes the top score more sustainable.",
      team+" did not need every starter to be excellent against "+foe+"; it needed enough useful scores that "+weakName+" at "+weakPts+" could be survived. The next step is turning that survival into ordinary depth.",
      "The hierarchy was clear for "+team+": "+starName+" at the top, "+secondName+" behind him, and "+weakName+" as the place still asking for improvement. Week 3 gets to test whether that structure holds.",
      (won?"The win lets ":"The loss forces ")+team+" separate the stars from the structure. "+starName+" handled the top-end work, while "+weakName+" is the cleaner place to ask for more next Sunday."
    ],
    "tess-delaney":[
      starName+" handled the expensive part of the room, while "+secondName+" kept the table from looking like one gorgeous plate surrounded by folding chairs. Even "+foe+" had to notice the balance.",
      team+" did not need a perfect dinner against "+foe+"; it needed enough good courses that "+weakName+" at "+weakPts+" stayed a blemish instead of becoming the whole bill. That distinction matters before the next reservation.",
      "The "+a.mascot+" table had an obvious order: "+starName+" as the centerpiece, "+secondName+" supplying company, and "+weakName+" occupying the least flattering chair. The room already knows which setting gets adjusted first.",
      (won?"Victory gives ":"Defeat denies ")+"the "+a.mascot+" room the luxury of pretending every chair worked. "+starName+" looked the part; "+weakName+" is the place setting supporters will keep moving around before Week 3."
    ],
    "mack-hollis":[
      starName+" brought the noise, "+secondName+" kept the speakers on, and suddenly "+team+" looked less like one star screaming into an empty stadium. That is the kind of chaos "+foe+" actually had to respect.",
      team+" did not need eleven fireworks against "+foe+"; it needed enough live wires that "+weakName+" at "+weakPts+" could not short the whole board. Now that backup noise has to show up again instead of sending management back to the breaker box.",
      "The loud part of the "+a.mascot+" lineup had actual backup: "+starName+" hit first, "+secondName+" answered, and "+weakName+" is the obvious circuit management still has to check. That is a much cleaner diagnosis than blaming everybody.",
      (won?"The win means ":"The loss means ")+team+" can stop pretending the whole lineup was equally responsible. "+starName+" did the yelling; "+weakName+" is where the volume disappeared."
    ],
    "nora-voss":[
      starName+" removed the easiest rival joke, and "+secondName+" made sure opponents had to scroll farther down the lineup for material. "+foe+" found softer targets, but not at the top.",
      team+" gave rivals fewer obvious openings when the useful scores stacked up. "+weakName+" at "+weakPts+" is still the name everybody will circle, which is exactly why management should look there first.",
      "The rival version of this game gets less convenient once "+starName+" and "+secondName+" both show up. "+weakName+" is still available for heckling, but that pushes the honest football argument deeper into the roster.",
      (won?"Winning lets ":"Losing makes ")+a.mascot+" rivals pick their targets carefully. "+starName+" did enough to dodge the easy joke; "+weakName+" is the much cleaner Week 3 talking point."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function theRoom(mascot){return "the "+mascot+" room"}
function theRivals(mascot){return mascot+" rivals"}


function w2ColumnColorRead(t,r,top,weak,won,opp){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(opp),
    star=top?.[0]?.name||"the top scorer",second=top?.[1]?.name||"the next scorer",
    weakName=weak?.name||"the quietest starter",weakPts=weak?w2One(weak.points):"a quiet total",
    v=w2Cohort(t)%4;
  const rows={
    "walter-mercer":[
      star+" and "+second+" gave "+team+" the respectable part of Sunday. "+weakName+" at "+weakPts+" is why nobody in the building should laminate the lineup card yet; the joke stops being funny when the same blank spot keeps getting a locker.",
      team+" can keep the production from "+star+" without pretending every starter earned a handshake. "+weakName+" at "+weakPts+" is the unpaid bill sitting under the coffee cup, and the receipt is getting difficult to lose.",
      star+" did enough to make the top of the lineup credible; "+weakName+" at "+weakPts+" kept the bottom from becoming comfortable. The scoreboard can celebrate; the weak spot still has a parade permit nobody asked for.",
      "The good news is "+star+". The less decorative news is "+weakName+" at "+weakPts+", which is exactly how a clean headline acquires a footnote with its own megaphone."
    ],
    "tess-delaney":[
      star+" wore the room well, and "+second+" at least remembered the dress code. "+weakName+" at "+weakPts+" is the chair everybody keeps trying to move behind a plant.",
      team+" had enough polish from "+star+" to look intentional. "+weakName+" at "+weakPts+" is the crooked place setting ruining the photograph.",
      star+" gave the table a centerpiece; "+second+" kept dinner from becoming performance art. "+weakName+" at "+weakPts+" is still the guest nobody knows where to seat.",
      "There is a perfectly respectable Sunday hiding in "+team+"’s top end. Then "+weakName+" arrives with "+weakPts+" and knocks over the water glass."
    ],
    "mack-hollis":[
      star+" brought the fireworks, "+second+" kept the fuse alive, and "+weakName+" showed up with "+weakPts+" and a bucket of water. That is the whole lineup argument in one extremely loud sentence.",
      team+" got actual noise from "+star+" and "+second+". "+weakName+" at "+weakPts+" is where the speakers cut out and somebody starts kicking the cabinet.",
      star+" did the yelling, "+second+" gave the yelling backup, and "+weakName+" answered with "+weakPts+". If that sounds like three different Sundays sharing one lineup card, congratulations, you found the problem.",
      "The top of "+team+"’s lineup had a pulse. "+weakName+" at "+weakPts+" had the emotional range of a disconnected smoke detector."
    ],
    "nora-voss":[
      star+" removed one rival punch line and "+second+" made another harder to sell. "+weakName+" at "+weakPts+" kindly returned a fresh joke to circulation.",
      team+" gave rivals less material at the top and then left "+weakName+" at "+weakPts+" sitting on the counter like a complimentary souvenir.",
      star+" and "+second+" made the rival chat work for its jokes. "+weakName+" at "+weakPts+" then filed one in triplicate and saved everybody the effort.",
      "Rivals cannot honestly complain about "+star+". They can, however, point at "+weakName+" and "+weakPts+" until somebody in "+team+" confiscates the laser pointer."
    ]
  };
  const body=(rows[rid]||rows["walter-mercer"])[v],
    tails={
      "walter-mercer":won?[
        "For "+team+", winning makes the imbalance easier to tolerate; it does not make "+weakName+" disappear.",
        team+" gets the win and therefore the luxury of laughing first. "+weakName+" still has to answer the same Monday question.",
        "The standings give "+team+" the good news. "+weakName+" keeps the lineup review from becoming a victory parade.",
        team+" can celebrate the result without pretending "+weakName+" suddenly became decorative."
      ]:[
        "For "+team+", losing removes the polite version of the conversation around "+weakName+".",
        team+" did not get the result, so "+weakName+" loses the protection a win would have provided.",
        "The loss makes "+weakName+" harder for "+team+" to file under harmless noise.",
        team+" has less room to laugh this off after a loss; "+weakName+" stays on the repair list."
      ],
      "tess-delaney":won?[
        "The win lets "+team+" keep dessert on the table. "+weakName+" still gets the crooked chair.",
        team+" may toast the result; "+weakName+" remains the place setting everyone notices after the glasses come down.",
        "Victory keeps the room pleasant for "+team+", but "+weakName+" is still the stain the tablecloth cannot negotiate with.",
        team+" gets to enjoy the evening. "+weakName+" still has a reservation with the seating chart."
      ]:[
        "A loss gives "+team+" considerably less reason to pretend "+weakName+" is tasteful background noise.",
        team+" leaves without the result, which makes "+weakName+" the chair nobody can politely ignore.",
        "The room is less forgiving after a loss; "+weakName+" becomes part of the bill "+team+" actually has to pay.",
        team+" cannot hide "+weakName+" behind good manners after losing."
      ],
      "mack-hollis":won?[
        team+" won, so the fire alarm gets one night off. "+weakName+" still smells like smoke.",
        "The win keeps "+team+" from calling the electrician tonight. "+weakName+" is still the outlet making sparks.",
        team+" gets the scoreboard and the victory song; "+weakName+" still gets the maintenance ticket.",
        "Winning keeps the speakers loud enough for "+team+". "+weakName+" is still the cable somebody has to replace."
      ]:[
        team+" lost, so nobody gets to call "+weakName+" a harmless sound effect.",
        "The loss turns "+weakName+" from background noise into a siren "+team+" actually has to answer.",
        team+" did not win, which means "+weakName+" has officially lost the right to be a funny little glitch.",
        "After a loss, "+team+" cannot keep pretending "+weakName+" is merely where the volume dipped."
      ],
      "nora-voss":won?[
        team+" gets the win and the rival-chat receipt. "+weakName+" still gets quoted in the replies.",
        "Victory lets "+team+" talk first; "+weakName+" gives rivals one annoying comeback anyway.",
        team+" owns the result. "+weakName+" remains the screenshot rivals refuse to delete.",
        "The win narrows the rival joke inventory around "+team+". "+weakName+" keeps one shelf stocked."
      ]:[
        team+" lost, so rivals do not need permission to keep circling "+weakName+".",
        "The loss hands rivals the microphone, and "+weakName+" is the first name they are reading into it.",
        team+" has no victory receipt to wave back, which makes "+weakName+" an especially easy reply.",
        "Losing keeps the rival joke alive; "+weakName+" is where "+team+" supplied the setup."
      ]
    };
  return body+" "+(tails[rid]||tails["walter-mercer"])[v]
}


function w2PlayerSynthesisRead(t,r,top,opp,won){
  const rid=String(r?.id||""),team=w2DisplayTeam(t.team_name),a=w2Alias(t),foe=w2DisplayTeam(opp),
    star=top?.[0]?w2ShortPlayerName(t,r,top[0],"synthesis-0"):"the lead scorer",
    support=top?.[1]?w2ShortPlayerName(t,r,top[1],"synthesis-1"):"the supporting scorer",
    third=top?.[2]?w2ShortPlayerName(t,r,top[2],"synthesis-2"):null,
    v=w2Cohort(t)%4,names=w2Natural([star,support,third].filter(Boolean));
  // A scorer list is not a scoring core when one or more names put up zero.
  // Guard the shared synthesis before any reporter-specific praise template.
  const scores=(top||[]).slice(0,3).map(p=>Number(p?.points)||0),
    producers=scores.filter(p=>p>0).length,total=scores.reduce((sum,p)=>sum+p,0),
    lead=top?.[0]?w2ShortPlayerName(t,r,top[0],"synthesis-0"):"the lead starter";
  if(producers<2||total<10){
    const zero=producers===0,tag=w2One(total),leadPts=w2One(scores[0]||0),v2=w2Cohort(t)%3;
    const low={
      "walter-mercer":[
        zero?team+" got "+tag+" points from its three leading starters. There is no scoring spine to praise, only a lineup to repair.":lead+" supplied "+leadPts+" of "+tag+" points from the three names. That is one contribution, not a dependable supporting cast.",
        zero?"Three listed starters, three zeroes. "+team+" cannot call that depth; it can only call the next lineup meeting.":team+" had "+lead+" on the scoresheet and almost nobody behind him. The next result needs actual support.",
        zero?"The top three on the "+team+" card combined for "+tag+". The rest of the review starts with that unpleasant fact.":lead+" gave "+team+" the only real pulse in this group. The roster cannot ask one starter to carry silence."
      ],
      "tess-delaney":[
        zero?"The "+a.mascot+" offered three empty plates and called it a lineup. "+tag+" points is not a course; it is a bill.":lead+" brought "+leadPts+" points to the table; the other two brought mostly decorative cutlery.",
        zero?"A trio combining for "+tag+" is not a supporting cast. It is an ensemble audition for the bench.":team+" can applaud "+lead+" without pretending the other two supplied a chorus.",
        zero?"Three names, "+tag+" points. Even the most generous review cannot locate the performance.":lead+" supplied the one audible note. The rest of the trio made a compelling case for silence."
      ],
      "mack-hollis":[
        zero?"Three starters combined for "+tag+". That is not a scoring attack. That is a power outage with uniforms.":lead+" posted "+leadPts+" points while the other two barely disturbed the scoreboard. Hold the parade.",
        zero?team+" got three zeroes from its supposed leaders. Rivals will not need a second joke.":team+" got a pulse from "+lead+" and static from the rest of this trio. Fix the speakers.",
        zero?"The headline is "+tag+" from three starters. Somebody check whether the scoreboard is plugged in.":lead+" did the scoring. The other two helped fill out the photograph."
      ],
      "nora-voss":[
        zero?"The evidence from "+names+" totals "+tag+" points. There was no productive core to rescue the case.":lead+" accounted for "+leadPts+" of "+tag+" points from the group. Calling the other two support would be an accounting error.",
        zero?"Three starters and "+tag+" combined points. Rival managers can submit the box score as their entire argument.":team+" had one meaningful contribution from "+lead+" and two names on the attendance sheet.",
        zero?"The three-name summary produces "+tag+". The record does not support an optimistic reading.":lead+" did the useful work. The other two supplied rivals with evidence."
      ]
    };
    return (low[rid]||low["walter-mercer"])[v2];
  }
  const rows={
    "walter-mercer":[
      names+" gave "+team+" a usable top end against "+foe+". Against "+foe+", the support behind the lead score made the top of "+team+" sustainable instead of solitary.",
      star+" gave "+team+" the headline and "+support+" kept it from becoming a solo act. That is the part worth carrying forward from "+foe+": useful support travels better than one spectacular box score.",
      team+" got enough from "+names+" to establish a real scoring spine against "+foe+". "+(won?"The win lets management build around it.":"The loss says the next job is supplying enough around it to stop wasting it."),
      "The top of "+team+"’s lineup did its job through "+names+". "+(won?"That is a foundation, not permission to assume the same Sunday repeats.":"That is why the loss belongs to the roster around them rather than the names already producing.")
    ],
    "tess-delaney":[
      names+" gave the "+a.mascot+" table enough real food that nobody needs another decorative centerpiece. "+(won?"Keep the menu; fix the empty chairs.":"The meal was respectable. The bill still arrived."),
      star+" handled the expensive course and "+support+" kept dinner from becoming performance art. "+(won?"That is a table worth setting again.":"That is the part of the evening worth carrying into the next reservation."),
      "The "+a.mascot+" got a proper center of gravity from "+names+". The next reservation does not require the same dishes; it requires the rest of the table to stop freeloading.",
      names+" gave "+team+" enough polish to look intentional. "+(won?"Victory gets the toast.":"Defeat gets the check.")+" The balance at the top kept the room from depending on one chair to carry dinner."
    ],
    "mack-hollis":[
      star+" brought the noise and "+support+" made sure it was not one guy screaming into an empty stadium. "+(won?"That is how a win gets loud without getting stupid.":"The rest of the lineup still managed to waste a perfectly good amplifier."),
      team+" had actual voltage from "+names+". "+(won?"Keep the circuit.":"Keep the circuit and stop plugging a toaster into the weak outlet.")+" Nobody needs the same exact box score next week.",
      "The "+a.mascot+" got punches from "+names+" instead of one lonely haymaker. "+(won?"That is the good kind of chaos.":"That is why the loss cannot be dumped on the stars."),
      names+" gave "+team+" enough real scoring to make the result interesting. The next step is backup, not asking the same people to shout even louder."
    ],
    "nora-voss":[
      star+" removed the easiest rival joke and "+support+" made another one harder to sell. "+(won?"Rivals can keep scrolling.":"Rivals can keep the final score, but the productive part of the lineup still did its job."),
      team+" gave rivals fewer openings because "+names+" actually showed up. The weakness sits farther down the lineup; those performances were not the problem.",
      names+" forced rival managers to work for their material. "+(won?"That is the kind of inconvenience a win can afford.":"The loss still belongs farther down the lineup."),
      "The rival version of Sunday gets less convenient once "+names+" are included. "+(won?"Keep the receipt.":"Keep the production and make the rest of the lineup earn its own defense.")
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}

function w2ProjectionOutlookRead(t,r,next){
  const own=Number(t?.next_projected),opp=Number(t?.next_opponent_projected);
  if(!Number.isFinite(own)||!Number.isFinite(opp))return null;
  const team=w2DisplayTeam(t.team_name),foe=w2DisplayTeam(next||t.next_opponent_name||"the opponent"),
    rid=String(r?.id||""),gap=Math.abs(own-opp),fav=own===opp?null:(own>opp?team:foe),v=w2Cohort(t)%4,
    ownPts=w2One(own),oppPts=w2One(opp),edge=w2One(gap),
    label=!fav?"no projection favorite":gap<3?"barely favored":gap<8?"modestly favored":"heavily favored";
  const rows={
    "walter-mercer":[
      team+" is projected at "+ownPts+" against "+foe+" at "+oppPts+". "+(fav?({
        "walter-mercer":"The "+edge+"-point forecast advantage belongs to "+fav,
        "tess-delaney":fav+" takes the "+edge+"-point favorite seat",
        "mack-hollis":fav+" owns the "+edge+"-point projection megaphone",
        "nora-voss":"Rivals see a "+edge+"-point forecast advantage for "+fav
       }[rid]||fav+" has a "+edge+"-point forecast edge")+", enough to set an expectation without settling the argument.":"There is no projection favorite; the numbers have declined to pick a side.")+" For "+team+", the "+Number(t.points||0).toFixed(1)+"-point previous result is a better measure than the forecast alone.",
      "The Week 3 board has "+team+" at "+ownPts+" and "+foe+" at "+oppPts+". "+(fav?fav+" carries the projection edge of "+edge+", which is useful context rather than a permission slip.":"That leaves no projection favorite and no numerical excuse for confidence.")+" Sunday gets the final word.",
      ownPts+" for "+team+" and "+oppPts+" for "+foe+" is the current projection. "+(fav?fav+" enters as "+label+" with a "+edge+"-point edge.":"The projection favorite is nobody; the line is even.")+" Treat that as the starting expectation, not a verdict with shoulder pads.",
      "Projection-wise, "+team+" brings "+ownPts+" to "+foe+"’s "+oppPts+". "+(fav?fav+" owns the "+edge+"-point edge and therefore the favorite label for now.":"Neither side owns a projection edge.")+" The actual lineup remains inconveniently necessary."
    ],
    "tess-delaney":[
      "The place cards read "+team+" "+ownPts+", "+foe+" "+oppPts+". "+(fav?({
        "walter-mercer":"The "+edge+"-point forecast advantage belongs to "+fav,
        "tess-delaney":fav+" takes the "+edge+"-point favorite seat",
        "mack-hollis":fav+" owns the "+edge+"-point projection megaphone",
        "nora-voss":"Rivals see a "+edge+"-point forecast advantage for "+fav
       }[rid]||fav+" has a "+edge+"-point forecast edge")+", so the reservation has a favorite without becoming a coronation.":"There is no projection favorite; even the seating chart has refused to gossip.")+" This table has already demonstrated poor manners.",
      team+" arrives with a "+ownPts+" projection while "+foe+" carries "+oppPts+". "+(fav?fav+" gets the favorite chair by "+edge+" points.":"The projection edge is zero, so nobody gets the favorite chair.")+" The room is still fully capable of embarrassing the place cards.",
      "For the next reservation, the forecast serves "+ownPts+" to "+team+" and "+oppPts+" to "+foe+". "+(fav?fav+" holds a "+edge+"-point projection edge.":"No projection favorite appears on the menu.")+" That is enough to set expectations and nowhere near enough to order champagne.",
      team+" is penciled in for "+ownPts+" and "+foe+" for "+oppPts+". "+(fav?fav+" wears the favorite label with a "+edge+"-point edge.":"The projection refuses to name a favorite.")+" Sunday is under no obligation to respect the seating chart."
    ],
    "mack-hollis":[
      "The projection board screams "+team+" "+ownPts+", "+foe+" "+oppPts+". "+(fav?fav+" is the favorite by "+edge+" points.":"There is no projection favorite; the numbers are tied and apparently afraid of commitment.")+" Now somebody has to survive the actual noise.",
      team+" gets "+ownPts+" on the forecast and "+foe+" gets "+oppPts+". "+(fav?fav+" owns a "+edge+"-point projection edge, enough to put the favorite badge on the door.":"Nobody owns a projection edge, so keep the favorite badge in the drawer.")+" One busted lineup call can still set the whole thing on fire.",
      "Week 3 projects "+ownPts+" for "+team+" against "+oppPts+" for "+foe+". "+(fav?fav+" carries the "+edge+"-point favorite edge.":"The projection favorite is a shrug.")+" Put it on the marquee if you want; the margin is where the yelling starts.",
      "The numbers put "+team+" at "+ownPts+" and "+foe+" at "+oppPts+". "+(fav?({
        "walter-mercer":"The "+edge+"-point forecast advantage belongs to "+fav,
        "tess-delaney":fav+" takes the "+edge+"-point favorite seat",
        "mack-hollis":fav+" owns the "+edge+"-point projection megaphone",
        "nora-voss":"Rivals see a "+edge+"-point forecast advantage for "+fav
       }[rid]||fav+" has a "+edge+"-point forecast edge")+".":"No projection favorite survives the math.")+" The spreadsheet has picked as much of a fight as it can; Sunday gets the final word."
    ],
    "nora-voss":[
      team+" projects to "+ownPts+" and "+foe+" to "+oppPts+". "+(fav?fav+" gets the favorite label with a "+edge+"-point projection edge.":"There is no projection favorite, which deprives rivals of one easy screenshot.")+" Somebody still has to survive the result afterward.",
      "The pregame screenshot shows "+team+" "+ownPts+" and "+foe+" "+oppPts+". "+(fav?fav+" owns a "+edge+"-point edge and the favorite tag.":"The projection edge is zero; neither side gets free bragging rights.")+" Rivals can frame the number until kickoff.",
      ownPts+" is the projection for "+team+"; "+oppPts+" is the number for "+foe+". "+(fav?({
        "walter-mercer":"The "+edge+"-point forecast advantage belongs to "+fav,
        "tess-delaney":fav+" takes the "+edge+"-point favorite seat",
        "mack-hollis":fav+" owns the "+edge+"-point projection megaphone",
        "nora-voss":"Rivals see a "+edge+"-point forecast advantage for "+fav
       }[rid]||fav+" has a "+edge+"-point forecast edge")+".":"The model declines to name a projection favorite.")+" The losing screenshot will still be larger.",
      "The forecast gives "+team+" "+ownPts+" and "+foe+" "+oppPts+". "+(fav?fav+" carries a "+edge+"-point favorite edge.":"There is no projection favorite and therefore no pregame punch line.")+" The matchup decides who has to live with it."
    ]
  };
  return (rows[rid]||rows["walter-mercer"])[v]
}
function w2LedeAliasRead(t,r,prev,prevWon,won){
  const a=w2Alias(t),team=w2DisplayTeam(t.team_name),rid=String(r?.id||"walter-mercer"),
    state=!prev?"no-history":prevWon===won?(won?"ww":"ll"):(won?"lw":"wl"),
    v=w2Hash(team+"|lede-alias|"+rid+"|"+state)%2;
  const rows={
    "walter-mercer":{
      "ww":[
        "Two wins have given "+team+" a useful early standard; the next job is proving the lineup can reproduce it without borrowing the same script.",
        team+" has banked both results. That buys confidence, not immunity from the quieter lineup questions still sitting underneath the record."
      ],
      "ll":[
        "Two losses have made the "+a.mascot+" correction list concrete. The next Sunday needs better production, not another explanation for why the same gaps stayed open.",
        team+" has dropped both games, so the focus has shifted from patience to repair: which lineup spots actually change the next result?"
      ],
      "lw":[
        "The "+a.mascot+" answered the opening loss with a "+Number(t.points||0).toFixed(1)+"-point win. That leaves "+team+" with a result worth keeping and a specific next opponent to prepare for.",
        team+" split the first two Sundays by responding to the opener. The win matters most as proof that the first result did not have to repeat."
      ],
      "wl":[
        team+" followed the previous win with a loss. "+((t.starter_details||[])[0]?.name||team)+" now carries the pressure to produce a response.",
        team+" has both a winning and losing recent example. "+((t.starter_details||[])[0]?.name||team)+" can help decide which version survives next."
      ],
      "no-history":[
        team+" has no complete opener to use as a clean comparison, so the second Sunday has to stand on its own merits.",
        "Without a complete opening snapshot, "+team+" gets judged on the result and the football that actually survived into this report."
      ]
    },
    "tess-delaney":{
      "ww":[
        "Two wins let the "+a.mascot+" keep the good china out for another week; the only vulgar move now would be confusing an early table with permanent seating.",
        team+" has paid both dinner checks with wins. The room may enjoy that without declaring every place setting untouchable."
      ],
      "ll":[
        "Two losses have made the "+a.mascot+" table considerably less decorative. Somebody needs to bring actual production before the next bill arrives.",
        team+" is 0-2, and no amount of polished silverware can make that tasteful. The next course needs points from places that have been serving air."
      ],
      "lw":[
        "The "+a.mascot+" followed the opening loss with a win, which is a much nicer second course than an excuse. Keep the correction; skip the coronation.",
        team+" answered a bad first dinner with a better second one. That earns another reservation, not ownership of the restaurant."
      ],
      "wl":[
        "The "+a.mascot+" opened with dessert and got handed the bill in Week 2. Now the table has to decide which version was actually dressed for the season.",
        team+" has one win and one loss, which is exactly enough evidence for the room to argue and nowhere near enough to settle the seating chart."
      ],
      "no-history":[
        "The opening place setting is incomplete, so the "+a.mascot+" get no elegant comparison to hide behind. This Sunday carries its own bill.",
        "Without a clean opener, "+team+" has to let the current plate speak for itself. Fortunately, the numbers are already sitting on the table."
      ]
    },
    "mack-hollis":{
      "ww":[
        "Two wins have the "+a.mascot+" making noise for a reason. Keep the speakers on; just do not confuse a loud Sunday with a parade permit.",
        team+" has a recent win to frame, but "+((t.starter_details||[])[0]?.name||team)+" cannot sing every part of the next one."
      ],
      "ll":[
        "The "+a.mascot+" have two recent losses. "+((t.starter_details||[])[0]?.name||team)+" needs more help across the lineup.",
        "The "+a.mascot+" have lost twice recently. "+((t.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0]?.name||"The quietest starter")+" is one place to begin the lineup review."
      ],
      "lw":[
        team+" answered the opening loss with a win, and that is the kind of response worth yelling about. Now do it again without needing the same emergency.",
        "The "+a.mascot+" punched back after Week 1. Good. The next headline asks whether that response had a sequel or just one loud page."
      ],
      "wl":[
        team+" followed the previous victory with a defeat. The "+a.mascot+" now need a cleaner second act from "+((t.starter_details||[])[0]?.name||team)+".",
        "The "+a.mascot+" went from one good headline to one bad one. Nobody needs panic about "+team+" yet, but the next Sunday suddenly has real stakes."
      ],
      "no-history":[
        team+" has no complete opener to compare against, which means this Sunday gets the microphone by itself. It had better say something useful.",
        "The opening tape is incomplete, so the "+a.mascot+" cannot hide behind a trend line. This result gets the whole headline."
      ]
    },
    "nora-voss":{
      "ww":[
        team+" has two wins, which is inconvenient for anybody hoping the first one was a typo. Rivals can wait for a cleaner weakness; the standings are not volunteering one.",
        "The "+a.mascot+" are 2-0, which means anybody still calling this start a fluke is now arguing with two Sundays and losing both."
      ],
      "ll":[
        team+" has lost twice, so rivals no longer need to manufacture the material. The roster has supplied enough of its own and now owes supporters a rebuttal.",
        "The "+a.mascot+" are 0-2. At this point the group chat does not need creativity; it needs only screenshots and the confidence to keep sending them."
      ],
      "lw":[
        team+" answered the opening loss, which ruins the easiest rival narrative. What matters now is whether the correction survives another opponent.",
        "The "+a.mascot+" dragged the season from 0-1 to 1-1. Not glamorous, but considerably more useful than spending another week digging."
      ],
      "wl":[
        team+" followed its opening victory with a loss to "+w2DisplayTeam(t.opponent_name||'the opposition')+". Rivals can enjoy the reversal; management has to explain the missing points.",
        "The "+a.mascot+" split the first two games. Week 3 gets to decide whether Week 2 was a bruise or the beginning of a habit."
      ],
      "no-history":[
        "There is no clean opener for rivals to compare with "+team+", so this result gets judged without the usual screenshot war.",
        "The first-week file is incomplete, which means the "+a.mascot+" get one less excuse and one less comparison. Sunday can stand on its own."
      ]
    }
  };
  const bank=(rows[rid]||rows["walter-mercer"])[state]||rows["walter-mercer"][state]||[];
  return bank[v]||""
}

function w2PreviousWeekBridge(t,r,prev,prevWon,won,prevOpp,prevScore){
  const a=w2Alias(t),team=w2DisplayTeam(t.team_name),rid=String(r?.id||"walter-mercer");
  const playerLead=w2Sentence(String((t.starter_details||[])[0]?.name||team));
  if(!prev){
    const missing={
      "walter-mercer":"There is no complete opening-week snapshot for "+team+", so Sunday gets evaluated on the result in front of us instead of a comparison we do not have.",
      "tess-delaney":"The opener is incomplete for "+team+", which removes the temptation to dress up a comparison that does not exist. This Sunday can answer for itself.",
      "mack-hollis":team+" has no complete Week 1 tape in the packet, so the latest Sunday gets the whole spotlight. No fake trend line required.",
      "nora-voss":"Rivals do not get a clean Week 1 comparison for "+team+". Fine. The current result supplied enough material without borrowing any."
    };
    return missing[rid]||missing["walter-mercer"]
  }
  const outcome=prevWon?"beat":"lost to",score=String(prevScore||""),foe=w2DisplayTeam(prevOpp),v=w2Hash(team+"|previous-week-bridge|"+rid)%4;
  const banks={
    "walter-mercer":[
      "A week earlier, "+team+" "+outcome+" "+foe+" "+score+". That opener belongs in the comparison, but the current Sunday gets its own evaluation.",
      "The prior result against "+foe+" read "+score+" for "+team+". "+playerLead+" now gives the ledger another entry.",
      team+" came out of Week 1 with a "+score+" "+(prevWon?"win over ":"loss to ")+foe+". The next Sunday changes the season sample; it does not simply photocopy the first conclusion.",
      "In the earlier visit with "+foe+", "+team+" "+(prevWon?"banked":"dropped")+" the "+score+" decision. "+playerLead+" now offers the beat desk its next, more revealing piece of evidence."
    ],
    "tess-delaney":[
      team+" arrived from Week 1 carrying a "+score+" "+(prevWon?"win over ":"loss to ")+foe+". The second Sunday changes the conversation without requiring us to pretend the opener vanished.",
      "The opener gave "+team+" a "+score+" "+(prevWon?"win over ":"loss to ")+foe+". Week 2 is the next chapter, not a decorative reprint of the first one.",
      "One week earlier, "+team+" "+outcome+" "+foe+" "+score+". That result still belongs in the story, but Sunday has earned the right to change the tone.",
      team+" opened at "+score+" against "+foe+" and left with "+(prevWon?"a win":"a loss")+". The current result gets compared with that beginning without being forced to imitate it."
    ],
    "mack-hollis":[
      "The previous result against "+foe+" was "+score+" for "+team+". "+playerLead+" gives this week's score a fresh point of comparison.",
      team+" left the opener with a "+score+" "+(prevWon?"win over ":"loss to ")+foe+". Another Sunday means another piece of evidence and, thankfully, a different argument.",
      "A week earlier "+team+" posted "+score+" against "+foe+". "+playerLead+" gives the new angle.",
      "Against "+foe+", "+team+" previously posted "+score+". "+playerLead+" supplies the new reference point this week."
    ],
    "nora-voss":[
      "Rivals already had "+team+"'s "+score+" result against "+foe+" in the chat. "+((t.starter_details||[])[0]?.name||team)+" gets the fresh headline.",
      ([
        "The "+score+" "+(prevWon?"win":"loss")+" with "+foe+" is old news to the "+team+" crowd. Their latest "+Number(t.points||0).toFixed(1)+"-point showing has a separate argument to make.",
        team+" brought the "+score+" "+(prevWon?"victory":"defeat")+" against "+foe+" into the new week; the argument now runs through "+((t.starter_details||[])[0]?.name||team)+".",
        "The "+foe+" result went "+score+" for "+team+". Its second examination begins with "+Number(t.points||0).toFixed(1)+" fresh fantasy points, not that old verdict.",
        "Every rival remembers "+team+"'s "+score+" date with "+foe+". The latest starters have supplied a different set of names for the argument.",
        "That "+score+" line against "+foe+" is part of "+team+"'s record, not a standing invitation to predict the next result.",
        "The "+foe+" scoreboard read "+score+" last time. For "+team+", the current week's performance demands a new headline.",
        team+" previously finished "+score+" with "+foe+". Now "+((t.starter_details||[])[0]?.name||team)+" is where the next round of criticism or applause begins.",
        "Rivals can cite "+team+"'s "+score+" "+(prevWon?"success":"setback")+" against "+foe+" all they like; this week's "+Number(t.points||0).toFixed(1)+" is a different story.",
        "That earlier "+score+" game with "+foe+" belongs to "+team+"'s archive. Sunday supplied its own lineup verdict.",
        "On the last trip past "+foe+", "+team+" left with "+score+". The new box score must stand on what happened this week."
      ])[w2Hash(team+"|nora-bridge-variants")%10],
      "The first result on "+team+" was "+score+" against "+foe+", a "+(prevWon?"win":"loss")+". Rivals can keep it, but they do not get to pretend the second Sunday said the exact same thing.",
      "Rivals already saw "+team+"'s "+score+" against "+foe+". "+((t.starter_details||[])[0]?.name||team)+" now gives them a different argument."
    ]
  };
  const bank=banks[rid]||banks["walter-mercer"],chosen=bank[v],cut=chosen.indexOf(". ");
  return cut>=0?chosen.slice(0,cut)+"; "+chosen.slice(cut+2,cut+3).toLowerCase()+chosen.slice(cut+3):chosen
}

function w2BuildSections(t,prev){
  const a=t.inquirer_article||{},r=a.reporter||{},alias=w2Alias(t),won=Number(t.points)>Number(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points)),rec=w2Record(t),rank=Number(t?.league_context?.standings_rank)||null,
    prevWon=prev?Number(prev.points)>Number(prev.opponent_points):null,prevOpp=w2DisplayTeam(prev?.opponent_name||"last week’s opponent"),prevScore=prev?w2One(prev.points)+"–"+w2One(prev.opponent_points):null,top=(t.starter_details||[]).slice(0,3),opp=t.opponent_name||"the opponent";
  const lede=[
    w2S(t,r,"lede-hook",w2OpeningHook(t,r,won,margin,opp,top)),
    w2S(t,r,"lede-result",w2DisplayTeam(t.team_name)+" "+(won?"beat ":"lost to ")+w2DisplayTeam(opp)+" "+w2One(t.points)+"–"+w2One(t.opponent_points)+", leaving the "+alias.mascot+" at "+rec+(rank?" and No. "+rank+" in the league order":"")+". "),
    w2S(t,r,"lede-prev",w2PreviousWeekBridge(t,r,prev,prevWon,won,prevOpp,prevScore)),
    w2S(t,r,"lede-shape",w2LedeShape(t,r,won,margin,opp,top)),
    w2S(t,r,"lede-alias",w2LedeAliasRead(t,r,prev,prevWon,won))
  ];
  // Report meaningful contributors, not a mandatory podium of three scorers.
  // One prominent performance may be the story; two get space when both
  // cleared a genuinely useful scoring threshold.
  const spotlights=Number(week)<=2?top:top.slice(0,top.length>1&&Number(top[1]?.points)>=15?2:1);
  const players=[];
  for(let i=0;i<spotlights.length;i++){
    const p=spotlights[i];if(!p)continue;const pp=w2PrevPlayer(prev,p.id),acq=p.acquisition;
    players.push(w2S(t,r,"player-stat-"+i,(i===0?("Against "+w2DisplayTeam(opp)+", "+p.name+" led the "+alias.mascot+" with "+w2One(p.points)+" fantasy points"+w2StatClause(p)+"."):i===1?("Against "+w2DisplayTeam(opp)+", "+p.name+" added "+w2One(p.points)+" for the "+alias.mascot+w2StatClause(p)+"."):(alias.mascot+" also got "+w2One(p.points)+" from "+p.name+w2StatClause(p)+"."))));
    players.push(w2S(t,r,"player-read-"+i,w2PlayerColumnRead(t,r,p,pp,i,opp,won)+(acq&&Number(acq.season)===season&&Number(acq.week)===week?" The Week 2 trade that brought "+p.name+" in put the new arrival on the Sunday stage immediately.":"")));
  }
  const discussed=new Set(spotlights.filter(Boolean).map(p=>String(p.id)));
  const rememberedAcquisitions=(t.trade_acquisitions||[]).map(x=>{
    const p=(t.starter_details||[]).find(p=>String(p?.id)===String(x?.player_id)||p?.name===x?.player_name);
    return{x,p};
  }).filter(({x,p})=>x?.player_name&&p&&!discussed.has(String(x.player_id))&&Number(p?.points)>=10&&
    (Number(week)<=2||(Number(x.season)===Number(season)&&Number(x.week)>=Number(week)-2)))
    .sort((a,b)=>Number(b.p?.points)-Number(a.p?.points)||Number(b.x?.season)-Number(a.x?.season)||Number(b.x?.week)-Number(a.x?.week))
    .slice(0,1).map(({x})=>x);
  for(let i=0;i<rememberedAcquisitions.length;i++){
    const acq=rememberedAcquisitions[i],out=(acq.outgoing_player_names||[]).filter(Boolean);
    const variants=[
      acq.player_name+" did not need a Week 2 scoring headline to matter to the "+alias.mascot+" roster story; "+t.team_name+" acquired him by trade"+(out.length?", with "+w2Natural(out)+" among the players sent the other way":"")+", and the deal now lives or dies with what this version of the roster becomes.",
      "Do not lose "+acq.player_name+" in the Week 2 box score; "+t.team_name+" brought "+acq.player_name+" in by trade"+(out.length?" while moving "+w2Natural(out):"")+", so every useful role now adds another line to management’s return on that move.",
      acq.player_name+" is part of this roster’s older story too: the route to "+t.team_name+" was a trade"+(out.length?" that sent "+w2Natural(out)+" away":"")+"; Week 2 does not need a huge fantasy total from "+acq.player_name+" for that acquisition to remain relevant to how "+t.team_name+" was built.",
      "There is one roster-memory note worth keeping beside the Week 2 stars: "+acq.player_name+" arrived through a trade"+(out.length?" involving "+w2Natural(out)+" going out":"")+"; that history matters for "+t.team_name+" because management chose this version of the roster, not merely the lineup that happened to score Sunday."
    ];
    players.push(w2S(t,r,"player-acquisition-"+i,variants[(w2Cohort(t)+i)%variants.length]));
  }

  players.push(...w2IdentityRead(t,prev,r,spotlights,opp));
  const weakPreview=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0];
  if(Number(week)<=2)players.push(w2S(t,r,"player-synthesis",w2PlayerSynthesisRead(t,r,top,opp,won)));
  const weakDepth=weakPreview;
  const miss=t.best_lineup_miss,gap=Number(miss?.gap)||0;
  const management=[
    w2S(t,r,"mgmt-one",miss&&gap>0?w2BenchRead(t,r,miss,gap,won,margin):(t.manager_name+" did not leave an obvious higher-scoring bench answer in a compatible spot, so the Week 2 review belongs on the players who actually had the matchup rather than a fantasy-perfect lineup that never existed.")),
    w2S(t,r,"mgmt-two",w2ManagementMoveRead(t,r,won,margin)),
    w2S(t,r,"mgmt-meaning",w2ManagementDepthRead(t,r,weakDepth,t.next_opponent_name))
  ];
  const v=t.value_history_week,d=Number(v?.delta),pct=Math.abs(Number(v?.pct)),showMarket=Number.isFinite(d)&&(Number.isFinite(pct)?pct>=3:Math.abs(d)>=1500),moverReads=w2ValueMoverReads(t,r),value=showMarket?[
    w2S(t,r,"value-one",w2ValueMarketRead(t,r,d,pct)),
    ...moverReads
  ]:["n/a"];
  const weak=(t.starter_details||[]).slice().sort((x,y)=>Number(x.points)-Number(y.points))[0],weakPrev=weak?w2PrevPlayer(prev,weak.id):null,hot=[
    w2S(t,r,"hot-one",weak&&weakPrev?w2HotTrend(t,r,weak,weakPrev):w2WeakSpotRead(t,r,weak,won,margin))
  ];
  const eligibleCredit=w2EligibleCool(t),topIds=new Set(top.filter(Boolean).map(p=>String(p.id))),supportCredit=(t.starter_details||[]).filter(p=>!topIds.has(String(p.id))&&Number(p.points)>=10).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2);
  const cool=eligibleCredit.length<2&&supportCredit.length?[
    w2S(t,r,"cool-one",supportCredit.length===1
      ?supportCredit[0].name+" gets the under-the-radar credit after "+w2One(supportCredit[0].points)+" points from outside the featured scoring story."
      :w2Natural(supportCredit.map(p=>p.name))+" deserve the under-the-radar credit after "+w2One(supportCredit.reduce((n,p)=>n+Number(p.points||0),0))+" combined points from outside the featured scorers.")
  ]:["n/a"];
  const fs=a.fan_sentiment||{},prevSent=prev?.inquirer_article?.fan_sentiment||{},sentiment=(Number(week)>2
    ?forwardFanScenes(t,won,week,variationSalt)
    :[w2SentimentRead(t,prev,r,fs,prevSent,won),w2SentimentFollowup(t,prev,r,fs,prevSent,won)])
    .map((line,i)=>w2S(t,r,"sent-"+i,line));
  const nctx=t.next_opponent_context||{},nrec=nctx.record||{},nrecord=String(Number(nrec.wins)||0)+"-"+String(Number(nrec.losses)||0),ndiv=t.next_opponent_division_context?.division_name||"its division",leaders=(t.division_context?.leaders||[]).filter(x=>x?.team_name),selfLead=leaders.some(x=>String(x.roster_id)===String(t.roster_id)),otherLeaders=leaders.filter(x=>String(x.roster_id)!==String(t.roster_id)),divisionPeers=[...(t.division_context?.ahead_teams||[]),...(t.division_context?.same_record_teams||[]),...(t.division_context?.behind_teams||[])].filter((x,i,a)=>x?.team_name&&String(x.roster_id)!==String(t.roster_id)&&a.findIndex(y=>String(y.roster_id)===String(x.roster_id))===i),divisionPeerLine=divisionPeers.map(x=>w2DisplayTeam(x.team_name)+" ("+String(Number(x?.record?.wins)||0)+"-"+String(Number(x?.record?.losses)||0)+")"),next=t.next_opponent_name||"the next opponent",
    nextStar=(t.next_opponent_roster?.starters||t.next_opponent_roster?.players||[]).filter(p=>p?.name).slice().sort((x,y)=>Number(y.season_fantasy_points||y.points||0)-Number(x.season_fantasy_points||x.points||0))[0],
    up=(t.upcoming_opponents||[]).slice().sort((x,y)=>Number(x.week)-Number(y.week)),later=up.slice(1,3);
  const projectionRead=w2ProjectionOutlookRead(t,r,next);
  const outlook=[
    w2S(t,r,"outlook-one",w2OutlookLead(t,r,next,nrecord,nctx,ndiv)),
    ...(projectionRead?[w2S(t,r,"outlook-projection",projectionRead)]:[]),
    w2S(t,r,"outlook-two",w2DivisionRead(t,r,divisionPeerLine,selfLead,otherLeaders)),
    w2S(t,r,"outlook-three",nextStar?(w2NextStarRead(t,r,next,nextStar)):"The "+alias.mascot+" do not need a manufactured opponent star to understand Week 3: their own quietest Week 2 lineup spot is already the obvious place to demand more against "+next+"."),
    later.length?w2S(t,r,"outlook-road",w2RoadRead(t,r,next,later)):w2S(t,r,"outlook-road","The schedule beyond Week 3 is not complete enough for a larger claim, so the next assignment stays simple: beat the team on the page."),
    w2S(t,r,"outlook-bottom-line",w2ClosingRead(t,r,won,margin,top,weak,next))
  ];
  const injuryStarters=(t.next_week_availability?.injury_current_starters||[]).filter(x=>x?.name&&x?.designation);
  if(injuryStarters.length){const x=injuryStarters[0];outlook.splice(3,0,w2S(t,r,"outlook-health",w2InjuryOutlookRead(t,r,x,next)))}
  let trade=null;const oldTrade=(a.sections||[]).find(s=>s.kind==="trade-commentary");
  if(oldTrade){
    const tr=(t.trade_history||[])[0],own=(tr?.sides||[]).find(s=>String(s.roster_id)===String(t.roster_id)),other=(tr?.sides||[]).find(s=>String(s.roster_id)!==String(t.roster_id)),otherName=tr?.team_names?.[String(other?.roster_id)]||"the other side",ownAssets=w2TradeAssets(t,own),otherAssets=w2TradeAssets(t,other);
    if(tr&&own&&other&&ownAssets.length&&otherAssets.length){
      const valueRead=w2TradeValueRead(t,r,own,other,otherName,ownAssets,otherAssets),
        incomingStarted=(t.starter_details||[]).filter(p=>(own?.player_ids||[]).map(String).includes(String(p.id))).sort((a,b)=>Number(b.points)-Number(a.points))[0],
        immediate=incomingStarted
          ?incomingStarted.name+" immediately put "+w2One(incomingStarted.points)+" into the Week 2 lineup for "+w2DisplayTeam(t.team_name)+". That does not settle a dynasty trade, but it gives the receiving side something more useful than a future-tense explanation."
          :null;
      trade=[
        w2S(t,r,"trade-one",w2DisplayTeam(t.team_name)+" received "+w2Natural(ownAssets)+", while "+w2DisplayTeam(otherName)+" received "+w2Natural(otherAssets)+"."),
        ...(valueRead?[w2S(t,r,"trade-value",valueRead)]:[]),
        ...(immediate?[w2S(t,r,"trade-week2",immediate)]:[])
      ]
    }
  }
  const byKind={lede,players,management,value,"hot-seat":hot,"cool-throne":cool,sentiment,outlook};if(trade)byKind["trade-commentary"]=trade;
  const orders=[["lede","players","management","hot-seat","cool-throne","value","sentiment","outlook"],["lede","players","cool-throne","management","value","hot-seat","sentiment","outlook"],["lede","hot-seat","players","management","cool-throne","sentiment","value","outlook"],["lede","players","sentiment","management","hot-seat","value","cool-throne","outlook"]],order=orders[Math.floor(Math.max(0,(Number(t.roster_id)||1)-1)/4)%4].slice();
  if(trade){const i=order.indexOf("management");order.splice(i+1,0,"trade-commentary")}
  return order.map(kind=>({kind,heading:kind==="trade-commentary"?"Trade Receipt: What Week 2 Added":w2SectionHead(r,kind),paragraphs:(byKind[kind]||[]).filter(p=>String(p||'').trim().toLowerCase()!=='n/a')})).filter(x=>Array.isArray(x.paragraphs)&&x.paragraphs.length)
}
function w2RoycingtonFootballPolish(t,body){
  let s=String(body||""),v=Math.floor(Math.max(0,(Number(t?.roster_id)||1)-1)/4)%8,
    pick=xs=>xs[v%xs.length];
  const swaps=[
    ["The additions stayed off the Week 2 starting card.",pick(["None of the new names reached the Week 2 lineup.","Week 2 came and went without the new additions starting.","The fresh transactions never made it onto the Week 2 starting card.","The new arrivals stayed on the sideline when the Week 2 lineup locked."])],
    ["That is roster churn, not a scoring explanation.",pick(["That is activity, not an explanation for the score.","The transaction count is movement, not the reason Sunday went wrong.","Those moves belong to the roster log, not the scoring alibi.","Busy management still does not explain the points that actually reached the lineup."])],
    ["Division shots are limited, the division winner gets a playoff berth, and one head-to-head result hits both teams at once.","Division chances are scarce, and one head-to-head result moves both teams while the winner still earns the playoff berth."],
    ["Now somebody has to survive the actual noise.","The projection has spoken; the actual game still gets to embarrass it."],
    ["One Sunday decides whether the next stretch sounds like momentum or an emergency broadcast.","Win this one and the next stretch feels like momentum; lose it and every game behind it gets louder."],
    ["Enough autopsy—Week 3 needs a different lineup story, not a third version of the same complaint.","The autopsy has gone on long enough; Week 3 needs a new answer."],
    ["Now make the good part repeat loudly enough that this week’s weak spot becomes old news.","Repeat what worked loudly enough and this week’s weakness becomes yesterday’s complaint."],
    ["Nobody needs the same exact box score next week.","Next week does not require the same box score, only another useful version of the role."],
    ["Leave it alone and the same circuit gets another chance to spark.","Ignore it and the same weakness gets another Sunday to hurt them."],
    ["Some of it is management getting free advice at dangerous volume.","Some of the noise is the fan base handing management free advice at full volume."],
    ["The division crown punches a playoff ticket in this league.","Win the division and the playoff berth comes with it; that is why this game carries extra weight."],
    ["That is why this one gets the megaphone.","That is why this matchup deserves more volume than an ordinary regular-season game."],
    ["One busted lineup call can still set the whole thing on fire.","One bad lineup decision can still turn a close game into a week of regret."],
    ["Week 3 is the volume knob for everything behind it.","Week 3 decides whether the rest of this stretch gets discussed as opportunity or damage control."],
    ["The headline gets louder only if the supporting lineup stops making the stars do all the shouting.",pick(["The next headline only gets better if the supporting lineup stops outsourcing everything to the stars.","A bigger headline requires more than the stars doing emergency work again.","The stars have done enough shouting; the supporting lineup has to give the next headline some depth.","The next headline belongs to the whole lineup only if the support finally earns a line of its own."])],
    ["That is why the loss cannot be dumped on the stars.","The stars did enough to keep this loss from belonging to them."],
    ["If the issue disappears, everybody laughs and moves on.","Fix the issue and the joke dies before next Sunday."],
    ["If it stays, the joke gets a season ticket.","Let it survive another week and the punch line starts looking like a roster identity."],
    ["There are not many direct swings like this, and the prize for winning the division is a playoff berth.","Direct division swings are limited, and the winner’s playoff berth makes each one expensive."],
    ["Put it on the marquee if you want; the margin is where the yelling starts.","The projection can have the marquee; the margin is where the argument actually begins."],
    ["That is how one result turns a schedule into either runway or rubble.","One result can make the games behind it look like runway or repair work."],
    ["The next step is backup, not asking the same people to shout even louder.","The next answer is support, not asking the same stars for an encore."],
    ["Nobody needs a siren yet, but the siren has been located.","This is not alarm territory yet, but everyone now knows exactly where the problem lives."],
    ["The answer belongs on the starting card, not in Monday’s emergency broadcast.","The correction has to appear in the lineup before it shows up in Monday’s excuses."],
    ["The spreadsheet has picked as much of a fight as it can; Sunday gets the final word.","The spreadsheet has finished its argument. Sunday gets the ruling."],
    ["The rest of the road changes personality based on what happens first.","Everything after Week 3 feels different depending on which result comes first."]
  ];
  for(const [from,to] of swaps)s=s.replaceAll(from,to);

  const noMovePrefixes=[
    "The Week 2 transaction log stayed empty for ",
    "No completed Week 2 roster move came from ",
    "Week 2 passed without a completed roster move from ",
    "The roster wire shows no completed Week 2 move from ",
    "Management left the Week 2 transaction line blank for ",
    "No Week 2 add, drop or trade was completed by ",
    "The Week 2 roster ledger has no completed move from ",
    "Week 2 produced no completed roster move from "
  ];
  if(s.includes("There was no completed Week 2 roster move for "))s=s.replace("There was no completed Week 2 roster move for ",pick(noMovePrefixes));

  const voiceSwaps=[
    [" are next, which gives management one clean chance to change the lineup before the same complaint reaches the megaphone again."," are next; management gets one clean Sunday to make the obvious adjustment before the complaint hardens into habit."],
    ["The projection board screams ","The forecast refuses to whisper: "],
    ["Win Week 3 and ","Take care of Week 3 and "],
    [" becomes the first fire alarm."," becomes the game that makes everybody nervous."],
    [" more than Week 2 did."," more than Week 2 managed."],
    [" on the forecast and "," on the Week 3 board; "],
    [" projection edge, enough to put the favorite badge on the door."," projection edge, enough to justify the favorite label without pretending the game is settled."],
    [" are the first punch, then "," come first; "],
    [" shows up next, so management can either press it or explain why it ignored the light."," shows up next; management has to act on the warning before it becomes another Monday argument."],
    ["Week 3 projects ","The Week 3 forecast settles at "],
    ["The next stretch runs ","After this one, the schedule reads "],
    ["Beat the first team and the noise stays fun; lose and the crowd starts treating ","Handle Week 3 and the swagger survives; lose and the crowd starts treating "],
    [" because the top of the lineup produced and the rest did not leave much for ","; the top of the lineup produced, and that left "],
    [" to erase on the scoreboard."," chasing too much scoreboard ground."],
    [" hold a projection edge of "," hold the projection edge at "],
    ["The numbers put ","The Week 3 math puts "],
    ["Week 3 starts with ","The next stretch starts with "]
  ];
  for(const [from,to] of voiceSwaps)s=s.replaceAll(from,to);
  s=s.replace(/Win it and the ([^.;]+?) get to attack; lose it and ([^.;]+?) shows up carrying everybody’s panic\./g,"Win it and the $1 can treat the next game as opportunity; lose and $2 becomes the matchup that turns every unresolved flaw into a louder question.");
  s=s.replaceAll(" a headline score inside a result nobody wants framed"," a top-end score inside a loss nobody wants remembered");
  if(s.includes(" headline belongs to ")&&s.includes(", but the repeatable part is"))s=s.replace(" headline belongs to "," lead credit goes to ").replace(", but the repeatable part is",", but the part worth trusting again is");
  return s
}
function rewriteWeek2Team(t,prev){
  const normalized={...t,team_name:w2DisplayTeam(t.team_name),opponent_name:w2DisplayTeam(t.opponent_name),next_opponent_name:w2DisplayTeam(t.next_opponent_name),
    starter_details:(t.starter_details||[]).map(p=>({...p,week1_points:w2PrevPlayer(prev,p.id)?.points??null}))};
  const a=normalized.inquirer_article||{},roycington=String(a?.reporter?.id||"")==="tess-delaney",
    styleReporter=roycington?{...(a.reporter||{}),id:"mack-hollis"}:(a.reporter||{}),
    styleTeam=roycington?{...normalized,inquirer_article:{...a,reporter:styleReporter}}:normalized,
    built=w2BuildSections(styleTeam,prev),
    sections=roycington?built.map(s=>({...s,heading:s.kind==="trade-commentary"?"Trade Receipt: What Week 2 Added":w2SectionHead(a.reporter||{},s.kind),paragraphs:(s.paragraphs||[]).map(p=>w2RoycingtonFootballPolish(normalized,p))})):built,
    paragraphs=sections.flatMap(s=>s.paragraphs||[]),
    headline=w2TeamGrammar(normalized,w2Headline(normalized,a.reporter||{}));
  return{...normalized,inquirer_article:{...a,headline,deck:(a.reporter?.desk||"Fleeced! Inquirer")+" • "+String(normalized.week_classification?.label||"Week 2"),sections,paragraphs,editorial_revision:14}}
}
function w2Games(teams){const by=new Map((teams||[]).map(t=>[String(t.roster_id),t])),seen=new Set(),out=[];for(const t of teams||[]){const o=by.get(String(t.opponent_roster_id));if(!o)continue;const k=[String(t.roster_id),String(o.roster_id)].sort().join("|");if(seen.has(k))continue;seen.add(k);const w=Number(t.points)>=Number(o.points)?t:o,l=w===t?o:t,margin=Math.abs(Number(w.points)-Number(l.points)),proj=Number.isFinite(Number(w.projected))&&Number.isFinite(Number(l.projected)),upset=proj&&Number(w.projected)<Number(l.projected);out.push({winner:w,loser:l,margin,upset,combined:Number(w.points)+Number(l.points)})}return out}
function w2RecapStat(p){if(!p)return"";const stat=w2Stat(p);return p.name+" — "+w2One(p.points)+" fantasy points"+(stat?", "+stat:"")}

function w2TrajectorySentence(t,mode,r){
  const team=w2DisplayTeam(t.team_name),rank=Number(t?.league_context?.standings_rank)||null,m=t?.mida_outlook||{},
    top=(t?.starter_details||[])[0],second=(t?.starter_details||[])[1],
    weak=(t?.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],
    prev=previousByRoster.get(String(t.roster_id))||null,
    prevPts=Number(prev?.points),now=Number(t.points),delta=Number.isFinite(prevPts)?now-prevPts:null,
    prevWon=prev?Number(prev.points)>Number(prev.opponent_points):null,won=Number(t.points)>Number(t.opponent_points),
    playoff=Number(m.playoff),title=Number(m.title),v=w2Hash(team+"|two-week|"+mode+"|"+String(r?.id||""))%4;
  const scoreRead=Number.isFinite(delta)
    ?(Math.abs(delta)<8
      ?team+" stayed within "+w2One(Math.abs(delta))+" points of its Week 1 scoring level, which is the closest thing two games can offer to a floor."
      :team+" moved "+w2One(Math.abs(delta))+" points "+(delta>0?"up":"down")+" from Week 1, a swing large enough to change the shape of the two-week sample.")
    :"The Week 2 total has to stand on its own because the opener is not complete enough for a clean team-score comparison.";
  const starRead=top
    ?top.name+" led Week 2 at "+w2One(top.points)+(second?", with "+second.name+" next at "+w2One(second.points):"")+"."
    :"The top of the Week 2 lineup did not provide a clean individual anchor.";
  const weakRead=weak?weak.name+" finished at "+w2One(weak.points)+", so the bottom of the lineup still has a receipt attached.":"";
  if(mode==="undefeated"){
    const longView=Number.isFinite(title)&&title>=10
      ?" MIDA’s "+w2MidaPct(title)+" title outlook says the clean record is attached to more than an early-season illusion."
      :Number.isFinite(playoff)&&playoff>=65
        ?" MIDA has the playoff outlook at "+w2MidaPct(playoff)+", so the longer view is taking the start seriously too."
        :"";
    const rows=[
      team+" is 2-0, but the interesting part is how it got there. "+scoreRead+" "+starRead+" "+weakRead+longView,
      "Two wins have "+team+" clean in the standings without making the box scores identical. "+scoreRead+" "+starRead+" "+weakRead+longView,
      team+" has banked both Sundays. "+scoreRead+" "+starRead+" "+weakRead+longView,
      "The undefeated record is real; the method is still developing. "+scoreRead+" "+starRead+" "+weakRead+longView
    ];
    return rows[v]
  }
  if(mode==="winless"){
    const direction=Number.isFinite(delta)&&delta>12
      ?"The second loss was at least attached to more offense than the first, which is progress in the same way finding one dry sock in a flooded basement is progress."
      :Number.isFinite(delta)&&delta<-12
        ?"The second Sunday got worse on the scoreboard, so nobody gets to sell 0-2 as two unlucky copies of the same game."
        :"The two losses arrived with roughly the same scoring neighborhood, which makes the problem harder to dismiss as one freak Sunday.";
    const longView=Number.isFinite(playoff)&&playoff>=20
      ?" MIDA still leaves "+team+" a "+w2MidaPct(playoff)+" playoff path, so the model has not called the coroner."
      :"";
    const rows=[
      team+" is 0-2, and the losses are already giving us different clues. "+scoreRead+" "+direction+" "+starRead+" "+weakRead+longView,
      "The record says 0-2; the two Sundays explain why in different handwriting. "+scoreRead+" "+starRead+" "+weakRead+" "+direction+longView,
      team+" has lost twice, and the two defeats are already pointing in different directions. "+scoreRead+" "+starRead+" "+weakRead+" "+direction+longView,
      "Two losses have removed the luxury of calling everything noise. "+scoreRead+" "+direction+" "+starRead+" "+weakRead+longView
    ];
    return rows[v]
  }
  const resultTurn=prev
    ?(prevWon===won
      ?"Both weeks landed on the same side of the result column, which makes the scoring change more interesting than the record change."
      :won
        ?"Week 2 answered a Week 1 loss, so the split record contains an actual correction rather than two unrelated Sundays."
        :"Week 2 erased the comfort of the opening win, which is why 1-1 feels less neutral than it looks.")
    :"The split record still needs the scoring underneath it to explain which Sunday deserves more trust.";
  const longView=Number.isFinite(playoff)
    ?" MIDA puts the playoff outlook at "+w2MidaPct(playoff)+", useful context for a team whose first two results are arguing with each other."
    :"";
  const rows=[
    team+" is 1-1, which is where the first two Sundays start disagreeing in public. "+resultTurn+" "+scoreRead+" "+starRead+" "+weakRead+longView,
    "At 1-1, "+team+" already has one Sunday it would frame and another it would hide behind the water heater. "+resultTurn+" "+scoreRead+" "+starRead+" "+weakRead+longView,
    team+" split the first two games, but the scoring underneath them is not a coin flip. "+scoreRead+" "+resultTurn+" "+starRead+" "+weakRead+longView,
    "One win and one loss have "+team+" sitting in the middle without actually feeling middle-of-the-road. "+scoreRead+" "+resultTurn+" "+starRead+" "+weakRead+longView
  ];
  return rows[v]
}
function w2RecordGroupRead(rows,mode,r){
  const scored=(rows||[]).map(t=>{
    const prev=previousByRoster.get(String(t.roster_id))||null,m=t?.mida_outlook||{},
      delta=Number.isFinite(Number(prev?.points))?Math.abs(Number(t.points)-Number(prev.points)):0,
      top=Number(t?.starter_details?.[0]?.points)||0,weak=Math.abs(Number((t?.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0]?.points)||0),
      title=Number(m.title),playoff=Number(m.playoff);
    let interest=delta/3+top/5+Math.max(0,8-weak);
    if(Number.isFinite(title))interest+=title/5;
    if(Number.isFinite(playoff))interest+=Math.abs(playoff-50)/12;
    return{t,interest}
  }).sort((a,b)=>b.interest-a.interest||Number(a.t.roster_id)-Number(b.t.roster_id));
  const chosen=scored.slice(0,4).map(x=>x.t);
  if(!chosen.length)return[];
  const copy=chosen.map(t=>w2TrajectorySentence(t,mode,r));
  const opener=mode==="undefeated"
    ?"The 2-0 teams have already arrived by different roads: some found a scoring floor, some found a star, and some are hiding a soft spot underneath a spotless record. "
    :mode==="winless"
      ?"The 0-2 records are not one diagnosis. Some teams are improving while losing, some are sliding, and some have one obvious lineup wound everybody can see. "
      :"At 1-1, every team has one Sunday it would like framed and another it would rather leave in the trunk. The scoring underneath the split tells us more than the symmetry does. ";
  const mid=Math.ceil(copy.length/2),parts=[copy.slice(0,mid),copy.slice(mid)].filter(x=>x.length);
  const follow=mode==="undefeated"
    ?"The same clean record looks different elsewhere. "
    :mode==="winless"
      ?"The losses wear different bruises elsewhere. "
      :"The split records keep disagreeing in different ways. ";
  return parts.map((part,i)=>(i===0?opener:follow)+part.join(" "))
}
function w2PlayerOfWeekRead(t,p,r){
  const team=w2DisplayTeam(t.team_name),won=Number(t.points)>Number(t.opponent_points),rid=String(r?.id||""),pts=w2One(p.points),
    stat=w2Stat(p),real=stat?(" "+stat+"."):"",prior=Number(p?.prior_season_avg),change=Number.isFinite(prior)?Number(p.points)-prior:null;
  const base=p.name+" is the Week 2 Player of the Week after "+pts+" fantasy points for "+team+"."+real;
  const rows={
    "walter-mercer":base+" "+(won?"The score mattered inside a win, which is the cleanest argument available.":"The team wasted it, but the player did not.")+(Number.isFinite(change)&&Math.abs(change)>=5?" It also cleared last season’s average by "+w2One(Math.abs(change))+" points, enough to make the performance more than routine.":""),
    "tess-delaney":base+" The room can keep its speeches short: when one player owns the loudest useful performance of the week, the centerpiece has already introduced himself.",
    "mack-hollis":base+" That is the weekly trophy. No committee meeting, no inspirational montage, just the biggest useful number on the board and everybody else yelling underneath it.",
    "nora-voss":base+" Rivals are free to complain about the team around him; they do not get to pretend this performance was the joke."
  };
  return rows[rid]||rows["walter-mercer"]
}
function w2UpsetCallRead(under,fav,r){
  const team=w2DisplayTeam(under.team_name),foe=fav?w2DisplayTeam(fav.team_name):"the favorite",rid=String(r?.id||""),
    uM=under?.mida_outlook||{},fM=fav?.mida_outlook||{},
    uTop=(under?.starter_details||[])[0],fWeak=(fav?.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],
    up=Number(uM.playoff),fp=Number(fM.playoff),
    mida=Number.isFinite(up)&&Number.isFinite(fp)
      ?("MIDA gives "+team+" a "+w2MidaPct(up)+" playoff outlook and "+foe+" "+w2MidaPct(fp)+". ")
      :"",
    football=uTop&&fWeak
      ?uTop.name+" just gave "+team+" "+w2One(uTop.points)+" at the top of the lineup, while "+fWeak.name+" left "+foe+" only "+w2One(fWeak.points)+" at the soft end."
      :team+" showed enough Week 2 scoring to make the favorite defend something real.";
  const rows={
    "walter-mercer":team+" over "+foe+" is the Week 3 upset call. "+mida+football+" The favorite has the cleaner forecast; the underdog has a clearer place to apply pressure, and forecasts have never tackled anybody. If the favorite badge is the whole argument, the joke is already halfway written.",
    "tess-delaney":team+" over "+foe+" is the Week 3 upset. "+mida+football+" If "+foe+" insists on wearing the favorite label, it should probably stop leaving that chair wobbling in public.",
    "mack-hollis":team+" over "+foe+" is the upset call. "+mida+football+" "+foe+" can keep the favorite badge; "+team+" has already found the loose floorboard and brought a crowbar.",
    "nora-voss":team+" over "+foe+" gets the Week 3 nod. "+mida+football+" Rival managers can frame the projection if they want. I would rather frame the weak spot the underdog gets to attack."
  };
  return rows[rid]||rows["walter-mercer"]
}
function w2RecapContext(w,prev,i){
  if(!prev)return"Week 1 does not give us a complete comparison here, so Week 2 gets to stand on its own.";
  const team=w2DisplayTeam(w.team_name),opp=w2DisplayTeam(prev.opponent_name),won1=Number(prev.points)>Number(prev.opponent_points),
    now=Number(w.points)||0,then=Number(prev.points)||0,diff=now-then,v=Number(i)||0;
  if(won1){
    if(Math.abs(diff)<5)return[
      team+" beat "+opp+" in Week 1 and landed within "+w2One(Math.abs(diff))+" points of the same team total this time. Two wins with nearly the same scoring floor make the start look less accidental.",
      team+" opened with a win over "+opp+" and barely changed its scoring total in Week 2. The record is 2-0 without needing the same exact stars to do it.",
      "Week 1 was a win over "+opp+"; Week 2 stayed within "+w2One(Math.abs(diff))+" points of that team score. Consistency is doing more work here than novelty.",
      team+" followed the "+opp+" win with almost the same scoring output. At 2-0, boring repeatability is starting to look pretty attractive.",
      "After beating "+opp+" in Week 1, "+team+" produced almost the same total again. The second win makes the scoring floor more interesting than the ceiling."
    ][v%5];
    if(diff>0)return team+" also won the opener over "+opp+", "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+". Week 2 added "+w2One(diff)+" more points, so the start got louder instead of merely longer.";
    return[
      team+" beat "+opp+" "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+" in Week 1 and won again despite scoring "+w2One(Math.abs(diff))+" fewer points. The second win came by a different route.",
      team+" had more scoring in the Week 1 win over "+opp+", then still found enough to win again after dropping "+w2One(Math.abs(diff))+" points. That is useful flexibility, not repetition.",
      "The opener against "+opp+" produced "+w2One(prev.points)+" points and a win. Week 2 produced fewer points and the same result, which tells us the lineup can survive a quieter total.",
      team+" did not need to match the "+w2One(prev.points)+" from its Week 1 win over "+opp+" to get to 2-0. The record survived a different scoring shape.",
      "Week 1 against "+opp+" was louder by "+w2One(Math.abs(diff))+" points, but Week 2 still ended in a win. That is two successful Sundays without one mandatory script."
    ][v%5];
  }
  if(diff>=20)return[
    team+" came into Week 2 off a "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+" loss to "+opp+" and then jumped "+w2One(diff)+" points in team scoring. The response was big enough to change what Week 3 can reasonably expect.",
    "After losing to "+opp+" in Week 1, "+team+" added "+w2One(diff)+" points to its team total. That is a genuine rebound, not a rounding error.",
    team+" followed the Week 1 loss to "+opp+" by scoring "+w2One(diff)+" more points. One Sunday does not erase the opener, but it does make the ceiling look a lot less cramped.",
    "The "+opp+" loss left "+team+" at "+w2One(prev.points)+" points; Week 2 jumped by "+w2One(diff)+". The response was loud enough to reopen the argument about what this lineup can be.",
    team+" scored "+w2One(diff)+" more than it did in the Week 1 loss to "+opp+". That is the sort of correction that buys Week 3 a much different conversation."
  ][v%5];
  if(diff<=-20)return team+" lost the opener "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+" to "+opp+" and scored even less in Week 2, yet still found a win. The record improved before the scoring profile did.";
  return team+" lost Week 1 to "+opp+" "+w2One(prev.points)+"–"+w2One(prev.opponent_points)+". Winning the second Sunday keeps the opener from hardening into an identity, while the similar scoring total says the lineup did not need a complete reinvention.";
}

function w2TwoWeekLeagueRead(teams,r){
  const rows=(teams||[]).map(t=>{
    const prev=previousByRoster.get(String(t.roster_id))||null,m=t?.mida_outlook||{},rec=t?.league_context?.record||{},
      delta=Number.isFinite(Number(prev?.points))?Number(t.points)-Number(prev.points):null;
    return{t,delta,wins:Number(rec.wins)||0,losses:Number(rec.losses)||0,playoff:Number(m.playoff),title:Number(m.title)}
  });
  const undefeated=rows.filter(x=>x.wins===2),winless=rows.filter(x=>x.losses===2),middle=rows.filter(x=>x.wins===1&&x.losses===1),
    best=undefeated.slice().sort((a,b)=>(Number.isFinite(b.playoff)?b.playoff:-1)-(Number.isFinite(a.playoff)?a.playoff:-1))[0]||null,
    stable=undefeated.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta))[0]||null,
    improving=winless.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>b.delta-a.delta)[0]||null,
    sliding=winless.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>a.delta-b.delta)[0]||null,
    rebound=middle.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>b.delta-a.delta)[0]||null,
    volatile=middle.filter(x=>Number.isFinite(x.delta)).slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0]||null;
  const name=x=>x?w2DisplayTeam(x.t.team_name):null;
  const p1="The 2-0 group is already separating into teams with a floor and teams surviving a roller coaster. "+(best
    ?name(best)+" has the strongest long-view MIDA case among the clean records. "
    :"The clean records still need more evidence before the long view separates them. ")+(stable&&stable!==best
    ?name(stable)+" has been steadier from one Sunday to the next, which matters because contenders eventually need ordinary wins as much as spectacular ones. "
    :"The best starts are beginning to pair wins with a repeatable scoring shape. ")+"A perfect record is nice; a roster that can survive when the fireworks stop is considerably more expensive.";
  const p2="At 0-2, the standings hide very different kinds of trouble. "+(improving
    ?name(improving)+" materially improved its team scoring from the opener despite losing again, so there is at least a usable correction underneath the record. "
    :"Some winless teams at least showed a healthier scoring shape on the second Sunday. ")+(sliding&&sliding!==improving
    ?name(sliding)+" went sharply the other direction; that is much harder to wave away as bad luck. "
    :"The teams that also lost scoring ground have the more urgent problem. ")+"Two losses can describe a team getting closer or a team digging. Those are not the same problem.";
  const p3="The 1-1 middle is where the league looks calmest on paper and messiest underneath. "+(rebound
    ?name(rebound)+" delivered one of the clearest rebounds from its opener. "
    :"Several split-record teams materially changed their scoring level from the opener. ")+(volatile&&volatile!==rebound
    ?name(volatile)+" has been one of the more volatile two-week profiles, so the tidy record is hiding a much less tidy lineup. "
    :"That volatility is why the middle of the table is not one giant coin flip. ")+"A split record can belong to a team finding itself, a team wobbling, or a team that simply traded one extreme Sunday for another.";
  const p4="The larger lesson is that depth is starting to matter more than novelty. The strongest teams are pairing a star performance with enough ordinary production behind it, while shakier rosters keep asking one or two good players to turn every Sunday into a rescue mission. Two games are not enough to crown anybody, but they are enough to tell the difference between a roster building a floor and one living on weekly emergency labor.";
  return[p1,p2,p3,p4]
}
function w2RecapPlayerRead(t,p,prev,r,slot=0,blockIndex=0){
  if(!t||!p)return"";
  const pp=w2PrevPlayer(prev,p.id),profile=w2PlayerStatusProfile(p,slot,pp),status=String(profile.status||""),
    category=w2PlayerCategoryReference(p,profile),team=w2DisplayTeam(t.team_name),short=w2ShortPlayerName(t,r||{id:"recap"},p,"recap-read"),
    pts=w2One(p.points),prior=Number(profile.prior),avg=Number(profile.seasonAvg),hasPrior=Number.isFinite(prior)&&prior>0&&Number(p?.prior_season_games)>=6,
    material=hasPrior&&Math.abs(Number(p.points)-prior)>=Math.max(4,prior*.3),
    Ref=(category||short).charAt(0).toUpperCase()+(category||short).slice(1),
    v=Math.abs(Number(blockIndex)||0)%5;
  if(status==="breakout"&&Number.isFinite(avg)&&hasPrior){
    const rows=[
      Ref+" is at "+w2One(avg)+" per game through two Sundays after "+w2One(prior)+" last season. "+team+" can stop calling this a lucky weekend; opponents now have to put "+short+" in the part of the scouting report nobody enjoys.",
      Ref+" has two weeks at "+w2One(avg)+" a game after "+w2One(prior)+" last season. One Sunday can lie; two in a row make the next opponent waste meeting time on "+short+".",
      Ref+" is averaging "+w2One(avg)+" through two games after "+w2One(prior)+" last year. The breakout label is no longer doing promotional work by itself; the box scores have started helping.",
      Ref+" has pushed the two-week average to "+w2One(avg)+" after "+w2One(prior)+" last season. "+team+" can call it early if it wants; the next opponent still has to prepare for it.",
      Ref+" has two Sundays averaging "+w2One(avg)+" after "+w2One(prior)+" last year. The breakout label can stop doing the talking now; the next opponent has two box scores to complain about."
    ];return rows[v]
  }
  if(status==="emerging"&&Number.isFinite(avg)&&hasPrior){
    const rows=[
      Ref+" has climbed to "+w2One(avg)+" per game through two weeks after "+w2One(prior)+" last season. Two Sundays do not make a career, but they are enough to make dismissing "+short+" a lazy argument.",
      Ref+" sits at "+w2One(avg)+" a game through two weeks after "+w2One(prior)+" last year. That is enough repeated noise for "+team+" to stop treating the role like a temporary accident.",
      Ref+" has two Sundays averaging "+w2One(avg)+" after "+w2One(prior)+" last season. The emerging label now has actual box scores attached to it, which is inconvenient for anyone waiting for the role to disappear.",
      Ref+" is up to "+w2One(avg)+" per game through two weeks after "+w2One(prior)+" last year. Nobody needs a coronation; the next opponent just needs a plan.",
      Ref+" has reached "+w2One(avg)+" per game through two Sundays after "+w2One(prior)+" last season. That is enough evidence for "+team+" to stop acting surprised when the role shows up again."
    ];return rows[v]
  }
  if(status==="established-star"){
    const hist=hasPrior?" after averaging "+w2One(prior)+" last season":"";
    const rows=[
      Ref+" just gave "+team+" "+pts+" points"+hist+". That is not a discovery; it is the expensive name on the roster reminding everybody why the price tag exists.",
      Ref+" put "+pts+" on the board"+hist+". The résumé did not need help, but Sunday added another page loudly enough to annoy the opponent.",
      Ref+" delivered "+pts+" for "+team+hist+". Stars are supposed to make difficult Sundays look routine; this one did the job without asking permission.",
      Ref+" finished at "+pts+hist+". Nobody learned the name on Sunday; they just got reminded why ignoring it is expensive.",
      Ref+" gave "+team+" "+pts+" points"+hist+". The star label was already there; Sunday merely underlined it hard enough to tear the page."
    ];return rows[v]
  }
  if(status==="struggling-star")return Ref+" is wearing the star label into a second quiet Sunday, which is exactly why the next one gets louder instead of easier to excuse.";
  if(status==="declining-veteran")return Ref+" has opened with two quieter Sundays than the résumé promises. Veteran status buys patience; it does not buy invisibility.";
  if(status==="reliable-veteran")return Ref+" keeps giving "+team+" the veteran floor good lineups quietly live on. Nobody throws a parade for stability until the week it disappears.";
  if(status==="veteran")return Ref+" gave "+team+" "+pts+" points. It was veteran work without the ceremony, which is usually how useful Sundays look before somebody needs them.";
  if(status==="rookie")return Ref+" already has enough Week 2 responsibility to make the rookie label relevant to the next opponent instead of just the transaction page.";
  if(status==="young-player")return Ref+" is young enough that this role can still grow teeth, and "+team+" has already seen enough to keep feeding it.";
  if(status==="reliable")return Ref+" gave "+team+" another dependable answer. Contenders call that boring right up until the boring answer goes missing.";
  if(material){
    const up=Number(p.points)>prior,rows=up?[
      short+" lived around "+w2One(prior)+" per game last season and just posted "+pts+". If that was supposed to be ordinary, Sunday forgot the assignment.",
      short+" carried a "+w2One(prior)+"-point average out of last season and dropped "+pts+" this week. The opponent is welcome to call it an outlier after it finishes explaining the scoreboard.",
      short+" came in with "+w2One(prior)+" per game as last year’s usual and left Sunday with "+pts+". Subtlety was apparently scratched before kickoff.",
      short+" was around "+w2One(prior)+" a game last season; "+pts+" this week turned the old expectation into a very bad alibi for the opponent.",
      short+" averaged "+w2One(prior)+" last season and just dropped "+pts+". The opponent can file that under 'unexpected' after it finishes filing the loss."
    ]:[
      short+" averaged "+w2One(prior)+" last season and stopped at "+pts+" this week. That is the kind of quiet Sunday opponents notice before managers finish calling it weird.",
      short+" brought a "+w2One(prior)+"-point average from last year into a "+pts+"-point Sunday. The next game gets to decide whether that was a bruise or a warning label.",
      short+" lived around "+w2One(prior)+" a game last season and landed at "+pts+" this week. The résumé survives; the easy explanation does not.",
      short+" came in with "+w2One(prior)+" per game as the old normal and left with "+pts+". One bad Sunday is survivable, but it still gets circled.",
      short+" carried "+w2One(prior)+" per game from last season into a "+pts+"-point week. The résumé is fine; the next opponent just found a fresh question to ask."
    ];return rows[v]
  }
  return""
}
function rewriteWeek2Overview(overview,teams,previousEdition,week=2){
  const previous=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t])),games=w2Games(teams),top=(teams||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],topGame=games.find(g=>[String(g.winner.roster_id),String(g.loser.roster_id)].includes(String(top?.roster_id))),close=games.slice().sort((a,b)=>a.margin-b.margin)[0],upset=games.find(g=>g.upset),big=games.slice().sort((a,b)=>b.margin-a.margin)[0],chosen=[],seen=new Set();
  // A league column is not a conveyor belt of five identically structured
  // matchup mini-columns. Two games leave space for league-wide reporting.
  const featuredLimit=Number(week)<=2?5:2;
  for(const g of [topGame,upset,close,big,...games.slice().sort((a,b)=>b.combined-a.combined)]){if(!g||chosen.length>=featuredLimit)continue;const k=[g.winner.roster_id,g.loser.roster_id].sort().join("|");if(!seen.has(k)){seen.add(k);chosen.push(g)}}
  const rep=i=>overview?.sections?.[i]?.reporter||null;
  const blocks=chosen.map((g,i)=>{
    const r=rep(0)||{},w=g.winner,l=g.loser,wName=w2DisplayTeam(w.team_name),lName=w2DisplayTeam(l.team_name),
      ws=(w.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points)),ls=(l.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points)),
      wTop=ws.slice(0,3),wTop3=wTop.reduce((n,p)=>n+(Number(p.points)||0),0),wStar=ws[0],lStar=ls[0],lWeak=ls.at(-1),
      prev=previous.get(String(w.roster_id)),paras=[],loserMiss=Number(l?.best_lineup_miss?.gap)||0,
      shootout=g.combined>=240,blowout=g.margin>=25,knife=g.margin<=6;
    const hook=w2RecapHook(g,wName,lName,i);
    paras.push(w2S(w,r,"recap-game-"+i,hook));
    // Contextualize one decisive player; do not mandate three box-score rows
    // for every game, or then narrate all three again in the next paragraph.
    const statNames=Number(week)<=2?(i===0?wTop:[wStar,lStar,ws[1]]):[wStar];
    paras.push(w2S(w,r,"recap-stats-"+i,w2RecapStatLead(g,i).trim()+" "+statNames.filter(Boolean).map(w2RecapStat).join('; ')));
    let turn;
    if(blowout&&wTop3>Number(l.points))turn=Number(week)<=2?w2Natural(wTop.map(p=>p.name))+" combined for "+w2One(wTop3)+" points—more than "+lName+"’s entire "+w2One(l.points)+"-point lineup. That is the sort of blowout where the losing side starts checking whether the scoring app accidentally counted two Sundays.":wName+" outscored "+lName+" by "+w2One(g.margin)+". A gap that large is not one unlucky starter; it is a lineup full of unanswered questions.";
    else if(knife&&loserMiss>0&&l?.best_lineup_miss?.reserve&&l?.best_lineup_miss?.starter)turn=w2RecapBenchTurn(l,g,l.best_lineup_miss);
    else if(shootout)turn=(lStar?lStar.name+" gave "+lName+" "+w2One(lStar.points)+" points and still had to watch a huge team total lose. ":"")+lName+" brought "+w2One(l.points)+" points—enough to win plenty of weeks. "+wName+" simply had one more scoring answer left.";
    else if(g.upset)turn=w2RecapUpsetTurn(w,l,wStar,lWeak);
    else if(knife)turn=(wStar?wStar.name+" led "+wName+" with "+w2One(wStar.points)+", while ":"")+(lStar?lStar.name+" answered with "+w2One(lStar.points)+" for "+lName+". ":"")+"The stars traded punches and left the ordinary lineup spots to decide who had to hate Monday.";
    else turn=(wStar?wStar.name+" supplied "+w2One(wStar.points)+" for "+wName+". ":"")+(lStar?lStar.name+" gave "+lName+" "+w2One(lStar.points)+", but ":"")+"the middle of the winning lineup kept answering often enough that the loser never found a clean comeback lane.";
    const commentaryCandidates=[{t:w,p:wStar,slot:0},{t:l,p:lStar,slot:0},{t:w,p:ws[1],slot:1},{t:l,p:ls[1],slot:1}].filter(x=>x.p);
    for(const x of commentaryCandidates){const read=w2RecapPlayerRead(x.t,x.p,previous.get(String(x.t.roster_id))||null,r,x.slot,i);if(read){turn+=" "+read;break}}
    if(i===0)turn=(wStar?.name||wName)+" set the tone in the league's loudest matchup. "+turn;
    paras.push(w2S(w,r,"recap-turn-"+i,turn));
    let column;
    if(shootout)column=lName+" can be furious without being ashamed. "+w2One(l.points)+" is a winning-level fantasy score on most Sundays; this Sunday, "+wName+" answered with "+w2One(w.points)+" and made a great losing total feel like a parking ticket.";
    else if(blowout)column=lName+" does not get a polite version of this result. A "+w2One(g.margin)+"-point loss says too many lineup spots lost their individual fights, while "+wName+" gets to spend a week pretending this kind of demolition is normal.";
    else if(g.upset&&g.combined<120)column=wName+" is not suddenly a scoring machine; "+w2One(w.points)+" points is not a parade total. But the underdog found enough usable production while the favorite stalled, and ugly wins still change the standings.";
    else if(g.upset)column=w2RecapUpsetColumn(w,l,lStar);
    else if(knife&&loserMiss>0)column="A close game with a real bench alternative is where managers lose sleep. "+wName+" gets the relief; "+lName+" gets a Tuesday full of people politely asking why the better score was wearing sweatpants.";
    else if(knife)column="Close games turn ordinary fantasy points into family arguments. "+wName+" gets relief, "+lName+" gets the replay button, and every middling starter suddenly has a lawyer.";
    else column=wName+" won because enough names behind the star kept showing up. "+lName+" did not need a miracle; it needed one or two ordinary starters to stop being ordinary at the same time.";
    paras.push(w2S(w,r,"recap-column-"+i,column));
    paras.push(w2S(w,r,"recap-context-"+i,w2RecapContext(w,prev,i)));
    return{heading:(i===0?"Week 2’s Loudest Game: ":"")+wName+" vs. "+lName,paragraphs:paras}
  });
  const undefeated=forwardRecentGroup(teams,week,'W'),winless=forwardRecentGroup(teams,week,'L'),upValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))&&Number(t.value_history_week.delta)>0).slice().sort((a,b)=>Number(b.value_history_week.delta)-Number(a.value_history_week.delta))[0],downValue=(teams||[]).filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))&&Number(t.value_history_week.delta)<0).slice().sort((a,b)=>Number(a.value_history_week.delta)-Number(b.value_history_week.delta))[0];
  const moverSummary=(team,key,label)=>{
    const rows=(team?.value_history_player_movers?.[key]||[]).filter(x=>Number.isFinite(Number(x?.delta))).slice(0,3);
    if(!rows.length)return" No current-roster player registered a "+(key==="risers"?"positive":"negative")+" value move over that same tracked window.";
    const items=rows.map(x=>String(x.player_name||x.player_id)+" ("+(Number(x.delta)>0?"+":"")+Math.round(Number(x.delta)).toLocaleString("en-US")+")");
    return" The roster’s biggest "+label+" over that same window: "+w2Natural(items)+".";
  };
  const middleTeams=(teams||[]).filter(t=>Number(t?.league_context?.record?.wins)===1&&Number(t?.league_context?.record?.losses)===1),trajectoryReporter=rep(0)||{};
  if(Number(week)>2){
    const seasonLeaders=(teams||[]).slice().sort((a,b)=>Number(a.league_context?.standings_rank||999)-Number(b.league_context?.standings_rank||999)).slice(0,4);
    blocks.push({heading:'The Standings Have Receipts',paragraphs:forwardTrajectoryParagraphs(teams,week).slice(0,2)});
    const missed=(teams||[]).filter(t=>Number(t.best_lineup_miss?.gap)>0&&t.best_lineup_miss?.reserve&&t.best_lineup_miss?.starter).sort((a,b)=>Number(b.best_lineup_miss.gap)-Number(a.best_lineup_miss.gap));
    blocks.push({heading:'The Decisions Managers Have to Defend',paragraphs:missed.slice(0,2).map(t=>t.team_name+' left '+w2One(t.best_lineup_miss.gap)+' points on the table by starting '+t.best_lineup_miss.starter.name+' ahead of '+t.best_lineup_miss.reserve.name+'. That is a specific lineup choice, not an inspirational lesson about trying harder.')});
    blocks.push({heading:'The Season Is Bigger Than Sunday',paragraphs:[seasonLeaders.length?'The league leaders are '+w2Natural(seasonLeaders.map(t=>t.team_name+' ('+forwardRecordText(t)+')'))+'. Those are full-season records, and nobody gets to erase the first '+(Number(week)-1)+' games because this week made a better headline.':'The season standings are not available for a verified comparison.',forwardTrajectoryParagraphs(teams,week)[3]]});
  }else blocks.push({heading:"What Two Weeks Are Starting to Say",paragraphs:
    w2TwoWeekLeagueRead(teams,trajectoryReporter).map((p,i)=>w2S(top,trajectoryReporter,"recap-two-weeks-"+i,p))
  });
  const recentWinners=undefeated.length?("The teams that won both of the last two games are "+w2Natural(undefeated.map(t=>w2DisplayTeam(t.team_name)))+". That is form, not an undefeated-season claim; the season standings still count every result."):"Nobody won both of the last two completed games. Apparently consistency has become an optional luxury.";
  const velvet=[
    w2S(top,rep(1)||{},"contender-undefeated",Number(week)<=2
      ?(undefeated.length?"The 2-0 club now includes "+w2Natural(undefeated.map(t=>w2DisplayTeam(t.team_name)))+". Two wins are not a coronation, but they are enough to make opening-week charm look more like actual form.":"Nobody escaped Week 2 undefeated, which is rude to the optimists and excellent for the rest of us.")
      :recentWinners),
    upValue?w2S(upValue,rep(1)||{},"contender-up","The biggest positive value mover is "+w2DisplayTeam(upValue.team_name)+", up "+Math.abs(Math.round(Number(upValue.value_history_week.delta))).toLocaleString("en-US")+" points"+(Number.isFinite(Number(upValue.value_history_week.pct))?" ("+w2One(Math.abs(Number(upValue.value_history_week.pct)))+"%)":"")+"."+moverSummary(upValue,"risers","risers")+" The market has pushed this roster closer to contender territory; Sunday still decides whether that optimism survives contact."):null,
    downValue?w2S(downValue,rep(1)||{},"contender-down","The biggest negative value mover is "+w2DisplayTeam(downValue.team_name)+", down "+Math.abs(Math.round(Number(downValue.value_history_week.delta))).toLocaleString("en-US")+" points"+(Number.isFinite(Number(downValue.value_history_week.pct))?" ("+w2One(Math.abs(Number(downValue.value_history_week.pct)))+"%)":"")+"."+moverSummary(downValue,"fallers","fallers")+" I am not declaring the roster doomed, but the market has already started asking which assumptions deserve to survive the drop."):null,
    w2S(top,rep(1)||{},"contender-close",close?(close.winner.team_name+" and "+close.loser.team_name+" gave us the week’s most impolite close game at "+w2One(close.margin)+" points apart; one side gets relief, the other gets seven days to discover how many tiny choices suddenly feel enormous."):"Week 2 declined to give us a properly rude close finish, so I will save the sharp elbows for next Sunday.")
  ].filter(Boolean);
  const active=(teams||[]).slice().sort((a,b)=>(b.transactions?.length||0)-(a.transactions?.length||0))[0],tradeParagraphs=w2RecapTradeParagraphs(teams,rep(2)||{}),
    activeMoves=active?w2TransactionMoveDetails(active):[],activeAddedIds=new Set((active?.transactions||[]).flatMap(tx=>tx.adds||[]).map(String)),
    activeHit=(active?.starter_details||[]).filter(p=>activeAddedIds.has(String(p.id))).sort((a,b)=>Number(b.points)-Number(a.points))[0],
    activeMoveSummary=activeMoves.length
      ?active.manager_name+" was the busiest manager on the Week 2 wire. The moves worth keeping on the back page: "+activeMoves.slice(0,3).join("; ")+(activeMoves.length>3?". The rest was churn around those decisions.":".")+(activeHit?" "+activeHit.name+" went straight into the lineup and scored "+w2One(activeHit.points)+" points, so at least one move reached Sunday immediately.":" None of the new names became a Week 2 starter, so the churn has to prove its value later.")
      :"The transaction wire did not produce a league-wide circus this week, so management has to earn the headline the old-fashioned way: get the lineup right and win.";
  const back=[
    w2S(top,rep(2)||{},"tilly-top",top.team_name+" put "+w2One(top.points)+" on the board and made the rest of the league stare at it. Week 1 was a first impression; Week 2 is where the loud result starts becoming a reputation."),
    w2S(active||top,rep(2)||{},"tilly-moves",activeMoveSummary),
    ...(tradeParagraphs.length?tradeParagraphs:[w2S(top,rep(2)||{},"tilly-trade","No verified Week 2 trade story was large enough to hijack the league page, which means the games get to be the scandal for once.")]),
    w2S(top,rep(2)||{},"tilly-upset",upset?(upset.winner.team_name+" made "+upset.loser.team_name+" eat the projection. That joke is good for one full week, and the only way the favorite gets it back is by winning the next game instead of explaining this one."):"The projections mostly survived Week 2, which is terrible for comedy and probably healthy for everybody’s blood pressure.")
  ];
  const nextGames=w2NextWeekGames(teams).filter(x=>Number.isFinite(Number(x.gap))).sort((a,b)=>Number(a.gap)-Number(b.gap)),next=nextGames[0],filchTeam=winless[0]||downValue||top;
  const filch=[next?w2S(next.a,rep(3)||{},"filch-next",w2DisplayTeam(next.a.team_name)+" and "+w2DisplayTeam(next.b.team_name)+" are separated by only "+w2One(next.gap)+" projected points for Week 3. That is close enough for one star, one bad lineup call or one ridiculous quiet game to turn the whole thing, so save the confident speeches for afterward."):w2S(filchTeam,rep(3)||{},"filch-next","The Week 3 projection board is not clean enough to crown a featured matchup, so I am not going to fake suspense the schedule did not supply."),w2S(filchTeam,rep(3)||{},"filch-weak",w2DisplayTeam(filchTeam.team_name)+" cannot bring the same weakness into Week 3 and call it bad luck again. Everybody saw it. If the same lineup slot stays quiet again, the flaw becomes a pattern instead of an excuse."),w2S(filchTeam,rep(3)||{},"filch-tilly","If rival managers are laughing at the same problem two Sundays in a row, congratulations: it is no longer bad luck. It is your brand."),w2S(top,rep(3)||{},"filch-end","The free trial is over. Good starts have to survive a third opponent, bad starts have to show an actual fix, and Week 3 gets first crack at exposing both.")];
  const sections=[{reporter:rep(0),heading:"What Actually Mattered This Week",blocks,paragraphs:blocks.flatMap(b=>b.paragraphs||[])},{reporter:rep(1),heading:"The Week 2 Contender Line",paragraphs:velvet},{reporter:rep(2),heading:"The Back Page: The Second Sunday Gets a Headline",paragraphs:back},{reporter:rep(3),heading:"Next Week: Fix It Before It Becomes a Running Joke",paragraphs:filch}];
  const mentionTeam=x=>(teams||[]).find(t=>(String(x?.title||"")+" "+String(x?.take||"")).includes(String(t.team_name||"")));
  const hot=(overview?.hot_takes||[]).map((x,i)=>{
    const reporter=sections[i%4]?.reporter||rep(0)||{},kind=String(x?.kind||""),subject=mentionTeam(x)||top;
    if(kind==="championship"){const m=subject?.mida_outlook||{},topP=(subject?.starter_details||[])[0],mida=Number.isFinite(Number(m.title))?(" MIDA already gives "+w2DisplayTeam(subject.team_name)+" a "+w2MidaPct(m.title)+" title chance."):"";return{...x,title:"Week 2 title call: "+subject.team_name,take:w2S(subject,reporter,"hot-champ",w2DisplayTeam(subject.team_name)+" gets the early title call because the 2-0 start is sitting on an actual contender profile, not just a clean record."+mida+(topP?" "+topP.name+" has supplied the kind of centerpiece a contender can build around without asking the whole roster to repeat one exact box score.":""))}};
    if(kind==="fraud"){const m=subject?.mida_outlook||{},weak=(subject?.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0],mida=Number.isFinite(Number(m.playoff))?(" MIDA still has the playoff outlook at "+w2MidaPct(m.playoff)+", so the warning is about how the wins are being built, not pretending the roster is dead."):"";return{...x,title:"Week 2 danger sign: "+subject.team_name,take:w2S(subject,reporter,"hot-fraud",w2DisplayTeam(subject.team_name)+" has the clean record and a weak spot worth poking"+(weak?" in "+weak.name+" at "+w2One(weak.points)+" points":"")+". "+mida+"Week 3 gets to decide whether that flaw was survivable noise or the first thing a better opponent can exploit.")}};
    if(kind==="division"){
      const groups=new Map();for(const t of teams||[]){const d=String(t.division_name||"").trim();if(!d)continue;if(!groups.has(d))groups.set(d,[]);groups.get(d).push(t)}
      const flags=[...groups.entries()].map(([d,rows])=>{const sorted=rows.slice().sort((a,b)=>(Number(b?.league_context?.record?.wins)||0)-(Number(a?.league_context?.record?.wins)||0)||(Number(a?.league_context?.record?.losses)||0)-(Number(b?.league_context?.record?.losses)||0)||(Number(a?.league_context?.standings_rank)||99)-(Number(b?.league_context?.standings_rank)||99)),best=sorted[0],bw=Number(best?.league_context?.record?.wins)||0,bl=Number(best?.league_context?.record?.losses)||0,leaders=sorted.filter(t=>(Number(t?.league_context?.record?.wins)||0)===bw&&(Number(t?.league_context?.record?.losses)||0)===bl);return{d,rows:sorted,leaders,record:bw+"-"+bl}}).filter(x=>x.leaders.length);
      return{...x,title:"Week 2 division board",take:w2S(subject,reporter,"hot-division",w2DivisionBoardTake(flags,reporter,subject))};
    }
    if(kind==="player"){
      const allPlayers=(teams||[]).flatMap(t=>(t.starter_details||[]).map(p=>({t,p}))).filter(x=>Number.isFinite(Number(x.p?.points))).sort((a,b)=>Number(b.p.points)-Number(a.p.points));
      const named=allPlayers[0],p=named?.p,pt=named?.t||subject;
      return{...x,title:"Week 2 Player of the Week: "+String(p?.name||"the week’s top scorer"),take:w2S(pt,reporter,"hot-player",w2PlayerOfWeekRead(pt,p,reporter))};
    }
    if(kind==="upset"){
      const under=(teams||[]).find(t=>String(t.roster_id)===String(x?.underdog_roster_id))||subject,fav=(teams||[]).find(t=>String(t.roster_id)===String(x?.favorite_roster_id));
      return{...x,title:"Week 3 upset call: "+under.team_name+(fav?" over "+fav.team_name:""),take:w2S(under,reporter,"hot-upset",w2UpsetCallRead(under,fav,reporter))};
    }
    return{...x,title:"Week 2 call: "+subject.team_name,take:w2S(subject,reporter,"hot-other","Two weeks have changed the outlook for "+w2DisplayTeam(subject.team_name)+". Week 3 now has to confirm whether the first two results describe a real trend or two unrelated Sundays.")};
  });
  const playerPool=(teams||[]).flatMap(t=>(t.starter_details||[]).map((p,slot)=>{
    const prevTeam=previous.get(String(t.roster_id))||null,pp=w2PrevPlayer(prevTeam,p.id),profile=w2PlayerStatusProfile(p,slot,pp);
    return{t,p,profile,delta:Number(p.points)-Number(p.prior_season_avg),games:Number(p.prior_season_games)||0}
  }))
    .filter(x=>["breakout","emerging"].includes(x.profile.status))
    .sort((a,b)=>b.profile.breakoutScore-a.profile.breakoutScore||b.delta-a.delta);
  const usedHot=hot.map(x=>String(x.title||"")+" "+String(x.take||"")).join(" ");
  const riser=playerPool.find(x=>!usedHot.includes(String(x.p.name||"")))||playerPool[0];
  if(riser){
    const rr=rep(1)||rep(0)||{},rid=String(rr?.id||"walter-mercer"),short=w2ShortPlayerName(riser.t,rr,riser.p,"hot-breakout"),ctx=w2BreakoutContext(riser.p,riser.profile,short),team=w2DisplayTeam(riser.t.team_name),
      lead={
        "walter-mercer":riser.p.name+" has made two Sundays in a row feel like the beginning of a much larger assignment. The old expectations are already starting to look undersized.",
        "tess-delaney":riser.p.name+" has spent two straight Sundays looking like a breakout instead of a one-week stunt. I am not calling two games a season, but opponents have already lost the luxury of treating him like background noise.",
        "mack-hollis":riser.p.name+" has hit the first two weeks hard enough that the noise is no longer coming from one lucky afternoon. Keep the volume up and everybody else has to adjust.",
        "nora-voss":riser.p.name+" has now ruined the easy rival joke twice. That is irritatingly close to becoming something opponents actually have to plan around."
      }[rid]||riser.p.name+" has put together two Sundays worth taking seriously.";
    hot.push({kind:"future-player",reporter:rr,title:"Breakout Player to Watch: "+riser.p.name,
      take:w2S(riser.t,rr,"hot-future-player",lead+" "+(ctx?ctx+" ":"")+team+" now has a reason to treat "+short+" as part of the weekly plan rather than a one-Sunday surprise.")});
  }
  const pressure=(teams||[]).filter(t=>t?.best_lineup_miss?.reserve&&t?.best_lineup_miss?.starter&&Number(t.best_lineup_miss.gap)>0)
    .slice().sort((a,b)=>Number(b.best_lineup_miss.gap)-Number(a.best_lineup_miss.gap))[0];
  if(pressure){
    const rr=rep(2)||rep(0)||{},m=pressure.best_lineup_miss;
    hot.push({kind:"future-management",reporter:rr,title:"Week 3 management pressure: "+w2DisplayTeam(pressure.team_name),
      take:w2S(pressure,rr,"hot-future-management",m.reserve.name+" outscored "+m.starter.name+" by "+w2One(m.gap)+" from a compatible bench spot. Week 3 is not about apologizing for hindsight; it is about whether management keeps asking the same lineup question after Sunday already supplied an alternative.")});
  }
  {
    const rr=rep(3)||rep(0)||{},seenPairs=new Set(),divGames=(teams||[]).filter(w2SameDivisionNext).map(t=>{
      const foe=(teams||[]).find(x=>String(x.roster_id)===String(t.next_opponent_roster_id)),key=[String(t.roster_id),String(t.next_opponent_roster_id)].sort().join("|");
      if(!foe||seenPairs.has(key))return null;seenPairs.add(key);
      const a=Number(t?.mida_outlook?.division),b=Number(foe?.mida_outlook?.division),score=(Number.isFinite(a)?a:0)+(Number.isFinite(b)?b:0)-Math.abs((Number.isFinite(a)?a:0)-(Number.isFinite(b)?b:0))*0.25;
      return{t,foe,score}
    }).filter(Boolean).sort((a,b)=>b.score-a.score),g=divGames[0];
    if(g){
      const a=w2DisplayTeam(g.t.team_name),b=w2DisplayTeam(g.foe.team_name),ma=w2MidaPositivePct(g.t?.mida_outlook?.division),mb=w2MidaPositivePct(g.foe?.mida_outlook?.division),
        mida=ma&&mb?(" MIDA has the division chances at "+ma+" for "+a+" and "+mb+" for "+b+"."):"";
      hot.push({kind:"future-division-game",reporter:rr,title:"Week 3 division pressure game: "+a+" vs. "+b,
        take:w2S(g.t,rr,"hot-future-division",a+"–"+b+" is the Week 3 game with the sharpest kind of pressure: both teams are spending one of their limited head-to-head chances in the same division race, and the division winner gets a playoff berth."+mida+" The loser is not merely one game worse; it has handed a direct rival the exact result it wanted.")});
    }
  }
  return{...overview,headline:"Fleeced! Weekly Recap — Week 2 • Regular Season",deck:"Week 2 gets its own newspaper: new games, new arguments, and just enough memory of the opener to know what changed.",sections,hot_takes:hot,editorial_revision:14,inquirer_version:31}
}
function w2SentenceParts(s){return String(s||"").replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll(".","§")).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Za-z0-9])/g,m=>m.replace(".","§")).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll("§",".").trim()).filter(Boolean)}
// Week 2 publication-only rewrite: Week 1 remains an immutable comparison source, never a prose template.
function assertWeek2Originality(result,previousEdition){
  const entities=[...(result.teams||[]),...(previousEdition?.teams||[])].flatMap(t=>[t.team_name,t.manager_name,t.opponent_name,t.next_opponent_name,...(t.starter_details||[]).map(p=>p.name)]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
  const esc=s=>[...String(s)].map(ch=>".*+?^$(){}|[]".includes(ch)||ch.charCodeAt(0)===92?String.fromCharCode(92)+ch:ch).join("");
  const norm=s=>{let x=String(s||"");for(const e of entities)x=x.replace(new RegExp(esc(e),"gi"),"[ENTITY]");x=x.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,"[#]").replace(/\s+/g," ").trim();return x};
  const editionText=d=>[...(d?.teams||[]).flatMap(t=>[t?.inquirer_article?.headline,...(t?.inquirer_article?.paragraphs||[])]),...(d?.league_overview?.sections||[]).flatMap(s=>[s?.heading,...(s?.paragraphs||[])]),...(d?.league_overview?.hot_takes||[]).flatMap(x=>[x?.title,x?.take])].filter(Boolean);
  const prior=new Set(editionText(previousEdition).flatMap(w2SentenceParts).filter(s=>s.split(/\s+/).length>=12).map(norm));
  const overlap=editionText(result).flatMap(w2SentenceParts).filter(s=>s.split(/\s+/).length>=12).map(s=>({raw:s,key:norm(s)})).filter(x=>prior.has(x.key));
  if(overlap.length)throw new Error("Week 2 reused Week 1 long-form sentence templates: "+JSON.stringify(overlap.slice(0,8)));
  for(const t of result.teams||[]){const copy=(t?.inquirer_article?.paragraphs||[]).join(" ");if(!/\b(?:Week 1|opening week|opener|a week earlier|a week after)\b/i.test(copy))throw new Error("Week 2 article lacks backward Week 1 context: "+t.team_name)}
  const filchTeams=(result.teams||[]).filter(t=>String(t?.inquirer_article?.reporter?.id)==="nora-voss"),filchRecap=(result?.league_overview?.sections||[]).find(s=>String(s?.reporter?.id)==="nora-voss"),filch=[...filchTeams.flatMap(t=>t.inquirer_article.paragraphs||[]),...(filchRecap?.paragraphs||[])].join(" ");
  if(/\b(?:evidence|case|file|investigation|verdict|docket|cross-examination|paperwork)\b/i.test(filch))throw new Error("Week 2 Filch regressed into investigative/courtroom language");
  if(!/\b(?:joke|headline|rival|loud|swagger|mess|ridiculous|fix it)\b/i.test(filch))throw new Error("Week 2 Filch is not punchy enough to sit near Tilly stylistically");
}


  const rewritten=(rawInquirer.teams||[]).map(t=>rewriteWeek2Team(t,previousByRoster.get(String(t.roster_id))||null));

  const seenDesk=new Set();
  for(const t of rewritten){
    const a=t.inquirer_article||{},rid=String(a?.reporter?.id||'');if(!rid||seenDesk.has(rid))continue;
    const team=w2DisplayTeam(t.team_name),next=w2DisplayTeam(t.next_opponent_name||'the next opponent'),nw=week+1;
    const judgment={
      'walter-mercer':'I think '+team+' has a clean Week '+nw+' assignment: keep the part of this week that traveled, then make the quiet lineup spots less interesting against '+next+'.',
      'tess-delaney':Number(t.points)>Number(t.opponent_points)
        ?'I want '+team+' to enjoy the win without turning it into family mythology. '+next+' gets the next examination, and good form should survive a different opponent.'
        :'I want '+team+' to stop decorating the loss and fix the part Sunday exposed. '+next+' gets the next turn, and repetition would make the complaint much harder to dismiss.',
      'mack-hollis':'I want '+team+' to prove this week was not just the same stars dragging everybody through the door. If the support shows up against '+next+', the next headline gets louder.',
      'nora-voss':'I think '+team+' has one week to make its obvious flaw boring. If the same slot stays quiet against '+next+', rivals will not need a new joke.'
    }[rid];
    if(judgment){const target=(a.sections||[]).find(s=>s.kind==='outlook')||(a.sections||[]).at(-1);if(target?.paragraphs)target.paragraphs.push(w2TeamGrammar(t,judgment));a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);seenDesk.add(rid)}
  }

  let overview=rewriteWeek2Overview(rawOverview||{},rewritten,previousEdition||{teams:[]},week);
  let teams=deepStrings(rewritten,s=>adaptWeekLanguage(s,week,weekClassification));
  overview=deepStrings(overview,s=>adaptWeekLanguage(s,week,weekClassification));
  if(week>=3)teams=evolveForwardTeams(teams,previousEdition,week,variationSalt);
  if(week>=3)teams=polishForwardTeamCopy(teams,week,variationSalt);
  // Polishing may reintroduce an unchanged Week N-1 sentence. Run the
  // same deterministic prior-edition freshness repair on the finished copy.
  // Every newsroom edition gets this pass, not a special Week 5 exception.
  if(week>=3)teams=evolveForwardTeams(teams,previousEdition,week,variationSalt+307);
  // Recheck the finished language: polishing can expose collisions that the
  // earlier pass could not see, especially across distinct reporter desks.
  if(week>=3&&forwardCrossReporterPhraseOffenders(teams,[...forwardEntities({teams}),...forwardEntities(previousEdition)]).size)
    teams=evolveForwardTeams(teams,previousEdition,week,variationSalt+101);

  const trajectory=(overview.sections||[]).flatMap(s=>[s,...(s.blocks||[])]).find(s=>/Last Two Weeks Are Starting to Say|Two Weeks Are Starting to Say/i.test(String(s?.heading||'')));
  if(trajectory){
    trajectory.paragraphs=forwardTrajectoryParagraphs(teams,week);
    // The parent section also stores a flattened mirror: synchronize both.
    const parent=(overview.sections||[]).find(s=>(s.blocks||[]).includes(trajectory));
    if(parent)parent.paragraphs=parent.blocks.flatMap(b=>b.paragraphs||[]);
  }
  if(week>=3){
    overview.hot_takes=(overview.hot_takes||[]).map(take=>{
      if(!/\b(?:2-0 start|clean record|first two weeks|opening-week charm)\b/i.test(String(take.take||'')))return take;
      const subject=teams.find(t=>String(take.title||'').includes(t.team_name))||teams.find(t=>String(take.take||'').includes(t.team_name));
      if(!subject)return{...take,take:'The early-season label no longer tells the story. The standings have moved; this call needs a verified current matchup before it earns a stronger verdict.'};
      const record=forwardRecordText(subject),outcome=subject.won?'won':'lost';
      const score=forwardOne(subject.points),top=(subject.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],weak=(subject.starter_details||[]).slice().sort((a,b)=>Number(a.points)-Number(b.points))[0];
      const title=String(take.title||'').toLowerCase(),danger=/danger|fraud|warning/.test(title);
      const commentary=danger
        ?'The '+record+' record has not erased '+(weak?weak.name+' scoring '+forwardOne(weak.points)+' in the starting lineup':'the lineup vulnerability opponents can target')+'. A winning record buys patience, not a lifetime warranty.'
        :'The '+record+' record is the strongest part of the argument, with '+(top?top.name+' supplying '+forwardOne(top.points)+' this Sunday':'Sunday’s lineup contributing '+score+' points')+'. Rivals have had '+week+' weeks to find a rebuttal, and the wins are still on the page.';
      return{...take,take:subject.team_name+' '+outcome+' Week '+week+' with '+score+' fantasy points. '+commentary};
    });
  }

  if(weekClassification?.playoffs){
    for(const t of teams){
      const line=playoffTeamLine(t,weekClassification);if(!line)continue;
      const a=t.inquirer_article||{},lede=(a.sections||[]).find(s=>s.kind==='lede')||(a.sections||[])[0];
      if(lede?.paragraphs)lede.paragraphs.unshift(line);
      const outlook=(a.sections||[]).find(s=>s.kind==='outlook')||(a.sections||[]).at(-1);
      if(outlook?.paragraphs&&t?.playoff_context?.advanced_this_week&&t?.playoff_context?.next_round)outlook.paragraphs.push('Next stop: '+t.playoff_context.next_round+'. The bracket has become the schedule, and there is no useful way to pretend otherwise.');
      a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
    }
    const playoffSection=playoffOverviewSection(teams,weekClassification,overview?.sections?.[0]?.reporter||null);
    if(playoffSection)overview.sections=[...(overview.sections||[]).slice(0,1),playoffSection,...(overview.sections||[]).slice(1)];
  }else{
    const race=regularPlayoffRaceSection(teams,week,weekClassification,overview?.sections?.[0]?.reporter||null);
    if(race)overview.sections=[...(overview.sections||[]).slice(0,1),race,...(overview.sections||[]).slice(1)];
  }

  if(week>=3){
    const recapEntities=[...forwardEntities({teams}),...forwardEntities(previousEdition)];
    overview=evolveForwardOverview(overview,previousEdition?.league_overview||null,week,variationSalt,recapEntities);
    overview=enforceRecapEvolution(overview,previousEdition?.league_overview||null,week,variationSalt,recapEntities);
    overview=rejectRecapCopyForward(overview,previousEdition?.league_overview||null,week,recapEntities);
    const recapBlocks=(overview.sections||[]).flatMap(s=>s.blocks?.length?s.blocks:[s]);
    const standingsBlock=recapBlocks.find(b=>/The Standings Have Receipts/i.test(String(b.heading||'')));
    const seasonBlock=recapBlocks.find(b=>/The Season Is Bigger Than Sunday/i.test(String(b.heading||'')));
    if(standingsBlock&&seasonBlock&&/\btop of the table\b/i.test((standingsBlock.paragraphs||[]).join(' '))&&
       /^The league leaders are\b/i.test(String(seasonBlock.paragraphs?.[0]||'')))
      seasonBlock.paragraphs=seasonBlock.paragraphs.slice(1);
    for(const section of overview.sections||[])if(section.blocks?.length)section.paragraphs=section.blocks.flatMap(b=>b.paragraphs||[]);
    // A weekly recap cannot spend two news paragraphs announcing the same
    // leaders, or copy the same manager scolding into separate examples.
    const recapSeen=new Set();
    for(const section of overview.sections||[]){
      const clean=paras=>(paras||[]).map(p=>{
        const text=String(p||'');
        if(/That is a specific lineup choice, not an inspirational lesson about trying harder\./.test(text)){
          const suffix='That is a specific lineup choice, not an inspirational lesson about trying harder.';
          if(recapSeen.has(suffix))return text.replace(suffix,'The bench score makes the decision concrete; the next lineup card will show whether management listened.');
          recapSeen.add(suffix);
        }
        return text;
      });
      if(section.blocks?.length){
        for(const block of section.blocks)block.paragraphs=clean(block.paragraphs);
        section.paragraphs=section.blocks.flatMap(b=>b.paragraphs||[]);
      }else section.paragraphs=clean(section.paragraphs);
    }
  }
  overview.headline='Fleeced! Weekly Recap — '+String(weekClassification?.label||('Week '+week));
  overview.deck=weekClassification?.playoffs
    ?String(weekClassification.round||'The playoffs')+' gets its own newspaper: who advanced, who was eliminated, and which surviving roster now has to answer for the next round.'
    :'Week '+week+' gets its own newspaper: new games, new arguments, and enough season memory to know which developments are starting to repeat.';
  overview.week=week;overview.season=season;overview.week_classification=weekClassification||overview.week_classification;
  if(week>=3){
    // The copy changes every week, so these are data-driven finishing rules,
    // not a one-time Week 5 correction. Apply to the recap AND every desk.
    const pluralNames=[...new Set(teams.map(t=>w2DisplayTeam(t.team_name)).filter(w2PluralTeamName))]
      .sort((a,b)=>b.length-a.length);
    const players=[...new Set(teams.flatMap(t=>(t.starter_details||[]).map(p=>String(p.name||'').trim())).filter(Boolean))]
      .sort((a,b)=>b.length-a.length);
    const agreement={does:'do',gets:'get',has:'have',is:'are',needs:'need',sits:'sit',keeps:'keep',projects:'project'};
    const pluralPattern=pluralNames.length?new RegExp('\\b('+pluralNames.map(w2EscRe).join('|')+') (does|gets|has|is|needs|sits|keeps|projects)\\b','gi'):null;
    const pronounPattern=pluralNames.length?new RegExp('\\b('+pluralNames.map(w2EscRe).join('|')+') saw its\\b','gi'):null;
    const playerNames=new Map(players.map(name=>[name.toLowerCase(),name]));
    const playerPattern=players.length?new RegExp('\\b(?:'+players.map(w2EscRe).join('|')+')\\b','gi'):null;
    const polish=s=>{
      let copy=String(s||'').replace(/:\s*this Sunday\b/g,': This Sunday')
        .replace(/; The season record is\b/g,'; the season record is');
      if(pluralPattern)copy=copy.replace(pluralPattern,(_,name,verb)=>name+' '+(verb[0]===verb[0].toUpperCase()?agreement[verb.toLowerCase()][0].toUpperCase()+agreement[verb.toLowerCase()].slice(1):agreement[verb.toLowerCase()]));
      copy=copy.replace(/(The radio station covering [^.?!]{4,75}?) have declared\b/g,'$1 has declared')
        .replace(/\b(The road after [^.?!]{4,65}?) are mixed\b/g,'$1 is mixed');
      if(pronounPattern)copy=copy.replace(pronounPattern,(_,name)=>name+' saw their');
      // Player names are facts from the current lineup, not casing guesses.
      if(playerPattern)copy=copy.replace(playerPattern,name=>playerNames.get(name.toLowerCase())||name);
      return copy;
    };
    for(const s of overview.sections||[]){
      s.heading=polish(s.heading);
      if(s.blocks?.length){for(const b of s.blocks){b.heading=polish(b.heading);b.paragraphs=(b.paragraphs||[]).map(polish)}s.paragraphs=s.blocks.flatMap(b=>b.paragraphs||[])}
      else s.paragraphs=(s.paragraphs||[]).map(polish);
    }
    overview.hot_takes=(overview.hot_takes||[]).map(h=>({...h,title:polish(h.title),take:polish(h.take)}));
    for(const t of teams){
      const a=t.inquirer_article;if(!a)continue;
      a.headline=polish(a.headline);
      for(const s of a.sections||[]){s.heading=polish(s.heading);s.paragraphs=(s.paragraphs||[]).map(polish)}
      a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
    }
  }
  overview.inquirer_version=FORWARD_INQUIRER_VERSION;overview.editorial_revision=FORWARD_EDITORIAL_REVISION;
  for(const t of teams){if(t?.inquirer_article){{
   let title=String(t.inquirer_article.headline||'').replace(/^this Sunday/i,'This Sunday').replace(/the Week (\d+) Look Less Accidental/gi,'Week $1 Look Less Accidental');
   if(week>=3&&/Week \d+ Look Less Accidental/i.test(title)&&Number(t.points)>Number(t.opponent_points))
     title=w2DisplayTeam(t.team_name)+' Make Week '+week+' Count';
   if(w2PluralTeamName(t.team_name)){
    const titleVerbs={Makes:'Make',Wins:'Win',Has:'Have',Keeps:'Keep',Falls:'Fall',Loses:'Lose',Takes:'Take',Gives:'Give',Puts:'Put',Gets:'Get',Leaves:'Leave',Turns:'Turn',Banks:'Bank',Raises:'Raise',Is:'Are',Looks:'Look',Exposes:'Expose',Needs:'Need',Owns:'Own',Starts:'Start',Earns:'Earn',Lands:'Land'};
    title=title.replace(new RegExp(w2EscRe(w2DisplayTeam(t.team_name))+' ('+Object.keys(titleVerbs).join('|')+')\\b','g'),(_,verb)=>w2DisplayTeam(t.team_name)+' '+titleVerbs[verb]);
   }
   if(week>=3)title=title.replace(/\b(Make|Makes) this Sunday\b/g,'$1 This Sunday');
   t.inquirer_article.headline=title;
  }
   // Final, reader-facing copy pass. Run *after* every variation pass, because
   // variation can reintroduce stock prefixes and malformed grammar.
   if(week>=3){
    const article=t.inquirer_article;
    const usedPrefaces=new Set();let usedLouder=false;
    for(const section of article.sections||[]){
      section.heading=String(section.heading||'').replace(/^this Sunday/,'This Sunday');
      section.paragraphs=(section.paragraphs||[]).map(paragraph=>{
        let s=String(paragraph||'').replace(/\bthis round of games’s\b/gi,'this week’s')
          .replace(/\ba ([89](?:\.\d+)?-point)\b/gi,'an $1')
          .replace(/\bin the league order\b/gi,'in the league standings')
          .replace(/\bNo\. (\d+) in the league order\b/gi,'No. $1 in the league standings');
        if(w2PluralTeamName(t.team_name)){
          const n=w2EscRe(t.team_name);
          s=s.replace(new RegExp('\\b'+n+' sits\\b','gi'),t.team_name+' sit')
             .replace(new RegExp('\\b'+n+' does\\b','gi'),t.team_name+' do');
        }
        for(const prefix of ['Spare me the excuses:','Back-page material:','The lineup still answers:','Follow the scoring:','No fine print:']){
          const escaped=prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          const matches=[...s.matchAll(new RegExp(escaped,'g'))];
          for(let i=matches.length-1;i>=1;i--)s=s.slice(0,matches[i].index)+s.slice(matches[i].index+prefix.length).replace(/^\s*/, ' ');
          if(usedPrefaces.has(prefix)&&s.includes(prefix))s=s.replace(prefix,'').trimStart();
          if(s.includes(prefix))usedPrefaces.add(prefix);
        }
        if(/louder of the two/i.test(s)){
          if(usedLouder)s=s.replace(/\s+and turned Week \d+ into the louder of the two/gi,'');
          usedLouder=true;
        }
        return s;
      });
    }
    article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]);
   }
   t.inquirer_article.week=week;t.inquirer_article.week_classification=t.week_classification||weekClassification;t.inquirer_article.editorial_revision=FORWARD_EDITORIAL_REVISION}}
  // Finishing edits can make a sentence converge on an archived one. Run the
  // established collision evolution once more after finishing, then remove
  // repeated rhetorical prefaces without repeating the full quality audit.
  if(week>=3&&previousEdition){
    teams=evolveForwardTeams(teams,previousEdition,week,variationSalt+909);
    // Evolution itself may reintroduce a familiar opening phrase. Keep only
    // its first appearance per article, including after the final retry.
    for(const t of teams){
      const a=t?.inquirer_article;if(!a)continue;
      const seen=new Set();
      for(const s of a.sections||[])s.paragraphs=(s.paragraphs||[]).map(p=>{
        let copy=String(p||'');
        for(const prefix of ['Spare me the excuses:','Back-page material:','The lineup still answers:']){
          if(seen.has(prefix))copy=copy.replaceAll(prefix,'');
          if(copy.includes(prefix))seen.add(prefix);
        }
        return copy.trim();
      });
      const fanSection=(a.sections||[]).find(s=>s.kind==='sentiment');
      if(fanSection&&(forwardWordCount((fanSection.paragraphs||[]).join(' '))<35||
        (fanSection.paragraphs||[]).filter(p=>String(p).length>=50).length<2)){
        const riffs=[
          'The call-in show has already misplaced its indoor voice','The neighborhood group chat is charging admission to the argument',
          'The supporters are treating one lineup slot like public property','The postgame complaints have acquired an unnecessary second act',
          'Even the quiet fans have started offering roster suggestions','The season-ticket optimists are asking for a receipt this time',
          'The local sports bar has appointed itself a lineup committee','Nobody at the watch party asked for another mystery performance',
          'The fan section has rehearsed a very specific grievance','The town is not yet rioting, but the patience meter is visible',
          'The radio callers found the soft spot without a scouting budget','The supporters are tired of being handed a fresh explanation',
          'The crowd knows the difference between a blip and a habit','The faithful have kept the scoreboard image for unfortunate reasons',
          'The loudest backers are now demanding quieter mistakes','The fan base has turned the weak position into a weekly referendum'
        ];
        const idx=(Number(t.roster_id)||1)-1,player=t.worst_starter?.name||t.starter_details?.at(-1)?.name||'the quietest starter';
        const first=riffs[((idx%riffs.length)+riffs.length)%riffs.length];
        const second=[
          'Against '+w2DisplayTeam(t.opponent_name||'the opponent')+', '+player+' is the name everybody will remember from this result.',
          'With '+player+' on the postgame complaint list, the next lineup announcement deserves unusually thorough reading.',
          'A number next to '+player+' has done more damage to the mood than rivals could have arranged.',
          'Nobody needs a conspiracy to explain why '+player+' now occupies so much of the argument.',
          'Someone will have to explain '+player+' before the cheering section accepts another optimistic forecast.',
          'The next opponent gets a free scouting clue if '+player+' cannot change the conversation.',
          'A fresh lineup card offers '+player+' one honest opportunity to quiet the neighborhood.',
          'The manager may prefer patience; the people yelling about '+player+' have apparently canceled theirs.',
          'Rivals will not need an elaborate joke if '+player+' supplies the same number twice.',
          'The faithful can tolerate bad luck; they are less tolerant of '+player+' becoming a ritual.',
          'After this Sunday, '+player+' has become the least comfortable subject at the watch party.',
          'A little competence from '+player+' would do wonders for a very irritated local audience.',
          'The supporters have offered '+player+' a challenge that requires points instead of explanations.',
          'This is where '+player+' can make the complaint sound outdated by next Monday.',
          'Even the sympathetic callers have started asking what changes around '+player+' next week.',
          'The cleanest answer for '+player+' is a box score that silences the criticism.'
        ][((idx%16)+16)%16];
        const ending=[
          'The next result can settle that without an apology tour.',
          'There is no substitute for a quieter, better Sunday.',
          'The answer is available on the next actual scoreboard.',
          'Nobody is accepting a press conference as a substitute.',
          'At least the next matchup offers a fresh examination.',
          'The noise will follow the starters into the next game.',
          'One more bad performance turns irritation into routine.',
          'The supporters would dearly like to change the subject.',
          'The joke gets less funny every time it repeats.',
          'The coming week can still make this criticism obsolete.',
          'Better execution is a wonderfully economical public statement.',
          'The next opponent is unlikely to offer sympathy.',
          'Winning would be a far more convincing rebuttal.',
          'Patience has a finite and increasingly visible budget.',
          'One decent follow-up would calm quite a few people.',
          'There is still time to make the noise embarrassing.'
        ][((idx%16)+16)%16];
        fanSection.paragraphs=[...(fanSection.paragraphs||[]),first+'. '+second+' '+ending];
        if(fanSection.paragraphs.filter(p=>String(p).length>=50).length<2){
          const alternate=riffs[((idx+7)%16+16)%16];
          fanSection.paragraphs.push(alternate+'. '+w2DisplayTeam(t.team_name)+' still has the next matchup against '+w2DisplayTeam(t.next_opponent_name||'its next opponent')+' to turn this noise into a better story.');
        }
      }
      a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
    }
  }
  // Forecasts are not live league facts. An old MIDA snapshot must not be
  // presented as a current championship or playoff probability in a new issue.
  const forecastRows=teams.filter(t=>t.mida_outlook),staleForecasts=forecastRows.length>0&&forecastRows.every(t=>{
    const d=Date.parse(String(t.mida_outlook?.source_date||t.mida_outlook?.as_of||''));
    return Number.isFinite(d)&&Date.now()-d>7*86400000;
  });
  if(week>=3&&staleForecasts){
    const staleOdds=/\bMIDA\b|\b\d+(?:\.\d+)?%\s+(?:title|playoff|postseason|championship)\s+(?:outlook|odds|chance|probability)\b|\b(?:title|playoff|postseason|championship)\s+(?:number|probability|odds|outlook)\s+at\s+\d+(?:\.\d+)?%/i;
    const freshOnly=value=>forwardSentenceParts(value).filter(s=>!staleOdds.test(s)).join(' ').trim();
    const filterParagraphs=rows=>(rows||[]).map(freshOnly).filter(Boolean);
    for(const t of teams){const a=t.inquirer_article;if(!a)continue;
      for(const s of a.sections||[])s.paragraphs=filterParagraphs(s.paragraphs);
      a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
    }
    for(const s of overview.sections||[]){
      if(s.blocks?.length){for(const b of s.blocks)b.paragraphs=filterParagraphs(b.paragraphs);s.paragraphs=s.blocks.flatMap(b=>b.paragraphs||[])}
      else s.paragraphs=filterParagraphs(s.paragraphs);
    }
    overview.hot_takes=(overview.hot_takes||[]).map(h=>({...h,take:freshOnly(h.take)||'The completed weekly results, rather than an out-of-date forecast, carry this argument.'}));
  }
  if(week>=3){
    // A final whole-edition pass is essential: late evolution can bring back
    // same-reporter boilerplate after the earlier sentence cleanup.
    for(let pass=0;pass<4;pass++){
      const entities=[...forwardEntities({teams}),...forwardEntities(previousEdition)];
      const offenders=forwardCrossTeamClauseOffenders(teams,entities),paired=forwardPairedNarrativeOffenders(teams,entities);
      if(!offenders.size&&!paired.size)break;
      teams=teams.map(t=>{
        const a=t.inquirer_article;if(!a)return t;
        const sections=(a.sections||[]).map((s,si)=>({...s,paragraphs:(s.paragraphs||[]).map((p,pi)=>forwardSentenceParts(p).map((sentence,sj)=>{
          const collided=forwardEditorialPhraseKeys(sentence,entities,12,false).some(gram=>(offenders.get(gram)||[]).includes(t.team_name))||
            forwardEditorialPhraseKeys(sentence,entities,16,false).some(gram=>(paired.get(gram)||[]).indexOf(t.team_name)>=1);
          return collided?'':sentence;
        }).filter(Boolean).join(' ')).filter(Boolean)}));
        return{...t,inquirer_article:{...a,sections,paragraphs:sections.flatMap(s=>s.paragraphs||[])}};
      });
    }
    // Match the acceptance gate's visible-name rule exactly. Alias-based
    // grammatical classification can miss mascots when a display nickname
    // differs from the underlying team identity.
    const plural=teams.map(t=>w2DisplayTeam(t.team_name)).filter(n=>/s$/i.test(String(n).split(/\s+/).at(-1)||''));
    const fixGrammar=(s,isHeadline=false)=>{
      let copy=String(s||'');
      for(const name of plural){
        const expression=new RegExp('\\b'+w2EscRe(name)+' (does|gets|has|is|needs|sits|keeps|projects)\\b','gi');
        const verbs={does:'do',gets:'get',has:'have',is:'are',needs:'need',sits:'sit',keeps:'keep',projects:'project'};
        copy=copy.replace(expression,(_,verb)=>{
          const result=verbs[verb.toLowerCase()];
          return name+' '+(isHeadline?result[0].toUpperCase()+result.slice(1):result);
        });
      }
      return copy.replace(/\bthis round of games['’]s\b/gi,"this week's")
        .replace(/\ba ([89](?:\.\d+)?-point)\b/gi,'an $1')
        .replace(/\bthis round of games’s\b/gi,'this week’s')
        .replace(/\b(The radio station covering [^.?!]{4,85}?) have declared\b/gi,'$1 has declared')
        .replace(/\b(The (?:AFC|NFC) (?:EAST|WEST|NORTH|SOUTH) race around [^.?!]{4,85}?) are already compressed\b/gi,'$1 is already compressed');
    };
    for(const s of overview.sections||[]){
      s.heading=fixGrammar(s.heading);
      if(s.blocks?.length){for(const b of s.blocks){b.heading=fixGrammar(b.heading);b.paragraphs=(b.paragraphs||[]).map(p=>fixGrammar(p))}s.paragraphs=s.blocks.flatMap(b=>b.paragraphs||[])}
      else s.paragraphs=(s.paragraphs||[]).map(p=>fixGrammar(p));
    }
    overview.hot_takes=(overview.hot_takes||[]).map(h=>({...h,title:fixGrammar(h.title),take:fixGrammar(h.take)}));
    for(const t of teams){const a=t.inquirer_article;if(!a)continue;
      a.headline=fixGrammar(a.headline,true)
        .replace(/^A this Sunday Worth Talking About for (.+)$/i,(_,club)=>`${club} Turn Week ${week} Into a Talking Point`)
        .replace(/\bRuins (.+)[’'] this Sunday$/i,(_,club)=>`Put a Dent in ${club}’ Week ${week}`)
        .replace(/\bMake It The last two Sundays Worth Talking About\b/i,`Make Week ${week} Worth Talking About`)
        .replace(/\bMake Week \d+ Look Less Accidental\b/i,`Make Their Week ${week} Win Harder to Ignore`)
        .replace(/\bThe last two Sundays\b/gi,`Week ${week}`)
        .replace(/\bTwo Weeks of\b/g,`${week} Weeks of`)
        .replace(/\bthis Sunday\b/gi,`Week ${week}`);
      const seen=new Set();
      for(const s of a.sections||[])s.paragraphs=(s.paragraphs||[]).map(p=>{
        let copy=fixGrammar(p);
        for(const prefix of ['Spare me the excuses:','Back-page material:','The lineup still answers:']){
          const parts=copy.split(prefix);
          if(parts.length>1){copy=parts[0]+(seen.has(prefix)?'':prefix)+parts.slice(1).join('');seen.add(prefix)}
        }
        return copy.trim();
      });
      a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
    }
    // Apply the structural floor *after* clause removal. A collision repair
    // can shorten a sentiment paragraph even if it passed an earlier check.
    for(const t of teams){
      const article=t.inquirer_article,fan=(article?.sections||[]).find(s=>s.kind==='sentiment');
      if(!fan)continue;
      const player=t.worst_starter?.name||t.starter_details?.at(-1)?.name||'the quietest starter';
      const team=w2DisplayTeam(t.team_name),opponent=w2DisplayTeam(t.next_opponent_name||'the next opponent');
      while((fan.paragraphs||[]).filter(p=>String(p).length>=50).length<2){
        const count=(fan.paragraphs||[]).length;
        fan.paragraphs.push(count%2
          ?'The '+team+' fan section is watching '+player+' with a week of accumulated impatience. '+opponent+' will get the next look, and supporters want the answer to arrive in fantasy points.'
          :'Around '+team+', the latest discussion has turned to '+player+' and the decisions that made the matchup harder than necessary. The next Sunday offers the manager a practical way to quiet it.');
      }
      article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]);
    }
  }
  // Week 4 is the approved newspaper layout. The forward generator must
  // preserve its *section taxonomy*, regardless of how the copy evolves.
  // Do this at handoff, after every de-duplication pass has run.
  if(week>=5){
    const sectionOrder=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
    for(const t of teams){
      const article=t.inquirer_article;if(!article)continue;
      const byKind=new Map((article.sections||[]).map(s=>[s.kind,s]));
      const top=(t.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0];
      const team=w2DisplayTeam(t.team_name),r=article.reporter||{};
      const creditHeadings={
        'nick swindell':'Credit Where It Is Due',
        'bartholomew roycington iii':'The Credit Ledger, With Reservations',
        'tilly fleecer':'The Name That Earned the Headline',
        'jefferson filch':'The Evidence in Their Favor'
      };
      if(!byKind.has('cool-throne')){
        // The forward copy already has team-specific player reporting. Move a
        // distinct paragraph to the Week 4 credit desk instead of inventing
        // a universal praise template that reappears in 32 articles.
        const playerDesk=byKind.get('players');
        const playerRows=playerDesk?.paragraphs||[];
        const creditIndex=playerRows.length>1
          ?Math.max(1,playerRows.findIndex((p,i)=>i>0&&top?.name&&p.includes(top.name)))
          :-1;
        const credit=creditIndex>=1&&creditIndex<playerRows.length
          ?playerRows.splice(creditIndex,1)
          :[top?`${top.name} put ${forwardOne(top.points)} fantasy points on ${team}'s Week ${week} board.`:`${team} could not identify a verified individual scoring leader.`];
        byKind.set('cool-throne',{kind:'cool-throne',heading:creditHeadings[String(r.name||'').toLowerCase()]||'Credit Where It Is Due',paragraphs:credit});
      }
      // Never send a blank market desk to the newspaper. Report the actual
      // measured movement, however small, or explicitly disclose absent data.
      // Do not invent an estimate or inflate a routine fluctuation into news.
      const marketDesk=byKind.get('value');
      if(!(marketDesk?.paragraphs||[]).some(p=>String(p||'').trim()&&!/^n\/?a$/i.test(String(p).trim()))){ 
        const market=t.value_history_week||{},delta=Number(market.delta),current=Number(market.value);
        const validDelta=market.delta!=null&&Number.isFinite(delta);
        const validCurrent=market.value!=null&&Number.isFinite(current);
        const magnitude=validDelta?Math.abs(Math.round(delta)).toLocaleString('en-US'):null;
        const baseline=Number(market.baseline_value);
        const validBaseline=market.baseline_value!=null&&Number.isFinite(baseline);
        // Rotate factual reporting angles by roster and week, rather than
        // stapling an identical punchline to every team's market numbers.
        const slot=(Math.imul(Number(t.roster_id||0),7)+Number(week||0))%8;
        // Pair independently rotated fact angles: 32 unique combinations
        // for 32 rosters, with week-aware variation and no invented facts.
        const rosterOffset=((Number(t.roster_id||1)-1)%32+32)%32;
        const contextSlot=(Math.floor(rosterOffset/8)*2+Math.floor((rosterOffset%8)/4)+Number(week||0))%8;
        const signed=validDelta?(delta>0?'+':delta<0?'-':'')+magnitude:null;
        const now=validCurrent?Math.round(current).toLocaleString('en-US'):null;
        const before=validBaseline?Math.round(baseline).toLocaleString('en-US'):null;
        const observed=validDelta?[
          team+' recorded a Week '+week+' roster-value change of '+signed+' points.',
          'The Week '+week+' market ledger shows '+team+' at '+signed+' points of movement.',
          'For '+team+', the verified Week '+week+' valuation change was '+signed+' points.',
          team+' closed the Week '+week+' valuation window '+(delta>0?'higher by ':delta<0?'lower by ':'unchanged at ')+magnitude+' points.',
          'The Week '+week+' value sheet records '+signed+' points for '+team+'.',
          'Measured roster value moved '+signed+' points for '+team+' in Week '+week+'.',
          team+' finished Week '+week+' with '+signed+' points of recorded value movement.',
          'On the Week '+week+' valuation sheet, '+team+' registered '+signed+' points.'
        ][slot]:team+' has no verified market movement for Week '+week+'; no change is claimed.';
        const context=validCurrent&&validBaseline?[
          'The recorded endpoints were '+before+' and '+now+' valuation points. That is not itself proof of better lineup decisions.',
          'The market shifted from '+before+' to '+now+' valuation points; actual fantasy scoring remains separate evidence.',
          'The verifiable comparison is '+before+' previously and '+now+' valuation points now, not a claim about a particular player.',
          'Market snapshots: '+before+' then '+now+' points. Result causation remains unproven.',
          'The baseline was '+before+' and the current reading '+now+' valuation points; the football verdict belongs to the starters.',
          'From '+before+' to '+now+' valuation points, the market series supplies a measurement rather than a manager grade.',
          'A move from '+before+' to '+now+' valuation points is documented; no individual player is assigned an invented cause.',
          'The measured valuation moved from '+before+' to '+now+' points for '+team+'; its Week '+week+' fantasy output was '+Number(t.points||0).toFixed(1)+' points against '+String(t.opponent_name||'the opponent')+'. These are distinct measures.'
        ][contextSlot]:validCurrent?'The current verified valuation is '+now+' points; no comparable baseline was supplied.':'No verified current valuation is available; editorial approval must wait for genuine market data.';
        byKind.set('value',{kind:'value',heading:marketDesk?.heading||'The Roster-Value Ledger',paragraphs:[observed+' '+context]});
      }
      const outlook=byKind.get('outlook');
      if(outlook?.paragraphs?.length>3){
        // Keep the week-ahead newspaper kicker concise, as it was in Week 4.
        // Retain opening matchup facts, a distinct scheduling concern and the
        // final judgment, without reproducing a second seven-paragraph story.
        const rows=outlook.paragraphs;
        outlook.paragraphs=[rows[0],rows.find((p,i)=>i>0&&i<rows.length-1&&/bye|questionable|injur|division|playoff|schedule/i.test(p))||rows[1],rows.at(-1)]
          .filter((p,i,a)=>p&&!a.slice(0,i).includes(p));
      }
      article.sections=sectionOrder.map(k=>byKind.get(k)).filter(Boolean);
      article.paragraphs=article.sections.flatMap(s=>s.paragraphs||[]);
      curateForwardTeamNarrative(t,week);
      // Final-stage copy edits must run after narrative curation, which may
      // rewrite sections. English plural team names take a trailing apostrophe.
      if(/s$/i.test(team)){
        for(const desk of article.sections||[])
          desk.paragraphs=(desk.paragraphs||[]).map(p=>String(p).replaceAll(team+"'s",team+"'"));
      }
      // A football-first fan paragraph still needs to describe the audience's
      // reaction. Only add an evidence-based bridge where curation left none.
      const fanDesk=article.sections.find(s=>s.kind==='sentiment');
      const fanCopy=(fanDesk?.paragraphs||[]).join(' ');
      if(fanDesk?.paragraphs?.length&&
         !/\b(?:fans?|supporters?|crowd|fan club|fan base|faithful|stadium|radio|call-in|bars?|group chat|neighborhood)\b/i.test(fanCopy)){
        const fanStar=top?.name||'the lineup',fanPoints=forwardOne(top?.points||0);
        const introductions=[
          'Fans debated ','Supporters questioned ','The crowd discussed ','Radio callers examined ',
          'Fans revisited ','Supporters assessed ','The fan base weighed ','The crowd reconsidered '
        ];
        fanDesk.paragraphs[0]=introductions[Number(t.roster_id)%introductions.length]+
          fanStar+"'s "+fanPoints+"-point return. "+fanDesk.paragraphs[0];
      }
      // Curators can reinsert an identical factual sentence into two desks.
      // Keep the first occurrence and remove only exact repeated sentences;
      // distinct facts and different interpretations remain untouched.
      const usedSentences=new Set();
      for(const desk of article.sections||[]){
        desk.paragraphs=(desk.paragraphs||[]).map(paragraph=>{
          const sentences=String(paragraph).split(/(?<=[.!?])\s+/);
          return sentences.filter(sentence=>{
            const key=sentence.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
            if(key.split(' ').length<13)return true;
            if(usedSentences.has(key))return false;
            usedSentences.add(key);return true;
          }).join(' ').trim();
        }).filter(Boolean);
      }
      // Keep forward articles under the locked Week 4 editorial ceiling.
      // Tighten optional commentary sentences, never erase a factual desk or
      // clip a paragraph mid-sentence. Every retained paragraph stays substantial.
      const forwardWordCount=()=>article.sections.flatMap(s=>s.paragraphs||[])
        .join(' ').trim().split(/\s+/).filter(Boolean).length;
      for(let cut=0;forwardWordCount()>640&&cut<8;cut++){
        let reduced=false;
        for(const kind of ['sentiment','outlook','lede']){
          const desk=article.sections.find(s=>s.kind===kind);
          if(!desk)continue;
          const i=(desk.paragraphs||[]).findIndex(p=>{
            const parts=String(p).split(/(?<=[.!?])\s+/);
            return parts.length>1&&parts.slice(0,-1).join(' ').length>=75;
          });
          if(i<0)continue;
          desk.paragraphs[i]=String(desk.paragraphs[i]).split(/(?<=[.!?])\s+/).slice(0,-1).join(' ');
          reduced=true;break;
        }
        if(!reduced){
          // If every optional paragraph is a single sentence, remove one
          // complete excess commentary paragraph while preserving desk minima.
          const minima={sentiment:2,outlook:2,lede:2,players:2,management:1};
          for(const kind of ['outlook','lede','sentiment','players','management']){
            const desk=article.sections.find(s=>s.kind===kind);
            if((desk?.paragraphs||[]).length>(minima[kind]||1)){
              desk.paragraphs.pop();reduced=true;break;
            }
          }
        }
        if(!reduced)break;
      }
      article.paragraphs=(article.sections||[]).flatMap(s=>s.paragraphs||[]);
    }
    const first=overview.sections?.[0];
    if(first?.blocks?.length){
      const original=first.blocks;
      const gameBlocks=original.filter(b=>/vs\.|Loudest Game/i.test(String(b.heading||'')));
      const standings=original.find(b=>/Standings/i.test(String(b.heading||'')));
      const decisions=original.find(b=>/Decisions/i.test(String(b.heading||'')));
      const league=original.find(b=>/Season Is Bigger/i.test(String(b.heading||'')));
      const lead=gameBlocks.flatMap(b=>b.paragraphs||[]);
      const playerDetails=lead.filter(p=>/fantasy points|scored|gave .* at the top/i.test(p));
      const leadWithoutPlayers=lead.filter(p=>!playerDetails.includes(p));
      const top=(teams||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0];
      const runnerUp=(teams||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[1];
      const rebuilding=(teams||[]).find(t=>!t.won&&t.next_opponent_name&&t!==top);
      const next=top?.next_opponent_name||'the next opponent';
      // Week-aware, score-backed league analysis. Never replace an entire
      // editorial argument with the same newsroom maxim every Sunday.
      const highScore=Number(top?.points)||0,secondScore=Number(runnerUp?.points)||0;
      const scoreGap=forwardOne(Math.max(0,highScore-secondScore));
      const topName=w2DisplayTeam(top?.team_name||'the leader');
      const secondName=w2DisplayTeam(runnerUp?.team_name||'the runner-up');
      const leagueParagraphs=week%2
        ?[`The scoreboard made a hierarchy this Sunday: ${topName} finished on ${forwardOne(highScore)}, while ${secondName} answered with ${forwardOne(secondScore)}. Anyone calling that a photo finish should get their eyes checked.`,
          `The ${scoreGap}-point separation matters to this week's league argument, but the table still demands another Sunday of evidence before anyone gets a crown.`]
        :[`The loudest number on the board belonged to ${topName}: ${forwardOne(highScore)}. ${secondName} managed ${forwardOne(secondScore)}, which gives the challengers an actual target rather than another motivational speech.`,
          `A ${scoreGap}-point spread between first and second is the week's measuring stick, not a championship certificate. Those are printed much later, usually after someone regrets the parade plans.`];
      const blocks=[
        {kind:'lead',heading:'The Story That Defined Week '+week,paragraphs:leadWithoutPlayers.length?leadWithoutPlayers:lead.slice(0,5)},
        {kind:'standings',heading:'The Standings Have Started Talking',paragraphs:standings?.paragraphs||[]},
        {kind:'players',heading:'The Names Behind the Noise',paragraphs:playerDetails.length?playerDetails:lead.slice(0,2)},
        {kind:'decisions',heading:'The Decisions and the Damage',paragraphs:decisions?.paragraphs||[]},
        {kind:'league',heading:'What the League Learned',paragraphs:leagueParagraphs},
        {kind:'outlook',heading:'The Week Ahead',paragraphs:[...(top?['After Week '+week+', '+w2DisplayTeam(top.team_name)+(w2PluralTeamName(top.team_name)?' face ':' faces ')+w2DisplayTeam(next)+' next. The '+forwardOne(top.points)+'-point performance earned attention; the new opponent gets its own answer.']:[]),...(rebuilding?['For '+w2DisplayTeam(rebuilding.team_name)+', the next opponent is '+w2DisplayTeam(rebuilding.next_opponent_name)+'. After a '+forwardOne(rebuilding.points)+'-point loss-week showing, the immediate question is which starting spots can supply a credible answer before another result goes into the standings.']:[])]}
      ];
      first.heading='Week '+week+': The League-Wide Reckoning';
      first.blocks=blocks;
      first.paragraphs=blocks.flatMap(b=>b.paragraphs||[]);
    }
  }
  // Composition is the last writer. Therefore grammar cleanup must run AFTER
  // composition, not before it, on both the recap and the team columns.
  if(week>=3){
    const plural=teams.map(t=>w2DisplayTeam(t.team_name)).filter(w2PluralTeamName).sort((a,b)=>b.length-a.length);
    const clean=s=>{
      let x=String(s||'');
      for(const name of plural){
        const re=new RegExp('\\b'+w2EscRe(name)+' (faces|does|gets|has|is|needs|sits|keeps|projects)\\b','gi');
        const verbs={faces:'face',does:'do',gets:'get',has:'have',is:'are',needs:'need',sits:'sit',keeps:'keep',projects:'project'};
        x=x.replace(re,(_,v)=>name+' '+verbs[v.toLowerCase()]);
      }
      return x.replace(/\bThe margin asks more:\s*/gi,'')
        .replace(/\b(?:Look at the personnel:\s*)?The record is \d+-\d+[^.]*\./gi,'')
        .replace(/\b(The radio station covering [^.?!]{4,85}?) have declared\b/gi,'$1 has declared')
        .replace(/\b(The (?:AFC|NFC) (?:EAST|WEST|NORTH|SOUTH) race around [^.?!]{4,85}?) are already compressed\b/gi,'$1 is already compressed')
        .replace(/\b(The road after [^.?!]{4,85}?) are mixed\b/gi,'$1 is mixed');
    };
    for(const t of teams){const a=t.inquirer_article;if(!a)continue;
      a.headline=clean(a.headline);
      for(const s of a.sections||[]){s.heading=clean(s.heading);s.paragraphs=(s.paragraphs||[]).map(clean)}
      a.paragraphs=a.sections.flatMap(s=>s.paragraphs||[]);
    }
    for(const s of overview.sections||[]){s.heading=clean(s.heading);
      if(s.blocks?.length){for(const b of s.blocks){b.heading=clean(b.heading);b.paragraphs=(b.paragraphs||[]).map(clean)}s.paragraphs=s.blocks.flatMap(b=>b.paragraphs||[])}
      else s.paragraphs=(s.paragraphs||[]).map(clean);
    }
    overview.hot_takes=(overview.hot_takes||[]).map(h=>({...h,title:clean(h.title),take:clean(h.take)}));
  }
  // The editor shortens each article AFTER the legacy collision checks. A
  // sentence that was only 1/18 of the old article can become 1/11 of the
  // published one. Recheck the actual final selection against the prior issue
  // and across this issue before the quality/publication gates see it.
  if(week>=5){
    const entities=[...forwardEntities({teams}),...forwardEntities(previousEdition)];
    const priorByRoster=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t]));
    for(const t of teams){const a=t.inquirer_article,prior=priorByRoster.get(String(t.roster_id));if(!a||!prior)continue;
      const old=new Set(forwardArticleSentences(prior).map(s=>forwardNormSentence(s,entities)));
      for(const section of a.sections||[])section.paragraphs=(section.paragraphs||[]).map(p=>
        forwardSentenceParts(p).filter(s=>forwardWordCount(s)<10||!old.has(forwardNormSentence(s,entities))).join(' ').trim()
      ).filter(Boolean);
      a.paragraphs=a.sections.flatMap(s=>s.paragraphs||[]);
    }
    for(let pass=0;pass<2;pass++){
      const offenders=forwardCrossTeamClauseOffenders(teams,entities);
      if(!offenders.size)break;
      for(const t of teams){const a=t.inquirer_article;if(!a)continue;
        for(const section of a.sections||[])section.paragraphs=(section.paragraphs||[]).map(p=>
          forwardSentenceParts(p).filter(s=>!forwardEditorialPhraseKeys(s,entities,12,false).some(key=>(offenders.get(key)||[]).includes(t.team_name))).join(' ').trim()
        ).filter(Boolean);
        a.paragraphs=a.sections.flatMap(s=>s.paragraphs||[]);
      }
    }
    // Whole-sentence variants shorter than a twelve-word phrase can still
    // reproduce across four desks; the publication gate counts those too.
    const repeated=new Map();
    for(const t of teams)for(const s of forwardArticleSentences(t)){
      const key=forwardNormSentence(s,entities);
      if(!repeated.has(key))repeated.set(key,new Set());
      repeated.get(key).add(String(t.roster_id));
    }
    const repeatedSentences=new Set([...repeated].filter(([,owners])=>owners.size>=4).map(([s])=>s));
    if(repeatedSentences.size)for(const t of teams){const a=t.inquirer_article;if(!a)continue;
      for(const section of a.sections||[])section.paragraphs=(section.paragraphs||[]).map(p=>
        forwardSentenceParts(p).filter(s=>forwardWordCount(s)<10||!repeatedSentences.has(forwardNormSentence(s,entities))).join(' ').trim()
      ).filter(Boolean);
      a.paragraphs=a.sections.flatMap(s=>s.paragraphs||[]);
    }
    // Recap copy-forward is independent of team-story copy-forward. A division
    // board is especially susceptible: unchanged positions may be newsworthy,
    // but the newspaper must not reproduce the prior issue's entire prose.
    if(previousEdition?.league_overview){
      const oldRecap=new Set(forwardRecapSentences(previousEdition).map(s=>forwardNormSentence(s,entities)));
      const fresh=p=>forwardSentenceParts(p).filter(s=>forwardWordCount(s)<10||!oldRecap.has(forwardNormSentence(s,entities))).join(' ').trim();
      for(const [sectionIndex,section] of (overview.sections||[]).entries()){
        if(section.blocks?.length){
          for(const block of section.blocks){
            const before=block.paragraphs||[],after=before.map(fresh).filter(Boolean),floor=['league','outlook'].includes(block.kind)?2:1;
            if(after.length>=floor)block.paragraphs=after;
          }
          section.paragraphs=section.blocks.flatMap(b=>b.paragraphs||[]);
        }else{
          const after=(section.paragraphs||[]).map(fresh).filter(Boolean);
          if(after.length)section.paragraphs=after;
          else if((section.paragraphs||[]).length){
            // The recycled synthetic standings board can otherwise make an
            // entire reporter desk empty. Replace it with this week's source
            // scoreboard rather than republishing last week's standings.
            const game=teams[(sectionIndex*7)%teams.length];
            const score=Number(game.points).toFixed(1),against=Number(game.opponent_points).toFixed(1);
            const reports=[
              `${game.team_name} scored ${score} against ${game.opponent_name}'s ${against} in Week ${week}; that result belongs in the division conversation, regardless of where anyone placed the preseason bets.`,
              `An actual Week ${week} result supplies the counterweight to the standings chatter: ${game.team_name} ${score}, ${game.opponent_name} ${against}.`,
              `Forget the old division-board shorthand for a moment. Week ${week} produced ${score} from ${game.team_name} and ${against} from ${game.opponent_name}.`,
              `The Week ${week} scoreboard gives this race a concrete reference point: ${game.team_name} finished on ${score}; ${game.opponent_name} ended on ${against}.`
            ];
            section.paragraphs=[reports[sectionIndex%reports.length]];
          }
        }
      }
      overview.hot_takes=(overview.hot_takes||[]).map(h=>{
        // A division board is structured standings data, not recycled
        // commentary. Preserve its current league-derived eight entries:
        // replacing them with a stock scoreboard gag destroys both the
        // source evidence and the format the reader expects.
        if(/division board/i.test(String(h.title||'')))return h;
        const original=forwardSentenceParts(h.take||'');
        const fresh=original.filter(sentence=>
          forwardWordCount(sentence)<10||!oldRecap.has(forwardNormSentence(sentence,entities)));
        if(fresh.length===original.length)return h;
        // Do not manufacture a punchline when archival language is removed.
        // An empty take is rejected by the independent publication guard and
        // the candidate selector tries another variation instead.
        return {...h,take:fresh.join(' ').trim()};
      });
    }
    for(const t of teams)restoreForwardPlayerFact(t);
    // Final stage after every archive filter: keep meaningful fan response,
    // and reject paired punchlines shared with any other current team.
    const finalPriorByRoster=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t]));
    const fanEntities=[...forwardEntities({teams}),...forwardEntities(previousEdition)];
    const fanPhraseKeys=new Set();
    for(const teamRow of teams){
      const fan=teamRow.inquirer_article?.sections?.find(x=>x.kind==='sentiment');
      for(const para of fan?.paragraphs||[])for(const key of forwardEditorialPhraseKeys(para,fanEntities,16,false))fanPhraseKeys.add(key);
    }
    for(const t of teams){
      const a=t.inquirer_article,fan=a?.sections?.find(x=>x.kind==='sentiment');
      if(!fan)continue;
      const prior=finalPriorByRoster.get(String(t.roster_id));
      const old=new Set(forwardArticleSentences(prior).map(line=>forwardNormSentence(line,fanEntities)));
      const used=new Set(forwardSentenceParts((fan.paragraphs||[]).join(' ')).map(line=>forwardNormSentence(line,fanEntities)));
      const hasFans=()=>/\b(?:fans?|supporters?|crowd|fan club|fan base|faithful|stadium|radio|call-in|bars?|group chat|neighborhood)\b/i.test((fan.paragraphs||[]).join(' '));
      for(let offset=1;offset<=64&&((fan.paragraphs||[]).filter(p=>String(p).length>=50).length<2||!hasFans());offset++){
        const alternate={...t,roster_id:String((Number(t.roster_id)||1)+offset)};
        for(const candidate of forwardFanScenes(alternate,Number(t.points)>Number(t.opponent_points),week,variationSalt)){
          if(String(candidate).length<50)continue;
          const sentences=forwardSentenceParts(candidate);
          if(sentences.some(line=>old.has(forwardNormSentence(line,fanEntities))||used.has(forwardNormSentence(line,fanEntities))))continue;
          const keys=forwardEditorialPhraseKeys(candidate,fanEntities,16,false);
          if(keys.some(key=>fanPhraseKeys.has(key)))continue;
          fan.paragraphs.push(candidate);
          sentences.forEach(line=>used.add(forwardNormSentence(line,fanEntities)));
          keys.forEach(key=>fanPhraseKeys.add(key));
          if(fan.paragraphs.filter(p=>String(p).length>=50).length>=2&&hasFans())break;
        }
      }
      // The scene selector is the final writer. Agreement correction must
      // therefore run here, after the selected scene is inserted.
      const pluralNames=teams.map(row=>w2DisplayTeam(row.team_name)).filter(w2PluralTeamName);
      fan.paragraphs=(fan.paragraphs||[]).map(line=>{
        let text=String(line||'');
        for(const name of pluralNames){
          const verb={has:'have',is:'are',does:'do',gets:'get',sits:'sit',needs:'need',keeps:'keep',faces:'face',projects:'project'};
          text=text.replace(new RegExp('\\b'+w2EscRe(name)+' (has|is|does|gets|sits|needs|keeps|faces|projects)\\b','gi'),
            (_,word)=>name+' '+verb[word.toLowerCase()]);
        }
        return text
          .replace(/\b(The radio station covering [^.?!]{4,85}?) have declared\b/gi,'$1 has declared')
          .replace(/\b(The (?:AFC|NFC) (?:EAST|WEST|NORTH|SOUTH) race around [^.?!]{4,85}?) are already compressed\b/gi,'$1 is already compressed')
          .replace(/\b(The road after [^.?!]{4,85}?) are mixed\b/gi,'$1 is mixed');
      });
      a.paragraphs=a.sections.flatMap(x=>x.paragraphs||[]);
    }
  }
  // Final editorial-depth check runs *after* archival and cross-team pruning.
  // It must see the exact article structure handed to the admission gate.
  if(week>=5)for(const t of teams){
    restoreForwardArticleDepth(t,week);
    const a=t.inquirer_article;if(!a)continue;
    // Headline rewrites must be finalized here: the late composition pass
    // can re-introduce the old Week-2 two-game conclusion in other salts.
    a.headline=String(a.headline||'').replaceAll(
      'Make Week '+week+' Look Less Accidental',
      'Make Their Week '+week+' Win Harder to Ignore');
  }
  // Late copy edits can resurrect Week N-1 sentences. Repair only confirmed
  // same-roster reuse, NOT the full newsroom (which can introduce shared riffs).
  if(week>=3&&previousEdition){
    const entities=[...forwardEntities({teams}),...forwardEntities(previousEdition)];
    const prior=new Map((previousEdition.teams||[]).map(t=>[String(t.roster_id),
      new Set(forwardArticleSentences(t).map(x=>forwardNormSentence(x,entities)))]));
    teams=teams.map(t=>{
      const a=t.inquirer_article,old=prior.get(String(t.roster_id));
      if(!a||!old?.size)return t;
      const rid=String(a?.reporter?.id||'walter-mercer');
      const sections=(a.sections||[]).map((sec,si)=>({...sec,paragraphs:(sec.paragraphs||[]).map((p,pi)=>
        forwardSentenceParts(p).map((sentence,sj)=>{
          if(forwardWordCount(sentence)<10||!old.has(forwardNormSentence(sentence,entities)))return sentence;
          let out=sentence;
          for(let attempt=0;attempt<8;attempt++){
            out=evolveSentence(out,rid,[week,variationSalt,t.roster_id,sec.kind,si,pi,sj,attempt].join('|'));
            if(!old.has(forwardNormSentence(out,entities)))break;
          }
          return out;
        }).join(' ')
      )}));
      return {...t,inquirer_article:{...a,sections,paragraphs:sections.flatMap(x=>x.paragraphs||[])}};
    });
  }
  // Final reader-facing grammar pass: later variation/architecture steps can
  // introduce numeric adjectives after earlier copy polishing has run.
  const finishGrammar=s=>String(s)
    .replace(/\bThe margin asks more:\s*/gi,'')
    .replace(/\ban (?=9(?:\.\d+)?-point\b)/gi,'a ')
    .replace(/\ba (?=8(?:\.\d+)?-point\b)/gi,'an ');
  teams=teams.map(t=>{
    const a=t?.inquirer_article;
    if(!a)return t;
    const zeros=(t.starter_details||[]).filter(p=>p?.points!=null&&String(p.points).trim()!==''&&Number(p.points)===0&&p.name);
    const accurateZeroCopy=line=>{
      let value=finishGrammar(line);
      for(const p of zeros){
        const name=String(p.name);
        value=forwardSentenceParts(value).map(sentence=>
          sentence.toLowerCase().includes(name.toLowerCase())&&
          /\b(?:got something from|deserves? (?:its|his|her|their) credit|provided a boost|came through in the clutch|earned a cool throne)\b/i.test(sentence)
           ?name+' contributed 0.0 fantasy points in the recorded Week '+week+' starting lineup; that is a shortfall, not a contribution worth praising.':sentence
        ).join(' ');
      }
      return value;
    };
    const sections=(a.sections||[]).map(sec=>({...sec,paragraphs:(sec.paragraphs||[]).map(accurateZeroCopy)}));
    return {...t,inquirer_article:{...a,headline:finishGrammar(a.headline||''),sections,paragraphs:sections.flatMap(sec=>sec.paragraphs)}};
  });
  overview=deepStrings(overview,finishGrammar);
  return{inquirer:{...rawInquirer,teams},leagueOverview:overview,variationSalt};
}

function forwardSentenceParts(s){return String(s||'').replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Za-z0-9])/g,m=>m.replace('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean)}
function forwardWordCount(s){return String(s||'').trim().split(/\s+/).filter(Boolean).length}
function forwardEscRe(s){return [...String(s||'')].map(ch=>'.*+?^$(){}|[]'.includes(ch)||ch.charCodeAt(0)===92?'\\'+ch:ch).join('')}
function forwardEntities(edition){return[...(edition?.teams||[])].flatMap(t=>[t.team_name,t.manager_name,t.opponent_name,t.next_opponent_name,...(t.starter_details||[]).map(p=>p.name)]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length)}
function forwardNormSentence(s,entities=[]){let x=String(s||'');for(const e of entities)x=x.replace(new RegExp(forwardEscRe(e),'gi'),'[ENTITY]');return x.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,'[#]').replace(/\s+/g,' ').trim()}
function forwardArticleSentences(t){return forwardSentenceParts((t?.inquirer_article?.paragraphs||[]).join(' ')).filter(x=>forwardWordCount(x)>=10)}
function forwardRecapSentences(e){return forwardSentenceParts([...(e?.league_overview?.sections||[]).flatMap(s=>s.paragraphs||[]),...(e?.league_overview?.hot_takes||[]).filter(x=>!/division board/i.test(String(x?.title||''))).flatMap(x=>[x?.title,x?.take])].filter(Boolean).join(' ')).filter(x=>forwardWordCount(x)>=10)}

export function evaluateInquirerEditionQuality(current,previous=null){
  const issues=[...inspectInquirerFormatContract(current),...inspectNarrativeArchitecture(current)],teams=current?.teams||[],entities=forwardEntities(current).concat(forwardEntities(previous));
  const dated=teams.filter(t=>t.mida_outlook);
  if(Number(current?.week)>=3&&dated.length&&dated.every(t=>{
    const stamp=Date.parse(String(t.mida_outlook?.source_date||t.mida_outlook?.as_of||''));
    return Number.isFinite(stamp)&&Date.now()-stamp>7*86400000;
  })&&/\bMIDA\b|\b\d+(?:\.\d+)?%\s+(?:title|playoff|postseason|championship)\s+(?:outlook|odds|chance|probability)\b|\b(?:title|playoff|postseason|championship)\s+(?:number|probability|odds|outlook)\s+at\s+\d+(?:\.\d+)?%/i.test([...(current?.league_overview?.sections||[]).flatMap(s=>s.paragraphs||[]),...(current?.league_overview?.hot_takes||[]).map(h=>h.take),...teams.flatMap(t=>t.inquirer_article?.paragraphs||[])].join(' ')))
    issues.push({id:'stale-forecast-presented-as-current',detail:'Forecast source is more than seven days old.'});
  if(!teams.length)issues.push({id:'no-team-articles',detail:'No team articles were generated.'});
  const articleScaffold=new Map();
  const extendedPhraseOwners=new Map();
  const recurringTeamPhrases=[
    'the next Sunday changes the season sample; it does not simply photocopy',
    'same stars are fine; same emergency dependence is not',
    'headliner shift made the second scoreboard louder',
    'the third score turned the Week',
    'kicked the door in and',
    'kept the middle of the scoreboard from going dark'
  ];
  const repeatedTeamPhrases=new Map(recurringTeamPhrases.map(phrase=>[phrase,[]]));
  let trioMentions=0;
  for(const t of teams){
    const sentences=forwardArticleSentences(t),norms=sentences.map(s=>forwardNormSentence(s,entities));
    const fullCopy=(t?.inquirer_article?.sections||[]).flatMap(x=>x?.paragraphs||[]).join(' ');
    const uniqueLongPhrases=new Set();
    const tokens=(fullCopy.toLowerCase().match(/[a-z0-9]+/g)||[]);
    for(let at=0;at+9<=tokens.length;at++){
      const window=tokens.slice(at,at+9);
      // Numeric records shared by multiple teams (e.g., 0-0 in Weeks 2/3)
      // are facts, not recycled editorial phrasing; never weaken the
      // independent rejection of repeated jokes and prose.
      if(window.filter(word=>/^\d+$/.test(word)).length>=2)continue;
      uniqueLongPhrases.add(window.join(' '));
    }
    for(const phrase of uniqueLongPhrases){
      const owners=extendedPhraseOwners.get(phrase)||new Set();
      owners.add(String(t.roster_id));extendedPhraseOwners.set(phrase,owners);
    }
    if(Number(t?.points)===0&&/\bgot something from\b/i.test(fullCopy))
      issues.push({id:'zero-point-production-praise',team:t.team_name});

    for(const n of new Set(norms)){if(!articleScaffold.has(n))articleScaffold.set(n,new Set());articleScaffold.get(n).add(String(t.roster_id))}
    const prior=(previous?.teams||[]).find(x=>String(x.roster_id)===String(t.roster_id));
    if(prior){
      const pset=new Set(forwardArticleSentences(prior).map(s=>forwardNormSentence(s,entities))),overlap=norms.filter(n=>pset.has(n));
      const ratio=norms.length?overlap.length/norms.length:0;
      if(overlap.length>=5||ratio>.16)issues.push({id:'same-team-copy-forward',team:t.team_name,overlap:overlap.length,ratio:Number(ratio.toFixed(3)),examples:sentences.filter((sentence,i)=>pset.has(norms[i])).slice(0,6)});
    }
    const rid=String(t?.inquirer_article?.reporter?.id||''),copy=(t?.inquirer_article?.paragraphs||[]).join(' '),
      valueCopy=(t?.inquirer_article?.sections||[]).filter(s=>String(s?.kind||'')==='value').flatMap(s=>s?.paragraphs||[]).join(' ');
    trioMentions+=(copy.match(/\btrio\b/gi)||[]).length;
    for(const [phrase,owners] of repeatedTeamPhrases)if(copy.toLowerCase().includes(phrase.toLowerCase()))owners.push(t.team_name);
    if(/already on the roster when Week \d+ began/i.test(valueCopy))issues.push({id:'value-roster-status-filler',team:t.team_name});
    if(/could not turn the (?:came in|finished|closed the week) result/i.test(copy))issues.push({id:'malformed-result-idiom',team:t.team_name});
    if(rid==='tess-delaney'&&/\b(?:furniture|chair|chairs|tablecloth|linen|napkin|china|silverware|place setting|dining room|dinner|centerpiece|velvet rope|chaise|ballroom|salon|coat check)\b/i.test(copy))issues.push({id:'roycington-retired-metaphor',team:t.team_name});
    if(rid==='nora-voss'&&/\b(?:docket|cross-examination|defendant|prosecution|indictment|courtroom)\b/i.test(copy))issues.push({id:'filch-courtroom-scaffold',team:t.team_name});
  }
  // Evaluate repeated prose once across the complete newsroom, not once per
  // roster processed. Preserve substantive repeats as editorial failures.
  const longRecycled=[...extendedPhraseOwners].filter(([,owners])=>owners.size>=4);
  if(longRecycled.length)issues.push({id:'cross-team-nine-word-scaffold',count:longRecycled.length,
    examples:longRecycled.slice(0,3).map(([phrase,owners])=>({phrase,team_count:owners.size}))});
  for(const [phrase,owners] of repeatedTeamPhrases)if(owners.length>=3)
    issues.push({id:'repeated-team-editorial-template',phrase,teams:owners});
  if(Number(current?.week)>=3&&teams.length===32&&trioMentions>12)
    issues.push({id:'overused-scorer-trios',mentions:trioMentions,maximum:12});
  if(Number(current?.week)>=3&&teams.length===32){
    const fanCopies=teams.map(t=>({team:t.team_name,copy:(t?.inquirer_article?.sections||[]).filter(s=>s.kind==='sentiment').flatMap(s=>s.paragraphs||[]).join(' ')}));
    const benches=fanCopies.filter(x=>/\bsitting behind\b/i.test(x.copy)).map(x=>x.team);
    const screenshots=fanCopies.filter(x=>/\bscreenshots?\b/i.test(x.copy)).map(x=>x.team);
    const scenes=fanCopies.filter(x=>/\b(?:fans?|supporters?|crowd|fan club|fan base|faithful|stadium|radio|call-in|bars?|group chat|neighborhood)\b/i.test(x.copy));
    if(benches.length>8)issues.push({id:'fan-bench-subject-monoculture',teams:benches,maximum:8});
    if(screenshots.length>8)issues.push({id:'fan-screenshot-monoculture',teams:screenshots,maximum:8});
    if(scenes.length<30)issues.push({id:'missing-real-fan-reaction',count:scenes.length,minimum:30});
    for(const x of fanCopies)if(forwardWordCount(x.copy)<35)issues.push({id:'thin-fan-sentiment',team:x.team});
    for(const t of teams){const copy=(t?.inquirer_article?.paragraphs||[]).join(' ');
      if(/\bthat opener\b|\bin next week.s lineup\b/i.test(copy))issues.push({id:'stale-week-context',team:t.team_name});
      if(/\b1 carries\b|\b1 rush yds\b/i.test(copy))issues.push({id:'stat-grammar',team:t.team_name});
    }
  }
  if(Number(current?.week)>=3){
    const allReaderText=[...(current?.league_overview?.sections||[]).flatMap(s=>[s.heading,...(s.paragraphs||[])]),
      ...(current?.league_overview?.hot_takes||[]).flatMap(h=>[h.title,h.take]),
      ...teams.flatMap(t=>[t.inquirer_article?.headline,...(t.inquirer_article?.sections||[]).flatMap(s=>[s.heading,...(s.paragraphs||[])])])].filter(Boolean).join('\n');
    // Exclude correctly formed singular subjects with intervening plural clubs.
    const agreementReaderText=allReaderText
      .replace(/\bThe radio station covering [^.?!\n]{4,85}? has declared\b/gi,'The radio station has declared')
      .replace(/\bThe (?:AFC|NFC) (?:EAST|WEST|NORTH|SOUTH) race around [^.?!\n]{4,85}? is already compressed\b/gi,'The division race is already compressed')
      .replace(/\bThe road after [^.?!\n]{4,85}? is mixed\b/gi,'The road is mixed');
    for(const name of [...new Set(teams.map(t=>String(t.team_name||'').trim()).filter(n=>/s$/i.test(n.split(/\s+/).at(-1)||'')))]){
      if(new RegExp('\\b'+forwardEscRe(name)+' (?:does|gets|has|is|needs|sits|keeps|projects|faces)\\b','i').test(agreementReaderText))
        issues.push({id:'plural-team-agreement',team:name});
    }
    if(/:\s*this Sunday\b|; The season record is\b/.test(allReaderText))
      issues.push({id:'reader-facing-case-and-punctuation'});
    if(/\bThe radio station covering [^.?!]{4,85}? have declared\b|\bThe (?:AFC|NFC) (?:EAST|WEST|NORTH|SOUTH) race around [^.?!]{4,85}? are already compressed\b/i.test(allReaderText))
      issues.push({id:'intervening-team-subject-agreement'});
    for(const player of [...new Set(teams.flatMap(t=>(t.starter_details||[]).map(p=>String(p.name||'').trim())).filter(Boolean))]){
      const matches=allReaderText.match(new RegExp('\\b'+forwardEscRe(player)+'\\b','gi'))||[];
      if(matches.some(m=>m!==player))issues.push({id:'player-name-capitalization',player});
    }
    for(const t of teams){
      const a=t?.inquirer_article||{},paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
      if(/\b(?:have|keep|are|do|make|project) [A-Z][a-z]+\b/.test(String(a.headline||'')))
        issues.push({id:'headline-verb-capitalization',team:t.team_name,headline:a.headline});
      if(/Week \d+ Look Less Accidental/i.test(String(a.headline||''))&&Number(t.points)>Number(t.opponent_points))
        issues.push({id:'unverified-prior-week-headline',team:t.team_name,headline:a.headline});
      for(const p of paragraphs){
        if(/\b(?:this round of games’s|(?:a 8|an 9)(?:\.\d+)?-point|(?:Texans|Bears|Billiards|Falcons) sits)\b/i.test(p))
          issues.push({id:'reader-facing-grammar',team:t.team_name,excerpt:String(p).slice(0,150)});
        for(const prefix of ['Spare me the excuses:','Back-page material:','The lineup still answers:'])
          if(String(p).split(prefix).length>2)issues.push({id:'stacked-stock-preface',team:t.team_name,prefix});
      }
      const all=paragraphs.join(' ');
      if((all.match(/louder of the two/gi)||[]).length>1)issues.push({id:'within-team-scorer-echo',team:t.team_name});
      for(const prefix of ['Spare me the excuses:','Back-page material:','The lineup still answers:'])
        if(all.split(prefix).length>2)issues.push({id:'repeated-stock-preface',team:t.team_name,prefix});
      if((a.sections||[]).some(s=>/^this Sunday,/.test(String(s.heading||''))))issues.push({id:'uncapitalized-section-heading',team:t.team_name});
    }
  }
  // Named-player substitutions must not disguise a copy-pasted fan joke.
  for(const riff of ['supporters are doing what supporters do best','the fan base has screenshots, memes and exactly one volume setting']){
    const owners=teams.filter(t=>String((t?.inquirer_article?.paragraphs||[]).join(' ')).toLowerCase().includes(riff)).map(t=>t.team_name);
    if(owners.length>=4)issues.push({id:'repeated-fan-joke',riff,teams:owners});
  }
  for(const [sentence,ids] of articleScaffold){
    // Independent football statistics often have identical *syntax* when all
    // the player names and numbers are deliberately normalized. That is not
    // the same as reusing an editorial joke or analysis sentence.
    const pureStatLine=/^\[#\]\s+(?:carries|catches|completions|solo|assisted|sacks?|receiving|rushing|passing|yards?)/.test(sentence)
      &&(sentence.match(/\[#\]/g)||[]).length>=3;
    if(ids.size>=4&&!pureStatLine)issues.push({id:'cross-team-copy-scaffold',teams:ids.size,sentence});
  }
  for(const [phrase,rows] of forwardCrossReporterPhraseOffenders(teams,entities))issues.push({id:'cross-reporter-phrase-scaffold',phrase,teams:rows.map(x=>x.team),reporters:[...new Set(rows.map(x=>x.reporter))]});
  for(const [phrase,owners] of forwardCrossTeamClauseOffenders(teams,entities))issues.push({id:'cross-team-clause-scaffold',phrase,teams:owners});
  for(const [phrase,owners] of forwardPairedNarrativeOffenders(teams,entities))issues.push({id:'paired-editorial-clause-scaffold',phrase,teams:owners});

  if(previous){
    const pset=new Set(forwardRecapSentences(previous).map(s=>forwardNormSentence(s,entities))),curr=forwardRecapSentences(current).map(s=>forwardNormSentence(s,entities)),overlap=curr.filter(n=>pset.has(n));
    if(overlap.length>=4)issues.push({id:'recap-copy-forward',overlap:overlap.length,examples:overlap.slice(0,8)});
  }
  const mattered=(current?.league_overview?.sections||[]).find(s=>String(s?.heading||'')==='What Actually Mattered This Week');
  const matteredCopy=(mattered?.paragraphs||[]).join(' ');
  if(Number(current?.week)>=3){
    const recapCopy=[...(current?.league_overview?.sections||[]).flatMap(s=>s.paragraphs||[]),...(current?.league_overview?.hot_takes||[]).map(t=>t.take||'')].join(' ');
    if(/\b(?:2-0 club|2-0 group|at 0-2|the 0-2 records)\b/i.test(recapCopy))
      issues.push({id:'recap-week2-record-language',detail:'Old Week 2 record groups appear in a later week.'});
    if(/\b(?:A 84\.6-point|1 carries|1 rush yds)\b/i.test(recapCopy))
      issues.push({id:'recap-uncorrected-stat-grammar'});
    const takes=(current?.league_overview?.hot_takes||[]).map(x=>String(x.take||''));
    if(takes.some(s=>/borrow an undefeated claim from Week 2/i.test(s)))issues.push({id:'recap-recycled-week2-hot-take'});
    for(let i=0;i<takes.length;i++)for(let j=i+1;j<takes.length;j++){
      const a=new Set(forwardSentenceParts(takes[i]).map(s=>forwardNormSentence(s,entities)));
      if(forwardSentenceParts(takes[j]).some(s=>forwardWordCount(s)>=10&&a.has(forwardNormSentence(s,entities))))
        issues.push({id:'recap-duplicate-hot-take-argument',items:[i,j]});
    }
    const recapSentences=forwardSentenceParts(recapCopy).filter(s=>forwardWordCount(s)>=10);
    const counts=new Map();for(const sentence of recapSentences){const key=forwardNormSentence(sentence,entities);counts.set(key,(counts.get(key)||0)+1)}
    for(const [sentence,count] of counts)if(count>=2)issues.push({id:'recap-duplicate-commentary',sentence,count});
    if(/\btop of the table now starts with\b/i.test(recapCopy)&&/\bThe league leaders are\b/i.test(recapCopy))
      issues.push({id:'recap-duplicated-leaders',detail:'The recap announces the same top-of-standings cluster in two sections.'});
  }
  if(/\b(?:worth reopening|real departure from the established level|changes what the next box score is allowed to tell us|role deserves fresh attention|large enough to matter|matter beyond one|that is (?:star|veteran|breakout|emerging|rookie|reliable) production|useful veteran work)\b/i.test(matteredCopy))issues.push({id:'recap-meta-explainer'});
  const blocks=(mattered?.blocks||[]).slice(0,5),blockSentences=blocks.flatMap(b=>forwardSentenceParts((b.paragraphs||[]).join(' ')).filter(s=>forwardWordCount(s)>=8));
  const statListBlocks=blocks.filter(b=>(b.paragraphs||[]).some(p=>(String(p).match(/\bfantasy points\b/gi)||[]).length>=3));
  if(Number(current?.week)>=3&&statListBlocks.length>=3)
    issues.push({id:'recap-mandatory-scorer-trios',blocks:statListBlocks.map(b=>b.heading)});
  const intro=/\b(?:The box score settles this|Sunday left a clue|Carry this into Monday|Look at the personnel|Forget the excuses|The numbers resist spin):/gi;
  for(const b of blocks)for(const p of b.paragraphs||[]){
    const matches=String(p).match(intro)||[];
    if(matches.length>=2)issues.push({id:'recap-stacked-prefaces',block:b.heading,count:matches.length});
  }
  const seen=new Set();for(const s of blockSentences){const n=forwardNormSentence(s,entities);if(seen.has(n))issues.push({id:'recap-repeated-developed-sentence',sentence:n});seen.add(n)}
  return{ok:issues.length===0,issues,metrics:{team_articles:teams.length,cross_team_scaffolds:[...articleScaffold.values()].filter(ids=>ids.size>=4).length}};
}
