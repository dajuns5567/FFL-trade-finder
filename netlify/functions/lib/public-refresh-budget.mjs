// Best-effort warm-instance cost guard. Netlify-wide distributed rate
// limiting remains a separate platform configuration requirement.
// Trust the platform's IP metadata, never user-controlled forwarding headers.
export function createPublicRefreshBudget({windowMs=60000,perClient=12,total=60,maxClients=512,maxConcurrent=6,clock=Date.now}={}){
 let windowStart=clock(),used=0,active=0;
 const clients=new Map();
 return {acquire(ip){
  const now=clock();
  if(now-windowStart>=windowMs||now<windowStart){windowStart=now;used=0;clients.clear()}
  const key=String(ip||'unknown').slice(0,80);
  const retryAfter=Math.max(1,Math.ceil((windowStart+windowMs-now)/1000));
  const count=clients.get(key)||0;
  if(active>=maxConcurrent||used>=total||count>=perClient||(!clients.has(key)&&clients.size>=maxClients))return {allowed:false,retryAfter};
  clients.set(key,count+1);used++;active++;
  let released=false;
  return {allowed:true,release(){if(!released){released=true;active--}}};
 }};
}
export function createSharedRefresh(read){
 let pending=null;
 return function(){
  if(pending)return pending;
  const next=Promise.resolve().then(read);
  pending=next;
  // Share only the actual source fetch, never caller-specific composites.
  next.then(()=>{if(pending===next)pending=null},()=>{if(pending===next)pending=null});
  return next;
 };
}
