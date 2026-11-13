(()=>{
'use strict';
// V534 compatibility bridge: frozen V311 Select All checks the DOM but the
// active V130 Finder runtime periodically restores check state from its Map.
// Reconcile ONLY after a user's Select All click; no synthetic change events,
// no alterations to asset valuation, trade generation, or manual selections.
document.addEventListener('click',event=>{
  if(!event.target?.closest?.('#tradeSelectAllButton165'))return;
  queueMicrotask(()=>{
    if(!window.tradeSelectAllV165?.aliasActive?.())return;
    const selected=window.section1V130?.finderSel;
    if(typeof selected?.set!=='function')return;
    for(const box of document.querySelectorAll('#findShop .shopCheck')){
      if(box.checked&&box._asset?.id!=null)
        selected.set(String(box._asset.id),box._asset);
    }
  });
});
})();