(()=>{
const engine=()=>window.tradeEngine98||window.tradeEngine96;
const av=x=>Math.max(0,Number(engine()?.assetValue?.(x))||0);
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const rankOf=x=>x?.type==='player'?Math.max(1,Number(window.playerRankValue?.(x)?.rank)||9999):0;
const priorFairness=engine()?.fairness;
const lowTierRate=r=>Number(r)<350?0:clamp(.18,.18+((Math.max(350,Number(r))-350)/650)*.30,.50);
function qualityDetail(xs){
  const assets=[...(xs||[])],players=assets.filter(x=>x.type==='player'),low=players.filter(x=>rankOf(x)>=350),raw=assets.reduce((s,x)=>s+av(x),0);
  if(low.length<2)return{raw,effective:raw,penalty:0,lowTierCount:low.length,bestRank:Math.min(9999,...players.map(rankOf))};
  const frag=Math.min(1.46,1+.28*Math.max(0,low.length-2));let penalty=0;
  for(const x of low)penalty+=av(x)*Math.min(.58,lowTierRate(rankOf(x))*frag);
  penalty=Math.min(raw*.64,penalty);
  return{raw,effective:Math.max(0,raw-penalty),penalty,lowTierCount:low.length,bestRank:Math.min(9999,...players.map(rankOf))};
}
function fairness(give,recv){
  const f=priorFairness?.(give,recv);if(!f)return f;
  const a=qualityDetail(give),b=qualityDetail(recv);
  const aAdj=a.penalty>0?0:Number(f.aAdj)||0,bAdj=b.penalty>0?0:Number(f.bAdj)||0;
  const ae=a.effective+aAdj,be=b.effective+bAdj,hi=Math.max(ae,be,1),lo=Math.min(ae,be),ratio=lo/hi,gap=Math.abs(ae-be);
  const score=Math.round(clamp(1,100-(gap/hi)*150,100));
  const premiumMismatch=(aAdj>0||bAdj>0)&&ratio<.89,rejected=score<65||ratio<.72||premiumMismatch;
  return{...f,aAdj,bAdj,aEffective:ae,bEffective:be,aPackagePenalty:a.penalty,bPackagePenalty:b.penalty,aQuality:a.effective,bQuality:b.effective,qualityRatio:ratio,qualityScore:score,score,rejected,status:rejected?'Trade Rejected':score>=94?'Excellent Fit':score>=82?'Fair':'Negotiable',ratio,edgeEffective:be-ae};
}
function installFairness(){
  if(!priorFairness)return;
  if(window.tradeEngine98)window.tradeEngine98.fairness=fairness;
  if(window.tradeEngine96)window.tradeEngine96.fairness=fairness;
}
function installLogo(){
  if(window.__section1V111Poll){clearInterval(window.__section1V111Poll);window.__section1V111Poll=null}
  const h=document.querySelector('header h1');if(!h)return;
  if(h.className!=='fleecedFlat113'||!h.querySelector('.fleecedWord113')){h.className='fleecedFlat113';h.setAttribute('aria-label','Fleeced!');h.innerHTML='<span class="fleecedWord113">Fleeced!</span><span class="fleecedArrow113" aria-hidden="true"></span>'}
  document.getElementById('fleecedFlat111Style')?.remove();document.getElementById('fleecedFlat110Style')?.remove();
  if(document.getElementById('fleecedFlat113Style'))return;
  const s=document.createElement('style');s.id='fleecedFlat113Style';s.textContent=`header h1.fleecedFlat113{position:relative!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;width:168px!important;height:53px!important;margin:10px 0 10px!important;padding:6px 14px 0!important;background:#fff!important;border:3.5px solid #111!important;border-radius:18px!important;color:#efb900!important;font-family:"Trebuchet MS","Arial Rounded MT Bold","Comic Sans MS",sans-serif!important;font-size:28px!important;font-style:normal!important;font-weight:1000!important;line-height:1!important;letter-spacing:-.35px!important;text-align:center!important;text-shadow:none!important;box-shadow:none!important;-webkit-text-stroke:2.15px #111!important;paint-order:stroke fill!important;transform:none!important;filter:none!important;background-image:none!important;box-sizing:border-box!important}header h1.fleecedFlat113:before{content:""!important;display:block!important;position:absolute!important;left:25px!important;bottom:-9px!important;width:14px!important;height:14px!important;background:#fff!important;border-left:3.5px solid #111!important;border-bottom:3.5px solid #111!important;transform:rotate(-45deg)!important;transform-origin:center!important;box-sizing:border-box!important}header h1.fleecedFlat113:after{display:none!important;content:none!important}.fleecedWord113{display:block!important;position:relative!important;z-index:2!important;white-space:nowrap!important}.fleecedArrow113{position:absolute!important;left:33px!important;bottom:7px!important;width:96px!important;height:3px!important;background:#111!important;border-radius:3px!important;z-index:2!important}.fleecedArrow113:before,.fleecedArrow113:after{content:""!important;position:absolute!important;top:50%!important;width:0!important;height:0!important;border-top:4px solid transparent!important;border-bottom:4px solid transparent!important;transform:translateY(-50%)!important}.fleecedArrow113:before{left:-1px!important;border-right:6px solid #111!important}.fleecedArrow113:after{right:-1px!important;border-left:6px solid #111!important}`;document.head.appendChild(s);
}
function parseSide(side){
  let raw=0,penalty=0,players=0,picks=0,topPlayer=0,bestRank=9999;const names=[],low=[];
  side.querySelectorAll('.trade95-asset').forEach(row=>{
    const v=Number((row.querySelector('.trade95-value')?.textContent||'').replace(/[^0-9.\-]/g,''))||0;raw+=v;
    const txt=row.textContent||'',m=txt.match(/overall\s*#\s*(\d+)/i);if(m){players++;const r=Number(m[1]);bestRank=Math.min(bestRank,r);topPlayer=Math.max(topPlayer,v);if(r>=350)low.push({v,rank:r})}else if(/\b20\d{2}\s+R[123]\b/i.test(txt))picks++;
    const nm=row.querySelector('b')?.textContent?.trim();if(nm)names.push(nm);
  });
  if(low.length>=2){const frag=Math.min(1.46,1+.28*Math.max(0,low.length-2));for(const x of low)penalty+=x.v*Math.min(.58,lowTierRate(x.rank)*frag);penalty=Math.min(raw*.64,penalty)}
  const adjRow=[...side.querySelectorAll('.trade97-adjust,.trade95-adjust')].find(x=>/VALUE ADJUSTMENT/i.test(x.textContent||''));let adj=0;if(adjRow){const m=(adjRow.textContent||'').match(/\+\s*([\d,.]+)/);if(m)adj=Number(m[1].replace(/,/g,''))||0}
  if(penalty>0)adj=0;
  return{raw,penalty,effective:Math.max(0,raw-penalty)+adj,players,picks,topPlayer,bestRank,names};
}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function showPenalty(side,d){
  let p=side.querySelector('.packagePenalty113'),a=side.querySelector('.packageAfter113');
  if(!d.penalty){p?.remove();a?.remove();return}
  const total=side.querySelector('.trade95-total');if(!total)return;
  if(!p){p=document.createElement('div');p.className='trade97-adjust packagePenalty113';p.innerHTML='<span>PACKAGE QUALITY PENALTY</span><b></b>';total.insertAdjacentElement('afterend',p)}
  if(!a){a=document.createElement('div');a.className='trade97-effective packageAfter113';a.innerHTML='<span>AFTER PACKAGE PENALTY</span><b></b>';p.insertAdjacentElement('afterend',a)}
  setText(p.querySelector('b'),`−${d.penalty.toLocaleString(undefined,{maximumFractionDigits:1})}`);setText(a.querySelector('b'),Math.max(0,d.raw-d.penalty).toLocaleString(undefined,{maximumFractionDigits:1}));
}
function rosterNeedText(me,pos){
  if(!me||!pos||pos==='TE')return'';const slots={QB:2,RB:3,WR:4,IDP:2}[pos]||2;
  const score=id=>(state.allAssets||[]).filter(x=>x.type==='player'&&Number(x.owner)===Number(id)&&groupPos(x)===pos).map(av).sort((a,b)=>b-a).slice(0,slots).reduce((a,b)=>a+b,0);
  const rows=(state.teams||[]).map(t=>({id:Number(t.id),v:score(t.id)})).sort((a,b)=>b.v-a.v),idx=rows.findIndex(x=>x.id===Number(me));return idx<0?'':`${pos} depth ranks #${idx+1}/${rows.length} by this model`;
}
function rewriteRationale(card,recv,send){
  const body=card.querySelector('.rationaleBody ul');if(!body)return;const me=Number(document.getElementById('findTeam')?.value),team=window.teamName?.(me)||'your team',outlook=window.teamContextOutlook90?.(me),phase=outlook?.phase||'current roster';
  const firstSide=card.querySelector('.trade95-side'),posMatch=(firstSide?.textContent||'').match(/\b(QB|RB|WR|IDP|TE)\b/i),pos=posMatch?.[1]?.toUpperCase(),need=rosterNeedText(me,pos),partner=(card.querySelector('.trade95-head b')?.textContent||'the trade partner').replace(/^#\d+\s*/,''),fit=(card.querySelector('.trade95-head .trade95-sub')?.textContent||'').match(/partner fit\s+(\d+)\/100/i)?.[1];
  const recvNames=recv.names.slice(0,3).join(' + ')||'the incoming package',sendNames=send.names.slice(0,3).join(' + ')||'the outgoing package';
  let reason=`Why this trade: ${team} is currently ${phase}. This offer converts ${sendNames} into ${recvNames} with ${partner}`;
  if(need&&pos!=='TE')reason+=`, and ${need}`;else if(recv.picks>0)reason+=`, adding draft capital without treating an optional position as a roster need`;else reason+=`, based on the actual package structure and roster fit rather than an artificial TE need`;
  if(fit)reason+=`; partner fit is ${fit}/100`;reason+='.';
  const li=body.querySelector('li');if(li)setText(li,reason);else{const n=document.createElement('li');n.textContent=reason;body.prepend(n)}
}
function updateScore(scoreBox,score){
  if(!scoreBox)return;const span=scoreBox.querySelector('span'),label=scoreBox.querySelector('div');let txt=[...scoreBox.childNodes].find(n=>n.nodeType===3);
  if(!txt){txt=document.createTextNode(String(score));scoreBox.insertBefore(txt,span||scoreBox.firstChild)}else if(txt.nodeValue!==String(score))txt.nodeValue=String(score);
  setText(label,score>=94?'Excellent Fit':score>=82?'Fair':score>=72?'Negotiable':'Not recommended');
}
function postProcessFinder(){
  const host=document.getElementById('finderResults');if(!host||host.__v113Busy)return;host.__v113Busy=true;
  try{const tier=document.getElementById('tradeTier94')?.value||'neutral',cards=[...host.querySelectorAll('.trade95-card')];
    for(const card of cards){const sides=card.querySelectorAll('.trade95-side');if(sides.length<2)continue;const recv=parseSide(sides[0]),send=parseSide(sides[1]);showPenalty(sides[0],recv);showPenalty(sides[1],send);
      const hi=Math.max(recv.effective,send.effective,1);let score=Math.round(clamp(1,100-(Math.abs(recv.effective-send.effective)/hi)*150,100));
      const singleVsFragment=tier==='neutral'&&((recv.players===1&&recv.picks===0&&send.players>=1&&send.picks>=1&&send.topPlayer/Math.max(recv.topPlayer,1)<.82)||(send.players===1&&send.picks===0&&recv.players>=1&&recv.picks>=1&&recv.topPlayer/Math.max(send.topPlayer,1)<.82));
      if(singleVsFragment)score=Math.min(score,68);
      const summary=card.querySelector('.trade95-summary>div'),pen=recv.penalty+send.penalty;if(summary){let badge=summary.querySelector('.packagePenaltySummary113');if(pen){if(!badge){badge=document.createElement('strong');badge.className='packagePenaltySummary113';summary.appendChild(badge)}setText(badge,`Package penalty −${pen.toLocaleString(undefined,{maximumFractionDigits:1})}`)}else badge?.remove()}
      updateScore(card.querySelector('.trade95-score'),score);rewriteRationale(card,recv,send);
      if(score<72){card.remove();continue}
      if(tier==='draft'&&send.penalty>0&&send.bestRank>=400&&recv.picks>0&&/\b20\d{2}\s+R1\b/i.test(sides[0].textContent||'')){card.remove();continue}
    }
  }finally{host.__v113Busy=false}
}
function observe(){const host=document.getElementById('finderResults');if(host&&!host.__v113){host.__v113=true;new MutationObserver(()=>setTimeout(postProcessFinder,0)).observe(host,{childList:true,subtree:true,characterData:true})}}
function install(){installFairness();installLogo();observe();postProcessFinder()}
setTimeout(install,0);setTimeout(install,120);setTimeout(install,500);if(!window.__section1V113Poll)window.__section1V113Poll=setInterval(()=>{installFairness();installLogo();observe()},1200);
window.section1V113={install,fairness,qualityDetail,postProcessFinder};
})();