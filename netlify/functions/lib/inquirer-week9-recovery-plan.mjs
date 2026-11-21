// Read-only recovery classification for the 2026 Week 9–10 publishing incident.
// Never mistake a manuscript in storage for an approved publication, or
// regenerate an edition already verifiably locked in either archive.
const validWeek=week=>Number.isInteger(week)&&week>=3&&week<=18;
const coverage=(readiness,week)=>{
 const row=(readiness?.historical_weeks||[]).find(x=>Number(x?.week)===week)||{};
 return{
  week,
  netlify_verified:row.locked_verified===true,
  github_verified:row.github_verified===true,
  indexed:row.indexed===true,
  awards_verified:row.award_present===true
 };
};
export function planInquirerWeekRecovery(readiness,{weeks=[9,10],completedWeek=null}={}){
 if(readiness?.schema_version!==1||Number(readiness?.season)!==2026||
    !Array.isArray(readiness?.historical_weeks))
  return{ready:false,reason:'Read-only publication readiness evidence unavailable',weeks:[]};
 const seen=new Set(),requested=[];
 for(const w of weeks){
  const week=Number(w);
  if(!validWeek(week)||seen.has(week))throw Error('Invalid or duplicate recovery week');
  seen.add(week);requested.push(week);
 }
 requested.sort((a,b)=>a-b);
 const finished=Number.isInteger(Number(completedWeek))&&completedWeek!==null?Number(completedWeek):null;
 const history=[3,4,5,6,7,8].map(w=>coverage(readiness,w));
 const historicalMissing=history.filter(x=>!x.github_verified&&!x.netlify_verified).map(x=>x.week);
 const notIndexed=history.filter(x=>x.week>=5&&!x.indexed).map(x=>x.week);
 const awardsMissing=[6,8].filter(w=>!history.find(x=>x.week===w)?.awards_verified);
 const sourceReady=historicalMissing.length===0&&notIndexed.length===0&&awardsMissing.length===0;
 const tasks=[];
 for(const week of requested){
  const row=coverage(readiness,week);
  const exists=row.github_verified||row.netlify_verified;
  const seasonFinalized=finished!==null&&finished>=week;
  // A surviving original must be recovered unchanged rather than replaced
  // by a generator, even if its awards or index are incomplete.
  const state=exists
   ?row.indexed&&row.awards_verified?'verified-publication':'recover-original-visibility'
   :!sourceReady?'blocked-by-historical-archive'
   :!seasonFinalized?'awaiting-verified-scoring'
   :week>requested[0]&&tasks.some(t=>t.week<week&&t.state!=='verified-publication')
    ?'blocked-by-earlier-week'
    :'eligible-for-new-recovery-draft';
  const requirements=state==='recover-original-visibility'
   ?[...(!row.indexed?['restore public archive index without rewriting original']:[]),
      ...(!row.awards_verified?['verify week-specific offensive, IDP and manager awards']:[])]
   :state==='eligible-for-new-recovery-draft'
    ?['use original completed-week Sleeper scoring and matchup evidence',
      'generate 32 roster-specific articles and Weekly Recap',
      'run editorial and source-factual audits',
      'verify all required awards and publication readback',
      'obtain explicit publication authorization']
    :state==='blocked-by-historical-archive'
     ?['recover approved original Weeks '+historicalMissing.join(', '),
        'restore historical archive index for Weeks '+notIndexed.join(', '),
        'verify historical awards for Weeks '+awardsMissing.join(', ')]
     :state==='awaiting-verified-scoring'?['verify completed Sleeper regular-season scoring for Week '+week]
     :state==='blocked-by-earlier-week'?['complete and verify earlier missing recovery weeks first']:[];
  tasks.push({week,state,existing_original_verified:exists,requirements,
    safe_to_generate_new_draft:state==='eligible-for-new-recovery-draft',
    authorized_to_publish:false});
 }
 return{ready:sourceReady,season:2026,read_only:true,
  canonical_source:'GitHub-verified immutable editions or authentic Netlify locked originals',
  earliest_missing_approved_week:historicalMissing[0]??null,
  historical_missing:historicalMissing,history_not_indexed:notIndexed,
  historical_awards_missing:awardsMissing,
  completed_week_evidence:finished,weeks:tasks};
}
