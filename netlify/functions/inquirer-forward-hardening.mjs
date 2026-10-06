// Last-resort Week 3+ newsroom hardening. This pass runs after the normal
// forward editor/freshness/finalizer chain and only changes sentences that would
// otherwise look stale, duplicated, meta, or structurally repetitive. Facts and
// numbers are preserved; only the surrounding prose shape is varied.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const parts=v=>norm(v)
  .replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§'))
  .replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§'))
  .split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const wc=v=>norm(v).split(/\s+/).filter(Boolean).length;
const lower=s=>String(s||'').replace(/^([“"']?)([A-Z])/,(_,q,c)=>q+c.toLowerCase());
const simple=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
const shape=(s,n=5)=>simple(s).split(/\s+/).filter(Boolean).slice(0,n).join(' ');

const OPENERS=[
  'For the immediate football read,','On the next lineup question,','From the matchup itself,','At the practical level,','For the part that matters,','Once the score is settled,','With the noise stripped away,','For the usable takeaway,','On the roster side,','For the next decision,','In the weekly ledger,','From the manager’s chair,','On the field of play,','For the standings picture,','At lineup lock,','When the points are counted,','From the opponent’s view,','For this week’s consequence,','On the useful side,','For the part worth keeping,','In the next matchup,','At the roster level,','From the final score,','For the correction ahead,','On the football merits,','At the week-to-week level,','From the scoring margin,','For the repeatable lesson,','In the current race,','At the lineup level,','From Sunday’s result,','For the next opponent,','On the management side,','At the standings level,','From the weekly result,','For the practical fix,','On the immediate concern,','At the matchup level,','From the roster view,','For the next test,','On the scoring side,','At the decision point,','From the season view,','For the clean football read,','On the useful football point,','At the next lineup lock,','From the current position,','For the weekly consequence,','On the actual weakness,','At the actual strength,','From the result alone,','For the part rivals noticed,','On the part management owns,','At the pressure point,','From the current form,','For the repeatable strength,','On the avoidable mistake,','At the next checkpoint,','From the division picture,','For the current leverage,','On the next correction,','At the season level,','From this roster’s week,','For the scoring consequence,','On the next roster call,','At the matchup consequence,','From the lineup result,','For the current concern,','On the part to preserve,','At the part to repair,','From the weekly evidence-free read,','For the actual football consequence,','On the next usable adjustment,','At the point of impact,','From the week just played,','For the next clean answer,','On the immediate roster issue,','At the current football level,','From the result that counts,','For the next practical answer,'
];

const LEAD_SCAFFOLD=/^(?:(?:Right now|This week|In plain terms|For once|At minimum|More importantly|On balance|After Sunday|As it stands|In practice|From here|For this roster|Before next week|For the standings|Against this opponent|For this matchup|Once the score settled|Looking ahead|For the lineup),?\s+)?(?:the bottom line|the useful part|the practical read|what matters|the clean version|the actual issue|the football part|the part to keep|the part to fix|the scoreboard point|the next concern|the simplest read|the part rivals noticed|the part management owns|the consequence is simple|the important bit|the real pressure point|the part worth remembering|the matchup lesson|the standings lesson):\s*/i;
const META=/\b(?:copy desk|newsroom|this article|the article|this paragraph|same paragraph|same sentence|we wrote|i wrote|editorial|evidence says|the evidence|investigat(?:e|ion|ing)|case file|the file says|proof|verdict|exhibit|sample size|one repeat|another data point|test whether|gets to decide whether|decide whether it was real|whether it was real)\b/gi;
const JUNK=/^(?:n\/a|(?:No\.\s*)?[-+]?\d+(?:\.\d+)?(?:st|nd|rd|th)?(?:\)|\)|\.|\)\.|\.)?|(?:No\.\s*)?[-+]?\d+(?:\.\d+)?(?:st|nd|rd|th)?\s+in the league order\.?)$/i;

function scrub(s){
  let x=norm(s);if(!x||JUNK.test(x))return'';
  x=x.replace(META,m=>{
    const k=m.toLowerCase();
    if(k.includes('investigat'))return'review';
    if(k.includes('article')||k.includes('paragraph')||k.includes('sentence')||k.includes('editorial')||k.includes('copy desk')||k.includes('newsroom'))return'column';
    if(k.includes('sample size'))return'recent stretch';
    if(k.includes('data point')||k.includes('repeat'))return'week';
    if(k.includes('proof')||k.includes('evidence')||k.includes('exhibit')||k.includes('verdict')||k.includes('file'))return'result';
    if(k.includes('whether'))return'if';
    return'read';
  });
  x=x.replace(/\barguments?\b/gi,'issues')
     .replace(/\bSunday left one clear point\b/gi,'Sunday made one thing clear')
     .replace(/\bthe real pressure point\b/gi,'the immediate pressure point')
     .replace(/\s{2,}/g,' ').trim();
  return JUNK.test(x)?'':x;
}

function priorMap(previous){
  const out=new Map();
  for(const t of previous?.teams||[]){
    const a=t?.inquirer_article,rows=(a?.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]);
    out.set(String(t?.roster_id||''),new Set(rows.flatMap(parts).map(simple).filter(Boolean)));
  }
  return out;
}

function opener(state){
  const value=OPENERS[state.open++%OPENERS.length];
  return value;
}
function diversify(s,state){
  let body=scrub(s).replace(LEAD_SCAFFOLD,'');
  if(!body)return'';
  return `${opener(state)} ${lower(body)}`;
}

function rewriteParagraphs(paragraphs,key,ctx){
  return (paragraphs||[]).map(p=>{
    const out=[];
    for(let s of parts(p)){
      s=scrub(s);if(!s)continue;
      const originalSimple=simple(s),sh=shape(s),prior=ctx.prior.get(key)||new Set();
      const owners=ctx.shapes.get(sh)||new Set();
      const stale=prior.has(originalSimple);
      const dup=ctx.seen.has(originalSimple);
      const repeatedShape=sh.split(' ').length>=5&&owners.size>=1&&!owners.has(key);
      if(stale||dup||repeatedShape)s=diversify(s,ctx.state);
      const n=simple(s),newShape=shape(s),newOwners=ctx.shapes.get(newShape)||new Set();
      if(n)ctx.seen.add(n);newOwners.add(key);ctx.shapes.set(newShape,newOwners);
      out.push(s);
    }
    return out.join(' ').trim();
  }).filter(Boolean);
}

function rewriteArticle(team,ctx){
  const a=team?.inquirer_article;if(!a)return;
  const key=String(team?.roster_id||team?.team_name||'team');
  for(const s of a.sections||[]){
    if(Array.isArray(s?.paragraphs))s.paragraphs=rewriteParagraphs(s.paragraphs,key,ctx);
    for(const b of s?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewriteParagraphs(b.paragraphs,key,ctx);
  }
  a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
}

function rewriteOverview(o,ctx){
  if(!o)return;const key='__weekly_recap__';
  for(const s of o.sections||[]){
    if(Array.isArray(s?.paragraphs))s.paragraphs=rewriteParagraphs(s.paragraphs,key,ctx);
    for(const b of s?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewriteParagraphs(b.paragraphs,key,ctx);
  }
  for(const h of o.hot_takes||[]){if(h?.take)h.take=rewriteParagraphs([h.take],key,ctx).join(' ')}
}

export function hardenInquirerForwardEdition(edition,{week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const ctx={prior:priorMap(previousEdition),seen:new Set(),shapes:new Map(),state:{open:Number(week)*7}};
  for(const team of edition.teams)rewriteArticle(team,ctx);
  rewriteOverview(edition.league_overview,ctx);
  return edition;
}
