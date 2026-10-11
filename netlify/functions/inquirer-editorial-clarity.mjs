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
 if(meta.test(x)||vague.test(x))return null;
 if(/\b(?:the star back|the star receiver|the emerging back|the struggling star|the veteran receiver|the struggling veteran receiver)\b/i.test(x))return null;
 return x;
}
function rewriteArticle(team){
 const a=team?.inquirer_article;if(!a)return;
 for(const sec of a.sections||[]){
  if(!Array.isArray(sec.paragraphs))continue;
  sec.paragraphs=sec.paragraphs.map(candidateParagraph).filter(Boolean);
 }
 const next=String(team.next_opponent_name||a.facts?.next_opponent_roster?.team_name||'').trim();
 const own=String(team.team_name||'This team').trim(),op=a.facts?.next_opponent_roster;
 const nextPlayers=(op?.starters||[]).filter(p=>p?.name&&valid(p?.points)).sort((x,y)=>Number(y.points)-Number(x.points));
 const top=(team.starter_details||[]).filter(p=>p?.name&&valid(p?.points)).sort((x,y)=>Number(y.points)-Number(x.points));
 const section=(a.sections||[]).find(s=>s.kind==='outlook');
 if(section&&next){
  const reporter=a.reporter?.id,main=top[0],opponent=nextPlayers[0];
  const rid=Math.max(1,Number(team.roster_id)||1),wi=Number(a.week)+1;
  const first=main?main.name:'a verified starter',second=opponent?opponent.name:'the next opponent\'s starters';
  const firstPoints=main?score(main.points):'unavailable',secondPoints=opponent?score(opponent.points):'unavailable';
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
  const prefix=lead+forms[(rid-1)%forms.length].replace(/\.$/,';');
  const tail=quips[group].replace(/\.\s+(?=[A-Z])/g,'; ').replace(/^./,c=>c.toLowerCase());
  section.paragraphs=[prefix+' but '+tail];
 }
 a.paragraphs=(a.sections||[]).flatMap(s=>s.paragraphs||[]);
}
function rewriteRecap(o){
 if(!o)return;
 for(const sec of o.sections||[]){
  for(const block of sec.blocks||[]){
   if(headingMeta.test(block.heading||''))block.heading='The Week Ahead';
   if(!Array.isArray(block.paragraphs))continue;
   block.paragraphs=block.paragraphs.map(candidateParagraph).filter(Boolean);
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
  // Resolve first-name mentions from this roster's actual data; never guess
  // when multiple athletes share a first name.
  const names=[...(team.starter_details||[]),...(team.bench_details||[]),...(a.facts?.opponent_roster?.players||[])].map(x=>String(x?.name||'').trim()).filter(x=>x.includes(' '));
  const firstNames=new Map();
  for(const full of new Set(names)){
    const first=full.split(' ')[0].replace(/[^A-Za-z'-]/g,'');
    if(!firstNames.has(first))firstNames.set(first,new Set());
    firstNames.get(first).add(full);
  }
  const ambiguous=/^(?:The (?:high-end|star|veteran|struggling|emerging|rookie|headline|lead|quiet|productive|talented) (?:back|receiver|quarterback|wideout|starter|player)|That (?:was useful production|is enough decline|is the football problem)|The (?:star|struggling) (?:back|receiver))/i;
  function restoreNames(p){
    let lines=String(p||'').split(/(?<=[.!?])\\s+/);
    lines=lines.filter(line=>!ambiguous.test(line.trim()));
    return lines.map(line=>{
      for(const [first,possible] of firstNames){
        if(first.length<3||possible.size!==1)continue;
        const full=[...possible][0];
        const regex=new RegExp('\\\\b'+first.replace(/[.*+?^${}()|[\\]\\]/g,'\\\\  let previousLead='';')+'\\\\b(?!\\\\s+'+full.slice(first.length).trim().replace(/[.*+?^${}()|[\\]\\]/g,'\\\\  let previousLead='';')+')','g');
        line=line.replace(regex,full);
      }
      return line;
    }).join(' ').trim();
  }
  let previousLead='';
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
      if(lead&&lead===previousLead)sentences[i]='For this week, '+sentences[i].replace(/^./,c=>c.toLowerCase());
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
 for(const team of edition.teams||[])rewriteArticle(team);
 rewriteRecap(edition.league_overview);
 finalClarityQuality(edition);
 return edition;
}
