import fs from 'node:fs';

const args=process.argv.slice(2);
const input=args.find(x=>!x.startsWith('--'))||'/tmp/week2-inquirer.json';
const argValue=name=>{
  const i=args.indexOf(name);
  return i>=0?args[i+1]:null;
};
const outPath=argValue('--out');
const jsonPath=argValue('--json');
const strict=args.includes('--strict');

const edition=JSON.parse(fs.readFileSync(input,'utf8'));
if(Number(edition?.week)!==2)throw new Error('This audit is for Week 2; received week='+edition?.week);

const teams=Array.isArray(edition?.teams)?edition.teams:[];
const overview=edition?.league_overview||{};
const reporters=[...new Map(teams.map(t=>[String(t?.inquirer_article?.reporter?.id||''),t?.inquirer_article?.reporter]).filter(([id])=>id)).values()];

const one=v=>Number.isFinite(Number(v))?Number(v).toFixed(1):'n/a';
const pct=v=>Number.isFinite(Number(v))?Number(v).toFixed(1)+'%':'n/a';
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean);
const wordCount=s=>words(s).length;
const sentenceParts=s=>String(s||'')
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const textOfArticle=t=>(t?.inquirer_article?.sections||[]).flatMap(s=>s?.paragraphs||[]).join(' ');
const textOfRecap=()=>[
  ...(overview?.sections||[]).flatMap(s=>[s?.heading,...(s?.paragraphs||[])]),
  ...(overview?.hot_takes||[]).flatMap(x=>[x?.title,x?.take])
].filter(Boolean).join(' ');
const norm=s=>String(s||'').toLowerCase()
  .replace(/\b\d+(?:\.\d+)?%?\b/g,'[#]')
  .replace(/\b(?:week|wk)\s*[#]?\d+\b/g,'week [#]')
  .replace(/\s+/g,' ').trim();
const section=t=>kind=>(t?.inquirer_article?.sections||[]).find(s=>String(s?.kind||'')===kind);
const recordOf=t=>{
  const r=t?.league_context?.record||{};
  return [Number(r.wins)||0,Number(r.losses)||0,Number(r.ties)||0].filter((_,i)=>i<2||Number(r.ties)).join('-');
};
const sameDivisionNext=t=>{
  const a=String(t?.division_context?.division_name||t?.division_name||'').trim().toLowerCase();
  const b=String(t?.next_opponent_division_context?.division_name||'').trim().toLowerCase();
  return Boolean(a&&b&&a===b);
};
const teamNames=teams.map(t=>String(t?.team_name||'')).filter(Boolean).sort((a,b)=>b.length-a.length);
const playerNames=teams.flatMap(t=>(t?.starter_details||[]).map(p=>String(p?.name||''))).filter(Boolean).sort((a,b)=>b.length-a.length);

function finding(scope,severity,id,message,evidence=''){
  return{scope,severity,id,message,evidence:String(evidence||'').trim()};
}
function countMatches(text,re){
  const m=String(text||'').match(re);
  return m?m.length:0;
}
function namesMentioned(text,names){
  return names.filter(n=>n&&String(text||'').toLowerCase().includes(n.toLowerCase()));
}
function humorSignals(text){
  const re=/\b(?:joke|punchline|punch line|panic|riot|riots|pitchfork|fire alarm|flowers|good china|coat check|furniture|wine|bill|table|lunch money|trash|hostage|siren|megaphone|heckl\w*|swagger|chaos|ridiculous|roast|meltdown|circus|funeral|parade|therapy|crime scene|alarm|mess|brag|chirp\w*|yell\w*|scream\w*|caps lock|group chat|meme\w*|receipts?|wet matches|folding chairs|gift-wrapped|weaponize|insufferable|crowbar|floorboard|water heater|smoke detector|breaker box|subscription service|flooded basement|coroner|elevator)\b/gi;
  return countMatches(text,re);
}
function behaviorSignals(text){
  const re=/\b(?:riot\w*|pitchfork\w*|torch\w*|boo\w*|chant\w*|call-in|lineup screenshot\w*|lineup poll\w*|meme\w*|receipt\w*|parade\w*|jersey\w*|waiver\w*|bench\w*|panic\w*|siren\w*|meltdown\w*|celebrat\w*|tailgate\w*|group chat\w*|emergency meeting\w*|petition\w*|applau\w*|cheer\w*|heckl\w*|rage\w*|copium|swagger|grumbl\w*|demand\w*|argument\w*|yell\w*|chirp\w*|roast\w*|funeral\w*|therapy|boycott\w*|burn\w*|storm\w*|mob\w*|revolt\w*)\b/gi;
  return countMatches(text,re);
}
function contextSignals(text){
  const re=/\b(?:playoff|postseason|championship|title|division|expected wins|standings|rank|no\.\s*\d+|tiebreak|head-to-head|separation|league order|MIDA|%|schedule|record|favorite|underdog)\b/gi;
  return countMatches(text,re);
}
function recursiveNumericFacts(obj,path='trade',depth=0,out=[]){
  if(depth>6||obj==null)return out;
  if(Array.isArray(obj)){obj.forEach((x,i)=>recursiveNumericFacts(x,path+'['+i+']',depth+1,out));return out;}
  if(typeof obj!=='object')return out;
  for(const [k,v] of Object.entries(obj)){
    const p=path+'.'+k;
    if(typeof v==='number'&&Number.isFinite(v)&&/(?:value|adjust|grade|score|delta|edge|margin|rank|percent|pct)/i.test(k))out.push({path:p,value:v});
    else if(v&&typeof v==='object')recursiveNumericFacts(v,p,depth+1,out);
  }
  return out;
}
function teamContext(t){
  const div=t?.division_context||{},m=t?.mida_outlook||{},nm=t?.next_opponent_mida||{};
  const peers=[...(div?.ahead_teams||[]),...(div?.same_record_teams||[]),...(div?.behind_teams||[])];
  return{
    roster_id:t?.roster_id,
    team:t?.team_name,
    reporter:t?.inquirer_article?.reporter?.name||t?.inquirer_article?.reporter?.id,
    record:recordOf(t),
    league_rank:t?.league_context?.standings_rank??null,
    playoff_line:t?.league_context?.playoff_teams??null,
    division:div?.division_name||t?.division_name||null,
    division_rank:div?.division_rank??null,
    division_leaders:(div?.leaders||[]).map(x=>({team:x.team_name,record:x.record})),
    division_peers:peers.map(x=>({team:x.team_name,record:x.record,rank:x.standings_rank??null})),
    mida:m&&Object.keys(m).length?{
      playoff:pct(m.playoff),title:pct(m.title),division:pct(m.division),expected_wins:one(m.expected_wins),source_date:m.source_date||null
    }:null,
    next_opponent:t?.next_opponent_name||null,
    next_opponent_record:t?.next_opponent_context?.record||null,
    next_opponent_rank:t?.next_opponent_context?.standings_rank??null,
    next_is_divisional:sameDivisionNext(t),
    next_opponent_mida:nm&&Object.keys(nm).length?{
      playoff:pct(nm.playoff),title:pct(nm.title),division:pct(nm.division),expected_wins:one(nm.expected_wins),source_date:nm.source_date||null
    }:null,
    upcoming:(t?.upcoming_opponents||[]).slice(0,4).map(x=>({
      week:x.week,team:x.team_name,record:x?.context?.record||null,rank:x?.context?.standings_rank??null,
      division:x?.division_context?.division_name||null,
      mida:x?.mida?{playoff:pct(x.mida.playoff),title:pct(x.mida.title),division:pct(x.mida.division),expected_wins:one(x.mida.expected_wins)}:null
    })),
    current_week_trade_count:Number(t?.current_week_trade_count)||0,
    trades:(t?.trade_history||[]).map(tr=>({
      week:tr?.week??null,
      created:tr?.created_at??tr?.status_updated??null,
      team_names:tr?.team_names||null,
      value_facts:recursiveNumericFacts(tr).slice(0,24)
    })),
    key_players:(t?.starter_details||[]).slice().sort((a,b)=>Number(b?.points)-Number(a?.points)).slice(0,5).map(p=>({
      name:p.name,position:p.position||null,nfl_team:p.team||p.nfl_team||null,week2:one(p.points),week1:one(p?.recent_form?.series?.find?.(x=>Number(x.week)===1)?.points),prior_season_avg:one(p.prior_season_avg),real_stat_line:p.real_stat_line||null
    }))
  };
}
function sampleScore(t){
  const a=t?.inquirer_article||{};
  const copy=textOfArticle(t);
  let n=0;
  if(sameDivisionNext(t))n+=8;
  if((t?.trade_history||[]).length)n+=8;
  if(Number(t?.current_week_trade_count)>0)n+=3;
  if(t?.mida_outlook)n+=4;
  if(t?.next_opponent_mida)n+=3;
  if((t?.starter_details||[]).some(p=>Number(p?.points)<=1))n+=4;
  if((a?.sections||[]).some(s=>s?.kind==='trade-commentary'))n+=4;
  if(/a useful NFL role without a complete stat line|stat line/i.test(copy))n+=5;
  if(section(t)('sentiment'))n+=2;
  return n;
}
const samples=reporters.map(r=>{
  const pool=teams.filter(t=>String(t?.inquirer_article?.reporter?.id||'')===String(r?.id||''));
  return pool.slice().sort((a,b)=>sampleScore(b)-sampleScore(a)||Number(a.roster_id)-Number(b.roster_id))[0];
}).filter(Boolean);

function auditTeam(t){
  const scope='team:'+t.team_name;
  const copy=textOfArticle(t);
  const findings=[];
  const add=(sev,id,msg,evidence='')=>findings.push(finding(scope,sev,id,msg,evidence));

  const defenseBad=copy.match(/\b(?:started|starting|start)\s+(?:a|the|your)?\s*(?:team\s+)?defen[cs]e\b|\bD\/?ST\b|\bteam defen[cs]e\b/gi)||[];
  if(defenseBad.length)add('FAIL','league-format-team-defense','Team-defense language conflicts with this league, which starts IDPs rather than a team defense.',defenseBad.join(' | '));

  const metaRe=/\b(?:a useful NFL role without a complete stat line|without a complete stat line|complete player-level scoring benchmark|player-level scoring benchmark|invent(?:ing)? a matchup-specific story|context available|data is unavailable|historical player snapshot unavailable|overall value exchanged:\s*n\/a|the useful question|the useful part|the next edition|abstract asset lecture|not because i needed another adjective|this paragraph|this section|this article|the writer|the reporter)\b/gi;
  const meta=copy.match(metaRe)||[];
  if(meta.length)add('FAIL','meta-writing-language','Article contains prose about missing data/writing mechanics instead of football commentary.',[...new Set(meta)].join(' | '));

  for(const p of (t?.starter_details||[])){
    if(Number(p?.points)>0.05||!p?.name)continue;
    const sentences=sentenceParts(copy).filter(s=>s.toLowerCase().includes(String(p.name).toLowerCase()));
    const contradictory=sentences.filter(s=>/\b(?:second punch|live wire|real scorer|useful support|supporting score|working outlet|headline score|did the work|meaningful production|gave .* another score|production held up)\b/i.test(s));
    if(contradictory.length)add('FAIL','zero-point-positive-contradiction',p.name+' scored '+one(p.points)+' but is described as if producing positive scoring value.',contradictory.join(' || '));
  }

  const sent=section(t)('sentiment');
  const sentCopy=(sent?.paragraphs||[]).join(' ');
  const behavior=behaviorSignals(sentCopy),humor=humorSignals(sentCopy);
  if(sent&&behavior<2)add('WARN','fan-behavior-thin','Fan sentiment names a mood but does not show enough concrete supporter behavior. Need a wider gamut: celebration, lineup wars, boos, panic, riots/meltdown, memes, demands, etc.','behavior_signals='+behavior+'; '+sentCopy);
  if(sent&&humor<1)add('WARN','fan-sentiment-not-sarcastic','Fan sentiment has little detectable sarcastic/comedic behavior language.',sentCopy);

  const outlook=section(t)('outlook');
  const outlookCopy=(outlook?.paragraphs||[]).join(' ');
  if(Number.isFinite(Number(t?.next_projected))&&Number.isFinite(Number(t?.next_opponent_projected))){
    const own=Number(t.next_projected).toFixed(1),opp=Number(t.next_opponent_projected).toFixed(1);
    if(!outlookCopy.includes(own)||!outlookCopy.includes(opp))add('FAIL','week3-projected-totals-missing','Next Week outlook must state both teams’ projected scoring totals when available.','expected '+own+' and '+opp+'; '+outlookCopy);
    if(!/\b(?:favorite|favored|edge|dead even|projection favorite)\b/i.test(outlookCopy))add('FAIL','week3-projection-not-interpreted','Next Week outlook states projections but does not explain which team appears favored or how close the edge is.',outlookCopy);
  }
  if(sameDivisionNext(t)){
    const stakes=/\b(?:head-to-head|division lead|division race|separation|playoff|postseason|guarantee|automatic|tiebreak|direct rival|limited|inside track|control of the division|two-game swing)\b/i;
    if(!stakes.test(outlookCopy))add('FAIL','divisional-week3-stakes','Next opponent is a division rival, but the outlook does not translate that into concrete team-context stakes.',outlookCopy);
  }

  const trade=section(t)('trade-commentary');
  if(trade){
    const tradeCopy=(trade?.paragraphs||[]).join(' ');
    const obvious=/\b(?:future side|parked in draft capital|cannot score now|deferred draft capital|used in a future draft or moved|current roster value|operating on different timelines|those are the actual terms)\b/i;
    if(obvious.test(tradeCopy))add('WARN','trade-obvious-explainer','Trade commentary spends space stating obvious mechanics instead of evaluating the deal.',tradeCopy);
    const applicable=(t?.trade_history||[]).filter(tr=>(tr?.sides||[]).length>=2&&(tr.sides||[]).every(side=>{
      const players=(side?.player_ids||[]),picks=(side?.picks||[]);
      return (players.length===0||side?.then_players_complete===true)&&(picks.length===0||side?.then_picks_complete===true)&&
        Number.isFinite((Number(side?.then_player_total)||0)+(Number(side?.then_pick_total)||0));
    }));
    const facts=applicable.flatMap(tr=>(tr?.sides||[]).map(side=>({
      roster_id:side.roster_id,
      then_player_total:Number(side?.then_player_total)||0,
      then_pick_total:Number(side?.then_pick_total)||0,
      total:(Number(side?.then_player_total)||0)+(Number(side?.then_pick_total)||0)
    })));
    const hasValueOpinion=/\b(?:fleec\w*|won the trade|lost the trade|value points?|value edge|surplus|deficit|overpaid|underpaid|robbed|stole|gave away|priced almost even|fit bet)\b/i.test(tradeCopy);
    const numericValue=/\b\d+(?:\.\d+)?\s+(?:value\s+)?points?\b/i.test(tradeCopy);
    if(facts.length&&!hasValueOpinion&&!numericValue)add('FAIL','trade-value-not-used','Historical all-asset trade values are complete, but the reporter does not evaluate who gained/lost value.',JSON.stringify(facts.slice(0,12)));
  }

  const articleHumor=humorSignals(copy),articleWords=wordCount(copy);
  const recapHumor=humorSignals(textOfRecap()),recapWords=Math.max(1,wordCount(textOfRecap()));
  const articleDensity=articleHumor/Math.max(1,articleWords)*1000,recapDensity=recapHumor/recapWords*1000;
  if(articleDensity<recapDensity*0.55)add('WARN','team-humor-gap','This team article is materially less witty/sarcastic by proxy than the weekly recap. Preserve reporting depth but close the voice gap.','article_humor_per_1000='+articleDensity.toFixed(1)+'; recap='+recapDensity.toFixed(1));

  const genericKnown=[
    /the next result carries more weight than the current order/i,
    /one sunday can reorder the whole group/i,
    /week 3 can create separation/i,
    /there is nowhere to hide a september result/i,
    /the next result has direct standings weight/i
  ];
  const genericHits=genericKnown.flatMap(re=>sentenceParts(copy).filter(s=>re.test(s)));
  if(genericHits.length)add('WARN','generic-division-outlook-scaffold','Article still contains division/outlook scaffolding that could be pasted onto many teams.',genericHits.join(' || '));

  return{
    team:t.team_name,
    reporter:t?.inquirer_article?.reporter,
    sample_score:sampleScore(t),
    word_count:wordCount(copy),
    humor_signals:articleHumor,
    behavior_signals:behaviorSignals(copy),
    context_signals:contextSignals(copy),
    findings,
    context:teamContext(t)
  };
}

function divisionBoardText(){
  const all=[...(overview?.sections||[]).flatMap(s=>s?.paragraphs||[]),...(overview?.hot_takes||[]).map(x=>x?.take||'')];
  return all.find(x=>/\bAFC EAST:/i.test(String(x))&&/\bNFC WEST:/i.test(String(x)))||'';
}
function auditRecap(){
  const scope='weekly-recap';
  const copy=textOfRecap();
  const findings=[];
  const add=(sev,id,msg,evidence='')=>findings.push(finding(scope,sev,id,msg,evidence));

  const defenseBad=copy.match(/\b(?:started|starting|start)\s+(?:a|the|your)?\s*(?:team\s+)?defen[cs]e\b|\bD\/?ST\b|\bteam defen[cs]e\b/gi)||[];
  if(defenseBad.length)add('FAIL','league-format-team-defense','Weekly recap uses team-defense language that does not fit the league format.',defenseBad.join(' | '));

  // Word count is a quality signal, not an exact target. Only flag major compression for review.
  if(wordCount(copy)<2250)add('WARN','recap-major-compression','Weekly recap is more than roughly 25% shorter than the 3,014-word pre-rewrite reference. Review for lost substance; do not pad to match a number.','current='+wordCount(copy)+'; reference=3014');

  const recapMeta=/\b(?:roll call|useful examples?|the useful question|the useful part|the pick is about|desire to be cute|without turning .* into a spreadsheet|this paragraph|this section|this recap|the writer|the reporter|abstract asset lecture|not because i needed another adjective|not one argument copied)\b/i;
  const recapMetaHits=sentenceParts(copy).filter(x=>recapMeta.test(x));
  if(recapMetaHits.length)add('FAIL','recap-meta-language','Weekly recap contains editorial-process/meta language instead of in-world reporting.',recapMetaHits.join(' || '));

  const staleTradeExplainer=/\b(?:chose the future side|parked in draft capital|delayed value rather than immediate lineup help|nothing honest to grade from a Week 2 box score yet|cannot score a fantasy point this September|judgment belongs to a future roster decision|future optionality, not Week 2 production)\b/i;
  if(staleTradeExplainer.test(copy))add('FAIL','recap-trade-obvious-explainer','Weekly recap still states obvious draft-pick mechanics instead of evaluating the deal.',sentenceParts(copy).filter(x=>staleTradeExplainer.test(x)).join(' || '));
  const uniqueTrades=new Map();
  for(const t of teams)for(const tr of t?.trade_history||[]){const id=String(tr?.id||'');if(id&&!uniqueTrades.has(id))uniqueTrades.set(id,tr)}
  const valueReady=[...uniqueTrades.values()].filter(tr=>(tr?.sides||[]).length>=2&&(tr.sides||[]).every(side=>{
    const players=side?.player_ids||[],picks=side?.picks||[];
    return (players.length===0||side?.then_players_complete===true)&&(picks.length===0||side?.then_picks_complete===true);
  }));
  if(valueReady.length){
    const valueSentences=sentenceParts(copy).filter(x=>/\b(?:value points?|value edge|fleec\w*|priced almost even|fit bet)\b/i.test(x));
    if(valueSentences.length<valueReady.length)add('FAIL','recap-trade-value-not-used','Weekly recap has complete historical all-asset values for '+valueReady.length+' trade(s) but does not evaluate each applicable receipt.','value_sentences='+valueSentences.length+'; trades='+valueReady.length+'; '+valueSentences.join(' || '));
  }

  const sections=overview?.sections||[];
  const velvet=sections.find(s=>/velvet rope|entered the room/i.test(String(s?.heading||'')));
  const velvetCopy=(velvet?.paragraphs||[]).join(' ');
  const positiveMover=teams.filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))&&Number(t.value_history_week.delta)>0).slice().sort((a,b)=>Number(b.value_history_week.delta)-Number(a.value_history_week.delta))[0]||null;
  const negativeMover=teams.filter(t=>Number.isFinite(Number(t?.value_history_week?.delta))&&Number(t.value_history_week.delta)<0).slice().sort((a,b)=>Number(a.value_history_week.delta)-Number(b.value_history_week.delta))[0]||null;
  if(positiveMover){
    if(!velvetCopy.includes(String(positiveMover.team_name||'')))add('FAIL','velvet-biggest-positive-mover-missing','“Week 2 Has Entered the Room” must name the league’s biggest positive value mover from value history.',String(positiveMover.team_name)+' delta='+one(positiveMover.value_history_week.delta));
    if(!/biggest positive value mover/i.test(velvetCopy))add('WARN','velvet-positive-mover-context-thin','The positive value leader is named but not clearly identified as the biggest positive mover.',velvetCopy);
  }
  if(negativeMover){
    if(!velvetCopy.includes(String(negativeMover.team_name||'')))add('FAIL','velvet-biggest-negative-mover-missing','“Week 2 Has Entered the Room” must name the league’s biggest negative value mover from value history.',String(negativeMover.team_name)+' delta='+one(negativeMover.value_history_week.delta));
    if(!/biggest negative value mover/i.test(velvetCopy))add('WARN','velvet-negative-mover-context-thin','The negative value leader is named but not clearly identified as the biggest negative mover.',velvetCopy);
  }

  const twoWeeks=[...sections,...sections.flatMap(s=>s?.blocks||[])].find(s=>/two weeks/i.test(String(s?.heading||'')));
  if(twoWeeks){
    const twoWeeksCopy=(twoWeeks?.paragraphs||[]).join(' '),twoWeeksWords=wordCount(twoWeeksCopy);
    const universalDivision=sentenceParts(twoWeeksCopy).filter(x=>/\b(?:division game|division test|head-to-head division|inside AFC|inside NFC|direct rival|AFC EAST|AFC NORTH|AFC SOUTH|AFC WEST|NFC EAST|NFC NORTH|NFC SOUTH|NFC WEST)\b/i.test(x));
    if(universalDivision.length)add('FAIL','two-weeks-division-overuse','“What two weeks are starting to say” should explain Weeks 1-2, not preview the universal Week 3 divisional slate.',universalDivision.join(' || '));
    if(twoWeeksWords>550)add('FAIL','two-weeks-too-long','“What two weeks are starting to say” has become too long for a league-level synthesis; use selective examples and broader context instead of mini team articles.','words='+twoWeeksWords);
    const mentioned=namesMentioned(twoWeeksCopy,teamNames);
    if(mentioned.length>8)add('FAIL','two-weeks-too-team-by-team','“What two weeks are starting to say” names too many teams and is drifting back into a league roll call.','teams='+mentioned.length+'; '+mentioned.join(', '));
    const nums=twoWeeksCopy.match(/\b\d+(?:\.\d+)?%?\b/g)||[],density=nums.length/Math.max(1,twoWeeksWords)*100;
    if(density>3.2)add('WARN','two-weeks-stat-dense','League synthesis is carrying too many numbers relative to commentary. Keep only figures that support the broader Week 1-2 read.','numbers='+nums.length+'; words='+twoWeeksWords+'; per100='+density.toFixed(1));
    for(const p of twoWeeks?.paragraphs||[]){
      const namedTeams=namesMentioned(p,teamNames);
      if(namedTeams.length>=4&&contextSignals(p)<2)add('WARN','two-weeks-generic-list','League synthesis lists many teams without enough broader context.',p);
    }
  }else add('FAIL','two-weeks-missing','Could not find the “What Two Weeks Are Starting to Say” recap block.');

  const board=divisionBoardText();
  if(board){
    const lines=String(board).split('\n').map(x=>x.trim()).filter(x=>/^(?:AFC|NFC)\s+(?:EAST|NORTH|SOUTH|WEST):/i.test(x));
    const tails=lines.map(x=>x.split(/\s+—\s+/).slice(1).join(' — ')).filter(Boolean);
    const counts=new Map();
    for(const tail of tails){const k=norm(tail);counts.set(k,(counts.get(k)||0)+1);}
    const repeats=[...counts.entries()].filter(([,n])=>n>1);
    if(repeats.length)add('FAIL','division-board-repetition','Division Board repeats the same normalized commentary across divisions instead of using each race’s actual competitors and leverage.',JSON.stringify(repeats));
    const staleBoardPhrases=['has the lane','first car in the mirror','jammed together','no standings separation','first head-to-head slip','clean rival win','traffic for traffic','has not broken away','current separation over'];
    for(const phrase of staleBoardPhrases){
      const hits=lines.filter(x=>x.toLowerCase().includes(phrase));
      if(hits.length>=2)add('FAIL','division-board-repeated-scaffold','Division Board still repeats the old “'+phrase+'” scaffold across divisions.',hits.join(' || '));
    }
    const contextual=lines.filter(x=>/\b(?:playoff|title|championship|MIDA|%|expected wins|rank|chasing|ahead of|behind|head-to-head|separation|two-game swing|inside track|probability|forecast|front-runner|cushion|chase)\b/i.test(x)).length;
    if(lines.length>=8&&contextual<6)add('WARN','division-board-context-thin','Most Division Board entries do not use available contender/challenger/MIDA context.','contextual_lines='+contextual+'/'+lines.length+'\n'+lines.join('\n'));
  }else add('FAIL','division-board-missing','Could not locate the eight-division board in the weekly recap.');

  const hot=overview?.hot_takes||[];
  const titles=hot.map(x=>String(x?.title||''));
  if(titles.some(x=>/player flag/i.test(x)))add('FAIL','hot-take-player-flag','Weekly player flag still exists; requested replacement is Player of the Week.',titles.filter(x=>/player flag/i.test(x)).join(' | '));
  if(!titles.some(x=>/player of the week/i.test(x)))add('FAIL','hot-take-player-of-week-missing','No “Player of the Week” hot take exists.');
  if(titles.some(x=>/league trend/i.test(x)))add('FAIL','hot-take-league-trend','“League trend” remains and duplicates broader recap material.',titles.filter(x=>/league trend/i.test(x)).join(' | '));
  if(!titles.some(x=>/breakout player to watch/i.test(x)))add('FAIL','hot-take-breakout-missing','No “Breakout Player to Watch” hot take exists.');

  const upset=hot.find(x=>/upset call/i.test(String(x?.title||'')));
  if(upset){
    const take=String(upset?.take||''),sents=sentenceParts(take);
    const named=namesMentioned(take,teamNames),players=namesMentioned(take,playerNames);
    if(sents.length<3)add('WARN','upset-call-too-shallow','Upset call needs a real argument, not a one-sentence underdog preference.','sentences='+sents.length+'; '+take);
    if(named.length<2)add('FAIL','upset-call-missing-both-teams','Upset call should explicitly compare the underdog and favorite.',take);
    if(contextSignals(take)<2&&players.length===0)add('WARN','upset-call-context-free','Upset rationale does not use team context, MIDA, roster shape or a relevant player without becoming a stat dump.',take);
    if(/\b(?:the pick is about|desire to be cute|i did not pick|i didn't pick|without turning .* into a spreadsheet)\b/i.test(take))add('FAIL','upset-call-meta-language','Upset call explains the columnist’s selection process instead of making the football argument in voice.',take);
    if(humorSignals(take)<1)add('WARN','upset-call-voice-too-straight','Upset call has context but not enough sarcastic/humorous columnist voice.',take);
  }else add('FAIL','upset-call-missing','No Week 3 upset call was found.');

  const genericKnown=[
    /those starts are not identical/i,
    /some are star-driven, some are deeper/i,
    /the teams that stay there will need familiar production/i,
    /one more win and the rest of the division starts chasing for real/i,
    /that is a traffic jam, and week 3 gets the first chance to start clearing it/i
  ];
  const genericHits=genericKnown.flatMap(re=>sentenceParts(copy).filter(s=>re.test(s)));
  if(genericHits.length)add('WARN','known-generic-recap-language','Weekly recap contains known generic commentary that is not sufficiently grounded in the named teams.',genericHits.join(' || '));

  return{
    word_count:wordCount(copy),
    humor_signals:humorSignals(copy),
    behavior_signals:behaviorSignals(copy),
    context_signals:contextSignals(copy),
    findings
  };
}

const teamAudits=samples.map(auditTeam);
const recapAudit=auditRecap();
const lengthReferenceFindings=[];
const lengthReferences=new Map([
  ['Denver Doncos',840],
  ['New York Giants',894],
  ['New England Patriots',857],
  ['New York Jets',971]
]);
for(const t of teams){
  const reference=lengthReferences.get(String(t?.team_name||''));
  if(!reference)continue;
  const current=wordCount(textOfArticle(t));
  if(current<reference*0.75)lengthReferenceFindings.push(finding('team:'+t.team_name,'WARN','article-major-compression','Article is more than 25% shorter than the pre-rewrite reference. Review for lost reporting depth; do not pad merely to match the old count.','current='+current+'; reference='+reference));
}
const allFindings=[...recapAudit.findings,...teamAudits.flatMap(x=>x.findings),...lengthReferenceFindings];
const counts={
  FAIL:allFindings.filter(x=>x.severity==='FAIL').length,
  WARN:allFindings.filter(x=>x.severity==='WARN').length
};

function renderArticle(t){
  const a=t?.inquirer_article||{};
  const lines=[
    '### '+t.team_name+' — '+(a?.reporter?.name||a?.reporter?.id||'Unknown reporter'),
    '',
    '**Headline:** '+String(a?.headline||''),
    '',
    '**Context packet**',
    '',
    '~~~json',
    JSON.stringify(teamContext(t),null,2),
    '~~~',
    ''
  ];
  for(const s of a?.sections||[]){
    lines.push('#### '+String(s?.heading||s?.kind||'Section')+' ['+String(s?.kind||'')+']','');
    for(const p of s?.paragraphs||[])lines.push(String(p),'');
  }
  return lines.join('\n');
}
function renderRecap(){
  const lines=['## Weekly Recap — full sampled copy',''];
  lines.push('**Headline:** '+String(overview?.headline||''),'');
  for(const s of overview?.sections||[]){
    lines.push('### '+String(s?.heading||'Section')+(s?.reporter?.name?' — '+s.reporter.name:''),'');
    for(const p of s?.paragraphs||[])lines.push(String(p),'');
  }
  lines.push('### Hot Takes','');
  for(const h of overview?.hot_takes||[])lines.push('**'+String(h?.title||h?.kind||'Hot take')+'**',String(h?.take||''),'');
  return lines.join('\n');
}
function renderFindings(title,rows){
  const lines=['## '+title,''];
  if(!rows.length)return lines.concat(['No findings.','']).join('\n');
  for(const f of rows){
    lines.push('- **'+f.severity+' · '+f.id+'** — '+f.message);
    if(f.evidence)lines.push('  - Evidence: '+f.evidence.replace(/\n/g,' / '));
  }
  lines.push('');
  return lines.join('\n');
}

const report=[
  '# Fleeced! Week 2 Deep Editorial Sample Audit',
  '',
  'This is a diagnostic sampling audit. It deliberately selects one high-information article per reporter (favoring trades, divisional Week 3 games, MIDA context, low-scoring player edge cases, and sentiment sections) plus the full Week 2 weekly recap.',
  '',
  '**Edition:** Week '+edition.week+' · Inquirer V'+String(overview?.inquirer_version??edition?.inquirer_version??'n/a'),
  '',
  '**Findings:** '+counts.FAIL+' FAIL · '+counts.WARN+' WARN',
  '',
  '**Sampled reporters/teams:** '+samples.map(t=>(t?.inquirer_article?.reporter?.name||t?.inquirer_article?.reporter?.id)+' → '+t.team_name+' ('+wordCount(textOfArticle(t))+' words)').join('; '),
  '',
  '## Audit objectives',
  '',
  '- Enforce the actual league format: no team-defense/DST assumptions in an IDP league.',
  '- Expose generic recap/division commentary that ignores available league rank, competitors, transactions, schedule and MIDA probabilities.',
  '- Require trade commentary to move past pick mechanics and use value differential when that information is available.',
  '- Replace “player flag” with Player of the Week and “league trend” with Breakout Player to Watch.',
  '- Require upset calls to explain *why* the underdog can win using team context/MIDA/roster shape while avoiding stat overload.',
  '- Catch player sentences that contradict the player’s actual fantasy output or talk about missing data/stat-line mechanics.',
  '- Audit fan sentiment for concrete, varied, sarcastic supporter behavior rather than a generic mood adjective.',
  '- Check divisional Week 3 outlooks for context-aware stakes (race leverage, head-to-head swing, playoff path), not merely “division games matter.”',
  '- Require both Week 3 projected scoring totals and an in-voice explanation of which team the projection favors when those totals are available.',
  '- Treat word count as a depth diagnostic rather than a target; remove repetition without collapsing reporting substance.',
  '',
  renderFindings('Weekly recap findings',recapAudit.findings),
  ...teamAudits.map(x=>renderFindings(x.reporter?.name+' / '+x.team+' findings',x.findings)),
  renderRecap(),
  '## One team article from each reporter',
  '',
  ...samples.map(renderArticle),
  '## Machine-readable baseline',
  '',
  '~~~json',
  JSON.stringify({
    generated_at:new Date().toISOString(),
    week:edition.week,
    version:overview?.inquirer_version??edition?.inquirer_version??null,
    recap:{word_count:recapAudit.word_count,humor_signals:recapAudit.humor_signals,context_signals:recapAudit.context_signals},
    samples:teamAudits.map(x=>({team:x.team,reporter_id:x.reporter?.id,reporter:x.reporter?.name,word_count:x.word_count,humor_signals:x.humor_signals,behavior_signals:x.behavior_signals,context_signals:x.context_signals,sample_score:x.sample_score})),
    findings:counts
  },null,2),
  '~~~',
  ''
].join('\n');

if(outPath)fs.writeFileSync(outPath,report);
else process.stdout.write(report+'\n');

const json={
  ok:counts.FAIL===0,
  input,
  week:edition.week,
  inquirer_version:overview?.inquirer_version??edition?.inquirer_version??null,
  counts,
  recap:recapAudit,
  samples:teamAudits,
  findings:allFindings
};
if(jsonPath)fs.writeFileSync(jsonPath,JSON.stringify(json,null,2)+'\n');

if(strict&&counts.FAIL)process.exitCode=1;
