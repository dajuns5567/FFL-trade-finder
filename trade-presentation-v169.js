(()=>{
'use strict';
let observer=null,running=false,lastVisibleCount=0;
function blankLike(){
  const boxes=[...document.querySelectorAll('#findShop .shopCheck')].filter(Boolean);
  if(!boxes.length)return true;
  const checked=boxes.filter(b=>b.checked).length;
  return checked===0||checked===boxes.length;
}
function recommendationOf(card){
  const m=(card.textContent||'').match(/Recommendation\s+(\d+)\/100/i);
  return m?Number(m[1]):0;
}
function fairnessOf(card){
  const el=card.querySelector('.trade95-score');
  const m=(el?.textContent||'').match(/(\d+)\s*\/100/);
  return m?Number(m[1]):0;
}
function sideInfo(side){
  const assets=[...side.querySelectorAll('.trade95-asset')];
  let picks=0;
  for(const a of assets){
    const t=a.textContent||'';
    if(/projected\s+\d+\.\d+/i.test(t)||/\b20\d{2}\s+R\d\b/i.test(t))picks++;
  }
  return{n:assets.length,p:assets.length-picks,k:picks};
}
function structureKey(card){
  const sides=[...card.querySelectorAll('.trade95-side')];
  let recv={n:0,p:0,k:0},give={n:0,p:0,k:0};
  for(const side of sides){
    const title=(side.querySelector('.trade95-side-title')?.textContent||'').trim().toUpperCase();
    if(title.includes('YOU RECEIVE'))recv=sideInfo(side);
    else if(title.includes('YOU SEND'))give=sideInfo(side);
  }
  return`g${give.n}p${give.p}k${give.k}|r${recv.n}p${recv.p}k${recv.k}`;
}
function outgoingPickOnly(card){
  for(const side of card.querySelectorAll('.trade95-side')){
    const title=(side.querySelector('.trade95-side-title')?.textContent||'').trim().toUpperCase();
    if(!title.includes('YOU SEND'))continue;
    const info=sideInfo(side);
    return info.n>0&&info.p===0&&info.k===info.n;
  }
  return false;
}
function diversifyGroup(group){
  const buckets=new Map(),keys=[];
  for(const card of group){
    const k=structureKey(card);
    if(!buckets.has(k)){buckets.set(k,[]);keys.push(k)}
    buckets.get(k).push(card);
  }
  if(keys.length<2)return group.slice();
  const out=[];
  let cursor=0;
  while(out.length<group.length){
    let chosen=-1;
    for(let step=0;step<keys.length;step++){
      const i=(cursor+step)%keys.length;
      if(buckets.get(keys[i])?.length){chosen=i;break}
    }
    if(chosen<0)break;
    out.push(buckets.get(keys[chosen]).shift());
    cursor=(chosen+1)%keys.length;
  }
  return out;
}
function spacePickOnly(cards,maxRun=2){
  const remaining=cards.slice(),out=[];
  let streak=0;
  while(remaining.length){
    let idx=0;
    if(streak>=maxRun){
      const alt=remaining.findIndex(c=>!outgoingPickOnly(c));
      if(alt>=0)idx=alt;
    }
    const card=remaining.splice(idx,1)[0];
    streak=outgoingPickOnly(card)?streak+1:0;
    out.push(card);
  }
  return out;
}
function renumber(cards){
  cards.forEach((card,i)=>{
    const b=card.querySelector('.trade95-head > div > b');
    if(!b)return;
    const text=b.textContent||'';
    b.textContent=text.match(/^#\d+\s+/)?text.replace(/^#\d+\s+/,`#${i+1} `):`#${i+1} ${text}`;
  });
}
function apply(){
  if(running||!blankLike())return;
  const host=document.getElementById('finderResults');
  if(!host)return;
  const cards=[...host.querySelectorAll(':scope > .trade95-card')];
  if(!cards.length){lastVisibleCount=0;return}
  if(cards.length<2){renumber(cards);lastVisibleCount=cards.length;return}

  // Load more redraws the visible prefix with five additional cards. Do not re-sort
  // the already displayed prefix; preserve the Finder's next-five sequence below it.
  if(lastVisibleCount>0&&cards.length>lastVisibleCount){
    renumber(cards);
    lastVisibleCount=cards.length;
    return;
  }

  // Initial batch for a new search keeps the V176 fairness/recommendation invariant.
  const sorted=cards.slice().sort((a,b)=>
    fairnessOf(b)-fairnessOf(a)||recommendationOf(b)-recommendationOf(a)
  );
  const ordered=[];
  for(let i=0;i<sorted.length;){
    const fair=fairnessOf(sorted[i]),rec=recommendationOf(sorted[i]),group=[];
    while(i<sorted.length&&fairnessOf(sorted[i])===fair&&recommendationOf(sorted[i])===rec)group.push(sorted[i++]);
    ordered.push(...spacePickOnly(diversifyGroup(group),2));
  }

  running=true;
  try{
    observer?.disconnect();
    const loadMore=[...host.children].find(x=>x.tagName==='BUTTON'&&/Load more trades/i.test(x.textContent||''))||null;
    for(const card of ordered)host.insertBefore(card,loadMore);
    renumber(ordered);
    lastVisibleCount=ordered.length;
  }finally{
    running=false;
    observe();
  }
}
function observe(){
  const host=document.getElementById('finderResults');
  if(!host)return;
  if(observer)observer.disconnect();
  observer=new MutationObserver(()=>queueMicrotask(apply));
  observer.observe(host,{childList:true,subtree:false});
}
function boot(){observe();apply()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.tradePresentationV169={apply,blankLike,structureKey,outgoingPickOnly,spacePickOnly,fairnessOf,recommendationOf};
})();
