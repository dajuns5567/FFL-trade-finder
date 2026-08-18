(()=>{
'use strict';
const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=()=>window.tradeValueNormalizationV130||{};
const val=a=>Math.max(0,Number(norm().canonicalValue?.(a))||0);
const rankOf=a=>a?.type==='player'?Math.max(1,Number(window.playerRankValue?.(a)?.rank)||9999):0;
const nameOf=a=>window.playerName?.(a?.id)||a?.name||String(a?.id||'');
const posOf=a=>window.groupPos?.(a)||'IDP';
let refreshStarted=false,refreshDone=false;
function playerRecord(a){return window.state?.players?.[String(a?.id)]||window.state?.players?.[a?.id]||{}}
function nflTeam(a){const p=playerRecord(a);for(const x of [p.team,p.team_abbr,p.nfl_team,p.pro_team])if(x&&String(x).toUpperCase()!=='FA')return String(x).toUpperCase();return'FA'}
function teamCoverage(){const ps=Object.values(window.state?.players||{}),known=ps.filter(p=>p&&(p.team||p.team_abbr||p.nfl_team||p.pro_team)&&String(p.team||p.team_abbr||p.nfl_team||p.pro_team).toUpperCase()!=='FA').length;return{total:ps.length,known}}
async function refreshSleeperMetadata(){
 if(refreshStarted)return;const c=teamCoverage();if(c.known>100){refreshDone=true;return}refreshStarted=true;
 try{
  const r=await fetch('https://api.sleeper.app/v1/players/nfl',{cache:'no-store'});if(!r.ok)throw Error('players/nfl '+r.status);const fresh=await r.json();
  if(!fresh||typeof fresh!=='object')throw Error('invalid Sleeper players payload');
  const cur=window.state?.players||{};for(const [pid,p] of Object.entries(fresh)){if(!p)continue;const old=cur[pid]||{};cur[pid]={...old,...p}}
  if(window.state)window.state.players=cur;refreshDone=true;patchAll();
 }catch(e){console.warn('V132 Sleeper metadata refresh unavailable; existing player metadata retained.',e)}
}
function playerMarkup(a){return`<span><b>${esc(nameOf(a))}</b><span class="tiny muted" style="display:block">${esc(posOf(a))} • ${esc(nflTeam(a))} • Value <b>${fmt(val(a))}</b> • overall #${rankOf(a)}</span></span>`}
function patchHost(host){if(!host)return;for(const b of host.querySelectorAll('input[type="checkbox"]')){const a=b._asset;if(!a||a.type!=='player')continue;const row=b.closest('label,.checkrow');if(!row)continue;let span=[...row.children].find(c=>c!==b);if(!span){span=document.createElement('span');row.appendChild(span)}const html=playerMarkup(a);if(span.innerHTML!==html)span.innerHTML=html}}
function patchRankings(){const ranked=window.ensureMaster?.()||[];for(const row of document.querySelectorAll('#rankings .valueRow19')){const title=row.querySelector('b'),meta=row.querySelector('small');const r=Number((title?.textContent||'').match(/^\s*(\d+)\./)?.[1]);const a=r?ranked[r-1]?.x:null;if(!a||a.type!=='player'||!meta)continue;let t=meta.textContent||'';t=t.replace(/Value\s+[\d,.]+/i,`Value ${fmt(val(a))}`);t=t.replace(/^\s*(QB|RB|WR|TE|IDP|DL|DE|LB|CB|S)\s*•\s*(?:FA|[A-Z]{2,4})\s*•/i,`${posOf(a)} • ${nflTeam(a)} •`);meta.textContent=t}}
function patchResults(){for(const card of document.querySelectorAll('#finderResults .trade95-asset,#evalResults .trade95-asset')){const b=card.querySelector('b'),sub=card.querySelector('.trade95-sub');if(!b||!sub||/\b20\d{2}\s+R\d\b/.test(b.textContent||''))continue;const nm=(b.textContent||'').trim().toLowerCase(),a=(window.state?.allAssets||[]).find(x=>x.type==='player'&&nameOf(x).toLowerCase()===nm);if(!a)continue;sub.textContent=`${posOf(a)} • ${nflTeam(a)} • overall #${rankOf(a)}`}}
function patchAssetLabel(){const prior=window.assetLabel;if(prior?.__v132)return;const f=a=>{if(a?.type==='player')return playerMarkup(a);return prior?.(a)||''};f.__v132=true;window.assetLabel=f}
function patchAll(){norm().install?.();patchAssetLabel();patchRankings();patchHost(document.getElementById('findShop'));patchHost(document.getElementById('evalChooserA'));patchHost(document.getElementById('evalChooserB'));patchResults();const r=document.getElementById('rankings');if(r)r.style.visibility='visible'}
function install(){patchAll();refreshSleeperMetadata();if(!window.__v132MetaPoll)window.__v132MetaPoll=setInterval(patchAll,900);if(!document.__v132MetaObserver){document.__v132MetaObserver=true;new MutationObserver(()=>patchAll()).observe(document.body,{childList:true,subtree:true})}}
setTimeout(install,0);setTimeout(install,400);setTimeout(install,1200);window.tradeStabilityV132={install,refreshSleeperMetadata,nflTeam,teamCoverage};
})();