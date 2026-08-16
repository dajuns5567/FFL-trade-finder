(()=>{
const av=x=>Math.max(0,Number((window.tradeEngine96||window.tradeEngine98)?.assetValue?.(x))||0);
const raw=xs=>(xs||[]).reduce((s,x)=>s+av(x),0);
const selectedShop=()=>[...document.querySelectorAll('.shopCheck:checked')].map(x=>x._asset).filter(Boolean);
const selectedYears=()=>[...document.querySelectorAll('.draftYear106:checked')].map(x=>Number(x.value));
const selectedRounds=()=>[...document.querySelectorAll('.draftRound106:checked')].map(x=>Number(x.value));
function installLogo(){
  if(window.section1V113||window.__section1Release==='v113'||document.querySelector('header h1.fleecedFlat113'))return;
  const h=document.querySelector('header h1');if(!h)return;
  h.className='fleecedFlat111';h.textContent='Fleeced!';h.setAttribute('aria-label','Fleeced!');
  document.getElementById('fleecedFlat110Style')?.remove();
  if(document.getElementById('fleecedFlat111Style'))return;
  const s=document.createElement('style');s.id='fleecedFlat111Style';s.textContent=`header h1.fleecedFlat111{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;width:168px!important;height:49px!important;margin:10px 0 10px!important;padding:0 14px!important;background:#fff!important;border:3px solid #111!important;border-radius:18px!important;color:#efb900!important;font-family:"Trebuchet MS","Arial Rounded MT Bold","Comic Sans MS",sans-serif!important;font-size:28px!important;font-style:normal!important;font-weight:900!important;line-height:1!important;letter-spacing:-.2px!important;text-align:center!important;text-shadow:none!important;box-shadow:none!important;-webkit-text-stroke:1.35px #111!important;paint-order:stroke fill!important;transform:none!important;filter:none!important;background-image:none!important;box-sizing:border-box!important}header h1.fleecedFlat111:before{content:""!important;display:block!important;position:absolute!important;left:25px!important;bottom:-9px!important;width:14px!important;height:14px!important;background:#fff!important;border-left:3px solid #111!important;border-bottom:3px solid #111!important;transform:rotate(-45deg)!important;transform-origin:center!important;box-sizing:border-box!important}header h1.fleecedFlat111:after{display:none!important;content:none!important}`;document.head.appendChild(s);
}
function replaceRejectedText(){
  const host=document.getElementById('evalResults');if(!host)return;
  const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);let n;
  while((n=walker.nextNode()))if(/Trade Rejected/i.test(n.nodeValue||''))n.nodeValue=(n.nodeValue||'').replace(/Trade Rejected/ig,'Fleeced!');
}
function clearFinderChecks(){
  document.querySelectorAll('.shopCheck').forEach(box=>{if(box.checked){box.checked=false;box.dispatchEvent(new Event('change',{bubbles:true}))}});
  const host=document.getElementById('finderResults');if(host)host.replaceChildren();
}
function clearEvaluatorChecks(){
  try{state.assetsA=[];state.assetsB=[]}catch(_){}
  document.querySelectorAll('#evalChooserA input[type="checkbox"],#evalChooserB input[type="checkbox"],input[data-eval-side]').forEach(box=>{if(box.checked){box.checked=false;box.dispatchEvent(new Event('change',{bubbles:true}))}});
  const host=document.getElementById('evalResults');if(host)host.replaceChildren();
  try{if(typeof renderAssets==='function'){renderAssets('A');renderAssets('B')}}catch(_){}
}
function installClear(){
  if(document.__clearChecks111)return;document.__clearChecks111=true;
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button');if(!b)return;const txt=(b.textContent||'').trim();
    if(/^Clear selections$/i.test(txt)){setTimeout(clearFinderChecks,0);setTimeout(clearFinderChecks,40)}
    if(/^Clear trade$/i.test(txt)){setTimeout(clearEvaluatorChecks,0);setTimeout(clearEvaluatorChecks,40)}
  },true);
}
function filterLabel(){
  const ys=selectedYears(),rs=selectedRounds(),parts=[];
  if(ys.length)parts.push(ys.join('/'));
  if(rs.length)parts.push(rs.map(r=>`R${r}`).join('+'));
  return parts.length?parts.join(' '):'selected R1-R3';
}
function diagnoseDraftEmpty(){
  const host=document.getElementById('finderResults');if(!host||document.getElementById('tradeTier94')?.value!=='draft'||host.querySelector('.trade95-card'))return;
  const text=(host.textContent||'').trim();if(!/No draft-pick-only package/i.test(text))return;
  const me=Number(document.getElementById('findTeam')?.value),give=selectedShop();if(!me||!give.length)return;
  const ys=new Set(selectedYears()),rs=new Set(selectedRounds()),target=window.section1V106?.qualityDetail?.(give)?.effective||raw(give),teams=[];
  for(const tm of state.teams||[]){if(Number(tm.id)===me)continue;const picks=(state.allAssets||[]).filter(x=>x.type==='pick'&&Number(x.owner)===Number(tm.id)&&Number(x.round)>=1&&Number(x.round)<=3&&(!ys.size||ys.has(Number(x.season)))&&(!rs.size||rs.has(Number(x.round))));teams.push({id:Number(tm.id),count:picks.length,value:raw(picks)})}
  teams.sort((a,b)=>b.value-a.value||b.count-a.count);const best=teams[0]||{count:0,value:0};
  const minimum=target*.72;
  if(best.value<minimum){host.innerHTML=`<div class="empty">No team has enough ${filterLabel()} draft-pick value to provide fair value for the selected outgoing package. The most any one team can currently offer within those filters is ${best.count} qualifying pick${best.count===1?'':'s'} worth ${best.value.toLocaleString(undefined,{maximumFractionDigits:1})} raw Value, below the minimum range needed for this package.</div>`}
}
function loadMoreButton(host,cards){
  let btn=document.getElementById('loadMoreTrades111');if(btn)btn.remove();
  const step=8;cards.forEach((c,i)=>{c.hidden=i>=step;c.dataset.more111=i>=step?'1':'0'});
  if(cards.length<=step)return;
  btn=document.createElement('button');btn.id='loadMoreTrades111';btn.className='secondary';btn.style.margin='12px auto 4px';btn.style.display='block';btn.textContent=`Load more trades (${cards.length-step} more)`;
  btn.onclick=()=>{const hidden=cards.filter(c=>c.hidden).slice(0,step);hidden.forEach(c=>{c.hidden=false;c.dataset.more111='0'});const remain=cards.filter(c=>c.hidden).length;if(remain)btn.textContent=`Load more trades (${remain} more)`;else btn.remove()};
  host.appendChild(btn);
}
function deprioritizeOptionalTE(){
  const host=document.getElementById('finderResults');if(!host||document.getElementById('tradeTier94')?.value==='draft')return;
  const cards=[...host.querySelectorAll(':scope > .trade95-card, :scope > .result.trade95-card')];if(!cards.length)return;
  const marked=[];
  for(const card of cards){const body=card.querySelector('.rationaleBody'),txt=body?.textContent||'';if(!/TE is one of this roster['’]s thinner positions relative to the league/i.test(txt))continue;
    const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(/TE is one of this roster['’]s thinner positions relative to the league/i.test(n.nodeValue||''))n.nodeValue=(n.nodeValue||'').replace(/TE is one of this roster['’]s thinner positions relative to the league[^.]*\.?/i,'Tight end is not a required starting position in this league, so TE depth is not treated as a positional need.')}
    const ctx=card.querySelector('.trade95-head .trade95-sub');if(ctx)ctx.textContent=(ctx.textContent||'').replace(/\s*•\s*roster-need priority/ig,'');marked.push(card)
  }
  if(!marked.length)return;for(const c of marked)host.appendChild(c);
}
function paginateFinder(){
  const host=document.getElementById('finderResults');if(!host)return;
  deprioritizeOptionalTE();
  const cards=[...host.querySelectorAll(':scope > .trade95-card, :scope > .result.trade95-card')];
  if(!cards.length){document.getElementById('loadMoreTrades111')?.remove();return}
  const key=cards.map(c=>c.textContent?.slice(0,80)).join('|');if(host.dataset.pageKey111===key)return;
  host.dataset.pageKey111=key;loadMoreButton(host,cards);
}
function observe(){
  const evalHost=document.getElementById('evalResults');if(evalHost&&!evalHost.__v111){evalHost.__v111=true;new MutationObserver(()=>replaceRejectedText()).observe(evalHost,{childList:true,subtree:true,characterData:true})}
  const finder=document.getElementById('finderResults');if(finder&&!finder.__v111){finder.__v111=true;new MutationObserver(()=>{setTimeout(()=>{diagnoseDraftEmpty();paginateFinder()},0)}).observe(finder,{childList:true,subtree:true})}
}
function install(){installLogo();installClear();observe();replaceRejectedText();diagnoseDraftEmpty();paginateFinder()}
setTimeout(install,0);setTimeout(install,150);setTimeout(install,600);if(!window.__section1V111Poll)window.__section1V111Poll=setInterval(install,1000);
window.section1V111={install,diagnoseDraftEmpty,paginateFinder};
})();