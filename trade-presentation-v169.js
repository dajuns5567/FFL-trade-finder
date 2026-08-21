(()=>{
'use strict';
let observer=null,running=false;
function blankLike(){
  const boxes=[...document.querySelectorAll('#findShop .shopCheck')].filter(Boolean);
  if(!boxes.length)return true;
  const checked=boxes.filter(b=>b.checked).length;
  return checked===0||checked===boxes.length;
}
function scoreOf(card){
  const m=(card.textContent||'').match(/Recommendation\s+(\d+)\/100/i);
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
function apply(){
  if(running||!blankLike())return;
  const host=document.getElementById('finderResults');
  if(!host)return;
  const cards=[...host.querySelectorAll(':scope > .trade95-card')];
  if(cards.length<2)return;
  const groups=[],byScore=new Map();
  for(const card of cards){
    const score=scoreOf(card);
    if(!byScore.has(score)){const g=[];byScore.set(score,g);groups.push(g)}
    byScore.get(score).push(card);
  }
  const ordered=[];
  for(const g of groups)ordered.push(...diversifyGroup(g));
  if(ordered.every((c,i)=>c===cards[i]))return;
  running=true;
  try{
    observer?.disconnect();
    const loadMore=[...host.children].find(x=>x.tagName==='BUTTON'&&/Load more trades/i.test(x.textContent||''))||null;
    for(const card of ordered)host.insertBefore(card,loadMore);
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
window.tradePresentationV169={apply,blankLike,structureKey};
})();
