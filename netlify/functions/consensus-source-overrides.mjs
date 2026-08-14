import { CONSENSUS_SOURCES, refreshSource } from "./consensus-adapters.mjs";
import { refreshIdpShow } from "./idpshow-adapter.mjs";
import { refreshFanRanked } from "./fanranked-adapter.mjs";
import { refreshKtc } from "./ktc-adapter.mjs";
import { refreshRotowireIdp } from "./rotowire-idp-adapter.mjs";
import { refreshDraftSharksIdp } from "./draftsharks-idp-adapter.mjs";
import { refreshDraftSharksOffense } from "./draftsharks-offense-adapter.mjs";

const fantasyProsSource=CONSENSUS_SOURCES.find(source=>source.id==="fantasypros");
if(!fantasyProsSource)throw new Error("FantasyPros source configuration missing");

async function timedRefresh(run){
  const started=Date.now();
  const result=await run();
  const elapsedMs=Date.now()-started;
  return {...result,elapsed_ms:elapsedMs,diagnostics:{...(result?.diagnostics||{}),elapsed_ms:elapsedMs}};
}

// V17 runs exactly one fetch pipeline per active site. Earlier code called the
// generic V16 refresh and then re-fetched four sources with custom adapters,
// which doubled network work and made Update noticeably slower.
export async function refreshAllSources(opts={}) {
  const started=Date.now();
  const results=await Promise.all([
    timedRefresh(()=>refreshSource(fantasyProsSource,opts)),
    timedRefresh(()=>refreshDraftSharksOffense(opts)),
    timedRefresh(()=>refreshIdpShow(opts)),
    timedRefresh(()=>refreshKtc(opts)),
    timedRefresh(()=>refreshDraftSharksIdp(opts)),
    timedRefresh(()=>refreshRotowireIdp(opts)),
    timedRefresh(()=>refreshFanRanked(opts))
  ]);
  return {
    successful:results.filter(result=>result?.valid).length,
    total:results.length,
    elapsed_ms:Date.now()-started,
    results
  };
}
