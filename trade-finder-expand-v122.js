(()=>{
let patched=false;
async function install(){
  if(patched)return;
  try{
    const txt=await fetch('/trade-engine-v99.js?v=99',{cache:'no-store'}).then(r=>r.text());
    const needle="for(const r of base){if(out.includes(r)||(shapes.get(r.shape)||0)>=3)continue;out.push(r);shapes.set(r.shape,(shapes.get(r.shape)||0)+1);if(out.length>=12)break}return out";
    const repl="for(const r of base){if(out.includes(r)||(shapes.get(r.shape)||0)>=3)continue;out.push(r);shapes.set(r.shape,(shapes.get(r.shape)||0)+1);if(out.length>=12)break}for(const r of base){if(out.includes(r))continue;out.push(r);if(out.length>=50)break}return out";
    if(!txt.includes(needle))return;
    (0,eval)(txt.replace(needle,repl));
    patched=true;
    window.__finderResultCap=50;
  }catch(e){console.warn('V122 finder expansion unavailable',e)}
}
setTimeout(install,20);setTimeout(install,400);window.tradeFinderExpandV122={install};
})();