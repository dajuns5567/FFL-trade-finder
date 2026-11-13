// Inquirer publication commit verification. All reads are from the live
// site-local, strongly consistent store. No mutation or draft promotion.
// A successful generator return is not evidence that the site's archive,
// reporter entries and awards are actually visible to readers.
export async function verifyPublishedInquirerReadback(store, report, {isLockedEdition}={}){
 const season=Number(report?.season),week=Number(report?.week);
 const fail=reason=>({ok:false,season,week,reason});
 if(!Number.isInteger(season)||season<2026||!Number.isInteger(week)||week<1||week>18)
  return fail('Invalid publication season/week');
 const key='broadcasts/'+season+'/week-'+String(week).padStart(2,'0')+'.json';
 const overviewKey='inquirer/league-overview/'+season+'/week-'+String(week).padStart(2,'0')+'.json';
 try{
  const [edition,index,awards,overview]=await Promise.all([
   store.get(key,{type:'json'}),store.get('broadcasts/index.json',{type:'json'}),
   store.get('awards/weekly.json',{type:'json'}),store.get(overviewKey,{type:'json'})
  ]);
  if(edition?.published_locked!==true||edition?.available!==true||
     !Array.isArray(edition?.teams)||edition.teams.length!==32||
     !edition?.league_overview?.headline||isLockedEdition?.(edition,season,week)!==true)
   return fail('Locked newspaper readback failed');
  if(report&&(
     Number(edition.editorial_revision)!==Number(report.editorial_revision)||
     String(edition.generated_at||'')!==String(report.generated_at||'')))
   return fail('Readback does not match the completed newsroom edition');
  const indexed=Array.isArray(index)&&index.some(row=>Number(row?.season)===season&&
   Number(row?.week)===week&&String(row?.key)===key);
  if(!indexed)return fail('Reader-visible broadcast archive index missing the locked edition');
  if(!overview?.headline||String(overview.headline)!==String(edition.league_overview.headline))
   return fail('Reader-visible Weekly Recap archive missing');
  const reporters=edition.reporters||[];
  const ids=new Set(edition.teams.map(team=>String(team?.roster_id||'')));
  if(!Array.isArray(reporters)||reporters.length!==4||ids.size!==32||ids.has(''))
   return fail('Newspaper is missing distinct teams or four reporter desks');
  const reporterReads=await Promise.all(reporters.map(reporter=>
   store.get('inquirer/reporters/'+reporter.id+'/index.json',{type:'json'})));
  for(let i=0;i<reporters.length;i++){
   const id=String(reporters[i]?.id||'');
   const teams=edition.teams.filter(t=>String(t?.inquirer_article?.reporter?.id||'')===id);
   const indexedArticles=reporterReads[i]?.articles;
   if(!id||teams.length!==8||!Array.isArray(indexedArticles)||
      !teams.every(team=>indexedArticles.some(entry=>
       Number(entry?.season)===season&&Number(entry?.week)===week&&
       String(entry?.roster_id)===String(team.roster_id)&&!!entry?.article_key)))
    return fail('Reader-visible reporter archive incomplete for '+id);
  }
  const award=(Array.isArray(awards?.records)?awards.records:[])
   .find(row=>Number(row?.season)===season&&Number(row?.week)===week);
  if(!award?.players_of_week?.offense?.player_id||
     !award?.players_of_week?.defense?.player_id||
     !Array.isArray(award?.manager_awards)||
     !['highest-scorer','lowest-scorer'].every(type=>
       award.manager_awards.some(row=>row?.type===type))||
     award.newsroom_engine!=='v31-forward')
   return fail('Reader-visible weekly awards are incomplete');
  return{ok:true,season,week,reporter_count:4,article_count:32,recap_visible:true,
   awards_visible:true,archive_indexed:true};
 }catch(error){
  return fail('Publication readback unavailable: '+String(error?.message||error).slice(0,140));
 }
}
