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
export function findInquirerSourceFactIssues(edition){
 const issues=[],week=Number(edition?.week);
 if(!Number.isInteger(week)||!Array.isArray(edition?.teams))return issues;
 const players=new Map();
 for(const team of edition.teams)for(const p of team?.starter_details||[]){
  const name=normalize(p?.name),pts=number(p?.points);
  if(!name||pts===null)continue;
  const key=name.toLowerCase(),arr=players.get(key)||[];
  arr.push({team:team.team_name,points:pts,player:p});players.set(key,arr);
 }
 const all=[['Weekly Recap',edition.league_overview],...edition.teams.map(t=>[t.team_name||String(t.roster_id),t.inquirer_article])];
 for(const [articleName,article] of all){
  for(const paragraph of articleText(article)){
   // Fast reject for ordinary prose; only explicit scoring statements need source checks.
   if(!/\b(?:scored|posted|recorded|put up|supplied|produced|season average)\b/i.test(paragraph))continue;
   const lowercase=paragraph.toLowerCase();
   for(const [key,entries] of players){
    if(!lowercase.includes(key))continue;
    // Only validate unambiguous matches; names reused by different players are skipped.
    if(entries.length!==1)continue;
    const p=entries[0],actual=p.points,name=normalize(p.player.name),escaped=esc(name);
    const weekly=new RegExp('\\b'+escaped+'\\s+(?:scored|posted|recorded|put up|supplied|produced)\\s+(\\d+(?:\\.\\d+)?)\\s*(?:fantasy\\s+)?points?\\b','gi');
    for(const match of paragraph.matchAll(weekly)){
     if(Math.abs(Number(match[1])-actual)>0.055)issues.push({id:'weekly-player-score',article:articleName,player:name,reported:Number(match[1]),expected:actual,week});
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
