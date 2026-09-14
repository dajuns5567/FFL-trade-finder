(()=>{
'use strict';
function numberFrom(el){
  const text=String(el?.textContent||'').replace(/[^0-9.-]+/g,'');
  const n=Number(text);
  return Number.isFinite(n)?n:null;
}
function sideTotal(side){
  return numberFrom(side.querySelector('.trade97-effective b')) ?? numberFrom(side.querySelector('.trade95-total b'));
}
function markEvaluatorWinner(){
  const host=document.getElementById('evalResults');
  if(!host)return;
  for(const card of host.querySelectorAll('.trade95-card')){
    const sides=[...card.querySelectorAll('.trade95-side')];
    sides.forEach(s=>s.classList.remove('fleeced-eval-winner'));
    if(sides.length!==2)continue;
    const a=sideTotal(sides[0]),b=sideTotal(sides[1]);
    if(a==null||b==null||a===b)continue;
    (a>b?sides[0]:sides[1]).classList.add('fleeced-eval-winner');
  }
}
function playerIdFromName(name){
  const target=String(name||'').trim().toLowerCase();
  if(!target||/^20\d{2}\s+r\d$/i.test(target))return'';
  for(const [id,p] of Object.entries(window.state?.players||{})){
    const full=String(p?.full_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'').trim().toLowerCase();
    if(full&&full===target)return String(id);
  }
  return'';
}
function playerIdFromControl(el){
  const box=el?.matches?.('input[type="checkbox"]')?el:el?.querySelector?.('input[type="checkbox"]');
  const a=box?._asset;
  if(a?.type==='player'&&a?.id!=null)return String(a.id);
  const direct=box?.dataset?.pid||box?.dataset?.playerId||el?.dataset?.pid||el?.dataset?.playerId;
  return direct?String(direct):'';
}
function openHistory(id){
  if(!id)return;
  window.valueHistoryV331?.openPlayer?.(String(id));
}
function addHistoryButton(row,id){
  if(!row||!id||row.querySelector(':scope > .fleeced-view-history'))return;
  const b=document.createElement('button');
  b.type='button';b.className='fleeced-view-history';b.dataset.fleecedHistory=id;b.textContent='View history ↗';
  row.appendChild(b);
}
function decorateChecklists(){
  const selectors=['#findShop label.checkrow','#evalChooserA label','#evalChooserB label'];
  for(const row of document.querySelectorAll(selectors.join(','))){
    const id=playerIdFromControl(row);
    if(id)addHistoryButton(row,id);
  }
  for(const hit of document.querySelectorAll('#finder [data-pid],#evaluator [data-pid]')){
    if(hit.closest('#finderResults,#evalResults'))continue;
    const id=String(hit.dataset.pid||'');
    const row=hit.closest('label,.checkrow,.asset,button,div')||hit;
    if(id)addHistoryButton(row,id);
  }
}
function decoratePresentedPlayers(){
  for(const asset of document.querySelectorAll('#finderResults .trade95-asset,#evalResults .trade95-asset')){
    const name=asset.querySelector('b');if(!name)continue;
    const id=playerIdFromName(name.textContent);if(!id)continue;
    name.classList.add('fleeced-presented-player');
    name.dataset.fleecedHistory=id;
    name.setAttribute('role','button');
    name.setAttribute('tabindex','0');
    name.setAttribute('title','Open value history');
  }
}
function decorateScores(){
  for(const card of document.querySelectorAll('#finderResults .trade95-card,#evalResults .trade95-card')){
    if(card.querySelector(':scope > .fleeced-trade-rating'))continue;
    const scoreBox=card.querySelector('.trade95-score');
    const m=String(scoreBox?.textContent||'').match(/(\d+)\s*\/100/i);
    if(!m)continue;
    const score=Math.max(0,Math.min(100,Number(m[1])||0));
    const label=String(scoreBox?.querySelector('div')?.textContent||card.querySelector('.trade95-summary b')?.textContent||'Trade').trim();
    const rating=document.createElement('div');
    rating.className='fleeced-trade-rating';
    rating.innerHTML='<div class="fleeced-trade-rating-head"><strong></strong><span></span></div><div class="fleeced-score-track"><i></i></div>';
    rating.querySelector('strong').textContent=label;
    rating.querySelector('span').textContent=score+'/100';
    rating.querySelector('i').style.width=score+'%';
    const head=card.querySelector('.trade95-head');
    if(head)head.insertAdjacentElement('afterend',rating);else card.prepend(rating);
  }
}
function arrangeFinderFields(){
  const select=document.getElementById('findTeam');
  if(!select)return;
  const col=select.parentElement;
  if(!col)return;
  const heading=[...col.querySelectorAll('h2,h3,h4,b,label')].find(x=>/^your team$/i.test((x.textContent||'').trim()));
  const search=[...col.querySelectorAll('input')].find(x=>/search any (league )?player/i.test(x.placeholder||'')||/search any player/i.test(x.placeholder||''));
  if(heading){
    heading.classList.add('fleeced-field-heading');
    if(select.previousElementSibling!==heading)heading.insertAdjacentElement('afterend',select);
  }
  if(search){
    search.placeholder='Search player...';
    const label=[...col.querySelectorAll('label,b')].find(x=>/search any league player/i.test((x.textContent||'').trim()));
    if(label){label.textContent='Search player';label.classList.add('fleeced-field-heading','fleeced-search-label')}
    if(select.nextElementSibling!==label&&label)select.insertAdjacentElement('afterend',label);
  }
}
function brandSelectAll(){
  for(const b of document.querySelectorAll('#finder button')){
    if(/^select all$/i.test((b.textContent||'').trim()))b.classList.add('fleeced-select-all');
  }
}
function decorate(){
  arrangeFinderFields();
  brandSelectAll();
  decorateChecklists();
  decoratePresentedPlayers();
  decorateScores();
  markEvaluatorWinner();
}
function clickHandler(e){
  const h=e.target.closest?.('[data-fleeced-history]');
  if(!h)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  openHistory(h.dataset.fleecedHistory);
}
function keyHandler(e){
  if((e.key!=='Enter'&&e.key!==' ')||!e.target.matches?.('.fleeced-presented-player'))return;
  e.preventDefault();openHistory(e.target.dataset.fleecedHistory);
}
function install(){
  document.addEventListener('click',clickHandler,true);
  document.addEventListener('keydown',keyHandler,true);
  const observer=new MutationObserver(()=>queueMicrotask(decorate));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  decorate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.fleecedPresentationV413={decorate,markEvaluatorWinner,openHistory};
})();