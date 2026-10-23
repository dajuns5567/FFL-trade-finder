// Netlify AI Gateway integration for an authorized server-side staging worker.
// The official OpenAI SDK reads gateway-injected OPENAI_API_KEY and
// OPENAI_BASE_URL itself. This module exposes no HTTP endpoint and incurs no
// model charges unless the caller explicitly invokes a model request.
export function createNetlifyEditorialGatewayClient({OpenAIClass,readEnv}={}){
  const get=readEnv||((key)=>globalThis.Netlify?.env?.get?.(key)||process.env[key]);
  if(!get('OPENAI_BASE_URL')||!get('OPENAI_API_KEY'))
    throw new Error('Netlify AI Gateway credentials are not active in this function runtime');
  if(typeof OpenAIClass!=='function')throw new Error('Official OpenAI SDK constructor is required');
  return new OpenAIClass();
}

export async function loadNetlifyEditorialGatewayClient(){
  const {default:OpenAI}=await import('openai');
  return createNetlifyEditorialGatewayClient({OpenAIClass:OpenAI});
}
