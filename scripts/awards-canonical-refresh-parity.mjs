// Awards can claim a new historical high only from the exact canonical
// snapshot that the ordinary Value History refresh just accepted.
// This module is read-only; no HTTP, browser access, or GitHub writes.
export function assertAwardsMatchCanonicalRefresh(awards,snapshot){
 if(!awards||!snapshot||
    snapshot.version!==5||snapshot.source!=='scheduled'||
    snapshot.league!=='1316867686394769408'||
    snapshot.provenance?.canonical_parity!=='exact'||
    !Array.isArray(snapshot.rows)||snapshot.rows.length<300||
    !Array.isArray(snapshot.picks)||snapshot.picks.length<1||
    !Array.isArray(snapshot.teams)||snapshot.teams.length!==32)
   throw Error('AWARD_CANONICAL_REFRESH_INCOMPLETE');
 if(String(awards.canonical_fingerprint||'')!==String(snapshot.fingerprint||'')||
    String(awards.model_used||'')!==String(snapshot.valuation_model||'')||
    String(awards.source_commit||'')!==String(snapshot.provenance.git_commit||''))
   throw Error('AWARD_CANONICAL_REFRESH_MISMATCH: fingerprint, model or source revision');
 const awardTime=Date.parse(awards.captured_at),valueTime=Date.parse(snapshot.t);
 if(!Number.isFinite(awardTime)||!Number.isFinite(valueTime)||
    Math.abs(awardTime-valueTime)>15*60*1000)
   throw Error('AWARD_CANONICAL_REFRESH_STALE: capture timestamps differ');
 return {source_commit:awards.source_commit,model:awards.model_used,
  fingerprint:awards.canonical_fingerprint,
  player_count:snapshot.rows.length,team_count:snapshot.teams.length,
  captured_at:awards.captured_at,value_history_at:snapshot.t};
}
