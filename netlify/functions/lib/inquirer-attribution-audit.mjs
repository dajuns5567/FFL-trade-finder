// Independent editorial admission: the headline story and each lead beat
// must identify the fantasy team(s) being discussed. A structural pass alone
// cannot accept anonymous prose such as "By the end, the comeback plan...".
// Does not change accepted manuscript copy or an immutable prior edition.
export function inspectFantasyTeamAttribution(edition){
 if(Number(edition?.week)<9)return[];
 const teams=edition?.teams||[],overview=edition?.league_overview||{},
  feature=overview?.sections?.[0],beats=feature?.blocks||[];
 if(!teams.length||!beats.length)return[];
 const names=[...new Set(teams.map(t=>String(t.team_name||'')).filter(Boolean))];
 const named=p=>names.some(name=>String(p||'').toLowerCase().includes(name.toLowerCase()));
 const issues=[];
 for(const kind of ['lead','players','decisions','league','outlook']){
  const block=beats.find(x=>x.kind===kind);
  const opening=block?.paragraphs?.[0];
  if(!opening)continue;
  if(!named(opening))issues.push({id:'unattributed-fantasy-team-recap',beat:kind,
   detail:'First '+kind+' paragraph does not name any actual league team.',
   excerpt:String(opening).slice(0,120)});
 }
 return issues;
}
