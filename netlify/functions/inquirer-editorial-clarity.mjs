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
  const index=((Number(team.roster_id)||0)*7+Number(a.week||0))%12;
  const start=`${own} faces ${next} in Week ${Number(a.week)+1}.`;
  const numbers=main&&opponent
    ?`${main.name} supplied ${score(main.points)} for ${own} last week; ${opponent.name} scored ${score(opponent.points)} for ${next}.`
    :`${next} is the confirmed opponent; a complete comparable starting lineup is not in the available evidence.`;
  const personal=main?.name||'the leading starter';
  const observations=[
    `${own} needs more than another solo performance from ${personal}; a manager cannot start a postgame explanation at FLEX.`,
    `${next} will have seen the same weak slots. That scouting report, regrettably, is free.`,
    `${own} can celebrate last week's scoreboard, but the lineup card has no memory and even less sympathy.`,
    `${personal} did a share of the work; the rest of ${own} has a Week ${Number(a.week)+1} appointment with accountability.`,
    `${next} is under no obligation to repeat the generosity of a previous opponent. Inconvenient scheduling policy.`,
    `${own} has a perfectly good excuse to be confident and absolutely none to forget its weakest starter.`,
    `${next} does not care whether ${own} found last Sunday emotionally reassuring. Points will be requested again.`,
    `${own} should inspect the lineup before kickoff. Postgame hindsight is a very expensive subscription.`,
    `${personal} cannot play every position for ${own}; even the most optimistic manager should have discovered that by now.`,
    `${next} is the next measurement of ${own}'s depth, not a ceremonial stop on the schedule.`,
    `${own} has one week to fix its quiet starter spots before ${next} gets an opinion that counts in the standings.`,
    `${own} should keep what worked around ${personal}; anyone promising the same score on demand is selling souvenirs.`
  ];
  let concern=observations[index];
  if(reporter==='walter-mercer')concern=concern.replace(/ceremonial stop/,'victory parade');
  if(reporter==='tess-delaney')concern=concern.replace(/expensive subscription/,'rather expensive fashion accessory');
  if(reporter==='mack-hollis')concern=concern.replace(/selling souvenirs/,'running a souvenir stand');
  if(reporter==='nora-voss')concern=concern.replace(/scouting report/,'rival dossier');
  section.paragraphs=[start,numbers,concern];
 }
 // A section must never open with an anonymous positional label. Restoring
 // named score context is safer than inferring which athlete an adjective means.
 const players=(a.sections||[]).find(s=>s.kind==='players');
 if(players){
  const present=(players.paragraphs||[]).join(' ');
  for(const p of top.slice(0,2)){
   if(!present.includes(p.name))players.paragraphs.unshift(`${p.name} provided ${score(p.points)} points for ${own}; ${Number(p.points)>=15?'a contribution the rest of the lineup was obliged to respect':'that return still leaves the manager hunting for stronger production elsewhere'}.`);
  }
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
export function applyInquirerEditorialClarity(edition,{week}={}){
 if(!edition||Number(week)<4)return edition;
 for(const team of edition.teams||[])rewriteArticle(team);
 rewriteRecap(edition.league_overview);
 return edition;
}
