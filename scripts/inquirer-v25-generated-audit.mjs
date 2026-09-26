import fs from 'node:fs';
import assert from 'node:assert/strict';

const path=process.argv[2]||'/tmp/week1-inquirer.json';
const d=JSON.parse(fs.readFileSync(path,'utf8'));
const reportWeek=Number(d.week)||1;
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const sentenceParts=s=>{
  const protectedText=String(s||'')
    .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
    .replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'));
  return protectedText.split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
};
assert.equal(sentenceParts('On the other side, Amon-Ra St. Brown caught 10 passes.').length,1,'Sentence parser must preserve St. inside player names');
assert.equal(sentenceParts('Next week, C.J. Stroud completed 26 passes.').length,1,'Sentence parser must preserve initialed player names');
const articleText=t=>(t?.inquirer_article?.paragraphs||[]).filter(p=>String(p||'').trim()&&String(p).trim().toLowerCase()!=='n/a').join(' ');
const recapSections=d?.league_overview?.sections||[];
const recap=recapSections.flatMap(s=>s?.paragraphs||[]).join(' ');
const teamWords=(d.teams||[]).map(t=>words(articleText(t)));

assert.equal(Number(d.inquirer_version),26,'Generated edition must be Inquirer V26');
assert.equal(Number(d.editorial_revision),6,'Generated edition must carry editorial revision 6');
assert.equal(d.published_locked,true,`Generated Week ${reportWeek} edition must be marked immutable once published`);
assert.equal(Number(d.context_snapshot_through_week),reportWeek,`Generated Week ${reportWeek} edition must declare its own context snapshot`);
assert.equal((d.teams||[]).length,32,`Generated Week ${reportWeek} edition must contain 32 team articles`);
for(const t of d.teams||[]){
  const rec=t?.league_context?.record||{},wins=Number(rec.wins)||0,losses=Number(rec.losses)||0,ties=Number(rec.ties)||0,recent=t?.league_context?.recent_games||[],last=recent[recent.length-1]||null;
  assert.equal(wins+losses+ties,reportWeek,`Week ${reportWeek} archive record must contain exactly ${reportWeek} completed games for ${t.team_name}`);
  assert.equal(Number(t?.league_context?.snapshot_through_week),reportWeek,`Archived Week ${reportWeek} context must stay frozen to its report week for ${t.team_name}`);
  assert.equal(recent.length,reportWeek,`Archived Week ${reportWeek} recent-games context must stop at the report week for ${t.team_name}`);
  assert.equal(Number(last?.week),reportWeek,`Archived Week ${reportWeek} context must end on the current report week for ${t.team_name}`);
  assert.equal(Number(last?.points),Number(t.points),`Current-week points must match the frozen Week ${reportWeek} game for ${t.team_name}`);
  assert.equal(Number(last?.opponent_points),Number(t.opponent_points),`Current-week opponent points must match the frozen Week ${reportWeek} game for ${t.team_name}`);
  if(t?.division_context)assert.equal(Number(t.division_context.snapshot_through_week),reportWeek,`Article-team division context must stay frozen to Week ${reportWeek} for ${t.team_name}`);
  if(t?.next_opponent_division_context)assert.equal(Number(t.next_opponent_division_context.snapshot_through_week),reportWeek,`Next-opponent division context must stay frozen to Week ${reportWeek} for ${t.team_name}`);
  for(const x of t?.upcoming_opponents||[])if(x?.division_context)assert.equal(Number(x.division_context.snapshot_through_week),reportWeek,`Upcoming-opponent division context must stay frozen to Week ${reportWeek} for ${t.team_name}`);
  if(reportWeek===1){
    assert.equal(t?.next_projected,null,'Archived Week 1 must not regenerate a Week 2 team projection from later lineup data for '+t.team_name);
    assert.equal(t?.next_opponent_projected,null,'Archived Week 1 must not regenerate a Week 2 opponent projection from later lineup data for '+t.team_name);
    assert.equal(t?.next_week_availability,null,'Archived Week 1 must not import later injury/availability state for '+t.team_name);
    if(t?.mida_outlook?.source_date){const ts=Date.parse(String(t.mida_outlook.source_date));assert.ok(Number.isFinite(ts)&&ts<=Date.parse('2026-09-15T00:00:00Z'),'Week 1 archive must not import a later MIDA snapshot for '+t.team_name)}
  }
}
const expectedRanks=(d.teams||[]).map(t=>{const r=t?.league_context?.record||{},recent=t?.league_context?.recent_games||[];return{t,w:Number(r.wins)||0,l:Number(r.losses)||0,ties:Number(r.ties)||0,fpts:recent.reduce((n,g)=>n+(Number(g.points)||0),0)}}).sort((a,b)=>b.w-a.w||a.l-b.l||b.ties-a.ties||b.fpts-a.fpts||Number(a.t.roster_id)-Number(b.t.roster_id));
for(const [i,row] of expectedRanks.entries())assert.equal(Number(row.t?.league_context?.standings_rank),i+1,`Week ${reportWeek} standings rank must be reconstructed only from games through the report week for ${row.t.team_name}`);
assert.ok(recapSections.length>=4,'Weekly Recap must preserve a complete multi-desk edition');
assert.ok(words(recap)>Math.max(...teamWords),'Editorial Weekly Recap should be deeper than the longest team column');
const mentioned=(d.teams||[]).filter(t=>String(t.team_name||'').trim()&&recap.includes(String(t.team_name).trim()));
assert.ok(mentioned.length<(d.teams||[]).length,'Weekly Recap must select stories instead of mentioning every team by contract');
const mattered=recapSections.find(s=>s?.heading==='What Actually Mattered This Week');
assert.ok((mattered?.paragraphs||[]).length>=10,'What Actually Mattered This Week must develop at least five selected matchups with follow-up implications');
const matterBlocks=(mattered?.blocks||[]).filter(x=>Array.isArray(x?.paragraphs)&&x.paragraphs.length);
assert.ok(matterBlocks.length>=5,'What Actually Mattered This Week must expose labeled matchup/story blocks');
assert.ok(matterBlocks.slice(0,5).every(x=>String(x.heading||'').trim()&&x.paragraphs.length>=2),'Each featured matchup must have a visible heading and developed analysis');
assert.ok(matterBlocks.slice(0,5).every(x=>/fantasy points/i.test((x.paragraphs||[]).join(' '))),'Every featured Weekly Recap matchup must include fantasy production for the important players, not just the lead game');
const topScorer=(d.teams||[]).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0];
assert.ok(topScorer&&matterBlocks[0]?.heading?.includes(topScorer.team_name),'First Weekly Recap matchup block must feature the week’s top scoring team');
assert.ok((matterBlocks[0]?.paragraphs||[]).join(' ').includes(topScorer.team_name),'Top scorer must receive actual Weekly Recap commentary, not merely a heading');
const topThree=(topScorer?.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,3);
const topBlockCopy=(matterBlocks[0]?.paragraphs||[]).join(' ');
for(const p of topThree)assert.ok(topBlockCopy.includes(String(p.name||'')),'Weekly top-scorer story must include every highlighted top-three player by name: '+p.name);
const sharedStatParagraph=(matterBlocks[0]?.paragraphs||[]).find(p=>topThree.every(x=>String(p).includes(String(x.name||''))));
assert.ok(sharedStatParagraph,'Weekly top-scorer story must place all highlighted players into a shared stat-focused paragraph before the commentary');
assert.match(String(sharedStatParagraph),/\b(?:targets?|carries|passing|rushing|receiving|yards?|touchdowns?|tackles?|solo|assists?|TFL|tackles? for loss|sacks?|QB hits?|pass breakups?|interceptions?|forced fumbles?)\b/i,'Weekly top-scorer trio paragraph must carry real-football stats rather than names and fantasy totals alone');
assert.ok((matterBlocks[0]?.paragraphs||[]).some(p=>/serious problems|true centerpiece|bent the matchup|standing underneath it|opening statement|lit the first match|bigger flamethrower|catch fire|parking ticket/i.test(String(p))),'Weekly top-scorer story must add matchup consequence and emotion after the statistics');
assert.ok(((mattered?.paragraphs||[]).join(' ').match(/week’s cleanest upset/gi)||[]).length<=1,'Expanded recap must not call multiple games the week’s cleanest upset');
const recapOpeners=(mattered?.paragraphs||[]).map(p=>String(p).trim().split(/\s+/).slice(0,7).join(' ').toLowerCase());
const openerCounts=new Map();for(const x of recapOpeners)openerCounts.set(x,(openerCounts.get(x)||0)+1);
assert.ok(Math.max(0,...openerCounts.values())<=2,'Expanded matchup paragraphs must not repeat one canned implication opener across the recap');
const rejectedWeek2Meta=[
  /Ties are listed as ties/i,
  /projection gap did not survive contact with the actual lineup/i,
  /unused improvement was large enough to flip the result/i,
  /The performances that shaped it/i,
  /Week 2 warning label after/i,
  /real support, not a footnote/i,
  /actual support, not decorative box-score confetti/i
];
for(const re of rejectedWeek2Meta)assert.doesNotMatch(publishedCopy,re,'Rejected Week 2 meta/explainer language survived: '+re);
for(const block of matterBlocks.slice(0,5)){
  const copy=(block.paragraphs||[]).join(' ');
  const saysCollapse=/\bcollaps(?:e|ed|ing)\b/i.test(copy),deniesCollapse=/\b(?:not|wasn['’]t|was not)\s+(?:a\s+)?collaps(?:e|ing)\b/i.test(copy);
  assert.ok(!(saysCollapse&&deniesCollapse),'Weekly Recap matchup contradicts itself about collapse: '+String(block.heading||''));
}
const statIntroFingerprints=matterBlocks.slice(0,5).map(block=>{
  const p=String((block.paragraphs||[])[1]||'').toLowerCase();
  return p.replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/\b[a-z]+(?:\s+[a-z]+){0,3}\s+—/g,'[player] —').split(':')[0].trim();
}).filter(Boolean);
const statIntroCounts=new Map();for(const x of statIntroFingerprints)statIntroCounts.set(x,(statIntroCounts.get(x)||0)+1);
assert.ok(Math.max(0,...statIntroCounts.values())<=2,'Weekly Recap matchup stat introductions must vary instead of repeating one label in every game');

assert.ok(recapSections.some(s=>/Velvet Rope/i.test(String(s?.heading||''))),'Bartholomew’s Weekly Recap desk must retain his own identity instead of a generic analytics heading');

const all=[recap,...(d.teams||[]).map(articleText)].join('\n').toLowerCase();
for(const phrase of [
  'statistical lecture','arithmetic lesson','second source of points','absorb a quieter return','where sacks and forced fumbles can turn',
  'awkward; deliciously so','the back page has not forgotten','the back page is keeping the receipt','which tells us whether',
  'the responsible read is simple','what i want to see next','this is where a weekly recap should','require no further explanation',
  'opponent read on','the season file','the player file','the opposing file','the evidence reads','the inquiry stays','the case remains',
  'the distinction matters because','the back page gets to','the back page will','league-wide football story','fantasy points tell us',
  'the reporters will','the next useful signal','real sunday workload underneath','not a box-score tourist','more useful for forecasting',
  'this should be judged','the point is not','the question is whether','the file records',
  'first return','useful support behind the headline','old notebook rule','without printing the same score twice',
  'the transaction should be judged by','that is useful trade context','the important part for','the larger football read is','which is exactly what an idp league should reward when the work is real','historical value snapshot is not available in this article packet','in big type','big type','angry font','angry type','name in red','remove the suspense','job underneath it','something concrete to test','gets the photo','earned the ink',
  'the result matters because','other division rival','fantasy points reasons','opened near last season','turning finished with',
  'the useful version is','nick’s note is simple','the transaction belongs in the article','survived that call','result look as good on monday','roster compliment sitting on the bench','other side of the receipt alive','playoff case still sitting squarely in the argument','this week gave the résumé another loud line','somebody else now needs to make the back page fight for space','sunday reinforced it with another performance worthy of that reputation',
  'nick will','nick wants','nick sees','bartholomew would','bartholomew will','tilly would','filch recommends','filch would','this desk is already documenting','a beat writer is supposed to','ordinary quarterback workload','primary affirmative','no broader depth conclusion','favorable team verdict','entered as the projected underdog and won anyway','corroborates the expectation','projection liked','high-scorer line','multiple-contributor point is earned','provisional breakout label','breakout-watch invitation','gets the watch list','gets the same designation','supporting-cast argument','journalism malpractice','group-performance point','next-week file','player exhibit','probative data point','adverse finding','group chat','least comfortable note belongs to','separates the player from the verdict','records the consequence rather than the mechanism','admissible alternative','causal record','discrepancy is real','cannot carry the entire case','positive finding','division evidence','three pressure points','entered evidence','cross-examination'
]) assert.ok(!all.includes(phrase),'Rejected explainer/meta/repeated phrase survived generated copy: '+phrase);
const interpolationIndex=all.indexOf('${');assert.equal(interpolationIndex,-1,'Generated prose must never expose a template interpolation token; context: '+(interpolationIndex>=0?all.slice(Math.max(0,interpolationIndex-180),interpolationIndex+260):''));
assert.ok(!String(d.historical_player_stats_source||'').includes('unavailable'),`Generated Week ${reportWeek} must carry a real prior-season player-history source`);
const historicalStarters=(d.teams||[]).flatMap(t=>t.starter_details||[]).filter(p=>Number(p.prior_season_games)>=6&&Number.isFinite(Number(p.prior_season_avg)));
assert.ok(historicalStarters.length>=40,`Week ${reportWeek} must propagate meaningful prior-season baselines into player reporting; got ${historicalStarters.length}`);
let historicalContextExpected=0,historicalContextFound=0;
for(const t of d.teams||[]){
  const body=articleText(t),sentences=sentenceParts(body),top=(t.starter_details||[]).slice(0,3);
  for(const p of top){
    const prior=Number(p?.prior_season_avg),pts=Number(p?.points),games=Number(p?.prior_season_games)||0;
    if(!Number.isFinite(prior)||prior<=0||!Number.isFinite(pts)||games<6||Math.abs(pts-prior)<Math.max(4,prior*.3))continue;
    historicalContextExpected++;
    if(sentences.some(sentence=>sentence.includes(String(p.name||''))&&/\b(?:2025|last season)\b/i.test(sentence)))historicalContextFound++;
  }
}
assert.equal(historicalContextFound,historicalContextExpected,'Every materially unusual top-three Week 2 player with a valid 2025 baseline must receive historical-average context; expected '+historicalContextExpected+', found '+historicalContextFound);

assert.match(recap,/\b(?:targets|carries|pass attempts|solo|tackles|sack|receiving|rushing|passing)\b/i,'Weekly Recap must discuss real-life stat-line context, not fantasy points alone');
assert.match(recap,/breakout (?:star|case|players?)|can trust to keep showing up|familiar production|next opponent will attack the same weakness/i,'Weekly Recap must carry a natural player trajectory story tied to actual matchup consequences');

const spedale=(d.teams||[]).find(t=>String(t.manager_name||'').toLowerCase()==='mike3spedale');
if(spedale){
  const goedert=(spedale.starter_details||[]).find(p=>/Dallas Goedert/i.test(String(p.name||''))),spedaleText=articleText(spedale);
  assert.ok(goedert?.acquisition||((spedale.trade_acquisitions||[]).some(x=>/Dallas Goedert/i.test(String(x.player_name||'')))),'Dallas Goedert must retain canonical trade-acquisition memory for Mike3Spedale');
  assert.match(spedaleText,/Dallas Goedert[^.]{0,160}trade|trade[^.]{0,160}Dallas Goedert/i,'Mike3Spedale article must describe Dallas Goedert as a trade acquisition');
  assert.doesNotMatch(spedaleText,/ADD ALERT:[^.]*Dallas Goedert/i,'Dallas Goedert trade acquisition must never regress to waiver/free-agent ADD ALERT copy');
}

const orderByReporter=new Map();
for(const t of d.teams||[]){
  const a=t.inquirer_article||{};
  const rid=String(a?.reporter?.id||''),order=(a.sections||[]).map(s=>s.kind).join('>');if(!orderByReporter.has(rid))orderByReporter.set(rid,new Set());orderByReporter.get(rid).add(order);
  const hasTrade=(t.transactions||[]).some(m=>String(m?.type||'').toLowerCase()==='trade');
  const tradeCommentary=(a.sections||[]).find(s=>s.kind==='trade-commentary');
  assert.ok((a.sections||[]).length===8||(a.sections||[]).length===9,'Each team article must preserve eight core beats plus at most one verified trade-commentary beat');
  assert.equal((a.sections||[]).length===9,!!tradeCommentary,'A ninth section is valid only when complete trade evidence produced a Trade Receipt');
  if(tradeCommentary){
    assert.ok(hasTrade,'Trade commentary requires an actual team trade');
    assert.ok(Array.isArray(tradeCommentary.paragraphs)&&tradeCommentary.paragraphs.length>=2,'Complete trade evidence must receive developed commentary for '+t.team_name);
    const tradeCopy=tradeCommentary.paragraphs.join(' ');
    assert.match(tradeCopy,/trade|received|receipt/i,'Trade-commentary section must discuss the actual exchange for '+t.team_name);
    assert.doesNotMatch(tradeCopy,/unavailable|incomplete|unresolved|missing (?:history|valuation|rows?)/i,'Published Trade Receipt must never narrate unavailable trade-history evidence for '+t.team_name);
  }
  const players=(a.sections||[]).find(s=>s.kind==='players');
  assert.ok(players&&Array.isArray(players.paragraphs),'Each team article must preserve a player reporting beat');
  const lede=(a.sections||[]).find(s=>s.kind==='lede'),management=(a.sections||[]).find(s=>s.kind==='management'),outlook=(a.sections||[]).find(s=>s.kind==='outlook');
  assert.ok((lede?.paragraphs||[]).length>=3,'Team ledes must carry result plus reporter commentary');
  assert.ok((players?.paragraphs||[]).length>=6,'Player sections must retain the established reporting and add two additional football-analysis paragraphs beyond the stat lines');
  assert.ok((players?.paragraphs||[]).filter(p=>String(p).includes(String(t.opponent_name||''))).length>=2,'Player reporting must repeatedly connect performance to the actual opponent/matchup for '+t.team_name);
  const managementParagraphs=management?.paragraphs||[],outlookParagraphs=outlook?.paragraphs||[];
  if(managementParagraphs.length&&managementParagraphs[0]!=='n/a')assert.ok(managementParagraphs.length>=2,'Meaningful management sections must include reporter follow-through for '+t.team_name+'; got '+JSON.stringify(managementParagraphs));
  if(outlookParagraphs.length&&outlookParagraphs[0]!=='n/a')assert.ok(outlookParagraphs.length>=3,'Next-week sections must develop the matchup and road ahead for '+t.team_name);
  if(outlookParagraphs.length&&outlookParagraphs[0]!=='n/a'&&t?.next_opponent_division_context){const outlookCopy=outlookParagraphs.join(' '),divName=String(t.next_opponent_division_context.division_name||''),nrec=t.next_opponent_context?.record||{},recText=`${Number(nrec.wins)||0}-${Number(nrec.losses)||0}`;if(divName)assert.ok(outlookCopy.toLowerCase().includes(divName.toLowerCase()),'Next-week section must name the upcoming opponent division context for '+t.team_name+'; division='+divName+'; outlook='+JSON.stringify(outlookParagraphs));assert.ok(outlookCopy.includes(recText),'Next-week section must state the upcoming opponent current record for '+t.team_name);}
  if(outlookParagraphs.length&&outlookParagraphs[0]!=='n/a'&&t?.division_context){const leaders=(t.division_context.leaders||[]).filter(x=>x?.team_name),selfLeading=leaders.some(x=>String(x.roster_id)===String(t.roster_id)),otherLeaders=leaders.filter(x=>String(x.roster_id)!==String(t.roster_id));if(selfLeading&&otherLeaders.length){const outlookCopy=outlookParagraphs.join(' ').toLowerCase();assert.match(outlookCopy,/tied|shares|level/,'Next-week section must explicitly say the article team shares/ties the division lead for '+t.team_name);for(const x of otherLeaders)assert.ok(outlookCopy.includes(String(x.team_name).toLowerCase()),'Next-week section must name co-leader '+x.team_name+' for '+t.team_name);}}
  if(outlookParagraphs.length&&outlookParagraphs[0]!=='n/a'){const up=(t.upcoming_opponents||[]).slice().sort((a,b)=>Number(a.week)-Number(b.week)),next=up[0],later=up.slice(1,3),strong=next&&Number(next?.context?.standings_rank)<=8,soft=later.filter(x=>Number(x?.context?.standings_rank)>=24);if(strong&&soft.length){const candidates=outlookParagraphs.filter(p=>String(p).includes(String(next.team_name||''))&&soft.some(x=>String(p).includes(String(x.team_name||''))));if(candidates.length){assert.ok(candidates.some(p=>String(p).split(/[.!?](?:\s|$)/).filter(Boolean).length>=3),'Heavyweight-before-soft-games outlook must contain at least one three-sentence context/commentary paragraph for '+t.team_name);}}}
  const top=(t.starter_details||[]).filter(p=>Number.isFinite(Number(p?.points))).slice().sort((a,b)=>Number(b.points)-Number(a.points))[0],playerCopy=(players?.paragraphs||[]).join(' ');
  if(top?.real_stat_line){
    const wholeArticle=articleText(t);
    assert.ok(wholeArticle.includes(String(top.name||'')),'Team article must discuss the leading scorer by name for '+t.team_name);
    assert.match(playerCopy,/\b(?:targets?|carries|passing|rushing|receiving|yards?|touchdowns?|tackles?|solo|assists?|TFL|tackles? for loss|sacks?|QB hits?|pass breakups?|snaps?|interceptions?|forced fumbles?)\b/i,'Player section must contain real-football usage/stat commentary for '+t.team_name);
  }
}
const reporterFirstPerson=new Map();
for(const t of d.teams||[]){
  const rid=String(t.inquirer_article?.reporter?.id||''),copy=articleText(t),hits=(copy.match(/\bI(?:’m|'m|’ll|'ll|\s+(?:see|want|would|will|start|accept|respect|recommend|enter|treat|do|have|keep|call|think|expect|hate|resent|am))\b/gi)||[]).length;
  reporterFirstPerson.set(rid,(reporterFirstPerson.get(rid)||0)+hits);
}
for(const rid of ['walter-mercer','tess-delaney','mack-hollis','nora-voss'])assert.ok((reporterFirstPerson.get(rid)||0)>=1,'Each reporter must naturally reference their own judgment at least once across the generated edition: '+rid);
const thirdPersonDeskPatterns={
  'walter-mercer':/\bNick(?:’s|'s|\s+(?:will|would|wants|sees|circles|can|keeps|trusts|starts|refuses|considers|calls|thinks|recommends|records))\b/i,
  'tess-delaney':/\bBartholomew(?:’s|'s|\s+(?:will|would|wants|sees|can|keeps|trusts|starts|refuses|considers|calls|thinks|recommends|records|adores|accepts|respects))\b/i,
  'mack-hollis':/\bTilly(?:’s|'s|\s+(?:will|would|wants|sees|can|keeps|trusts|starts|refuses|considers|calls|thinks|recommends|records|resents))\b/i,
  'nora-voss':/\bFilch(?:’s|'s|\s+(?:will|would|wants|sees|can|keeps|trusts|starts|refuses|considers|calls|thinks|recommends|records|separates|treats|enters|leaves|reads|marks))\b/i
};
for(const t of d.teams||[]){
  const rid=String(t.inquirer_article?.reporter?.id||''),re=thirdPersonDeskPatterns[rid];
  if(re)assert.doesNotMatch(articleText(t),re,'Reporter must speak in first person instead of naming themself in '+t.team_name);
}
for(const s of recapSections){
  const rid=String(s?.reporter?.id||''),re=thirdPersonDeskPatterns[rid],copy=(s?.paragraphs||[]).join(' ');
  if(re)assert.doesNotMatch(copy,re,'Weekly Recap reporter must speak in first person instead of naming themself: '+rid);
}
for(const t of d.teams||[]){
  if(String(t.inquirer_article?.reporter?.id)!=='mack-hollis')continue;
  const copy=articleText(t);
  assert.doesNotMatch(copy,/\b(?:[A-Z]{2,}\s+){3,}[A-Z]{2,}\b/,'Tilly must not use all-caps runs for emphasis in '+t.team_name);
}
const tillyRecap=(recapSections.find(s=>String(s?.reporter?.id)==='mack-hollis')?.paragraphs||[]).join(' ');
assert.doesNotMatch(tillyRecap,/\b(?:[A-Z]{2,}\s+){3,}[A-Z]{2,}\b/,'Tilly must not use all-caps runs for emphasis in Weekly Recap');
for(const [rid,orders] of orderByReporter)assert.ok(orders.size>=4,'Reporter '+rid+' must generate at least four distinct article structures across eight team stories; got '+orders.size);

const teamCopy=(d.teams||[]).map(t=>articleText(t)).join('\n');
for(const [label,re] of [
  ['stat clause joined with bad preposition grammar',/\b(?:by|with|after)\s+(?:carried|finished|completed|caught|ran)\b/i],
  ['literal null leaked into prose',/\bnull\b/i],
  ['initialed player name split by contextual prose',/\b(?:C\.J\.|A\.J\.|D\.J\.|T\.J\.|P\.J\.)\s+(?:For|Around|In the)\b/i],
  ['St. player name split by contextual prose',/\bSt\.\s+(?:For|Around|In the)\b/i],
  ['standings No. split by contextual prose',/\bNo\.\s+(?:For|Around|In the)\b/i],
  ['mangled public-mood ranking',/PUBLIC MOOD:[^.]*\bNo\.\s*(?:The|$)/i],
  ['plural/unknown team name used as “is another chance” subject',/(?:^|[.!?]\s+)[A-Z][A-Za-z0-9'’.-]*(?:\s+[A-Z][A-Za-z0-9'’.-]*)+\s+is another chance to bank a result\b/im],
  ['team alias used as singular “is making the file personal” subject',/disclosure:\s+(?!covering\b)[^.]*\sis making the file personal\b/i]
]) assert.doesNotMatch(teamCopy,re,'Generated team prose has '+label);

const escapeRe=value=>String(value||'').replace(/[.*+?^$\{\}()|[\]\\]/g,m=>'\\\\'+m);
let aliasArticles=0;
for(const t of d.teams||[]){
  const full=String(t.team_name||'').trim(),bits=full.split(/\s+/).filter(Boolean);if(bits.length<2)continue;
  const city=bits.slice(0,-1).join(' '),mascot=bits.at(-1),withoutFull=articleText(t).replaceAll(full,' ');
  if((city&&new RegExp('(?:^|\\W)'+escapeRe(city)+'(?:$|\\W)','i').test(withoutFull))||(mascot&&new RegExp('(?:^|\\W)'+escapeRe(mascot)+'(?:$|\\W)','i').test(withoutFull)))aliasArticles++;
}
assert.ok(aliasArticles>=24,'Most team articles must naturally use a Sleeper-derived city or mascot alias in addition to the full team name; got '+aliasArticles);

const isEstablishedStar=p=>{
  const prior=Number(p?.prior_season_avg),games=Number(p?.prior_season_games)||0,pos=String(p?.position||'').toUpperCase();
  if(!Number.isFinite(prior)||games<8)return false;
  const defensive=/^(DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT)$/.test(pos),threshold=pos==='QB'?18:pos==='RB'?14:pos==='WR'?14:pos==='TE'?11:defensive?11:13;
  const years=Number(p?.years_exp);
  return prior>=threshold*1.2||(prior>=threshold&&(!Number.isFinite(years)||years>=1));
};
for(const t of d.teams||[]){
  const body=articleText(t),sentences=sentenceParts(body),full=String(t.team_name||'').trim(),bits=full.split(/\s+/).filter(Boolean),mascot=bits.at(-1)||'';
  if(/s$/i.test(mascot)){
    const subject=new RegExp('^(?:'+escapeRe(full)+'|'+escapeRe(mascot)+')\\s+(?:is|has|gets|holds|brings|turns)\\b','i');
    for(const sentence of sentences)assert.doesNotMatch(sentence,subject,'Plural Sleeper team alias must not take a singular verb in '+full+': '+sentence);
  }
  if(Number(t.points)<Number(t.opponent_points)){
    assert.doesNotMatch(body,/\b(?:survived that call|survived the decision|the win bought|result look(?:ed)? as good on monday|enjoy the win|permission to toast|winning shape travels|bring(?:s)? a win into|celebrate the win|the victory makes|the win hides|the win permits)\b/i,'Losing-team article contains winner-oriented framing for '+full);
  }
  for(const p of t.starter_details||[]){
    if(!isEstablishedStar(p))continue;
    const first=String(p.name||'').trim().split(/\s+/)[0],nameRe=new RegExp('(?:'+escapeRe(String(p.name||''))+'|\\b'+escapeRe(first)+'\\b)','i');
    for(const sentence of sentences){
      const breakout=/\bbreakout(?:[- ]watch| candidate| story| label)?\b/i.test(sentence),
        explicitRejection=/(?:does\s+not\s+need|doesn't\s+need|not|no\s+need\s+for|without)\b[^.]{0,48}\bbreakout\b|\bbreakout\b[^.]{0,24}\b(?:not|rather\s+than)\b/i.test(sentence);
      if(nameRe.test(sentence)&&breakout&&!explicitRejection)assert.fail('Established star '+p.name+' must not be described as a breakout in '+full+': '+sentence);
    }
  }
}


const fmtScore=n=>{const x=Number(n);return Number.isFinite(x)?(Math.abs(x-Math.round(x))<1e-9?String(Math.round(x)):x.toFixed(1).replace(/0+$/,'').replace(/\.$/,'')):''};
for(const t of d.teams||[]){
  const body=articleText(t),full=String(t.team_name||''),opp=String(t.opponent_name||''),lost=Number(t.points)<Number(t.opponent_points);
  if(lost&&full&&opp&&body.includes(opp+' beat '+full)){
    const expected=opp+' beat '+full+' '+fmtScore(t.opponent_points)+'–'+fmtScore(t.points);
    assert.ok(body.includes(expected),'Opponent-subject loss sentence must present opponent score first for '+full+'; expected '+expected);
  }
  const cool=(t.inquirer_article?.sections||[]).find(x=>x.kind==='cool-throne'),coolCopy=(cool?.paragraphs||[]).join(' ');
  const eligible=(t.starter_details||[]).filter(p=>{
    const pts=Number(p.points),prior=Number(p.prior_season_avg),proj=Number(p.projected),delta=Number.isFinite(proj)?pts-proj:null;
    return Number.isFinite(pts)&&(pts>=15||(delta!=null&&delta>=4)||(Number.isFinite(prior)&&prior>0&&pts>=prior*1.2));
  }).sort((a,b)=>Number(b.points)-Number(a.points)).slice(0,2);
  if(eligible.length>=2&&cool&&coolCopy.trim()&&coolCopy.trim().toLowerCase()!=='n/a'){
    const coolLower=coolCopy.toLowerCase();
    assert.ok(eligible.every(p=>coolLower.includes(String(p.name||'').toLowerCase())),'Cool Throne should recognize multiple legitimately deserving players for '+full+'; expected '+eligible.map(p=>p.name).join(', '));
  }
}

const reporterFunctionMeta=[
  /\bsports journalist\b/i,/\bjournalism schools?\b/i,/\bbeat[- ]writer\b/i,/\bpress box\b/i,/\bsports media\b/i,/\bcopy desk\b/i,
  /\bfourth-wall\b/i,/\bsome reporters chase access\b/i,/\breporter becomes part of\b/i,/\breporter who keeps receipts\b/i,
  /\beditors? prefer\b/i,/\bsomewhere, an editor\b/i,/\bmeet deadlines?\b/i,/\bcovering .+? taught me reporters\b/i,
  /\btrying very hard to become a respected\b/i,/\bthe back page would like everyone to know\b/i,
  /\bseptember journalism\b/i,/\bthis newsroom marks\b/i,/\bpostseason line this desk is tracking\b/i,/\binvestigative desk should be willing to print\b/i
];
const publishedCopy=teamCopy+'\n'+recap;
assert.doesNotMatch(teamCopy,/\bis the Week 2 warning label after\b/i,'Team columns must not use the generic warning-label template');
assert.doesNotMatch(teamCopy,/\bthat quiet lineup slot forced the rest of\b/i,'Team columns must not state the obvious scoring-burden template');
assert.doesNotMatch(teamCopy,/\bthat is real support, not a footnote\b/i,'Team columns must not use support-vs-footnote explainer language');

for(const re of reporterFunctionMeta)assert.ok(!re.test(publishedCopy),'Reporter-function exposition survived generated Inquirer copy: '+re);

for(const t of d.teams||[]){
  const names=[...(t.starter_details||[]),...Object.values(t.transaction_player_facts||{}),...(t.trade_acquisitions||[]).flatMap(a=>[
    a?.player_name?{name:a.player_name}:null,
    ...(a?.outgoing_player_names||[]).map(name=>({name}))
  ])].filter(p=>p?.name).map(p=>String(p.name).trim()).filter(Boolean);
  const groups=new Map();
  for(const full of [...new Set(names)]){
    const bits=full.split(/\s+/),first=bits[0],last=bits.at(-1);if(bits.length<2)continue;
    const a=groups.get(last)||[];a.push({full,first});groups.set(last,a);
  }
  const text=articleText(t);
  for(const entries of groups.values()){
    if(entries.length<2)continue;
    for(const intended of entries)for(const other of entries){
      if(intended.full===other.full)continue;
      const bad=new RegExp('\\b'+escapeRe(intended.first)+'\\s+'+escapeRe(other.full)+'\\b','i');
      assert.doesNotMatch(text,bad,'Generated prose must not concatenate same-surname player identities for '+t.team_name);
    }
  }
}
const canonicalStatFact=(t,sentence)=>{
  let x=String(sentence||''),players=[...(t.starter_details||[]),...(t.opponent_roster?.starters||t.opponent_roster?.players||[]),...(t.next_opponent_roster?.starters||t.next_opponent_roster?.players||[])].filter(p=>p?.name),
    firstCounts=new Map();
  for(const p of players){const first=String(p.name).trim().split(/\s+/)[0];if(first)firstCounts.set(first,(firstCounts.get(first)||0)+1)}
  players.forEach((p,index)=>{
    const full=String(p.name||'').trim();if(!full)return;const first=full.split(/\s+/)[0],token='[PLAYER:'+String(p.id||index)+']';
    x=x.replace(new RegExp(escapeRe(full),'gi'),token);
    if(firstCounts.get(first)===1)x=x.replace(new RegExp('\\b'+escapeRe(first)+'\\b','gi'),token);
  });
  return x.toLowerCase().replace(/\s+/g,' ').trim();
};
for(const t of d.teams||[]){
  const statFacts=new Map();
  for(const sentence of sentenceParts(articleText(t))){
    if(!/\b(?:yards?|targets?|carries|touchdowns?|passes?|completed|caught|ran|tackles?|solo|assists?|sacks?|TFL|QB hits?|interceptions?|receptions?)\b/i.test(sentence)||!/\b\d+(?:\.\d+)?\b/.test(sentence))continue;
    const fact=canonicalStatFact(t,sentence),rows=statFacts.get(fact)||[];rows.push(sentence);statFacts.set(fact,rows);
  }
  const duplicateStats=[...statFacts.values()].filter(rows=>rows.length>1);
  assert.deepEqual(duplicateStats,[],'A team article must not print the same player stat line twice after full-name/first-name normalization for '+t.team_name);
}

for(const t of d.teams||[]){
  const players=[...(t.starter_details||[]),...(t.opponent_roster?.starters||t.opponent_roster?.players||[]),...(t.next_opponent_roster?.starters||t.next_opponent_roster?.players||[])].filter(p=>p?.name),
    firstCounts=new Map();
  for(const p of players){const first=String(p.name).trim().split(/\s+/)[0];if(first)firstCounts.set(first,(firstCounts.get(first)||0)+1)}
  const seenPlayerStatSignatures=new Map();
  for(const sentence of sentenceParts(articleText(t))){
    if(!/\b(?:targets?|carries|passing|rushing|receiving|yards?|touchdowns?|tackles?|solo|assists?|TFL|sacks?|QB hits?|pass breakups?|snaps?|interceptions?|receptions?)\b/i.test(sentence))continue;
    const nums=sentence.match(/-?\b\d+(?:\.\d+)?\b/g)||[];if(nums.length<2)continue;
    for(const p of players){
      const full=String(p.name||'').trim(),first=full.split(/\s+/)[0],fullRe=new RegExp(escapeRe(full),'i'),firstRe=firstCounts.get(first)===1?new RegExp('\\b'+escapeRe(first)+'\\b','i'):null;
      if(!fullRe.test(sentence)&&!(firstRe&&firstRe.test(sentence)))continue;
      const statWords=(sentence.toLowerCase().match(/\b(?:target|targets|carries|passing|rushing|receiving|yard|yards|touchdown|touchdowns|tackle|tackles|solo|assist|assists|tfl|sack|sacks|qb hit|qb hits|pass breakup|pass breakups|snap|snaps|interception|interceptions|reception|receptions)\b/g)||[]).sort();
      const sig=String(p.id||full)+'::'+nums.join(',')+'::'+[...new Set(statWords)].join(',');
      const rows=seenPlayerStatSignatures.get(sig)||[];rows.push(sentence);seenPlayerStatSignatures.set(sig,rows);
    }
  }
  const duplicatePlayerStats=[...seenPlayerStatSignatures.values()].filter(rows=>rows.length>1);
  assert.deepEqual(duplicatePlayerStats,[],'A team article must not repeat the same player football-stat signature under different prose wrappers for '+t.team_name);
}

const repeatedLong=new Map();
for(const t of d.teams||[]){
  const body=articleText(t);
  for(const sentence of sentenceParts(body)){
    const key=String(sentence||'').trim();
    if(words(key)<8)continue;
    repeatedLong.set(key,(repeatedLong.get(key)||0)+1);
  }
}
const repeatedLongOffenders=[...repeatedLong].filter(([,count])=>count>2);
assert.deepEqual(repeatedLongOffenders,[],'Generated team articles must not repeat any long sentence across more than two placements');

const editorialEntities=[...new Set((d.teams||[]).flatMap(t=>[
  t.team_name,t.opponent_name,t.next_opponent_name,t.manager_name,
  ...(t.starter_details||[]).map(p=>p.name),
  ...(t.opponent_roster?.starters||t.opponent_roster?.players||[]).map(p=>p?.name),
  ...(t.next_opponent_roster?.starters||t.next_opponent_roster?.players||[]).map(p=>p?.name)
]).filter(Boolean).map(x=>String(x).trim()).filter(Boolean))].sort((a,b)=>b.length-a.length);
const editorialFingerprint=sentence=>{
  let x=String(sentence||'').trim();
  const numeric=(x.match(/\b\d+(?:\.\d+)?%?\b/g)||[]).length;
  if(numeric>=2&&/\b(?:targets?|carries|yards?|touchdowns?|passes?|completed|tackles?|solo|assists?|sacks?|snaps?|interceptions?|TFL|QB hits?|receptions?)\b/i.test(x))return null;
  for(const entity of editorialEntities)x=x.replace(new RegExp(escapeRe(entity),'gi'),'[ENTITY]');
  x=x.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,'[#]').replace(/\s+/g,' ').trim();
  return words(x)>=8?x:null;
};
const templatePlacements=new Map();
for(const t of d.teams||[]){
  const seenHere=new Set();
  for(const sentence of sentenceParts(articleText(t))){
    const fp=editorialFingerprint(sentence);if(!fp||seenHere.has(fp))continue;seenHere.add(fp);
    const rows=templatePlacements.get(fp)||[];rows.push({team:t.team_name,reporter:t.inquirer_article?.reporter?.name,sentence});templatePlacements.set(fp,rows);
  }
}
const templateOffenders=[...templatePlacements.entries()].filter(([,rows])=>rows.length>3).map(([fingerprint,rows])=>({fingerprint,count:rows.length,examples:rows.slice(0,4)}));
assert.deepEqual(templateOffenders,[],'Editorial sentence templates must not recur across more than three team articles after names/numbers are normalized');
const avgTeamWords=teamWords.reduce((n,x)=>n+x,0)/Math.max(1,teamWords.length);
assert.ok(Math.min(...teamWords)>=580,'Every team column must preserve the revision-5 depth increase; shortest='+Math.min(...teamWords));
assert.ok(avgTeamWords>=790,'Team columns must average roughly 100+ words more commentary than the prior revision-5 build; average='+avgTeamWords.toFixed(1));
console.log(JSON.stringify({ok:true,version:d.inquirer_version,teams:d.teams.length,recap_words:words(recap),max_team_words:Math.max(...teamWords),min_team_words:Math.min(...teamWords),avg_team_words:Number(avgTeamWords.toFixed(1)),mentioned_teams:mentioned.length,reporter_structures:Object.fromEntries([...orderByReporter].map(([k,v])=>[k,v.size]))}));
