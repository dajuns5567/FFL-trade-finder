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
    .map(t=>({roster_id:String(t.roster_id),article:t.inquirer_article}));
  // Reviewers approve all article/recap fields, including top-level copy and
  // sidebars. Hashing only sections would permit visible edits after approval.
  const recap=edition?.league_overview;
  return createHash('sha256').update(JSON.stringify({season:Number(edition?.season),week:Number(edition?.week),teams,recap})).digest('hex');
}

export function inspectEditionBeforePublication(edition) {
  const issues=[],teams=edition?.teams||[],unique=new Set(teams.map(t=>String(t.roster_id)));
  if(teams.length!==32||unique.size!==32)issues.push({id:'coverage',detail:'32 unique team articles required'});
  const rosterById=new Map(teams.map(t=>[String(t.roster_id),t]));
  const scaffoldOwners=new Map(),phraseOwners=new Map();
  const names=[...new Set(teams.flatMap(t=>[t.team_name,t.opponent_name]).map(normalized).filter(Boolean))]
    .sort((a,b)=>b.length-a.length);
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
      // Detect long repeated editorial phrasing even when its surrounding
      // paragraph contains different team names or fantasy point totals.
      // Numeric-heavy stat lines are not rhetoric and must be exempt.
      if(/\bin the same starting spot\b/i.test(p)&&/\d+(?:\.\d+)?/.test(p))continue;
      let language=normalized(p);
      for(const name of names)language=language.replaceAll(name,' entity ');
      const words=language.replace(/\d+(?:\.\d+)?/g,' # ').replace(/[^a-z# ]/g,' ')
        .split(/\s+/).filter(Boolean);
      for(let i=0;i+8<=words.length;i++){
        const window=words.slice(i,i+8);
        if(window.filter(x=>x==='#').length>1)continue;
        const phrase=window.join(' ');
        if(!phraseOwners.has(phrase))phraseOwners.set(phrase,new Set());
        phraseOwners.get(phrase).add(team);
      }
    }
  }
  for(const [sentence,owners] of scaffoldOwners)if(owners.size>=3)
    issues.push({id:'reused-prose-scaffold',teams:[...owners],excerpt:sentence.slice(0,150)});
  const repeated=new Map();
  for(const [phrase,owners] of phraseOwners)if(owners.size>=5){
    const signature=[...owners].sort().join('|');
    const existing=repeated.get(signature);
    if(!existing||phrase.length>existing.phrase.length)repeated.set(signature,{phrase,teams:[...owners]});
  }
  for(const row of [...repeated.values()].sort((a,b)=>b.teams.length-a.teams.length).slice(0,20))
    issues.push({id:'shared-editorial-phrase',teams:row.teams,excerpt:row.phrase});
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

/**
 * Explicit cost-free admission for the audited, deterministic V31 newsroom.
 * This is not valid for AI drafts, arbitrary imported editions, or a missing
 * locked Week 4. A failing audit always blocks public writes.
 */
export function deterministicInquirerAdmission(edition,{quality,audit,previousEdition}={}){
  const digest=editorialCopyDigest(edition),week=Number(edition?.week);
  const allowed=week>=5&&week<=18&&Number(edition?.season)>=2026&&
    edition?.editorial_generation?.engine==='v31-forward'&&
    Number(edition?.inquirer_version)===31&&
    Number(previousEdition?.season)===Number(edition?.season)&&
    Number(previousEdition?.week)===week-1&&
    previousEdition?.published_locked===true&&
    quality?.ok===true&&audit?.ok===true&&
    Array.isArray(edition?.teams)&&edition.teams.length===32&&
    Array.isArray(edition?.league_overview?.sections)&&edition.league_overview.sections.length>=4;
  return{approved:!!allowed,digest,mode:allowed?'audited-deterministic-v31':'held'};
}

export function isReadOnlyEditorialPreview(url,context=''){
 const host=new URL(url).hostname;
 return /^deploy-preview-|^deploy-branch-/.test(host)||
   ['deploy-preview','branch-deploy'].includes(String(context));
}
