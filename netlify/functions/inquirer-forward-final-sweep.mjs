// Non-destructive final prose sweep for Week 3+.
// Removes editorial scaffolding and repairs narrow repeatable grammar defects
// without changing football facts, names or numbers.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v).replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).replace(/\b(?:No|Mr|Mrs|Ms|Dr|St|Jr|Sr)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const cap=s=>String(s||'').replace(/^([^A-Za-z]*)([a-z])/,(_,a,b)=>a+b.toUpperCase());
const SYNTHETIC_SOURCE='(?:For|On|From|At|With)\\s+(?:(?:a|an|this|the)\\s+)?(?:direct|practical|measured|current|useful|immediate|grounded|clean|sharp|simple|focused|clear|realistic|tactical|strategic|repeatable|steady|specific|balanced|plain|decisive|careful|concrete|durable|short-term|season-long|matchup-specific|roster-wide|opponent-aware|standings-aware|scoring-driven|decision-level)\\s+(?:football|lineup|scoring|matchup|standings|roster|management|season|opponent|division|result|pressure|leverage|performance|starter|bench|schedule|playoff|form|weekly)\\s+(?:read|note|angle|lens|level|point|issue|view),\\s*';
const SYNTHETIC_ANY=new RegExp(`\\b${SYNTHETIC_SOURCE}`,'gi');
const SYNTHETIC_CHECK=new RegExp(`\\b${SYNTHETIC_SOURCE}`,'i');
const LABEL_SOURCE='(?:The practical read|The clean read|The clean version|The less glamorous truth|Here is the punch|Here is the loud part|Big letters first|Bottom line|The opponent already knows this|The opponent has already noticed|Rivals already know this|Rivals currently know this|Rivals should notice this|This much deserves criticism|The practical problem|The actual issue|The uncomfortable bit|The useful part|The real pressure point|The scoreboard version|The scoreboard point|The part opponents saw|One useful luxury remains|The next week begins with this|The next concern|The next assignment stays simple|The next lineup meeting should start here|Rivals will notice this|This is what rivals will remember|Management may prefer another subject|Management should screenshot this too|Management has to own this|No decoration needed|No mystery here|No tiny print|No need for a toast|No need for a celebration|Skip the warm-up|Start with the damage|Strip away the polish|Put this on the board|Placed this on the board|What matters here|Once the points settled|Once the output settled|After the final score|On this Sunday|The next opponent gets this opportunity|Without dressing it up|Against this opponent|For this matchup|For this lineup|For this starters|For the next game|One sensible point|A little restraint|For all the theater|In the standings)';
const STOCK_LABEL_ANY=new RegExp(`\\b${LABEL_SOURCE}\\s*:\\s*`,'gi');
const STACKED_LABEL=new RegExp(`${LABEL_SOURCE}\\s*:\\s*${LABEL_SOURCE}\\s*:`,'i');
const STOCK_LABEL_CHECK=new RegExp(`\\b${LABEL_SOURCE}\\s*:`,'i');
const AGREEMENT_ARTIFACT=/\b(?:the positioning are not a theory; they are|the race is not a theory; they are|the order are not a theory; they are)\b/i;
const GARBLED_MARGIN=/\bthe\s+(\d+(?:\.\d+)?)-point gap scoring to support behind the best scorers\b/i;
const RESULT_WERE=/\b(?:the opening entry for|the first result on)\b[^.!?]{0,100}\bwere\b/i;
const BY_ADDED=/\bchanged\s+(?:the\s+)?(?:roster|team)[^.!?]{0,45}\bby\s+added\b/i;
const BY_ADDING_DROPPED=/\bby adding\b[^.!?]{0,120}\band dropped\b/i;
const DOUBLE_THE=/\bthe\s+the\b/i;
const SITS_RANK=/\bAt\s+(\d+-\d+(?:-\d+)?),\s+(.+?)\s+sits\s+#(\d+)\s+overall\b/i;
const SITS_DIV_RANK=/\bAt\s+(\d+-\d+(?:-\d+)?),\s+(.+?)\s+sits\s+([^,.!?]{1,60}?)\s+in\s+([^,.!?]{1,60}?)\s+and\s+#(\d+)\s+overall\b/i;
const FAKE_FUTURE=/\s*:\s*0-0\s+and\s+outside\s+the\s+current\s+ranked\s+snapshot\b/i;
function cleanSentence(sentence,week){
 let s=norm(sentence),before=s;
 s=s.replace(SYNTHETIC_ANY,'').replace(STOCK_LABEL_ANY,'').replace(FAKE_FUTURE,'').replace(/\s{2,}/g,' ').trim();
 if(Number(week)<=13)s=s.replace(/\b(?:round|Sunday)\s+(\d{1,2})\b/gi,'Week $1').replace(/\bweek\s+(\d{1,2})\b/gi,(_,n)=>`Week ${n}`);
 s=s.replace(/\bleague order\b/gi,'league standings').replace(/\ba immediate\b/gi,'an immediate').replace(/\ba opponent-aware\b/gi,'an opponent-aware').replace(/\bseptember\b/g,'September')
  .replace(/\bthe positioning are not a theory; they are the part of the result everybody can see\.?/gi,'The standings position is not theoretical; it is visible in the result.')
  .replace(/\bthe race is not a theory; they are the part of the result everybody can see\.?/gi,'The race is not theoretical; the standings make that part of the result visible.')
  .replace(/\bthe order are not a theory; they are the part of the result everybody can see\.?/gi,'The standings position is not theoretical; it is visible in the result.')
  .replace(GARBLED_MARGIN,(_,gap)=>`the ${gap}-point gap came from too little support behind the best scorers`)
  .replace(/\b(the opening entry for|the first result on)([^.!?]{0,100})\bwere\b/gi,'$1$2was')
  .replace(/\bbench scoring were\b/gi,'bench points were').replace(/\bthe scoring behind him were\b/gi,'the scoring behind him was')
  .replace(/\bby added\b/gi,'by adding').replace(/\b(by adding\b[^.!?]{0,120})\band dropped\b/gi,'$1 and dropping')
  .replace(/\bthe\s+last\s+the\s+last\s+two\s+weeks\b/gi,'the last two weeks')
  .replace(/\bthe\s+the\b/gi,'the')
  .replace(SITS_DIV_RANK,(_,record,team,divisionRank,division,rank)=>`The standings put ${team} ${divisionRank} in ${division} and #${rank} overall with a ${record} record`)
  .replace(SITS_RANK,(_,record,team,rank)=>`The standings put ${team} at #${rank} overall with a ${record} record`)
  .replace(/\bsunday\b/g,'Sunday').replace(/\s{2,}/g,' ').trim();
 return s!==before?cap(s):s;
}
function rewrite(rows,week){return(rows||[]).map(p=>sentences(p).map(s=>cleanSentence(s,week)).filter(Boolean).join(' ').trim()).filter(Boolean)}
function article(a,week){if(!a)return;for(const sec of a.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,week);for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,week)}a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean)}
function allCopy(edition){const rows=[];for(const team of edition?.teams||[]){const a=team?.inquirer_article;if(a)rows.push(a.headline||'',a.deck||'',...(a.paragraphs||[]))}const o=edition?.league_overview;if(o){rows.push(o.headline||'',o.deck||'');for(const sec of o.sections||[]){rows.push(...(sec?.paragraphs||[]));for(const b of sec?.blocks||[])rows.push(...(b?.paragraphs||[]))}for(const h of o.hot_takes||[])rows.push(h?.take||'')}return rows.join('\n')}
export function findInquirerForwardSurfaceIssues(edition,{week}={}){if(!edition||Number(week)<3)return[];const text=allCopy(edition),issues=[];if(SYNTHETIC_CHECK.test(text))issues.push({kind:'synthetic-transition'});if(STACKED_LABEL.test(text))issues.push({kind:'stacked-stock-label'});if(AGREEMENT_ARTIFACT.test(text))issues.push({kind:'agreement-artifact'});if(GARBLED_MARGIN.test(text))issues.push({kind:'garbled-margin'});if(STOCK_LABEL_CHECK.test(text))issues.push({kind:'stock-label'});if(RESULT_WERE.test(text))issues.push({kind:'result-agreement'});if(BY_ADDED.test(text)||BY_ADDING_DROPPED.test(text))issues.push({kind:'transaction-grammar'});if(DOUBLE_THE.test(text))issues.push({kind:'double-article'});if(SITS_RANK.test(text)||SITS_DIV_RANK.test(text))issues.push({kind:'standings-agreement'});if(FAKE_FUTURE.test(text))issues.push({kind:'fake-future-record'});return issues}
export function finalSweepInquirerForwardEdition(edition,{week}={}){if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;for(const team of edition.teams)article(team?.inquirer_article,Number(week));const o=edition.league_overview;if(o){for(const sec of o.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,Number(week));for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,Number(week))}for(const h of o.hot_takes||[])if(h?.take)h.take=rewrite([h.take],Number(week)).join(' ')}return edition}
