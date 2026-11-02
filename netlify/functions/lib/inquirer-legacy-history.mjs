// Canonical Fleeced! history compatibility. The ORIGINAL 2026 Week 3/4
// archives predate the later published_locked flag; do not rewrite their
// bytes or manufacture that flag. Recognize ONLY the original published-year
// historical window after validating the actual newspaper structure.
//
// An explicit published_locked=false always means a draft and is NEVER
// accepted. Weeks 5+ require the newer explicit true lock unconditionally.
export const WEEK4_DESKS=Object.freeze(['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook']);
export const WEEK4_RECAP_BEATS=Object.freeze(['lead','standings','players','decisions','league','outlook']);
export function inspectCanonicalArchive(edition,season,week){
 season=Number(season);week=Number(week);
 const errors=[],teams=Array.isArray(edition?.teams)?edition.teams:[];
 const historical=season===2026&&(week===3||week===4);
 const lock=edition?.published_locked;
 const legacy=historical&&lock==null;
 if(edition?.available!==true)errors.push('edition unavailable');
 if(Number(edition?.season)!==season||Number(edition?.week)!==week)
  errors.push('season/week mismatch');
 if(lock===false||(!legacy&&lock!==true))
  errors.push('edition not explicitly locked');
 if(teams.length!==32||new Set(teams.map(t=>String(t?.roster_id??''))).size!==32||
    teams.some(t=>t?.roster_id==null||!String(t?.inquirer_article?.headline||'').trim()))
  errors.push('expected 32 distinct roster articles with headlines');
 if(!String(edition?.league_overview?.headline||'').trim()||
    !Array.isArray(edition?.league_overview?.sections)||edition.league_overview.sections.length<4)
  errors.push('incomplete weekly recap');
 if(legacy&&Number(edition?.inquirer_version)!==31)
  errors.push('legacy newspaper version must be V31');
 // 2026 Week 4 is the immutable original reference. Every subsequent
 // newsroom season (including Week 1 of 2027) uses the forward contract.
 // Never allow a new NFL season to slip back into the 2026 Week 1-3 format.
 const approvedBaseline=season===2026&&week===4;
 const forwardEdition=season>2026||(season===2026&&week>=5);
 if(approvedBaseline||forwardEdition){
  if(Number(edition?.inquirer_version)!==31)
   errors.push(approvedBaseline?'approved Week 4 must be V31':'All post-2026-baseline weeks must use forward V31 newsroom');
  if(approvedBaseline&&Number(edition?.editorial_revision)!==14)
   errors.push('approved Week 4 must be revision 14');
  if(!approvedBaseline&&(
     Number(edition?.editorial_revision)<39||
     edition?.editorial_generation?.engine!=='v31-forward'))
   errors.push('Post-baseline newsroom must be a vetted forward edition, revision 39 or later');
  const reporterCount=new Map();
  for(const t of teams){
   const article=t?.inquirer_article||{},sections=article.sections||[],kinds=sections.map(x=>x?.kind);
   const id=String(article?.reporter?.id||'unknown');
   reporterCount.set(id,(reporterCount.get(id)||0)+1);
   if(sections.length!==8||!WEEK4_DESKS.every(d=>kinds.includes(d)))
    errors.push('eight editorial desks required for Week 4 and all forward editions');
  }
  if(reporterCount.size!==4||[...reporterCount.values()].some(n=>n!==8))
   errors.push('four-reporter by eight-story distribution required');
  const recap=edition?.league_overview?.sections||[],blocks=recap[0]?.blocks||[];
  if(blocks.length!==6||!WEEK4_RECAP_BEATS.every((beat,i)=>blocks[i]?.kind===beat))
   errors.push('six-beat recap required for Week 4 and all forward editions');
 }
 return{ok:errors.length===0,legacy:legacy&&errors.length===0,issues:[...new Set(errors)]};
}
