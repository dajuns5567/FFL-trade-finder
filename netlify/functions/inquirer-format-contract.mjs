// Week 4 is the locked visual/editorial reference for all forward editions.
// This structural contract is independent of the language-quality gate.
export const INQUIRER_TEAM_DESKS=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
export const INQUIRER_RECAP_BEATS=['lead','standings','players','decisions','league','outlook'];

export function inspectInquirerFormatContract(edition){
  if(!Number.isFinite(Number(edition?.week))||Number(edition.week)<5)return [];
  const issues=[];
  for(const t of edition?.teams||[]){
    const sections=t?.inquirer_article?.sections||[],kinds=sections.map(s=>s.kind),name=t.team_name||t.roster_id;
    for(const kind of INQUIRER_TEAM_DESKS){
      if(kinds.filter(k=>k===kind).length!==1)issues.push({id:'week4-team-section-contract',team:name,kind});
    }
    if(kinds[0]!=='lede'||kinds.at(-1)!=='outlook'||kinds.indexOf('sentiment')>kinds.indexOf('outlook'))
      issues.push({id:'week4-team-section-order',team:name});
    if((sections.find(s=>s.kind==='outlook')?.paragraphs||[]).length>3)
      issues.push({id:'week4-overstuffed-outlook',team:name});
    for(const s of sections)if(!String(s.heading||'').trim())
      issues.push({id:'week4-missing-section-heading',team:name,kind:s.kind});
  }
  const recap=edition?.league_overview?.sections||[];
  if(recap.length<4)issues.push({id:'week4-four-reporter-recap'});
  const blocks=recap[0]?.blocks||[],actual=blocks.map(b=>b.kind);
  if(actual.length!==INQUIRER_RECAP_BEATS.length||actual.some((kind,i)=>kind!==INQUIRER_RECAP_BEATS[i]))
    issues.push({id:'week4-recap-six-beat-contract',expected:INQUIRER_RECAP_BEATS,actual});
  for(const b of blocks)if(!String(b.heading||'').trim()||!(b.paragraphs||[]).length)
    issues.push({id:'week4-empty-recap-beat',kind:b.kind});
  if(blocks.length&&JSON.stringify(recap[0].paragraphs||[])!==JSON.stringify(blocks.flatMap(b=>b.paragraphs||[])))
    issues.push({id:'week4-recap-flattened-mirror'});
  return issues;
}
