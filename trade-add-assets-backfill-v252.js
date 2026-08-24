(()=>{
'use strict';
const MAX=250;
let seq=0,busy=false;
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const boxes=()=>[...document.querySelectorAll('#findShop .shopCheck')].filter(x=>x&&x._asset);
const chosen=()=>boxes().filter(x=>x.checked);
function addToggle(){for(const x of document.querySelectorAll('input[type="checkbox"]')){const t=norm(x.closest?.('label')?.textContent||x.parentElement?.textContent);if(t==='add assets if needed'||t.startsWith('add assets if needed '))return x}return null}
function targetOn(){return !!norm(document.getElementById('desiredPlayerSearch')?.value)}
function setSelection(primary,extra=[]){for(const x of boxes())x.checked=false;for(const x of primary)x.checked=true;for(const x of extra)x.checked=true}
function expandAll(host){for(let i=0;i<60;i++){const b=[...host.children].find(x=>x.tagName==='BUTTON'&&/^Load more trades/i.test(x.textContent||''));if(!b)break;b.click()}}
function signature(card){const head=(card.querySelector('.trade95-head b')?.textContent||'').replace(/^#\d+\s+/,'').trim(),sides=[...card.querySelectorAll('.trade95-side')].map(s=>[...s.querySelectorAll('.trade95-asset')].map(a=>(a.querySelector('b')?.textContent||'').trim()).join('~'));return head+'|'+sides.join('>')}
function grab(host){expandAll(host);return[...host.querySelectorAll(':scope > .trade95-card')].map(c=>({sig:signature(c),html:c.outerHTML}))}
async function settle(host,token){let last='',stable=0;for(let i=0;i<500&&token===seq;i++){const text=(host.textContent||'').trim(),html=host.innerHTML;if(text&&!/Searching realistic trades/i.test(text)){stable=html===last?stable+1:0;last=html;if(stable>=3)return true}else stable=0;await sleep(50)}return false}
function show(host,items){let n=Math.min(5,items.length);const draw=()=>{host.innerHTML=items.slice(0,n).map(x=>x.html).join('');[...host.querySelectorAll(':scope > .trade95-card')].forEach((c,i)=>{const b=c.querySelector('.trade95-head b');if(b)b.textContent=(b.textContent||'').replace(/^#\d+\s+/,`#${i+1} `)});if(n<items.length){const b=document.createElement('button');b.className='secondary';b.style.cssText='margin:12px auto 4px;display:block';b.textContent=`Load more trades (${items.length-n} more)`;b.onclick=()=>{n=Math.min(items.length,n+5);draw()};host.appendChild(b)}};draw()}
async function rerun(targeted){if(targeted){await window.tradeSpecificPlayerV232?.run?.()}else{await window.tradeFinderV168?.render?.()}}
async function backfill(token,primary,toggle,targeted){const host=document.getElementById('finderResults');if(!host)return;try{if(!await settle(host,token)||token!==seq)return;const all=grab(host),seen=new Set(all.map(x=>x.sig));if(all.length<MAX){const extras=boxes().filter(x=>!primary.includes(x));const packages=extras.map(x=>[x]);if(primary.length===1){for(let i=0;i<extras.length&&packages.length<80;i++)for(let j=i+1;j<extras.length&&packages.length<80;j++)packages.push([extras[i],extras[j]])}for(const extra of packages){if(token!==seq||all.length>=MAX)break;setSelection(primary,extra);busy=true;try{await rerun(targeted)}finally{busy=false}for(const x of grab(host)){if(all.length>=MAX)break;if(!seen.has(x.sig)){seen.add(x.sig);all.push(x)}}await sleep(0)}}if(token===seq){setSelection(primary);show(host,all.slice(0,MAX))}}finally{if(token===seq){setSelection(primary);toggle.checked=true}}}
window.addEventListener('click',e=>{if(busy||!e.target.closest?.('#runFinder'))return;const toggle=addToggle();if(!toggle?.checked)return;const primary=chosen(),all=boxes();if(!primary.length||primary.length===all.length||primary.length>=3)return;const token=++seq,targeted=targetOn();toggle.checked=false;setTimeout(()=>backfill(token,primary,toggle,targeted).catch(err=>{console.error('V252 backfill failed',err);if(token===seq){setSelection(primary);toggle.checked=true}}),0)},true);
window.tradeAddAssetsBackfillV252={addToggle,targetOn};
})();
