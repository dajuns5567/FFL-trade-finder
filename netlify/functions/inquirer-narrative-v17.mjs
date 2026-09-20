'use strict';

const one=v=>Number(v||0).toFixed(1);

function headlineVariant(t){
  const n=Number(t?.roster_id);
  if(Number.isFinite(n)&&n>0)return Math.floor((n-1)/4)%8;
  let h=2166136261;
  for(const ch of String(t?.roster_id||t?.team_name||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return (h>>>0)%8;
}

function nextRound(week,conference=''){
  const w=Number(week),conf=/^(AFC|NFC)$/i.test(String(conference||''))?String(conference).toUpperCase():'';
  if(w<14)return null;
  if(w===14)return conf?conf+' Wildcard Round':'NFC/AFC Wildcard Round';
  if(w===15)return conf?conf+' Divisional Round':'NFC/AFC Divisional Round';
  if(w===16)return conf?conf+' Championship':'NFC/AFC Championship';
  if(w===17)return'Super Bowl';
  return null;
}

function playerProse(p){
  if(!p)return'No single player fact is sturdy enough to build a sentence around.';
  const fp=Number.isFinite(Number(p.points))?one(p.points)+' fantasy points':'an unavailable fantasy total';
  const real=String(p.real_stat_line||'').trim();
  if(real)return `${p.name} supplied ${fp}, and the real NFL line underneath it was ${real.replaceAll(' • ',', ')}.`;
  return `${p.name} supplied ${fp}, but Sleeper did not return a usable real-life stat line, so this column will not invent one.`;
}

function trendProse(p){
  const f=p?.recent_form;
  if(!f||f.games<3||!['hot','cold'].includes(f.label))return'';
  if(f.label==='hot')return `${p.name} is carrying an actual multi-game signal too, averaging ${one(f.last3_avg)} fantasy points over the last three after ${one(f.prior3_avg)} across the prior three. That does not guarantee another eruption, but it is enough to call the form genuinely warm.`;
  return `${p.name} has also cooled over a real sample, averaging ${one(f.last3_avg)} fantasy points over the last three after ${one(f.prior3_avg)} across the prior three. That is long enough to call it a problem worth monitoring instead of a one-week annoyance.`;
}

function gameFacts(t){
  const rows=(t.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points));
  const ctx=t.league_context||{},opp=t.opponent_context||{},rec=ctx.record||{},st=ctx.streak||{};
  const rank=Number(ctx.standings_rank),size=Number(ctx.league_size)||32;
  const record=String(rec.wins||0)+'-'+String(rec.losses||0)+(Number(rec.ties)?'-'+String(rec.ties):'');
  const score=one(t.points)+'–'+one(t.opponent_points),margin=Math.abs(Number(t.points)-Number(t.opponent_points));
  const proj=Number(t.projected),projDelta=Number(t.points)-proj,bench=t.best_bench,worst=t.worst_starter;
  const benchGap=Number(bench?.points)-Number(worst?.points);
  return {
    rows,top:rows[0]||null,second:rows[1]||null,third:rows[2]||null,low:rows[rows.length-1]||null,
    ctx,opp,rec,st,rank,size,record,score,margin,
    proj:Number.isFinite(proj)?proj:null,projDelta:Number.isFinite(projDelta)?projDelta:null,
    bench,worst,benchGap:Number.isFinite(benchGap)?benchGap:null
  };
}

export function narrativeHeadline(t,w,r){
  const g=gameFacts(t),v=headlineVariant(t),star=g.top?.name||t.team_name,opp=t.opponent_name||'the opposition';
  const win={
    'walter-mercer':[
      `${t.team_name} Opens the Ledger With a Win Worth Keeping`,
      `${star} Sets the Tone as ${t.team_name} Gets Its Sunday Right`,
      `A Good Sunday, Which Is Exactly When ${t.team_name} Should Get Nervous`,
      `${t.team_name} Finds the Boring Kind of Competence That Travels`,
      `No Apology Needed: ${t.team_name} Earns the Ink`,
      `${t.team_name} Leaves ${opp} With the Bill`,
      `The First Clipping Belongs to ${t.team_name}`,
      `${t.team_name} Wins, and the Press Box Has Fewer Complaints Than Usual`
    ],
    'tess-delaney':[
      `The Result and the Process Finally Agree for ${t.team_name}`,
      `${star} Gave ${t.team_name} More Than a Pretty Box Score`,
      `What Actually Worked in ${t.team_name}'s Win`,
      `${t.team_name} Found a Repeatable Way to Win — Maybe`,
      `The Numbers Behind a Sunday ${t.team_name} Can Use`,
      `${t.team_name} Won Without Needing the Spreadsheet to Lie`,
      `A Win With Structure: ${t.team_name} Passed the First Test`,
      `${t.team_name} Has Evidence, Not Proof, and That Is Progress`
    ],
    'mack-hollis':[
      `${t.team_name} Just Kicked the Door Off Its Hinges`,
      `${star} Put ${t.team_name} on the Front Page`,
      `Hide the Good China: ${t.team_name} Won and We Are Behaving Poorly`,
      `The Back Page Belongs to ${t.team_name} Tonight`,
      `${t.team_name} Won, So Naturally We Are Planning Something Irresponsible`,
      `Please Check on ${opp}: ${t.team_name} Had a Day`,
      `${t.team_name} Has Given This Newspaper Dangerous Confidence`,
      `Print It Large: ${t.team_name} Came to Make a Mess`
    ],
    'nora-voss':[
      `Case File Closed for the Week: ${t.team_name} Has the Receipts`,
      `${star} Is Exhibit A in ${t.team_name}'s Winning Argument`,
      `The Lineup Card Survives Cross-Examination for ${t.team_name}`,
      `${t.team_name} Produced Evidence the Skeptics Will Hate`,
      `No Alibi Required: ${t.team_name} Built a Real Win`,
      `${t.team_name} Leaves Very Little for the Inquiry Desk to Prosecute`,
      `The Paper Trail Favors ${t.team_name} This Week`,
      `${t.team_name} Wins, and the Evidence Is Annoyingly Coherent`
    ]
  };
  const loss={
    'walter-mercer':[
      `${t.team_name} Has a Week It Will Want Back`,
      `${star} Could Not Save ${t.team_name} From the Rest of the Story`,
      `The First Bad Clipping Is Already in ${t.team_name}'s File`,
      `${t.team_name} Loses, and There Is Plenty to Put in the Notebook`,
      `A Sunday to File, Not Frame, for ${t.team_name}`,
      `${opp} Sends ${t.team_name} Home With Homework`,
      `${t.team_name} Finds Several Ways to Make One Loss Annoying`,
      `The Press Box Has Questions After ${t.team_name}'s Loss`
    ],
    'tess-delaney':[
      `The Numbers Explain More Than the Final Score for ${t.team_name}`,
 