// Week 4+ editorial clarity pass. Earlier editions are immutable.
// Runs after the forward rebuild, which can reintroduce draft scaffolding.
const norm=x=>String(x||'').replace(/\s+/g,' ').trim();
const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x));
const score=x=>Number(x).toFixed(1);
const meta=/\b(?:the useful question|the useful part|the practical read|the next answer|the next headline|the next result gets|the next opponent gets a vote|the next opponent still gets a vote|the next week gets to test|it does not simply photocopy|the standings are not a theory|the schedule beyond week|the schedule is not complete enough|the first two|the next sunday is a new roster test|there is enough resistance here|good production, just not the score|the contribution was real|the rest of the line is supporting documentation|the next matchup will show whether management fixed|the next test is whether the lineup can keep|the next test is whether the lineup can|the result stands, but opponents will care|the standings keep the win; rivals keep|the number arrives prewritten; the standings|the current evidence; a fabricated zero|verified fantasy score cannot substitute|only scoring data can be confirmed|a missing transaction-window valuation prevents|the market desk cannot quantify movement|the weekly standings and roster market operate on different records)\b/i;
const vague=/^(?:(?:The|A) (?:star|veteran|struggling|emerging|rookie|headliner|struggling veteran|struggling star) (?:back|receiver|quarterback|wideout)|The (?:contribution|points|lineup|remaining starters|rest of the line) (?:was|were|is)|(?:Useful work|Useful violence|From here, They|The next Sunday|There is enough resistance|It changed the actual burden|The fan base has one complaint))/i;
const headingMeta=/^(?:The next edition is not written yet)$/i;
const grammatical=s=>norm(s).replace(/^(?:Ultimately|Practically|Curiously|Even so|From here|Still),\s*/i,'').replace(/^([A-Z][a-z]+),\s+The\b/g,'$1, the').replace(/\bThey meets\b/g,'They meet').replace(/\benters;\s*/gi,'enters the matchup. ').replace(/\bthe lineup\b/g,'the lineup').replace(/\b\d+\.\d+ Points\b/g,m=>m.replace(' Points',' points'));
const aliases=s=>norm(s).replace(/\bTetairoa\b(?! McMillan)/g,'Tetairoa McMillan').replace(/\bJonathan\b(?! Taylor)/g,'Jonathan Taylor').replace(/\bChase\b(?![^.]*\bJa\x27Marr Chase\b)/g,'Chase');
function candidateParagraph(p){
 const x=grammatical(p);
 if(/^\s*(?:On the same lineup,|For this week,)\s*/i.test(x))return x.replace(/^\s*(?:On the same lineup,|For this week,)\s*/i,'').replace(/^./,c=>c.toUpperCase());
 if(meta.test(x)||vague.test(x))return null;
 // Do not leave orphaned single-sentence scoreboard captions in a narrative.
 if(/^Against .+, .+\b(?:added|scored) \d+(?:\.\d+)?\b[^.!?]*\.$/i.test(x))return null;
 if(/\b(?:the star back|the star receiver|the emerging back|the struggling star|the veteran receiver|the struggling veteran receiver)\b/i.test(x))return null;
 return x;
}
function rewriteArticle(team,teamByName){
 const a=team?.inquirer_article;if(!a)return;
 for(const sec of a.sections||[]){
  if(!Array.isArray(sec.paragraphs))continue;
  sec.paragraphs=sec.paragraphs.map(candidateParagraph).filter(Boolean);
 }
 // Remove invented MVP framing: only the verified top starter may be called the leader.
 const topScorer=(team.starter_details||[]).filter(p=>p?.name&&valid(p?.points)).sort((x,y)=>Number(y.points)-Number(x.points))[0];
 const allNames=[...(team.starter_details||[]),...(a.facts?.opponent_roster?.players||[])].map(p=>p?.name).filter(Boolean);
 const bySurname=new Map();
 for(const full of allNames){const last=String(full).split(' ').at(-1);if(!bySurname.has(last))bySurname.set(last,new Set());bySurname.get(last).add(full);}
 for(const sec of a.sections||[]){
  if(!Array.isArray(sec.paragraphs))continue;
  sec.paragraphs=sec.paragraphs.map(p=>{
   let t=String(p);
   for(const [last,names] of bySurname){if(names.size!==1||last.length<4)continue;
    const full=[...names][0];
    if(!/^[A-Za-z'-]+$/.test(last))continue;
    const rx=new RegExp('(?<![A-Za-z])'+last+'(?![A-Za-z])','g');
    if(!t.includes(full))t=t.replace(rx,full);
   }
   if(topScorer?.name&& /(?:set the pace|brought the fireworks|the headliner reached|was the loudest .* reason)/i.test(t)){
    const mentioned=[...(team.starter_details||[])].filter(p=>p?.name&&t.includes(p.name));
    if(mentioned.some(p=>p.name!==topScorer.name&&Number(p.points)<Number(topScorer.points)))return null;
    const leadFirst=t.split(/\s+/)[0].replace(/[^A-Za-z'-]/g,'');
    const firstMatch=(team.starter_details||[]).filter(p=>p?.name?.split(' ')[0]===leadFirst);
    if(firstMatch.length===1&&firstMatch[0].name!==topScorer.name)return null;
   }
   return t;
  }).filter(Boolean);
 }
 // Discard unverified Week 4+ transaction prose, which may include failed claims.
 // Use verified lineup decisions instead of inventing completed acquisitions.
 const management=(a.sections||[]).find(sec=>sec.kind==='management');
 if(management&&Array.isArray(management.paragraphs)){
  const transactionClaim=/\b(?:added|dropped|claimed|acquired|waiver|transaction|roster work|roster headline|roster log|transaction wire|roster move|fresh additions|incoming players|new names)\b/i;
  const original=management.paragraphs;
  const keep=original.filter(p=>!transactionClaim.test(String(p||'')));
  if(keep.length<original.length){
   const miss=team.best_lineup_miss||a.facts?.best_lineup_miss;
   const reserve=miss?.reserve||miss?.bench,starter=miss?.starter;
   const teamName=String(team.team_name||'The team');
   let add;
   if(reserve?.name&&starter?.name&&valid(miss?.gap)&&Number(miss.gap)>0){
    const gap=score(miss.gap),manager=String(team.manager_name||'the manager');
    const jokes=[
     reserve.name+' beat '+starter.name+' by '+gap+' from the bench. '+manager+' apparently tried a new strategy: letting the better score watch the game.',
     'A '+gap+'-point upgrade sat on the '+teamName+' bench: '+reserve.name+' over '+starter.name+'. Somebody should tell '+manager+' the lineup locks before the apology tour.',
     manager+' started '+starter.name+' while '+reserve.name+' sat with '+gap+' more points available. The bench had the better score; the decision-making might need a trainer.',
     'For '+teamName+', '+reserve.name+' topped '+starter.name+' by '+gap+' in a compatible spot. That is a very expensive way to demonstrate faith in the wrong starter.',
     starter.name+' got the start and '+reserve.name+' earned '+gap+' extra points on the bench. '+manager+' made sure the best lineup remained a fascinating hypothetical.',
     'The '+teamName+' lineup left '+gap+' points between '+reserve.name+' and '+starter.name+' on the table. The manager did not need a crystal ball; a lineup screen would have helped.',
     reserve.name+' had '+gap+' points more than '+starter.name+' in an eligible bench swap. '+teamName+' has discovered a new place to hide fantasy production: the bench.',
     'Here is the '+teamName+' coaching review: '+reserve.name+' over '+starter.name+' was worth '+gap+' more points. The Monday explanation promises to be longer than the math.'
    ];
    const captions=["The lineup receipt is painfully specific","A Sunday spreadsheet has a cruel footnote","The scoreboard left one unopened envelope","There is a coaching decision worth framing","The postgame excuse budget is already spent","This week came with a free bench audit","The points were available without a coupon","One manager forgot which column mattered","It takes confidence to ignore that evidence","A roster can hide points in plain sight","The backup's box score filed a complaint","Here is the lineup's least flattering arithmetic","The film room needs no dramatic soundtrack","The starting card volunteered a punchline","A bench seat won the argument anyway","Management discovered an avoidable subplot","Nothing reveals the lineup better than arithmetic","The reserve scorer has grounds for appeal","This was a lineup lesson with decimal places","The winning option remained under glass","A replacement score sat in the waiting room","The coaching review requires no witness","The managers' group chat received evidence","The lineup card neglected one small detail","Somebody should check the bench receipt","A misfire arrived with exact measurements","The bench delivered the sharpest criticism","That missed swap deserves its own exhibit","There was an easier route to the points","One starter got a generous benefit of doubt","The bench came equipped with evidence","It is a bad week for the lineup attorney"];
    const rosterIndex=(Math.max(1,Number(team.roster_id)||1)-1)%captions.length;
    const text=jokes[rosterIndex%jokes.length].replace(/\. (?=[A-Z])/g,'; ');
    add=captions[rosterIndex]+': '+text;
   }else{
    const weak=team.worst_starter||a.facts?.worst_starter;
    add=weak?.name&&valid(weak.points)
      ?weak.name+' scored '+score(weak.points)+' in Week '+a.week+'. The manager can inspect that starting spot before the next kickoff; motivational speeches do not count in fantasy scoring.'
      :teamName+' must judge the next lineup on confirmed performances, not speculative roster activity.';
   }
   // Avoid retelling the exact same bench mistake three times in one section.
   const benchNames=[reserve?.name,starter?.name].filter(Boolean);
   const distinct=benchNames.length===2?keep.filter(par=>!benchNames.every(n=>String(par).includes(n))):keep;
   management.paragraphs=[...distinct,add];
  }
 }
 const next=String(team.next_opponent_name||a.facts?.next_opponent_roster?.team_name||'').trim();
 const own=String(team.team_name||'This team').trim(),op=a.facts?.next_opponent_roster;
 const nextTeam=teamByName.get(next);const nextPlayers=(nextTeam?.starter_details?.length?nextTeam.starter_details:op?.starters||[]).filter(p=>p?.name&&valid(p?.points)).sort((x,y)=>Number(y.points)-Number(x.points));
 const top=(team.starter_details||[]).filter(p=>p?.name&&valid(p?.points)).sort((x,y)=>Number(y.points)-Number(x.points));
 const section=(a.sections||[]).find(s=>s.kind==='outlook');
 if(section&&next){
  const reporter=a.reporter?.id,main=top[0],opponent=nextPlayers[0];
  const rid=Math.max(1,Number(team.roster_id)||1),wi=Number(a.week)+1;
  const first=main?main.name:'the leading starter',second=opponent?opponent.name:null;
  const firstPoints=main?score(main.points):null,secondPoints=opponent?score(opponent.points):null;
  if(!main||!opponent){
   const detail=main?`${main.name} scored ${score(main.points)} for ${own} in Week ${a.week}.`:`${own} has no verified player-level comparison for Week ${a.week}.`;
   section.paragraphs=[`${own} faces ${next} in Week ${wi}. ${detail} The manager will need production across the lineup, not just one familiar name on the highlight reel.`];
  }else{
  const forms=[
    `${own} meets ${next} in Week ${wi}; ${first} had ${firstPoints} last week, against ${second}'s ${secondPoints}.`,
    `Across the Week ${wi} matchup with ${next}, ${own} brings ${first}'s ${firstPoints} and must account for ${second}'s ${secondPoints}.`,
    `The ${next} fixture in Week ${wi} follows ${first}'s ${firstPoints} for ${own} and ${second}'s ${secondPoints} for the opposition.`,
    `${next} is next for ${own}; Week ${wi} tests whether ${first} (${firstPoints} last game) gets support while ${second} (${secondPoints}) waits.`,
    `As ${own} prepares for ${next}, the Week ${wi} lineup follows ${first}'s ${firstPoints} and ${second}'s ${secondPoints} in their most recent games.`,
    `${own}'s Week ${wi} date with ${next} carries two recent numbers: ${first} on ${firstPoints}, ${second} on ${secondPoints}.`,
    `Before Week ${wi} against ${next}, ${own} has ${first}'s ${firstPoints}-point return to build around and ${second}'s ${secondPoints} to consider.`,
    `The ${own}-${next} meeting arrives in Week ${wi} after ${first} scored ${firstPoints} and ${second} recorded ${secondPoints} in Week ${a.week}.`
  ];
  const desk={
    'walter-mercer':[
      'Counting on one man to repeat a Sunday is a wonderful way to lose Tuesday lineup meeting.',
      'Somebody has to do the less glamorous work, and the standings will not accept excuses.',
      'The opponent will not offer a discount for last week\'s highlight reel.',
      'I would prefer a second reliable starter to a second victory speech.'
    ],
    'tess-delaney':[
      'The arrangement needs more substance than a handsome box score and a manager\'s confidence.',
      'Apparently the opposing manager also intends to submit a lineup; how tasteless.',
      'The invitation to win again does not include complimentary points from the bench.',
      'Elegant roster theory has a habit of becoming rather shabby against actual opponents.'
    ],
    'mack-hollis':[
      'That weak spot deserves a lineup change, not a press conference.',
      'It is time for the rest of the roster to stop treating scoring as somebody else\'s assignment.',
      'The opponent has watched the film; the managers should try it too.',
      'Big talk is free. The starting card is where the bill comes due.'
    ],
    'nora-voss':[
      'Rivals have already circled the quiet position on the lineup card.',
      'The opposition knows exactly which soft spot is worth targeting.',
      'Another quiet starter will hand the rival bench a full afternoon of material.',
      'The manager can fix the obvious weakness or sponsor the next round of jokes.'
    ]
  };
  const quips=desk[reporter]||desk['walter-mercer'];
  const openings=[
  'The manager has another homework assignment: ',
  'Nobody can start last week again: ',
  'This calendar offers no victory parade: ',
  'A new opponent has arrived hungry: ',
  'The lineup meeting cannot be postponed: ',
  'The next scoreboard has no sympathy: ',
  'That winning feeling has an expiration: ',
  'A rough Sunday leaves specific homework: ',
  'The season does not award extensions: ',
  'The opponent brings its own calculator: ',
  'There is no rollover for points: ',
  'The next kickoff resets every excuse: ',
  'Somebody should review the starting card: ',
  'The rematch with reality comes quickly: ',
  'The latest score was not immunity: ',
  'This roster still owes a performance: ',
  'It is time to check the bench: ',
  'The next opponent did not volunteer: ',
  'Sunday points cannot be carried forward: ',
  'The manager has a fresh decision: ',
  'Another week means another uncomfortable question: ',
  'The latest standings are not protection: ',
  'The schedule has no mercy clause: ',
  'Yesterday’s box score cannot play again: ',
  'The film room has some work: ',
  'The rival team will be watching: ',
  'The next result is not preordered: ',
  'The familiar weak spots remain on notice: ',
  'A previous win buys no insurance: ',
  'A previous loss buys no sympathy: ',
  'The league does not issue refunds: ',
  'The next lineup lock comes regardless: '
];
  const group=Math.floor((rid-1)/forms.length)%4;
  const lead=openings[(rid+Number(a.week)*7)%openings.length];
  const matchup=forms[(rid-1)%forms.length];
  const critique=quips[group].replace('lose Tuesday lineup meeting','lose a Tuesday lineup meeting');
  // Keep completed evidence and the reporter's observation as distinct sentences.
  // The prior colon/semicolon join generated fragments such as '; but counting ...'.
  section.paragraphs=[matchup,lead+critique];
  }
 }
 // Only discard empty headings after generated outlooks have been reconstructed.
 a.sections=(a.sections||[]).filter(sec=>!Array.isArray(sec.paragraphs)||sec.paragraphs.length>0);
 a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
}
function rewriteRecap(o,teams=[]){
 if(!o)return;
 for(const sec of o.sections||[]){
  for(const block of sec.blocks||[]){
   if(headingMeta.test(block.heading||''))block.heading='The Week Ahead';
   if(!Array.isArray(block.paragraphs))continue;
   block.paragraphs=block.paragraphs.map(candidateParagraph).filter(Boolean).filter(p=>{
    // A matchup won by the named high-scoring club cannot simultaneously be
    // described as that club being outscored.
    const m=p.match(/The (.+?)–(.+?) shootout was a reminder that scoring well is not sufficient when the opposing lineup scores even better\./);
    if(!m)return true;
    const a=teams.find(t=>t.team_name===m[1]&&t.opponent_name===m[2]);
    return !a||Number(a.points)<Number(a.opponent_points);
   });
  }
 }
}
// Remove duplicated, non-factual stock commentary across team stories without
// touching scores, identities, rankings or other evidence. Also prevent a
// repeated two-word proper-name lead inside an individual article.
const duplicateFiller=[
  'They have lost twice, so rivals no longer need to manufacture the material.',
  'That performance gave the opponent an actual problem, not a trivia problem; keep the part that worked and stop volunteering the part that needs work.',
  'The team has supplied enough of its own and now owes supporters a rebuttal.'
];
function finalClarityQuality(edition){
 const seen=new Set();
 for(const team of edition.teams||[]){
  const a=team.inquirer_article;if(!a)continue;
  // Resolve an athlete only if the roster identifies exactly one such first name.
  // Otherwise retain full names already in the text rather than guessing.
  const names=[...(team.starter_details||[]),...(team.bench_details||[]),...(a.facts?.opponent_roster?.players||[])].map(p=>String(p?.name||'').trim()).filter(n=>n.includes(' '));
  const firstNames=new Map();
  for(const full of new Set(names)){
    const first=full.split(' ')[0];
    if(!/^[A-Za-z'-]{3,}$/.test(first))continue;
    if(!firstNames.has(first))firstNames.set(first,new Set());
    firstNames.get(first).add(full);
  }
  const anonymous=/^(?:The (?:high-end|star|veteran|struggling|emerging|rookie|headline|lead|quiet|productive|talented) (?:back|receiver|quarterback|wideout|starter|player)|That (?:was useful production|is enough decline|is the football problem))/i;
  function restoreNames(value){
    const lines=String(value||'').split(/(?<=[.!?])\s+/).filter(line=>!anonymous.test(line.trim()));
    return lines.map(line=>{
      for(const [first,matches] of firstNames){
        if(matches.size!==1)continue;
        const full=[...matches][0];
        const last=full.slice(first.length).trim().split(' ')[0];
        const pattern=new RegExp('\\b'+first+'\\b(?!\\s+'+last+')','g');
        line=line.replace(pattern,full);
      }
      return line;
    }).join(' ').trim();
  }
  let previousLead=''; const seenLeads=new Set();
  for(const sec of a.sections||[]){
   for(const group of [sec,...(sec.blocks||[])]){
    if(!Array.isArray(group.paragraphs))continue;
    group.paragraphs=group.paragraphs.map(p=>{
     let text=restoreNames(p);
     for(const boilerplate of duplicateFiller){
      if(text.includes(boilerplate)){
       if(seen.has(boilerplate))text=text.replace(boilerplate,'').replace(/\s{2,}/g,' ').trim();
       else seen.add(boilerplate);
      }
     }
     const sentences=text.split(/(?<=[.!?])\s+/).filter(Boolean);
     for(let i=0;i<sentences.length;i++){
      const match=sentences[i].match(/^([A-Z][A-Za-z'-]+\s+[A-Z][A-Za-z'-]+)/);
      const lead=match?.[1]||'';
      // Repeated proper names remain grammatical; never prefix an artificial sentence fragment.
      // Duplicate thematic ideas are handled by paragraph selection, not by corrupting prose.
      if(lead)seenLeads.add(lead);
      previousLead=lead;
     }
     return sentences.join(' ').trim();
    }).filter(Boolean);
   }
  }
  a.paragraphs=(a.sections||[]).flatMap(sec=>[...(sec.paragraphs||[]),...(sec.blocks||[]).flatMap(b=>b.paragraphs||[])]);
 }
}
export function applyInquirerEditorialClarity(edition,{week}={}){
 if(!edition||Number(week)<4)return edition;
 const teamByName=new Map((edition.teams||[]).map(team=>[String(team.team_name||''),team]));
 for(const team of edition.teams||[])rewriteArticle(team,teamByName);
 rewriteRecap(edition.league_overview,edition.teams||[]);
 finalClarityQuality(edition);
 return edition;
}
