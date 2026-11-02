// A backdated newspaper must not call today's rolling seven-day ledger Week N.
export function inquirerMarketCutoff(schedule){
 const starts=(schedule?.game_starts||[]).map(Date.parse).filter(Number.isFinite);
 return starts.length?new Date(Math.max(...starts)+24*60*60*1000).toISOString():null;
}
export function snapshotsThroughEdition(snaps,asOf){
 if(!asOf)return snaps;
 const cutoff=Date.parse(asOf);
 if(!Number.isFinite(cutoff))return [];
 return snaps.filter(s=>Number.isFinite(Date.parse(s?.t))&&Date.parse(s.t)<=cutoff);
}

export function editionAvailability(availability,editionWeek,currentWeek){
 if(Number(editionWeek)>=Number(currentWeek)-1)return availability;
 return {...availability,injury_players:[],injury_current_starters:[],historical_injury_status_unavailable:true};
}
