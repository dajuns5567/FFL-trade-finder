// Read-only final editorial release gate for finished, fact-grounded editions.
// This is intentionally separate from authorization, Sleeper truth and approval.
// It must run BEFORE the publisher persists a future-week broadcast.
const flat=article=>(article?.sections||[]).flatMap(s=>s.paragraphs||[]).map(String);
const sec=(article,kind)=>(article?.sections||[]).find(s=>s.kind===kind)?.paragraphs?.join(' ')||'';
const normalized=s=>String(s||'').toLowerCase().replace(/\d+(?:\.\d+)?/g,'#').replace(/\s+/g,' ').trim();
const sentence=s=>String(s||'').replace(/\s+/g,' ').split(/(?<=[.!?])\s+(?=[A-Z"'“‘])/).filter(Boolean);
const words=s=>(String(s||'').match(/\b[\w'-]+\b/g)||[]).length;
const fictional=/imaginary|fictional|satirical|cartoon|pretend|make-believe/i;
const scene=/pitchfork|parade|champagne|protest|bartender|firework|statue|fountain|crowd|street|march|party|sign|toast|convertible|stadium|confetti|radio|supporters|placard/i;
const opinion=/\b(?:deserve|earned|should|must|needs?|embarrass|shame|absurd|ridiculous|indefensible|pathetic|disgrace|pardon|applaud|accountab|credit|blame|excuse|reckless|fraud|spectacular|brutal|miserable|unacceptable|outrage|trust|panic|suspicious|unfit|inexcusable|laughable|furious|humiliat|ludicrous|disaster|mercy|believe|angry|worry|demand|question|enough|better|worse|funny|joke|comedy|disappoint|stupid|terrible)\w*\b/i;
const generic=/eligible points|projection provenance|verified legal rescue|the reporter should|this article should|consult live week \d+ projections/i;
const keys=['lede','players','management','hot-seat','cool-throne','sentiment','outlook'];
const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const near=(a,b)=>number(a)&&number(b)&&Math.abs(Number(a)-Number(b))<0.11;

export function evaluateFutureEditorialRelease(edition,prior=null,{approval=null}={}){
 const issues=[],teams=edition?.teams||[],reporterStats=new Map();
 const fail=(who,what)=>issues.push(who+': '+what);
 if(Number(edition?.week)<=4)return {ok:true,issues:[],not_applicable:true};
 if(teams.length!==32||new Set(teams.map(t=>t.team_name)).size!==32)fail('edition','exactly 32 distinct teams required');
 const att=approval;
 if(att?.approved!==true||Number(att.season)!==Number(edition.season)||Number(att.week)!==Number(edition.week)||!String(att.reviewed_by||'').trim()||!/^\\d{4}-\\d{2}-\\d{2}T/.test(String(att.reviewed_at||''))||!Number.isFinite(Date.parse(String(att.reviewed_at||''))))fail('edition','trusted week-specific human editorial approval attestation required');
 const quality=edition?.editorial_quality;
 if(quality?.status!=='HOLD_EDITORIAL_APPROVAL'||quality?.fresh_briefs_complete!==true||quality?.review_required!==true)fail('edition','all fresh briefs and explicit review-required status mandatory');
 const previous=new Set((prior?.teams||[]).flatMap(t=>flat(t.inquirer_article)).flatMap(sentence).map(normalized).filter(s=>s.length>75));
 const within=new Map();
 for(const t of teams){
  const id=String(t.team_name||'unknown'),a=t.inquirer_article;
  if(!a||a.future_brief_status!=='COMPLETE_UNAPPROVED'){fail(id,'fresh section brief not verified');continue;}
  for(const k of keys)if(words(sec(a,k))< (k==='hot-seat'||k==='cool-throne'?12: k==='lede'?30: k==='players'?30: k==='sentiment'?70: k==='outlook'?25:25))fail(id,'thin or absent '+k+' reporting');
  const article=flat(a).join(' ');
  if(words(article)<250)fail(id,'article below 250 words');
  if(generic.test(article))fail(id,'internal technical language in article');
  const fan=sec(a,'sentiment');
  if(!fictional.test(fan)||!scene.test(fan))fail(id,'missing clearly hypothetical sports-fan scene');
  const mood=a.fan_sentiment?.score;
  if(!number(mood)||!fan.includes(Number(mood).toFixed(1)))fail(id,'fan prose does not include measured mood');
  const next=String(t.next_opponent_name||'');
  if(!next||!sec(a,'outlook').toLowerCase().includes(next.toLowerCase()))fail(id,'next-opponent commentary absent');
  if(number(t.points)&&number(t.opponent_points)){
   const lede=sec(a,'lede');
   if(!lede.includes(Number(t.points).toFixed(1))||!lede.includes(Number(t.opponent_points).toFixed(1)))fail(id,'lede does not identify both verified scores');
  }
  const playerText=sec(a,'players');
  const starters=(t.starter_details||[]).filter(p=>p?.name&&number(p.points));
  if(!starters.some(p=>playerText.toLowerCase().includes(String(p.name).toLowerCase())&&playerText.includes(Number(p.points).toFixed(1))))fail(id,'player commentary lacks named starter with verified score');
  if(/\(\d+(?:\.\d+)?\s+pts\)\s+\d+(?:\.\d+)?\b/i.test(playerText))fail(id,'duplicate injected player score');
  const bench=t.best_lineup_miss||a.facts?.best_lineup_miss;
  if(bench?.starter&&bench?.reserve&&number(bench.gap)&&!near(Number(bench.reserve.points)-Number(bench.starter.points),bench.gap))fail(id,'bench swap arithmetic contradicts source');
  const reporter=a.reporter?.id||a.reporter?.name||'unknown',stats=reporterStats.get(reporter)||{sections:0,opinion:0,articles:0};
  stats.articles++;
  for(const k of keys){stats.sections++;if(opinion.test(sec(a,k)))stats.opinion++;}
  reporterStats.set(reporter,stats);
  for(const line of flat(a).flatMap(sentence)){
   const key=normalized(line);
   if(key.length<75)continue;
   if(previous.has(key))fail(id,'recycled last-week sentence: '+line.slice(0,100));
   const prev=within.get(key);
   if(prev&&prev!==id)fail(id,'verbatim sentence reused from '+prev);
   else within.set(key,id);
  }
 }
 for(const [name,r] of reporterStats){
  if(r.articles>=2&&r.opinion/r.sections<0.15)fail('reporter '+name,'opinionated voice collapsed');
 }
 const overview=edition?.league_overview,blocks=overview?.sections?.[0]?.blocks||[];
 if(overview?.future_recap_brief_status!=='COMPLETE_UNAPPROVED')fail('recap','fresh complete recap brief missing');
 if(blocks.length!==6||!['lead','standings','players','decisions','league','outlook'].every((key,i)=>blocks[i]?.kind===key&&words((blocks[i].paragraphs||[]).join(' '))>=35))fail('recap','six complete league-wide editorial desks required');
 const full=(overview?.sections||[]).flatMap(s=>s.blocks?.length?s.blocks.flatMap(b=>b.paragraphs||[]):s.paragraphs||[]).join(' ');
 if(words(full)<400)fail('recap','league-wide recap too thin');
 const oldRecap=(prior?.league_overview?.sections||[]).flatMap(s=>s.blocks?.length?s.blocks.flatMap(b=>b.paragraphs||[]):s.paragraphs||[]).flatMap(sentence).map(normalized);
 const recapPrevious=new Set(oldRecap.filter(s=>s.length>75));
 for(const line of sentence(full))if(recapPrevious.has(normalized(line)))fail('recap','previous-week sentence reused: '+line.slice(0,90));
 return {ok:issues.length===0,issues,reporter_summary:Object.fromEntries(reporterStats),week:Number(edition?.week),editorial_review_required:true};
}
