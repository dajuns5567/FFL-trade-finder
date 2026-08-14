(()=>{
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const top=(xs,n)=>[...xs].sort((a,b)=>baseValue(b)-baseValue(a)).slice(0,n);
const value=p=>p.reduce((s,x)=>s+Math.max(1,baseValue(x)),0);
const uniq=xs=>{const out=[],seen=new Set();for(const p of xs){const k=p.map(x=>String(x.id)).sort().join('|');if(k&&!seen.has(k)){seen.add(k);out.push(p)}}return out};

function ensureSellSearch(){
  const team=document.getElementById('findTeam');if(!team||document.getElementById('sellPlayerSearch'))return;
  const host=team.parentElement;
  const box=document.createElement('div');box.style.marginTop='12px';
  box.innerHTML='<label>Player you want to sell / shop (optional)</label><input id="sellPlayerSearch" type="search" placeholder="Search any rostered player…" autocomplete="off"><div id="sellPlayerResults" class="tiny" style="margin:6px 0"></div><div id="sellPlayerSelected" class="tiny muted"></div>';
  host.appendChild(box);
  const input=box.querySelector('#sellPlayerSearch'),results=box.querySelector('#sellPlayerResults'),selected=box.querySelector('#sellPlayerSelected');
  input.addEventListener('input',()=>{
    const q=norm(input.value);if(!q){results.innerHTML='';return}
    const rows=state.allAssets.filter(x=>x.type==='player'&&norm(playerName(x.id)).includes(q)).sort((a,b)=>baseValue(b)-baseValue(a)).slice(0,18);
    results.innerHTML=rows.map(x=>`<button type="button" class="secondary small" data-sell-id="${x.id}" style="margin:2px">${esc(playerName(x.id))} • ${esc(teamName(x.owner))}</button>`).join('')||'<span class="muted">No matching rostered player.</span>';
  });
  results.addEventListener('click',e=>{
    const b=e.target.closest('button[data-sell-id]');if(!b)return;
    const x=state.allAssets.find(a=>a.type==='player'&&String(a.id)===String(b.dataset.sellId));if(!x)return;
    team.value=String(x.owner);team.dispatchEvent(new Event('change'));
    setTimeout(()=>{
      const c=[...document.querySelectorAll('.shopCheck')].find(z=>String(z._asset?.id)===String(x.id));if(c)c.checked=true;
    },0);
    input.value=playerName(x.id);results.innerHTML='';selected.innerHTML=`Shopping: <b>${esc(playerName(x.id))}</b> • ${esc(teamName(x.owner))}. Team selected automatically.`;
  });
}

const oldRender=renderFinderShop;
renderFinderShop=function(){
  oldRender();
  const el=document.getElementById('findShop'),team=document.getElementById('findTeam');
  if(el&&!Number(team?.value))el.innerHTML="<div class='empty'>Choose a team to browse its roster, or use <b>Player you want to sell / shop</b> to select a player from anywhere in the league.</div>";
  ensureSellSearch();
};

setTimeout(()=>{ensureSellSearch();try{renderFinderShop()}catch(_){}},0);
})();
