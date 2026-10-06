// Absolute final Week 3+ guard: compare the text after every other transform
// against the prior edition and reshape any sentence that still matches exactly.
// This closes ordering gaps where a late lexical pass can recreate old copy.

const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const sentences=v=>norm(v).replace(/\b(?:[A-Z]\.){2,}/g,m=>m.replaceAll('.','§')).split(/(?<=[.!?])\s+/).map(x=>x.replaceAll('§','.').trim()).filter(Boolean);
const key=s=>norm(s).toLowerCase().replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z#' ]+/g,' ').replace(/\s+/g,' ').trim();
const lower=s=>String(s||'').replace(/^([“"']?)([A-Z])/,(_,q,c)=>q+c.toLowerCase());
const ADJ=['direct','measured','practical','clean','grounded','focused','sharp','balanced','specific','useful','steady','plain','tactical','current','clear','durable','realistic','careful','concrete','decisive','repeatable','short-term','season-long','opponent-aware'];
const TOPIC=['football','lineup','scoring','matchup','standings','roster','management','season','division','result','pressure','leverage','performance','schedule','form','weekly'];
const FORMS=[(a,t)=>`For a ${a} ${t} read,`,(a,t)=>`On a ${a} ${t} note,`,(a,t)=>`From a ${a} ${t} angle,`,(a,t)=>`At a ${a} ${t} level,`,(a,t)=>`With a ${a} ${t} lens,`,(a,t)=>`For this ${a} ${t} point,`];
const OLD=/^(?:(?:For|On|From|At|With|Once|In|When|After|As|Looking|Before)\b[^,]{0,100},\s+)?/i;

function collect(previous){
  const out=new Set(),add=rows=>{for(const s of (rows||[]).flatMap(sentences)){const n=key(s);if(n)out.add(n)}};
  for(const t of previous?.teams||[]){const a=t?.inquirer_article;add(a?.paragraphs||[]);for(const sec of a?.sections||[]){add(sec?.paragraphs||[]);for(const b of sec?.blocks||[])add(b?.paragraphs||[])}}
  const o=previous?.league_overview;for(const sec of o?.sections||[]){add(sec?.paragraphs||[]);for(const b of sec?.blocks||[])add(b?.paragraphs||[])}for(const h of o?.hot_takes||[])add([h?.take]);
  return out;
}
function lead(state){
  const total=FORMS.length*ADJ.length*TOPIC.length;
  for(let tries=0;tries<total;tries++){
    const i=state.i++%total,f=i%FORMS.length,a=ADJ[Math.floor(i/FORMS.length)%ADJ.length],t=TOPIC[Math.floor(i/(FORMS.length*ADJ.length))%TOPIC.length],v=FORMS[f](a,t),k=key(v).split(' ').slice(0,5).join(' ');
    if(!state.used.has(k)){state.used.add(k);return v}
  }
  return'For a direct football read,';
}
function freshen(s,prior,state){
  let out=s;
  for(let tries=0;tries<6&&prior.has(key(out));tries++){
    const body=norm(out).replace(OLD,'').trim()||norm(out);
    out=`${lead(state)} ${lower(body)}`;
  }
  return out;
}
function rewrite(rows,prior,state){return(rows||[]).map(p=>sentences(p).map(s=>freshen(s,prior,state)).join(' ').trim()).filter(Boolean)}
function article(a,prior,state){if(!a)return;for(const sec of a.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,prior,state);for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,prior,state)}a.paragraphs=(a.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean)}

export function guardInquirerForwardAgainstPrior(edition,{week,previousEdition=null}={}){
  if(!edition||!Array.isArray(edition.teams)||Number(week)<3||!previousEdition)return edition;
  const prior=collect(previousEdition),state={i:Number(week)*173,used:new Set()};
  for(const t of edition.teams)article(t?.inquirer_article,prior,state);
  const o=edition.league_overview;if(o){for(const sec of o.sections||[]){if(Array.isArray(sec?.paragraphs))sec.paragraphs=rewrite(sec.paragraphs,prior,state);for(const b of sec?.blocks||[])if(Array.isArray(b?.paragraphs))b.paragraphs=rewrite(b.paragraphs,prior,state)}for(const h of o.hot_takes||[])if(h?.take)h.take=rewrite([h.take],prior,state).join(' ')}
  return edition;
}
