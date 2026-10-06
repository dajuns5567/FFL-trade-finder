// Final Week 3+ edition-wide pass. Runs after all reporter/context additions so
// no late transform can reintroduce stale scaffolds, repeated leads or retired
// metaphors. It preserves factual clauses and changes structure around them.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const parts=v=>norm(v).replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).replace(/\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|No)\.(?=\s+[A-Z0-9])/g,m=>m.replace('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const wc=v=>norm(v).split(/\s+/).filter(Boolean).length;
const lower=s=>String(s||'').replace(/^([“"']?)([A-Z])/,(_,q,c)=>q+c.toLowerCase());
const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

const MODS=['','Right now, ','This week, ','In plain terms, ','For once, ','At minimum, ','More importantly, ','On balance, ','After Sunday, ','As it stands, ','In practice, ','From here, ','For this roster, ','Before next week, ','For the standings, ','Against this opponent, ','For this matchup, ','Once the score settled, ','Looking ahead, ','For the lineup, '];
const STEMS=['the bottom line:','the useful part:','the practical read:','what matters:','the clean version:','the actual issue:','the football part:','the part to keep:','the part to fix:','the scoreboard point:','the next concern:','the simplest read:','the part rivals noticed:','the part management owns:','the consequence is simple:','the important bit:','the real pressure point:','the part worth remembering:','the matchup lesson:','the standings lesson:'];

function lead(state,seed){
  const total=MODS.length*STEMS.length;
  for(let i=0;i<total;i++){
    const idx=(hash(seed)+state.seq+i)%total,mi=Math.floor(idx/STEMS.length),si=idx%STEMS.length;
    const phrase=(MODS[mi]+STEMS[si]).trim(),key=phrase.toLowerCase();
    if(!state.used.has(key)){state.used.add(key);state.seq++;return phrase.charAt(0).toUpperCase()+phrase.slice(1)}
  }
  state.seq++;return `For this Week ${state.week} matchup, the practical read:`;
}
function diversify(sentence,state,seed){return `${lead(state,seed)} ${lower(norm(sentence))}`}

function scrub(s,reporter=''){
  let x=norm(s);if(!x)return'';
  if(/^(?:n\/a|[-+]?\d+(?:\.\d+)?[.)]?|[-+]?\d+(?:\.\d+)?\s+in the league order\.?)$/i.test(x))return'';
  x=x
    .replace(/\bchanged the evidence enough to stand on its own\b/gi,'changed the week enough to matter on its own')
    .replace(/\bchanged the evidence\b/gi,'changed the result')
    .replace(/\bthe evidence\b/gi,'the result')
    .replace(/\bevidence\b/gi,'production')
    .replace(/\bproof\b/gi,'result')
    .replace(/\bverdict\b/gi,'read')
    .replace(/\bsample size\b/gi,'recent games')
    .replace(/\bdata point\b/gi,'week')
    .replace(/\bcase file\b/gi,'matchup notes')
    .replace(/\bdocket\b/gi,'list')
    .replace(/\bcross-examination\b/gi,'pressure')
    .replace(/\bdefendant\b/gi,'starter')
    .replace(/\bprosecution\b/gi,'criticism')
    .replace(/\bprosecute\b/gi,'punish')
    .replace(/\bindictment\b/gi,'warning')
    .replace(/\bcourtroom\b/gi,'matchup')
    .replace(/\bacquittal\b/gi,'excuse')
    .replace(/\balibi\b/gi,'cover')
    .replace(/\bwitness\b/gi,'example')
    .replace(/\bthe file everyone can read without squinting\b/gi,'the result everybody can see')
    .replace(/\bgroup chat\b/gi,'rivals')
    .replace(/\brival chat\b/gi,'rivals')
    .replace(/\bscreenshot(?:s|ting|ted)?\b/gi,'joke')
    .replace(/\bcopy desk\b/gi,'league')
    .replace(/\bnewsroom\b/gi,'league')
    .replace(/\bpeer review\b/gi,'another game')
    .replace(/\bhostile questioning\b/gi,'pressure')
    .replace(/\btest whether\b/gi,'show whether')
    .replace(/\bgets to decide whether\b/gi,'will show whether')
    .replace(/\bdecides whether\b/gi,'will show whether')
    .replace(/\bthe argument actually begins\b/gi,'the matchup actually begins')
    .replace(/\bAt 1-1, nobody owns the argument\b/gi,'At 1-1, nobody owns much leverage')
    .replace(/\s{2,}/g,' ').trim();
  if(reporter==='tess-delaney')x=x
    .replace(/\bfurniture\b/gi,'lineup pieces').replace(/\bchairs?\b/gi,'spots').replace(/\btables?\b/gi,'standings')
    .replace(/\btablecloth\b/gi,'presentation').replace(/\blinen\b/gi,'polish').replace(/\bnapkin\b/gi,'polish')
    .replace(/\bchina\b/gi,'best material').replace(/\bsilverware\b/gi,'hardware').replace(/\bplace setting\b/gi,'lineup spot')
    .replace(/\bdining room\b/gi,'league').replace(/\bdinner\b/gi,'week').replace(/\bcenterpiece\b/gi,'top scorer')
    .replace(/\bvelvet rope\b/gi,'front line').replace(/\bchaise\b/gi,'bench').replace(/\bballroom\b/gi,'matchup')
    .replace(/\bsalon\b/gi,'league').replace(/\bcoat check\b/gi,'bench').replace(/\brestaurant\b/gi,'league')
    .replace(/\bwaiter\b/gi,'opponent').replace(/\btoast\b/gi,'celebration');
  return x.replace(/\s{2,}/g,' ').trim();
}

function allEntities(edition,previous){return[...(edition?.teams||[]),...(previous?.teams||[])].flatMap(t=>[t?.team_name,t?.manager_name,t?.opponent_name,t?.next_opponent_name,...(t?.starter_details||[]).map(p=>p?.name)]).filter(Boolean).map(String).sort((a,b)=>b.length-a.length)}
function entityNorm(s,entities){let x=String(s||'');for(const e of entities)x=x.replace(new RegExp(esc(e),'gi'),'[ENTITY]');return x.toLowerCase().replace(/\b\d+(?:\.\d+)?%?\b/g,'[#]').replace(/\s+/g,' ').trim()}
function simpleNorm(s){return norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim()}
function shape(s,n=5){return norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').split(/\s+/).filter(Boolean).slice(0,n).join(' ')}
function properLead(s){const m=norm(s).match(/^[“"']?([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+){1,3})\b/);return m?m[1].replace(/[“"']/g,''):''}

function aliases(team,teamNames){
  const rows=[];
  for(const name of teamNames){const short=name.split(/\s+/).filter(Boolean).at(-1)||name;if(name!==short)rows.push({full:name,short,type:'team'})}
  for(const p of team?.starter_details||[]){const full=String(p?.name||'').trim(),short=full.split(/\s+/).filter(Boolean).at(-1)||full;if(full&&full!==short)rows.push({full,short,type:'player'})}
  return rows.sort((a,b)=>b.full.length-a.full.length);
}
function shortenRepeatedLead(sentence,rows,counts,previousLead){
  let s=norm(sentence);
  for(const row of rows){
    if(!new RegExp(`^${esc(row.full)}\\b`,'i').test(s))continue;
    const key=row.full.toLowerCase(),n=(counts.get(key)||0)+1;counts.set(key,n);
    const same=previousLead&&previousLead.toLowerCase()===row.full.toLowerCase();
    if(n>2||same)s=s.replace(new RegExp(`^${esc(row.full)}\\b`,'i'),row.short);
    break;
  }
  return s;
}

const INTERPRET=/\b(?:because|which means|that means|but|however|therefore|matters?|problem|warning|useful|earned|deserved|embarrass|ridiculous|painful|good|bad|ugly|should|needs?|cannot|can't|did not|does not|enough|cost|saved|carried|wasted|exposed|punished|survived|buried|blew out|stole|dragged|leverage|standings|division|opponent|matchup|margin|relief|regret|pressure|damage)\b/i;
const STAT=/\b(?:scored|posted|finished with|put up|gave|produced|added|fantasy points|projection|projected|odds|chance|ranked|seed|Cool Throne|Hot Seat)\b[^.!?]*\d/i;
const RECAP_TAKES=[
  'That mattered because the opponent had to answer it, not because the number looked tidy.',
  'The number is only interesting because it changed what the other side needed to do.',
  'That is matchup pressure, not decorative arithmetic.',
  'The useful part is the consequence: somebody on the other side had to pay for it.',
  'That belongs in the recap because it changed the week, not because spreadsheets enjoy company.',
  'The stat earns space here because the matchup bent around it.',
  'That is the difference between a number worth printing and one worth deleting.',
  'The result attached to it is what makes the number useful.',
  'That left a real mark on the matchup instead of merely filling a row.',
  'The opponent felt that number, which is the only reason to linger on it.'
];
function recapBareTake(sentence,state,seed){if(!STAT.test(sentence)||INTERPRET.test(sentence))return'';const row=RECAP_TAKES[(hash(seed)+state.recapAdds)%RECAP_TAKES.length];state.recapAdds++;return row}

function priorByTeam(previous,entities){const out=new Map();for(const t of previous?.teams||[])out.set(String(t?.roster_id||''),new Set((t?.inquirer_article?.paragraphs||[]).flatMap(parts).filter(s=>wc(s)>=8).map(s=>entityNorm(s,entities))));return out}

function rewriteArticle(team,article,ctx){
  if(!article)return;
  const reporter=String(article?.reporter?.id||''),rows=aliases(team,ctx.teamNames),counts=new Map(),prior=ctx.prior.get(String(team?.roster_id||''))||new Set();let lastLead='';
  const rewrite=paragraphs=>(paragraphs||[]).map((p,pi)=>{
    const out=[];
    for(let s of parts(p)){
      s=scrub(s,reporter);if(!s)continue;
      s=shortenRepeatedLead(s,rows,counts,lastLead);lastLead=properLead(s)||'';
      if(wc(s)>=8&&prior.has(entityNorm(s,ctx.entities)))s=diversify(s,ctx.state,`${ctx.week}|prior|${team?.roster_id}|${pi}|${s}`);
      out.push(s);
    }
    return out.join(' ').trim();
  }).filter(Boolean);
  for(const section of article.sections||[]){
    if(Array.isArray(section?.paragraphs))section.paragraphs=rewrite(section.paragraphs);
    for(const block of section?.blocks||[])if(Array.isArray(block?.paragraphs))block.paragraphs=rewrite(block.paragraphs);
  }
  article.headline=scrub(article.headline,reporter);article.deck=scrub(article.deck,reporter);article.aside=scrub(article.aside,reporter);
  article.paragraphs=(article.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
}

function rewriteOverview(o,ctx){
  if(!o)return;const counts=new Map(),rows=ctx.teamNames.map(name=>({full:name,short:name.split(/\s+/).filter(Boolean).at(-1)||name})).sort((a,b)=>b.full.length-a.full.length);let lastLead='';
  const rewrite=paragraphs=>(paragraphs||[]).map((p,pi)=>{
    const out=[];
    for(let s of parts(p)){
      s=scrub(s,'');if(!s)continue;
      s=shortenRepeatedLead(s,rows,counts,lastLead);lastLead=properLead(s)||'';
      const take=recapBareTake(s,ctx.state,`${ctx.week}|recap|${pi}|${s}`);out.push(take?`${s} ${take}`:s);
    }
    return out.join(' ').trim();
  }).filter(Boolean);
  for(const section of o.sections||[]){
    if(Array.isArray(section?.paragraphs))section.paragraphs=rewrite(section.paragraphs);
    for(const block of section?.blocks||[])if(Array.isArray(block?.paragraphs))block.paragraphs=rewrite(block.paragraphs);
  }
  for(const take of o.hot_takes||[]){take.title=scrub(take.title,'');take.take=rewrite([take.take]).join(' ')}
  o.headline=scrub(o.headline,'');o.deck=scrub(o.deck,'');
}

function globalFreshen(edition,ctx){
  const seen=new Set(),shapes=new Map(),articleSeen=new Map();let occurrence=0;
  const rewrite=(paragraphs,key)=>(paragraphs||[]).map((p,pi)=>{
    const out=[];let local=articleSeen.get(key);if(!local){local=new Set();articleSeen.set(key,local)}
    for(let s of parts(p)){
      if(!s)continue;let n=entityNorm(s,ctx.entities),sh=shape(s),owners=shapes.get(sh)||new Set();
      const duplicate=wc(s)>=8&&(seen.has(n)||local.has(simpleNorm(s))),overused=sh.split(' ').length>=5&&owners.size>=2&&!owners.has(key);
      if(duplicate||overused){s=diversify(s,ctx.state,`${ctx.week}|global|${key}|${pi}|${occurrence++}|${n}`);n=entityNorm(s,ctx.entities);sh=shape(s);owners=shapes.get(sh)||new Set()}
      if(wc(s)>=8){seen.add(n);local.add(simpleNorm(s))}owners.add(key);shapes.set(sh,owners);out.push(s);
    }
    return out.join(' ').trim();
  }).filter(Boolean);
  for(const team of edition.teams||[]){const a=team?.inquirer_article;if(!a)continue;for(const section of a.sections||[]){if(Array.isArray(section?.paragraphs))section.paragraphs=rewrite(section.paragraphs,String(team.roster_id));for(const block of section?.blocks||[])if(Array.isArray(block?.paragraphs))block.paragraphs=rewrite(block.paragraphs,String(team.roster_id))}a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean)}
  const o=edition.league_overview;if(o)for(const section of o.sections||[]){if(Array.isArray(section?.paragraphs))section.paragraphs=rewrite(section.paragraphs,'__league__');for(const block of section?.blocks||[])if(Array.isArray(block?.paragraphs))block.paragraphs=rewrite(block.paragraphs,'__league__')}
}

export function finalizeInquirerForwardEdition(edition,{week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3)return edition;
  const entities=allEntities(edition,previousEdition),teamNames=(edition.teams||[]).map(t=>String(t?.team_name||'')).filter(Boolean).sort((a,b)=>b.length-a.length),state={week:Number(week),seq:0,used:new Set(),recapAdds:0},ctx={week:Number(week),entities,teamNames,state,prior:priorByTeam(previousEdition,entities)};
  for(const team of edition.teams)rewriteArticle(team,team?.inquirer_article,ctx);
  rewriteOverview(edition.league_overview,ctx);
  globalFreshen(edition,ctx);
  return edition;
}
