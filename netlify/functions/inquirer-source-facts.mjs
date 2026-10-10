// Fail-closed validation for explicit player-scoring facts in new Inquirer editions.
// This supplements, rather than replaces, historical and contextual prose audits.
// Published immutable editions are never rewritten by this module.
const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const normalize=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function articleText(article){
 const sections=(article?.sections||[]).flatMap(section=>[...(section.paragraphs||[]),...(section.blocks||[]).flatMap(b=>b.paragraphs||[])]);
 const takes=(article?.hot_takes||[]).map(x=>x.take||'');
 return [...sections,...takes].map(normalize);
}
// Historical claims explicitly qualified by another Week are not checked
// against the reporting week's points; they require archived-week sources.
function isOtherWeek(text,match,current){
 const suffix=String(text).slice(match.index+match[0].length,match.index+match[0].length+24);
 const explicit=suffix.match(/^\s*(?:in|during|for)\s+Week\s+(\d+)\b/i);
 if(explicit)return Number(explicit[1])!==Number(current);
 const prefix=String(text).slice(Math.max(0,match.index-42),match.index);
 const before=prefix.match(/\b(?:in|during|for)\s+Week\s+(\d+)\s*[,–—:-]?\s*$/i);
 return !!before&&Number(before[1])!==Number(current);
}

// Source-attributed, read-only per-edition registry. Values come from the
// candidate's structured data, not from generated prose or model guesses.
// A candidate registry is not itself an independent Sleeper verification.
export function buildInquirerEditionFactRegistry(edition){
 const week=Number(edition?.week),teams=Array.isArray(edition?.teams)?edition.teams:[];
 const players=new Map(),byRoster=new Map(),standings=[],teamScoreRules=[],matchups=[];
 for(const team of teams){
  const rosterId=team?.roster_id===null||team?.roster_id===undefined?null:String(team.roster_id);
  if(rosterId!==null&&!byRoster.has(rosterId))byRoster.set(rosterId,team);
  const name=normalize(team?.team_name),score=number(team?.points);
  if(name&&score!==null)teamScoreRules.push({name,score,source:'edition.team.points',week});
  if(name)standings.push({name,wins:number(team?.league_context?.record?.wins),losses:number(team?.league_context?.record?.losses),rank:number(team?.league_context?.standings_rank),source:'edition.team.league_context',week});
  for(const p of team?.starter_details||[]){
   const playerName=normalize(p?.name),pts=number(p?.points);
   if(!playerName||pts===null)continue;
   const key=playerName.toLowerCase(),arr=players.get(key)||[];
   arr.push({team:team.team_name,points:pts,player:p,source:'edition.team.starter_details',week});
   players.set(key,arr);
  }
 }
 for(const team of teams){
  const opponentId=team?.opponent_roster_id===null||team?.opponent_roster_id===undefined?null:String(team.opponent_roster_id);
  if(opponentId===null)continue;
  const opponent=byRoster.get(opponentId);
  if(!opponent||opponent===team||String(opponent?.opponent_roster_id)!==String(team.roster_id))continue;
  const a=normalize(team.team_name),b=normalize(opponent.team_name),points=number(team.points),opponentPoints=number(opponent.points);
  if(!a||!b||a.toLowerCase()===b.toLowerCase()||points===null||opponentPoints===null)continue;
  matchups.push({a,b,points,opponentPoints,source:'edition.teams.reciprocal_opponent_roster_id+points',week});
 }
 return {week,players,teamScoreRules,standings,matchups};
}

// Reconcile independently repeated values inside an edition before its prose
// can be published. These checks compare separate structured source fields;
// they do not claim to independently fetch or authenticate Sleeper records.
// Compare generated publication facts with the finalized Sleeper matchup
// snapshot captured separately by the publisher. No network call or fallback.
export function findInquirerRawMatchupIssues(edition,rawRows){
 const issues=[],rows=Array.isArray(rawRows)?rawRows:[];
 if(!Array.isArray(edition?.teams)||!rows.length)return [{id:'raw-matchup-source-unavailable'}];
 const byId=new Map(),seenEdition=new Set();
 for(const row of rows){
  if(row?.roster_id==null){issues.push({id:'raw-matchup-roster-id-missing'});continue}
  const id=String(row.roster_id);
  if(byId.has(id))issues.push({id:'raw-matchup-duplicate-roster',roster_id:id});
  else byId.set(id,row);
 }
 for(const team of edition.teams){
  const rosterId=team?.roster_id==null?null:String(team.roster_id),raw=byId.get(rosterId);
  if(!raw){issues.push({id:'raw-matchup-roster-missing',roster_id:rosterId});continue}
  if(seenEdition.has(rosterId)){issues.push({id:'raw-matchup-duplicate-edition-roster',roster_id:rosterId});continue}
  seenEdition.add(rosterId);
  const actual=number(raw.points),claimed=number(team.points);
  if(actual===null||claimed===null||Math.abs(actual-claimed)>0.055)
   issues.push({id:'raw-matchup-team-score',roster_id:rosterId,expected:actual,reported:claimed});
  const playerScores=raw.players_points&&typeof raw.players_points==='object'?raw.players_points:{};
  const rawStarters=Array.isArray(raw.starters)?new Set(raw.starters.filter(v=>v!=null).map(String)):null;
  const seenPlayers=new Set();
  for(const p of team.starter_details||[]){
   if(p?.id==null){issues.push({id:'raw-matchup-starter-id-missing',roster_id:rosterId});continue}
   const id=String(p.id);
   if(seenPlayers.has(id)){issues.push({id:'raw-matchup-duplicate-starter',roster_id:rosterId,player_id:id});continue}
   seenPlayers.add(id);
   if(rawStarters&&!rawStarters.has(id))
    issues.push({id:'raw-matchup-starter-mismatch',roster_id:rosterId,player_id:id});
   if(!Object.hasOwn(playerScores,id))continue;
   const source=number(playerScores[id]),reported=number(p.points);
   if(source===null||reported===null||Math.abs(source-reported)>0.055)
    issues.push({id:'raw-matchup-player-score',roster_id:rosterId,player_id:id,expected:source,reported});
  }
  if(rawStarters)for(const id of rawStarters)if(id&&id!=='0'&&!seenPlayers.has(id))
   issues.push({id:'raw-matchup-edition-starter-missing',roster_id:rosterId,player_id:id});
 }
 for(const rosterId of byId.keys())if(!seenEdition.has(rosterId))issues.push({id:'raw-matchup-edition-roster-missing',roster_id:rosterId});
 return issues;
}

export function findInquirerEditionConsistencyIssues(edition){
 const issues=[];
 const teams=Array.isArray(edition?.teams)?edition.teams:[];
 const byId=new Map();
 for(const team of teams){
  if(team?.roster_id==null)continue;
  const id=String(team.roster_id);
  if(byId.has(id))issues.push({id:'duplicate-roster-fact',roster_id:id});
  else byId.set(id,team);
 }
 const seen=new Set();
 for(const team of teams){
  if(team?.roster_id==null||team?.opponent_roster_id==null)continue;
  const roster=String(team.roster_id),opponentId=String(team.opponent_roster_id);
  const other=byId.get(opponentId);
  if(!other||other===team||String(other.opponent_roster_id)!==roster)continue;
  const pair=[roster,opponentId].sort().join(':');
  if(seen.has(pair))continue;
  seen.add(pair);
  const a=number(team.points),b=number(other.points);
  if(a===null||b===null)continue;
  for(const [t,opposite,score,opponentScore] of [[team,other,a,b],[other,team,b,a]]){
   const mirrored=number(t.opponent_points);
   if(mirrored!==null&&Math.abs(mirrored-opponentScore)>0.055)
    issues.push({id:'opponent-score-disagreement',roster_id:String(t.roster_id),opponent_roster_id:String(opposite.roster_id),reported:mirrored,expected:opponentScore,week:edition.week});
   if(typeof t.won==='boolean'&&a!==b&&t.won!==(score>opponentScore))
    issues.push({id:'matchup-outcome-disagreement',roster_id:String(t.roster_id),reported:t.won,expected:score>opponentScore,week:edition.week});
  }
 }
 return issues;
}

export function findInquirerSourceFactIssues(edition){
 const issues=[],week=Number(edition?.week);
 if(!Number.isInteger(week)||!Array.isArray(edition?.teams))return issues;
 issues.push(...findInquirerEditionConsistencyIssues(edition));
 const facts=buildInquirerEditionFactRegistry(edition);
 const {players,teamScoreRules,standings,matchups}=facts;
 const all=[['Weekly Recap',edition.league_overview],...edition.teams.map(t=>[t.team_name||String(t.roster_id),t.inquirer_article])];
 for(const [articleName,article] of all){
  for(const paragraph of articleText(article)){
   // Check explicitly week-qualified team totals. Other historical references
   // are left to their own archived-week source, never compared with this week.
   if(/\bWeek\s+\d+\b/i.test(paragraph)){
    for(const team of teamScoreRules){
     if(!paragraph.toLowerCase().includes(team.name.toLowerCase()))continue;
     const name=esc(team.name),score='(-?\\d+(?:\\.\\d+)?)';
     const expressions=[
      new RegExp('\\b'+name+'\\s+scored\\s+'+score+'\\s+(?:fantasy\\s+)?points?\\s+in\\s+Week\\s+(\\d+)\\b','gi'),
      new RegExp('\\bIn\\s+Week\\s+(\\d+),?\\s+'+name+'\\s+scored\\s+'+score+'\\s+(?:fantasy\\s+)?points?\\b','gi')
     ];
     for(let i=0;i<expressions.length;i++)for(const m of paragraph.matchAll(expressions[i])){
      const reported=Number(m[i===0?1:2]),mentioned=Number(m[i===0?2:1]);
      if(mentioned===week&&Math.abs(reported-team.score)>0.055)
       issues.push({id:'weekly-team-score',article:articleName,team:team.name,reported,expected:team.score,week});
     }
    }
   }

   // Verify explicit current-season W-L records and standings positions.
   // Neither record values nor rank can be inferred from article wording.
   for(const st of standings){
    if(!paragraph.toLowerCase().includes(st.name.toLowerCase()))continue;
    const n=esc(st.name);
    const record=new RegExp('\\b'+n+'(?:\\s+has|\\x27s|\\s+holds)?\\s+(?:a\\s+)?(\\d+)-(\\d+)\\s+(?:record|mark)\\b','gi');
    for(const m of paragraph.matchAll(record)){
     if(st.wins===null||st.losses===null||!Number.isInteger(st.wins)||!Number.isInteger(st.losses)||Number(m[1])!==st.wins||Number(m[2])!==st.losses)
      issues.push({id:'team-record',article:articleName,team:st.name,reported:[Number(m[1]),Number(m[2])],expected:[st.wins,st.losses],week});
    }
    const rank=new RegExp('\\b'+n+'\\s+(?:is|sits|stands|ranks)\\s+(?:at\\s+|in\\s+)?(?:rank\\s+|place\\s+|position\\s+|#)(\\d+)\\b','gi');
    for(const m of paragraph.matchAll(rank)){
     if(st.rank===null||!Number.isInteger(st.rank)||st.rank<1||Number(m[1])!==st.rank)
      issues.push({id:'standings-rank',article:articleName,team:st.name,reported:Number(m[1]),expected:st.rank,week});
    }
   }
   // The generator uses “Team beat/lost to Opponent 123.4–99.1”.
   // Only check named pairings with a verified roster linkage, preserving
   // historic comparisons and unqualified editorial language.
   for(const fixture of matchups){
    const numeric='(-?\\d+(?:\\.\\d+)?)';
    const pattern=new RegExp('\\b'+esc(fixture.a)+'\\s+(beat|lost to|defeated)\\s+'+esc(fixture.b)+'\\s+'+numeric+'\\s*[–—-]\\s*'+numeric+'\\b','gi');
    for(const m of paragraph.matchAll(pattern)){
     const left=Number(m[2]),right=Number(m[3]),verb=m[1].toLowerCase();
     if(Math.abs(left-fixture.points)>0.055||Math.abs(right-fixture.opponentPoints)>0.055)
      issues.push({id:'matchup-score',article:articleName,team:fixture.a,opponent:fixture.b,reported:[left,right],expected:[fixture.points,fixture.opponentPoints],week});
     if((verb==='lost to'&&fixture.points>fixture.opponentPoints)||(verb!=='lost to'&&fixture.points<fixture.opponentPoints))
      issues.push({id:'matchup-result',article:articleName,team:fixture.a,opponent:fixture.b,week});
    }
   }
   // Fast reject for ordinary prose; only explicit scoring statements need source checks.
   if(!/\b(?:scored|posted|recorded|put up|supplied|produced|finished with|averages|averaging|season average)\b/i.test(paragraph))continue;
   const lowercase=paragraph.toLowerCase();
   for(const [key,entries] of players){
    if(!lowercase.includes(key))continue;
    // Only validate unambiguous matches; names reused by different players are skipped.
    if(entries.length!==1)continue;
    const p=entries[0],actual=p.points,name=normalize(p.player.name),escaped=esc(name);
    const weekly=new RegExp('\\b'+escaped+'\\s+(?:scored|posted|recorded|put up|supplied|produced)\\s+(-?\\d+(?:\\.\\d+)?)\\s*(?:fantasy\\s+)?points?\\b','gi');
    for(const match of paragraph.matchAll(weekly)){
     if(!isOtherWeek(paragraph,match,week)&&Math.abs(Number(match[1])-actual)>0.055)issues.push({id:'weekly-player-score',article:articleName,player:name,reported:Number(match[1]),expected:actual,week});
    }
    // Verify season per-game claims only when a valid season total and denominator exist.
    const perGame=new RegExp('\\b'+escaped+'\\s+(?:is\\s+)?(?:averages|averaging)\\s+(\\d+(?:\\.\\d+)?)\\s*(?:fantasy\\s+)?points?\\s*(?:per\\s+game|this\\s+season|on\\s+the\\s+season)\\b','gi');
    for(const match of paragraph.matchAll(perGame)){
     const games=number(p.player.season_games_played),total=number(p.player.season_total_points);
     if(games===null||!Number.isInteger(games)||games<=0||total===null||Math.abs(total/games-Number(match[1]))>0.055)
      issues.push({id:'unsupported-player-average',article:articleName,player:name,reported:Number(match[1]),week});
    }
    const finished=new RegExp('\\b'+escaped+'\\s+finished\\s+with\\s+(-?\\d+(?:\\.\\d+)?)\\s*(?:fantasy\\s+)?points?\\b','gi');
    for(const match of paragraph.matchAll(finished)){
     if(!isOtherWeek(paragraph,match,week)&&Math.abs(Number(match[1])-actual)>0.055)
      issues.push({id:'weekly-player-score',article:articleName,player:name,reported:Number(match[1]),expected:actual,week});
    }
    // A single week's points must never be labeled a season average without
    // independently sourced season total and eligible games-played denominator.
    const average=new RegExp('\\b'+escaped+'\\b[^.!?]{0,100}?\\b(\\d+(?:\\.\\d+)?)\\s*(?:-point|point)\\s+(?:current-season|season)\\s+average\\b','gi');
    for(const match of paragraph.matchAll(average)){
     const gp=number(p.player.season_games_played),total=number(p.player.season_total_points);
     if(gp===null||gp<=0||total===null||Math.abs(total/gp-Number(match[1]))>0.055)issues.push({id:'unsupported-player-average',article:articleName,player:name,reported:Number(match[1]),week});
    }
   }
  }
 }
 return issues;
}
