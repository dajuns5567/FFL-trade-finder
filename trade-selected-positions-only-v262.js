(()=>{
'use strict';
const WRAP_ID='tradeSelectedPositionsOnly262Wrap',INPUT_ID='tradeSelectedPositionsOnly262';
function selectedPositions(){return[...document.querySelectorAll('#tradePos97 .trade97-pos:checked')].map(x=>String(x.value||'').toUpperCase()).filter(x=>x&&x!=='ANY')}
function sync(){const pos=document.getElementById('tradePos97');if(!pos)return false;let wrap=document.getElementById(WRAP_ID);if(!wrap){wrap=document.createElement('label');wrap.id=WRAP_ID;wrap.className='trade97-assist';wrap.style.marginTop='8px';wrap.innerHTML=`<input id="${INPUT_ID}" type="checkbox"> <span><b>Selected positions only</b><small>Incoming packages may include picks, but every player must match one of the selected positions.</small></span>`;pos.appendChild(wrap)}const count=selectedPositions().length,show=count>1;wrap.hidden=!show;const input=document.getElementById(INPUT_ID);if(input&&!show)input.checked=false;return show}
function install(){const pos=document.getElementById('tradePos97');if(!pos)return false;sync();if(!pos.__selectedPositionsOnly262){pos.__selectedPositionsOnly262=true;pos.addEventListener('change',e=>{if(e.target?.classList?.contains('trade97-pos'))setTimeout(sync,0)})}return true}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{install();setTimeout(install,100);setTimeout(install,500)},{once:true});else{install();setTimeout(install,100);setTimeout(install,500)}
window.tradeSelectedPositionsOnlyV262={install,sync,selectedPositions};
})();