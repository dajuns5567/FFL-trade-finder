export default async (req)=>{
  try{
    const origin=new URL(req.url).origin;
    const r=await fetch(origin+"/index.html",{headers:{accept:"text/html"},cache:"no-store"});
    if(!r.ok)throw new Error(`index.html ${r.status}`);
    const html=(await r.text()).replace("</body>",'<script src="/valuation-v17.js?v=17"></script></body>');
    return new Response(html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
  }catch(e){return new Response(`Site loader failed: ${String(e?.message||e)}`,{status:500,headers:{"content-type":"text/plain; charset=utf-8"}})}
};
