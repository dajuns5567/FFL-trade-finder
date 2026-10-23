// Operator-injected, server-only OpenAI-compatible adapter. No public handler
// and no implicit provider calls. Credentials remain in server environment.
export function createWeek4EditorialModelClient({apiKey,baseUrl,fetchImpl=globalThis.fetch,timeoutMs=90000}={}){
  if(typeof apiKey!=='string'||apiKey.length<12)throw new Error('Server-side editorial model credential missing');
  if(typeof fetchImpl!=='function')throw new Error('A server-side fetch implementation is required');
  if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>180000)throw new Error('Model timeout outside accepted bounds');
  const base=new URL(baseUrl||'https://api.openai.com/v1/');
  if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)
    throw new Error('Editorial model endpoint must be an HTTPS base URL without credentials');
  if(!base.pathname.endsWith('/'))base.pathname+='/';
  const endpoint=new URL('chat/completions',base);
  return{chat:{completions:{create:async({model,messages,response_format,temperature})=>{
    if(!model||!Array.isArray(messages)||messages.length<2)
      throw new Error('Editorial model request lacks model or prompt');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetchImpl(endpoint,{method:'POST',signal:controller.signal,
        headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
        body:JSON.stringify({model,messages,response_format,temperature})});
      if(!response.ok)throw new Error(`Editorial model provider returned HTTP ${response.status}`);
      const body=await response.json();
      if(typeof body?.choices?.[0]?.message?.content!=='string')
        throw new Error('Editorial model provider returned no text');
      return body;
    }finally{clearTimeout(timeout)}
  }}}};
}
