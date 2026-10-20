// Editorial composition rules shared by every forward week. The source desks
// can draft expansively; this pass assigns each fact to one narrative beat.
// It is intentionally separate from the format/grammar publication gates.
const text=x=>String(x||'').trim();
const one=x=>Number(x||0).toFixed(1);
const clauseParts=s=>text(s).split(/(?<=[.!?])\s+/).filter(Boolean);
const hasMove=s=>/\b(?:added|dropped|claimed|acquired|traded|waived|picked up|sent .* away)\b/i.test(s)&&!/(?:no|none|without|not) (?:new |completed |verified )?(?:move|transaction|addition)/i.test(s);
const hasOpponentPreview=s=>/\b(?:next|week ahead|week \d+ sends|waiting in week|are next|is next)\b/i.test(s);

function storyStat(p,opponent,index,variant=0){
 const rs=p?.real_stats||{},n=text(p?.name),points=one(p?.points),pos=text(p?.position).toUpperCase();
 const num=(...keys)=>{for(const k of keys)if(Number.isFinite(Number(rs[k])))return Number(rs[k]);return null};
 const bits=[];
 if(pos==='QB'){
  const attempts=num('pass_att'),complete=num('pass_cmp'),yards=num('pass_yd'),td=num('pass_td'),ints=num('pass_int');
  if(attempts!=null&&complete!=null)bits.push(`${complete} completions on ${attempts} attempts`);
  if(yards!=null)bits.push(`${yards} passing yards`);
  if(td!=null&&td>0)bits.push(`${td} passing ${td===1?'touchdown':'touchdowns'}`);
  if(ints!=null&&ints>0)bits.push(`${ints} ${ints===1?'interception':'interceptions'}`);
 }else if(['RB','WR','TE'].includes(pos)){
  const carries=num('rush_att'),rush=num('rush_yd'),rushTd=num('rush_td'),rec=num('rec'),targets=num('rec_tgt'),yards=num('rec_yd'),recTd=num('rec_td');
  if(carries!=null&&carries>0)bits.push(`${carries} carries for ${rush??0} yards`);
  if(rushTd!=null&&rushTd>0)bits.push(`${rushTd} rushing ${rushTd===1?'touchdown':'touchdowns'}`);
  if(rec!=null&&targets!=null)bits.push(`${rec} catches on ${targets} targets${yards!=null?` for ${yards} yards`:''}`);
  if(recTd!=null&&recTd>0)bits.push(`${recTd} receiving ${recTd===1?'touchdown':'touchdowns'}`);
 }else{
  const solo=num('tkl_solo'),assists=num('tkl_ast'),sacks=num('sack','sacks'),tfl=num('tkl_loss'),hits=num('qb_hit');
  if(solo!=null&&solo>0)bits.push(`${solo} solo ${solo===1?'tackle':'tackles'}`);
  if(assists!=null&&assists>0)bits.push(`${assists} assisted ${assists===1?'tackle':'tackles'}`);
  if(sacks!=null&&sacks>0)bits.push(`${sacks} ${sacks===1?'sack':'sacks'}`);
  if(tfl!=null&&tfl>0)bits.push(`${tfl} ${tfl===1?'tackle':'tackles'} for loss`);
  if(hits!=null&&hits>0)bits.push(`${hits} QB ${hits===1?'hit':'hits'}`);
 }
 const detail=bits.length?bits.slice(0,3).join(', '):null;
 const leads=index===0?[
  `${n} put ${points} fantasy points on the board.`,
  `The largest individual return belonged to ${n}: ${points} fantasy points.`,
  `${points} fantasy points from ${n} helped shape the final score.`,
  `${n} made the strongest scoring argument with ${points} fantasy points.`,
  `There was no overlooking ${n} and ${points} fantasy points.`,
  `${n} carried the top of the card at ${points} fantasy points.`,
  `The scorebook starts with ${n}'s ${points} fantasy points.`,
  `${n} supplied the decisive individual production: ${points} fantasy points.`
 ]:[
  `${n} contributed ${points} fantasy points beside the headline act.`,
  `${points} fantasy points from ${n} gave the lineup another source.`,
  `${n} also made the scoreboard with ${points} fantasy points.`,
  `${n}'s ${points} fantasy points mattered beyond the leading scorer.`,
  `The supporting performance came from ${n} at ${points} fantasy points.`,
  `${n} added ${points} fantasy points to the week's work.`,
  `There was another useful name: ${n}, ${points} fantasy points.`,
  `${n} kept the scoring conversation from ending at one player with ${points} fantasy points.`
 ];
 const lead=leads[variant%leads.length];
 return detail?`${lead} ${['The play-by-play records','On the NFL field it amounted to','His game also featured','The stat sheet shows','That included','The actual football work reads','The supporting evidence:','The production came with'][variant%8]} ${detail}.`:lead;
}

function cullRecycledMetaphors(s){
 return text(s).replace(/(?:The headliner turned the Week \d+ volume up\.|the headliner turned the Week \d+ volume up\.)\s*/gi,'')
  .replace(/\b([^.;]+) did not beat that number so much as kick the door off it\./gi,(_all,start)=>`${text(start)} exceeded the previous benchmark.`)
  .replace(/\s+/g,' ').trim();
}

function editorialResult(t,week,variant){
 const team=text(t.team_name),opponent=text(t.opponent_name),own=one(t.points),other=one(t.opponent_points);
 // This is a *single concise score citation* inside a reported lead. Avoid
 // manufacturing two more sentences around every one of the 32 same facts.
 const rows=[
  `Final score: ${team} ${own}, ${opponent} ${other}.`,
  `${own} points for ${team}; ${other} for ${opponent}.`,
  `${team}: ${own}. ${opponent}: ${other}.`,
  `On the scorecard: ${team} ${own}; ${opponent} ${other}.`
 ];
 return rows[variant%rows.length];
}

export function curateForwardTeamNarrative(t,week){
 const a=t?.inquirer_article;if(!a)return t;
 const byKind=new Map((a.sections||[]).map(s=>[s.kind,{...s,paragraphs:(s.paragraphs||[]).map(text).filter(Boolean)}]));
 const lede=byKind.get('lede');
 if(lede){
  const rows=lede.paragraphs,opening=rows[0]||'';
  // Long Week-2 legacy leads restated the final score, standings and the next
  // opponent across five paragraphs. Give the result exactly one home.
  let memory=rows.slice(2).find(p=>/Week \d+|last week|previous|opener/i.test(p)&&!hasOpponentPreview(p))||rows[2]||'';
  memory=memory.replace(/; the season record is [^;.]*(?:; the next game against [^.]+)?\./i,'.')
    .replace(/; the next game against [^.]+\./i,'.');
  // Forward articles must not mistake a Week-2 archive sentence for the
  // immediate prior-week trajectory. Absence of a trustworthy comparison is
  // preferable to false recency.
  if(/\b(?:split the first two games|first result on|Week 3 gets to decide whether Week 2)\b/i.test(memory))memory='';
  if(memory&&opening&&memory===opening)memory='';
  const verifiedScore=rows[1]||editorialResult(t,week,(Number(t.roster_id)||1)-1);
  // Preserve one genuinely different editorial observation when the source
  // has it. Week 4's approved ledes carry a third beat; blanket compression
  // into two lines made the short teams read like score summaries.
  const distinct=rows.slice(2).find(p=>p!==memory&&!hasOpponentPreview(p)
    &&!/\b(?:final score|beat|lost to|season record is|No\. \d+ in the league standings|split the first two games|Week 3 gets to decide whether Week 2)\b/i.test(p)
    &&!/[0-9]{2,3}\.[0-9]\s*[-–]\s*[0-9]{2,3}\.[0-9]/.test(p));
  lede.paragraphs=[`${opening} ${verifiedScore}`.trim(),memory,distinct]
    .filter((p,i,arr)=>p&&!arr.slice(0,i).includes(p));
 }
 const players=byKind.get('players');
 if(players){
  const featured=(t.starter_details||[]).slice().sort((x,y)=>Number(y.points)-Number(x.points)).slice(0,2)
    .filter((p,i)=>i===0||Number(p.points)>=15);
  // The pre-existing source stat rows passed factual audits. Preserve them
  // when available: mass-rewording all 32 into eight new sentence templates
  // would simply manufacture a different flavor of repeated prose.
  const sourceStatRows=players.paragraphs.filter(p=>/fantasy points/i.test(p)).slice(0,featured.length);
  const statRows=sourceStatRows.length?sourceStatRows:featured.map((p,i)=>storyStat(p,t.opponent_name||'the opponent',i,(Number(t.roster_id)||1)-1));
  // Preserve acquired-player or distinct long-form commentary, but discard
  // the formulaic "Against X, Y led" stat rows from the old draft.
  const additional=players.paragraphs.filter(p=>!/^Against /i.test(p)&&!featured.some(f=>p.includes(f.name)&&/fantasy points;/.test(p)))
   .map(p=>clauseParts(p).filter(sentence=>{
    if(/\b(?:second punch turned the Week \d+ volume up|made this Sunday harder to mock)\b/i.test(sentence))return false;
    if(/\b(?:the star receiver|the star tight end|the second scorer|the top rival target|second punch)\b/i.test(sentence)&&!featured.some(f=>sentence.includes(f.name)))return false;
    return true;
   }).join(' ')).filter(p=>p&&featured.some(f=>p.includes(f.name))).slice(0,1);
  players.paragraphs=[...statRows,...additional];
 }
 const management=byKind.get('management');
 if(management){
  const rows=management.paragraphs,first=rows[0]||'';
  const miss=t.best_lineup_miss,benchNames=[miss?.starter?.name,miss?.reserve?.name].filter(Boolean);
  const move=rows.slice(1).find(p=>hasMove(p)&&!(benchNames.length===2&&benchNames.every(name=>p.includes(name))));
  const pruneCase=p=>{
   let alreadyReported=false;
   return clauseParts(p).filter(sentence=>{
    const mentionsBoth=benchNames.length===2&&benchNames.every(n=>sentence.includes(n));
    if(mentionsBoth){if(alreadyReported)return false;alreadyReported=true;return true}
    // "X started at WR" and "Y stayed on the bench" repeat a comparison
    // whose first sentence has already supplied the legal decision and gap.
    if(alreadyReported&&benchNames.some(n=>sentence.includes(n))&&/\b(?:started at|stayed on the bench|outscored|beat that choice)\b/i.test(sentence))return false;
    return true;
   }).join(' ');
  };
  const pruneMove=p=>clauseParts(p.replace(/\bby added\b/gi,': added'))
   .filter(sentence=>!/\b(?:The additions stayed off|Those additions did not reach|Until an addition enters|That is roster churn)\b/i.test(sentence)).join(' ');
  management.paragraphs=[pruneCase(first),move&&pruneMove(move)].filter(Boolean);
 }
 const credit=byKind.get('cool-throne');
 if(credit)credit.paragraphs=credit.paragraphs.map(p=>cullRecycledMetaphors(p))
  .map(p=>clauseParts(p).filter(sentence=>
    !/\b(?:made this Sunday harder to mock|the top rival target|the second scorer|second punch)\b/i.test(sentence)
  ).join(' ')).filter(Boolean);
 const outlook=byKind.get('outlook');
 if(outlook?.paragraphs?.length){
  const rows=outlook.paragraphs,first=rows[0],last=rows.at(-1);
  const detail=rows.slice(1,-1).find(p=>/bye|questionable|injur|division|playoff|project|schedule/i.test(p))||rows[1];
  outlook.paragraphs=[first,detail,last].filter((p,i,arr)=>p&&!arr.slice(0,i).includes(p));
 }
 const patterns=[
  ['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'],
  ['lede','players','cool-throne','management','hot-seat','value','sentiment','outlook'],
  ['lede','hot-seat','players','management','cool-throne','value','sentiment','outlook'],
  ['lede','management','players','hot-seat','value','cool-throne','sentiment','outlook']
 ];
 const reporterIndex=({'walter-mercer':0,'tess-delaney':1,'mack-hollis':2,'nora-voss':3})[a.reporter?.id]??0;
 const caseIndex=Number(t.best_lineup_miss?.gap)>12?1:Number(t.points)>Number(t.opponent_points)?0:2;
 const order=patterns[(reporterIndex+caseIndex)%patterns.length];
 a.sections=order.map(k=>byKind.get(k)).filter(Boolean);
 for(const s of a.sections)s.paragraphs=(s.paragraphs||[]).map(p=>{
  let copy=p;
  for(const prefix of ['Spare me the excuses:','Back-page material:','The lineup still answers:','Follow the scoring:','No fine print:']){
   // These labels are legacy generator scaffolds, not organic sarcasm. The
   // observation after the colon stays; the repeated label never publishes.
   copy=copy.replaceAll(prefix,'').trimStart();
  }
  return copy;
 });
 a.paragraphs=a.sections.flatMap(s=>s.paragraphs||[]);
 return t;
}

export function restoreForwardPlayerFact(t){
 const article=t?.inquirer_article,section=article?.sections?.find(s=>s.kind==='players');
 if(!section||/fantasy points/i.test(section.paragraphs?.[0]||''))return;
 const top=(t.starter_details||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0];
 if(!top)return;
 // A previous-week duplicate can be removed only if its evidence is restored
 // in fresh language; no article may emerge from the final pruning pass
 // without a documented player performance.
 const variant=(Number(t.roster_id)||1)+7;
 section.paragraphs=[storyStat(top,t.opponent_name,0,variant),...(section.paragraphs||[])];
 article.paragraphs=article.sections.flatMap(s=>s.paragraphs||[]);
}

export function inspectNarrativeArchitecture(edition){
  if(Number(edition?.week)<5||(edition?.teams||[]).length!==32)return [];
 const issues=[];
 const orders=new Set();
 for(const t of edition?.teams||[]){
  const a=t.inquirer_article||{},ss=a.sections||[],kind=k=>ss.find(s=>s.kind===k),team=t.team_name;
  orders.add(ss.map(s=>s.kind).join('|'));
  const lede=kind('lede')?.paragraphs||[],mgmt=kind('management')?.paragraphs||[];
  const headline=text(a.headline),all=(a.paragraphs||[]).join(' ');
  if(/\b(?:A this Sunday|their this Sunday|[’'] this Sunday|It The last two Sundays|this Sunday's)\b/i.test(headline)
    ||/\b(?:the last two Sundays|this Sunday) Worth Talking About\b/i.test(headline))
    issues.push({id:'malformed-week-adapted-headline',team,headline});
  const words=all.split(/\s+/).filter(Boolean).length;
  if(words<300)issues.push({id:'article-below-week4-editorial-floor',team,words});
  if(/\b(?:made this Sunday harder to mock|the top rival target|the second scorer)\b/i.test(all))
    issues.push({id:'anonymous-week2-player-trope',team});
  if(lede.length>3)issues.push({id:'overwritten-with-five-part-legacy-lede',team,count:lede.length});
  if(mgmt.length>2)issues.push({id:'repeated-management-case',team,count:mgmt.length});
  const miss=t.best_lineup_miss,names=[miss?.starter?.name,miss?.reserve?.name].filter(Boolean);
  if(names.length===2&&mgmt.filter(p=>names.every(n=>p.includes(n))).length>1)
    issues.push({id:'same-lineup-decision-reported-twice',team});
  if(names.length===2&&mgmt.some(p=>clauseParts(p).filter(s=>names.every(n=>s.includes(n))).length>1))
    issues.push({id:'same-lineup-decision-twice-inside-paragraph',team});
  if(mgmt.some(p=>/\bby added\b/i.test(p)))issues.push({id:'malformed-transaction-verb',team});
  if((a.paragraphs||[]).some(p=>/\b(?:second punch turned the Week \d+ volume up|made this Sunday harder to mock|split the first two games)\b/i.test(p)))
    issues.push({id:'legacy-week2-prose-survived-final-composition',team});
  if(!String(kind('players')?.paragraphs?.[0]||'').includes('fantasy points'))
    issues.push({id:'player-story-lacks-fantasy-fact',team});
  if((a.paragraphs||[]).length!==ss.flatMap(s=>s.paragraphs||[]).length)
    issues.push({id:'narrative-flat-mirror',team});
 }
 if((edition?.teams||[]).length>=16&&orders.size<3)
  issues.push({id:'one-template-for-thirty-two-stories',distinctOrders:orders.size});
 for(const p of (edition?.league_overview?.sections||[]).flatMap(s=>s.blocks?.length?s.blocks.flatMap(b=>b.paragraphs||[]):s.paragraphs||[]))
  if(/\bThe record is \d+-\d+\b/i.test(p))
   issues.push({id:'unattributed-or-stale-season-record',excerpt:String(p).slice(0,130)});
 return issues;
}
