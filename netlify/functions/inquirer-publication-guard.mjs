// Fail-closed editorial admission: every public edition requires substantive
// checks AND a review approval bound to the exact copy digest. No public HTTP
// route may approve a draft. Historical locked editions are never rewritten.
import {createHash} from 'node:crypto';

const articleParagraphs = article => (article?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(p=>typeof p==='string');
const normalized = value => String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
const misleading = [
  {id:'grammatical-regression', pattern:/\ban previous-week\b|\bthe first result on .+ were\b|\bthe .+ makes this sunday\b/i},
  {id:'mechanical-draft-language', pattern:/the useful weakness-or-strength note|the second scorer moved|the third scorer moved|the football read is straightforward|the rival-chat version is uncomfortable:/i},
  {id:'copy-repair-scaffold', pattern:/fantasy points, a \d+(?:\.\d+)?-point margin in Week \d+/i},
  {id:'editorial-placeholder', pattern:/\b(?:TBD|TODO|lorem ipsum)\b|\bn\/a\b/i}
];

export function editorialCopyDigest(edition) {
  const teams=(edition?.teams||[]).slice().sort((a,b)=>Number(a.roster_id)-Number(b.roster_id))
    .map(t=>({roster_id:String(t.roster_id),headline:t.inquirer_article?.headline,
      sections:t.inquirer_article?.sections,reporter:t.inquirer_article?.reporter?.id}));
  const recap={headline:edition?.league_overview?.headline,sections:edition?.league_overview?.sections};
  return createHash('sha256').update(JSON.stringify({season:Number(edition?.season),week:Number(edition?.week),teams,recap})).digest('hex');
}

export function inspectEditionBeforePublication(edition) {
  const issues=[],teams=edition?.teams||[],unique=new Set(teams.map(t=>String(t.roster_id)));
  if(teams.length!==32||unique.size!==32)issues.push({id:'coverage',detail:'32 unique team articles required'});
  const rosterById=new Map(teams.map(t=>[String(t.roster_id),t]));
  const scaffoldOwners=new Map();
  for(const t of teams) {
    const team=t.team_name||('Roster '+t.roster_id),article=t.inquirer_article;
    if(!article?.headline||!article?.byline||!article?.reporter?.id)issues.push({id:'article-metadata',team});
    const paragraphs=articleParagraphs(article),substantive=paragraphs.filter(p=>p.trim().length>=50);
    if(substantive.length<6)issues.push({id:'article-depth',team,count:substantive.length});
    const fan=(article?.sections||[]).find(s=>s.kind==='sentiment');
    if(!fan||fan.paragraphs?.filter(p=>String(p).length>=50).length<2)issues.push({id:'fan-sentiment',team});
    const opponent=rosterById.get(String(t.opponent_roster_id));
    if(!opponent||String(opponent.opponent_roster_id)!==String(t.roster_id)
       ||Math.abs(Number(opponent.points)-Number(t.opponent_points))>.02
       ||Math.abs(Number(t.points)-Number(opponent.opponent_points))>.02)
      issues.push({id:'matchup-consistency',team});
    const seasonRecord=t.league_context?.record;
    for(const p of paragraphs) {
      for(const pattern of misleading)if(pattern.pattern.test(p))issues.push({id:pattern.id,team,excerpt:p.slice(0,180)});
      // Standalone "At X-Y" is read as a season record. Reject when it does
      // not match the available official season record.
      const record=String(p).match(/\bAt (\d+)-(\d+)\b/);
      if(record&&seasonRecord&&(Number(record[1])!==Number(seasonRecord.wins)||Number(record[2])!==Number(seasonRecord.losses)))
        issues.push({id:'misleading-record',team,claim:record[0],actual:seasonRecord.wins+'-'+seasonRecord.losses});
      const key=normalized(p).replaceAll(normalized(team),'[team]')
        .replaceAll(normalized(t.opponent_name),'[opponent]')
        .replace(/\b\d+(?:\.\d+)?\b/g,'#');
      if(key.length>=110){if(!scaffoldOwners.has(key))scaffoldOwners.set(key,new Set());scaffoldOwners.get(key).add(team);}
    }
  }
  for(const [sentence,owners] of scaffoldOwners)if(owners.size>=3)
    issues.push({id:'reused-prose-scaffold',teams:[...owners],excerpt:sentence.slice(0,150)});
  const recap=edition?.league_overview;
  if(!recap?.headline||!(recap.sections||[]).length)issues.push({id:'recap-missing'});
  for(const p of (recap?.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])])){
    for(const pattern of misleading)if(pattern.pattern.test(p))issues.push({id:'recap-'+pattern.id,excerpt:p.slice(0,180)});
  }
  return{ok:issues.length===0,issues,metrics:{team_articles:teams.length,issues:issues.length}};
}

export function editorialApprovalMatches(edition,approval) {
  const digest=editorialCopyDigest(edition);
  const valid=approval?.approved===true&&approval?.season===Number(edition?.season)
    &&approval?.week===Number(edition?.week)
    &&approval?.sha256===digest&&typeof approval?.reviewed_by==='string'
    &&approval.reviewed_by.trim().length>0
    &&typeof approval?.reviewed_at==='string'
    &&Number.isFinite(Date.parse(approval.reviewed_at));
  return{approved:!!valid,digest};
}
