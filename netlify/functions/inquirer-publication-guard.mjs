// Fail-closed editorial admission: every public edition requires substantive
// checks AND a review approval bound to the exact copy digest. No public HTTP
// route may approve a draft. Historical locked editions are never rewritten.
import {createHash} from 'node:crypto';
import {inspectInquirerFormatContract} from './inquirer-format-contract.mjs';
import {inspectNarrativeArchitecture} from './inquirer-narrative-architecture.mjs';

const articleParagraphs = article => (article?.sections||[]).flatMap(s=>s?.paragraphs||[]).filter(p=>typeof p==='string');
const normalized = value => String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
const misleading = [
  {id:'grammatical-regression', pattern:/\ban previous-week\b|\bthe first result on .+ were\b|\bthe .+ makes this sunday\b/i},
  {id:'mechanical-draft-language', pattern:/the useful weakness-or-strength note|the second scorer moved|the third scorer moved|the football read is straightforward|the rival-chat version is uncomfortable:/i},
  {id:'mechanical-lesson-scaffold',pattern:/\bthe useful lesson is not\b|\bthe margin asks more:/i},
  {id:'copy-repair-scaffold', pattern:/fantasy points, a \d+(?:\.\d+)?-point margin in Week \d+/i},
  // Saved 2026 Week 5 candidates repeated this supposedly witty valuation
  // punchline across the newsroom. Real figures do not excuse stock prose.
  {id:'stock-market-punchline',pattern:/recorded price tag moved;?\s*[^.!?]{0,120}scoreboard remains another debate/i},
  {id:'editorial-placeholder', pattern:/\b(?:TBD|TODO|lorem ipsum)\b|\bn\/a\b/i},
  {id:'unrendered-data-placeholder', pattern:/\b(?:null|undefined)\b/i}
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
  const issues=[...inspectInquirerFormatContract(edition),...inspectNarrativeArchitecture(edition)],teams=edition?.teams||[],unique=new Set(teams.map(t=>String(t.roster_id)));
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
    // Exact substantial sentences repeated inside the same article are not
    // additional reporting, even when placed under different desk headings.
    const ownSentences=new Set();
    for(const p of paragraphs)for(const sentence of String(p).split(/(?<=[.!?])\s+/)){
      const phrase=normalized(sentence).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
      if(phrase.split(' ').length<13)continue;
      if(ownSentences.has(phrase))issues.push({id:'within-article-prose-reuse',team,excerpt:phrase.slice(0,150)});
      ownSentences.add(phrase);
    }
    // A heading without prose is not an editorial desk. Check forward
    // editions with real valuation snapshots without altering locked history.
    if(Number(edition?.season)>=2026&&Number(edition?.week)>=5){
      const value=(article?.sections||[]).find(s=>s.kind==='value');
      if(!value||(value.paragraphs||[]).every(p=>!String(p||'').trim()||/^n\/?a$/i.test(String(p).trim())))
        issues.push({id:'empty-value-desk',team});
      // A missing-data disclaimer is not a valuation report. Hold the whole
      // edition until verified market data is available for every roster.
      if(value&&(value.paragraphs||[]).some(p=>/\bno verified market movement\b|\blacks a verified current price\b|\bgets a data caveat instead\b/i.test(String(p))))
        issues.push({id:'unverified-value-desk',team});
    }
    // Factual-tone gate: zero-scoring starters cannot be portrayed as the
    // reason a team succeeded. Check the specific credited desk, not every
    // appearance of a player name in legitimate statistical reporting.
    const starters=Array.isArray(t.starter_details)?t.starter_details:[];
    const played=starters.filter(p=>Number.isFinite(Number(p?.points)));
    if(played.length&&played.every(p=>Number(p.points)<=0)){
      const cool=(article?.sections||[]).find(s=>s.kind==='cool-throne');
      const credit=(cool?.paragraphs||[]).join(' ');
      if(/\b(?:earned (?:(?:its|his|her|their) )?(?:own )?credit|deserves? credit|something (?:concrete )?to celebrate|got something from|delivered (?:a|the) performance|a standout|hero of the week)\b/i.test(credit))
        issues.push({id:'zero-point-false-credit',team});
    }
    // Catch the same false-positive praise outside the Cool Throne: an
    // all-zero player's name and an affirmative compliment in one sentence.
    const zeros=played.filter(p=>Number(p.points)===0&&String(p.name||'').trim());
    for(const zero of zeros){
      const player=normalized(zero.name);
      for(const p of paragraphs)for(const sentence of String(p).split(/(?<=[.!?])\s+/)){
        const line=normalized(sentence);
        if(!line.includes(player))continue;
        if(/\b(?:got something from|deserves? (?:its|his|her|their) credit|provided a boost|came through in the clutch|earned a cool throne)\b/i.test(line))
          issues.push({id:'zero-point-player-praise',team,player:zero.name});
      }
    }
    // Winning 1.4–0.0 is a recorded result, not evidence of dominance.
    // Flag unqualified triumphalism only when the actual winner scores under
    // five points; never change the underlying score or win/loss designation.
    if(Number.isFinite(Number(t.points))&&Number.isFinite(Number(t.opponent_points))&&
       Number(t.points)>Number(t.opponent_points)&&Number(t.points)<5){
      const rhetoric=paragraphs.join(' ');
      if(/\b(?:dominant performance|commanding victory|brilliant victory|masterclass in winning|convincing victory|something concrete to celebrate)\b/i.test(rhetoric))
        issues.push({id:'low-score-unearned-triumphalism',team,points:t.points,opponent_points:t.opponent_points});
    }
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
  // Known generic kicker/preface jokes are editorial text, not shared stats.
  // Even a two-team recurrence makes them sound copied; apply to every
  // forward week instead of accumulating Week-5-only manual edits.
  if(Number(edition?.season)>=2026&&Number(edition?.week)>=5){
    const stockRiffs=[/no need to romanticize it/i,/monday will have questions/i,
      /the same flaw will follow/i,/the same headline folded/i];
    for(const riff of stockRiffs){
      const owners=teams.filter(t=>articleParagraphs(t.inquirer_article).some(p=>riff.test(p)))
        .map(t=>t.team_name||String(t.roster_id));
      if(owners.length>=2)issues.push({id:'recycled-stock-kicker',teams:owners,riff:String(riff)});
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
  // These are emergency templates manufactured AFTER the writer finished.
  // They pass factual score tests but destroy weekly freshness and sarcasm.
  // Hold the candidate and try another writing variant; never approve filler.
  if(Number(edition?.week)>=5){
   const emergencyCopy=/\b(?:An actual Week \d+ result supplies the counterweight|Forget the old division-board shorthand|The Week \d+ scoreboard gives this race a concrete reference point|Here is what the Week \d+ ledger can actually prove|Nobody gets a championship banner for a column of standings|A Scoreboard Receipts Check|The division board loves a coronation)\b/i;
   for(const [i,s] of (recap?.sections||[]).entries()){
    const rows=s.blocks?.length?s.blocks.flatMap(b=>b.paragraphs||[]):s.paragraphs||[];
    if(!rows.some(p=>String(p||'').trim()))issues.push({id:'empty-recap-desk',section:i});
    for(const p of rows)if(emergencyCopy.test(p))issues.push({id:'emergency-recap-filler',section:i,excerpt:String(p).slice(0,160)});
   }
   for(const [i,h] of (recap?.hot_takes||[]).entries()){
    if(!String(h.take||'').trim())issues.push({id:'empty-recap-hot-take',index:i});
    if(emergencyCopy.test(String(h.title||'')+' '+String(h.take||'')))
     issues.push({id:'emergency-recap-filler',hot_take:i,excerpt:String(h.take||'').slice(0,160)});
   }
  }
  for(const p of (recap?.sections||[]).flatMap(s=>[...(s.paragraphs||[]),...(s.blocks||[]).flatMap(b=>b.paragraphs||[])])){
    for(const pattern of misleading)if(pattern.pattern.test(p))issues.push({id:'recap-'+pattern.id,excerpt:p.slice(0,180)});
  }
  for(const p of (recap?.hot_takes||[]).flatMap(t=>[t.title,t.take].filter(x=>typeof x==='string'))){
    for(const pattern of misleading)if(pattern.pattern.test(p))issues.push({id:'recap-hot-take-'+pattern.id,excerpt:p.slice(0,180)});
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
// Compare complete prose sentences, not shared scores or roster names.
// A future week must not reprint a prior week's actual editorial sentence.
export function inspectPreviousWeekEditorialReuse(edition,previousEdition){
 const previous=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t]));
 const issues=[];
 const sentences=a=>(a?.sections||[]).flatMap(s=>s.paragraphs||[])
  .flatMap(p=>String(p).split(/(?<=[.!?])\s+/))
  .map(s=>normalized(s).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim())
  .filter(s=>s.split(' ').length>=14);
 for(const team of edition?.teams||[]){
  const before=previous.get(String(team.roster_id));
  if(!before)continue;
  const prior=new Set(sentences(before.inquirer_article));
  const repeated=[...new Set(sentences(team.inquirer_article).filter(s=>prior.has(s)))];
  if(repeated.length)issues.push({id:'prior-week-prose-reuse',team:team.team_name,count:repeated.length,excerpt:repeated[0].slice(0,150)});
 }
 return issues;
}

export function deterministicInquirerAdmission(edition,{quality,audit,previousEdition}={}){
  const digest=editorialCopyDigest(edition),week=Number(edition?.week);
  const allowed=week>=5&&week<=18&&Number(edition?.season)>=2026&&
    edition?.editorial_generation?.engine==='v31-forward'&&
    Number(edition?.inquirer_version)===31&&
    Number(previousEdition?.season)===Number(edition?.season)&&
    Number(previousEdition?.week)===week-1&&
    previousEdition?.published_locked===true&&
    quality?.ok===true&&audit?.ok===true&&
    inspectPreviousWeekEditorialReuse(edition,previousEdition).length===0&&
    Array.isArray(edition?.teams)&&edition.teams.length===32&&
    Array.isArray(edition?.league_overview?.sections)&&edition.league_overview.sections.length>=4;
  return{approved:!!allowed,digest,mode:allowed?'audited-deterministic-v31':'held'};
}

export function isReadOnlyEditorialPreview(url,context=''){
 const host=new URL(url).hostname;
 return /^deploy-preview-|^deploy-branch-/.test(host)||
   ['deploy-preview','branch-deploy'].includes(String(context));
}
