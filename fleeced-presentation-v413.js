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
  for(const host of [document.getElementById('finderResults'),document.getElementById('evalResults')]){
    if(!host)continue;
    for(const card of host.querySelectorAll('.trade95-card')){
      const sides=[...card.querySelectorAll('.trade95-side')];
      sides.forEach(s=>s.classList.remove('fleeced-eval-winner'));
      if(sides.length!==2)continue;
      const totals=sides.map(side=>sideTotal(side));
      const a=totals[0],b=totals[1];
      if(a==null||b==null||a===b)continue;
      (a>b?sides[0]:sides[1]).classList.add('fleeced-eval-winner');
    }
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
function selectedText(id){
  const el=document.getElementById(id);if(!el)return'';
  const opt=el.options?.[el.selectedIndex];
  return String(opt?.textContent||'').trim();
}
function cleanFinderPartner(text){
  return String(text||'').replace(/^#\d+\s+/,'').trim();
}
function cardTeams(card){
  if(card.closest('#finderResults')){
    const own=selectedText('findTeam');
    const head=card.querySelector('.trade95-head>div:first-child>b');
    const partner=cleanFinderPartner(head?.dataset.fleecedOriginalTitle||head?.textContent||'');
    return[own||'Your team',partner||'Trade partner'];
  }
  const sides=[...card.querySelectorAll('.trade95-side-title')].map(x=>String(x.textContent||'').replace(/\s+RECEIVES\s*$/i,'').trim());
  return[sides[0]||selectedText('evalA')||'Team A',sides[1]||selectedText('evalB')||'Team B'];
}
function decorateScores(){
  for(const card of document.querySelectorAll('#finderResults .trade95-card,#evalResults .trade95-card')){
    if(card.dataset.fleecedPresentation==='2')continue;
    const scoreBox=card.querySelector('.trade95-score');
    const m=String(scoreBox?.textContent||'').match(/(\d+)\s*\/100/i);
    if(!m)continue;
    const score=Math.max(0,Math.min(100,Number(m[1])||0));
    const label=String(scoreBox?.querySelector('div')?.textContent||card.querySelector('.trade95-summary b')?.textContent||'Trade').trim();
    const head=card.querySelector('.trade95-head');
    const headTitle=head?.querySelector(':scope > div:first-child > b');
    if(headTitle&&!headTitle.dataset.fleecedOriginalTitle)headTitle.dataset.fleecedOriginalTitle=String(headTitle.textContent||'');
    const [leftTeam,rightTeam]=cardTeams(card);
    const sides=[...card.querySelectorAll('.trade95-side')];
    if(sides.length===2){
      const titles=sides.map(s=>s.querySelector('.trade95-side-title'));
      if(titles[0])titles[0].textContent=leftTeam+' RECEIVES';
      if(titles[1])titles[1].textContent=rightTeam+' RECEIVES';
    }
    const totals=sides.map(side=>sideTotal(side));
    const winnerIndex=totals.length===2&&totals[0]!=null&&totals[1]!=null&&totals[0]!==totals[1]?(totals[0]>totals[1]?0:1):-1;
    const board=document.createElement('div');
    board.className='fleeced-hindsight-board';
    board.innerHTML='<div class="fleeced-result-team left"><small></small><strong></strong><b></b></div><div class="fleeced-result-vs"><span>FAIRNESS RATING</span><strong></strong><em></em></div><div class="fleeced-result-team right"><small></small><strong></strong><b></b></div><div class="fleeced-result-bar"><i></i></div>';
    const resultTeams=board.querySelectorAll('.fleeced-result-team');
    const teamNames=[leftTeam,rightTeam];
    resultTeams.forEach((box,i)=>{
      box.querySelector('small').textContent=i===winnerIndex?'WINNER • TRADE-ADJUSTED TOTAL':'TRADE-ADJUSTED TOTAL';
      box.querySelector('strong').textContent=totals[i]==null?'—':Math.round(totals[i]).toLocaleString();
      box.querySelector('b').textContent=teamNames[i];
      if(i===winnerIndex)box.classList.add('winner');
    });
    board.querySelector('.fleeced-result-vs strong').textContent=score+'/100 • '+label.replace(/!$/,'').toUpperCase();
    const edge=totals[0]!=null&&totals[1]!=null?Math.abs(totals[0]-totals[1]):null;
    board.querySelector('.fleeced-result-vs em').textContent=edge==null?'':'ADJUSTED EDGE • '+Math.round(edge).toLocaleString();
    board.querySelector('.fleeced-result-bar i').style.width=score+'%';
    const match=document.createElement('div');
    match.className='fleeced-result-matchup';
    match.textContent=leftTeam+' ↔ '+rightTeam;
    if(head){
      head.replaceChildren(match,board);
    }else card.prepend(match,board);
    card.querySelector('.trade95-summary')?.classList.add('fleeced-hide-legacy-summary');
    card.dataset.fleecedPresentation='2';
  }
  markEvaluatorWinner();
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
    if(label&&label.nextElementSibling!==search)label.insertAdjacentElement('afterend',search);
    const selectAll=document.getElementById('tradeSelectAllButton165');
    if(selectAll)selectAll.classList.add('fleeced-select-all');
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