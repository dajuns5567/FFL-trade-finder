// Week 3+ structural editor for Fleeced! Inquirer.
// Facts stay intact. This pass removes stale newsroom motifs and varies sentence
// structure across a 32-column edition before the quality gate sees it.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const split=v=>norm(v).replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const words=v=>norm(v).split(/\s+/).filter(Boolean).length;
const lowerLead=s=>String(s||'').replace(/^([“"']?)([A-Z])/,(_,q,c)=>q+c.toLowerCase());

const LEADS=[
  'Bottom line:', 'The practical read:', 'What matters here:', 'No decoration needed:',
  'Sunday left one clear point:', 'The useful part:', 'The clean read:', 'The actual issue:',
  'Without dressing it up:', 'The less glamorous truth:', 'A little restraint:', 'Strip away the polish:',
  'One sensible point:', 'No need for a toast:', 'For all the theater:', 'The part worth keeping:',
  'Big letters first:', 'Here is the loud part:', 'No tiny print:', 'Put this on the board:',
  'Skip the warm-up:', 'Start with the damage:', 'The scoreboard version:', 'Here is the punch:',
  'Rivals should notice this:', 'The uncomfortable bit:', 'No mystery here:', 'The practical problem:',
  'The part opponents saw:', 'Rivals already know this:', 'The part worth circling:', 'Management has to own this:',
  'For this matchup:', 'On this Sunday:', 'Against this opponent:', 'For this lineup:',
  'In the standings:', 'For the next game:', 'After the final score:', 'Once the points settled:'
];

const INTRO_RE=/^(?:The football read is straightforward|Strip away the noise and this is what remains|The weekly ledger is blunt here|The useful football answer is simpler|Put the emotion to one side for a second|The Sunday note that survives review is this|The cleanest read from the result is this|Start with the part that will still matter Tuesday|The less glamorous truth is this|There is no elegant detour around it|The cleaner football answer is this|No need to romanticize the result|The civilized version is still fairly obvious|Once the postgame swagger wears off, this remains|The part worth keeping after the applause is this|Even a dramatic Sunday can be reduced to one useful point|Here is the loud part|Put this on the big screen|The back-page version is simple|Skip the polite introduction|Here is what survives the shouting|The part rival managers will screenshot is this|No tiny print required|This is the sentence the group chat will keep|Rivals can circle this|The rival-chat version is uncomfortable|No conspiracy is required here|The part opponents will remember is this|The annoying fact survives review|Rivals do not need help finding this one|The useful weakness-or-strength note is this|This is the detail that will follow them into next week):\s*/i;

const META_ONLY=/\b(?:copy desk|newsroom|this article|same paragraph|same sentence|case file|docket|cross-examination|defendant|prosecution|indictment|courtroom|peer review|sample size|one-week witness|new piece of proof|hostile questioning)\b/i;
const TRIVIAL=/^(?:n\/a|[-+]?\d+(?:\.\d+)?[.)]?|[-+]?\d+(?:\.\d+)?\s+in the league order\.?|early, yes\.?|irrelevant, no\.?)$/i;

function scrub(sentence){
  let s=norm(sentence);
  if(!s||TRIVIAL.test(s))return'';
  s=s
    .replace(/\bchanged the evidence enough to stand on its own\b/gi,'changed the week enough to matter on its own')
    .replace(/\bchanged the evidence\b/gi,'changed the result')
    .replace(/\bthe evidence\b/gi,'the result')
    .replace(/\bevidence\b/gi,'production')
    .replace(/\bcase file\b/gi,'matchup notes')
    .replace(/\bdocket\b/gi,'list')
    .replace(/\bcross-examination\b/gi,'pressure')
    .replace(/\bdefendant\b/gi,'starter')
    .replace(/\bprosecution\b/gi,'criticism')
    .replace(/\bindictment\b/gi,'warning')
    .replace(/\bcourtroom\b/gi,'matchup')
    .replace(/\bverdict\b/gi,'read')
    .replace(/\bproof\b/gi,'result')
    .replace(/\bAt 1-1, nobody owns the argument\b/gi,'At 1-1, nobody owns much leverage')
    .replace(/\bthe argument actually begins\b/gi,'the matchup actually begins')
    .replace(/\bargument\b/gi,'read')
    .replace(/\bquestion\b/gi,'problem')
    .replace(/\btest whether\b/gi,'show whether')
    .replace(/\bgets to decide whether\b/gi,'will show whether')
    .replace(/\bdecides whether\b/gi,'will show whether')
    .replace(/\bthe file everyone can read without squinting\b/gi,'the result everybody can see')
    .replace(/\bworth reopening\b/gi,'worth another look')
    .replace(/\bdata point\b/gi,'week')
    .replace(/\bscreenshot(?:s|ting|ted)?\b/gi,'joke')
    .replace(/\bgroup chat\b/gi,'rivals')
    .replace(/\brival chat\b/gi,'rivals')
    .replace(/\bback[- ]page\b/gi,'headline')
    .replace(/\bcopy desk\b/gi,'league')
    .replace(/\bnewsroom\b/gi,'league')
    .replace(/\s{2,}/g,' ')
    .trim();
  if(META_ONLY.test(s)&&!/[0-9]/.test(s))return'';
  return s;
}

function entities(edition,previous){
  return [...(edition?.teams||[]),...(previous?.teams||[])].flatMap(t=>[
    t?.team_name,t?.manager_name,t?.opponent_name,t?.next_opponent_name,
    ...(t?.starter_details||[]).map(p=>p?.name)
  ]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
}
function normalized(sentence,allEntities){
  let s=String(sentence||'');
  for(const e of allEntities)s=s.replace(new RegExp(esc(e),'gi'),'[ENTITY]');
  return s.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,'[#]').replace(/\s+/g,' ').trim();
}
function prefixShape(sentence,n=5){return norm(sentence).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').split(/\s+/).filter(Boolean).slice(0,n).join(' ')}

function previousByRoster(previous){
  const map=new Map();
  for(const t of previous?.teams||[])map.set(String(t?.roster_id||''),new Set((t?.inquirer_article?.paragraphs||[]).flatMap(split).map(s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim())));
  return map;
}
function simpleNorm(s){return norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim()}

function leadPicker(state,seed){
  for(let i=0;i<LEADS.length;i++){
    const idx=(seed+i)%LEADS.length,lead=LEADS[idx];
    if(!state.usedLeads.has(lead)){state.usedLeads.add(lead);return lead}
  }
  return LEADS[seed%LEADS.length];
}
function hash(s){let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function diversify(sentence,state,seed){
  let s=norm(sentence).replace(INTRO_RE,'').trim();
  if(!s)return'';
  const lead=leadPicker(state,hash(seed));
  return `${lead} ${lowerLead(s)}`;
}

function playerMap(team){
  const out=[];
  for(const p of team?.starter_details||[]){
    const full=String(p?.name||'').trim(),last=full.split(/\s+/).filter(Boolean).at(-1)||full;
    if(full&&full!==last)out.push({full,last});
  }
  return out.sort((a,b)=>b.full.length-a.full.length);
}
function varyEntityLead(sentence,team,counts){
  let s=norm(sentence),full=String(team?.team_name||'').trim();
  if(full&&new RegExp(`^${esc(full)}\\b`,'i').test(s)){
    const n=(counts.get(full)||0)+1;counts.set(full,n);
    if(n>2){
      if(new RegExp(`^${esc(full)}['’]s\\b`,'i').test(s))s=s.replace(new RegExp(`^${esc(full)}['’]s\\b`,'i'),'Their');
      else s=s.replace(new RegExp(`^${esc(full)}\\b`,'i'),'They');
    }
  }
  for(const p of playerMap(team)){
    if(!new RegExp(`^${esc(p.full)}\\b`,'i').test(s))continue;
    const key=`player:${p.full}`,n=(counts.get(key)||0)+1;counts.set(key,n);
    if(n>2)s=s.replace(new RegExp(`^${esc(p.full)}\\b`,'i'),p.last);
    break;
  }
  return s;
}

function processArticle(team,article,{week,prior,state,allEntities}){
  if(!article)return;
  const leadCounts=new Map(),priorSet=prior.get(String(team?.roster_id||''))||new Set();
  let index=0;
  for(const section of article.sections||[]){
    if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(row=>{
      const out=[];
      for(let sentence of split(row)){
        sentence=scrub(sentence);if(!sentence)continue;
        sentence=varyEntityLead(sentence,team,leadCounts);
        const rawNorm=simpleNorm(sentence),hasIntro=INTRO_RE.test(sentence);
        if(hasIntro||priorSet.has(rawNorm))sentence=diversify(sentence,state,`${week}|${team?.roster_id}|${index}|prior`);
        out.push(sentence);index++;
      }
      return out.join(' ').trim();
    }).filter(Boolean);
    for(const block of section?.blocks||[]){
      if(!Array.isArray(block?.paragraphs))continue;
      block.paragraphs=block.paragraphs.map(row=>{
        const out=[];
        for(let sentence of split(row)){
          sentence=scrub(sentence);if(!sentence)continue;
          sentence=varyEntityLead(sentence,team,leadCounts);
          if(INTRO_RE.test(sentence)||priorSet.has(simpleNorm(sentence)))sentence=diversify(sentence,state,`${week}|${team?.roster_id}|block|${index}`);
          out.push(sentence);index++;
        }
        return out.join(' ').trim();
      }).filter(Boolean);
    }
  }
  article.paragraphs=(article.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
}

function processOverview(overview,{week,state}){
  if(!overview)return;
  const teamLeadCounts=new Map();let index=0;
  const varyTeamLead=s=>{
    for(const name of state.teamNames){
      if(!new RegExp(`^${esc(name)}\\b`,'i').test(s))continue;
      const n=(teamLeadCounts.get(name)||0)+1;teamLeadCounts.set(name,n);
      if(n>2){const short=name.split(/\s+/).filter(Boolean).at(-1)||name;s=s.replace(new RegExp(`^${esc(name)}\\b`,'i'),short)}
      break;
    }
    return s;
  };
  for(const section of overview.sections||[]){
    if(Array.isArray(section?.paragraphs))section.paragraphs=section.paragraphs.map(row=>split(row).map(sentence=>{
      let s=scrub(sentence);if(!s)return'';s=varyTeamLead(s);if(INTRO_RE.test(s))s=diversify(s,state,`${week}|recap|${index}`);index++;return s;
    }).filter(Boolean).join(' ')).filter(Boolean);
    for(const block of section?.blocks||[]){
      if(!Array.isArray(block?.paragraphs))continue;
      block.paragraphs=block.paragraphs.map(row=>split(row).map(sentence=>{let s=scrub(sentence);if(!s)return'';s=varyTeamLead(s);if(INTRO_RE.test(s))s=diversify(s,state,`${week}|recap-block|${index}`);index++;return s}).filter(Boolean).join(' ')).filter(Boolean);
    }
  }
  for(const take of overview.hot_takes||[]){take.title=scrub(take.title);take.take=split(take.take).map(scrub).filter(Boolean).join(' ')}
}

function revisitAll(edition,{week,state,allEntities}){
  const seenNorm=new Set(),shapeTeams=new Map(),counter={n:0};
  const rewriteRows=(rows,teamKey)=>rows.map(row=>{
    const out=[];
    for(let sentence of split(row)){
      if(!sentence||TRIVIAL.test(sentence))continue;
      let n=normalized(sentence,allEntities),shape=prefixShape(sentence),teams=shapeTeams.get(shape)||new Set();
      const repeatedNorm=seenNorm.has(n),overusedShape=shape.split(' ').length>=5&&teams.size>=2&&!teams.has(teamKey);
      if(repeatedNorm||overusedShape){
        sentence=diversify(sentence,state,`${week}|global|${teamKey}|${counter.n++}|${n}`);
        n=normalized(sentence,allEntities);shape=prefixShape(sentence);teams=shapeTeams.get(shape)||new Set();
      }
      seenNorm.add(n);teams.add(teamKey);shapeTeams.set(shape,teams);out.push(sentence);
    }
    return out.join(' ').trim();
  }).filter(Boolean);
  for(const team of edition.teams||[]){
    const a=team?.inquirer_article;if(!a)continue;
    for(const section of a.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=rewriteRows(section.paragraphs,String(team.roster_id));
      for(const block of section?.blocks||[])if(Array.isArray(block?.paragraphs))block.paragraphs=rewriteRows(block.paragraphs,String(team.roster_id));
    }
    a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
  }
  const o=edition.league_overview;if(o){
    for(const section of o.sections||[]){
      if(Array.isArray(section?.paragraphs))section.paragraphs=rewriteRows(section.paragraphs,'__league__');
      for(const block of section?.blocks||[])if(Array.isArray(block?.paragraphs))block.paragraphs=rewriteRows(block.paragraphs,'__league__');
    }
  }
}

export function applyInquirerForwardStructural(edition,{week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const allEntities=entities(edition,previousEdition),prior=previousByRoster(previousEdition),state={usedLeads:new Set(),teamNames:(edition.teams||[]).map(t=>String(t?.team_name||'')).filter(Boolean).sort((a,b)=>b.length-a.length)};
  for(const team of edition.teams)processArticle(team,team?.inquirer_article,{week,prior,state,allEntities});
  processOverview(edition.league_overview,{week,state});
  revisitAll(edition,{week,state,allEntities});
  return edition;
}
