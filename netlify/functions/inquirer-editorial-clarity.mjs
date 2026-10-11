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
  const reporter=a.reporter?.id;
  const main=top[0],opponent=nextPlayers[0];
  const start=`Week ${Number(a.week)+1} sends ${own} against ${next}.`;
  const matchup=main&&opponent
    ?`Last week, ${main.name} scored ${score(main.points)} for ${own}, while ${opponent.name} put up ${score(opponent.points)} for ${next}. That is the actual scoring form both managers bring into the lineup conversation—not a promise either player repeats it.`
    :`The upcoming opponent is confirmed; a reliable starter-to-starter scoring comparison is not available.`;
  const concern=reporter==='walter-mercer'
    ?`The old lesson applies: ${own} will need the players behind its leading scorer to show up. Sunday does not offer refunds for excellent intentions.`
    :reporter==='tess-delaney'
    ?`A glamorous box score buys one week of applause, not immunity. ${next} is perfectly entitled to spoil the reception.`
    :reporter==='mack-hollis'
    ?`Circle the weak lineup spot before kickoff. Waiting until the postgame interview to discover it is a bold management strategy.`
    :`The rivals can read last week's scores, too. Making the same obvious lineup mistake twice would be generous scouting assistance.`;
  section.paragraphs=[start,matchup,concern];
 }
 // A section must never open with an anonymous positional label. Restoring
 // named score context is safer than inferring which athlete an adjective means.
 const players=(a.sections||[]).find(s=>s.kind==='players');
 if(players){
  const present=(players.paragraphs||[]).join(' ');
  for(const p of top.slice(0,2)){
   if(!present.includes(p.name))players.paragraphs.unshift(`${p.name} scored ${score(p.points)} fantasy points for ${own} in Week ${a.week}.`);
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
