import fs from 'node:fs';

const path=process.argv[2]||'/tmp/week2-inquirer.json';
const d=JSON.parse(fs.readFileSync(path,'utf8'));

if(Number(d?.week)!==2)throw new Error(`Week 2 readiness audit expected week=2, got ${d?.week}`);

const REPORTERS={
  'walter-mercer':'Nick Swindell',
  'tess-delaney':'Tilly Fleecer',
  'mack-hollis':'Bartholomew Roycington III',
  'nora-voss':'Jefferson Filch'
};
const REPORTER_IDS=Object.keys(REPORTERS);
const words=s=>(String(s||'').match(/\b[\w’'-]+\b/g)||[]).length;
const sentences=s=>String(s||'').replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).split(/(?<=[.!?]["'’”])\s+|(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const finite=v=>Number.isFinite(Number(v));
const one=v=>Number(v).toFixed(1).replace(/\.0$/,'');
const textOfArticle=a=>(a?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(Boolean).join(' ');
const sectionText=(a,kind)=>(a?.sections||[]).filter(s=>String(s?.kind||'')===kind).flatMap(s=>s?.paragraphs||[]).filter(Boolean).join(' ');
const pct=v=>finite(v)?one(v)+'%':null;

const BANNED_META=/\b(?:headline|back page|copy desk|newsroom|typeface|case file|receipts?|screenshot|group chat|notification|social media|algorithm|feed|timeline|scoring app|app notification|the paragraph|this paragraph|the article|I wrote|circled|filed|exhibit|evidence says|the data says)\b/i;
const SNAP=/\b(?:snap share|snaps?\b|unit snaps)\b/i;
const SNAP_MEANINGFUL=/\b(?:week 1|last week|2025|last season|prior|usual|normal|typical|career|rose|fell|jumped|dropped|increased|decreased|up from|down from|higher|lower|changed|shifted|injur|limited|return|rotation|competition|breakout|role|opportunity|career high|career low)\b/i;
const INSIGHT_STAT=/\b(?:average|median|rank|ranked|projection|projected|margin|gap|combined|target|targets|carry|carries|reception|receptions|attempt|attempts|yards?|touchdowns?|sacks?|tackles?|interceptions?|pressure|pressures|value|percent|%|points per game|ppg|red zone|goal line|air yards|yards per route|route|routes|streak|record|expected wins?|playoff|division|championship|bench|starter|outscored|above|below|increase|decrease|jump|drop|delta|share)\b/i;
const INTERPRET=/\b(?:because|which means|that means|so |therefore|matters|suggests|shows|tells us|reason|risk|problem|advantage|edge|warning|trust|repeat|sustainable|unsustainable|role|opportunity|decision|start|bench|fix|improve|protect|convert|pressure|expect|need|should|must|worth|cost|payoff|path|chance)\b/i;
const SARCASM={
  'walter-mercer':/\b(?:sentimental|cute|miracle|congratulations|permission slip|fake mustache|lovely|apparently|mercifully|wonderful|brilliant)\b/i,
  'tess-delaney':/\b(?:lovely|beautiful|fantastic|darling|civilized|charming|elegant|vulgar|parade|wonderful|adorable|how generous|how thoughtful)\b/i,
  'mack-hollis':/\b(?:coronation|funeral|procession|invitation|spectacle|glorious|royal|ceremony|splendid|magnificent|pageantry|charming|court)\b/i,
  'nora-voss':/\b(?:rivals?|embarrass|foolish|mystery|owns it|excuse|motivation|gift|generous|kind of you|how convenient|awkward|humiliat)\b/i
};

const blockers=[];
const warnings=[];
const notes=[];
const add=(arr,code,message,extra={})=>arr.push({code,message,...extra});

function materialMida(t){
  const m=t?.mida_outlook;
  if(!m)return false;
  return ['playoff','title','division','expected_wins'].some(k=>finite(m?.[k]));
}
function midaEvidence(t,text){
  const m=t?.mida_outlook;if(!m)return [];
  const values=[
    ['playoff',m.playoff,/playoff/i],
    ['title',m.title,/(?:title|championship)/i],
    ['division',m.division,/division/i],
    ['expected_wins',m.expected_wins,/expected wins?/i]
  ];
  return sentences(text).filter(s=>values.some(([,v,label])=>finite(v)&&label.test(s)&&(s.includes(one(v))||s.includes(Number(v).toFixed(1)))));
}
function routineSnapSentences(text){return sentences(text).filter(s=>SNAP.test(s)&&!SNAP_MEANINGFUL.test(s));}
function insightStats(text){return sentences(text).filter(s=>/\d/.test(s)&&INSIGHT_STAT.test(s));}
function interpretedStats(text){return insightStats(text).filter(s=>INTERPRET.test(s));}
function normalizeForRepeat(s,names=[]){
  let x=String(s||'').toLowerCase();
  for(const name of [...new Set(names.filter(Boolean))].sort((a,b)=>b.length-a.length))x=x.replaceAll(String(name).toLowerCase(),'<name>');
  return x.replace(/\b\d+(?:\.\d+)?%?\b/g,'#').replace(/[^a-z#<> ]+/g,' ').replace(/\s+/g,' ').trim();
}
function medianSample(rows){
  const sorted=rows.slice().sort((a,b)=>words(textOfArticle(a?.inquirer_article))-words(textOfArticle(b?.inquirer_article))||String(a?.team_name||'').localeCompare(String(b?.team_name||'')));
  return sorted[Math.floor((sorted.length-1)/2)]||null;
}

const samples={};
for(const id of REPORTER_IDS){
  const pool=(d?.teams||[]).filter(t=>String(t?.inquirer_article?.reporter?.id||'')===id);
  if(pool.length!==8)add(blockers,'reporter-count',`${REPORTERS[id]} should own 8 Week 2 articles; found ${pool.length}.`,{reporter:id});
  const t=medianSample(pool);samples[id]=t;
  if(!t)continue;
  const a=t.inquirer_article,text=textOfArticle(a),ss=sentences(text),snapAll=ss.filter(s=>SNAP.test(s)),routine=routineSnapSentences(text),ins=insightStats(text),interpreted=interpretedStats(text),mida=midaEvidence(t,text);
  const insightDensity=ss.length?ins.length/ss.length:0,interpretRate=ins.length?interpreted.length/ins.length:0;

  if(routine.length)add(blockers,'routine-snap-share',`${REPORTERS[id]} has routine snap commentary with no meaningful role-change context in ${t.team_name}.`,{reporter:id,team:t.team_name,sentences:routine});
  if(snapAll.length>Math.max(1,Math.floor(ins.length/4)))add(warnings,'snap-overweight',`${REPORTERS[id]} discusses snaps too often relative to other insightful stats in ${t.team_name}: ${snapAll.length} snap sentence(s) vs ${ins.length} insight-stat sentence(s).`,{reporter:id,team:t.team_name});
  if(insightDensity<0.18)add(blockers,'low-insight-density',`${REPORTERS[id]} sample ${t.team_name} is too commentary-heavy without enough specific football/fantasy evidence: ${(insightDensity*100).toFixed(1)}% insight-stat sentences.`,{reporter:id,team:t.team_name});
  if(interpretRate<0.55)add(blockers,'stat-dump',`${REPORTERS[id]} sample ${t.team_name} states too many stats without explaining why they matter: ${(interpretRate*100).toFixed(1)}% of stat sentences include interpretation.`,{reporter:id,team:t.team_name});
  if(materialMida(t)&&!mida.length)add(blockers,'missing-mida',`${REPORTERS[id]} sample ${t.team_name} has MIDA data but the article never uses a MIDA metric naturally.`,{reporter:id,team:t.team_name,mida:t.mida_outlook});
  if(/MIDA outlook\s*\(as of/i.test(text))add(blockers,'mechanical-mida',`${REPORTERS[id]} sample ${t.team_name} still uses the mechanical “MIDA outlook (as of …)” label instead of weaving MIDA into commentary.`,{reporter:id,team:t.team_name});
  if(BANNED_META.test(text))add(blockers,'meta-language',`${REPORTERS[id]} sample ${t.team_name} contains newsroom/app/meta language.`,{reporter:id,team:t.team_name,sentence:ss.find(s=>BANNED_META.test(s))});
  const sarcasmHits=ss.filter(s=>SARCASM[id]?.test(s));
  if(!sarcasmHits.length)add(warnings,'flat-voice',`${REPORTERS[id]} sample ${t.team_name} has no obvious reporter-specific sarcasm cue.`,{reporter:id,team:t.team_name});

  const management=sectionText(a,'management'),fans=sectionText(a,'fan-sentiment');
  if(management&&fans){
    const stop=new Set('the a an and or but to of in on for with is are was were be been this that it they them their from as at by into about'.split(' '));
    const bag=x=>new Set(String(x).toLowerCase().match(/[a-z][a-z'-]+/g)?.filter(w=>!stop.has(w)&&w.length>3)||[]);
    const A=bag(management),B=bag(fans),inter=[...A].filter(x=>B.has(x)).length,union=new Set([...A,...B]).size,j=union?inter/union:0;
    if(j>0.48)add(warnings,'management-fan-overlap',`${REPORTERS[id]} sample ${t.team_name} has Management and Fan Sentiment that are too semantically similar (${(j*100).toFixed(0)}% token overlap).`,{reporter:id,team:t.team_name});
  }

  notes.push({
    reporter:REPORTERS[id],reporter_id:id,team:t.team_name,words:words(text),sentences:ss.length,
    insight_stat_sentences:ins.length,interpreted_stat_sentences:interpreted.length,insight_density_pct:Number((insightDensity*100).toFixed(1)),
    interpretation_rate_pct:Number((interpretRate*100).toFixed(1)),snap_sentences:snapAll.length,routine_snap_sentences:routine.length,
    sarcasm_cues:sarcasmHits.length,mida_available:materialMida(t),mida_evidence_sentences:mida.length
  });
}

const overview=d?.league_overview||{},recapSections=overview?.sections||[],recapParagraphs=recapSections.flatMap(s=>s?.paragraphs||[]).filter(Boolean),recapText=recapParagraphs.join(' '),recapSentences=sentences(recapText);
if(recapParagraphs.length!==12)add(blockers,'recap-length',`Weekly Recap should have 12 focused paragraphs; found ${recapParagraphs.length}.`);
if(BANNED_META.test(recapText))add(blockers,'recap-meta-language','Weekly Recap contains newsroom/app/meta language.',{sentence:recapSentences.find(s=>BANNED_META.test(s))});
const recapInsight=insightStats(recapText),recapInterpreted=interpretedStats(recapText);
if(recapInsight.length<10)add(blockers,'recap-low-insight',`Weekly Recap needs at least 10 evidence-bearing comparative/stat sentences; found ${recapInsight.length}.`);
if(recapInsight.length&&recapInterpreted.length/recapInsight.length<0.7)add(blockers,'recap-stat-dump',`Weekly Recap is stating too many numbers without analysis: ${recapInterpreted.length}/${recapInsight.length} stat sentences interpreted.`);

const midaTeams=(d?.teams||[]).filter(materialMida);
const recapMida=midaTeams.flatMap(t=>midaEvidence(t,recapText).map(sentence=>({team:t.team_name,sentence})));
if(midaTeams.length>=4&&!recapMida.length)add(blockers,'recap-missing-mida',`Weekly Recap has ${midaTeams.length} teams with MIDA data but never uses MIDA to add league-level context.`);
if(/MIDA outlook\s*\(as of/i.test(recapText))add(blockers,'recap-mechanical-mida','Weekly Recap uses a mechanical MIDA label instead of natural commentary.');

const hotTakes=overview?.hot_takes||[];
const division=hotTakes.find(x=>/division board/i.test(String(x?.title||'')));
if(!division)add(blockers,'division-board-missing','Weekly Recap/Hot Takes is missing the Week 2 division board.');
else{
  const lines=String(division?.take||'').split(/\n/).map(x=>x.trim()).filter(x=>/^(?:AFC|NFC)\s+(?:EAST|NORTH|SOUTH|WEST):/i.test(x));
  if(lines.length!==8)add(blockers,'division-board-incomplete',`Division board should have eight division lines; found ${lines.length}.`);
  const allTeamNames=(d?.teams||[]).map(t=>String(t.team_name||''));
  const shapes=new Map();
  for(const line of lines){
    const rhs=line.includes('—')?line.split('—').slice(1).join('—'):line;
    const key=normalizeForRepeat(rhs,allTeamNames);
    const rows=shapes.get(key)||[];rows.push(line);shapes.set(key,rows);
  }
  for(const [shape,rows] of shapes){
    if(rows.length>=2)add(blockers,'division-board-repetition',`Division board repeats the same commentary structure ${rows.length} times instead of adding division-specific insight.`,{shape,lines:rows});
  }
  const nearestChaser=lines.filter(x=>/nearest chaser/i.test(x));
  const ledScoring=lines.filter(x=>/led the tied pair|led the tied trio|scored .* in Week 2/i.test(x));
  if(nearestChaser.length>=3)add(blockers,'division-board-nearest-chaser-template',`“nearest chaser” is repeated across ${nearestChaser.length} division lines; replace standings narration with distinct insight.`);
  if(ledScoring.length>=4)add(blockers,'division-board-score-template',`Week 2 scoring commentary is repeated across ${ledScoring.length} division lines; each division needs a different reason the race matters.`);
}

// Cross-sample canned sentence detection. Replace team + starter names and numbers so
// cosmetic substitutions do not hide the same sentence template.
const repeatRows=[];
for(const [id,t] of Object.entries(samples)){
  if(!t)continue;
  const names=[t.team_name,t.opponent_name,...(t?.starter_details||[]).map(p=>p?.name),...(t?.bench_details||[]).map(p=>p?.name)].filter(Boolean);
  for(const s of sentences(textOfArticle(t.inquirer_article))){if(words(s)>=9)repeatRows.push({scope:REPORTERS[id]+' / '+t.team_name,s,key:normalizeForRepeat(s,names)});}
}
for(const s of recapSentences){if(words(s)>=9)repeatRows.push({scope:'Weekly Recap',s,key:normalizeForRepeat(s,(d?.teams||[]).map(t=>t.team_name))});}
const byKey=new Map();for(const row of repeatRows){const rows=byKey.get(row.key)||[];rows.push(row);byKey.set(row.key,rows);}
for(const [shape,rows] of byKey){const scopes=[...new Set(rows.map(r=>r.scope))];if(scopes.length>=2)add(blockers,'cross-sample-template',`The same long commentary skeleton appears in multiple audited scopes: ${scopes.join(' | ')}`,{shape,examples:rows.slice(0,4).map(r=>r.s)});}

// Broad freeze-readiness catches that are not tied to the user's latest examples.
const allAuditText=[recapText,...Object.values(samples).filter(Boolean).map(t=>textOfArticle(t.inquirer_article))].join(' ');
const awkward=/\b(?:useful production|useful player line|clean test|competitive math|scoring profile|one completed Sunday|management puzzle|stands on its own|does not need decoration|the next question is whether|prior baseline|established baseline)\b/i;
if(awkward.test(allAuditText))add(blockers,'awkward-scaffolding','Audited copy still contains retired scaffolding language.',{sentence:sentences(allAuditText).find(s=>awkward.test(s))});
const supportMotif=/\b(?:one-man show|one player carrying|supporting cast|solo effort|second punch|third scorer|keeping the roster afloat|everyone else.*passenger)\b/i;
if(supportMotif.test(allAuditText))add(blockers,'support-motif','Audited copy revives the retired one-player/supporting-cast motif.',{sentence:sentences(allAuditText).find(s=>supportMotif.test(s))});

const score={
  ready_to_freeze:blockers.length===0,
  blockers:blockers.length,
  warnings:warnings.length,
  sampled_articles:notes,
  weekly_recap:{paragraphs:recapParagraphs.length,sentences:recapSentences.length,insight_stat_sentences:recapInsight.length,interpreted_stat_sentences:recapInterpreted.length,mida_teams_available:midaTeams.length,mida_evidence_sentences:recapMida.length},
  blockers_detail:blockers,
  warnings_detail:warnings
};

console.log(JSON.stringify(score,null,2));
if(blockers.length){
  console.error(`\nWEEK 2 NOT READY TO FREEZE: ${blockers.length} blocker(s), ${warnings.length} warning(s).`);
  process.exitCode=1;
}else{
  console.log(`\nWEEK 2 READY TO FREEZE: 0 blockers, ${warnings.length} warning(s).`);
}
