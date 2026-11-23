// Scheduled, independent awards materialization. Netlify only runs scheduled
// functions from a published deploy; this additional guard prevents a
// preview or branch deploy from writing shared production award storage.
import {weeklyAwards} from './league-hub.mjs';

export const config={schedule:'15 */2 * * *'};

export default async function weeklyAwardRefresh(){
 const context=String(globalThis.Netlify?.env?.get?.('CONTEXT')||process.env.CONTEXT||'');
 const branch=String(globalThis.Netlify?.env?.get?.('BRANCH')||process.env.BRANCH||'');
 if(context!=='production'||(branch&&branch!=='main')){
  return new Response(JSON.stringify({skipped:true,reason:'production-only weekly award job'}),{
   status:200,headers:{'content-type':'application/json','cache-control':'no-store'}
  });
 }
 try{
  // Never depend on Inquirer publishing. weeklyAwards independently confirms
  // a complete Sleeper league week, both offensive/IDP winners and manager
  // awards before retaining results. Writes only if verified data changed.
  const result=await weeklyAwards({persist:true,strictPersist:true});
  const records=Array.isArray(result?.records)?result.records:[];
  const latest=records.at(-1)||null;
  return new Response(JSON.stringify({
   ok:true,record_count:records.length,
   latest_verified:latest?{season:latest.season,week:latest.week,
    offense:latest.players_of_week?.offense?.player_id||null,
    defense:latest.players_of_week?.defense?.player_id||null}:null
  }),{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }catch(error){
  console.error('weekly-awards-scheduled-capture-unavailable',String(error?.message||error));
  return new Response(JSON.stringify({ok:false,error:'Verified weekly awards unavailable'}),{
   status:503,headers:{'content-type':'application/json','cache-control':'no-store'}
  });
 }
}
