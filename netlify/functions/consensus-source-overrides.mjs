import { CONSENSUS_SOURCES, refreshSource } from "./consensus-adapters.mjs";
import { refreshIdpShow } from "./idpshow-adapter.mjs";
import { refreshFanRanked } from "./fanranked-adapter.mjs";
import { refreshKtc } from "./ktc-adapter.mjs";
import { refreshRotowireIdp } from "./rotowire-idp-adapter.mjs";
import { refreshDraftSharksIdp } from "./draftsharks-idp-adapter.mjs";
import { refreshDraftSharksOffense } from "./draftsharks-offense-adapter.mjs";

const fantasyProsSource=CONSENSUS_SOURCES.find(source=>source.id==="fantasypros");
if(!fantasyProsSource)throw new Error("FantasyPros source configuration missing");

// V17 runs exactly one fetch pipeline per active site. Earlier code called the
// generic V16 refresh and then re-fetched four sources with custom adapters,
// which doubled network work and made Update noticeably slower.
export async function refreshAllSources(opts={}) {
  const results=await Promise.all([
    refreshSource(fantasyProsSource,opts),
    refreshDraftSharksOffense(opts),
    refreshIdpShow(opts),
    refreshKtc(opts),
    refreshDraftSharksIdp(opts),
    refreshRotowireIdp(opts),
    refreshFanRanked(opts)
  ]);
  return {
    successful:results.filter(result=>result?.valid).length,
    total:results.length,
    results
  };
}
