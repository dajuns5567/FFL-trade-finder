(()=>{
function disableLegacyLogoWriters(){
  if(window.__section1V111Poll){clearInterval(window.__section1V111Poll);window.__section1V111Poll=null}
  const legacy=window.section1V111;
  if(legacy&&legacy.install&&!legacy.__logoNeutralized114){
    const original=legacy.install.bind(legacy);
    legacy.install=()=>{const h=document.querySelector('header h1');const before=h?{className:h.className,html:h.innerHTML,aria:h.getAttribute('aria-label')}:null;original();if(h&&before){h.className=before.className;h.innerHTML=before.html;if(before.aria==null)h.removeAttribute('aria-label');else h.setAttribute('aria-label',before.aria)}};
    legacy.__logoNeutralized114=true;
  }
}
function enforceLogo(){
  disableLegacyLogoWriters();
  window.section1V113?.install?.();
}
setTimeout(enforceLogo,0);setTimeout(enforceLogo,200);setTimeout(enforceLogo,700);
if(!window.__section1V114Poll)window.__section1V114Poll=setInterval(enforceLogo,1500);
window.section1V114={install:enforceLogo};
})();