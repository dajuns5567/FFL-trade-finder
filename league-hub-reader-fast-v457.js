(()=>{
'use strict';
if(window.__fleecedLeagueHubReaderFastV457)return;
window.__fleecedLeagueHubReaderFastV457=true;

const renderCache=new WeakMap();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reEsc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const clean=rows=>(Array.isArray(rows)?rows:(rows==null?[]:[rows])).filter(p=>String(p||'').trim()&&String(p).trim().toLowerCase()!=='n/a');

function editions(){return window.__fleecedLeagueHubEditionsV457 instanceof Map?[...window.__fleecedLeagueHubEditionsV457.values()]:[]}
function editionFor(select){
  const values=[...select.options].map(o=>String(o.value)).filter(v=>v&&v!=='__league__'),cur=window.__fleecedLeagueHubCurrentEditionV457;
  const fits=x=>x?.available&&Array.isArray(x?.teams)&&values.every(v=>x.teams.some(t=>String(t.roster_id)===v));
  if(fits(cur))return cur;
  const rows=editions();for(let i=rows.length-1;i>=0;i--)if(fits(rows[i]))return rows[i];
  return null;
}

function entityIndex(w){
  if(w.__fastReaderEntities)return w.__fastReaderEntities;
  const map=new Map();
  for(const t of w.teams||[]){
    const tn=String(t?.team_name||'').trim();if(tn)map.set(tn,{type:'team',id:String(t.roster_id),name:tn});
    const pools=[...(t?.starter_details||[]),...(t?.opponent_roster?.players||[]),...(t?.opponent_roster?.starters||[]),...(t?.next_opponent_roster?.players||[]),...(t?.next_opponent_roster?.starters||[]),...Object.values(t?.transaction_player_facts||{})];
    for(const p of pools){const n=String(p?.name||p?.full_name||'').trim(),id=String(p?.id||p?.player_id||'');if(n.length>=4&&id&&!map.has(n))map.set(n,{type:'player',id,name:n})}
  }
  const out=[...map.values()];Object.defineProperty(w,'__fastReaderEntities',{value:out,enumerable:false,configurable:true});return out;
}
function linked(value,w){
  const text=String(value??'');if(!text)return'';
  const matches=entityIndex(w).filter(e=>text.includes(e.name)).sort((a,b)=>b.name.length-a.name.length);if(!matches.length)return esc(text);
  const unique=[];const seen=new Set();for(const e of matches)if(!seen.has(e.name)){seen.add(e.name);unique.push(e)}
  const byName=new Map(unique.map(e=>[e.name,e])),re=new RegExp(unique.map(e=>reEsc(e.name)).join('|'),'g');let out='',last=0,m;
  while((m=re.exec(text))){out+=esc(text.slice(last,m.index));const e=byName.get(m[0]);if(e?.type==='team')out+='<button type="button" class="lh-inline-team" data-lh-inquirer-team="'+esc(e.id)+'" data-lh-inquirer-name="'+esc(e.name)+'">'+esc(m[0])+'</button>';else if(e)out+='<button type="button" class="lh-inline-player" data-lh-inquirer-player="'+esc(e.id)+'">'+esc(m[0])+'</button>';else out+=esc(m[0]);last=m.index+m[0].length}
  return out+esc(text.slice(last));
}

function sectionHTML(section,w,index,overview=false){
  const paragraphs=clean(section?.paragraphs),blocks=(section?.blocks||[]).map(b=>({...b,paragraphs:clean(b?.paragraphs)})).filter(b=>b.paragraphs.length),id=overview?' id="lh-inquirer-section-'+index+'"':'';
  let inner='';
  if(blocks.length)inner=blocks.map(b=>'<div class="lh-overview-story"><h5>'+linked(b.heading||'Story',w)+'</h5>'+b.paragraphs.map(p=>'<p>'+linked(p,w).replace(/\n/g,'<br>')+'</p>').join('')+'</div>').join('');
  else inner=paragraphs.map(p=>'<p>'+linked(p,w).replace(/\n/g,'<br>')+'</p>').join('');
  if(!inner)return'';
  return '<section class="'+(overview?'lh-overview-section':'lh-team-story-section')+'"'+id+'>'+(section?.heading?'<h5>'+linked(section.heading,w)+'</h5>':'')+inner+'</section>';
}

function sentimentHTML(a,w){
  const s=a?.fan_sentiment;if(!s)return'';
  const current=Number(s?.rating??s?.score??s?.current),previous=Number(s?.previous_rating??s?.previous_score??s?.previous),hasCurrent=Number.isFinite(current),hasPrevious=Number.isFinite(previous),pct=n=>Math.max(0,Math.min(100,(Number(n)+100)/2)),paras=clean(s?.paragraphs||s?.commentary||[]);
  if(!hasCurrent&&!paras.length)return'';
  return '<section class="lh-fan-sentiment">'+(s?.heading?'<h5>'+linked(s.heading,w)+'</h5>':'')+(hasCurrent?'<div class="lh-sentiment-meter"><div class="lh-sentiment-meter-head"><div class="lh-sentiment-meter-mood"><span class="lh-sentiment-meter-field">Mood</span><strong class="lh-sentiment-meter-label">'+esc(s?.label||s?.mood||'Fan sentiment')+'</strong></div><div class="lh-sentiment-meter-rating"><span class="lh-sentiment-meter-field">Rating</span><strong class="lh-sentiment-meter-score">'+(current>0?'+':'')+esc(String(current))+'</strong></div><small>Fan sentiment • -100 to +100</small></div><div class="lh-sentiment-track"><span class="lh-sentiment-zero"></span>'+(hasPrevious?'<span class="lh-sentiment-marker previous" style="left:'+pct(previous)+'%"></span>':'')+'<span class="lh-sentiment-marker" style="left:'+pct(current)+'%"></span></div></div>':'')+paras.map(p=>'<p>'+linked(p,w)+'</p>').join('')+'</section>';
}

function teamArticle(t,w){
  const a=t?.inquirer_article;if(!a)return '<div class="lh-article"><h4>'+esc(t?.team_name||'Team article')+'</h4><p>Article unavailable.</p></div>';
  const reporter=a.reporter||{},sections=(a.sections||[]).map((s,i)=>sectionHTML(s,w,i,false)).join(''),fallback=!a.sections?.length?clean(a.paragraphs).map(p=>'<p>'+linked(p,w)+'</p>').join(''):'';
  return '<div class="lh-article"><div class="lh-reporter-byline"><b>'+esc(a.byline||('By '+(reporter.name||'Fleeced! Inquirer')))+'</b><small>'+esc(a.deck||'')+'</small></div><h4>'+linked(a.headline||t.team_name,w)+'</h4>'+sections+fallback+sentimentHTML(a,w)+(a.aside?'<div class="lh-column-kicker"><p>'+linked(a.aside,w)+'</p></div>':'')+'<details class="lh-source-note"><summary>Sources</summary><div class="lh-sub">Sleeper league data, canonical Trade History, canonical Value History, verified NFL schedule and Sleeper player/injury metadata.</div></details></div>';
}

function overviewArticle(o,w){
  if(!o)return '<div class="lh-article"><h4>Weekly Recap unavailable</h4></div>';
  const sections=(o.sections||[]).filter(s=>clean(s?.paragraphs).length||(s?.blocks||[]).some(b=>clean(b?.paragraphs).length));
  const nav=sections.length?'<nav class="lh-inquirer-section-nav" aria-label="Weekly Recap sections"><span>Jump to a section</span><div>'+sections.map((s,i)=>'<button type="button" class="lh-brand-button lh-brand-button-outline lh-brand-button-compact" data-lh-inquirer-jump="lh-inquirer-section-'+i+'">'+esc(s.heading||s.reporter?.name||('Section '+(i+1)))+'</button>').join('')+((o.hot_takes||[]).length?'<button type="button" class="lh-brand-button lh-brand-button-outline lh-brand-button-compact" data-lh-inquirer-jump="lh-inquirer-hot-takes">Hot Takes</button>':'')+'</div></nav>':'';
  const body=sections.map((s,i)=>sectionHTML(s,w,i,true)).join(''),hot=(o.hot_takes||[]).length?'<section class="lh-hot-takes" id="lh-inquirer-hot-takes"><h4>Hot Takes</h4>'+(o.hot_takes||[]).map(x=>'<div class="lh-hot-take"><b>'+linked(x.title||'',w)+'</b><p>'+linked(x.take||x.body||'',w).replace(/\n/g,'<br>')+'</p></div>').join('')+'</section>':'';
  return '<div class="lh-article lh-league-overview">'+nav+'<div class="lh-reporter-byline"><b>'+esc(o.byline||'By the Fleeced! Inquirer desks')+'</b><small>'+esc((o.deck||'')+(o.week_classification?.label?' • '+o.week_classification.label:''))+'</small></div><h4>'+linked(o.headline||'Fleeced! Weekly Recap',w)+'</h4>'+body+hot+'<details class="lh-source-note"><summary>Sources</summary><div class="lh-sub">Sleeper league data, canonical Trade History, canonical Value History, verified NFL schedule and Sleeper player/injury metadata.</div></details></div>';
}

function rendered(w,key){
  let cache=renderCache.get(w);if(!cache){cache=new Map();renderCache.set(w,cache)}if(cache.has(key))return cache.get(key);
  const html=key==='__league__'?overviewArticle(w.league_overview,w):teamArticle((w.teams||[]).find(t=>String(t.roster_id)===String(key)),w);cache.set(key,html);return html;
}
function switchArticle(select,key){
  const w=editionFor(select),report=select.closest('.lh-report'),old=report?.querySelector('.lh-article');if(!w||!report||!old)return false;
  const value=String(key||'__league__'),exists=value==='__league__'||(w.teams||[]).some(t=>String(t.roster_id)===value);if(!exists)return false;
  select.value=value;const template=document.createElement('template');template.innerHTML=rendered(w,value).trim();const next=template.content.firstElementChild;if(!next)return false;old.replaceWith(next);
  requestAnimationFrame(()=>{const picker=select.closest('.lh-article-picker');if(!picker)return;const top=Math.max(0,window.scrollY+picker.getBoundingClientRect().top-110);window.scrollTo({top,behavior:'auto'})});return true;
}

document.addEventListener('change',e=>{const select=e.target.closest('#leagueHub [data-lh-broadcast-article]');if(select&&switchArticle(select,select.value)){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('click',e=>{const btn=e.target.closest('#leagueHub [data-lh-broadcast-team]');if(!btn)return;const select=btn.closest('.lh-report')?.querySelector('[data-lh-broadcast-article]');if(select&&switchArticle(select,btn.dataset.lhBroadcastTeam||'__league__')){e.preventDefault();e.stopImmediatePropagation()}},true);
})();
