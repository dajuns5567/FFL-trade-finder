const INDEX_URL="https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/main/index.html";
export default async()=>{
  try{
    const r=await fetch(INDEX_URL,{headers:{accept:"text/html"},cache:"no-store"});
    if(!r.ok)throw new Error(`index.html ${r.status}`);
    const html=(await r.text()).replace("</body>",'<script src="/valuation-v17.js?v=19"></script><script src="/sleeper-history-client-v22.js?v=40"></script><script src="/valuation-idp-v21.js?v=22"></script><script src="/valuation-idp-v25.js?v=25"></script><script src="/valuation-offense-v26.js?v=26"></script><script src="/valuation-offense-v27.js?v=27"></script><script src="/valuation-v28.js?v=28"></script><script src="/valuation-offense-v29.js?v=29"></script><script src="/valuation-offense-v30.js?v=30"></script><script src="/valuation-offense-v31.js?v=31"></script><script src="/valuation-offense-v32.js?v=41"></script><script src="/valuation-offense-v33.js?v=42"></script><script src="/valuation-offense-v34.js?v=43"></script><script src="/trade-finder-v18.js?v=18"></script><script src="/trade-finder-v19.js?v=19"></script><script src="/ui-v18.js?v=18"></script><script src="/ui-v19.js?v=34"></script></body>');
    return new Response(html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
  }catch(e){return new Response(`Site loader failed: ${String(e?.message||e)}`,{status:500,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}})}
};
