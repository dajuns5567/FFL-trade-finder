// Forward-week editorial collision repair. Operates only on a newly generated candidate,
// never on accepted/locked historical editions. Replaces generic shared sentences with
// precise current matchup evidence; the existing independent quality gate still decides.
const split=s=>String(s||'').replace(/\b(?:[A-Z]\.){2,}/g,x=>x.replaceAll('.','§')).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,x=>x.replace('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const entitiesOf=e=>(e?.teams||[]).flatMap(t=>[t.team_name,t.manager_name,t.opponent_name,t.next_opponent_name,...(t.starter_details||[]).map(p=>p.name)]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
const normalize=(s,entities)=>{let x=String(s||'');for(const e of entities)x=x.replace(new RegExp([...e].map(ch=>'.*+?^$(){}|[]\\'.includes(ch)?'\\'+ch:ch).join(''),'gi'),'[ENTITY]');return x.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,'[#]').replace(/\s+/g,' ').trim()};
const openings=[
 'The scoreboard is less diplomatic than the preseason expectations',
 'A week this close deserves to be read in actual numbers',
 'Ignore the group-chat verdict until the points have spoken',
 'The final margin settles one argument and invites another',
 'One box score cannot explain a season, but this one counts',
 'There is no committee vote on the fantasy points',
 'The outcome was decided by lineups, not the loudest prediction',
 'Strip away the jokes and the result has a measurable edge',
 'Sunday left a number the opposition cannot negotiate away',
 'The record changes only when the points justify the change',
 'The season ledger has a fresh entry after this matchup',
 'That score should be the first exhibit in the next conversation',
 'For once the simplest explanation is also the least flattering',
 'It is difficult to argue with the arithmetic on this result',
 'The win column has more patience than the group chat',
 'The loss does not need a metaphor to register',
 'The most useful takeaway starts with the scoring gap',
 'Before discussing momentum, read the numbers on the board',
 'The next opponent will study this score more closely than the jokes',
 'The official result is less flexible than the spin after it',
 'No imaginary trade reverses the points already posted',
 "The week's receipts fit on one very specific scoreboard",
 'The final scoring tells a cleaner story than the predictions did',
 'Start with the settled outcome and work backward from there',
 'This was a measurable swing, not a dramatic press release',
 'The numbers describe precisely how much room was left',
 'There is no appeal process for the final matchup total',
 'Every division argument now has one more actual result',
 "The result creates a simple problem for next week's opponent",
 'This edition of the standings was earned on the field',
 'The matchup settled its own argument before anyone could edit it',
 'Whatever happens next, these points already belong to the record'
];
const valid=n=>Number.isFinite(Number(n));
function groundedSentence(t,week,iteration,position){
 const id=Math.max(1,Number(t.roster_id)||1),idx=(id*7+iteration*11+position*13)%openings.length;
 const team=String(t.team_name||'This team'),opp=String(t.opponent_name||'its opponent');
 const p=Number(t.points),op=Number(t.opponent_points);
 if(!valid(t.points)||!valid(t.opponent_points))return null;
 const verb=p>op?'outscored':p<op?'finished behind':'finished level with';
 const margin=Math.abs(p-op).toFixed(2),score=p.toFixed(2),against=op.toFixed(2);
 return openings[idx]+': '+team+' '+verb+' '+opp+' '+score+' to '+against+' fantasy points, a '+margin+'-point margin in Week '+week+'.';
}
export function repairNewEditionCopy(edited,previous,week,evaluate,maxPasses=8){
 const entities=[...entitiesOf({teams:edited.inquirer.teams}),...entitiesOf(previous)];
 let passes=0,replacements=0;
 for(;passes<maxPasses;passes++){
  const verdict=evaluate({teams:edited.inquirer.teams,league_overview:edited.leagueOverview},previous);
  if(verdict.ok)return{edited,verdict,replacements,passes};
  const offenders=verdict.issues.filter(i=>i.id==='cross-team-copy-scaffold'||i.id==='cross-reporter-phrase-scaffold');
  if(!offenders.length)return{edited,verdict,replacements,passes};
  let changed=0;
  edited.inquirer.teams=edited.inquirer.teams.map(t=>{
   const a=t.inquirer_article;if(!a)return t;
   let slot=0;
   const sections=(a.sections||[]).map(section=>({...section,paragraphs:(section.paragraphs||[]).map(p=>{
    const sentences=split(p).map(s=>{
     const key=normalize(s,entities);
     if(!offenders.some(x=>x.id==='cross-team-copy-scaffold'?x.sentence===key:(x.teams||[]).includes(t.team_name)&&key.replace(/[^a-z0-9#\[\]’'-]+/g,' ').replace(/\s+/g,' ').includes(x.phrase)))return s;
     const replacement=groundedSentence(t,week,passes,slot++);
     if(!replacement)return s;
     changed++;replacements++;return replacement;
    });return sentences.join(' ');
   })}));
   return{...t,inquirer_article:{...a,sections,paragraphs:sections.flatMap(s=>s.paragraphs||[])}};
  });
  if(!changed)break;
 }
 return{edited,verdict:evaluate({teams:edited.inquirer.teams,league_overview:edited.leagueOverview},previous),replacements,passes};
}
